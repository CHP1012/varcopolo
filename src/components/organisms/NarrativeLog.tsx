'use client';

import { useEffect, useState, useRef } from 'react';
import { LogEntry } from '@/types/game';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '@/store/useSessionStore';
import '@/styles/textFX.css'; // Cinematic TextFX Styles

interface NarrativeLogProps {
    entries: LogEntry[];
    isLoading?: boolean; // ★ Show loading indicator
    compact?: boolean; // ★ Compact mode for mobile overlay (smaller text, less padding)
}

// ★ Loading Dots Animation Component
function LoadingDots() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 py-4 px-2 text-secondary"
        >
            <span className="animate-pulse">응답 대기 중</span>
            <span className="flex gap-1">
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
        </motion.div>
    );
}

export default function NarrativeLog({ entries, isLoading = false, compact = false }: NarrativeLogProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [forceUpdateCount, setForceUpdate] = useState(0);
    const userScrolledUpRef = useRef(false);

    // ★ FIX: Track completed entries in a ref scoped to THIS component instance
    // This prevents stale state from persisting across page navigations or re-mounts
    const completedEntriesRef = useRef(new Set<string>());
    const lastLoggedEntriesCount = useRef(0); // Reduce debug log spam

    // ★ Session detection and completion tracking for reconnect
    useEffect(() => {
        if (entries.length > 0) {
            const hasAnyCurrentEntry = entries.some(e => completedEntriesRef.current.has(e.id));

            // If we have entries but none are in our completed set, this is a RECONNECT
            // Mark ALL existing entries as completed to prevent audio replay
            if (!hasAnyCurrentEntry && completedEntriesRef.current.size === 0 && entries.length > 1) {
                console.log("[NarrativeLog] 🔄 Reconnect detected - marking all existing entries as completed.");
                entries.forEach(e => completedEntriesRef.current.add(e.id));
                // Leave only the last entry as potentially active
                const lastEntry = entries[entries.length - 1];
                if (lastEntry.type !== 'ACTION') {
                    completedEntriesRef.current.delete(lastEntry.id);
                }
            }
            // If our set is non-empty but doesn't contain any current entry IDs, new session
            else if (completedEntriesRef.current.size > 0 && !hasAnyCurrentEntry) {
                console.log("[NarrativeLog] 🆕 New session - resetting completed entries.");
                completedEntriesRef.current.clear();
            }
        }
    }, [entries]);

    const scrollToBottom = () => {
        if (bottomRef.current && !userScrolledUpRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Track user scroll
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            // If user scrolled up, don't auto-scroll until they return to bottom
            userScrolledUpRef.current = !isNearBottom;
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    // Auto-scroll ONLY when NEW entries are added AND user hasn't scrolled up
    // ★ Disable auto-scroll in compact mode (overlay) to prevent jarring UX
    useEffect(() => {
        if (!userScrolledUpRef.current && !compact) {
            scrollToBottom();
        }

        // ★ FIX: If the LATEST entry is an ACTION (User Input), force complete all previous entries.
        // This prevents the user's action log from being hidden behind a stuck dialogue.
        if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1];
            if (lastEntry.type === 'ACTION') {
                let hasUnfinishedHistory = false;
                for (let i = 0; i < entries.length - 1; i++) {
                    if (!completedEntriesRef.current.has(entries[i].id)) {
                        completedEntriesRef.current.add(entries[i].id);
                        hasUnfinishedHistory = true;
                    }
                }
                if (hasUnfinishedHistory) {
                    console.log("[NarrativeLog] ⏩ Force completed pending history due to User Action.");
                    setForceUpdate(n => n + 1);
                }
            }
        }
    }, [entries.length, isLoading]); // ★ Also scroll when loading state changes

    return (
        <div ref={containerRef} className={clsx(
            "h-full w-full overflow-y-auto scrollbar-hide touch-auto font-body text-foreground",
            compact ? "p-2 space-y-2 text-sm" : "p-4 space-y-6"
        )}>
            <AnimatePresence>
                {(() => {
                    // Logic to find the first incomplete entry
                    let activeId: string | null = null;
                    for (const e of entries) {
                        if (!completedEntriesRef.current.has(e.id)) {
                            activeId = e.id;
                            break;
                        }
                    }

                    // ★ FALLBACK: If all entries are somehow completed but we have entries, activate the last non-SYSTEM one
                    if (!activeId && entries.length > 0) {
                        const lastNonSystem = [...entries].reverse().find(e => e.type !== 'SYSTEM');
                        if (lastNonSystem && entries.length <= 3) { // Only for fresh sessions
                            console.warn(`[NarrativeLog] No active entry found! Forcing last entry active: ${lastNonSystem.id.substring(0, 8)}`);
                            completedEntriesRef.current.delete(lastNonSystem.id);
                            activeId = lastNonSystem.id;
                        }
                    }

                    // Debug log (only when entries change significantly)
                    if (entries.length !== lastLoggedEntriesCount.current) {
                        console.log(`[NarrativeLog] Render: entries=${entries.length}, activeId=${activeId?.substring(0, 8) || 'NONE'}, completed=${completedEntriesRef.current.size}`);
                        lastLoggedEntriesCount.current = entries.length;
                    }

                    return entries.map((entry) => (
                        <LogEntryItem
                            key={entry.id}
                            entry={entry}
                            // ★ FIXED: Only ONE entry is active at a time (the current one being typed)
                            // Completed entries are NOT active - prevents simultaneous audio playback
                            isActive={entry.id === activeId}
                            onComplete={() => {
                                // ★ FIX: Only mark as complete if not already completed
                                if (!completedEntriesRef.current.has(entry.id)) {
                                    completedEntriesRef.current.add(entry.id);
                                    // Use setTimeout to avoid state update during render
                                    setTimeout(() => setForceUpdate(n => n + 1), 0);
                                }
                            }}
                            isForceFinished={completedEntriesRef.current.has(entry.id)} // Pass forced state
                        />
                    ));
                })()}

                {/* ★ Loading Indicator */}
                {isLoading && <LoadingDots key="loading-dots" />}
            </AnimatePresence>
            <div ref={bottomRef} className="h-8" />
        </div>
    );
}

