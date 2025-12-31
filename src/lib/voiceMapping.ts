'use server';

// Server-side voice mapping utility
// Implements character-voice caching per Varco API 지능형 보이스 매핑 시스템 지침

import { fetchVarcoVoiceList } from '@/actions/voice';

/**
 * Varco Voice 지능형 매핑 시스템
 * 
 * 핵심 원리:
 * 1. 캐릭터 고정: 같은 캐릭터는 항상 같은 기본 화자 사용
 * 2. 감정 매핑: 대사 감정에 맞는 UUID 변형 사용
 * 3. ★ 세계관 분위기 반영: 테마에 맞는 목소리 스타일 우선 선택
 */

interface CharacterInfo {
    gender?: string;
    age?: string;
    voice_style?: string[];
}

// ===============================
// 0. SMART FALLBACK VOICES (Gender/Age Based)
// ===============================
const SMART_FALLBACK_VOICES: Record<string, string> = {
    "male_teen": "9e7d201d-a18a-5343-8e05-057a78e6d432",   // 깐깐이 (High pitch)
    "male_young": "7c34ecc2-3665-57f6-9a31-902d4549c1ad",  // 가리온
    "male_middle": "297d6972-b87d-57dc-86e0-70534b924ef5", // 가레스
    "male_old": "1249e39f-317f-5a2e-96f6-82489348b4fd",    // 갈도르
    "female_teen": "3aa817b3-b871-5b97-bf78-759c40b830c4", // 노엘라
    "female_young": "adfc2330-3a22-501b-897d-313d7472f2d8",// 나디스
    "female_middle": "78f25ef6-caf5-53b9-9e0b-fa5ebf3fceae",// 나엘린
    "female_old": "0b89f11b-1bbe-516c-9734-9b258ea0e83f"   // 니마라
};

// ★ SYSTEM VOICE - 기계적, 단조로운, 여성 AI 목소리
// 시스템 메시지, 안내 방송, AI 등에 사용
const SYSTEM_VOICE_UUID = "78f25ef6-caf5-53b9-9e0b-fa5ebf3fceae"; // 나엘린 (차분하고 낮은 여성)
// Alternative: "adfc2330-3a22-501b-897d-313d7472f2d8" (나디스 - 더 밝은 톤)

const DEFAULT_FALLBACK_UUID = SMART_FALLBACK_VOICES["male_middle"];

function getSmartFallbackVoice(gender?: string, age?: string): { uuid: string; baseName: string } {
    const rawG = (gender || "male").toLowerCase();
    const rawA = (age || "middle").toLowerCase();

    // Normalize Age
    let ageKey = "middle";
    if (rawA.includes("teen") || rawA.match(/child|kid|boy|girl|어린|아이|청소년/)) ageKey = "teen";
    else if (rawA.match(/young|youth|adult|청년|20|30/)) ageKey = "young";
    else if (rawA.match(/old|elder|aged|grand|노년|노인|60|70|80/)) ageKey = "old";

    // Normalize Gender
    const genderKey = (rawG.match(/female|woman|girl|lady|여성|여자/) ? "female" : "male");

    const key = `${genderKey}_${ageKey}`;
    const uuid = SMART_FALLBACK_VOICES[key] || DEFAULT_FALLBACK_UUID;

    // Find base name for logging (Optional, hardcoded map for convenience)
    const nameMap: Record<string, string> = {
        "male_teen": "깐깐이", "male_young": "가리온", "male_middle": "가레스", "male_old": "갈도르",
        "female_teen": "노엘라", "female_young": "나디스", "female_middle": "나엘린", "female_old": "니마라"
    };

    return { uuid, baseName: nameMap[key] || "가레스" };
}


// ===============================
// 1. 세계관 테마별 선호 보이스 속성
// ===============================
const THEME_VOICE_PREFERENCES: Record<string, string[]> = {
    // 누아르/범죄 - 진중하고 낮은 톤
    "noir": ["낮은", "진중한", "거친", "차가운", "무거운", "어두운", "냉소적", "냉정한"],
    "shadow": ["낮은", "진중한", "거친", "차가운", "무거운", "어두운"],
    "그림자": ["낮은", "진중한", "거친", "차가운", "무거운", "어두운"],
    "부패": ["낮은", "진중한", "거친", "냉소적", "무거운"],
    "범죄": ["낮은", "거친", "냉정한", "차가운"],
    "항구": ["거친", "낮은", "바다", "피곤한"],

    // 무협/판타지 - 위엄있고 힘있는
    "무협": ["위엄있는", "힘있는", "거친", "진중한", "중후한"],
    "무림": ["위엄있는", "힘있는", "거친", "진중한", "중후한"],
    "판타지": ["장엄한", "위엄있는", "신비로운", "따뜻한"],

    // 사이버펑크 - 차갑고 기계적
    "사이버": ["차가운", "기계적", "냉정한", "날카로운"],
    "네온": ["차가운", "기계적", "냉정한", "날카로운"],
    "디스토피아": ["차가운", "암울한", "무거운", "냉소적"],

    // 코즈믹 호러 - 신비롭고 불안한
    "호러": ["속삭이는", "불안한", "신비로운", "낮은", "떨리는"],
    "공포": ["속삭이는", "불안한", "신비로운", "낮은"],

    // 밝은 판타지/로맨스 - 따뜻하고 부드러운
    "로맨스": ["따뜻한", "부드러운", "상냥한", "밝은"],
    "희망": ["따뜻한", "밝은", "에너지있는", "부드러운"],

    // 기본값
    "default": ["자연스러운", "중립", "편안한"]
};

