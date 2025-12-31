'use server';

// ==========================================
// IMAGE GENERATION SERVER ACTION
// with BULLETPROOF QUEUE & RETRY
// ==========================================

// GLOBAL QUEUE PROMISE (Module-level singleton)
let _globalImageQueue: Promise<void> = Promise.resolve();

const THEME_STYLES: Record<string, { colors: string; style: string; atmosphere: string; elements: string }> = {
  CYBERPUNK: {
    colors: "Deep black/navy background with vivid neon accents (hot pink #FF1493, cyan #00FFFF, electric purple #BF00FF)",
    style: "Digital painting, high contrast, neon glow effects",
    atmosphere: "Rain-slick streets, holographic advertisements, towering megastructures, dystopian urban",
    elements: "Cybernetic enhancements, neon signs, flying vehicles, holograms"
  },
  MURIM: {
    colors: "Rich ink black with crimson (#8B0000) and gold (#FFD700) accents, traditional Asian palette",
    style: "Korean manhwa style, dynamic speed lines, flowing energy effects",
    atmosphere: "Misty mountains, moonlit courtyards, ancient temples, bamboo forests",
    elements: "Martial artists, traditional robes, swords, inner energy (기) auras"
  },
  FANTASY: {
    colors: "Vibrant jewel tones - emerald, sapphire, ruby, gold. Warm magical lighting",
    style: "Epic painterly style, detailed realistic fantasy art",
    atmosphere: "Majestic castles, enchanted forests, mythical landscapes, grand vistas",
    elements: "Dragons, magic spells, medieval armor, elven architecture"
  },
  STEAMPUNK: {
    colors: "Warm sepia tones, brass (#B5A642), copper (#B87333), burnt orange, deep browns",
    style: "Detailed Victorian-era aesthetic with mechanical embellishments",
    atmosphere: "Industrial cities, steam clouds, clockwork mechanisms, gas lamp lighting",
    elements: "Gears, pipes, airships, goggles, top hats, brass machinery"
  },
  NOIR: {
    colors: "High contrast black and white with ONE accent color (crimson red or gold)",
    style: "Frank Miller Sin City graphic novel, heavy ink shadows, stark compositions",
    atmosphere: "Rain-soaked streets, venetian blind shadows, cigarette smoke, moral ambiguity",
    elements: "Trench coats, fedoras, dimly lit bars, silhouettes, dramatic lighting"
  }
};

function getThemeStyle(theme: string) {
  const normalizedTheme = theme.toUpperCase();
  if (normalizedTheme.includes('CYBER') || normalizedTheme.includes('네온')) return THEME_STYLES.CYBERPUNK;
  if (normalizedTheme.includes('무림') || normalizedTheme.includes('무협')) return THEME_STYLES.MURIM;
  if (normalizedTheme.includes('스팀') || normalizedTheme.includes('STEAM')) return THEME_STYLES.STEAMPUNK;
  if (normalizedTheme.includes('느와르') || normalizedTheme.includes('NOIR')) return THEME_STYLES.NOIR;
  return THEME_STYLES.FANTASY;
}

import { refineImagePrompt } from './promptEngineer';