function LogEntryItem({
    entry,
    isActive,
    onComplete,
    onUpdate,
    isForceFinished = false
}: {
    entry: LogEntry;
    isActive: boolean;
    onComplete: () => void;
    onUpdate?: () => void;
    isForceFinished?: boolean;
}) {
    const [audioPlayed, setAudioPlayed] = useState(false);
    const [sfxPlayed, setSfxPlayed] = useState(false);
    // ★ Track if the text has finished typing (for speaker reveal)
    const [textFinished, setTextFinished] = useState(isForceFinished);

    // ★ DEBUG: Log active state on mount and when it changes
    useEffect(() => {
        console.log(`[LogEntryItem] entry=${entry.id.substring(0, 8)}, isActive=${isActive}, isForceFinished=${isForceFinished}, type=${entry.type}`);
    }, [entry.id, isActive, isForceFinished, entry.type]);

    // Refs for safe cleanup
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMounted = useRef(true);

    // Global Error Handler for this component's scope
    useEffect(() => {
        const handleRejection = (event: PromiseRejectionEvent) => {
            // Filter out known harmless errors if needed, or just log
            console.warn("[NarrativeLog] Caught unhandled rejection:", event.reason);
            // Prevent it from crashing the app if possible (though React Error Boundary is better)
            // event.preventDefault(); 
        };
        window.addEventListener('unhandledrejection', handleRejection);
        return () => window.removeEventListener('unhandledrejection', handleRejection);
    }, []);

    // Check if this entry is history (reloaded from storage) to prevent audio replay
    // If entry is significantly older than mount time, it's history.
    const mountTime = useRef(Date.now()).current;
    // 60000ms buffer to account for slow LLM/Audio generation times
    const isHistory = (mountTime - entry.timestamp) > 60000;

    // Cleanup on unmount
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            // Stop Audio
            if (audioRef.current) {
                audioRef.current.pause();
                // Avoid setting src="" synchronously if it causes AbortError in some browsers
                // audioRef.current.src = ""; 
                audioRef.current = null;
            }
            // Clear Timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // ★ Effect: Force Finish logic
    useEffect(() => {
        if (isForceFinished && isActive) {
            // Stop any playing audio immediately
            if (audioRef.current) {
                audioRef.current.pause();
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            // Ensure visual state is finished
            setTextFinished(true);
            onComplete();
        }
    }, [isForceFinished, isActive, onComplete]);

    // Use store action to persist played state
    const { updateLog } = useSessionStore.getState();

    useEffect(() => {
        // Play if not history, has url, AND HAS NOT PLAYED YET (Persistent Check)
        // ★ FIX: Validate audioUrl is a valid data URL before attempting to play
        const isValidAudioUrl = entry.audioUrl && entry.audioUrl.startsWith('data:audio/');
        const alreadyPlayed = entry.hasPlayed || false;

        if (isActive && !isHistory && isValidAudioUrl && !alreadyPlayed && !audioPlayed) {
            console.log(`[NarrativeLog] 🔊 Playing Audio for: [${entry.id}]`);

            try {
                const audio = new Audio(entry.audioUrl);
                audioRef.current = audio; // Keep Ref
                audio.volume = 0.5;

                // ★ Set audioPlayed to true only when it FINISHES or if it fails
                audio.onended = () => {
                    if (!isMounted.current) return;
                    console.log(`[NarrativeLog] ✅ Audio finished for [${entry.id}]`);
                    setAudioPlayed(true);
                    updateLog(entry.id, { hasPlayed: true }); // ★ Persist Played State
                };
                audio.onerror = (e) => {
                    if (!isMounted.current) return;
                    console.error(`[NarrativeLog] ❌ Audio failed for [${entry.id}]`, e);
                    setAudioPlayed(true); // Don't block progression on error
                    updateLog(entry.id, { hasPlayed: true }); // Mark as done to prevent retry loop
                };

                // ★ FIX: Only play if component is still mounted
                if (isMounted.current) {
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => {
                            if (!isMounted.current) return;
                            // ★ FIX: Silence AbortError (expected when component unmounts during play)
                            if (e.name !== 'AbortError') {
                                console.error("[NarrativeLog] Audio play failed", e);
                            }
                            setAudioPlayed(true);
                            // Do NOT mark hasPlayed on AbortError, retry might be needed? 
                            // Actually, Abort usually means user skipped or unmounted, so maybe mark as played to avoid spam?
                            // Let's safe mark it played to prevent double-play spam.
                            updateLog(entry.id, { hasPlayed: true });
                        });
                    }
                }
            } catch (e) {
                console.error("[NarrativeLog] Audio construction failed", e);
                setAudioPlayed(true);
                updateLog(entry.id, { hasPlayed: true });
            }
        } else if (isValidAudioUrl && !audioPlayed && !isActive && !isForceFinished && !alreadyPlayed) {
            // ★ FIX: Late audio - play it even if entry is no longer active!
            console.log(`[NarrativeLog] 🔔 Late Audio arrived for [${entry.id}] - playing anyway!`);
            try {
                const audio = new Audio(entry.audioUrl);
                audioRef.current = audio;
                audio.volume = 0.5;
                audio.onended = () => {
                    setAudioPlayed(true);
                    updateLog(entry.id, { hasPlayed: true });
                };
                audio.onerror = () => {
                    setAudioPlayed(true);
                    updateLog(entry.id, { hasPlayed: true });
                };

                if (isMounted.current) {
                    audio.play().catch(e => {
                        if (e.name !== 'AbortError') {
                            console.error("[NarrativeLog] Late audio play failed", e);
                        }
                        setAudioPlayed(true);
                        updateLog(entry.id, { hasPlayed: true });
                    });
                }
            } catch (e) {
                console.error("[NarrativeLog] Late audio construction failed", e);
                setAudioPlayed(true);
                updateLog(entry.id, { hasPlayed: true });
            }
        }
    }, [isActive, isHistory, entry.audioUrl, audioPlayed, entry.id, isForceFinished, entry.hasPlayed]);

    // SFX State: 'idle' | 'playing' | 'ended' | 'error'
    const [sfxState, setSfxState] = useState<'idle' | 'playing' | 'ended' | 'error'>('idle');
    const sfxPlayedRef = useRef(false); // Track if we've attempted to play SFX for this entry

    // ★ SFX Playback - Trigger immediately when sfxUrl becomes available
    // This handles late-arriving SFX from async AudioDirector
    useEffect(() => {
        // Skip if: no URL, already played, or during history load
        if (!entry.sfxUrl || sfxPlayedRef.current || isHistory) {
            return;
        }

        // Mark as played immediately to prevent duplicate plays
        sfxPlayedRef.current = true;

        console.log(`[NarrativeLog] 🔉 Playing SFX for: [${entry.id}] (Late Arrival: ${!isActive})`);

        try {
            const audio = new Audio(entry.sfxUrl);
            audio.volume = 0.6; // Increased for better audibility

            audio.onplay = () => setSfxState('playing');
            audio.onended = () => setSfxState('ended');
            audio.onerror = (e) => {
                console.error("SFX play failed", e);
                setSfxState('error');
            };

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.error("SFX auto-play blocked/failed", e);
                    setSfxState('error');
                });
            }
        } catch (e) {
            console.error("SFX construction failed", e);
            setSfxState('error');
        }
    }, [entry.sfxUrl, entry.id, isHistory, isActive]); // Trigger on sfxUrl change!

    // ★ Handle text completion
    const handleTextComplete = () => {
        if (!isMounted.current) return;
        setTextFinished(true);

        // If it's a dialogue (has speaker) but no audio yet, wait a bit for generation
        // This handles the "Sequential Audio Failure" where text finishes before audio API returns
        if (entry.type === 'DIALOGUE' && !entry.audioUrl && !audioPlayed) {
            console.log(`[NarrativeLog] Text finished for [${entry.id}], waiting for potential audio...`);
            // Poll for audioUrl update or timeout
            // We just set a timeout here as a failsafe to proceed if audio NEVER comes
            timeoutRef.current = setTimeout(() => {
                if (!isMounted.current) return;
                if (!audioPlayed) { // specific check inside timeout
                    console.log(`[NarrativeLog] Audio timeout for [${entry.id}]. Proceeding.`);
                    onComplete();
                }
            }, 10000); // Wait up to 10s for audio generation (Variable Latency)
            return;
        }

        // If audio exists and hasn't played/finished
        if (entry.audioUrl && !audioPlayed) {
            console.log(`[NarrativeLog] Text finished for [${entry.id}], waiting for audio...`);
            return;
        }

        // Otherwise, proceed
        timeoutRef.current = setTimeout(() => {
            if (isMounted.current) onComplete();
        }, 300);
    };

    // Watch for audio completion OR late arrival of audio
    useEffect(() => {
        if (!isMounted.current) return;
        // If text is done, and audio finally finished (or failed)
        if (textFinished && audioPlayed) {
            console.log(`[NarrativeLog] Both text and audio finished for [${entry.id}]. Proceeding...`);
            onComplete();
        }
        // If text is done, and audio url SUDDENLY appears (late generation)
        else if (textFinished && !audioPlayed && entry.audioUrl) {
            console.log(`[NarrativeLog] Late audio arrived for [${entry.id}]. It should auto-play via the other effect.`);
        }
    }, [textFinished, audioPlayed, onComplete, entry.id, entry.audioUrl]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
                "max-w-[95%] space-y-1",
                entry.type === 'DIALOGUE' ? "ml-4" : "",
                entry.type === 'SYSTEM' ? "text-center mx-auto" : ""
            )}
        >
            {/* Speaker Label - Reveal only when active or history */}
            {entry.speaker && (
                <div className="flex items-center gap-2 mb-1">
                    <span className={clsx(
                        "block heading text-sm uppercase tracking-wider transition-opacity duration-500",
                        // ★ FIX: Show if active, OR history, OR text finished (meaning it was once active)
                        (isActive || isHistory || textFinished) ? "opacity-100" : "opacity-0",
                        entry.speaker === 'Dungeon Master' || entry.speaker === 'System' ? "text-secondary" : "text-primary"
                    )}>
                        {entry.speaker}
                    </span>
                    {/* ★ Visual Indicator for Audio Waiting */}
                    {isActive && textFinished && !audioPlayed && entry.audioUrl && (
                        <span className="text-[10px] text-secondary/70 animate-pulse flex items-center gap-1">
                            <span className="w-1 h-1 bg-current rounded-full" />
                            음성 연기 준비 중... (최대 10초)
                        </span>
                    )}
                    {/* ★ Visual Indicator for Audio Waiting (No URL yet) */}
                    {isActive && textFinished && !audioPlayed && !entry.audioUrl && (
                        <span className="text-[10px] text-secondary/50 animate-pulse flex items-center gap-1">
                            <span className="w-1 h-1 bg-current rounded-full" />
                            음성 생성 대기...
                        </span>
                    )}

                    {/* ★ SFX Indicator */}
                    {entry.sfxUrl && (
                        <span className={clsx(
                            "text-[10px] ml-2 flex items-center gap-1 transition-colors",
                            sfxState === 'playing' ? "text-green-400 animate-pulse" :
                                sfxState === 'error' ? "text-red-500" :
                                    "text-gray-600"
                        )}>
                            {sfxState === 'playing' ? "🔊 SFX 재생 중" :
                                sfxState === 'error' ? "🔇 SFX 오류" :
                                    sfxState === 'ended' ? "🔈 SFX 완료" : ""}
                        </span>
                    )}
                </div>
            )}

            <div className={clsx(
                "leading-relaxed",
                entry.type === 'DIALOGUE' ? "dialogue-text" :
                    entry.type === 'ACTION' ? "narrative-text text-secondary" :
                        entry.type === 'SYSTEM' ? "system-message border border-info/50 bg-black/40 px-3 py-1 rounded inline-block" :
                            "narrative-text"
            )}>
                <TypewriterText
                    text={entry.text}
                    speed={isForceFinished || isHistory ? 0 : (entry.type === 'SYSTEM' ? 0 : 15)}
                    onUpdate={onUpdate}
                    entryId={entry.id}
                    paused={!isActive && !isForceFinished} // Don't pause if forced
                    onComplete={handleTextComplete}
                // If forced, we want immediate completion handled by speed=0 + Effect, check Typewriter impl
                />
            </div>
        </motion.div>
    );
}

