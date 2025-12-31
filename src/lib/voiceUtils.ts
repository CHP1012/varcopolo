// ★ Pure utility functions for voice properties
// This file has NO 'use client' or 'use server' directive
// So it can be imported from both server actions and client components
// This file contains the hyper-realism voice parameter system

export interface VoiceProperties {
    speed: number;
    pitch: number;
}

// ===============================
// ★ 하이퍼 리얼리즘 보이스 파라미터 시스템
// 감정 + 심리 상태 + 신체 상태에 따른 speed/pitch 정밀 제어
// ===============================
export const HYPER_REALISM_VOICE_PROPERTIES: Record<string, VoiceProperties> = {
    // ===== 기본 감정 (Basic Emotions) =====
    // ===== 기본 감정 (Basic Emotions) =====
    "중립": { speed: 1.0, pitch: 1.0 },
    "neutral": { speed: 1.0, pitch: 1.0 },

    "행복": { speed: 1.05, pitch: 1.05 },       // Reduced from 1.1, 1.1
    "happiness": { speed: 1.05, pitch: 1.05 },
    "기쁨": { speed: 1.08, pitch: 1.08 },       // Reduced from 1.15, 1.15

    "슬픔": { speed: 0.90, pitch: 0.95 },       // Reduced variance (slower 0.85->0.9, pitch 0.9->0.95)
    "sadness": { speed: 0.90, pitch: 0.95 },

    "분노": { speed: 0.95, pitch: 0.95 },       // Kept similar (stable anger)
    "anger": { speed: 0.95, pitch: 0.95 },

    // ===== 심리적 상태 (Psychological States) =====
    "비꼼": { speed: 0.90, pitch: 1.05 },       // Pitch 1.10 -> 1.05
    "빈정": { speed: 0.90, pitch: 1.05 },
    "sarcasm": { speed: 0.90, pitch: 1.05 },

    "냉철": { speed: 0.92, pitch: 0.92 },       // Less extreme slow/low
    "협박": { speed: 0.92, pitch: 0.90 },       // Pitch 0.85 -> 0.90
    "위협": { speed: 0.90, pitch: 0.90 },
    "cold_threat": { speed: 0.90, pitch: 0.90 },

    "당황": { speed: 1.20, pitch: 1.10 },       // Pitch 1.18 -> 1.10, Speed 1.30 -> 1.20
    "횡설수설": { speed: 1.25, pitch: 1.15 },
    "flustered": { speed: 1.20, pitch: 1.10 },

    "광기": { speed: 1.20, pitch: 1.35 },       // Pitch 1.45 -> 1.35 (still high but safer)
    "조소": { speed: 1.15, pitch: 1.30 },       // Pitch 1.50 -> 1.30
    "madness": { speed: 1.20, pitch: 1.35 },

    "수줍음": { speed: 0.95, pitch: 1.04 },     // Pitch 1.08 -> 1.04
    "shy": { speed: 0.95, pitch: 1.04 },

    // ===== 추가 심리 상태 (v1.5) =====
    "억누르는분노": { speed: 0.92, pitch: 0.88 },  // Pitch 0.82 -> 0.88
    "suppressed": { speed: 0.92, pitch: 0.88 },
    "체념": { speed: 0.85, pitch: 0.95 },          // Pitch 0.92 -> 0.95, Speed 0.80 -> 0.85
    "허탈": { speed: 0.82, pitch: 0.94 },
    "resignation": { speed: 0.85, pitch: 0.95 },
    "아부": { speed: 1.05, pitch: 1.10 },          // Pitch 1.20 -> 1.10
    "비굴": { speed: 1.05, pitch: 1.08 },
    "flattery": { speed: 1.05, pitch: 1.10 },

    // ===== 신체적/환경적 상태 (Physical & Environmental) =====
    "빈사": { speed: 0.75, pitch: 0.90 },       // Pitch 0.85 -> 0.90, Speed 0.68 -> 0.75
    "dying": { speed: 0.75, pitch: 0.90 },
    "지침": { speed: 0.78, pitch: 0.92 },
    "exhausted": { speed: 0.78, pitch: 0.92 },

    "기합": { speed: 1.30, pitch: 1.25 },       // Pitch 1.30 -> 1.25
    "전투": { speed: 1.30, pitch: 1.20 },
    "combat": { speed: 1.30, pitch: 1.20 },

    "속삭임": { speed: 0.90, pitch: 0.95 },     // Pitch 0.90 -> 0.95
    "whisper": { speed: 0.90, pitch: 0.95 },

    "취함": { speed: 0.80, pitch: 0.98 },       // Pitch 1.00 -> 0.98
    "drunk": { speed: 0.80, pitch: 0.98 },

    // ===== 복합 감정 (Complex) =====
    "냉소": { speed: 0.90, pitch: 1.02 },       // Pitch 1.05 -> 1.02
    "경멸": { speed: 0.88, pitch: 1.04 },
    "긴장": { speed: 1.10, pitch: 1.05 },       // Pitch 1.10 -> 1.05
    "공포": { speed: 1.15, pitch: 1.20 },
    "비통": { speed: 0.80, pitch: 0.90 },
    "절망": { speed: 0.75, pitch: 0.85 },
    "흥분": { speed: 1.15, pitch: 1.15 },
    "시무룩": { speed: 0.92, pitch: 0.96 },
};

