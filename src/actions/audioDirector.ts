'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AudioRequest, AudioDirectorResult } from '@/types/audio';

// ★ ElevenLabs Audio Director
// Gemini를 사용하여 한국어 상황을 ElevenLabs 최적화 영문 프롬프트로 변환

// ===============================
// System Prompt (from ElevenLabs Audio Director Guide)
// ===============================
const AUDIO_DIRECTOR_SYSTEM_PROMPT = `
# SYSTEM INSTRUCTION: ElevenLabs Audio Director

## 1. Role Definition
당신은 게임의 [사운드 디자이너 겸 작곡가]입니다.
플레이어의 행동과 현재 씬(Scene)의 분위기를 분석하여, ElevenLabs AI가 최고의 소리를 만들어낼 수 있도록 [구체적인 영문 프롬프트]를 작성해야 합니다.

## 2. Prompt Engineering Rules (ElevenLabs Optimized)
1. **Language:** 모든 프롬프트는 반드시 **영어(English)**로 작성하십시오.
2. **Descriptive Keywords:** 추상적인 표현 대신, 소리의 **재질(Texture)**, **행동(Action)**, **공간감(Environment)**을 묘사하십시오.
   * Bad: "Scary sound" (너무 추상적)
   * Good: "High pitched scream, echoing in a tunnel, metallic scraping, horror ambience"
3. **Conciseness:** 불필요한 문법적 요소(a, the)를 줄이고, 핵심 명사와 형용사 위주로 나열하십시오.

## 3. SFX Generation Logic
프롬프트 구조: [Main Sound Source] + [Action/Movement] + [Material/Surface] + [Environment/Vibe]

## 4. BGM Generation Logic  
프롬프트 구조: [Genre] + [Mood/Emotion] + [Key Instruments] + [Tempo/Rhythm]

## 5. Output Format (JSON ONLY)
반드시 아래 JSON 포맷으로만 응답하십시오. 다른 텍스트 없이 JSON만 출력하세요.

{
  "context_summary": "{상황 요약}",
  "sfx": {
    "required": true,
    "prompt": "{English SFX Prompt}",
    "duration_seconds": 3.0
  },
  "bgm": {
    "required": false,
    "prompt": "",
    "duration_seconds": 0
  }
}

규칙:
- sfx.required: 효과음이 필요하면 true
- bgm.required: 배경음악이 바뀌어야 할 때만 true (대부분 false)
- duration_seconds: SFX는 약 3초, BGM은 약 15초 (루프 재생을 고려하여 자연스럽게)
`;

// ===============================
// Main Function
// ===============================
export async function generateAudioDirectorPrompts(
    context: string,
    currentScene?: string
): Promise<AudioDirectorResult | null> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
        console.warn("[AudioDirector] No GEMINI_API_KEY found.");
        return null;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            systemInstruction: AUDIO_DIRECTOR_SYSTEM_PROMPT,
        });

        const prompt = `
현재 상황: ${context}
${currentScene ? `현재 장면: ${currentScene}` : ''}

위 상황에 맞는 ElevenLabs 오디오 프롬프트를 JSON으로 생성하세요.
`;

        console.log("[AudioDirector] 🎵 Analyzing context for audio generation...");

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("[AudioDirector] No JSON found in response");
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]) as AudioDirectorResult;

        console.log("[AudioDirector] ✅ Generated prompts:", {
            context: parsed.context_summary,
            sfx: parsed.sfx?.required ? parsed.sfx.prompt.substring(0, 50) + "..." : "None",
            bgm: parsed.bgm?.required ? parsed.bgm.prompt.substring(0, 50) + "..." : "None"
        });

        return parsed;

    } catch (error) {
        console.error("[AudioDirector] Error:", error);
        return null;
    }
}

// ===============================
// Quick Prompt Generator (No Gemini)
// 간단한 상황에서 Gemini 없이 빠르게 프롬프트 생성
// ===============================
const QUICK_PROMPTS: Record<string, AudioRequest> = {
    "footsteps": { required: true, prompt: "Footsteps walking on wet concrete, urban atmosphere, realistic", duration_seconds: 3 },
    "rain": { required: true, prompt: "Heavy rain pouring on rooftops, thunder rumbling in distance, stormy night", duration_seconds: 5 },
    "door": { required: true, prompt: "Wooden door creaking open slowly, old hinges, quiet room", duration_seconds: 2 },
    "combat": { required: true, prompt: "Punch impact, flesh hitting, grunt, combat sound", duration_seconds: 2 },
    "tension": { required: true, prompt: "Low rumble, building tension, ominous drone, suspense", duration_seconds: 4 },
    "discovery": { required: true, prompt: "Magical shimmer, discovery chime, wonder sound, subtle sparkle", duration_seconds: 3 },
};

function getQuickSFXPrompt(keyword: string): AudioRequest | null {
    const normalized = keyword.toLowerCase().trim();

    for (const [key, prompt] of Object.entries(QUICK_PROMPTS)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return prompt;
        }
    }

    return null;
}