// (Removed: module-level completedEntries - now managed per-component instance)

// Helper to parse text into segments (Tag vs Text)
// Regex captures: (<tag>content</tag>)
// We need to parse strictly: <tag>content</tag>
const TAG_REGEX = /<([a-z]+)>(.*?)<\/\1>/g; // Matches <burn>text</burn>

interface TextSegment {
    type: 'text' | 'tag';
    content: string;
    tag?: string;
    fullLength: number;
}

function parseInteractiveText(fullText: string): TextSegment[] {
    const segments: TextSegment[] = [];
    let lastIndex = 0;
    let match;

    // Reset regex state
    TAG_REGEX.lastIndex = 0;

    while ((match = TAG_REGEX.exec(fullText)) !== null) {
        // Text before tag
        if (match.index > lastIndex) {
            const textContent = fullText.substring(lastIndex, match.index);
            segments.push({
                type: 'text',
                content: textContent,
                fullLength: textContent.length
            });
        }

        // The Tag
        const tagName = match[1];
        const innerContent = match[2];
        segments.push({
            type: 'tag',
            tag: tagName,
            content: innerContent,
            fullLength: innerContent.length
        });

        lastIndex = TAG_REGEX.lastIndex;
    }

    // Remaining text
    if (lastIndex < fullText.length) {
        const textContent = fullText.substring(lastIndex);
        segments.push({
            type: 'text',
            content: textContent,
            fullLength: textContent.length
        });
    }

    return segments;
}

