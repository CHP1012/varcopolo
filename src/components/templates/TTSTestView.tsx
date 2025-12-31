'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateSpeechAction } from '@/actions/tts';
import { polishTextForTTS } from '@/actions/promptEngineer'; // Import added
import { getVoiceProperties, VoiceProperties } from '@/lib/voiceUtils';



// Preset Scenarios from the Guide
const SCENARIOS = [
    {
        name: "억누르는 분노 (Suppressed)",
        text: "그만. 더, 듣고 싶지... 않아.",
        state: "suppressed",
        voiceId: "b4bafc3b-9026-5e3e-8698-011bb7117eb8" // Example generic male/female uuid if needed, but we'll use a valid map later or passed prop
    },
    {
        name: "비굴한 아부 (Flattery)",
        text: "아이고오~ 영웅님! 정~말, 대단하십니다요!",
        state: "flattery",
        voiceId: "e9052dba-4d09-5c32-99ff-8e03e86a9acb"
    },
    {
        name: "공포 속삭임 (Whisper)",
        text: "(쉿)... 조용히 해. 들키면... 끝장이야.",
        state: "whisper",
        voiceId: "88f48260-0f98-5ea0-b374-923673459171"
    },
    {
        name: "광기 (Madness)",
        text: "키힉, 크하하학! 다... 다 부숴버릴 거야!!",
        state: "madness",
        voiceId: "b4bafc3b-9026-5e3e-8698-011bb7117eb8"
    },
    {
        name: "빈사 상태 (Dying)",
        text: "(쿨럭)... 나를... 두고... 가라...",
        state: "dying",
        voiceId: "297d6972-b87d-57dc-86e0-70534b924ef5"
    }
];

