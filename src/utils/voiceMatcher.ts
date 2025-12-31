import voicesData from '@/data/varco_voices.json';

export interface VoiceProfile {
    uuid: string;
    name: string;
    gender: string;
    age: string;
    tags: string[];
    emotions: string[];
}

export interface CharacterProfile {
    name: string;
    description: string;
    voice_tags: string[]; // e.g., ["male", "old", "wise"]
    voice_map?: Record<string, string>; // emotion -> uuid mapping
}

// Global (in-memory) tracker for voice usage in current session/dimension
// In a real app, this should be part of the World State or Session Store
const currentDimensionVoiceUsage = {
    usedVoiceNames: new Set<string>()
};

export function resetVoiceUsage() {
    currentDimensionVoiceUsage.usedVoiceNames.clear();
}

export async function matchAndCache(character: CharacterProfile): Promise<CharacterProfile> {
    // If already matched, return
    if (character.voice_map && Object.keys(character.voice_map).length > 0) {
        return character;
    }

    const availableVoices = (voicesData as VoiceProfile[]).filter(voice =>
        !currentDimensionVoiceUsage.usedVoiceNames.has(voice.name)
    );

    // If all voices used, fallback to full list (allow duplicates over silence)
    const candidatePool = availableVoices.length > 0 ? availableVoices : (voicesData as VoiceProfile[]);

    // 1. Filter by Strict Tags (Gender, Age) if present in character tags
    const charGender = character.voice_tags.find(t => ['male', 'female', 'neutral'].includes(t.toLowerCase()));
    const charAge = character.voice_tags.find(t => ['young', 'adult', 'old', 'child'].includes(t.toLowerCase()));

    let filtered = candidatePool.filter(voice => {
        let match = true;
        if (charGender && voice.gender !== charGender) match = false;
        if (charAge && voice.age !== charAge) match = false;
        return match;
    });

    // Fallback if strict filtering removed everyone (e.g. no "old" voices left)
    if (filtered.length === 0) {
        filtered = candidatePool;
    }

    // 2. Similarity Score (Jaccard Index-ish) on remaining tags
    let bestMatch: VoiceProfile | null = null;
    let maxScore = -1;

    for (const voice of filtered) {
        let score = 0;
        const voiceTagsSet = new Set(voice.tags.map(t => t.toLowerCase()));

        for (const tag of character.voice_tags) {
            if (voiceTagsSet.has(tag.toLowerCase())) {
                score += 1;
            }
        }

        // Random tie-breaker
        score += Math.random() * 0.5;

        if (score > maxScore) {
            maxScore = score;
            bestMatch = voice;
        }
    }

    if (!bestMatch) {
        // Should not happen unless empty JSON, but safe fallback
        bestMatch = candidatePool[0];
    }

    // 3. Mark as used
    currentDimensionVoiceUsage.usedVoiceNames.add(bestMatch.name);

    // 4. Cache Map (Simulating Emotion Mapping - using same UUID for all as dummy, 
    // real implementation would look up emotion variations if available)
    const voiceMap: Record<string, string> = {};
    const emotions = ["neutral", "happy", "sad", "angry", "fear", "surprise"];

    // In this dummy/MVP version, we assume the UUID handles the voice identity. 
    // If VARCO API requires different UUIDs for different emotions of the SAME voice, we'd map them here.
    // For now, we map all emotions to the base UUID.
    emotions.forEach(em => {
        voiceMap[em] = bestMatch!.uuid;
    });

    character.voice_map = voiceMap;
    console.log(`[VoiceMatcher] Matched '${character.name}' with voice '${bestMatch.name}' (Score: ${maxScore.toFixed(2)})`);

    return character;
}