// Sub-component for rendering specific FX tags (Reused logic from TextFXRenderer)
function FXSpan({ tag, children }: { tag: string; children: React.ReactNode }) {
    const [interacted, setInteracted] = useState(false);
    const [isHolding, setIsHolding] = useState(false);

    // Dynamic Interactions
    if (tag === 'blur') {
        return (
            <span
                className={`fx-blur ${interacted ? 'revealed' : ''}`}
                onClick={() => setInteracted(!interacted)}
            >
                {children}
            </span>
        );
    }
    if (tag === 'glitch') {
        return (
            <span
                className={`fx-glitch ${isHolding ? 'decoding' : ''}`}
                onMouseDown={() => setIsHolding(true)}
                onMouseUp={() => setIsHolding(false)}
                onMouseLeave={() => setIsHolding(false)}
                onTouchStart={() => setIsHolding(true)}
                onTouchEnd={() => setIsHolding(false)}
            >
                {isHolding ? children : "###"}
            </span>
        );
    }
    if (tag === 'scratch') {
        return (
            <span
                className={`fx-scratch ${interacted ? 'scratched' : ''}`}
                onMouseMove={(e) => { if (e.buttons > 0) setInteracted(true); }}
                onTouchMove={() => setInteracted(true)}
            >
                {children}
            </span>
        );
    }
    if (tag === 'hidden') return <span className="fx-hidden">{children}</span>;
    if (tag === 'type') return <span className="fx-type">{children}</span>;

    // Passive FX
    return <span className={`fx-${tag}`}>{children}</span>;
}


