'use server';

import { model } from '@/lib/gemini';

// ============================================
// Asset Director Server Action
// AI 기반 자산 결정 로직
// ============================================

export interface AssetDecision {
    action: 'RETRIEVE' | 'VARIATION' | 'NEW_BASE';
    targetId?: string;
    stateKey: string;
    imageUrl?: string;          // RETRIEVE 시 사용
    baseImageRef?: string;      // VARIATION 시 사용
    variationPrompt?: string;   // VARIATION 시 추가 프롬프트
    fullPrompt?: string;        // NEW_BASE 시 전체 프롬프트
    reason: string;
}

export interface AssetContext {
    targetType: 'location' | 'character';
    targetDescription: string;
    currentTime: 'dawn' | 'day' | 'dusk' | 'night';
    currentWeather: 'clear' | 'cloudy' | 'rain' | 'fog' | 'snow';
    currentEvent: string;
    knownAssets: {
        locations: Array<{ id: string; name: string; cachedStates: string[] }>;
        characters: Array<{ id: string; name: string; cachedStates: string[] }>;
    };
    worldStyle: string;  // 세계관 스타일 (예: "사이버펑크 누아르")
}

/**
 * AI Asset Director - 자산 생성/재사용 결정
 * 
 * @param context 현재 상황 및 알려진 자산 목록
 * @returns 자산 결정 (RETRIEVE/VARIATION/NEW_BASE)
 */
export async function decideAssetAction(context: AssetContext): Promise<AssetDecision> {
    const stateKey = `${context.currentTime}_${context.currentWeather}_${context.currentEvent}`;

    console.log(`[AssetDirector] 🎬 ACTION REQ: ${context.targetType} -> "${context.targetDescription}"`);
    console.log(`[AssetDirector] Context: ${stateKey}, World: ${context.worldStyle}`);

    // 1. 로컬에서 먼저 빠른 매칭 시도
    const assets = context.targetType === 'location'
        ? context.knownAssets.locations
        : context.knownAssets.characters;

    // 정확히 일치하는 자산 검색
    const exactMatch = assets.find(a =>
        a.name === context.targetDescription ||
        a.name.includes(context.targetDescription) ||
        context.targetDescription.includes(a.name)
    );

    if (exactMatch) {
        // 상태도 일치하는지 확인
        if (exactMatch.cachedStates.includes(stateKey)) {
            console.log(`[AssetDirector] ✅ RETRIEVE (Exact): ${exactMatch.name} (${stateKey})`);
            return {
                action: 'RETRIEVE',
                targetId: exactMatch.id,
                stateKey,
                reason: `캐시된 이미지 발견: ${exactMatch.name} (${stateKey})`
            };
        } else {
            console.log(`[AssetDirector] 🎨 VARIATION (Exact): ${exactMatch.name} (new state: ${stateKey})`);
            return {
                action: 'VARIATION',
                targetId: exactMatch.id,
                stateKey,
                variationPrompt: generateVariationPrompt(context),
                reason: `기존 자산 발견, 새 상태 필요: ${exactMatch.name}`
            };
        }
    }

    // 2. AI로 더 정교한 매칭 시도 (유사한 장소/인물 찾기)
    if (assets.length > 0) {
        try {
            const aiMatch = await findSimilarAsset(context);
            if (aiMatch) {
                if (aiMatch.cachedStates.includes(stateKey)) {
                    console.log(`[AssetDirector] ✅ RETRIEVE (AI Match): ${aiMatch.name}`);
                    return {
                        action: 'RETRIEVE',
                        targetId: aiMatch.id,
                        stateKey,
                        reason: `AI 매칭: ${aiMatch.name} = ${context.targetDescription}`
                    };
                } else {
                    console.log(`[AssetDirector] 🎨 VARIATION (AI Match): ${aiMatch.name}`);
                    return {
                        action: 'VARIATION',
                        targetId: aiMatch.id,
                        stateKey,
                        variationPrompt: generateVariationPrompt(context),
                        reason: `AI 매칭 (새 상태): ${aiMatch.name}`
                    };
                }
            }
        } catch (err) {
            console.warn('[AssetDirector] AI matching failed, proceeding with NEW_BASE');
        }
    }

    // 3. 신규 생성
    const fullPrompt = generateNewBasePrompt(context);
    console.log(`[AssetDirector] ✨ NEW_BASE: ${context.targetDescription}`);
    console.log(`[AssetDirector] 📝 Generated Prompt: "${fullPrompt}"`);

    return {
        action: 'NEW_BASE',
        stateKey,
        fullPrompt: fullPrompt,
        reason: `신규 ${context.targetType === 'location' ? '장소' : '인물'}: ${context.targetDescription}`
    };
}

/**
 * AI를 사용하여 유사한 자산 찾기
 * "아까 그 가게", "저 골목길" 같은 모호한 표현 처리
 */
async function findSimilarAsset(context: AssetContext): Promise<{ id: string; name: string; cachedStates: string[] } | null> {
    const assets = context.targetType === 'location'
        ? context.knownAssets.locations
        : context.knownAssets.characters;

    if (assets.length === 0) return null;

    const prompt = `당신은 게임의 자산 매칭 시스템입니다.
플레이어가 언급한 대상과 가장 일치하는 기존 자산을 찾으세요.

플레이어 입력: "${context.targetDescription}"
대상 유형: ${context.targetType === 'location' ? '장소' : '인물'}

기존 자산 목록:
${assets.map((a, i) => `${i + 1}. ${a.name} (ID: ${a.id})`).join('\n')}

판단 기준:
- "아까 그 가게", "저 상점" → 가게/상점류 자산과 매칭
- "국수집 주인", "가게 아저씨" → 해당 장소 관련 인물과 매칭
- 명확히 일치하는 것이 없으면 null 반환

응답 형식 (JSON만):
{ "matchIndex": 숫자 또는 null, "confidence": "high"|"medium"|"low", "reason": "이유" }`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.matchIndex !== null && parsed.confidence !== 'low') {
                return assets[parsed.matchIndex - 1] || null;
            }
        }
    } catch (err) {
        console.warn('[AssetDirector] AI matching parse error:', err);
    }

    return null;
}

/**
 * VARIATION 프롬프트 생성
 * 기존 이미지를 참조하며 상태만 변경
 */
function generateVariationPrompt(context: AssetContext): string {
    const timeDesc: Record<string, string> = {
        dawn: '새벽녘, 하늘이 붉게 물드는',
        day: '대낮, 밝은 빛이 내리쬐는',
        dusk: '황혼녘, 노을빛이 비치는',
        night: '밤, 어둠에 싸인'
    };

    const weatherDesc: Record<string, string> = {
        clear: '맑은 날씨',
        cloudy: '흐린 하늘',
        rain: '비가 내리는',
        fog: '안개가 자욱한',
        snow: '눈이 내리는'
    };

    return `${timeDesc[context.currentTime]} ${weatherDesc[context.currentWeather]}, ${context.currentEvent} 분위기. 기존 구조와 외형은 유지하되 분위기만 변경.`;
}

/**
 * NEW_BASE 프롬프트 생성
 * 세계관 스타일 + 대상 설명
 */
function generateNewBasePrompt(context: AssetContext): string {
    const typeDesc = context.targetType === 'location' ? '장소/배경' : '인물 초상화';

    return `[${context.worldStyle} 세계관 스타일] ${typeDesc}: ${context.targetDescription}. 시간: ${context.currentTime}, 날씨: ${context.currentWeather}, 상황: ${context.currentEvent}.`;
}
