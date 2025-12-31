'use strict';

/**
 * Dynamic World Ruleset System (DWRS) Types
 * 동적 세계관 규칙 시스템 타입 정의
 * 
 * 모든 세계는 고유한 규칙을 가지며, 이 규칙은 모든 생성 요소에 적용됩니다.
 */

// ==========================================
// 1단계: 세계 규칙 (World Ruleset)
// ==========================================

/** 세계의 근본적인 규칙 */
export interface FundamentalRule {
    rule_name: string;
    rule_description: string;
    implications: string[];
    affects: string[];  // 건축물, 문화, 기술, 생물 등
}

/** 세계의 물리/논리 법칙 */
export interface WorldLogic {
    physics: string;       // 정상/변칙/초자연 등
    causality: string;     // 정상/시간 루프/다중우주 등
    reality_nature: string; // 고정/변화/환상/혼합 등
}

/** 세계의 핵심 요소 */
export interface PrimaryElement {
    element_name: string;  // 물, 신, 기술, 마법 등
    role: string;
    influence: number;     // 0-100%
}

/** 미학적 규칙 */
export interface AestheticRules {
    visual_style: string;
    architectural_logic: string;
    cultural_aesthetics: string;
    forbidden_visuals: string[];
}

/** 문화적 논리 */
export interface CulturalLogic {
    primary_values: string[];
    social_structure: string;
    belief_system: string;
    taboos: string[];
}

/** 기술적 논리 */
export interface TechnologicalLogic {
    tech_level: string;
    tech_basis: string;  // 과학/마법/초능력/혼합 등
    possible_tech: string[];
    impossible_tech: string[];
}

/** 생물학적 논리 */
export interface BiologicalLogic {
    life_forms: string;
    evolution_basis: string;
    possible_creatures: string[];
    impossible_creatures: string[];
}

/** 세계 규칙셋 (전체) */
export interface WorldRuleset {
    world_id: string;
    world_name: string;
    world_description: string;

    fundamental_rules: FundamentalRule[];
    world_logic: WorldLogic;
    primary_elements: PrimaryElement;
    constraints: string[];    // 불가능한 것들
    possibilities: string[];  // 가능한 것들

    aesthetic_rules: AestheticRules;
    cultural_logic: CulturalLogic;
    technological_logic: TechnologicalLogic;
    biological_logic: BiologicalLogic;
}

// ==========================================
// 2단계: 동적 가이드라인 (World Guidelines)
// ==========================================

/** 색상 팔레트 */
export interface ColorPalette {
    primary_colors: string[];
    secondary_colors: string[];
    forbidden_colors: string[];
    reasoning: string;
}

/** 건축 스타일 */
export interface ArchitecturalStyle {
    building_logic: string;
    materials: string[];
    shapes: string[];
    forbidden_shapes: string[];
}

/** 대기/분위기 규칙 */
export interface AtmosphericRules {
    lighting: string;
    weather: string;
    time_of_day: string;
    particle_effects: string;
}

/** 생물 디자인 규칙 */
export interface CreatureDesign {
    possible_creatures: string[];
    impossible_creatures: string[];
    design_logic: string;
}

/** NPC 디자인 규칙 */
export interface NPCDesign {
    clothing_logic: string;
    accessory_logic: string;
    physical_characteristics: string;
    forbidden_appearances: string[];
}

/** 이미지 생성 규칙 */
export interface ImageGenerationRules {
    visual_requirements: string[];
    visual_prohibitions: string[];
    color_palette: ColorPalette;
    architectural_style: ArchitecturalStyle;
    atmospheric_rules: AtmosphericRules;
    creature_design: CreatureDesign;
    npc_design: NPCDesign;
    prompt_template: string;
}

/** NPC 생성 규칙 */
export interface NPCGenerationRules {
    personality_basis: string;
    motivation_logic: string;
    possible_professions: string[];
    impossible_professions: string[];
    naming_convention: string;
    dialogue_style: string;
}

/** 문화 생성 규칙 */
export interface CultureGenerationRules {
    mythology: {
        creation_myth_basis: string;
        hero_archetypes: string[];
        forbidden_myths: string[];
    };
    religion_philosophy: {
        belief_object: string;
        belief_logic: string;
        rituals: string[];
        taboos: string[];
    };
    social_structure: {
        hierarchy_basis: string;
        family_structure: string;
        gender_roles: string;
        age_roles: string;
    };
    art_music: {
        art_form: string;
        music_basis: string;
        aesthetic_values: string;
    };
    food_lifestyle: {
        food_sources: string[];
        eating_customs: string;
        daily_rituals: string[];
    };
    language_communication: {
        language_characteristics: string;
        communication_style: string;
        forbidden_words: string[];
    };
}

/** 장소 생성 규칙 */
export interface LocationGenerationRules {
    settlement_logic: string;
    landmark_logic: string;
    sacred_places: string[];
    forbidden_places: string[];
}

/** 세계 가이드라인 (전체) */
export interface WorldGuidelines {
    world_name: string;
    image_generation: ImageGenerationRules;
    npc_generation: NPCGenerationRules;
    culture_generation: CultureGenerationRules;
    location_generation: LocationGenerationRules;
}

// ==========================================
// 4단계: 검증 결과
// ==========================================

/** 검증 결과 */
export interface ValidationResult {
    is_valid: boolean;
    issues: string[];
    suggestions: string[];
    consistency_score: number;  // 0-100
}

// ==========================================
// 통합 세계 데이터
// ==========================================

/** 세계 메타데이터 (세계 규칙 + 가이드라인 포함) */
export interface EnhancedWorldState {
    world_id: string;
    world_name: string;
    world_type: 'player_input' | 'random';
    coordinates?: string;
    creation_timestamp: number;

    ruleset: WorldRuleset;
    guidelines: WorldGuidelines;

    generated_elements: {
        background_image?: string;
        npcs: any[];
        locations: any[];
        culture?: any;
    };

    validation_status: 'validated' | 'pending' | 'failed';
    consistency_score: number;
}
