'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useMetaStore } from '@/store/useMetaStore';
import { generateWorldAction, extractWorldRuleset, generateImageGuidelines, generateNPCGuidelines } from '@/actions/world';
import { generateNewThemes, DynamicTheme } from '@/actions/themes';
import { useSessionStore } from '@/store/useSessionStore';
import GlitchText from '@/components/ui/GlitchText';
import dynamic from 'next/dynamic';
import { BookOpen } from 'lucide-react'; // Add Icon Import
import VoyageLogView from '@/components/templates/VoyageLogView'; // Add Component Import

const TTSTestView = dynamic(() => import('./TTSTestView'), { ssr: false });
const ImageTestView = dynamic(() => import('./ImageTestView'), { ssr: false });
const SFXTestView = dynamic(() => import('./SFXTestView'), { ssr: false });

// --- Custom Geometric Icons ---

const IconThemeNode = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <circle cx="12" cy="6" r="2" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
        <path d="M12 8L6 16M12 8L18 16M8 18H16" opacity="0.5" />
    </svg>
);

const IconRandomChaos = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <circle cx="12" cy="12" r="8" strokeDasharray="4 4" opacity="0.5" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 4V6M12 18V20M4 12H6M18 12H20" />
        <circle cx="16" cy="8" r="1" fill="currentColor" />
        <circle cx="8" cy="16" r="1" fill="currentColor" />
    </svg>
);

const IconCustomHex = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" />
        <path d="M12 6V18" opacity="0.3" />
        <path d="M3 7L21 17" opacity="0.3" />
        <path d="M21 7L3 17" opacity="0.3" />
    </svg>
);

const IconMainPortal = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className={className}>
        <circle cx="12" cy="12" r="6" />
        <path d="M12 2V6" strokeWidth="2" />
        <path d="M12 18V22" strokeWidth="2" />
        <path d="M2 12H6" strokeWidth="2" />
        <path d="M18 12H22" strokeWidth="2" />
        <circle cx="12" cy="12" r="10" strokeDasharray="2 4" opacity="0.5" />
    </svg>
);

type GateMode = 'THEME' | 'RANDOM' | 'CUSTOM';
type Phase = 'title' | 'booting' | 'idle' | 'transition' | 'intro' | 'loading';

// Specific worldbuildings/settings instead of generic genres
const THEMES = [
    'CYBERPUNK', 'HIGH_FANTASY', 'MURIM', 'NOIR', 'STEAMPUNK',
    'POST_APOCALYPSE', 'CTHULHU', 'SPACE_OPERA', 'WEIRD_WEST', 'ALT_HISTORY'
];

// Theme display names, hints, and descriptions
const THEME_INFO: Record<string, { name: string; hint: string; desc: string }> = {
    'CYBERPUNK': {
        name: '네온 디스토피아',
        hint: '예: AI 반란, 메가코프 지배 도시',
        desc: '거대 기업이 통치하는 네온빛 미래. 사이버네틱 임플란트, 해커, 인공지능이 뒤섞인 어두운 도시에서 벌어지는 이야기.'
    },
    'HIGH_FANTASY': {
        name: '검과 마법',
        hint: '예: 용의 귀환, 잊혀진 왕국',
        desc: '엘프와 드래곤이 존재하는 마법의 세계. 고대의 예언, 전설의 무기, 그리고 왕국의 운명을 건 모험이 펼쳐진다.'
    },
    'MURIM': {
        name: '강호풍운',
        hint: '예: 마교의 부활, 천하제일대회',
        desc: '무공과 협객이 지배하는 강호. 문파간 암투, 절대고수의 등장, 그리고 무림맹과 마교의 대결.'
    },
    'NOIR': {
        name: '그림자 도시',
        hint: '예: 금주법 시대 시카고, 타락한 형사',
        desc: '비 내리는 어둑한 도시. 부패한 경찰, 치명적인 팜므파탈, 그리고 해결되지 않은 사건들이 기다리는 곳.'
    },
    'STEAMPUNK': {
        name: '증기와 톱니바퀴',
        hint: '예: 하늘 해적단, 기계 혁명',
        desc: '증기기관과 태엽장치가 동력원인 빅토리아풍 세계. 비행선, 기계 의수, 그리고 발명가들의 시대.'
    },
    'POST_APOCALYPSE': {
        name: '종말 이후',
        hint: '예: 핵전쟁 폐허, 최후의 생존자',
        desc: '문명이 멸망한 이후의 황폐한 세계. 자원을 두고 벌이는 생존 경쟁, 돌연변이, 그리고 잃어버린 기술.'
    },
    'CTHULHU': {
        name: '우주적 공포',
        hint: '예: 광기의 산맥, 인스머스의 그림자',
        desc: '인간의 이해를 초월하는 존재들. 금지된 지식, 광기로 이끄는 진실, 그리고 크툴루 신화의 공포.'
    },
    'SPACE_OPERA': {
        name: '은하 서사시',
        hint: '예: 제국과 저항군, 행성간 전쟁',
        desc: '은하계를 무대로 한 장대한 우주 모험. 외계 종족, 거대 함대, 그리고 별들 사이의 정치적 음모.'
    },
    'WEIRD_WEST': {
        name: '기이한 서부',
        hint: '예: 좀비 카우보이, 악마와의 계약',
        desc: '초자연적 요소가 가미된 서부극. 언데드 무법자, 마법을 쓰는 원주민 주술사, 그리고 악마의 거래.'
    },
    'ALT_HISTORY': {
        name: '대체 역사',
        hint: '예: 조선 스팀펑크, 삼국지 현대전',
        desc: '역사의 분기점이 달라진 세계. "만약 ~였다면?"이라는 질문에서 시작되는 새로운 역사의 이야기.'
    },
};

interface DimensionGateProps {
    onEnter: () => void;
}

const Typewriter = ({ text, delay = 0 }: { text: string; delay?: number }) => {
    const [displayText, setDisplayText] = useState("");

    useEffect(() => {
        const timeout = setTimeout(() => {
            let i = 0;
            const interval = setInterval(() => {
                setDisplayText(text.substring(0, i + 1));
                i++;
                if (i === text.length) clearInterval(interval);
            }, 30);
            return () => clearInterval(interval);
        }, delay);
        return () => clearInterval(timeout);
    }, [text, delay]);

    return <span>{displayText}</span>;
};

