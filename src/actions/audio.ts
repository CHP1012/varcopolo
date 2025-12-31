'use server';

import { AudioDirectorResult, AudioRequest } from '@/types/audio';

// ===============================
// ★ ElevenLabs Audio Generation Actions
// SFX and BGM generation using ElevenLabs API
// ===============================

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// ===============================
// SFX Generation
// ===============================
export async function generateSoundEffectAction(
    prompt: string,
    durationSeconds: number = 3
): Promise<string | null> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        console.warn("[Audio/SFX] No ELEVENLABS_API_KEY found.");
        throw new Error("ELEVENLABS_API_KEY is missing in server environment.");
    }

    try {
        console.log(`[Audio/SFX] 🔊 Generating: "${prompt.substring(0, 50)}..." (${durationSeconds}s)`);

        const response = await fetch(`${ELEVENLABS_BASE_URL}/sound-generation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
            },
            body: JSON.stringify({
                text: prompt,
                duration_seconds: Math.min(Math.max(durationSeconds, 0.5), 30), // ElevenLabs limit: 0.5~30s
                prompt_influence: 0.5,
                model_id: "eleven_text_to_sound_v2"
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Audio/SFX] Failed: ${response.status} - ${errorText}`);
            throw new Error(`ElevenLabs API ${response.status}: ${errorText.substring(0, 100)}...`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        console.log("[Audio/SFX] ✅ SFX generated successfully");
        return `data:audio/mpeg;base64,${base64}`;

    } catch (error) {
        console.error("[Audio/SFX] Error:", error);
        throw error;
    }
}

// ===============================
// BGM Generation (Music)
// Note: ElevenLabs Music generation may require different endpoint/plan
// For now, using sound-generation with longer duration for ambient loops
// ===============================
export async function generateBGMAction(
    prompt: string,
    durationSeconds: number = 15
): Promise<string | null> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        console.warn("[Audio/BGM] No ELEVENLABS_API_KEY found.");
        return null;
    }

    try {
        console.log(`[Audio/BGM] 🎵 Generating: "${prompt.substring(0, 50)}..." (${durationSeconds}s)`);

        // ElevenLabs max is 22 seconds, so we cap it there
        const clampedDuration = Math.min(Math.max(durationSeconds, 5), 22);

        const response = await fetch(`${ELEVENLABS_BASE_URL}/sound-generation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
            },
            body: JSON.stringify({
                text: prompt,
                duration_seconds: clampedDuration,
                prompt_influence: 0.7, // Higher influence for music
                model_id: "eleven_text_to_sound_v2"
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Audio/BGM] Failed: ${response.status} - ${errorText}`);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        console.log("[Audio/BGM] ✅ BGM generated successfully");
        return `data:audio/mpeg;base64,${base64}`;

    } catch (error) {
        console.error("[Audio/BGM] Error:", error);
        return null;
    }
}

// ===============================
// ★ Combined: Generate from AudioDirector Result (with Cache)
// ===============================
export async function generateAudioFromDirector(
    directorResult: AudioDirectorResult
): Promise<{ sfx?: string; bgm?: string; sfxFromCache?: boolean; bgmFromCache?: boolean }> {
    const result: { sfx?: string; bgm?: string; sfxFromCache?: boolean; bgmFromCache?: boolean } = {};

    // Import cache service
    const { getAudioWithCache } = await import('./audioCacheService');

    // Generate SFX if required (with cache)
    if (directorResult.sfx?.required && directorResult.sfx.prompt) {
        const context = directorResult.context_summary || directorResult.sfx.prompt;

        const cacheResult = await getAudioWithCache(
            context,
            'sfx',
            async () => generateSoundEffectAction(
                directorResult.sfx!.prompt,
                directorResult.sfx!.duration_seconds
            )
        );

        if (cacheResult) {
            result.sfx = cacheResult.url;
            result.sfxFromCache = cacheResult.fromCache;
            console.log(`[Audio] SFX ${cacheResult.fromCache ? '✅ FROM CACHE' : '🆕 NEWLY GENERATED'}: ${cacheResult.categoryId || 'uncategorized'}`);
        }
    }

    // Generate BGM if required (with cache)
    if (directorResult.bgm?.required && directorResult.bgm.prompt) {
        const context = directorResult.context_summary || directorResult.bgm.prompt;

        const cacheResult = await getAudioWithCache(
            context,
            'bgm',
            async () => generateBGMAction(
                directorResult.bgm!.prompt,
                directorResult.bgm!.duration_seconds
            )
        );

        if (cacheResult) {
            result.bgm = cacheResult.url;
            result.bgmFromCache = cacheResult.fromCache;
            console.log(`[Audio] BGM ${cacheResult.fromCache ? '✅ FROM CACHE' : '🆕 NEWLY GENERATED'}: ${cacheResult.categoryId || 'uncategorized'}`);
        }
    }

    return result;
}

