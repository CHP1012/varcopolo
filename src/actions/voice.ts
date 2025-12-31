'use server';

// Varco Voice List API - Fetches all available voices
// NOTE: Now loads from local JSON for reliability and speed

export interface VarcoVoice {
    speaker_uuid: string;
    speaker_name: string;  // e.g. "데리온", "실라린"
    emotion: string;       // e.g. "중립", "분노", "행복", "슬픔"
    gender: string;        // e.g. "남성", "여성"
    age: string;           // e.g. "노년", "청년", "중년"
    pitch: string;         // e.g. "고음", "중음", "저음"
    properties: string[];  // e.g. ["거친", "차분한", "부드러운"]
}

// ★ Parse the Korean description string into structured attributes
function parseVoiceDescription(description: string): { gender: string; age: string; pitch: string; properties: string[] } {
    const parts = description.split(',').map(s => s.trim());

    // First item is typically gender
    let gender = '남성'; // Default
    if (parts[0]?.includes('여성')) gender = '여성';
    else if (parts[0]?.includes('남성')) gender = '남성';

    // Second item is typically age
    let age = '청년'; // Default
    const ageMap: Record<string, string> = {
        '어린이': '어린이',
        '청소년': '청소년',
        '청년': '청년',
        '중년': '중년',
        '노년': '노년'
    };
    for (const [key, value] of Object.entries(ageMap)) {
        if (parts[1]?.includes(key)) {
            age = value;
            break;
        }
    }

    // Third item is typically pitch
    let pitch = '중음'; // Default
    if (parts[2]?.includes('고음')) pitch = '고음';
    else if (parts[2]?.includes('저음')) pitch = '저음';
    else if (parts[2]?.includes('중음')) pitch = '중음';

    // Remaining items are properties (skip gender, age, pitch related parts)
    const properties = parts.slice(3).filter(p =>
        p &&
        !['남성', '여성', '어린이', '청소년', '청년', '중년', '노년', '고음', '중음', '저음', '굵음', '얇음', '거침', '맑음'].includes(p)
    );

    // Also include voice texture as properties (굵음, 얇음 etc)
    if (parts[3]) properties.push(parts[3]);

    return { gender, age, pitch, properties };
}

// Cache for voice list
let cachedVoices: VarcoVoice[] | null = null;

export async function fetchVarcoVoiceList(): Promise<VarcoVoice[]> {
    // Check cache
    if (cachedVoices && cachedVoices.length > 0) {
        console.log("[Varco Voice List] Returning cached voices");
        return cachedVoices;
    }

    try {
        console.log("[Varco Voice List] Loading from local JSON...");
        // Import the static JSON data
        const rawVoices = (await import('@/data/varco_voices_full.json')).default as Array<{
            no: number;
            speaker_uuid: string;
            speaker_name: string;
            saas_name: string | null;
            description: string;
        }>;

        console.log(`[Varco Voice List] Raw entries: ${rawVoices.length}`);

        // Parse each entry into the VarcoVoice format
        const voices: VarcoVoice[] = rawVoices.map(raw => {
            const { gender, age, pitch, properties } = parseVoiceDescription(raw.description);

            // Parse emotion from speaker_name if present (e.g., "가레스(분노)")
            const emotionMatch = raw.speaker_name.match(/\((.+)\)$/);
            const emotion = emotionMatch ? emotionMatch[1] : '중립';

            return {
                speaker_uuid: raw.speaker_uuid,
                speaker_name: raw.speaker_name,
                emotion,
                gender,
                age,
                pitch,
                properties
            };
        });

        console.log(`[Varco Voice List] Parsed ${voices.length} voices`);

        // Update cache
        cachedVoices = voices;
        return voices;

    } catch (error) {
        console.error("[Varco Voice List] Load error:", error);
        return getFallbackVoices();
    }
}

// Fallback voices based on known Varco voice data
function getFallbackVoices(): VarcoVoice[] {
    return [
        { speaker_uuid: "297d6972-b87d-57dc-86e0-70534b924ef5", speaker_name: "가레스(중립)", emotion: "중립", gender: "남성", age: "중년", pitch: "저음", properties: ["맑음", "따뜻한"] },
        { speaker_uuid: "74dcea6a-29b3-5d92-82d0-3c03225d79e4", speaker_name: "가렛(중립)", emotion: "중립", gender: "남성", age: "중년", pitch: "저음", properties: ["굵음", "강인한"] },
        { speaker_uuid: "1249e39f-317f-5a2e-96f6-82489348b4fd", speaker_name: "갈도르(중립)", emotion: "중립", gender: "남성", age: "노년", pitch: "중음", properties: ["거침", "노련한"] },
        { speaker_uuid: "adfc2330-3a22-501b-897d-313d7472f2d8", speaker_name: "나디스(중립)", emotion: "중립", gender: "여성", age: "청년", pitch: "고음", properties: ["맑음", "차분한"] },
        { speaker_uuid: "78f25ef6-caf5-53b9-9e0b-fa5ebf3fceae", speaker_name: "나엘린(중립)", emotion: "중립", gender: "여성", age: "중년", pitch: "저음", properties: ["굵음", "경건한"] },
    ];
}

// Find the best matching voice for a character
export async function findVoiceForCharacter(
    characterName: string,
    desiredTags: { gender?: string; age?: string; pitch?: string; properties?: string[] },
    emotion: string = "중립",
    usedVoiceNames: string[] = []
): Promise<string | null> {
    const voices = await fetchVarcoVoiceList();

    if (voices.length === 0) {
        console.warn("[Varco Voice Match] No voices available");
        return null;
    }

    // Filter out already used voices
    let availableVoices = voices.filter(v => !usedVoiceNames.includes(v.speaker_name));

    // If all used, allow duplicates
    if (availableVoices.length === 0) {
        availableVoices = voices;
    }

    // Filter by gender if specified
    if (desiredTags.gender) {
        const filtered = availableVoices.filter(v => v.gender === desiredTags.gender);
        if (filtered.length > 0) availableVoices = filtered;
    }

    // Filter by age if specified
    if (desiredTags.age) {
        const filtered = availableVoices.filter(v => v.age === desiredTags.age);
        if (filtered.length > 0) availableVoices = filtered;
    }

    // Filter by emotion
    let emotionFiltered = availableVoices.filter(v => v.emotion === emotion);
    if (emotionFiltered.length === 0) {
        emotionFiltered = availableVoices.filter(v => v.emotion === "중립");
    }
    if (emotionFiltered.length === 0) {
        emotionFiltered = availableVoices;
    }

    // Score by property matching
    let bestMatch: VarcoVoice | null = null;
    let maxScore = -1;

    for (const voice of emotionFiltered) {
        let score = 0;
        const props = voice.properties || [];
        const voiceProps = new Set(props.map(p => p.toLowerCase()));

        for (const prop of desiredTags.properties || []) {
            if (voiceProps.has(prop.toLowerCase())) {
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

    if (!bestMatch && emotionFiltered.length > 0) {
        bestMatch = emotionFiltered[Math.floor(Math.random() * emotionFiltered.length)];
    }

    if (bestMatch) {
        console.log(`[Varco Voice Match] Matched '${characterName}' -> '${bestMatch.speaker_name}' (${bestMatch.emotion})`);
        return bestMatch.speaker_uuid;
    }

    return null;
}
