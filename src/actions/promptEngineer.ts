'use server';

import { model } from '@/lib/gemini';

// ============================================
// PROMPT ENGINEER AI (Prompt Refiner)
// "강력한 동적 텍스트 기반 AI 이미지 생성 지침서" 기반
// ============================================

const ENGINEER_SYSTEM_PROMPT = `
# SYSTEM ROLE: AI Prompt Engineer (Visual Director)

**OBJECTIVE:**
Analyze the Input Narrative and convert it into a "High-Fidelity Image Generation Prompt" following the strict guidelines below.

**CORE PRINCIPLES (MUST COMPLY):**
1. **Text-First Rule:** The text is the absolute source of truth. Every visual detail in the text must be included.
2. **First-Person POV Enforcement:** 
   - ALL images must be **"First-person perspective (POV), View from player's eyes"** unless explicitly stated otherwise (e.g., drone view).
   - **Player Body:** If hands/arms are visible, they MUST be **Gender-Neutral & Utilitarian**. 
     - Use tags: *gloved hands, tactical sleeves, rough skin, techwear, cybernetic implants*. 
     - AVOID: *jewelry, nail polish, delicate features, specific gender markers*.
3. **Entity-First Approach:**
   - Treat unique characters, locations, and objects as **Entities**.
   - If an entity is mentioned (e.g., "The Old Beggar"), use consistent visual descriptors for it.

**INPUT DATA:**
- **Narrative:** "{NARRATIVE}"
- **Theme:** "{THEME}"
- **Context:** "{CONTEXT}"

**OUTPUT FORMAT (Strictly 6-Line Block):**

1. **Style/Genre:** [ThemeKeywords], **First-person perspective (POV)**, cinematic, detailed 8k
2. **Overall Scene:** [Summary of location and main subject from player's view]
3. **Key Characters & Actions:** [NPC details] OR [Player's hand/arm interacting with object (Gender-Neutral/Gloved)]
4. **Detailed Environment:** [All environmental details: weather, lighting, debris, background objects]
5. **Specific Props:** [List of ALL items mentioned: held items, objects on ground]
6. **Mood & Lighting:** [Atmosphere keywords + Lighting source]

**EXAMPLE:**
Input: "I reach out to grab the rusted data chip from the wet ground."
Output:
1. **Style/Genre:** Cyberpunk, gritty realism, **First-person POV**, cinematic 8k
2. **Overall Scene:** Close-up view of the ground in a dark alley
3. **Key Characters & Actions:** Player's gloved hand reaching out (tactical sleeve, weathered glove), fingers grasping chip
4. **Detailed Environment:** Wet pavement, puddles reflecting neon, trash scattered around
5. **Specific Props:** Rusted data chip, old wrappers, tactical glove
6. **Mood & Lighting:** Tense, focused, cold atmosphere, dim street light reflection

**GENERATE THE 6-LINE PROMPT NOW.**
`;

/**
 * Refines raw narrative text into a structured image generation prompt.
 * @param narrative The dynamic text describing the current scene/action.
 * @param theme The world theme (e.g., Cyberpunk, Murim).
 * @param context Additional context string (Time, Weather, Location name).
 */
export async function refineImagePrompt(
    narrative: string,
    theme: string,
    context: string
): Promise<string> {
    // fast fail for empty input
    if (!narrative) return "";

    console.log(`[PromptEngineer] 🧠 Refining prompt for: "${narrative.substring(0, 30)}..."`);

    try {
        const prompt = ENGINEER_SYSTEM_PROMPT
            .replace('{NARRATIVE}', narrative)
            .replace('{THEME}', theme)
            .replace('{CONTEXT}', context);

        const result = await model.generateContent(prompt);
        const refinedPrompt = result.response.text().trim();

        console.log(`[PromptEngineer] ✨ Refined Output (Length: ${refinedPrompt.length})`);
        return refinedPrompt;

    } catch (error) {
        console.error("[PromptEngineer] Refinement Failed:", error);
        // Fallback: just return original inputs combined
        return `SCENE: ${narrative}, CONTEXT: ${context}, THEME: ${theme}`;
    }
}
const TTS_DIRECTOR_PROMPT = `
# SYSTEM ROLE: AI Voice Director (TTS Script Editor)

**OBJECTIVE:**
Rewrite the Input Text to optimize it for Korean TTS (Text-to-Speech) performance, maximizing the expression of the target emotion/state.

**GUIDELINES:**
1. **Breathing & Pauses:** Use commas (,) for short pauses and ellipses (...) for long pauses to create rhythm.
2. **Emphasis:** Use tildes (~) for elongated syllables (e.g. "정~말").
3. **Natural Flow:** Adjust word order or endings if needed to sound more colloquial and natural for spoken dialogue.
4. **Tone Matching:** Ensure the script reflects the target emotion (e.g. stuttering for "Fear", exclamation marks for "Anger").
5. **No Logic Changes:** Do NOT change the meaning of the sentence. Only enhance the delivery.

**INPUT:**
- Text: "{TEXT}"
- Target Emotion/State: "{STATE}"

**OUTPUT:**
- Return ONLY the refined text. No explanations.
`;

export async function polishTextForTTS(
    text: string,
    state: string
): Promise<string> {
    if (!text) return "";

    console.log(`[PromptEngineer] 🎤 Polishing TTS script for state: ${state}`);

    try {
        const prompt = TTS_DIRECTOR_PROMPT
            .replace('{TEXT}', text)
            .replace('{STATE}', state);

        const result = await model.generateContent(prompt);
        const polished = result.response.text().trim();

        console.log(`[PromptEngineer] ✨ Polished: "${polished}"`);
        return polished;

    } catch (error) {
        console.error("[PromptEngineer] Polish Failed:", error);
        return text; // Fallback to original
    }
}
