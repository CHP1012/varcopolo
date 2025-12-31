import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorldState } from '@/types/game';
import { generateImageAction } from '@/actions/image';
import clsx from 'clsx';

// Internal Typewriter for Intro with click-to-skip
// ★ SIMPLIFIED: Always show text, animate with interval
function IntroTypewriter({ text, onComplete }: { text: string; onComplete?: () => void }) {
    const [cursor, setCursor] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const onCompleteRef = useRef(onComplete);
    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

    useEffect(() => {
        // Only start if not already complete or if text changed
        console.log(`[IntroTypewriter] Effect Run, text: ${text.substring(0, 10)}...`);

        // If it's already complete and text is the same, don't restart
        if (isComplete && cursor === text.length) return;

        // If text changed, reset
        // (Note: we use a ref for previous text to be precise, but here we just check if it's the same string)

        const speed = 30;
        let idx = cursor; // Continue from current cursor instead of 0 if it's a re-render

        intervalRef.current = setInterval(() => {
            idx++;
            if (idx >= text.length) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setCursor(text.length);
                setIsComplete(true);
                if (onCompleteRef.current) onCompleteRef.current();
            } else {
                setCursor(idx);
            }
        }, speed);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [text]); // Removed onComplete from dependencies

    const handleSkip = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!isComplete) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setCursor(text.length);
            setIsComplete(true);
            if (onCompleteRef.current) onCompleteRef.current();
        }
    };

    // ★ Always render something - at minimum show the visible portion
    const visibleText = text.substring(0, cursor);

    // ★ FALLBACK: If cursor is 0 after mount but text exists, show loading indicator
    if (cursor === 0 && text.length > 0) {
        return (
            <span className="whitespace-pre-wrap break-keep cursor-pointer" onClick={handleSkip}>
                <span className="animate-pulse text-primary/60">{text.charAt(0)}</span>
                <span className="animate-pulse text-primary ml-1">▋</span>
            </span>
        );
    }

    return (
        <span
            className="whitespace-pre-wrap break-keep cursor-pointer relative"
            onClick={(e) => { e.stopPropagation(); handleSkip(); }}
        >
            {visibleText}
            {!isComplete && <span className="animate-pulse text-primary ml-1">▋</span>}
        </span>
    );
}


interface WorldIntroViewProps {
    world: WorldState;
    backgroundImage?: string | null;
    onComplete: () => void;
}