/**
 * ★ 텍스트 뉘앙스 분석 엔진 (Text Nuance Analysis)
 * 대사 텍스트에서 문장 부호, 어미, 단어 선택을 분석하여 감정 힌트 추출
 */
export function analyzeTextNuance(text: string): { emotion: string; speedMod: number; pitchMod: number } {
    let speedMod = 0;
    let pitchMod = 0;
    let detectedEmotion = "중립";

    // 1. 문장 부호 분석
    const exclamationCount = (text.match(/!/g) || []).length;
    const ellipsisCount = (text.match(/\.\.\./g) || []).length;

    if (exclamationCount >= 2) {
        speedMod += 0.15;
        pitchMod += 0.20;
        detectedEmotion = "흥분";
    }
    if (ellipsisCount >= 2) {
        speedMod -= 0.15;
        pitchMod -= 0.10;
        detectedEmotion = "망설임";
    }

    // 2. 위축/공포 단어
    const fearWords = ["제발", "혹시", "죄송", "미안", "두려", "무서"];
    if (fearWords.some(w => text.includes(w))) {
        speedMod -= 0.05;
        pitchMod += 0.05;
        detectedEmotion = "수줍음";
    }

    // 3. 공격성 단어
    const aggressiveWords = ["닥쳐", "당장", "죽여", "꺼져", "망할"];
    if (aggressiveWords.some(w => text.includes(w))) {
        speedMod += 0.10;
        pitchMod -= 0.05;
        detectedEmotion = "분노";
    }

    // 4. 비꼼/반어법 패턴 ("참 잘~", "대~단", "정~말")
    if (text.match(/[가-힣]~[가-힣]/)) {
        speedMod -= 0.15;
        pitchMod += 0.10;
        detectedEmotion = "비꼼";
    }

    // 5. 한숨/체념 패턴
    if (text.includes("(하...)") || text.includes("(후우...)") || text.includes("하아...")) {
        speedMod -= 0.10; // Reduced from 0.20
        pitchMod -= 0.05; // Reduced from 0.10
        detectedEmotion = "체념";
    }

    // ★ Hyper-Realism Tuning: Clamp modifiers for stability
    // 너무 과도한 변조를 막기 위해 modifier 제한
    speedMod = Math.max(-0.3, Math.min(0.3, speedMod));
    pitchMod = Math.max(-0.3, Math.min(0.3, pitchMod));

    return { emotion: detectedEmotion, speedMod, pitchMod };
}

/**
 * 감정/상태 키워드로부터 Voice Properties 가져오기
 * @param emotionOrState 감정 또는 상태 키워드 (예: "광기", "속삭임", "분노")
 * @param dialogueText Optional: 대사 텍스트 (뉘앙스 분석용)
 * @returns { speed, pitch } 값
 */
export function getVoiceProperties(emotionOrState: string, dialogueText?: string): VoiceProperties {
    const normalized = emotionOrState.toLowerCase().trim();

    // 기본 감정 매칭
    let baseProps: VoiceProperties = { speed: 1.0, pitch: 1.0 };

    // 직접 매칭
    if (HYPER_REALISM_VOICE_PROPERTIES[normalized]) {
        baseProps = { ...HYPER_REALISM_VOICE_PROPERTIES[normalized] };
    } else {
        // 부분 매칭 (키워드 포함)
        for (const [key, props] of Object.entries(HYPER_REALISM_VOICE_PROPERTIES)) {
            if (normalized.includes(key) || key.includes(normalized)) {
                baseProps = { ...props };
                break;
            }
        }
    }

    // ★ 텍스트 뉘앙스 분석으로 미세 조정
    if (dialogueText) {
        const nuance = analyzeTextNuance(dialogueText);
        baseProps.speed = Math.max(0.5, Math.min(2.0, baseProps.speed + nuance.speedMod));
        baseProps.pitch = Math.max(0.5, Math.min(2.0, baseProps.pitch + nuance.pitchMod));
    }

    // 소수점 둘째 자리까지
    return {
        speed: Math.round(baseProps.speed * 100) / 100,
        pitch: Math.round(baseProps.pitch * 100) / 100
    };
}
