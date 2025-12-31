import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { LogEntry, WorldState, Character, Item, Entity } from '@/types/game';
import { WorldRuleset, WorldGuidelines } from '@/types/worldRuleset';
import { indexedDBStorage } from '@/utils/indexedDBStorage';

interface SessionState {
    // World State
    currentWorld: WorldState | null;
    worldRuleset: WorldRuleset | null;     // DWRS: 세계 규칙
    worldGuidelines: WorldGuidelines | null; // DWRS: 세계 가이드라인
    currentLocation: string;
    characters: Character[];

    // Player State in current run
    hp: number;
    maxHp: number;
    inventory: Item[];
    equippedArtifacts: string[]; // Active in this run
    sessionKnowledge: string[];
    knownEntities: Entity[];
    appearanceTags: string[];
    // ★ Persistent Voice Map (Character Name -> Voice UUID)
    voiceMap: Record<string, string>;

    // UI/Flow State
    logs: LogEntry[];
    isLoading: boolean;
    loadingMessage: string;

    // Active UI State (Persisted)
    activeChoices: any[] | null; // Using any[] to avoid circular dependency with Choice type for now
    activeSceneImage: string | null;
    activeSceneContext: any | null;

    // Actions
    setWorld: (world: WorldState) => void;
    setWorldRuleset: (ruleset: WorldRuleset | null) => void;
    setWorldGuidelines: (guidelines: WorldGuidelines | null) => void;

    // UI Persistence
    setActiveUI: (choices: any[], image: string | null, context?: any | null) => void;

    addLog: (entry: LogEntry) => void;
    updateLog: (id: string, updates: Partial<LogEntry>) => void;
    setLoading: (loading: boolean, message?: string) => void;
    updateHp: (amount: number) => void;
    updatePlayer: (updates: any) => void; // Partial<PlayerState> but simplified for now
    addItem: (item: Item) => void;
    removeItem: (itemId: string) => void;
    addCharacter: (char: Character) => void;
    updateCharacterRapport: (charId: string, delta: number) => void;
    addEntity: (entity: Entity) => void;
    updateEntity: (entityId: string, updates: Partial<Entity>) => void;
    updateAppearanceTags: (tags: string[]) => void;
    updateVoiceMap: (characterName: string, voiceUuid: string) => void;
    // Generic Settings
    settings: {
        sfxEnabled: boolean;
        bgmEnabled: boolean;
    };
    updateSettings: (settings: Partial<SessionState['settings']>) => void;

    resetSession: () => void;
}

