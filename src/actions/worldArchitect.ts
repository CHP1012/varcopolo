'use server';

import { model } from '@/lib/gemini';

export interface WorldThemeAnalysis {
    primary_theme: string;
    sub_themes: string[];
    era_tech_level: string;
}

export interface ArtStyleConstraints {
    enforce_style_prompt: string;
    negative_constraints_prompt: string;
}

export interface ArchitectResult {
    world_theme_analysis: WorldThemeAnalysis;
    art_style_constraints: ArtStyleConstraints;
}

const ARCHITECT_PROMPT = `
# SYSTEM ROLE: World Architect & Art Director AI

**OBJECTIVE:**
Input World Setting (Player Input or AI Generated) -> Analyze Theme -> Output JSON with Strict Style Guides & Negative Constraints.

**INPUT:**
World Setting Text: "{WORLD_SETTING}"

**INSTRUCTIONS:**
1. **Analyze Theme:** Identify the core theme (e.g., Pure Murim, High Fantasy, Cyberpunk, Noir, etc.).
2. **Define Style (Enforce Style):** Define the visual style, era, architecture, and key elements.
3. **Define Constraints (Negative Constraints):** List elements that MUST NOT appear.
   - **Murim/Wuxia:** NO knights, plate armor, castles, elves, dragons (unless logic permits), guns, cars.
   - **Western:** NO medieval knights, magic towers, aliens.
   - **Sci-Fi:** NO medieval castles, horses (unless specified), magic wands.
   - **Joseon:** NO modern buildings, electricity, western clothes.

**OUTPUT FORMAT (JSON Schema):**

\`\`\`json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "world_theme_analysis": {
      "type": "object",
      "properties": {
        "primary_theme": { "type": "string" },
        "sub_themes": { "type": "array", "items": { "type": "string" } },
        "era_tech_level": { "type": "string" }
      },
      "required": ["primary_theme", "era_tech_level"]
    },
    "art_style_constraints": {
      "type": "object",
      "properties": {
        "enforce_style_prompt": {
          "type": "string",
          "description": "Positive prompt for style, era, architecture."
        },
        "negative_constraints_prompt": {
          "type": "string",
          "description": "Comma-separated list of FORBIDDEN elements (Negative Prompt)."
        }
      },
      "required": ["enforce_style_prompt", "negative_constraints_prompt"]
    }
  },
  "required": ["world_theme_analysis", "art_style_constraints"]
}
\`\`\`

**OUTPUT JSON ONLY. NO MARKDOWN.**
`;

export async function analyzeWorldSetting(worldDescription: string): Promise<ArchitectResult | null> {
    console.log(`[Architect] Analyzing world setting...`);

    try {
        const prompt = ARCHITECT_PROMPT.replace('{WORLD_SETTING}', worldDescription);
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const data = JSON.parse(jsonStr) as ArchitectResult;

        console.log(`[Architect] Analysis Complete. Theme: ${data.world_theme_analysis.primary_theme}`);
        console.log(`[Architect] Constraints: ${data.art_style_constraints.negative_constraints_prompt.substring(0, 50)}...`);

        return data;

    } catch (error) {
        console.error("[Architect] Analysis Failed:", error);
        // Fallback or return null
        return null;
    }
}
