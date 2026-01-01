export type RapportLevel = 'HOSTILE' | 'WARY' | 'NEUTRAL' | 'FRIENDLY' | 'TRUSTED' | 'BONDED';

export interface Character {
    id: string;
    name: string;
    role: string;
    description: string;
    rapport: {
        score: number; // -100 to 100
        level: RapportLevel;
    };
    baseVoiceStats: {
        name: string; // Varco Voice Name
        defaultTone: string; // e.g. "neutral"
    };
}

export interface Item {
    id: string;
    name: string;
    description: string;
    type: 'CONSUMABLE' | 'KEY_ITEM' | 'ARTIFACT' | 'DOCUMENT';
    effect?: string;
}

export interface WorldState {
    theme: string; // e.g. "Cyberpunk", "Murim"
    name: string;
    description: string;
    introText: string; // New field for atmospheric introduction
    starting_scene?: string; // ★ 플레이어 시작 위치/상황 상세 묘사
    timeOfDay: string;
    threatLevel: number;
    canReturn?: boolean; // Can the player exit/return from here?

    // Visuals (Sin City Style)
    visual_style?: string;
    image_prompt?: string;
    situation_image_prompt?: string;

    // ★ World Architect: Art Consistency Constraints
    art_style_constraints?: {
        enforce_style_prompt: string;
        negative_constraints_prompt: string;
    };
    world_theme_analysis?: {
        primary_theme: string;
        sub_themes: string[];
        era_tech_level: string;
    };

    factions: {
        name: string;
        description: string;
        reputation: number;
    }[];
    knownAppearances: {
        reputationHolder: string; // e.g., Faction Name or "General"
        reputationScore: number;
        description: string;
        tags: string[]; // snapshot of appearance tags
    }[];
    flags: Record<string, boolean | string | number>;
}

export interface PlayerState {
    hp: number; // Mental Health / Stamina
    inventory: Item[];
    equippedArtifacts: string[]; // IDs
    knowledge: string[]; // IDs or Keywords
    appearanceTags: string[]; // e.g., ["black_robe", "young", "scar"]
}

export interface LogEntry {
    id: string;
    type: 'NARRATIVE' | 'DIALOGUE' | 'ACTION' | 'SYSTEM';
    text: string;
    speaker?: string; // For DIALOGUE
    audioUrl?: string; // TTS or SFX URL
    sfxUrl?: string; // Sound Effect URL
    hasPlayed?: boolean; // ★ Track if audio has been played (persisted)
    timestamp: number;
}

export interface Entity {
    entity_id: string;
    type: 'character' | 'location' | 'object' | 'lore';
    display_name: string;
    core_description: {
        summary: string;
        key_elements?: string[];
    };
    visual_assets?: {
        style_tags?: string[];
        mandatory_objects?: string[];
        color_palette?: string[];
        visual_traits?: string;
        condition?: string;
    };
    audio_profile?: {
        ambient_sound_tags?: string[];
        reverb_type?: string;
    };
    lore_tags?: string[];
    interaction_tags?: string[];
}

// ★ Living World: NPC Memory System
export interface NPCMemory {
    id: string;
    npcId: string;              // Which NPC has this memory
    type: 'conversation' | 'event' | 'observation' | 'rumor';
    content: string;            // What happened
    participants: string[];     // Who was involved
    emotionalImpact: number;    // -10 to 10 (how much it affected the NPC)
    timestamp: number;          // When it happened (game time)
    decayRate?: number;         // How fast the memory fades (0-1, default 0.1)
    isImportant?: boolean;      // Never decays if true
}

// ★ Living World: NPC Extended State
export interface NPCState {
    entityId: string;           // Links to Entity
    mood: string;               // Current emotional state
    trust: Record<string, number>; // Trust level with other entities
    currentGoal?: string;       // What they're trying to do
    memories: NPCMemory[];      // Their memories
    lastInteractionTime?: number;
}