export async function generateImageAction(
  description: string,
  theme: string,
  styleConstraints?: { enforce_style_prompt: string; negative_constraints_prompt: string },
  narrativeContext?: string // ★ New: Full narrative text for refinement
): Promise<string> {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[ImageGen] 🔵 Queuing Request [${requestId}]: "${description.substring(0, 30)}..."`);

  // Enqueue execution
  // 1. Queue this request behind the previous one
  const currentOperation = _globalImageQueue.then(async () => {
    console.log(`[ImageGen] 🟢 Starting Execution [${requestId}]`);
    const result = await executeGeneration(description, theme, styleConstraints, narrativeContext);
    console.log(`[ImageGen] 🏁 Finished Execution [${requestId}]`);
    return result;
  });

  // 2. Update global queue cursor to wait for this one to finish (void)
  _globalImageQueue = currentOperation.then(() => { }).catch(() => { });

  // 3. Return the result of the queued operation
  return currentOperation;
}

// Logic: Serialize -> Aggressive Retry on 429
async function executeGeneration(
  description: string,
  theme: string,
  styleConstraints?: { enforce_style_prompt: string; negative_constraints_prompt: string },
  narrativeContext?: string
): Promise<string> {

  // ★ STEP 1: PROMPT ENGINEERING (Refinement)
  let finalPrompt = description;

  if (narrativeContext) {
    try {
      // Use the new Prompt Engineer to maximize detail from text
      const refined = await refineImagePrompt(narrativeContext, theme, description);
      if (refined) {
        finalPrompt = refined;
        console.log(`[ImageGen] 🔧 Using Refined Prompt:\n${finalPrompt}`);
      }
    } catch (refineError) {
      console.warn("[ImageGen] Refinement failed, using original description:", refineError);
    }
  }

  console.log(`\n[ImageGen] ⏳ Queue Start: "${description.substring(0, 20)}..."`);

  const apiKey = process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.REACT_APP_GEMINI_API_KEY;

  if (!apiKey) return createFallbackImage("NO API KEY");

  const themeStyle = getThemeStyle(theme);

  // ★ Apply World Architect Constraints if available
  const styleInstruction = styleConstraints?.enforce_style_prompt
    ? `${styleConstraints.enforce_style_prompt} (Base Style: ${themeStyle.style})`
    : `${themeStyle.style}, ${themeStyle.colors}`;

  const negativeInstruction = styleConstraints?.negative_constraints_prompt
    ? `\nEXCLUDE: ${styleConstraints.negative_constraints_prompt}`
    : "";

  // Construct Final Payload Prompt
  // If refined, finalPrompt is already a structured block. If not, we build it here.
  const payloadPrompt = narrativeContext
    ? `
${finalPrompt}
STYLE: ${styleInstruction}
ATMOSPHERE: ${themeStyle.atmosphere}
NO text/labels. High quality.${negativeInstruction}
`.trim()
    : `
Create a cinematic, immersive illustration.
SCENE: ${description}
STYLE: ${styleInstruction}
ATMOSPHERE: ${themeStyle.atmosphere}
NO text/labels. High quality.${negativeInstruction}
`.trim();

  // Retry Loop Configuration
  // Fallback: Try Fast first, then Standard (Separate quotas: 8/10 vs 6/10)
  const MODEL_TIERS = ["imagen-4.0-fast-generate-001", "imagen-4.0-generate-001"];
  const MAX_ATTEMPTS = 5;

  let lastError;

  // Global Request Tracking (Simple in-memory counter for this server instance)
  // (Note: In a serverless/edge env this resets, but for a dev server it works)
  console.log(`[ImageGen Status] 🟢 Sending Request... (Tier 1: Fast -> Tier 2: Standard)`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Round-robin or fallback selection:
    // Attempts 1-2: Try Fast Model (Quality + Speed)
    // Attempts 3-5: Fallback to Stable 3.0 if Fast fails
    const currentModel = attempt <= 2 ? MODEL_TIERS[0] : MODEL_TIERS[1];

    try {
      // Base throttle: 250ms small buffer
      await new Promise(r => setTimeout(r, 250));

      console.log(`[ImageGen] 🚀 Attempt ${attempt}/${MAX_ATTEMPTS} (${currentModel})`);

      // Add 60s Timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:predict?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          instances: [{ prompt: payloadPrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "4:3",
            safetySettings: [
              { category: "HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
              { category: "HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
            ]
          }
        })
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.predictions?.[0]?.bytesBase64Encoded) {
          console.log("[ImageGen] ✅ SUCCESS");
          return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
        }
        if (data.predictions?.[0]?.b64) return `data:image/png;base64,${data.predictions[0].b64}`;
      }

      // Handle Errors
      const status = response.status;
      const text = await response.text();

      if (status === 429) {
        // HIT RATE LIMIT -> RETRY WITH BACKOFF
        // Attempt 1: 2s. Attempt 2: 4s. Attempt 3: 6s.
        const waitTime = attempt * 2000;
        console.warn(`[ImageGen] ⚠️ 429 RATE LIMIT. Cooling down for ${waitTime}ms...`);
        await new Promise(r => setTimeout(r, waitTime));
        continue; // Try again loop
      }

      console.error(`[ImageGen] ❌ API ERROR: ${status} - ${text.substring(0, 100)}`);
      // Non-retriable error (400/404/etc), break and show error
      if (status >= 400 && status < 500 && status !== 429) {
        break;
      }

    } catch (e) {
      console.error(`[ImageGen] Attempt ${attempt} Exception:`, e);
      // Network glitch? Wait short time and retry
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // If we get here, all retries failed
  return createFallbackImage("CONNECTION UNSTABLE: TRAFFIC OVERLOAD");
}

function createFallbackImage(reason: string): string {
  const fallbackSVG = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg" style="background:#000"><text x="50%" y="50%" fill="#fb7185" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-weight="bold">SIGNAL LOST</text><text x="50%" y="55%" fill="#888" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="12">${reason}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(fallbackSVG).toString('base64')}`;
}