// ===============================
// 2. 세계관별 보이스 중복 방지 시스템
// NOTE: 서버리스 환경에서는 요청마다 리셋됨 - 클라이언트 상태 전달 필요
// ===============================
const currentDimensionVoiceUsage = {
    dimensionId: '',
    worldTheme: '',
    usedVoiceNames: new Set<string>(),
    speakerVoiceMap: new Map<string, string>()
};

export async function resetVoiceUsage(dimensionId: string, worldTheme?: string): Promise<void> {
    console.log(`[VoiceManager] Resetting voice usage for dimension: ${dimensionId}, theme: ${worldTheme || 'unknown'}`);
    currentDimensionVoiceUsage.dimensionId = dimensionId;
    currentDimensionVoiceUsage.worldTheme = worldTheme || '';
    currentDimensionVoiceUsage.usedVoiceNames.clear();
    currentDimensionVoiceUsage.speakerVoiceMap.clear();
}

// ===============================
// 3. 유틸리티 함수들
// ===============================
function parseVoiceName(speakerName: string): { baseName: string; emotion: string } {
    const match = speakerName.match(/^(.+?)\((.+)\)$/);
    if (match) {
        return { baseName: match[1], emotion: match[2] };
    }
    return { baseName: speakerName, emotion: "중립" };
}

// 세계관 설명에서 테마 키워드 추출
function extractThemeKeywords(worldDescription: string): string[] {
    const keywords: string[] = [];
    const desc = worldDescription.toLowerCase();

    for (const theme of Object.keys(THEME_VOICE_PREFERENCES)) {
        if (desc.includes(theme.toLowerCase())) {
            keywords.push(theme);
        }
    }

    // 추가 키워드 감지
    if (desc.includes("비") || desc.includes("그림자") || desc.includes("어두운") || desc.includes("밤")) keywords.push("shadow");
    if (desc.includes("부패") || desc.includes("범죄") || desc.includes("항구")) keywords.push("noir");
    if (desc.includes("잿빛") || desc.includes("낡은") || desc.includes("조사")) keywords.push("noir");

    return keywords.length > 0 ? keywords : ["default"];
}

// 테마에 맞는 선호 속성 가져오기
function getThemePreferredProperties(worldDescription?: string): string[] {
    if (!worldDescription) return THEME_VOICE_PREFERENCES["default"];

    const themes = extractThemeKeywords(worldDescription);
    const allProps: string[] = [];

    for (const theme of themes) {
        const props = THEME_VOICE_PREFERENCES[theme] || [];
        allProps.push(...props);
    }

    return [...new Set(allProps)];
}

// ===============================
// 4. 보이스 데이터 그룹핑
// ===============================
interface GroupedVoice {
    baseName: string;
    gender: string;
    age: string;
    properties: string[];
    emotionMap: Record<string, string>;
}

let cachedVoiceGroups: Map<string, GroupedVoice> | null = null;

async function buildVoiceGroups(): Promise<Map<string, GroupedVoice>> {
    if (cachedVoiceGroups) {
        return cachedVoiceGroups;
    }

    const voices = await fetchVarcoVoiceList(); // This is where the big JSON list comes from
    const groups = new Map<string, GroupedVoice>();

    for (const voice of voices) {
        // Use the explicit emotion field if provided by API, otherwise parse from name
        // The list provided by user has explicit 'speaker_name': '가레스(분노)'
        const { baseName, emotion: parsedEmotion } = parseVoiceName(voice.speaker_name);
        const emotion = voice.emotion || parsedEmotion || "중립";

        if (!groups.has(baseName)) {
            groups.set(baseName, {
                baseName,
                gender: voice.gender,
                age: voice.age,
                properties: voice.properties || [],
                emotionMap: {}
            });
        }

        const group = groups.get(baseName)!;
        group.emotionMap[emotion] = voice.speaker_uuid;
    }

    console.log(`[VoiceGroups] Built $\{groups.size\} unique voice characters`);
    cachedVoiceGroups = groups;
    return groups;
}