export default function WorldIntroView({ world, backgroundImage, onComplete }: WorldIntroViewProps) {
    // Steps: 0 = Detection, 1 = Narrative (Typewriter), 2 = World Name + Map, 3 = Intro Text
    const [step, setStep] = useState(0);
    const [canProceed, setCanProceed] = useState(false);
    const lastClickRef = useRef(0);
    const [introParagraphIndex, setIntroParagraphIndex] = useState(0);
    const [narrativeComplete, setNarrativeComplete] = useState(false);

    // Split intro text into paragraphs for step-by-step display
    const introText = world.introText?.trim() || world.description || "차원 데이터 수신 중...";
    const introParagraphs = introText.split('\n').filter(p => p.trim().length > 0);
    const displayParagraphs = introParagraphs.length > 0 ? introParagraphs : [introText];

    // Narrative for Step 1 (world description as typewriter)
    const narrativeText = world.description || "알 수 없는 차원...";

    const handleNarrativeComplete = useCallback(() => {
        setNarrativeComplete(true);
    }, []);

    const handleNext = useCallback(() => {
        const now = Date.now();
        if (now - lastClickRef.current < 500) return;
        lastClickRef.current = now;

        // Step 3 - Paragraph navigation
        if (step === 3) {
            console.log(`[Intro] Step 3: index=${introParagraphIndex}, total=${displayParagraphs.length}`);
            if (introParagraphIndex >= displayParagraphs.length - 1) {
                // Last paragraph - complete intro
                onComplete();
            } else {
                // Move to next paragraph
                setIntroParagraphIndex(prev => prev + 1);
            }
            return;
        }

        // Step transitions: 0 -> 1 -> 2 -> 3
        if (step === 0) {
            setStep(1);
        } else if (step === 1) {
            setStep(2);
        } else if (step === 2) {
            setIntroParagraphIndex(0);
            setStep(3);
        }
    }, [step, introParagraphIndex, displayParagraphs.length, onComplete]);

    // Enable proceed after brief delay per step
    useEffect(() => {
        setCanProceed(false);
        const timer = setTimeout(() => {
            setCanProceed(true);
        }, step === 0 ? 1500 : step === 1 ? 500 : 800);
        return () => clearTimeout(timer);
    }, [step, introParagraphIndex]);



    return (
        <div className="absolute inset-0 z-50 bg-black overflow-hidden flex flex-col items-center justify-center font-body" onClick={handleNext}>
            <AnimatePresence mode='wait'>
                {/* Step 0: Detection Message */}
                {step === 0 && (
                    <motion.div
                        key="step0"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center text-center"
                    >
                        <h1 className="heading text-3xl md:text-4xl text-primary animate-pulse mb-4">
                            새로운 차원 감지됨
                        </h1>
                        <p className="text-secondary/60 font-mono text-sm">
                            좌표 분석 중...
                        </p>
                        <ClickPrompt visible={canProceed} text="[ 터치하여 건너뛰기 ]" />
                    </motion.div>
                )}

                {/* Step 1: Narrative Typewriter */}
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center text-center p-8 max-w-3xl"
                    >
                        <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-primary/30 p-6 min-h-[100px] flex items-center justify-center">
                            {narrativeText ? (
                                <p className="whitespace-pre-wrap break-keep text-stone-300 text-lg leading-relaxed">
                                    <IntroTypewriter
                                        text={narrativeText}
                                        onComplete={handleNarrativeComplete}
                                    />
                                </p>
                            ) : (
                                <span className="text-secondary/60 animate-pulse">차원 데이터 로딩 중...</span>
                            )}
                        </div>
                        <ClickPrompt visible={canProceed || narrativeComplete} text="▼ 터치하여 계속" />
                    </motion.div>
                )}

                {/* Step 2: World Name + Map */}
                {step === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center"
                    >
                        {backgroundImage && <img src={backgroundImage} alt="Background" className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale" />}
                        <div className="z-10 text-center p-8 bg-black/80 backdrop-blur-sm border-y-4 border-primary rounded-lg">
                            <h1 className="heading text-5xl md:text-7xl mb-4 text-primary drop-shadow-[0_0_20px_rgba(74,222,128,0.5)] font-bold">{world.name}</h1>
                            <p className="narrative-text text-lg md:text-xl text-stone-300 leading-relaxed max-w-2xl">{world.description}</p>
                        </div>
                        <ClickPrompt visible={canProceed} />
                    </motion.div>
                )}

                {/* Step 3: Intro Text - Paragraph by paragraph */}
                {step === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="z-10 w-full max-w-3xl p-6 flex flex-col items-center gap-6"
                    >
                        {/* World info with intro text - current paragraph */}
                        <div className="w-full p-8 bg-black/90 border-2 border-primary/30 rounded-lg text-center backdrop-blur-md">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={introParagraphIndex}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="narrative-text text-lg md:text-xl text-stone-300 leading-relaxed"
                                >
                                    {displayParagraphs[introParagraphIndex]}
                                </motion.div>
                            </AnimatePresence>

                            {/* Progress indicator */}
                            <div className="flex justify-center gap-1 mt-4">
                                {displayParagraphs.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={clsx(
                                            "w-2 h-2 rounded-full transition-colors",
                                            idx === introParagraphIndex ? "bg-primary" : "bg-secondary/30"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* World details */}
                        <div className="text-center space-y-2">
                            <p className="text-primary font-retro text-lg">{world.name}</p>
                            <p className="text-secondary/60 text-xs">위협 수준: {'⚠️'.repeat(world.threatLevel || 1)}</p>
                        </div>

                        <ClickPrompt
                            visible={canProceed}
                            text={introParagraphIndex < displayParagraphs.length - 1 ? "▼ 다음" : "▼ 터치하여 진입"}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ClickPrompt({ visible, text = "▼ 화면을 터치하여 진행" }: { visible: boolean, text?: string }) {
    if (!visible) return null;
    return (
        <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20 pointer-events-none">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-black/60 backdrop-blur-sm px-6 py-2 rounded-full border border-primary/30"
            >
                <span className="system-message text-primary animate-[pulse_1s_ease-in-out_infinite] font-bold text-sm tracking-widest">
                    {text}
                </span>
            </motion.div>
        </div>
    );
}

