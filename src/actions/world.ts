'use server';

import { model } from '@/lib/gemini';
import { WorldState } from '@/types/game';
import { WorldRuleset, WorldGuidelines, ImageGenerationRules, NPCGenerationRules } from '@/types/worldRuleset';

/**
 * 세계 규칙 추출 프롬프트 - 1단계
 * 모든 세계의 고유한 규칙을 추출합니다.
 */
const RULESET_EXTRACTION_PROMPT = `You are analyzing a world to extract its unique rules and logic.

World Theme/Description: "{THEME}"

Extract the FUNDAMENTAL RULES of this world. Not just genre, but HOW this world WORKS.

RESPOND IN JSON FORMAT ONLY:

{
  "world_id": "unique_id_here",
  "world_name": "세계 이름 (한글)",
  "world_description": "한 문장 요약 (한글)",
  
  "fundamental_rules": [
    {
      "rule_name": "규칙명 (한글)",
      "rule_description": "이 규칙이 세계에서 어떻게 작동하는가 (한글)",
      "implications": ["결과1", "결과2"],
      "affects": ["건축물", "문화", "기술", "생물"]
    }
  ],
  
  "world_logic": {
    "physics": "물리 법칙 설명",
    "causality": "인과관계 설명",
    "reality_nature": "현실의 성질"
  },
  
  "primary_elements": {
    "element_name": "핵심 요소 (물, 신, 기술, 마법 등)",
    "role": "이 요소의 역할",
    "influence": 85
  },
  
  "constraints": ["불가능한 것1", "불가능한 것2"],
  "possibilities": ["가능한 것1", "가능한 것2"],
  
  "aesthetic_rules": {
    "visual_style": "시각적 스타일 설명 (영어)",
    "architectural_logic": "건축물 논리 (한글)",
    "cultural_aesthetics": "문화적 미학 (한글)",
    "forbidden_visuals": ["금지된 시각요소1", "금지된 시각요소2"]
  },
  
  "cultural_logic": {
    "primary_values": ["가치관1", "가치관2"],
    "social_structure": "사회 구조 설명",
    "belief_system": "신앙/철학 체계",
    "taboos": ["금기1", "금기2"]
  },
  
  "technological_logic": {
    "tech_level": "기술 수준",
    "tech_basis": "기술의 기반",
    "possible_tech": ["가능한 기술1", "가능한 기술2"],
    "impossible_tech": ["불가능한 기술1", "불가능한 기술2"]
  },
  
  "biological_logic": {
    "life_forms": "존재하는 생명체",
    "evolution_basis": "진화의 기반",
    "possible_creatures": ["가능한 생물1"],
    "impossible_creatures": ["불가능한 생물1"]
  }
}

OUTPUT JSON ONLY. NO MARKDOWN.`;

/**
 * 이미지 생성 가이드라인 프롬프트 - 2.1단계
 */
const IMAGE_GUIDELINES_PROMPT = `Based on this world ruleset, create IMAGE GENERATION guidelines:

World Ruleset:
{RULESET}

Create guidelines for generating images in this world.

RESPOND IN JSON ONLY:

{
  "visual_requirements": ["필수 시각요소1", "필수 시각요소2"],
  "visual_prohibitions": ["금지 시각요소1", "금지 시각요소2"],
  "color_palette": {
    "primary_colors": ["주요색상1", "주요색상2"],
    "secondary_colors": ["보조색상1"],
    "forbidden_colors": ["금지색상1"],
    "reasoning": "이 색상 팔레트의 이유"
  },
  "architectural_style": {
    "building_logic": "건축물 논리",
    "materials": ["재료1", "재료2"],
    "shapes": ["형태1", "형태2"],
    "forbidden_shapes": ["금지형태1"]
  },
  "atmospheric_rules": {
    "lighting": "조명 특성",
    "weather": "날씨 특성",
    "time_of_day": "시간대 특성",
    "particle_effects": "입자 효과"
  },
  "creature_design": {
    "possible_creatures": ["가능한 생물1"],
    "impossible_creatures": ["불가능한 생물1"],
    "design_logic": "생물 디자인 논리"
  },
  "npc_design": {
    "clothing_logic": "의류 논리",
    "accessory_logic": "장신구 논리",
    "physical_characteristics": "신체적 특징",
    "forbidden_appearances": ["금지 외형1"]
  },
  "prompt_template": "이 세계의 이미지 생성 시 사용할 기본 프롬프트 템플릿 (영어로)"
}

OUTPUT JSON ONLY. NO MARKDOWN.`;