function TypewriterText({ text, speed = 25, onUpdate, entryId, paused = false, onComplete }: { text: string; speed?: number; onUpdate?: () => void; entryId?: string; paused?: boolean; onComplete?: () => void }) {
    // Skip animation if speed is 0 (forced/history mode)
    const shouldSkip = speed === 0;

    const [cursor, setCursor] = useState(shouldSkip ? text.length : 0);
    const [isComplete, setIsComplete] = useState(shouldSkip);

    // Memoize segments so we don't re-parse on every render
    const segments = useRef(parseInteractiveText(text)).current;

    // Calculate total Content Length (excluding tags)
    const totalContentLength = segments.reduce((sum, seg) => sum + seg.fullLength, 0);

    // Auto-scroll helper
    const scrollRef = useRef<HTMLSpanElement>(null);

    // ★ DEBUG: Log initial state - REMOVED for production
    /*
    useEffect(() => {
        console.log(`[TypewriterText] Mount/Update: entryId=${entryId?.substring(0, 8)}, speed=${speed}, paused=${paused}, shouldSkip=${shouldSkip}, cursor=${cursor}`);
    }, [entryId, speed, paused, shouldSkip, cursor]);
    */

    useEffect(() => {
        // console.log(`[TypewriterText] Effect Run: shouldSkip=${shouldSkip}, paused=${paused}`);

        if (shouldSkip) {
            setCursor(totalContentLength);
            setIsComplete(true);
            if (onComplete) {
                setTimeout(() => onComplete(), 0);
            }
            return;
        }

        // ★ FIX: When paused, show full text immediately (no animation, but visible)
        if (paused) {
            // console.log(`[TypewriterText] ⏸️ Paused - showing full text immediately`);
            setCursor(totalContentLength);
            return;
        }

        // console.log(`[TypewriterText] ▶️ Starting interval, speed=${speed}ms`);

        const interval = setInterval(() => {
            setCursor(prev => {
                const next = prev + 1;
                if (next >= totalContentLength) {
                    clearInterval(interval);
                    return totalContentLength;
                }
                if (onUpdate && next % 3 === 0) onUpdate();
                return next;
            });
        }, speed);

        return () => clearInterval(interval);
    }, [speed, shouldSkip, paused, totalContentLength, onUpdate]);

    // Watch cursor to trigger completion
    useEffect(() => {
        if (!isComplete && cursor >= totalContentLength) {
            setIsComplete(true);
            // Note: No longer using module-level completedEntries here
            if (onComplete) {
                // Defer to ensure we are not in a render cycle
                setTimeout(() => onComplete(), 0);
            }
        }
    }, [cursor, totalContentLength, isComplete, onComplete]);

    const handleSkip = () => {
        if (!isComplete && !paused) {
            setCursor(totalContentLength);
            setIsComplete(true);
            // Completion handled by onComplete callback
            if (onComplete) onComplete();
        }
    };

    // Rendering Logic: Map segments to cursor position
    const renderSegments = () => {
        let currentLength = 0;
        return segments.map((seg, idx) => {
            // How much of this segment should be shown?
            const start = currentLength;
            const end = currentLength + seg.fullLength;
            currentLength += seg.fullLength;

            // Strict rendering: 
            // 1. If cursor is past this segment, show full.
            // 2. If cursor is inside, show partial.
            // 3. If cursor is before, show nothing.

            if (cursor < start) return null; // Not reached yet

            const visibleContent = (cursor >= end)
                ? seg.content
                : seg.content.substring(0, cursor - start);

            if (seg.type === 'tag' && seg.tag) {
                return (
                    <FXSpan key={idx} tag={seg.tag}>
                        {visibleContent}
                    </FXSpan>
                );
            }
            return <span key={idx}>{visibleContent}</span>;
        });
    };

    return (
        <span
            ref={scrollRef}
            onClick={handleSkip}
            className={clsx(
                "cursor-pointer break-keep",
                !isComplete && !paused && "after:content-['▋'] after:animate-blink-caret after:ml-0.5 after:text-primary"
            )}
        >
            {renderSegments()}
        </span>
    );
}