export default function TTSTestView({ onClose }: { onClose: () => void }) {
    const [text, setText] = useState(SCENARIOS[0].text);
    const [state, setState] = useState(SCENARIOS[0].state);
    const [voiceId, setVoiceId] = useState("297d6972-b87d-57dc-86e0-70534b924ef5"); // Default Male Middle (Gareth)

    // Manual Parameter Controls
    const [params, setParams] = useState<VoiceProperties>({ speed: 1.0, pitch: 1.0 });
    const [isManual, setIsManual] = useState(false); // If true, don't auto-update params

    const [isLoading, setIsLoading] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handlePolish = async () => {
        if (!text) return;
        setIsPolishing(true);
        addLog("... Requesting AI Polish ...");
        try {
            const polished = await polishTextForTTS(text, state);
            setText(polished);
            addLog(`✨ Text Polished: "${polished}"`);
        } catch (e: any) {
            addLog(`Error Polishing: ${e.message}`);
        } finally {
            setIsPolishing(false);
        }
    };

    // Auto-calculate properties when State or Text changes (unless Manual Mode is ON)
    useEffect(() => {
        if (!isManual) {
            const newParams = getVoiceProperties(state, text);
            setParams(newParams);
        }
    }, [state, text, isManual]);

    const handleGenerate = async () => {
        setIsLoading(true);
        addLog(`=== Generating ===`);
        addLog(`Text: "${text}"`);
        addLog(`State: ${state} => Speed: ${params.speed}, Pitch: ${params.pitch}`);

        try {
            // We need to modify generateSpeechAction to accept explicit params if we want to override them.
            // However, the current action re-calculates them.
            // For now, we'll trust the input state, BUT purely for this test tool,
            // we should probably allow passing 'overrideParams' to the action if we want to test manual values.
            // OR: We just rely on the 'state' input for the main flow, and only use manual params if we add a new argument.
            // NOTE: Current generateSpeechAction re-calls getVoiceProperties. 
            // To support manual override, we'd need to update the server action. 
            // Let's UPDATE the server action to accept optional 'overrideParams'.

            const audioData = await generateSpeechAction({
                text,
                speakerId: voiceId,
                physicalState: state, // Using physicalState as the primary carrier for our test
                // We could also mix psychologicalState, but for the test strictly following the updated guide params map
                overrideParams: isManual ? params : undefined // We will add this to the interface next
            });

            if (audioData) {
                addLog(`✅ Success! Audio received.`);
                if (audioRef.current) {
                    audioRef.current.src = audioData;
                    audioRef.current.play();
                }
            } else {
                addLog(`❌ Failed. No audio data.`);
            }
        } catch (e: any) {
            addLog(`Error: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 font-mono text-xs md:text-sm text-green-400">
            <div className="w-full max-w-2xl border border-green-500/30 bg-black p-6 rounded shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-red-500 hover:text-red-400">[CLOSE]</button>

                <h1 className="text-xl font-bold mb-4 text-green-500 border-b border-green-500/30 pb-2">
                    VARCO TTS ACTING TESTER
                </h1>

                {/* Scenarios */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    {SCENARIOS.map((s) => (
                        <button
                            key={s.name}
                            onClick={() => {
                                setIsManual(false); // Reset to auto mode
                                setText(s.text);
                                setState(s.state);
                                if (s.voiceId) setVoiceId(s.voiceId);
                            }}
                            className="bg-green-900/20 border border-green-500/30 hover:bg-green-500/20 py-2 px-1 text-xs truncate transition-all text-left pl-2"
                        >
                            {s.name}
                        </button>
                    ))}
                </div>

                {/* Main Inputs */}
                <div className="space-y-4 mb-6">
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-gray-500">SCRIPT (With Breath/Acting Tags)</label>
                            <button
                                onClick={handlePolish}
                                disabled={isPolishing || !text}
                                className="text-[10px] bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded hover:bg-blue-800/60 border border-blue-500/30 transition-colors disabled:opacity-50"
                            >
                                {isPolishing ? "POLISHING..." : "✨ AI POLISH (Gemini)"}
                            </button>
                        </div>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={3}
                            className="w-full bg-green-900/10 border border-green-500/50 p-2 text-green-300 focus:outline-none focus:border-green-400 resize-none"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-gray-500 mb-1">STATE (e.g. anger, dying)</label>
                            <input
                                value={state}
                                onChange={(e) => {
                                    setIsManual(false);
                                    setState(e.target.value);
                                }}
                                className="w-full bg-green-900/10 border border-green-500/50 p-2 text-green-300 focus:outline-none"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-gray-500 mb-1">VOICE UUID</label>
                            <input
                                value={voiceId}
                                onChange={(e) => setVoiceId(e.target.value)}
                                className="w-full bg-green-900/10 border border-green-500/50 p-2 text-green-300 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Parameter Tuning Panel */}
                    <div className="border border-green-500/30 p-3 rounded bg-green-900/5">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-green-500 font-bold">PARAMETER TUNING</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500">{isManual ? "MANUAL OVERRIDE ON" : "AUTO-TUNED (Read Only)"}</span>
                                <input
                                    type="checkbox"
                                    checked={isManual}
                                    onChange={(e) => setIsManual(e.target.checked)}
                                    className="accent-green-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="flex justify-between text-gray-500 mb-1">
                                    <span>SPEED</span>
                                    <span className="text-green-300">{params.speed}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.01"
                                    value={params.speed}
                                    onChange={(e) => {
                                        setIsManual(true);
                                        setParams(prev => ({ ...prev, speed: parseFloat(e.target.value) }));
                                    }}
                                    className="w-full accent-green-500 h-1 bg-green-900/50 rounded appearance-none cursor-pointer"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="flex justify-between text-gray-500 mb-1">
                                    <span>PITCH</span>
                                    <span className="text-green-300">{params.pitch}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.01"
                                    value={params.pitch}
                                    onChange={(e) => {
                                        setIsManual(true);
                                        setParams(prev => ({ ...prev, pitch: parseFloat(e.target.value) }));
                                    }}
                                    className="w-full accent-green-500 h-1 bg-green-900/50 rounded appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action */}
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-black font-bold text-lg mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? "GENERATING..." : "GENERATE & PLAY ACTING"}
                </button>

                {/* Logs */}
                <div className="h-32 overflow-y-auto bg-black border border-green-500/20 p-2 text-xs text-gray-400 font-mono">
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1 border-b border-gray-800 pb-1">{log}</div>
                    ))}
                    {logs.length === 0 && <div className="text-gray-700 italic">Ready to test...</div>}
                </div>

                <audio ref={audioRef} className="hidden" />
            </div>
        </div>
    );
}