/**
 * NPC 생성 가이드라인 프롬프트 - 2.2단계
 */
const NPC_GUIDELINES_PROMPT = `Based on this world ruleset, create NPC GENERATION guidelines:

World Ruleset:
{RULESET}

RESPOND IN JSON ONLY:

{
  "personality_basis": "NPC 성격의 기반",
  "motivation_logic": "NPC 동기의 논리",
  "possible_professions": ["가능한 직업1", "가능한 직업2", "가능한 직업3"],
  "impossible_professions": ["불가능한 직업1", "불가능한 직업2"],
  "naming_convention": "이름 짓기 규칙",
  "dialogue_style": "대화 스타일"
}

OUTPUT JSON ONLY. NO MARKDOWN.`;

/**
 * 세계 규칙 추출 함수
 */
export async function extractWorldRuleset(theme: string): Promise<WorldRuleset | null> {
  console.log(`[DWRS] Extracting world ruleset for: ${theme}`);

  try {
    const prompt = RULESET_EXTRACTION_PROMPT.replace('{THEME}', theme);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonStr = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

    const ruleset = JSON.parse(jsonStr) as WorldRuleset;
    console.log(`[DWRS] Extracted ruleset for: ${ruleset.world_name}`);
    return ruleset;
  } catch (error) {
    console.error('[DWRS] Ruleset extraction failed:', error);
    return null;
  }
}

/**
 * 이미지 생성 가이드라인 생성 함수
 */
export async function generateImageGuidelines(ruleset: WorldRuleset): Promise<ImageGenerationRules | null> {
  console.log(`[DWRS] Generating image guidelines for: ${ruleset.world_name}`);

  try {
    const prompt = IMAGE_GUIDELINES_PROMPT.replace('{RULESET}', JSON.stringify(ruleset, null, 2));
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonStr = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

    const guidelines = JSON.parse(jsonStr) as ImageGenerationRules;
    console.log(`[DWRS] Image guidelines generated`);
    return guidelines;
  } catch (error) {
    console.error('[DWRS] Image guidelines generation failed:', error);
    return null;
  }
}

/**
 * NPC 생성 가이드라인 생성 함수
 */
export async function generateNPCGuidelines(ruleset: WorldRuleset): Promise<NPCGenerationRules | null> {
  console.log(`[DWRS] Generating NPC guidelines for: ${ruleset.world_name}`);

  try {
    const prompt = NPC_GUIDELINES_PROMPT.replace('{RULESET}', JSON.stringify(ruleset, null, 2));
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonStr = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

    const guidelines = JSON.parse(jsonStr) as NPCGenerationRules;
    console.log(`[DWRS] NPC guidelines generated`);
    return guidelines;
  } catch (error) {
    console.error('[DWRS] NPC guidelines generation failed:', error);
    return null;
  }
}