// ===============================
// 5. 캐릭터-보이스 매칭 (핵심 로직)
// ===============================
/**
 * 캐릭터에게 세계관 분위기에 맞는 목소리 할당
 * 
 * @param speakerName 캐릭터/화자 이름 (예: "골목길 남자")
 * @param characterInfo Gemini가 생성한 캐릭터 정보
 * @param emotion 현재 감정
 * @param worldContext 세계관 설명 (분위기 매칭용) - 선택
 * @param voiceCache 클라이언트에서 전달하는 캐릭터-보이스 매핑 캐시 (선택)
 */
export async function selectVoiceForCharacter(
    uniqueId: string, // Was speakerName. Now serves as the STABLE key.
    characterInfo?: { gender?: string; age?: string; voice_style?: string[] },
    emotion: string = '중립',
    worldContext?: string,
    voiceCache?: Record<string, string>,
    displayName?: string // Optional for logging
): Promise<{ voiceUuid: string; voiceBaseName: string }> {
    const logName = displayName ? `$\{displayName} (${uniqueId})` : uniqueId;
    console.log(`[VoiceSelector] 🔍 Matching voice for: [${logName}]`);
    console.log(`[VoiceSelector]    ├─ Info: ${JSON.stringify(characterInfo)}`);
    console.log(`[VoiceSelector]    ├─ Emotion: ${emotion}`);
    console.log(`[VoiceSelector]    └─ World Context: ${worldContext?.substring(0, 50)}...`);

    const groups = await buildVoiceGroups();

    if (groups.size === 0) {
        console.error('[VoiceSelector] No voices available from API. Using Smart Fallback.');
        const fallback = getSmartFallbackVoice(characterInfo?.gender, characterInfo?.age);
        return { voiceUuid: fallback.uuid, voiceBaseName: fallback.baseName };
    }

    // ★ 클라이언트 캐시에서 이미 할당된 보이스 확인
    if (voiceCache && voiceCache[uniqueId]) {
        const assignedBaseName = voiceCache[uniqueId];
        const assignedGroup = groups.get(assignedBaseName);

        if (assignedGroup) {
            const uuid = assignedGroup.emotionMap[emotion] || assignedGroup.emotionMap["중립"];
            console.log(`[VoiceSelector] Reusing '${assignedBaseName}' for '${logName}', emotion: ${emotion}`);
            // If specific emotion UUID missing, fallback to neutral
            return { voiceUuid: uuid || assignedGroup.emotionMap["중립"] || Object.values(assignedGroup.emotionMap)[0], voiceBaseName: assignedBaseName };
        }
    }

    // 서버 측 캐시도 확인
    if (currentDimensionVoiceUsage.speakerVoiceMap.has(uniqueId)) {
        const assignedBaseName = currentDimensionVoiceUsage.speakerVoiceMap.get(uniqueId)!;
        const assignedGroup = groups.get(assignedBaseName);

        if (assignedGroup) {
            const uuid = assignedGroup.emotionMap[emotion] || assignedGroup.emotionMap["중립"];
            console.log(`[VoiceSelector] Reusing (server cache) '${assignedBaseName}' for '${logName}', emotion: ${emotion}`);
            return { voiceUuid: uuid || assignedGroup.emotionMap["중립"] || Object.values(assignedGroup.emotionMap)[0], voiceBaseName: assignedBaseName };
        }
    }

    // 새 캐릭터: 보이스 할당
    const usedNames = new Set([
        ...currentDimensionVoiceUsage.usedVoiceNames,
        ...(voiceCache ? Object.values(voiceCache) : [])
    ]);

    const availableGroups = Array.from(groups.values()).filter(
        g => !usedNames.has(g.baseName)
    );
    // Reuse pool if we run out of voices
    const candidatePool = availableGroups.length > 0 ? availableGroups : Array.from(groups.values());

    // 필터 1: 성별
    let filtered = candidatePool;
    if (characterInfo?.gender) {
        // Normalize input to Korean gender
        const genderMap: Record<string, string> = {
            "남성": "남성", "male": "남성", "맨": "남성", "남자": "남성",
            "여성": "여성", "female": "여성", "우먼": "여성", "여자": "여성"
        };
        const targetGender = genderMap[characterInfo.gender.toLowerCase()] || "남성";

        const genderFiltered = filtered.filter(g => g.gender === targetGender);

        // ★ STRICT: Only use gender matches.
        if (genderFiltered.length > 0) {
            filtered = genderFiltered;
            console.log(`[VoiceSelector] ✓ Gender filtered to '${targetGender}': ${genderFiltered.length} candidates`);
        } else {
            console.error(`[VoiceSelector] ✗ CRITICAL: No matches for gender '${targetGender}'. USING SMART FALLBACK.`);
            const fallback = getSmartFallbackVoice(characterInfo.gender, characterInfo.age);
            return { voiceUuid: fallback.uuid, voiceBaseName: fallback.baseName };
        }
    } else {
        console.warn(`[VoiceSelector] ⚠ No character_info.gender provided! Defaulting to Male Fallback Logic.`);
    }

    // 필터 2: 나이 - ★ 더 중요한 매칭 기준
    if (characterInfo?.age) {
        const ageMap: Record<string, string> = {
            "청년": "청년", "young": "청년", "아이": "어린이", "학생": "청소년",
            "중년": "중년", "adult": "중년", "성인": "중년", "아저씨": "중년",
            "노년": "노년", "old": "노년", "노인": "노년", "할아버지": "노년", "할머니": "노년",
            "elderly": "노년", "elder": "노년", "grandpa": "노년", "grandma": "노년",
            "어린이": "어린이", "청소년": "청소년"
        };
        const targetAge = ageMap[characterInfo.age.toLowerCase()] || "청년";

        const ageFiltered = filtered.filter(g => g.age === targetAge);

        if (ageFiltered.length > 0) {
            filtered = ageFiltered;
            console.log(`[VoiceSelector] ✓ Age filtered to '${targetAge}': ${ageFiltered.length} candidates`);
        } else {
            // ★ FIX: No age match - use SMART FALLBACK instead of random same-gender
            // This ensures elderly characters get elderly voices, even if not the best style match
            console.warn(`[VoiceSelector] ⚠ No ${targetAge} voices found for gender. Using SMART FALLBACK.`);
            const fallback = getSmartFallbackVoice(characterInfo.gender, characterInfo.age);
            return { voiceUuid: fallback.uuid, voiceBaseName: fallback.baseName };
        }
    }

    // ★ 핵심: 세계관 분위기 + 캐릭터 스타일 점수 계산
    const themePrefs = getThemePreferredProperties(worldContext || currentDimensionVoiceUsage.worldTheme);
    const characterStyles = characterInfo?.voice_style || [];

    let bestMatch: GroupedVoice | null = null;
    let highestScore = -1;

    for (const group of filtered) {
        let score = 0;
        const groupProps = new Set(group.properties.map(p => p.toLowerCase()));

        // ★ 세계관 분위기 매칭 (가중치 3)
        for (const pref of themePrefs) {
            if (groupProps.has(pref.toLowerCase())) {
                score += 3;
            }
        }

        // 캐릭터 스타일 매칭 (가중치 2)
        for (const style of characterStyles) {
            if (groupProps.has(style.toLowerCase())) {
                score += 2;
            }
        }

        // 랜덤 타이브레이커
        score += Math.random() * 0.5;

        if (score > highestScore) {
            highestScore = score;
            bestMatch = group;
        }
    }

    // Fallback
    if (!bestMatch) {
        if (filtered.length > 0) {
            bestMatch = filtered[Math.floor(Math.random() * filtered.length)];
        } else {
            // 성별 필터링 등 다 통과 못했을 경우 (이론상 위에서 잡지만 안전장치)
            console.error('[VoiceSelector] Logic Error: No match found after filters. Using Smart Fallback.');
            const fallback = getSmartFallbackVoice(characterInfo?.gender, characterInfo?.age);
            return { voiceUuid: fallback.uuid, voiceBaseName: fallback.baseName };
        }
    }

    // 서버 캐싱
    if (bestMatch) {
        currentDimensionVoiceUsage.usedVoiceNames.add(bestMatch.baseName);
        currentDimensionVoiceUsage.speakerVoiceMap.set(uniqueId, bestMatch.baseName);

        const uuid = bestMatch.emotionMap[emotion] || bestMatch.emotionMap["중립"] || Object.values(bestMatch.emotionMap)[0];

        console.log(`[VoiceSelector] NEW: '${bestMatch.baseName}' → '${logName}' (score: ${highestScore.toFixed(1)})`);
        return { voiceUuid: uuid, voiceBaseName: bestMatch.baseName };
    }

    // Unreachable fallback (just in case TS complains)
    return { voiceUuid: SMART_FALLBACK_VOICES["male_middle"], voiceBaseName: "가레스" };
}

// ===============================
// 6. 감정별 음성 속성 조절 (함수로 변환 - 'use server'에서는 객체 export 불가)
// ===============================
export async function getEmotionProperties(emotion: string): Promise<{ speed: number; pitch: number }> {
    const props: Record<string, { speed: number; pitch: number }> = {
        "분노": { speed: 0.95, pitch: 0.95 },
        "행복": { speed: 1.1, pitch: 1.1 },
        "슬픔": { speed: 0.85, pitch: 0.9 },
        "중립": { speed: 1.0, pitch: 1.0 },
    };
    return props[emotion] || props["중립"];
}
