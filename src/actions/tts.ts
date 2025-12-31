'use server';

import { getVoiceProperties, VoiceProperties } from '@/lib/voiceUtils';

interface TTSRequest {
    text: string;
    speakerId: string;
    emotion?: string;
    psychologicalState?: string;  // ★ 하이퍼 리얼리즘: 심리 상태
    physicalState?: string;        // ★ 하이퍼 리얼리즘: 신체 상태
    overrideParams?: VoiceProperties; // ★ DEV MODE: Manual Override
}

// 1. Preprocessor: Remove content inside parentheses (e.g. stage directions)
// ★ 하이퍼 리얼리즘: 호흡/의성어는 유지하고, 지문만 제거
function preprocessTextForTTS(text: string): string {
    // 1. Remove XML/HTML tags (e.g. <whisper>...</whisper> -> ...)
    const noTags = text.replace(/<[^>]*>/g, "");

    // 2. Remove long parentheses (Stage directions > 12 chars)
    // 호흡 표현은 유지: (후우...), (윽!), (흥,) 등
    // 지문만 제거: (무거운 한숨을 쉬며), (고개를 돌리며) 등
    return noTags.replace(/\([^)]{12,}\)/g, ",").trim();
}

export async function generateSpeechAction({ text, speakerId, emotion, psychologicalState, physicalState, overrideParams }: TTSRequest): Promise<string | null> {
    if (!text || !speakerId) {
        console.warn("[TTS] Missing text or speakerId");
        return null;
    }

    const cleanText = preprocessTextForTTS(text);
    if (!cleanText) {
        console.warn("[TTS] Text became empty after preprocessing (only stage directions?)");
        return null;
    }

    // ★ 하이퍼 리얼리즘: 심리/신체 상태 우선, 없으면 감정 사용
    const effectiveState = physicalState || psychologicalState || emotion || "중립";

    // ★ 하이퍼 리얼리즘: 대사 텍스트도 함께 분석하여 speed/pitch 결정 (Override가 있으면 그것 사용)
    const props = overrideParams || await getVoiceProperties(effectiveState, cleanText);

    console.log(`[TTS] 🎭 Hyper-Realism Speech Generation`);
    console.log(`[TTS] Speaker: ${speakerId}, State: ${effectiveState}`);
    console.log(`[TTS] Original: "${text}" -> Clean: "${cleanText}"`);
    console.log(`[TTS] Properties: speed=${props.speed}, pitch=${props.pitch}`);

    const apiKey = process.env.VARCO_VOICE_API_KEY || process.env.VITE_VARCO_API_KEY || process.env.NEXT_PUBLIC_VARCO_VOICE_API_KEY;

    if (!apiKey) {
        console.error("[TTS] Missing VARCO_VOICE_API_KEY (or VITE_VARCO_API_KEY)");
        return null;
    }

    try {
        const startTime = Date.now();
        console.log(`[TTS] ⏱️ Starting Varco API call...`);

        const response = await fetch('https://openapi.ai.nc.com/tts/standard/v1/api/synthesize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'OPENAPI_KEY': apiKey
            },
            body: JSON.stringify({
                text: cleanText,
                voice: speakerId,
                language: 'korean',
                properties: {
                    speed: props.speed,
                    pitch: props.pitch
                }
            })
        });

        const apiTime = Date.now() - startTime;

        if (!response.ok) {
            console.error(`[TTS] ❌ Varco API Error (${apiTime}ms): ${response.status} ${response.statusText}`);
            const errText = await response.text();
            console.error(`[TTS] └─ Details: ${errText}`);
            return null;
        }

        const data = await response.json();
        const totalTime = Date.now() - startTime;

        if (data.audio) {
            console.log(`[TTS] ✅ Success in ${totalTime}ms (API: ${apiTime}ms) - ${Math.round(data.audio.length / 1024)}KB audio`);
            return `data:audio/wav;base64,${data.audio}`;
        } else {
            console.error(`[TTS] ❌ No audio field in response (${totalTime}ms):`, Object.keys(data));
            return null;
        }

    } catch (error) {
        console.error("[TTS] ❌ Processing error:", error);
        return null;
    }
}