export const useSessionStore = create<SessionState>()(
    persist(
        (set, get) => ({
            currentWorld: null,
            worldRuleset: null,
            worldGuidelines: null,
            currentLocation: 'Unknown',
            characters: [],
            knownEntities: [],

            hp: 100,
            maxHp: 100,
            inventory: [],
            equippedArtifacts: [],
            sessionKnowledge: [],
            appearanceTags: ['hooded_figure', 'unknown_traveler'], // Default initial tags
            voiceMap: {}, // Initialize empty map

            // Active UI State (Persisted)
            activeChoices: null,
            activeSceneImage: null,
            activeSceneContext: null,

            settings: {
                sfxEnabled: false, // Default OFF to save Quota
                bgmEnabled: true
            },

            // ... (logs, etc)

            setActiveUI: (choices, image, context) => set(state => ({
                activeChoices: choices,
                activeSceneImage: image !== undefined ? image : state.activeSceneImage,
                activeSceneContext: context !== undefined ? context : state.activeSceneContext
            })),

            logs: [],


            isLoading: false,
            loadingMessage: '',

            // When entering a new world, clear previous world's data to prevent context bleeding
            setWorld: (world) => set({
                currentWorld: world,
                logs: [], // Clear logs from previous world
                characters: [], // Clear characters from previous world
                knownEntities: [], // Clear known entities from previous world
                sessionKnowledge: [] // Clear knowledge from previous world
            }),

            setWorldRuleset: (ruleset) => set({ worldRuleset: ruleset }),

            setWorldGuidelines: (guidelines) => set({ worldGuidelines: guidelines }),



            addLog: (entry) => set((state) => {
                if (state.logs.some(log => log.id === entry.id)) return state;
                return { logs: [...state.logs, entry] };
            }),

            updateLog: (id, updates) => set((state) => ({
                logs: state.logs.map(log => log.id === id ? { ...log, ...updates } : log)
            })),

            setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),

            updateHp: (amount) => set((state) => ({
                hp: Math.max(0, Math.min(state.maxHp, state.hp + amount))
            })),

            // Generic Player Update
            updatePlayer: (updates) => set((state) => ({ ...state, ...updates })),

            addItem: (item) => set((state) => ({ inventory: [...state.inventory, item] })),

            removeItem: (itemId) => set((state) => ({
                inventory: state.inventory.filter(i => i.id !== itemId)
            })),

            // Character Management
            addCharacter: (char) => set((state) => {
                if (state.characters.some(c => c.id === char.id)) return state;
                return { characters: [...state.characters, char] };
            }),

            updateCharacterRapport: (charId, delta) => set((state) => ({
                characters: state.characters.map(char => {
                    if (char.id === charId) {
                        const newScore = Math.max(-100, Math.min(100, char.rapport.score + delta));
                        // Simple logic for level update
                        let newLevel = char.rapport.level;
                        if (newScore >= 91) newLevel = 'BONDED';
                        else if (newScore >= 61) newLevel = 'TRUSTED';
                        else if (newScore >= 21) newLevel = 'FRIENDLY';
                        else if (newScore >= -20) newLevel = 'NEUTRAL';
                        else if (newScore >= -60) newLevel = 'WARY';
                        else newLevel = 'HOSTILE';

                        return {
                            ...char,
                            rapport: { score: newScore, level: newLevel }
                        };
                    }
                    return char;
                })
            })),

            addEntity: (entity) => set((state) => {
                const existingIndex = state.knownEntities.findIndex(e => e.entity_id === entity.entity_id);
                if (existingIndex >= 0) {
                    // Update existing
                    const updated = [...state.knownEntities];
                    updated[existingIndex] = { ...updated[existingIndex], ...entity };
                    return { knownEntities: updated };
                }
                return { knownEntities: [...state.knownEntities, entity] };
            }),

            updateEntity: (entityId, updates) => set((state) => ({
                knownEntities: state.knownEntities.map(e => e.entity_id === entityId ? { ...e, ...updates } : e)
            })),

            updateAppearanceTags: (tags) => set({ appearanceTags: tags }),

            updateVoiceMap: (name, uuid) => set((state) => ({
                voiceMap: { ...state.voiceMap, [name]: uuid }
            })),

            updateSettings: (newSettings) => set((state) => ({
                settings: { ...state.settings, ...newSettings }
            })),

            resetSession: () => set((state) => ({
                currentWorld: null,
                worldRuleset: null,
                worldGuidelines: null,
                currentLocation: 'Unknown',
                logs: [],
                hp: 100,
                inventory: [],
                equippedArtifacts: [],
                sessionKnowledge: [],
                characters: [],
                knownEntities: [],
                appearanceTags: ['hooded_figure', 'unknown_traveler'],
                isLoading: false,

                // Active UI State (Reset on session reset)
                activeChoices: null,
                activeSceneImage: null,
                activeSceneContext: null,

                // Keep settings on reset? Yes, user preference should persist.
                settings: state.settings
            }))
        }),
        {
            name: 'dimensional-navigator-session-v2', // Migrated to V2 (IndexedDB)
            storage: createJSONStorage(() => indexedDBStorage),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Sanitize duplicates on load AND clear audio URLs to prevent replay
                    const seen = new Set();
                    const uniqueLogs = [];
                    for (const log of state.logs) {
                        if (!seen.has(log.id)) {
                            seen.add(log.id);
                            // ★ FIX: Clear audio URLs to prevent replay on reconnect
                            // TTS audio is transient - should not persist across sessions
                            uniqueLogs.push({ ...log, audioUrl: undefined, sfxUrl: undefined });
                        }
                    }
                    state.logs = uniqueLogs;
                    console.log("[SessionStore] 🔄 Rehydrated - cleared audio from", uniqueLogs.length, "logs");
                }
            }
        }
    )
);
