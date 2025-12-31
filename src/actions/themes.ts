'use server';

import { model } from '@/lib/gemini';

// Dynamic Theme interface
export interface DynamicTheme {
    id: string;
    name: string;
    hint: string;
    desc: string;
}

/**
 * AI로 새로운 테마들을 동적으로 생성
 * 기존 테마와 다른 새롭고 독창적인 세계관 10개 생성
 */
export async function generateNewThemes(): Promise<DynamicTheme[]> {
    try {
        const prompt = `당신은 몰입감 있는 세계관을 만드는 픽션 작가입니다.
플레이어가 탐험할 수 있는 독특하고 분위기 있는 세계관 10개를 생성하세요.

★ 핵심 요구사항:
- "단어 + 단어" 조합이 아닌, 자연스럽고 시적인 이름을 사용 (예: "잿빛 항구", "잊혀진 숲", "부서진 왕관")
- 각 세계관은 고유한 분위기와 미스터리를 가져야 함
- 기존 판타지/SF 클리셰를 피하고 독창적인 컨셉 제시
- 플레이어의 호기심을 자극하는 신비로운 느낌

★ 이름 스타일 예시:
- 좋은 예: "잿빛 항구", "천년의 안개", "마지막 등대", "동면하는 도시", "거짓 낙원"
- 피해야 할 예: "영혼 정원", "먹물 왕조", "유리 바다" (너무 직접적인 조합)

★ 영어 ID 규칙:
- 영어 ID는 세계관 분위기를 반영하는 코드명 스타일 (예: "ASH_HARBOR", "FROZEN_DAWN", "HOLLOW_CROWN")
- 대문자와 언더스코어 사용

JSON 형식:
[
  {
    "id": "ENGLISH_CODE_NAME",
    "name": "한글 테마 이름 (3-5글자)",
    "hint": "이 세계에서 일어날 수 있는 사건 예시",
    "desc": "세계관의 분위기와 핵심 설정 설명 (40-60자)"
  }
]

10개의 테마를 JSON 배열로만 반환하세요.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Extract JSON array from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('[ThemeGen] Failed to parse JSON from response');
            return getDefaultThemes();
        }

        const themes: DynamicTheme[] = JSON.parse(jsonMatch[0]);

        if (!Array.isArray(themes) || themes.length === 0) {
            return getDefaultThemes();
        }

        console.log(`[ThemeGen] Generated ${themes.length} new themes`);
        return themes.slice(0, 10); // Ensure max 10 themes

    } catch (error) {
        console.error('[ThemeGen] Error:', error);
        return getDefaultThemes();
    }
}

// Fallback themes if AI generation fails
function getDefaultThemes(): DynamicTheme[] {
    return [
        { id: 'MIRROR_REALM', name: '거울 왕국', hint: '예: 반전된 자아, 거울 속 세계', desc: '모든 것이 반대로 존재하는 거울 속 세계. 당신의 반영이 독립된 의지를 가진다.' },
        { id: 'CLOCK_TOWER', name: '시계탑 도시', hint: '예: 시간 조작, 영원의 순간', desc: '거대한 시계탑이 지배하는 도시. 시간은 화폐이자 권력이다.' },
        { id: 'MEMORY_HUNTER', name: '기억 사냥꾼', hint: '예: 기억 절도, 과거 조작', desc: '타인의 기억을 훔치고 거래하는 어둠의 직업. 당신의 기억은 안전한가?' },
        { id: 'PAPER_WORLD', name: '종이 세계', hint: '예: 접기 마법, 납작해진 현실', desc: '모든 것이 종이로 이루어진 2차원 세계. 접기와 펼치기가 마법이 된다.' },
        { id: 'SONG_REALM', name: '노래의 영역', hint: '예: 음악 마법, 화음 전투', desc: '노래와 음악이 물리적 힘을 가지는 세계. 음정이 어긋나면 재앙이 일어난다.' },
        { id: 'SHADOW_MARKET', name: '그림자 시장', hint: '예: 영혼 거래, 운명 경매', desc: '그림자 속에서만 열리는 비밀 시장. 무엇이든 거래 가능하다 - 운명조차도.' },
        { id: 'RUST_GARDEN', name: '녹슨 정원', hint: '예: 기계 식물, 부식 생태계', desc: '기계와 자연이 부식되며 융합된 세계. 녹이 슬수록 아름다워진다.' },
        { id: 'INK_DYNASTY', name: '먹물 왕조', hint: '예: 서예 무공, 붓으로 창조', desc: '먹과 붓으로 현실을 그려내는 동양 판타지. 글씨가 곧 마법이다.' },
        { id: 'GLASS_SEA', name: '유리 바다', hint: '예: 투명한 심연, 깨지는 파도', desc: '바다가 유리처럼 투명하고 부서지기 쉬운 세계. 깊은 곳에는 잊혀진 것들이.' },
        { id: 'ECHO_STATION', name: '메아리 정거장', hint: '예: 차원 열차, 시공간 여행', desc: '무한한 차원을 연결하는 정거장. 열차를 잘못 타면 돌아올 수 없다.' },
    ];
}
