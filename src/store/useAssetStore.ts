import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { indexedDBStorage } from '@/utils/indexedDBStorage';

// ============================================
// Dynamic Asset Management System
// 장소/인물 이미지 캐싱 및 관리
// ============================================

/** 장소 자산 타입 */
export interface LocationAsset {
    id: string;                          // 고유 ID (예: "shop_noodle_01")
    name: string;                        // 장소 이름 (예: "강남 뒷골목 국수집")
    baseImage: string;                   // 최초 생성된 기본 이미지 URL
    variations: Record<string, string>;  // state_key -> image_url
    createdAt: number;                   // 생성 시간
}

/** 캐릭터 자산 타입 */
export interface CharacterAsset {
    id: string;                          // 고유 ID (예: "npc_kim_01")
    name: string;                        // 캐릭터 이름 (예: "김씨 아저씨")
    baseImage: string;                   // 최초 생성된 기본 외형 이미지
    variations: Record<string, string>;  // outfit_emotion -> image_url
    createdAt: number;
}

/** 현재 상태 (시간/날씨/이벤트) */
export interface AssetState {
    time: 'dawn' | 'day' | 'dusk' | 'night';
    weather: 'clear' | 'cloudy' | 'rain' | 'fog' | 'snow';
    event: string;  // 예: "peaceful", "chase", "investigation"
}

/** 자산 결정 결과 타입 */
export type AssetAction =
    | { action: 'RETRIEVE'; assetId: string; stateKey: string; imageUrl: string }
    | { action: 'VARIATION'; assetId: string; baseImageUrl: string; newStateKey: string }
    | { action: 'NEW_BASE'; suggestedId: string; stateKey: string };

interface AssetStore {
    // 데이터
    locations: Record<string, LocationAsset>;
    characters: Record<string, CharacterAsset>;

    // 현재 상태
    currentState: AssetState;

    // 상태 관리
    setCurrentState: (state: Partial<AssetState>) => void;

    // 상태 키 생성
    generateStateKey: (state?: AssetState) => string;

    // 장소 자산 관리
    getLocation: (id: string) => LocationAsset | undefined;
    hasLocation: (id: string) => boolean;
    hasLocationState: (id: string, stateKey: string) => boolean;
    saveLocation: (asset: LocationAsset) => void;
    saveLocationVariation: (id: string, stateKey: string, imageUrl: string) => void;

    // 캐릭터 자산 관리
    getCharacter: (id: string) => CharacterAsset | undefined;
    hasCharacter: (id: string) => boolean;
    hasCharacterState: (id: string, stateKey: string) => boolean;
    saveCharacter: (asset: CharacterAsset) => void;
    saveCharacterVariation: (id: string, stateKey: string, imageUrl: string) => void;

    // 자산 결정 로직
    decideLocationAction: (locationName: string, stateKey?: string) => AssetAction;
    decideCharacterAction: (characterName: string, stateKey?: string) => AssetAction;

    // 유틸리티
    findLocationByName: (name: string) => LocationAsset | undefined;
    findCharacterByName: (name: string) => CharacterAsset | undefined;
    getAssetSummary: () => { locations: string[]; characters: string[] };
    clearAll: () => void;
}

// ID 생성 헬퍼
const generateId = (type: 'loc' | 'char', name: string): string => {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9가-힣]/g, '_').slice(0, 20);
    const hash = Math.random().toString(36).slice(2, 8);
    return `${type}_${sanitized}_${hash}`;
};