const WORLD_GEN_PROMPT = `You are the "Scenario Director" for a high-freedom text adventure game.
Create a unique, immersive world based on the theme: "{THEME}".

**CRITICAL FORMATTING RULES:**
1. ALL text MUST be in KOREAN (한국어) ONLY. NO English, NO romanization, NO parentheses with English.
2. Keep sentences SHORT. Maximum 2 lines per sentence when displayed.
3. introText: Use newlines (\\n) between sentences for dramatic pauses. 3-4 sentences max.

**★ STARTING SCENE REQUIREMENT (CRITICAL):**
- You MUST provide a "starting_scene" field describing WHERE and WHAT the player sees when they first enter this world.
- Include: specific location name, visual description, atmosphere, any immediate elements (NPCs, objects, weather).
- This is NOT just worldbuilding - it's the CONCRETE first moment the player experiences.
- Example: "당신은 네온사인이 반짝이는 허름한 골목길 끝에 서 있다. 비가 내리고 있으며, 어딘가에서 재즈 음악이 들려온다. 앞에는 희미하게 불이 켜진 바가 보인다."

**VISUAL STYLE GUIDELINES (choose based on theme):**
- Cyberpunk/네온/사이버: "Neon-lit cyberpunk, deep blacks with vivid neon accents (pink, cyan, purple). High-tech low-life aesthetics."
- 무림/무협/Wuxia: "Korean manhwa style, ink wash painting textures mixed with sharp realistic details. Mountain peaks, traditional pavilions, crimson and gold accents."
- 판타지/Fantasy/마법: "Epic painterly fantasy style. Vibrant jewel tones. Magic circles, floating islands, medieval architecture. (Only use Castles/Dragons here)"
- 기이한 서부/Weird West/서부: "Gritty Western atmosphere. Desert landscapes, saloons, wasteland. STRICTLY REALISTIC ERA-APPROPRIATE visuals mixed with eerie horror. ABSOLUTELY NO MEDIEVAL FANTASY ELEMENTS (No Castles, No Dragons, No Plate Armor)."
- 스팀펑크/Victorian/산업: "Victorian Steampunk. Brass, copper, steam pipes, gears, smoggy atmosphere. Industrial revolution vibe."
- 느와르/Noir/탐정: "Film Noir graphic novel style. High contrast Black and White with ONE vivid accent color (Red or Yellow). Shadows and rain."
- 포스트아포칼립스/멸망: "Ruined civilization, overgrown vegetation or barren wastelands. Rusty metal, concrete debris. Desaturated tones."
- Other themes: Choose the most fitting style from above, ensuring NO genre-mixing (e.g., no castles in sci-fi).

**IMAGE PROMPT RULES:**
- image_prompt: Wide establishing shot. Focus on ATMOSPHERE. **MUST BE THEMATICALLY CONSISTENT.**
- situation_image_prompt: ENVIRONMENT ONLY. NO FACES.
- **CRITICAL**: If the theme is NOT High Fantasy, YOU MUST EXPLICITLY WRITE "EXCLUDE: dragons, magic, castles, medieval armor" at the end of the prompt.
- **GENRE CHECK**:
  - If Sci-Fi/Cyberpunk -> EXCLUDE: magic, dragons, sword, medieval armor, castle
  - If Historical (Joseon/Victorian) -> EXCLUDE: modern cars, skyscrapers, electric lights (unless specified), dragons, elves
  - If Weird West -> EXCLUDE: medieval castles, dragons, knights, high fantasy magic, elves, orcs

**OUTPUT JSON:**
{
  "name": "세계 이름 (창의적이고 짧게, 한글만)",
  "description": "한 문장 요약",
  "introText": "첫 문장.\\n두번째 문장.\\n세번째 문장.",
  "starting_scene": "★ 플레이어가 처음 보는 구체적인 장면 (위치, 주변 환경, 분위기, 보이는 것들 상세히 묘사. 최소 3문장)",
  "theme": "테마 키워드",
  "visual_style": "테마에 맞는 아트 스타일 (영어로)",
  "image_prompt": "Wide shot environment description, NO FACES (영어로)",
  "situation_image_prompt": "ENVIRONMENT ONLY - dangerous or ominous scene WITHOUT any human faces or characters (영어로)",
  "timeOfDay": "시간대",
  "threatLevel": 1-5,
  "canReturn": true/false,
  "factions": [
    { "name": "진영 이름", "description": "짧은 설명", "reputation": 0 }
  ],
  "knownAppearances": [],
  "flags": {}
}

OUTPUT JSON ONLY. NO MARKDOWN.`;

