'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Volume2, VolumeX, Menu, Activity, ShieldAlert, Mic, Play, Pause, Square, LogOut, ChevronDown, BookOpen } from 'lucide-react';
import EpilogueView from './EpilogueView';
import clsx from 'clsx';

import NarrativeLog from '@/components/organisms/NarrativeLog';
import ChoiceView from '@/components/organisms/ChoiceView';
import CommandInput from '@/components/molecules/CommandInput';
import { WorldState, PlayerState, LogEntry } from '@/types/game';
import { generateImageAction } from '@/actions/image';
import { processTurnAction } from '@/actions/game';
import { useSessionStore } from '@/store/useSessionStore';
import { useAssetStore, LocationAsset } from '@/store/useAssetStore';
import { generateSpeechAction } from '@/actions/tts';
import { generateSoundEffectAction } from '@/actions/audio';
import { resetVoiceUsage } from '@/lib/voiceMapping';
import WorldIntroView from '@/components/templates/WorldIntroView';


interface ExplorationViewProps {
    world?: WorldState;
    player?: PlayerState;
    initialLogs?: LogEntry[];
    onExit: () => void;
}

// Feature Flags handled by useSessionStore settings
// const ENABLE_AUTO_SFX = false;

export default function ExplorationView({ world: initialWorld, player: initialPlayer, initialLogs = [], onExit }: ExplorationViewProps) {
    const { addLog, updatePlayer, addCharacter, logs: storedLogs, currentWorld, appearanceTags, activeChoices, activeSceneImage, setActiveUI, settings, voiceMap } = useSessionStore();
    const logs = storedLogs.length > 0 ? storedLogs : initialLogs;

    // ★ Initialize with persisted state if available
    const [choices, setChoices] = useState(activeChoices || [
        { id: 'look', text: '주변을 둘러본다' },
        { id: 'inventory', text: '소지품 확인' },
        { id: 'wait', text: '기다리며 관찰한다' }
    ]);
    // ★ Image persistence: Use stored image if available, otherwise null (will fetch)
    const [sceneImage, setSceneImageState] = useState<string | null>(activeSceneImage || null);

    // Wrapper to sync state with store
    const setSceneImage = (img: string | null) => {
        setSceneImageState(img);
        setActiveUI(choices, img);
    };

    // Wrapper to sync choices with store
    const updateChoices = (newChoices: any[]) => {
        setChoices(newChoices);
        // Persist UI state: Choices + Image + Context
        // We use current values for image/context (or pass them if needed)
        // But here we only update choices usually. 
        // Better to have a unified sync function or just call store update.
        const { setActiveUI } = useSessionStore.getState();
        setActiveUI(newChoices, sceneImage, currentSceneContext);
    };

    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [headerText, setHeaderText] = useState("시스템 정상");
    const [audioEnabled, setAudioEnabled] = useState(true);
    // Intro State: Show if it's a fresh game (no logs or just 1 system log)
    const [showIntro, setShowIntro] = useState(initialLogs.length <= 1);
    // ★ Collapsible Choices Panel
    const [isChoicesPanelOpen, setIsChoicesPanelOpen] = useState(true);
    // ★ Mobile: Narrative Overlay on Image (tap to toggle)
    const [isNarrativeOverlayVisible, setIsNarrativeOverlayVisible] = useState(true);
    // ★ Dynamic Scene Context - Shows current location/situation after initial world description
    const [currentSceneContext, setCurrentSceneContext] = useState<any | null>(null);
    // ★ Ending System - Epilogue state
    const [showEpilogue, setShowEpilogue] = useState(false);
    // ★ V6.1 Extended Epilogue Data
    const [epilogueData, setEpilogueData] = useState<{
        type: string;
        reason?: string;
        epilogue?: string;
        can_continue?: boolean;
        ending_metadata?: {
            world_name: string;
            voyage_title: string;
            artifact: { name: string; data_log: string };
            visual_keywords?: string;
        };
    } | null>(null);

    // ★ V6.1 Player-Initiated Ending Control
    const [canFinishVoyage, setCanFinishVoyage] = useState(false);

    // API Call Lock (Prevent double invocation in StrictMode)
    const isFetchingImageRef = useRef(false);
    // ★ Mobile Overlay: Preserve scroll position when toggling
    const overlayScrollPositionRef = useRef<number>(0);

    const [connectionError, setConnectionError] = useState(false);
    const [lastFailedAction, setLastFailedAction] = useState<string | null>(null);

    // ★ Living World: Player Inactivity Timer
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityTimeRef = useRef<number>(Date.now());
    const inactivityLevelRef = useRef<number>(0); // 0=normal, 1=30s, 2=60s, 3=90s

    // ★ BGM Management Ref
    const bgmRef = useRef<HTMLAudioElement | null>(null);

    // Initial Narrative & Image
    const hasInitializedRef = useRef(false);

    useEffect(() => {
        if (currentWorld && !hasInitializedRef.current) {
            hasInitializedRef.current = true; // Prevent double-init

            // Only add logs if completely empty (fresh start)
            if (logs.length === 0) {
                addLog({
                    id: 'init-1',
                    type: 'SYSTEM',
                    text: `Connected to Dimension: ${currentWorld.name}`,
                    timestamp: Date.now()
                });
                addLog({
                    id: 'init-2',
                    type: 'NARRATIVE',
                    text: currentWorld.description,
                    timestamp: Date.now()
                });
                if (currentWorld.starting_scene) {
                    addLog({
                        id: 'init-3',
                        type: 'NARRATIVE',
                        text: currentWorld.starting_scene,
                        timestamp: Date.now()
                    });
                }

                // ★ Reset Voice Usage for New Dimension
                resetVoiceUsage(currentWorld.name, currentWorld.theme);

                // ★ IMMEDIATE INITIAL IMAGE GENERATION (V6.1 Fix)
                // If no persisted image, generate one from world description immediately to fill the Red Box.
                if (!activeSceneImage) {
                    setIsLoadingImage(true);
                    (async () => {
                        try {
                            const { generateImageAction } = await import('@/actions/image');
                            const initialPrompt = `(First Person Point of View) ${currentWorld.description} ${currentWorld.starting_scene || ''}`;
                            const image = await generateImageAction(
                                initialPrompt,
                                currentWorld.theme || "Sci-Fi",
                                currentWorld.art_style_constraints,
                                currentWorld.starting_scene || currentWorld.description
                            );
                            if (image) {
                                setSceneImage(image);

                                // ★ Set Initial Overlay Text (Korean)
                                // Use world description or starting scene as the initial Korean context
                                const initialContext = {
                                    location_name: currentWorld.name,
                                    situation_summary: (currentWorld.starting_scene || currentWorld.description).substring(0, 100) + "...", // Truncate for overlay
                                    image_prompt: initialPrompt
                                };
                                setCurrentSceneContext(initialContext);

                                // Save to persist immediately
                                const currentChoices = useSessionStore.getState().activeChoices || [];
                                useSessionStore.getState().setActiveUI(
                                    currentChoices,
                                    image,
                                    initialContext
                                );
                            }
                        } catch (e) {
                            console.error("Initial image failed", e);
                        } finally {
                            setIsLoadingImage(false);
                        }
                    })();
                }
            }
        }
    }, [currentWorld]);

    // ★★ REMOVED: Do NOT generate image from world description alone.
    // The image should be generated AFTER the first narrative is received,
    // based on the actual scene description from processAction.
    // The old logic generated images from currentWorld.description/starting_scene
    // which didn't match the dynamically generated narrative.

    // Pre-generation now happens in a separate effect that waits for intro to complete.

    // ★ Pre-generation: Generate first narrative in background during intro
    const preGeneratedDataRef = useRef<{
        narrative: string;
        choices: any[];
        image: string | null;
    } | null>(null);
    const isPreGeneratingRef = useRef(false);

    // ★ PERSISTENCE RESTORATION (Run ONCE on mount)
    useEffect(() => {
        // Load persisted state from Session Store
        const { activeSceneImage, activeSceneContext } = useSessionStore.getState();

        if (activeSceneImage) {
            setSceneImage(activeSceneImage);
            console.log("Found persisted scene image, restoring...");
        }

        if (activeSceneContext) {
            setCurrentSceneContext(activeSceneContext);
        }

        // Also ensure UI is synced? 
        // We probably don't need to force set activeUI here as we just read IT.
    }, []);

    useEffect(() => {
        // Only pre-generate if: world exists, intro is showing, no previous pre-generation, and logs are minimal
        if (currentWorld && showIntro && !isPreGeneratingRef.current && !preGeneratedDataRef.current && logs.length <= 1) {
            isPreGeneratingRef.current = true;
            console.log("[ExplorationView] 🔄 Pre-generating first narrative during intro...");

            // Run the generation in background (no visible action log)
            (async () => {
                try {
                    const { processTurnAction } = await import('@/actions/game');
                    const mockLogs: LogEntry[] = logs.length > 0 ? logs : [
                        { id: 'start', type: 'NARRATIVE', text: currentWorld.starting_scene || currentWorld.description, timestamp: Date.now() }
                    ];

                    const result = await processTurnAction(
                        mockLogs, // history with context
                        currentWorld.description, // worldContext
                        "위 상황에 이어지는, 플레이어가 취할 수 있는 초기 선택지 3개를 제시하라", // Action: Context-aware choice generation
                        appearanceTags || [],
                        currentWorld.knownAppearances || []
                    );

                    // Store pre-generated data
                    preGeneratedDataRef.current = {
                        narrative: result.narrative,
                        choices: result.choices,
                        image: null // Will be generated later
                    };

                    // Generate image based on the narrative
                    const { generateImageAction } = await import('@/actions/image');
                    const basePrompt = result.scene_context?.image_prompt || result.narrative;
                    const image = await generateImageAction(
                        basePrompt,
                        currentWorld.theme || "Sci-Fi",
                        currentWorld.art_style_constraints,
                        result.narrative
                    );

                    if (preGeneratedDataRef.current) {
                        preGeneratedDataRef.current.image = image;
                    }

                    console.log("[ExplorationView] ✅ Pre-generation complete!");
                } catch (err) {
                    console.error("[ExplorationView] Pre-generation failed:", err);
                } finally {
                    isPreGeneratingRef.current = false;
                }
            })();
        }
    }, [currentWorld, showIntro, logs.length, appearanceTags]);

    // ★ Show pre-generated content OR trigger generation when intro completes
    const hasShownFirstNarrative = useRef(false);
    useEffect(() => {
        if (!showIntro && !hasShownFirstNarrative.current && logs.length <= 1) {
            hasShownFirstNarrative.current = true;

            if (preGeneratedDataRef.current) {
                const data = preGeneratedDataRef.current;
                preGeneratedDataRef.current = null;

                console.log("[ExplorationView] 🎬 Showing pre-generated content after intro...");

                addLog({
                    id: Date.now().toString(),
                    type: 'NARRATIVE',
                    text: data.narrative,
                    timestamp: Date.now()
                });

                updateChoices(data.choices);
                if (data.image) {
                    setSceneImage(data.image);
                }
            } else {
                // Pre-generation didn't complete - trigger now
                console.log("[ExplorationView] ⚡ Pre-generation incomplete, triggering now...");
                // Don't add ACTION log - just generate the narrative
                (async () => {
                    try {
                        const { processTurnAction } = await import('@/actions/game');
                        const result = await processTurnAction(
                            logs,
                            currentWorld?.description || '',
                            "첫 발을 내딛다",
                            appearanceTags || [],
                            currentWorld?.knownAppearances || []
                        );

                        addLog({
                            id: Date.now().toString(),
                            type: 'NARRATIVE',
                            text: result.narrative,
                            timestamp: Date.now()
                        });

                        updateChoices(result.choices);

                        // Generate image
                        const { generateImageAction } = await import('@/actions/image');
                        const basePrompt = result.scene_context?.image_prompt || result.narrative;
                        const image = await generateImageAction(
                            basePrompt,
                            currentWorld?.theme || "Sci-Fi",
                            currentWorld?.art_style_constraints,
                            result.narrative
                        );
                        if (image) setSceneImage(image);
                    } catch (err) {
                        console.error("[ExplorationView] First narrative generation failed:", err);
                    }
                })();
            }
        }
    }, [showIntro, logs.length]);

    const isProcessingRef = useRef(false);
    // REMOVED duplicate [isProcessing, setIsProcessing] definition here

    // Helper to clean text for display (removes <tag>...</tag> and <tag/>)
    const cleanTextForDisplay = (text: string) => {
        return text.replace(/<[^>]*>/g, "");
    };

    const processAction = async (actionText: string) => {
        if (!currentWorld || isProcessingRef.current) return;

        // ★ Clear previous error state when starting new action
        setConnectionError(false);
        setLastFailedAction(actionText); // Save for potential retry

        isProcessingRef.current = true;
        setIsProcessing(true);

        // 1. Add Player Action Log
        const actionLog: LogEntry = {
            id: Date.now().toString(),
            type: 'ACTION',
            text: `> ${actionText}`,
            timestamp: Date.now()
        };
        addLog(actionLog);

        // 2. Call Server Action
        try {
            const { processTurnAction } = await import('@/actions/game'); // Dynamic import to avoid circular dep issues if any
            const result = await processTurnAction(
                logs,
                currentWorld.description,
                actionText,
                appearanceTags || [],
                currentWorld.knownAppearances || []
            );

            // 3. Process Narrative Segments & TTS
            const segments = result.narrative_segments || [{ type: 'desc', text: result.narrative }];

            // Add narrative log immediately (SFX will be attached later asynchronously)
            const narrativeLogId = (Date.now() + 1).toString();
            addLog({
                id: narrativeLogId,
                type: 'NARRATIVE',
                text: cleanTextForDisplay(result.narrative),
                timestamp: Date.now()
            });

            // 4. Update Choices
            updateChoices(result.choices);

            // 5. Update Image (Background) & Audio (SFX) & Voice (TTS)

            // ★ Scene Management System Check
            const sceneAction = result.scene_context?.action || 'NEW';

            // ★ V6.1 Game State Update
            if (result.game_state) {
                setCanFinishVoyage(result.game_state.can_finish_voyage);
                console.log(`[GameState] Can Finish Voyage: ${result.game_state.can_finish_voyage}, Forced Ending: ${result.game_state.is_forced_ending}`);
            }

            // ★ Ending Signal Check
            if (result.ending_signal && result.ending_signal.type) {
                console.log(`[EndingSystem] 🎬 Ending Detected: ${result.ending_signal.type}`);
                // ★ Save to Voyage Log (Local Storage for Meta-game)
                if (result.ending_signal.ending_metadata) {
                    try {
                        const history = JSON.parse(localStorage.getItem('voyage_history') || '[]');
                        history.push({
                            timestamp: new Date().toISOString(),
                            ...result.ending_signal.ending_metadata,
                            ending_type: result.ending_signal.type
                        });
                        localStorage.setItem('voyage_history', JSON.stringify(history));
                        console.log('[EndingSystem] Voyage Artifact Saved to Log');
                    } catch (e) {
                        console.error('Failed to save voyage history', e);
                    }
                }

                setEpilogueData({
                    type: result.ending_signal.type,
                    reason: result.ending_signal.reason,
                    epilogue: result.ending_signal.epilogue,
                    can_continue: result.ending_signal.can_continue,
                    ending_metadata: result.ending_signal.ending_metadata
                });
                setShowEpilogue(true);
            }

            // ★ Update current scene context for dynamic location display
            // ★ Update current scene context for dynamic location display
            if (result.scene_context?.situation_summary) {
                // Priority 1: Use specific Korean summary from AI
                setCurrentSceneContext(result.scene_context.situation_summary);
            } else if (result.scene_context?.location_name) {
                // Priority 2: Fallback to location name
                setCurrentSceneContext(`현재 위치: ${result.scene_context.location_name}`);
            }
            // Priority 3: REMOVED (Do not fall back to English image_prompt)

            // ★ SYNC TO STORE (Persistence)
            // Need to get the freshly set context. Since setState is async, we use the value directly.
            let nextContext = null;
            if (result.scene_context?.situation_summary) nextContext = result.scene_context.situation_summary;
            else if (result.scene_context?.location_name) nextContext = `현재 위치: ${result.scene_context.location_name}`;

            if (nextContext) {
                useSessionStore.getState().setActiveUI(result.choices, sceneImage, nextContext);
            }

            if (sceneAction === 'MAINTAIN' && sceneImage) {
                console.log("[SceneManager] Visual Context: MAINTAIN. Skipping image generation.");
                setIsLoadingImage(false);
            } else {
                setIsLoadingImage(true); // Only set loading if we intend to generate
                setHeaderText("데이터 분석 및 음성 합성 중...");

                // Extract speaking characters from dialogue segments for character-specific image
                const speakingCharacters = segments
                    .filter(s => s.type === 'dialogue' && s.speaker)
                    .map(s => s.speaker!);

                // Generate scene image - if there are speaking characters, include them in the prompt
                // Also use image_prompt from scene_context if available for better consistency
                const basePrompt = result.scene_context?.image_prompt || result.narrative;

                const imagePrompt = speakingCharacters.length > 0
                    ? `${basePrompt}. Scene includes: ${speakingCharacters.join(', ')}. Close-up view showing the characters.`
                    : basePrompt;


                // ★ Asset Director Integration - 캐시 확인 후 이미지 생성
                const assetStore = useAssetStore.getState();
                const stateKey = assetStore.generateStateKey();

                // 현재 장면 설명으로 캐시 조회
                const assetDecision = assetStore.decideLocationAction(result.narrative.slice(0, 50), stateKey);

                if (assetDecision.action === 'RETRIEVE') {
                    // Case A: 캐시된 이미지 즉시 사용
                    console.log(`[Asset] RETRIEVE: ${assetDecision.assetId}`);
                    setSceneImage(assetDecision.imageUrl!);
                    setIsLoadingImage(false);
                } else {
                    // Case B/C: 생성 필요
                    // ★ THROTTLING: 이미 생성 중이라면 추가 요청 스킵 (Burst 방지)
                    if (isLoadingImage) {
                        console.warn("[Asset] Skipped generation: Another image is already loading.");
                    } else {
                        setIsLoadingImage(true); // ★ Fix: Set loading state immediately to prevent burst
                        const isNew = assetDecision.action === 'NEW_BASE';
                        console.log(`[Asset] GENERATING (${isNew ? 'NEW' : 'VAR'}): ${isNew ? assetDecision.suggestedId : assetDecision.assetId}`);

                        generateImageAction(
                            // 1. Description: Shortened and directed
                            imagePrompt.slice(0, 500),
                            currentWorld.theme || "Sci-Fi",
                            // 2. Constraints: Inject POV enforcement + Time of Day
                            {
                                ...currentWorld.art_style_constraints,
                                enforce_style_prompt: `${currentWorld.art_style_constraints?.enforce_style_prompt || ''}, First-person perspective (POV), View from player's eyes, Gender-neutral hands, Time of day: ${currentWorld.timeOfDay || 'day'}`.trim(),
                                negative_constraints_prompt: currentWorld.art_style_constraints?.negative_constraints_prompt || ""
                            },
                            // 3. Narrative Context for Refinement: Explicitly state POV + Time intent
                            `POV: View from player's eyes. Time: ${currentWorld.timeOfDay || 'day'}. ${imagePrompt.slice(0, 500)}`
                        ).then(async (newImage) => {
                            if (newImage && !newImage.includes("ERROR")) {
                                if (preGeneratedDataRef.current) {
                                    preGeneratedDataRef.current.image = newImage;
                                    console.log("[ExplorationView] ✅ Pre-generated Image Ready");
                                }
                                // If intro is already closed (edge case), apply immediately
                                if (!showIntro) setSceneImage(newImage);
                            }

                            // 2. Background Upload to Firebase (only if configured)
                            try {
                                const { isFirebaseConfigured } = await import('@/lib/firebase');
                                if (!isFirebaseConfigured) {
                                    console.log('[Asset] Skipping cloud upload - Firebase not configured');
                                } else {
                                    const { uploadImageToStorage, saveToFirestore } = await import('@/lib/storage');
                                    const targetId = assetDecision.action === 'NEW_BASE' ? assetDecision.suggestedId : assetDecision.assetId;
                                    const filename = `locations/${targetId}_${stateKey}_${Date.now()}.png`;

                                    console.log(`[Asset] Uploading to Cloud: ${filename}...`);
                                    if (newImage) {
                                        const cloudUrl = await uploadImageToStorage(newImage, filename);
                                        console.log(`[Asset] Upload Complete: ${cloudUrl}`);

                                        // ★ Update Persistence with Permanent URL
                                        if (!showIntro) {
                                            setSceneImage(cloudUrl);
                                            const st = useSessionStore.getState();
                                            // Preserve existing choices/context in store, update only image
                                            st.setActiveUI(st.activeChoices || [], cloudUrl, st.activeSceneContext);
                                        }

                                        // 3. Save Cloud URL to Local Store (IndexedDB) & Cloud DB (Firestore)
                                        if (assetDecision.action === 'NEW_BASE') {
                                            const newAsset = {
                                                id: targetId,
                                                name: result.narrative.slice(0, 50),
                                                baseImage: cloudUrl,
                                                variations: { [stateKey]: cloudUrl },
                                                createdAt: Date.now()
                                            };
                                            assetStore.saveLocation(newAsset);
                                            saveToFirestore('assets_locations', targetId, newAsset);
                                        } else {
                                            assetStore.saveLocationVariation(targetId, stateKey, cloudUrl);
                                            // For variation, we update the map in Firestore
                                            const updateData: any = {};
                                            updateData[`variations.${stateKey}`] = cloudUrl;
                                            saveToFirestore('assets_locations', targetId, updateData);
                                        }
                                    }
                                }
                            } catch (err) {
                                console.error("[Asset] Upload Failed, falling back to Local Base64:", err);
                                // Fallback: Save Base64 to local store (Legacy behavior)
                                if (newImage) {
                                    if (assetDecision.action === 'NEW_BASE') {
                                        assetStore.saveLocation({
                                            id: assetDecision.suggestedId,
                                            name: result.narrative.slice(0, 50),
                                            baseImage: newImage,
                                            variations: { [stateKey]: newImage },
                                            createdAt: Date.now()
                                        });
                                    } else {
                                        assetStore.saveLocationVariation(assetDecision.assetId, stateKey, newImage);
                                    }
                                }
                            } finally {
                                setIsLoadingImage(false);
                            }
                        }).catch((err) => {
                            console.error("[Asset] Unhandled Error in Image Generation Chain:", err);
                            setIsLoadingImage(false);
                        });
                    }
                }
            } // Close Scene Management Check (Visual Only)

            // ★ ElevenLabs Audio Director Integration (Runs Async, doesn't block)
            // Allow SFX on: NEW scenes, or MAINTAIN scenes with new narrative content
            const shouldGenerateSfx = settings.sfxEnabled && (sceneAction !== 'MAINTAIN' || !sceneImage);

            if (shouldGenerateSfx) {
                (async () => {
                    try {
                        const { generateAudioDirectorPrompts } = await import('@/actions/audioDirector');
                        const { generateAudioFromDirector } = await import('@/actions/audio');

                        const audioContext = `${result.narrative} (장소: ${currentWorld?.name || '알 수 없음'})`;
                        const audioPrompts = await generateAudioDirectorPrompts(audioContext);

                        if (audioPrompts) {
                            console.log("[AudioDirector] 🎵 Generated prompts:", audioPrompts.context_summary);

                            const { sfx, bgm } = await generateAudioFromDirector(audioPrompts);

                            if (sfx) {
                                const { useSessionStore } = await import('@/store/useSessionStore');
                                useSessionStore.getState().updateLog(narrativeLogId, { sfxUrl: sfx });
                                console.log("[AudioDirector] ✅ SFX attached to narrative log");
                            }

                            if (bgm && settings.bgmEnabled) {
                                if (bgmRef.current) {
                                    bgmRef.current.pause();
                                    bgmRef.current = null;
                                }

                                const bgmAudio = new Audio(bgm);
                                bgmAudio.volume = 0.20;
                                bgmAudio.loop = true;
                                bgmRef.current = bgmAudio;
                                bgmAudio.play().catch(console.error);
                                console.log("[AudioDirector] ✅ BGM started playing (Looped)");
                            }
                        }

                    } catch (error) {
                        console.error("[AudioDirector] Error:", error);
                    }
                })();
            } else {
                console.log("[AudioDirector] Skipping SFX - Scene: MAINTAIN with existing image.");
            }

            // TTS Sequence Playback using Varco Voice List API
            const { generateSpeechAction } = await import('@/actions/tts');

            for (const segment of segments) {
                if (segment.type === 'dialogue' && segment.speaker) {
                    const dialogueLogId = (Date.now() + Math.random()).toString();

                    // Use character_info from Gemini if available
                    let characterTags: { gender?: string; age?: string; properties?: string[] } = {};

                    if (segment.character_info) {
                        characterTags = {
                            gender: segment.character_info.gender,
                            age: segment.character_info.age,
                            properties: segment.character_info.voice_style
                        };
                        console.log(`[Voice Match] Using Gemini character_info for ${segment.speaker}:`, characterTags);
                    } else {
                        // Fallback inference
                        const nameLower = segment.speaker.toLowerCase();
                        if (nameLower.includes('무사') || nameLower.includes('장군') || nameLower.includes('대장') || nameLower.includes('남성') || nameLower.includes('남자')) {
                            characterTags.gender = '남성';
                            characterTags.properties = ['거친', '위엄있는'];
                        } else if (nameLower.includes('노인') || nameLower.includes('장로') || nameLower.includes('할')) {
                            characterTags.age = '노년';
                            characterTags.properties = ['현명한', '차분한'];
                        } else if (nameLower.includes('소녀') || nameLower.includes('아가씨') || nameLower.includes('공주') || nameLower.includes('여성') || nameLower.includes('여자') || nameLower.includes('부인')) {
                            characterTags.gender = '여성';
                            characterTags.age = '청년';
                            characterTags.properties = ['부드러운'];
                        }
                        // ★ SYSTEM/AI/ROBOT Voice Detection
                        if (nameLower.includes('시스템') || nameLower.includes('system') || nameLower.includes('ai') ||
                            nameLower.includes('로봇') || nameLower.includes('안내') || nameLower.includes('방송') ||
                            nameLower.includes('컴퓨터') || nameLower.includes('기계')) {
                            characterTags.gender = '여성';
                            characterTags.age = '중년';
                            characterTags.properties = ['기계적인', '단조로운', '차분한'];
                            console.log(`[Voice] Detected SYSTEM-type speaker: ${segment.speaker}`);
                        }
                    }

                    const { selectVoiceForCharacter } = await import('@/lib/voiceMapping');
                    const emotion = segment.emotion || '중립';

                    const characterInfo = segment.character_info ? {
                        gender: segment.character_info.gender,
                        age: segment.character_info.age,
                        voice_style: segment.character_info.voice_style
                    } : {
                        gender: characterTags.gender,
                        age: characterTags.age,
                        voice_style: characterTags.properties
                    };

                    // ★ Voice Selection
                    // ★ Voice Selection (Prioritize Stable ID)
                    const voiceResult = await selectVoiceForCharacter(
                        segment.character_id || segment.speaker, // Use ID if available, else Name
                        characterInfo,
                        emotion,
                        currentWorld?.description,
                        voiceMap,
                        segment.speaker // displayName for logging
                    );

                    // ★ Save Voice Map (Use Stable ID)
                    // This ensures that even if name changes, the ID remains mapped to the same voice
                    useSessionStore.getState().updateVoiceMap(
                        segment.character_id || segment.speaker,
                        voiceResult.voiceBaseName
                    );
                    console.log(`[ExplorationView] 🎭 Voice matched for ${segment.speaker} (ID: ${segment.character_id || 'N/A'}): ${voiceResult?.voiceBaseName}`);

                    let speechData: string | null = null;

                    // ★ TTS Generation (Blocking logic as requested)
                    if (voiceResult?.voiceUuid) {
                        setHeaderText(`음성 생성 중: ${segment.speaker}...`);
                        console.log(`[ExplorationView] 🎤 Requesting TTS: "${segment.text.substring(0, 20)}..."`);

                        try {
                            const speechDataPromise = generateSpeechAction({
                                text: segment.text,
                                speakerId: voiceResult.voiceUuid,
                                emotion: emotion,
                                psychologicalState: segment.psychological_state,
                                physicalState: segment.physical_state
                            });

                            const timeoutPromise = new Promise<null>((resolve) =>
                                setTimeout(() => {
                                    console.warn(`[ExplorationView] ⏳ TTS timed out for ${segment.speaker}`);
                                    resolve(null);
                                }, 15000) // 15s Timeout
                            );

                            speechData = await Promise.race([speechDataPromise, timeoutPromise]);
                        } catch (ttsError) {
                            console.error(`[ExplorationView] ⚠️ TTS Exception for ${segment.speaker}:`, ttsError);
                        }
                    }

                    // ★ Add Log NOW (After TTS attempt)
                    addLog({
                        id: dialogueLogId,
                        type: 'DIALOGUE',
                        speaker: segment.speaker,
                        text: cleanTextForDisplay(segment.text), // ★ Clean text only for display
                        timestamp: Date.now(),
                        audioUrl: speechData || undefined // Attach audio if ready
                    });

                    if (speechData) {
                        console.log(`[ExplorationView] ✅ TTS ready & Log added for ${segment.speaker}`);
                    } else {
                        console.warn(`[ExplorationView] ❌ Audio missing for ${segment.speaker}, log added without audio.`);
                    }

                    // ★ Parenthetical Sound Effect Extraction & Generation
                    // Parse text for sounds like "(용접기 소리)", "(발소리)", "(문 닫히는 소리)" etc.
                    const soundRegex = /\(([^)]*(?:소리|sound|音)[^)]*)\)/gi;
                    const soundMatches = segment.text.match(soundRegex);

                    if (soundMatches && soundMatches.length > 0 && settings.sfxEnabled) {
                        console.log(`[DialogueSFX] 🔊 Found parenthetical sounds: ${soundMatches.join(', ')}`);

                        // Generate SFX for the first sound found (to avoid overwhelming API)
                        (async () => {
                            try {
                                const { getAudioWithCache } = await import('@/actions/audioCacheService');
                                const soundDescription = soundMatches[0].replace(/[()]/g, '');

                                const cacheResult = await getAudioWithCache(
                                    soundDescription,
                                    'sfx',
                                    async () => {
                                        const { generateSoundEffectAction } = await import('@/actions/audio');
                                        return generateSoundEffectAction(soundDescription, 2);
                                    }
                                );

                                if (cacheResult) {
                                    // Attach SFX to the dialogue log
                                    useSessionStore.getState().updateLog(dialogueLogId, { sfxUrl: cacheResult.url });
                                    console.log(`[DialogueSFX] ✅ Attached SFX: ${soundDescription} (cached: ${cacheResult.fromCache})`);
                                }
                            } catch (sfxError) {
                                console.error('[DialogueSFX] Error generating sound:', sfxError);
                            }
                        })();
                    }

                    // Small delay between dialogues to prevent overlap if multiple
                    if (speechData) await new Promise(r => setTimeout(r, 500));
                }
            }

            setHeaderText("연결 안정적");

        } catch (error) {
            console.error("Turn Error:", error);
            setConnectionError(true);
            addLog({
                id: Date.now().toString(),
                type: 'SYSTEM',
                text: "연결 신호 불안정... 재접속을 시도하세요.",
                timestamp: Date.now()
            });
            setHeaderText("신호 소실");
        } finally {
            isProcessingRef.current = false;
            setIsProcessing(false);
        }
    };

    // ★ Retry/Reconnect handler - 이전 내러티브와 자연스럽게 연결
    const handleRetry = () => {
        if (lastFailedAction) {
            addLog({
                id: Date.now().toString(),
                type: 'SYSTEM',
                text: "차원 연결 재시도 중...",
                timestamp: Date.now()
            });
            processAction(lastFailedAction);
        }
    };

    const handleChoice = (choiceId: string) => {
        // Find text for log (optional beauty) or just use ID
        const choiceText = choices.find(c => c.id === choiceId)?.text || choiceId;
        processAction(choiceText);
    };

    const handleCommand = (text: string) => {
        // ★ Runtime Settings Toggles
        if (text === 'sys:sfx on') {
            useSessionStore.getState().updateSettings({ sfxEnabled: true });
            addLog({
                id: Date.now().toString(),
                type: 'SYSTEM',
                text: "🔊 SFX 자동 생성 활성화 (ElevenLabs 크레딧 소모됨)",
                timestamp: Date.now()
            });
            return;
        }
        if (text === 'sys:sfx off') {
            useSessionStore.getState().updateSettings({ sfxEnabled: false });
            addLog({
                id: Date.now().toString(),
                type: 'SYSTEM',
                text: "🔇 SFX 자동 생성 비활성화 (보존 모드)",
                timestamp: Date.now()
            });
            return;
        }

        processAction(text);
    };

    if (!currentWorld) return <div className="p-8 text-center text-primary animate-pulse font-retro">현실 구성 중...</div>;

    // ★ BGM Toggle Effect - Pause/Resume immediately
    useEffect(() => {
        if (bgmRef.current) {
            if (settings.bgmEnabled) {
                bgmRef.current.play().catch(console.error);
            } else {
                bgmRef.current.pause();
            }
        }
    }, [settings.bgmEnabled]);

    // ★ Living World: Reset inactivity timer on any player activity
    const resetInactivityTimer = () => {
        lastActivityTimeRef.current = Date.now();
        inactivityLevelRef.current = 0;
    };

    // ★ Living World: Trigger autonomous NPC response when player is inactive
    const triggerNPCAutonomousResponse = async (level: number) => {
        if (isProcessingRef.current || showIntro || !currentWorld || !logs.length) return;

        // Get the last speaking NPC from logs
        const lastNarrativeLog = [...logs].reverse().find(l => l.type === 'NARRATIVE');
        if (!lastNarrativeLog) return;

        const inactivityContexts = [
            "", // level 0 - no action
            "(플레이어가 30초간 아무 반응이 없습니다. NPC가 의아해하거나 재촉합니다.)",
            "(플레이어가 60초간 침묵합니다. NPC가 짜증을 내거나 걱정합니다.)",
            "(플레이어가 90초 이상 반응이 없습니다. NPC가 상황에 맞게 자율적으로 행동합니다. 떠나거나, 다른 행동을 하거나, 상황이 변화합니다.)"
        ];

        const context = inactivityContexts[level] || "";
        if (!context) return;

        console.log(`[LivingWorld] 🌍 Triggering autonomous NPC response (Level ${level})`);

        try {
            isProcessingRef.current = true;
            setIsProcessing(true);

            const { processTurnAction } = await import('@/actions/game');
            const result = await processTurnAction(
                logs,
                currentWorld?.description || '',
                `[SYSTEM: NPC 자율 반응] ${context}`,
                appearanceTags || [],
                currentWorld?.knownAppearances || []
            );

            if (result?.narrative) {
                addLog({
                    id: `npc-auto-${Date.now()}`,
                    type: 'NARRATIVE',
                    text: result.narrative,
                    timestamp: Date.now()
                });

                if (result.choices) {
                    updateChoices(result.choices);
                }
            }
        } catch (err) {
            console.error("[LivingWorld] Autonomous response failed:", err);
        } finally {
            isProcessingRef.current = false;
            setIsProcessing(false);
        }
    };

    // ★ Living World: Inactivity check interval
    useEffect(() => {
        if (showIntro || !currentWorld) return;

        const checkInterval = setInterval(() => {
            const elapsed = Date.now() - lastActivityTimeRef.current;
            const currentLevel = inactivityLevelRef.current;

            // Level thresholds: 30s, 60s, 90s
            const thresholds = [30000, 60000, 90000];

            for (let i = currentLevel; i < thresholds.length; i++) {
                if (elapsed >= thresholds[i] && inactivityLevelRef.current === i) {
                    inactivityLevelRef.current = i + 1;
                    triggerNPCAutonomousResponse(i + 1);
                    break;
                }
            }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(checkInterval);
    }, [showIntro, currentWorld]);

    // ★ Living World: Reset timer on user interaction
    useEffect(() => {
        const handleUserActivity = () => resetInactivityTimer();

        window.addEventListener('click', handleUserActivity);
        window.addEventListener('keydown', handleUserActivity);
        window.addEventListener('touchstart', handleUserActivity);

        return () => {
            window.removeEventListener('click', handleUserActivity);
            window.removeEventListener('keydown', handleUserActivity);
            window.removeEventListener('touchstart', handleUserActivity);
        };
    }, []);

    return (
        <div className="flex flex-col h-[100dvh] w-full max-w-4xl mx-auto bg-background md:border-x md:border-ui-bg font-sans relative overflow-hidden">
            {/* Intro Overlay */}
            {/* Intro Overlay */}
            <AnimatePresence>
                {showIntro && (
                    <WorldIntroView
                        world={currentWorld}
                        backgroundImage={sceneImage}
                        onComplete={() => {
                            setShowIntro(false);
                            // ★ Apply Pre-generated Data (Narrative + Image)
                            if (preGeneratedDataRef.current) {
                                const { narrative, choices, image } = preGeneratedDataRef.current;
                                // 1. Add Log - SUPPRESSED to prevent double intro
                                // The starting_scene (Red Box) is already shown.
                                // We only need choices and image from the AI generation.
                                /*
                                addLog({
                                    id: Date.now().toString(),
                                    type: 'NARRATIVE',
                                    text: narrative,
                                    timestamp: Date.now()
                                });
                                */
                                // 2. Update Choices
                                updateChoices(choices);
                                // 3. Apply Image (if ready)
                                if (image) {
                                    setSceneImage(image);
                                    console.log("[ExplorationView] Applied pre-generated image.");
                                } else {
                                    console.log("[ExplorationView] Pre-generated image not ready yet, waiting for stream...");
                                    setIsLoadingImage(true);
                                    // If image stream arrives later, it check !showIntro and apply
                                }
                                preGeneratedDataRef.current = null; // Cleanup
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Header: World Info */}
            <header className="px-3 py-2 border-b border-ui-border flex justify-between items-center bg-ui-bg/80 backdrop-blur z-20 sticky top-0 gap-2 overflow-hidden">
                <div className="flex items-center gap-2 md:gap-4 min-w-0 shrink">
                    {currentWorld.canReturn ? (
                        <button
                            onClick={onExit}
                            className="text-danger hover:text-red-400 transition-colors flex items-center gap-1 group"
                            title="조기 복귀 (Early Return)"
                        >
                            <LogOut className="rotate-180" size={20} />
                            <span className="text-[10px] font-retro hidden group-hover:block transition-all text-danger">복귀</span>
                        </button>
                    ) : (
                        <div className="text-secondary/50 cursor-not-allowed" title="현재 위치에서는 복귀할 수 없습니다 (Signal Jammed)">
                            <LogOut className="rotate-180 opacity-30" size={20} />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h2 className="text-base md:text-lg font-bold text-primary tracking-widest uppercase font-retro truncate">{currentWorld.name}</h2>
                        <p className="text-[10px] md:text-xs text-secondary/80 font-mono truncate">{currentWorld.timeOfDay} | Threat: {currentWorld.threatLevel}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Story Finish Button - V6.1 AI Activated */}
                    {/* Story Finish Button - Always Visible (Disabled if unsafe) */}
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: canFinishVoyage ? 1 : 0.4, scale: 1 }}
                        whileHover={canFinishVoyage ? { scale: 1.05 } : {}}
                        onClick={() => {
                            if (canFinishVoyage) handleCommand("나는 이 이야기를 여기서 마무리하기로 했다.");
                            else {
                                // Optional: access addLog from store to show warning? Or just simple alert/shake
                                // For now, just a visual disabled state is enough.
                            }
                        }}
                        className={clsx(
                            "flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded transition-all ml-auto border md:ml-0 shrink-0",
                            canFinishVoyage
                                ? "bg-blue-900/30 text-blue-400 hover:text-blue-200 hover:bg-blue-800/50 border-blue-500/50 animate-pulse-slow cursor-pointer"
                                : "bg-ui-bg/50 text-secondary/30 border-secondary/20 cursor-not-allowed"
                        )}
                        title={canFinishVoyage ? "항해 종료 (Finish Voyage)" : "⚠️ 위협 수준이 높아 항해를 종료할 수 없습니다."}
                    >
                        <BookOpen size={16} />
                        <span className="text-xs font-bold font-retro tracking-wider whitespace-nowrap">
                            {canFinishVoyage ? "항해 종료" : "종료 불가"}
                        </span>
                    </motion.button>

                    {/* Audio Controls */}
                    <div className="flex items-center gap-2 mr-2">
                        <button
                            onClick={() => useSessionStore.getState().updateSettings({ sfxEnabled: !settings.sfxEnabled })}
                            className={clsx(
                                "flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-xs font-mono border",
                                settings.sfxEnabled
                                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                                    : "bg-transparent text-secondary/50 border-transparent hover:text-secondary hover:border-secondary/30"
                            )}
                            title={settings.sfxEnabled ? "SFX ON" : "SFX OFF"}
                        >
                            {settings.sfxEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                            <span className="hidden md:inline">SFX</span>
                        </button>
                        <button
                            onClick={() => useSessionStore.getState().updateSettings({ bgmEnabled: !settings.bgmEnabled })}
                            className={clsx(
                                "flex items-center gap-1 px-1.5 py-1 rounded transition-colors text-xs font-mono border shrink-0",
                                settings.bgmEnabled
                                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                                    : "bg-transparent text-secondary/50 border-transparent hover:text-secondary hover:border-secondary/30"
                            )}
                            title={settings.bgmEnabled ? "BGM ON" : "BGM OFF"}
                        >
                            {settings.bgmEnabled ? <Activity size={12} /> : <VolumeX size={12} />}
                            <span className="hidden md:inline">BGM</span>
                        </button>
                    </div>

                    <div className={`w-2 h-2 rounded-full shrink-0 ${isLoadingImage ? 'bg-yellow-500 animate-ping' : 'bg-green-500'}`} />
                    <span className="text-xs font-mono text-info/70 hidden md:inline whitespace-nowrap">
                        {headerText}
                    </span>
                </div>
            </header>

            {/* Visualizer (Image) - Fills vertical space on mobile, fixed aspect on desktop */}
            <div
                className="w-full flex-1 md:flex-none md:aspect-video bg-black border-b border-ui-border relative overflow-hidden md:shrink-0 cursor-pointer"
                onClick={() => setIsNarrativeOverlayVisible(!isNarrativeOverlayVisible)}
            >
                {sceneImage ? (
                    <img
                        src={sceneImage}
                        alt="Scene Visualization"
                        className={`w-full h-full object-contain transition-opacity duration-1000 ${showIntro ? 'opacity-0' : 'opacity-80'}`}
                    />
                ) : (
                    /* World Construction Loading Effect */
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black">
                        {/* Grid construction effect */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(240,230,140,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(240,230,140,0.03)_1px,transparent_1px)] bg-[size:20px_20px] animate-pulse" />

                        {/* Center loading indicator */}
                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <div className="w-20 h-20 border-2 border-primary/30 rounded-full flex items-center justify-center">
                                <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                            <p className="text-primary/80 font-mono text-sm animate-pulse">세계관 데이터 시각화 중...</p>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Scanline overlay */}
                <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-20 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent pointer-events-none" />

                {/* World Info Overlay - Bottom (only show when image is loaded) */}
                {sceneImage && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-primary/20 border border-primary/30 rounded text-primary text-[10px] font-mono">
                                Connected to Dimension: {currentWorld.name}
                            </span>
                        </div>
                        <p className="text-stone-300 text-sm leading-relaxed max-h-[4.5rem] overflow-y-auto scrollbar-hide">
                            {typeof currentSceneContext === 'object' && currentSceneContext !== null
                                ? (currentSceneContext.situation_summary || currentSceneContext.location_name || currentWorld.description)
                                : (currentSceneContext || currentWorld.description)}
                        </p>
                    </div>
                )}

                {/* ★ MOBILE: Narrative Log Overlay on Image - Always mounted to preserve scroll */}
                <motion.div
                    initial={false}
                    animate={{
                        opacity: isNarrativeOverlayVisible ? 1 : 0,
                        y: isNarrativeOverlayVisible ? 0 : 20
                    }}
                    transition={{ duration: 0.3 }}
                    className={`absolute inset-0 flex flex-col justify-end md:hidden ${isNarrativeOverlayVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}
                >
                    {/* Gradient overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />
                    {/* Narrative content - expanded for more text visibility */}
                    <div
                        data-overlay-scroll
                        className={`relative z-10 p-4 max-h-[80%] scrollbar-hide ${isNarrativeOverlayVisible ? 'overflow-y-auto pointer-events-auto' : 'overflow-hidden pointer-events-none'}`}
                    >
                        <NarrativeLog entries={logs} isLoading={isProcessing} compact />
                    </div>
                </motion.div>

                {/* Toggle Hint - Mobile Only */}
                <div className="absolute top-2 right-2 md:hidden z-20">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // Save current scroll position before hiding
                            const overlayContainer = document.querySelector('[data-overlay-scroll]');
                            if (overlayContainer && isNarrativeOverlayVisible) {
                                overlayScrollPositionRef.current = overlayContainer.scrollTop;
                            }
                            setIsNarrativeOverlayVisible(!isNarrativeOverlayVisible);
                            // Restore scroll position after showing
                            if (!isNarrativeOverlayVisible) {
                                setTimeout(() => {
                                    const container = document.querySelector('[data-overlay-scroll]');
                                    if (container) {
                                        container.scrollTop = overlayScrollPositionRef.current;
                                    }
                                }, 50);
                            }
                        }}
                        className={clsx(
                            "px-2 py-1 rounded text-[10px] font-mono transition-all border backdrop-blur-sm",
                            isNarrativeOverlayVisible
                                ? "bg-primary/20 text-primary border-primary/30"
                                : "bg-black/50 text-secondary/70 border-secondary/30"
                        )}
                    >
                        {isNarrativeOverlayVisible ? "텍스트 숨김" : "텍스트 보기"}
                    </button>
                </div>
            </div>

            {/* Narrative Log (Scrollable) - DESKTOP ONLY (Mobile uses overlay) */}
            <div className="min-h-0 flex-col relative bg-background/50 hidden md:flex md:flex-1">
                <NarrativeLog entries={logs} isLoading={isProcessing} />
            </div>

            {/* Controls (Footer) */}
            {/* ★ Collapsible Choices Panel - pushed to bottom with mt-auto */}
            <div className="border-t border-ui-border bg-background/95 backdrop-blur z-10 shrink-0 mt-auto">
                {/* Toggle Handle */}
                <button
                    onClick={() => setIsChoicesPanelOpen(!isChoicesPanelOpen)}
                    className="w-full py-2 flex items-center justify-center gap-2 text-secondary/70 hover:text-primary transition-colors"
                >
                    <motion.div
                        animate={{ rotate: isChoicesPanelOpen ? 0 : 180 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown size={16} />
                    </motion.div>
                    <span className="text-xs font-mono">
                        {isChoicesPanelOpen ? "선택지 접기" : "선택지 펼치기"}
                    </span>
                </button>

                {/* Collapsible Content */}
                <AnimatePresence>
                    {isChoicesPanelOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div className="p-4">
                                {/* ★ Reconnect UI when connection error */}
                                {connectionError ? (
                                    <div className="flex flex-col items-center gap-3 py-4">
                                        <div className="text-danger text-sm font-mono animate-pulse">
                                            ⚠ 차원 연결 신호 소실
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleRetry}
                                                className="px-6 py-3 bg-primary/20 border border-primary/50 rounded text-primary hover:bg-primary/30 transition-all font-mono text-sm flex items-center gap-2"
                                            >
                                                <Activity size={16} className="animate-pulse" />
                                                재접속 시도
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setConnectionError(false);
                                                    setLastFailedAction(null);
                                                }}
                                                className="px-6 py-3 bg-secondary/20 border border-secondary/50 rounded text-secondary hover:bg-secondary/30 transition-all font-mono text-sm"
                                            >
                                                무시하고 계속
                                            </button>
                                        </div>
                                        <p className="text-xs text-secondary/60 text-center mt-2">
                                            재접속 시 이전 행동을 다시 시도합니다
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <ChoiceView choices={choices || []} onSelect={handleChoice} disabled={isProcessing} />
                                        <div className="mt-4">
                                            <CommandInput onSubmit={handleCommand} disabled={isProcessing} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* ★ Epilogue Overlay */}
                {showEpilogue && epilogueData && (
                    <EpilogueView
                        data={epilogueData}
                        onRestart={() => window.location.reload()}
                        onContinue={() => setShowEpilogue(false)}
                    />
                )}
            </div>
        </div>
    );
}