export const useAssetStore = create<AssetStore>()(
    persist(
        (set, get) => ({
            // 초기 데이터
            locations: {},
            characters: {},

            // 현재 상태 (기본값)
            currentState: {
                time: 'day',
                weather: 'clear',
                event: 'peaceful'
            },

            // 상태 업데이트
            setCurrentState: (state) => set(s => ({
                currentState: { ...s.currentState, ...state }
            })),

            // 상태 키 생성 (예: "day_clear_peaceful")
            generateStateKey: (state) => {
                const s = state || get().currentState;
                return `${s.time}_${s.weather}_${s.event}`;
            },

            // === 장소 자산 관리 ===
            getLocation: (id) => get().locations[id],

            hasLocation: (id) => !!get().locations[id],

            hasLocationState: (id, stateKey) => {
                const loc = get().locations[id];
                return loc ? !!loc.variations[stateKey] : false;
            },

            saveLocation: (asset) => {
                // 검증: 에러 이미지는 저장하지 않음
                if (asset.baseImage.includes("GENERATION ERROR") || asset.baseImage.includes("svg+xml")) {
                    console.warn("[AssetStore] Refusing to cache ERROR image for:", asset.name);
                    return;
                }
                set(s => ({ locations: { ...s.locations, [asset.id]: asset } }));
            },

            saveLocationVariation: (id, stateKey, imageUrl) => {
                if (imageUrl.includes("GENERATION ERROR") || imageUrl.includes("svg+xml")) {
                    console.warn("[AssetStore] Refusing to cache ERROR variation for:", id);
                    return;
                }
                set(s => {
                    const loc = s.locations[id];
                    if (!loc) return s;
                    return {
                        locations: {
                            ...s.locations,
                            [id]: {
                                ...loc,
                                variations: { ...loc.variations, [stateKey]: imageUrl }
                            }
                        }
                    };
                });
            },

            // === 캐릭터 자산 관리 ===
            getCharacter: (id) => get().characters[id],

            hasCharacter: (id) => !!get().characters[id],

            hasCharacterState: (id, stateKey) => {
                const char = get().characters[id];
                return char ? !!char.variations[stateKey] : false;
            },

            saveCharacter: (asset) => {
                if (asset.baseImage.includes("GENERATION ERROR") || asset.baseImage.includes("svg+xml")) {
                    return;
                }
                set(s => ({ characters: { ...s.characters, [asset.id]: asset } }));
            },

            saveCharacterVariation: (id, stateKey, imageUrl) => {
                if (imageUrl.includes("GENERATION ERROR") || imageUrl.includes("svg+xml")) {
                    return;
                }
                set(s => {
                    const char = s.characters[id];
                    if (!char) return s;
                    return {
                        characters: {
                            ...s.characters,
                            [id]: {
                                ...char,  // Fixed: was loc
                                variations: { ...char.variations, [stateKey]: imageUrl }
                            }
                        }
                    };
                });
            },

            // === 이름으로 검색 (AI가 사용) ===
            findLocationByName: (name) => {
                const locs = Object.values(get().locations);
                const exact = locs.find(l => l.name === name);
                if (exact) return exact;
                return locs.find(l =>
                    l.name.includes(name) || name.includes(l.name)
                );
            },

            findCharacterByName: (name) => {
                const chars = Object.values(get().characters);
                const exact = chars.find(c => c.name === name);
                if (exact) return exact;
                return chars.find(c =>
                    c.name.includes(name) || name.includes(c.name)
                );
            },

            // === 자산 결정 로직 ===
            decideLocationAction: (locationName, stateKey) => {
                const key = stateKey || get().generateStateKey();
                const existing = get().findLocationByName(locationName);

                if (!existing) {
                    return {
                        action: 'NEW_BASE',
                        suggestedId: generateId('loc', locationName),
                        stateKey: key
                    };
                }

                if (existing.variations[key]) {
                    return {
                        action: 'RETRIEVE',
                        assetId: existing.id,
                        stateKey: key,
                        imageUrl: existing.variations[key]
                    };
                }

                return {
                    action: 'VARIATION',
                    assetId: existing.id,
                    baseImageUrl: existing.baseImage,
                    newStateKey: key
                };
            },

            decideCharacterAction: (characterName, stateKey) => {
                const key = stateKey || get().generateStateKey();
                const existing = get().findCharacterByName(characterName);

                if (!existing) {
                    return {
                        action: 'NEW_BASE',
                        suggestedId: generateId('char', characterName),
                        stateKey: key
                    };
                }

                if (existing.variations[key]) {
                    return {
                        action: 'RETRIEVE',
                        assetId: existing.id,
                        stateKey: key,
                        imageUrl: existing.variations[key]
                    };
                }

                return {
                    action: 'VARIATION',
                    assetId: existing.id,
                    baseImageUrl: existing.baseImage,
                    newStateKey: key
                };
            },

            // === 유틸리티 ===
            getAssetSummary: () => ({
                locations: Object.values(get().locations).map(l => l.name),
                characters: Object.values(get().characters).map(c => c.name)
            }),

            clearAll: () => set({ locations: {}, characters: {} })
        }),
        {
            name: 'asset-cache-storage-v2', // ★ 캐시 버전 변경 (초기화)
            storage: createJSONStorage(() => indexedDBStorage),
            partialize: (state) => ({
                locations: state.locations,
                characters: state.characters
            })
        }
    )
);