export async function generateWorldAction(theme: string): Promise<WorldState | null> {
  console.log(`[WorldGen] Starting generation for theme: ${theme}`);
  try {
    if (!process.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
      console.error("[WorldGen] CRITICAL: No Gemini API Key found in environment variables.");
      throw new Error("Missing API Key");
    }

    // Check if this is a custom player-created world
    const isCustom = theme.startsWith('CUSTOM:');
    let prompt;

    if (isCustom) {
      const playerRequest = theme.replace('CUSTOM:', '').trim();
      prompt = `You are the "Scenario Director" for a high-freedom text adventure game.
      
THE PLAYER HAS REQUESTED THIS SPECIFIC WORLD: "${playerRequest}"

Your job is to CREATE this world for them! Be CREATIVE and GENEROUS with your interpretation.
- If they want "Harry Potter", create a magical academy world with wizards, spells, and houses.
- If they want "Zombie apocalypse", create a post-apocalyptic survival world.
- If they want "삼국지", create a Three Kingdoms era China with warring factions.
- If they want something abstract, make it tangible and explorable.

3. Make it FUN, IMMERSIVE, and INTERACTIVE.
4. **STRICT THEME CONSISTENCY (CRITICAL)**:
   - **NO GENRE MIXING** unless explicitly asked.
   - IF "Western/Cowboy" -> NO DRAGONS, NO CASTLES, NO ALIENS (unless asked).
   - IF "Joseon/Historical" -> NO MECHS, NO CARS (unless asked).
   - **CROSS-CHECK**: Ensure visual elements match the ERA and TECH LEVEL requested.

5. **IMAGE PROMPT REQUIREMENTS**:
   - You MUST append an exclusion list at the end of 'image_prompt' and 'situation_image_prompt'.
   - **ALWAYS EXCLUDE**: text, watermark, signature, blurry, low quality.
   - **THEME SPECIFIC EXCLUSIONS**: 
     - If Western: "EXCLUDE: castle, dragon, medieval armor, spaceship"
     - If Sci-Fi: "EXCLUDE: medieval castle, horse, magic staff"
   - Format: "Description... --no [incompatible elements]" or "Description... Exclude: [incompatible elements]"
   - Example: "Steam-powered Joseon palace... Exclude: western castle, dragon, magic spells"

OUTPUT JSON (same format as standard worlds):
{
  "name": "세계 이름 (한글만)",
  "description": "한 문장 요약",
  "introText": "첫 문장.\\n두번째 문장.\\n세번째 문장.",
  "theme": "적절한 테마 키워드",
  "visual_style": "이 세계에 맞는 아트 스타일 (영어로)",
  "image_prompt": "Wide shot environment. [IMPORTANT: Mention constraints]",
  "situation_image_prompt": "ENVIRONMENT ONLY, NO FACES. [IMPORTANT: Mention constraints]",
  "timeOfDay": "시간대",
  "threatLevel": 1-5,
  "canReturn": true,
  "factions": [
    { "name": "진영 이름", "description": "설명", "reputation": 0 }
  ],
  "knownAppearances": [],
  "flags": {}
}

OUTPUT JSON ONLY. NO MARKDOWN.`;
    } else {
      prompt = WORLD_GEN_PROMPT.replace('{THEME}', theme);
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("[WorldGen] Raw response:", text.substring(0, 100) + "...");

    // Clean up Markdown code blocks if present
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const worldData = JSON.parse(jsonStr) as WorldState;
    console.log("[WorldGen] Successfully parsed world data:", worldData.name);

    // ★ World Architect Integration: Analyze & Enforce Consistency
    try {
      const { analyzeWorldSetting } = await import('@/actions/worldArchitect');
      const analysisInput = `Theme: ${worldData.theme}\nDescription: ${worldData.description}\nIntro: ${worldData.introText}`;

      const architectResult = await analyzeWorldSetting(analysisInput);

      if (architectResult) {
        worldData.art_style_constraints = architectResult.art_style_constraints;
        worldData.world_theme_analysis = architectResult.world_theme_analysis;
        console.log("[WorldGen] Architect constraints applied.");
      }
    } catch (archError) {
      console.warn("[WorldGen] Architect analysis skipped due to error:", archError);
    }

    return worldData;
  } catch (error) {
    console.error("[WorldGen] Generation Failed:", error);
    return null;
  }
}