const RevealText = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
    const [display, setDisplay] = useState(text);
    // Use a ref to track if 'text' prop has changed to reset animation
    const textRef = useRef(text);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

    useEffect(() => {
        let iteration = 0;
        let interval: NodeJS.Timeout;

        // Reset if text changes
        if (textRef.current !== text) {
            textRef.current = text;
            iteration = 0;
        }

        interval = setInterval(() => {
            setDisplay(
                text
                    .split("")
                    .map((char, index) => {
                        if (index < iteration) {
                            return text[index];
                        }
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join("")
            );

            if (iteration >= text.length) {
                clearInterval(interval);
                if (onComplete) onComplete();
            }

            iteration += 1 / 2; // Speed of reveal
        }, 30);

        return () => clearInterval(interval);
    }, [text, onComplete]);

    return <span>{display}</span>;
};

export default function DimensionGate({ onEnter }: DimensionGateProps) {
    const { dimensionShards, registerVisit } = useMetaStore();
    const { setWorld, setWorldRuleset, setWorldGuidelines, currentWorld, resetSession, settings } = useSessionStore();

    const [mode, setMode] = useState<GateMode>('THEME');
    const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
    const [themeDetail, setThemeDetail] = useState("");
    const [customTheme, setCustomTheme] = useState(""); // For CUSTOM mode
    const [phase, setPhase] = useState<Phase>('title'); // Start with title screen
    const [statusText, setStatusText] = useState("시스템 대기 중...");
    const [showVoyageLog, setShowVoyageLog] = useState(false); // Voyage Log State

    // DEV MODE
    const [showDevTTS, setShowDevTTS] = useState(false);
    const [showDevImage, setShowDevImage] = useState(false);
    const [showDevSFX, setShowDevSFX] = useState(false);

    const [bootStep, setBootStep] = useState(0);
    const [ringRotation, setRingRotation] = useState(0); // For slow rotation
    const [isSpinning, setIsSpinning] = useState(false); // For roulette animation
    const [isStarting, setIsStarting] = useState(false); // Title screen transition

    // ★ Dynamic Theme Regeneration States
    const [dynamicThemes, setDynamicThemes] = useState<DynamicTheme[] | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);

    // Launch Screen Sequence
    // 0: Black/Humming, 1: Init/Logs, 2: Ignition/Title, 3: Ready/Button
    const [launchSequence, setLaunchSequence] = useState(0);

    useEffect(() => {
        if (phase !== 'title') return;

        // Sequence Timers
        const t1 = setTimeout(() => setLaunchSequence(1), 1200); // Start Init
        const t2 = setTimeout(() => setLaunchSequence(2), 4000); // Ignition (Slow Fade In)
        const t3 = setTimeout(() => setLaunchSequence(3), 6500); // Ready (Button Appear)

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [phase]);

    const [pressProgress, setPressProgress] = useState(0);
    const pressInterval = useRef<NodeJS.Timeout | null>(null);

    const handlePressStart = () => {
        if (isStarting) return;

        // Reset progress
        setPressProgress(0);

        pressInterval.current = setInterval(() => {
            setPressProgress(prev => {
                if (prev >= 100) {
                    if (pressInterval.current) clearInterval(pressInterval.current);
                    handleStart(); // Trigger start
                    return 100;
                }
                return prev + 2; // ~1000ms duration (20ms * 50)
            });
        }, 20);
    };

    const handlePressEnd = () => {
        if (pressInterval.current) {
            clearInterval(pressInterval.current);
            pressInterval.current = null;
        }
        setPressProgress(0);
    };

    const handleStart = () => {
        if (isStarting) return;
        setIsStarting(true);

        // Click Sound / Haptic
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(200);

        // Transition delay
        setTimeout(() => {
            setPhase('booting');
            setIsStarting(false);
            setPressProgress(0);
        }, 1000);
    };

    // Intro Overlay State
    const [introLines, setIntroLines] = useState<string[]>([]);
    const [currentIntroLine, setCurrentIntroLine] = useState(0);
    const [isWorldReady, setIsWorldReady] = useState(false);
    const generationPromiseRef = useRef<Promise<void> | null>(null);

    // Boot sequence animation
    useEffect(() => {
        if (phase === 'booting') {
            const bootSequence = [
                { step: 1, delay: 300 },
                { step: 2, delay: 600 },
                { step: 3, delay: 900 },
                { step: 4, delay: 1200 },
                { step: 5, delay: 1500 },
            ];

            bootSequence.forEach(({ step, delay }) => {
                setTimeout(() => setBootStep(step), delay);
            });

            // Complete boot
            setTimeout(() => {
                setPhase('idle');
                setStatusText("AWAITING INPUT");
            }, 2000);
        }
    }, [phase]);

    // Intro line progression
    useEffect(() => {
        if (phase === 'intro' && currentIntroLine < introLines.length) {
            const timer = setTimeout(() => {
                setCurrentIntroLine(prev => prev + 1);
            }, 2500); // 2.5 seconds per line
            return () => clearTimeout(timer);
        }
    }, [phase, currentIntroLine, introLines.length]);

    // Check if world is ready - auto enter from intro or loading phase
    useEffect(() => {
        if (isWorldReady && (phase === 'intro' || phase === 'loading')) {
            // Small delay then enter
            const timer = setTimeout(() => {
                onEnter();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isWorldReady, phase, onEnter]);

    const handleSkipIntro = () => {
        if (phase === 'intro') {
            if (isWorldReady) {
                onEnter();
            } else {
                setPhase('loading');
                setStatusText("차원 좌표로 이동 중...");
            }
        }
    };

    const handleEngage = async () => {
        // For THEME mode, require a theme to be selected
        if (mode === 'THEME' && !selectedTheme) {
            setStatusText("테마를 선택해주세요!");
            return;
        }

        // DEV TOOL TRAP
        if (mode === 'CUSTOM' && customTheme.trim() === 'dev:tts') {
            setShowDevTTS(true);
            return;
        }
        if (mode === 'CUSTOM' && customTheme.trim() === 'dev:image') {
            setShowDevImage(true);
            return;
        }
        if (mode === 'CUSTOM' && customTheme.trim() === 'dev:sfx') {
            setShowDevSFX(true);
            return;
        }

        // ★ System Setting Commands
        if (mode === 'CUSTOM' && (customTheme.trim() === 'sys:sfx on' || customTheme.trim() === 'sys:sfx off')) {
            const isEnable = customTheme.includes('on');
            useSessionStore.getState().updateSettings({ sfxEnabled: isEnable });
            setStatusText(isEnable ? "🔊 SFX 활성화됨" : "🔇 SFX 비활성화됨");
            setCustomTheme(""); // Clear input
            return;
        }

        // For CUSTOM mode, require custom theme input
        if (mode === 'CUSTOM' && !customTheme.trim()) {
            setStatusText("원하는 세계관을 입력해주세요!");
            return;
        }

        // Phase 1: Transition
        setPhase('transition');
        setStatusText("차원 연결 중...");

        // Determine target theme based on mode
        let targetTheme = selectedTheme || THEMES[0];
        let fullThemeDescription = '';

        if (mode === 'CUSTOM') {
            // Use custom theme directly
            targetTheme = 'CUSTOM';
            fullThemeDescription = customTheme.trim();
            await new Promise(r => setTimeout(r, 800));
        } else if (mode === 'RANDOM') {
            // RANDOM mode: Spin the roulette!
            setIsSpinning(true);
            setStatusText("차원 탐색 중...");

            // Animate through random themes during spin
            const spinDuration = 2000;
            const interval = 100;
            let elapsed = 0;
            const spinInterval = setInterval(() => {
                elapsed += interval;
                const randomIdx = Math.floor(Math.random() * THEMES.length);
                setSelectedTheme(THEMES[randomIdx]);

                if (elapsed >= spinDuration) {
                    clearInterval(spinInterval);
                }
            }, interval);

            await new Promise(r => setTimeout(r, spinDuration));

            // Final selection
            targetTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
            setSelectedTheme(targetTheme);
            setIsSpinning(false);

            await new Promise(r => setTimeout(r, 500)); // Pause to show result

            fullThemeDescription = targetTheme;
        } else {
            // THEME mode
            // 연출 시간 확보: 3초 강제 대기
            setStatusText("좌표 고정 중...");
            await new Promise(r => setTimeout(r, 1500));

            setStatusText("차원 주파수 동기화...");
            await new Promise(r => setTimeout(r, 1500));

            fullThemeDescription = themeDetail.trim()
                ? `${targetTheme}: ${themeDetail.trim()}`
                : targetTheme;
        }

        // Start intro with placeholder text
        const introPlaceholder = getIntroPlaceholder(mode, targetTheme, themeDetail);
        setIntroLines(introPlaceholder);
        setCurrentIntroLine(0);
        setIsWorldReady(false);
        setPhase('intro');

        resetSession();

        // Start generation in background
        generationPromiseRef.current = generateWorldWithDWRS(fullThemeDescription);
    };

    const getIntroPlaceholder = (mode: GateMode, theme: string, detail: string): string[] => {
        const themeKorean = THEME_INFO[theme]?.name || theme;
        if (detail.trim()) {
            return [
                "차원 좌표 커스터마이징 중...",
                `기본 테마: ${themeKorean}`,
                `세부 설정: ${detail.slice(0, 20)}${detail.length > 20 ? '...' : ''}`,
                "진입 경로 계산 중..."
            ];
        }
        return [
            "새로운 차원 감지됨",
            `차원 유형: ${themeKorean}`,
            "세계 법칙 분석 중...",
            "차원 게이트 동기화..."
        ];
    };

    const generateWorldWithDWRS = async (targetTheme: string) => {
        try {
            setStatusText("세계 규칙 추출 중...");

            // 1. Generate world (basic)
            const worldData = await generateWorldAction(targetTheme);
            if (!worldData) throw new Error("World generation failed");

            // Update intro lines with actual world data
            if (worldData.introText) {
                const lines = worldData.introText.split('\n').filter(l => l.trim());
                if (lines.length > 0) setIntroLines(lines);
            }

            // 2. Extract world ruleset (DWRS Step 1)
            setStatusText("세계 규칙 분석 중...");
            const ruleset = await extractWorldRuleset(worldData.description || targetTheme);
            if (ruleset) {
                setWorldRuleset(ruleset);

                // 3. Generate guidelines (DWRS Step 2)
                setStatusText("가이드라인 생성 중...");
                const imageGuidelines = await generateImageGuidelines(ruleset);
                const npcGuidelines = await generateNPCGuidelines(ruleset);

                if (imageGuidelines || npcGuidelines) {
                    setWorldGuidelines({
                        world_name: ruleset.world_name,
                        image_generation: imageGuidelines!,
                        npc_generation: npcGuidelines!,
                        culture_generation: {} as any,
                        location_generation: {} as any
                    });
                }
            }

            setWorld(worldData);
            registerVisit(targetTheme);
            setIsWorldReady(true);
            setStatusText("차원 진입 준비 완료");

        } catch (e) {
            console.error('[DWRS] Generation failed:', e);
            setStatusText("오류: 차원 생성 실패");
            setPhase('idle');
        }
    };

    const handleContinue = () => {
        if (currentWorld) onEnter();
    };

    // ★ Theme Regeneration Handler - AI 기반 새 테마 생성 + 애니메이션
    const handleRegenerateThemes = async () => {
        if (isRegenerating) return;

        setIsRegenerating(true);
        setIsSpinning(true); // 분해 애니메이션 시작
        setStatusText("차원 좌표 재계산 중...");
        setSelectedTheme(null);

        try {
            // 1. 스핀 애니메이션 동안 AI 호출
            const newThemes = await generateNewThemes();

            // 2. 잠시 대기 (애니메이션 완료)
            await new Promise(r => setTimeout(r, 800));

            // 3. 새 테마 설정 (재구성 애니메이션)
            setDynamicThemes(newThemes);
            setIsSpinning(false);
            setStatusText("새 좌표 확정됨");

            // 4. 상태 리셋
            setTimeout(() => setStatusText("AWAITING INPUT"), 1500);

        } catch (error) {
            console.error('[Regenerate] Error:', error);
            setStatusText("좌표 재생성 실패");
            setIsSpinning(false);
        } finally {
            setIsRegenerating(false);
        }
    };

    const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });

    const mouseRaf = useRef<number | null>(null);
    const handleMouseMove = (e: React.MouseEvent) => {
        if (mouseRaf.current) return;
        mouseRaf.current = requestAnimationFrame(() => {
            setMouseCoords({ x: e.clientX, y: e.clientY });
            mouseRaf.current = null;
        });
    };

    return (
        <div
            className="flex flex-col items-center w-full h-[100dvh] bg-background text-foreground relative font-mono overflow-y-auto overflow-x-hidden cursor-crosshair"
            onMouseMove={handleMouseMove}
        >
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(20,20,20,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,0.5)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />

            {/* TITLE SCREEN (THE COLD MACHINE) */}
            <AnimatePresence>
                {phase === 'title' && (
                    <motion.div
                        className="absolute inset-0 z-50 bg-[#050505] flex flex-col justify-between p-8 md:p-12 overflow-hidden cursor-crosshair font-mono select-none"
                        onClick={handleStart}
                    >
                        {/* Pixel Sort / Glitch Transition Layer */}
                        {isStarting && (
                            <motion.div
                                className="absolute inset-0 bg-amber-500/10 z-50 pointer-events-none mix-blend-overlay"
                                initial={{ opacity: 0, scaleY: 1 }}
                                animate={{
                                    opacity: [0, 1, 0, 1, 0],
                                    scaleY: [1, 50, 1, 100, 1],
                                    filter: ["blur(0px)", "blur(10px)", "blur(0px)"]
                                }}
                                transition={{ duration: 0.8, times: [0, 0.2, 0.4, 0.8, 1] }}
                            />
                        )}

                        {/* Content Container - Distorts on exit */}
                        <motion.div
                            className="w-full h-full flex flex-col justify-between"
                            animate={isStarting ? {
                                scale: [1, 1.5, 3],
                                opacity: [1, 0.8, 0],
                                filter: ["blur(0px)", "blur(5px)", "blur(30px)"]
                            } : {}}
                            transition={{ duration: 1, ease: "easeIn" }}
                        >
                            {/* Title Screen Layout: Flexbox ordered */}
                            {/* Top Bar Info - Moved to Top of Flex Stack */}
                            <div className="flex justify-between items-start border-t border-primary/20 pt-4 opacity-70 shrink-0">
                                <span className="text-[10px] tracking-widest text-primary/60">v.0.9.2</span>
                                <div className="text-right">
                                    <span className="text-[10px] tracking-widest text-primary/60 block">SYS.READY</span>
                                    {/* System Status Indicators */}
                                    <div className="flex gap-2 justify-end mt-1 text-[8px] tracking-wider opacity-80">
                                        <span className={settings.sfxEnabled ? "text-green-400" : "text-red-400"}>
                                            SFX:{settings.sfxEnabled ? "ON" : "OFF"}
                                        </span>
                                        <span className={settings.bgmEnabled ? "text-green-400" : "text-red-400"}>
                                            BGM:{settings.bgmEnabled ? "ON" : "OFF"}
                                        </span>
                                    </div>
                                    {/* Live Coords on Title Screen */}
                                    <span className="text-[8px] tracking-wider text-primary/80 block mt-1">
                                        XY: [{mouseCoords.x}, {mouseCoords.y}]
                                    </span>
                                </div>
                            </div>

                            {/* Center Content: Title + Geometry (Combined in Flex-1) */}
                            <div className="flex-1 flex flex-col items-center justify-center relative w-full my-4">

                                {/* Absolute Geometry Background */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                                    <div className="relative w-[70vw] h-[70vw] md:w-[500px] md:h-[500px]">
                                        {/* Slow Spinning Thin Ring */}
                                        <motion.div
                                            className="absolute inset-0 border border-dashed border-white/10 rounded-full"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                                        />
                                        {/* Counter-Spinning Inner Ring */}
                                        <motion.div
                                            className="absolute inset-10 md:inset-20 border border-white/10 rounded-full"
                                            animate={{ rotate: -360 }}
                                            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                        />
                                    </div>
                                </div>

                                {/* Title Text */}
                                <div className="flex flex-col items-center justify-center z-20 pointer-events-none">
                                    <h1 className="text-3xl md:text-6xl font-bold tracking-[0.2em] text-white uppercase font-sans whitespace-nowrap text-center" style={{ fontFamily: 'var(--font-rajdhani)' }}>
                                        DIMENSION : GATE
                                    </h1>
                                    <span className="text-[10px] md:text-xs text-primary/80 tracking-[0.8em] font-mono mt-4">
                                        QUANTUM DIVER SYSTEM
                                    </span>
                                </div>

                            </div>

                            {/* Footer: Prompt */}
                            <div className="flex justify-center items-end pb-8 shrink-0">
                                <motion.div
                                    animate={{ opacity: [0, 1, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="text-[10px] md:text-xs text-primary/60 tracking-[0.3em] font-mono lowercase"
                                >
                                    _waiting for neural link...
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* INTRO PHASE - Dramatic text overlay during generation */}
            {
                phase === 'intro' && (
                    <div
                        className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center cursor-pointer"
                        onClick={handleSkipIntro}
                    >
                        <AnimatePresence mode="wait">
                            {currentIntroLine < introLines.length && (
                                <motion.p
                                    key={currentIntroLine}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.8 }}
                                    className="text-primary text-lg md:text-2xl font-retro text-center px-8 max-w-2xl"
                                >
                                    {introLines[currentIntroLine]}
                                </motion.p>
                            )}
                        </AnimatePresence>

                        {/* TAP TO SKIP Hint - Centered at bottom */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute bottom-20 bg-black/50 px-6 py-2 rounded-full border border-white/10 backdrop-blur-sm pointer-events-none"
                        >
                            <p className="text-secondary/60 text-[10px] font-mono tracking-[0.3em] uppercase">
                                [ 터치하여 건너뛰기 ]
                            </p>
                        </motion.div>

                        {/* Status text - Moved to top-right to be unobtrusive */}
                        <div className="absolute top-8 right-8 text-secondary/40 text-[10px] font-mono border-l border-secondary/20 pl-4 py-1">
                            {statusText}
                        </div>
                    </div>
                )
            }

            {/* TRANSITION PHASE - Immersive Dimension Warp Animation */}
            {
                phase === 'transition' && (
                    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
                        {/* Warp tunnel effect - radial lines */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {Array.from({ length: 24 }, (_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-[2px] h-[150%] bg-gradient-to-b from-transparent via-primary/30 to-transparent"
                                    style={{
                                        rotate: `${(360 / 24) * i}deg`,
                                        transformOrigin: 'center center'
                                    }}
                                    animate={{
                                        scaleY: [0.3, 1, 0.3],
                                        opacity: [0.2, 0.8, 0.2]
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        delay: i * 0.05,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                />
                            ))}
                        </div>

                        {/* Central portal ring */}
                        <motion.div
                            className="relative w-48 h-48 md:w-64 md:h-64"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                            <div className="absolute inset-0 border-4 border-primary/50 rounded-full" />
                            <div className="absolute inset-4 border-2 border-secondary/30 rounded-full" />
                            <motion.div
                                className="absolute inset-8 border-2 border-primary rounded-full"
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            />
                        </motion.div>

                        {/* Coordinate lock-on display */}
                        <motion.div
                            className="absolute z-10 text-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <motion.p
                                className="text-primary text-sm md:text-lg font-mono tracking-[0.3em] mb-2"
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                            >
                                좌표 고정 중
                            </motion.p>
                            <motion.p
                                className="text-secondary/60 text-xs font-mono"
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                            >
                                DIM-{Math.floor(Math.random() * 9000 + 1000)}.{Math.floor(Math.random() * 90 + 10)}
                            </motion.p>
                        </motion.div>

                        {/* Energy surge lines from edges */}
                        <div className="absolute inset-0 pointer-events-none">
                            <motion.div
                                className="absolute top-0 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-primary to-transparent"
                                animate={{ height: ['0%', '50%', '0%'] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                            />
                            <motion.div
                                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-t from-primary to-transparent"
                                animate={{ height: ['0%', '50%', '0%'] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.25 }}
                            />
                            <motion.div
                                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-primary to-transparent"
                                animate={{ width: ['0%', '50%', '0%'] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
                            />
                            <motion.div
                                className="absolute right-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-l from-primary to-transparent"
                                animate={{ width: ['0%', '50%', '0%'] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.75 }}
                            />
                        </div>

                        {/* Status text */}
                        <motion.p
                            className="absolute bottom-16 text-primary/80 text-sm font-retro"
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            {statusText}
                        </motion.p>

                        {/* Particle effect dots */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {Array.from({ length: 20 }, (_, i) => (
                                <motion.div
                                    key={`particle-${i}`}
                                    className="absolute w-1 h-1 bg-primary/60 rounded-full"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: `${Math.random() * 100}%`
                                    }}
                                    animate={{
                                        x: [0, (Math.random() - 0.5) * 200],
                                        y: [0, (Math.random() - 0.5) * 200],
                                        opacity: [0, 1, 0],
                                        scale: [0, 1.5, 0]
                                    }}
                                    transition={{
                                        duration: 2 + Math.random() * 2,
                                        repeat: Infinity,
                                        delay: Math.random() * 2
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )
            }

            {/* LOADING PHASE - Enhanced with DWRS UX */}
            {
                phase === 'loading' && (
                    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center gap-8 overflow-hidden">

                        {/* Background Noise / Glitch Overlay */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-80 pointer-events-none"></div>

                        {/* Scattered Data Matrix - Top Left */}
                        <div className="absolute top-4 left-4 w-64 h-32 overflow-hidden opacity-40">
                            <div className="font-mono text-[10px] text-green-500/70 animate-pulse whitespace-pre leading-tight">
                                {Array.from({ length: 15 }, (_, i) =>
                                    `> MEM_ALLOC: 0x${Math.random().toString(16).slice(2, 6).toUpperCase()} :: SYNC`
                                ).join('\n')}
                            </div>
                        </div>

                        {/* Scattered Data Matrix - Bottom Right */}
                        <div className="absolute bottom-4 right-4 w-64 h-32 overflow-hidden opacity-40 text-right">
                            <div className="font-mono text-[10px] text-red-500/70 animate-pulse whitespace-pre leading-tight">
                                {Array.from({ length: 15 }, (_, i) =>
                                    `ERR_CORRECTION :: 0x${Math.random().toString(16).slice(2, 8)} <`
                                ).join('\n')}
                            </div>
                        </div>

                        {/* Scattered Data Matrix - Random Background */}
                        <div className="absolute top-1/3 left-10 w-48 opacity-20 blur-[1px]">
                            <div className="font-mono text-[8px] text-primary whitespace-pre leading-tight animate-bounce">
                                {`// SYSTEM_KERNEL_PANIC\n// REBOOT_SEQUENCE_INIT\n// OVERRIDE_DEFAULT`}
                            </div>
                        </div>

                        <div className="absolute bottom-1/3 right-10 w-48 opacity-20 blur-[1px]">
                            <div className="font-mono text-[8px] text-secondary whitespace-pre leading-tight animate-pulse">
                                {`// WORLD_CONSTRUCT\n// GEOMETRY_BUILD\n// MESH_OPTIMIZE`}
                            </div>
                        </div>

                        {/* Central Loading Indicator with Glitch */}
                        <div className="relative z-10 scale-150">
                            <div className="w-24 h-24 border-4 border-primary/20 rounded-full flex items-center justify-center animate-[spin_3s_linear_infinite]">
                                <div className="absolute inset-0 border-t-4 border-primary rounded-full animate-[spin_1s_linear_infinite]"></div>
                            </div>
                            {/* Glitchy offset circle */}
                            <div className="absolute inset-0 w-24 h-24 border-2 border-red-500/30 rounded-full animate-ping opacity-50"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full animate-ping"></div>
                        </div>

                        {/* Status Text with Glitch/Blur */}
                        <div className="relative z-10 flex flex-col items-center gap-2">
                            <div className="text-2xl text-primary font-retro tracking-widest blur-[0.5px] h-8 flex items-center">
                                <RevealText text={statusText} />
                            </div>
                            <p className="text-xs text-primary/50 font-mono animate-pulse">
                                {`> PROCESSING_WORLD_LOGIC_LAYER...`}
                            </p>
                            <div className="flex gap-1 mt-2">
                                <div className="w-1 h-6 bg-primary/70 animate-[pulse_0.5s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
                                <div className="w-1 h-6 bg-primary/70 animate-[pulse_0.5s_ease-in-out_infinite]" style={{ animationDelay: '100ms' }} />
                                <div className="w-1 h-6 bg-primary/70 animate-[pulse_0.5s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }} />
                                <div className="w-1 h-6 bg-primary/70 animate-[pulse_0.5s_ease-in-out_infinite]" style={{ animationDelay: '300ms' }} />
                                <div className="w-1 h-6 bg-primary/70 animate-[pulse_0.5s_ease-in-out_infinite]" style={{ animationDelay: '400ms' }} />
                            </div>
                        </div>
                    </div>
                )
            }

            {/* IDLE/BOOTING PHASE - Main UI with boot animations */}
            {
                (phase === 'idle' || phase === 'booting') && (
                    <>
                        {/* Header - Device Title Bar */}
                        <motion.header
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: bootStep >= 1 ? 1 : 0, y: bootStep >= 1 ? 0 : -20 }}
                            transition={{ duration: 0.5 }}
                            className="flex justify-between w-full max-w-5xl border-b-2 border-primary/30 pb-4 z-10 bg-background/80 backdrop-blur"
                        >
                            <div className="flex items-center gap-3">
                                <div className={clsx("w-3 h-3 rounded-full transition-colors", bootStep >= 5 ? "bg-green-500 animate-pulse" : "bg-secondary/50")} />
                                <h1 className="text-xl md:text-3xl font-retro text-primary tracking-widest">
                                    차원 이동기
                                </h1>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-secondary/60 font-mono">
                                {/* Voyage Log Button */}
                                <button
                                    onClick={() => setShowVoyageLog(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-secondary/30 rounded hover:border-primary hover:text-primary transition-colors hover:bg-primary/10"
                                >
                                    <BookOpen size={14} />
                                    <span>항해 일지</span>
                                </button>
                                <span>v2.1</span>
                            </div>
                        </motion.header>

                        {/* Voyage Log Overlay */}
                        <AnimatePresence>
                            {showVoyageLog && (
                                <VoyageLogView onClose={() => setShowVoyageLog(false)} />
                            )}
                        </AnimatePresence>

                        {/* Device Frame Corners - Premium HUD Style - GOLD THEME */}
                        <div className="absolute inset-8 pointer-events-none z-0">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: bootStep >= 1 ? 1 : 0, scale: 1 }}
                                transition={{ duration: 1 }}
                                className="w-full h-full relative"
                            >
                                {/* Top Left */}
                                <div className="absolute top-0 left-0 w-8 h-8 md:w-16 md:h-16 border-l-2 border-t-2 border-primary/50 rounded-tl-lg" />
                                <div className="absolute top-0 left-8 md:left-16 w-4 h-[2px] bg-primary/50" />
                                <div className="absolute top-8 md:top-16 left-0 w-[2px] h-4 bg-primary/50" />

                                {/* Top Right */}
                                <div className="absolute top-0 right-0 w-8 h-8 md:w-16 md:h-16 border-r-2 border-t-2 border-primary/50 rounded-tr-lg" />
                                <div className="absolute top-0 right-8 md:right-16 w-4 h-[2px] bg-primary/50" />
                                <div className="absolute top-8 md:top-16 right-0 w-[2px] h-4 bg-primary/50" />

                                {/* Bottom Left */}
                                <div className="absolute bottom-0 left-0 w-8 h-8 md:w-16 md:h-16 border-l-2 border-b-2 border-primary/50 rounded-bl-lg" />
                                <div className="absolute bottom-0 left-8 md:left-16 w-4 h-[2px] bg-primary/50" />
                                <div className="absolute bottom-8 md:bottom-16 left-0 w-[2px] h-4 bg-primary/50" />

                                {/* Bottom Right */}
                                <div className="absolute bottom-0 right-0 w-8 h-8 md:w-16 md:h-16 border-r-2 border-b-2 border-primary/50 rounded-br-lg" />
                                <div className="absolute bottom-0 right-8 md:right-16 w-4 h-[2px] bg-primary/50" />
                                <div className="absolute bottom-8 md:bottom-16 right-0 w-[2px] h-4 bg-primary/50" />

                                {/* Top Center Line - Gold Gradient */}
                                <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                            </motion.div>
                        </div>

                        {/* HUD Stats - Left Side (Desktop) */}
                        <motion.div
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: bootStep >= 4 ? 0 : -50, opacity: bootStep >= 4 ? 1 : 0 }}
                            className="absolute left-8 md:left-16 top-32 hidden md:flex flex-col gap-3 z-40 font-mono text-[10px] text-secondary/80 select-none"
                        >
                            {/* SFX Toggle */}
                            <div
                                className="flex items-center gap-2 cursor-pointer group hover:text-primary transition-colors"
                                onClick={() => {
                                    const nextState = !settings.sfxEnabled;
                                    useSessionStore.getState().updateSettings({ sfxEnabled: nextState });
                                    setStatusText(nextState ? "🔊 SFX 활성화됨" : "🔇 SFX 비활성화됨");
                                }}
                            >
                                <span className={clsx("w-1.5 h-1.5 rounded-full transition-all", settings.sfxEnabled ? "bg-green-500 shadow-[0_0_5px_lime]" : "bg-red-500/50")} />
                                <span>SFX: {settings.sfxEnabled ? "ON" : "OFF"}</span>
                            </div>

                            {/* BGM Toggle */}
                            <div
                                className="flex items-center gap-2 cursor-pointer group hover:text-primary transition-colors"
                                onClick={() => {
                                    const nextState = !settings.bgmEnabled;
                                    useSessionStore.getState().updateSettings({ bgmEnabled: nextState });
                                    setStatusText(nextState ? "🎵 BGM 활성화됨" : "🔇 BGM 비활성화됨");
                                }}
                            >
                                <span className={clsx("w-1.5 h-1.5 rounded-full transition-all", settings.bgmEnabled ? "bg-green-500 shadow-[0_0_5px_lime]" : "bg-red-500/50")} />
                                <span>BGM: {settings.bgmEnabled ? "ON" : "OFF"}</span>
                            </div>

                            <div className="mt-4 opacity-70 pointer-events-none">
                                <div>COORD: [{mouseCoords.x} : {mouseCoords.y}]</div>
                                <div>FREQ: 436.12 Hz</div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: bootStep >= 4 ? 0 : 50, opacity: bootStep >= 4 ? 1 : 0 }}
                            className="absolute left-8 md:left-16 bottom-32 hidden md:block w-48 z-40"
                        >
                            <div className="bg-[#111] border border-primary/30 rounded-lg p-3 backdrop-blur-md shadow-[0_0_15px_rgba(74,222,128,0.1)]">
                                <div className="text-[11px] font-bold text-primary mb-3 border-b border-primary/20 pb-1 flex items-center justify-between">
                                    <span>이동 모드</span>
                                </div>
                                <div className="space-y-1.5">
                                    <button
                                        onClick={() => setMode('THEME')}
                                        className={clsx(
                                            "w-full text-left px-3 py-2 rounded text-[11px] transition-all flex items-center gap-2 border",
                                            mode === 'THEME'
                                                ? "bg-primary/20 text-primary border-primary/50 shadow-[0_0_5px_rgba(74,222,128,0.2)]"
                                                : "text-zinc-500 border-transparent hover:bg-white/5 hover:text-zinc-300"
                                        )}
                                    >
                                        <IconThemeNode className="w-3.5 h-3.5" />
                                        <span>테마 선택</span>
                                    </button>
                                    <button
                                        onClick={() => setMode('RANDOM')}
                                        className={clsx(
                                            "w-full text-left px-3 py-2 rounded text-[11px] transition-all flex items-center gap-2 border",
                                            mode === 'RANDOM'
                                                ? "bg-primary/20 text-primary border-primary/50 shadow-[0_0_5px_rgba(74,222,128,0.2)]"
                                                : "text-zinc-500 border-transparent hover:bg-white/5 hover:text-zinc-300"
                                        )}
                                    >
                                        <IconRandomChaos className="w-3.5 h-3.5" />
                                        <span>무작위 도약</span>
                                    </button>
                                    <button
                                        onClick={() => setMode('CUSTOM')}
                                        className={clsx(
                                            "w-full text-left px-3 py-2 rounded text-[11px] transition-all flex items-center gap-2 border",
                                            mode === 'CUSTOM'
                                                ? "bg-primary/20 text-primary border-primary/50 shadow-[0_0_5px_rgba(74,222,128,0.2)]"
                                                : "text-zinc-500 border-transparent hover:bg-white/5 hover:text-zinc-300"
                                        )}
                                    >
                                        <IconCustomHex className="w-3.5 h-3.5" />
                                        <span>좌표 수동 입력</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Scan Lines Effect */}
                        <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-5" />

                        {/* Main Orrery GUI */}
                        <main className="relative flex-1 w-full flex flex-col items-center justify-center p-4 min-h-0 shrink-0">

                            {/* THE ORRERY - Responsive sizing */}
                            <div className="relative w-[70vw] h-[70vw] max-w-[400px] max-h-[400px] md:max-w-[600px] md:max-h-none md:w-full md:aspect-square shrink-0 my-4 md:my-0">

                                {/* ALL ELEMENTS SHARE THIS COORDINATE SYSTEM */}

                                {/* Dashed Ring Border */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{
                                        opacity: bootStep >= 2 ? 1 : 0,
                                        scale: bootStep >= 2 ? 1 : 0.8,
                                        rotate: isSpinning ? 720 : 0
                                    }}
                                    transition={{
                                        opacity: { duration: 0.6, delay: 0.2 },
                                        scale: { duration: 0.6, delay: 0.2 },
                                        rotate: { duration: 2, ease: "easeInOut" }
                                    }}
                                    className="absolute inset-0 rounded-full border-2 border-dashed pointer-events-none"
                                    style={{
                                        borderColor: mode === 'THEME' ? 'var(--color-primary)' : 'var(--color-secondary)',
                                        opacity: mode === 'THEME' ? 1 : 0.3
                                    }}
                                />

                                {/* Central Portal - Using inset + margin:auto to avoid transform conflict */}
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{
                                        scale: bootStep >= 2 ? 1 : 0,
                                        opacity: bootStep >= 2 ? 1 : 0
                                    }}
                                    transition={{ duration: 1.2, type: "spring", bounce: 0.2 }}
                                    className="absolute z-20 flex items-center justify-center"
                                    style={{
                                        width: '40%',
                                        height: '40%',
                                        inset: 0,
                                        margin: 'auto'
                                    }}
                                >
                                    {/* Outer Rotating Ring */}
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-4 border-primary"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                                    />
                                    {/* Glow Effect */}
                                    <div
                                        className="absolute inset-0 rounded-full"
                                        style={{
                                            boxShadow: bootStep >= 3 ? '0 0 40px rgba(240,230,140,0.4)' : 'none'
                                        }}
                                    />
                                    {/* Inner Dashed Ring */}
                                    <motion.div
                                        className="absolute inset-[10%] rounded-full border-2 border-dashed border-white/20"
                                        animate={{ rotate: -360 }}
                                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                    />
                                    {/* Core Background */}
                                    <div className="absolute inset-[15%] rounded-full bg-gradient-radial from-ui-bg to-background" />
                                    {/* Target Display with Glitch Effect */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: bootStep >= 3 ? 1 : 0 }}
                                        className="z-10 text-center"
                                    >
                                        <div className="text-[10px] text-secondary/60 mb-1">TARGET</div>
                                        {mode === 'THEME' && selectedTheme ? (() => {
                                            // Get theme info from dynamicThemes or static THEME_INFO
                                            const themeInfo = dynamicThemes?.find(t => t.id === selectedTheme);
                                            const staticInfo = THEME_INFO[selectedTheme];
                                            const koreanName = themeInfo?.name || staticInfo?.name || selectedTheme;
                                            const englishId = selectedTheme; // ID is already in English

                                            return (
                                                <div className="text-sm text-primary font-bold">
                                                    <GlitchText
                                                        texts={[koreanName, englishId]}
                                                        interval={2500}
                                                        glitchDuration={400}
                                                    />
                                                </div>
                                            );
                                        })() : (
                                            <div className="text-sm text-secondary">???</div>
                                        )}
                                    </motion.div>
                                </motion.div>

                                {/* Theme Buttons - Supports both static and dynamic themes */}
                                {(() => {
                                    // Use dynamicThemes if available, otherwise static THEMES
                                    const themesToRender = dynamicThemes
                                        ? dynamicThemes.map(t => ({ id: t.id, name: t.name, hint: t.hint, desc: t.desc }))
                                        : THEMES.map(t => ({ id: t, name: THEME_INFO[t]?.name || t, hint: THEME_INFO[t]?.hint || '', desc: THEME_INFO[t]?.desc || '' }));

                                    return themesToRender.map((theme, i) => {
                                        const angle = (i * 360) / themesToRender.length - 90;
                                        const angleRad = angle * (Math.PI / 180);
                                        // ★ FIX: Shrink diameter on mobile
                                        const radius = typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : 45;
                                        const x = 50 + Math.cos(angleRad) * radius;
                                        const y = 50 + Math.sin(angleRad) * radius;

                                        return (
                                            <div
                                                key={theme.id}
                                                className="absolute"
                                                style={{
                                                    left: `${x}%`,
                                                    top: `${y}%`,
                                                    transform: 'translate(-50%, -50%)',
                                                    zIndex: 10
                                                }}
                                            >
                                                {/* Animated button with dissolve/reconstruct animation */}
                                                <motion.button
                                                    initial={{ opacity: 0, scale: 0 }}
                                                    animate={{
                                                        opacity: isRegenerating ? 0 : (bootStep >= 3 ? 1 : 0),
                                                        scale: isRegenerating ? 2 : (bootStep >= 3 ? 1 : 0),
                                                        rotate: isRegenerating ? 180 : 0
                                                    }}
                                                    whileHover={{ scale: isRegenerating ? 1 : 1.15 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    transition={{
                                                        duration: isRegenerating ? 0.5 : 0.3,
                                                        delay: isRegenerating ? 0 : 0.05 * i,
                                                        type: isRegenerating ? "tween" : "spring"
                                                    }}
                                                    onClick={() => {
                                                        if (phase === 'idle' && !isRegenerating) {
                                                            setSelectedTheme(theme.id);
                                                            setMode('THEME');
                                                        }
                                                    }}
                                                    disabled={phase !== 'idle' || isRegenerating}
                                                    className={clsx(
                                                        "rounded-lg border-2 font-bold whitespace-nowrap cursor-pointer",
                                                        "transition-colors duration-200 shadow-lg backdrop-blur-sm",
                                                        selectedTheme === theme.id
                                                            ? "bg-primary/20 text-primary border-primary shadow-[0_0_10px_rgba(74,222,128,0.3)]"
                                                            : "bg-background/90 text-zinc-500 border-zinc-700 hover:border-primary/50 hover:text-primary hover:bg-primary/5"
                                                    )}
                                                    style={{
                                                        padding: 'clamp(4px, 1vw, 8px) clamp(8px, 2vw, 12px)',
                                                        fontSize: 'clamp(10px, 2vw, 12px)'
                                                    }}
                                                >
                                                    {theme.name}
                                                </motion.button>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {/* ★ 좌표 재생성 버튼 - Desktop only in absolute position */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: bootStep >= 3 ? 1 : 0, y: bootStep >= 3 ? 0 : 20 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 hidden md:block"
                            >
                                <button
                                    onClick={handleRegenerateThemes}
                                    disabled={isRegenerating || phase !== 'idle'}
                                    className={clsx(
                                        "px-6 py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2 border backdrop-blur-sm",
                                        isRegenerating
                                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50 animate-pulse"
                                            : "bg-background/80 text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/15 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,200,255,0.3)]"
                                    )}
                                >
                                    {isRegenerating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                                            <span>차원 좌표 재계산 중...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                                                <path d="M4 12V9C4 6.23858 6.23858 4 9 4H12" />
                                                <path d="M20 12V15C20 17.7614 17.7614 20 15 20H12" />
                                                <path d="M12 1L9 4L12 7" />
                                                <path d="M12 23L15 20L12 17" />
                                            </svg>
                                            <span>좌표 재생성</span>
                                        </>
                                    )}
                                </button>
                            </motion.div>

                            {/* Status Indicators - Left Side (Hidden on mobile) */}
                            {/* Status Indicators (Legacy - Removed in favor of HUD) */}
                            {/* Replaced by top-left HUD stats */}

                            {/* Theme Description Panel - Right Side (Hidden on mobile) */}
                            <AnimatePresence>
                                {selectedTheme && mode === 'THEME' && (() => {
                                    // Get theme info from dynamicThemes or static THEME_INFO
                                    const themeInfo = dynamicThemes?.find(t => t.id === selectedTheme)
                                        || THEME_INFO[selectedTheme];
                                    if (!themeInfo) return null;

                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: bootStep >= 4 ? 1 : 0, x: bootStep >= 4 ? 0 : 20 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.3 }}
                                            className="absolute right-4 md:right-10 top-24 w-48 md:w-56 hidden md:block z-40"
                                        >
                                            <div className="bg-ui-bg/90 border-2 border-primary/30 rounded-lg overflow-hidden backdrop-blur shadow-lg">
                                                <div className="px-3 py-1.5 bg-primary/10 border-b border-primary/20 text-[10px] font-mono text-primary/80 uppercase tracking-widest">
                                                    차원 정보
                                                </div>
                                                <div className="p-3">
                                                    <div className="text-primary font-bold text-sm mb-2">
                                                        {themeInfo.name}
                                                    </div>
                                                    <div className="text-secondary/80 text-xs leading-relaxed">
                                                        {themeInfo.desc}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })()}
                            </AnimatePresence>

                            {/* Decorative Corner Elements */}
                            <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary/30 hidden md:block" />
                            <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary/30 hidden md:block" />
                            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary/30 hidden md:block" />

                        </main>

                        {/* Mobile Theme Description & Actions - Shows between main and footer */}
                        <AnimatePresence>
                            {selectedTheme && mode === 'THEME' && (() => {
                                const themeInfo = dynamicThemes?.find(t => t.id === selectedTheme)
                                    || THEME_INFO[selectedTheme];
                                if (!themeInfo) return null;

                                return (
                                    <motion.div
                                        key="mobile-theme-desc"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="w-full max-w-md px-4 md:hidden z-20 flex flex-col gap-2"
                                    >
                                        <div className="bg-ui-bg/95 border border-primary/40 rounded-lg p-2.5 backdrop-blur-md shadow-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-primary font-bold text-xs">
                                                        {themeInfo.name}
                                                    </div>
                                                    <div className="text-secondary/70 text-[10px] leading-snug line-clamp-2 mt-0.5">
                                                        {themeInfo.desc}
                                                    </div>
                                                </div>

                                                {/* Mobile Regenerate Button inside the Theme Box for space saving */}
                                                <button
                                                    onClick={handleRegenerateThemes}
                                                    disabled={isRegenerating || phase !== 'idle'}
                                                    className={clsx(
                                                        "p-2 rounded border transition-all shrink-0",
                                                        isRegenerating
                                                            ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10 animate-pulse"
                                                            : "border-primary/30 text-primary/70 hover:bg-primary/10"
                                                    )}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                        <path d="M4 4v5h5M20 20v-5h-5" />
                                                        <path d="M18.49 9.09a9 9 0 1 0 1.1 6.88" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })()}
                        </AnimatePresence>

                        {/* Mobile Mode Selector - Shows only on mobile */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: bootStep >= 4 ? 1 : 0, y: bootStep >= 4 ? 0 : 20 }}
                            className="w-full max-w-sm flex justify-center gap-2 py-2 md:hidden z-40"
                        >
                            <button
                                onClick={() => setMode('THEME')}
                                className={clsx(
                                    "px-3 py-1.5 rounded text-[10px] font-bold transition-all flex items-center gap-1.5 border",
                                    mode === 'THEME'
                                        ? "bg-primary/20 text-primary border-primary/50"
                                        : "text-zinc-500 border-zinc-700 hover:border-primary/30"
                                )}
                            >
                                <IconThemeNode className="w-3 h-3" />
                                테마
                            </button>
                            <button
                                onClick={() => setMode('RANDOM')}
                                className={clsx(
                                    "px-3 py-1.5 rounded text-[10px] font-bold transition-all flex items-center gap-1.5 border",
                                    mode === 'RANDOM'
                                        ? "bg-primary/20 text-primary border-primary/50"
                                        : "text-zinc-500 border-zinc-700 hover:border-primary/30"
                                )}
                            >
                                <IconRandomChaos className="w-3 h-3" />
                                랜덤
                            </button>
                            <button
                                onClick={() => setMode('CUSTOM')}
                                className={clsx(
                                    "px-3 py-1.5 rounded text-[10px] font-bold transition-all flex items-center gap-1.5 border",
                                    mode === 'CUSTOM'
                                        ? "bg-primary/20 text-primary border-primary/50"
                                        : "text-zinc-500 border-zinc-700 hover:border-primary/30"
                                )}
                            >
                                <IconCustomHex className="w-3 h-3" />
                                직접 입력
                            </button>
                        </motion.div>

                        {/* Footer */}
                        <motion.footer
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: bootStep >= 3 ? 1 : 0, y: bootStep >= 3 ? 0 : 30 }}
                            transition={{ duration: 0.5 }}
                            className="w-full max-w-4xl flex flex-col items-center gap-4 z-20 pb-8 shrink-0"
                        >
                            <div className="text-center space-y-2">
                                <p className="text-secondary text-xs uppercase tracking-widest">{statusText}</p>
                                <div className="text-lg md:text-xl text-primary font-bold font-retro border-x-4 border-primary px-8 py-2 bg-black/50">
                                    {mode === 'RANDOM'
                                        ? '<??? 미확인 차원 ???>'
                                        : mode === 'CUSTOM'
                                            ? customTheme ? `< ${customTheme} >` : '[ 세계관을 입력하세요 ]'
                                            : selectedTheme
                                                ? (() => {
                                                    const themeInfo = dynamicThemes?.find(t => t.id === selectedTheme);
                                                    const staticInfo = THEME_INFO[selectedTheme];
                                                    const koreanName = themeInfo?.name || staticInfo?.name || selectedTheme;
                                                    const englishId = selectedTheme;
                                                    const suffix = themeDetail ? `: ${themeDetail.slice(0, 15)}${themeDetail.length > 15 ? '...' : ''}` : '';

                                                    return (
                                                        <>
                                                            {'< '}
                                                            <GlitchText
                                                                texts={[koreanName + suffix, englishId + suffix]}
                                                                interval={2500}
                                                                glitchDuration={400}
                                                            />
                                                            {' >'}
                                                        </>
                                                    );
                                                })()
                                                : '[ 테마를 선택하세요 ]'
                                    }
                                </div>
                            </div>

                            {/* Theme Detail Input / Custom Input - Shows when appropriate */}
                            <div className="w-full max-w-md h-24 flex flex-col justify-center">
                                <AnimatePresence mode="wait">
                                    {mode === 'THEME' && selectedTheme ? (
                                        <motion.div
                                            key="theme-detail-input"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="w-full"
                                        >
                                            <input
                                                type="text"
                                                placeholder={THEME_INFO[selectedTheme]?.hint || "세부 설정을 입력하세요..."}
                                                value={themeDetail}
                                                onChange={(e) => setThemeDetail(e.target.value)}
                                                disabled={phase !== 'idle'}
                                                className="w-full px-4 py-3 bg-black/70 border-2 border-primary/50 rounded text-primary placeholder:text-secondary/50 focus:border-primary focus:outline-none font-mono text-sm"
                                                maxLength={100}
                                            />
                                            <p className="text-secondary/50 text-xs mt-1 text-center">
                                                선택 사항: 원하는 세부 설정을 추가하세요
                                            </p>
                                        </motion.div>
                                    ) : mode === 'CUSTOM' ? (
                                        <motion.div
                                            key="custom-theme-input"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="w-full"
                                        >
                                            <input
                                                type="text"
                                                placeholder="원하는 세계관을 자유롭게 입력하세요..."
                                                value={customTheme}
                                                onChange={(e) => setCustomTheme(e.target.value)}
                                                disabled={phase !== 'idle'}
                                                className="w-full px-4 py-3 bg-black/70 border-2 border-purple-500/50 rounded text-purple-300 placeholder:text-secondary/50 focus:border-purple-500 focus:outline-none font-mono text-sm"
                                                maxLength={100}
                                                autoFocus
                                            />
                                            <p className="text-secondary/50 text-xs mt-1 text-center">
                                                예: 용이 사는 사이버펑크 조선시대
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="mode-hint"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="w-full flex items-center justify-center text-secondary/40 text-xs"
                                        >
                                            {mode === 'RANDOM' && "시스템이 무작위 차원 좌표를 생성합니다..."}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: bootStep >= 4 ? 1 : 0, y: bootStep >= 4 ? 0 : 20 }}
                                transition={{ duration: 0.5 }}
                                className="flex flex-col w-full max-w-md gap-3"
                            >
                                {currentWorld && (
                                    <button
                                        onClick={handleContinue}
                                        disabled={phase !== 'idle'}
                                        className="w-full py-3 text-center font-retro text-sm border border-secondary/50 text-secondary hover:text-primary hover:border-primary transition-all bg-black/50"
                                    >
                                        ▶ 신호 복구: {currentWorld.name}
                                    </button>
                                )}
                                <button
                                    onClick={handleEngage}
                                    disabled={phase !== 'idle' || (mode === 'THEME' && !selectedTheme)}
                                    className={clsx(
                                        "w-full py-4 text-center font-retro text-lg border-2 transition-all duration-300 relative overflow-hidden group",
                                        (mode === 'THEME' && !selectedTheme)
                                            ? "bg-transparent text-secondary border-secondary/50 cursor-not-allowed"
                                            : "bg-transparent text-primary border-primary hover:text-black"
                                    )}
                                >
                                    <span className="relative z-10 group-hover:text-black font-bold">
                                        {mode === 'RANDOM' ? '미지의 차원으로 도약' : '새로운 항해 시작'}
                                    </span>
                                    <div className="absolute inset-0 bg-primary transition-transform duration-300 origin-left z-0 scale-x-0 group-hover:scale-x-100" />
                                </button>
                            </motion.div>
                        </motion.footer>
                    </>
                )
            }

            {/* Dev Tools Overlay */}
            <AnimatePresence>
                {showDevTTS && (
                    <TTSTestView onClose={() => setShowDevTTS(false)} />
                )}
                {showDevImage && (
                    <ImageTestView onClose={() => setShowDevImage(false)} />
                )}
                {showDevSFX && (
                    <SFXTestView onClose={() => setShowDevSFX(false)} />
                )}
            </AnimatePresence>
        </div >
    );
}
