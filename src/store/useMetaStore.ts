import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MetaState {
    dimensionShards: number;
    visitedThemes: string[]; // Themes that can be selected manually
    collectedArtifacts: string[]; // IDs of all artifacts ever found
    universalKnowledge: string[]; // Knowledge that persists across runs (if any)

    addShards: (amount: number) => void;
    spendShards: (amount: number) => boolean;
    registerVisit: (theme: string) => void;
    registerArtifact: (artifactId: string) => void;
}

export const useMetaStore = create<MetaState>()(
    persist(
        (set, get) => ({
            dimensionShards: 0,
            visitedThemes: [], // Starts empty, must use Random first
            collectedArtifacts: [],
            universalKnowledge: [],

            addShards: (amount) => set((state) => ({ dimensionShards: state.dimensionShards + amount })),

            spendShards: (amount) => {
                const current = get().dimensionShards;
                if (current >= amount) {
                    set({ dimensionShards: current - amount });
                    return true;
                }
                return false;
            },

            registerVisit: (theme) => set((state) => {
                if (!state.visitedThemes.includes(theme)) {
                    return { visitedThemes: [...state.visitedThemes, theme] };
                }
                return state;
            }),

            registerArtifact: (artifactId) => set((state) => {
                if (!state.collectedArtifacts.includes(artifactId)) {
                    return { collectedArtifacts: [...state.collectedArtifacts, artifactId] };
                }
                return state;
            }),
        }),
        {
            name: 'dimensional-navigator-meta', // name of the item in the storage (must be unique)
        }
    )
);
