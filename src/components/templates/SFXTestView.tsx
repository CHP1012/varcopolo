'use client';

import React, { useState, useRef } from 'react';
import { generateAudioDirectorPrompts } from '@/actions/audioDirector';
import { generateAudioFromDirector } from '@/actions/audio';
import { AudioDirectorResult } from '@/types/audio';
import clsx from 'clsx';

export default function SFXTestView({ onClose }: { onClose: () => void }) {
    const [context, setContext] = useState("오래된 나무 문이 끼익 소리를 내며 무겁게 열림");
    const [directorResult, setDirectorResult] = useState<AudioDirectorResult | null>(null);
    const [sfxUrl, setSfxUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setDirectorResult(null);
        setSfxUrl(null);
        addLog(`=== Analyzing Context ===`);
        addLog(`Input: "${context}"`);

        try {
            // 1. Gemini Refinement
            const directorData = await generateAudioDirectorPrompts(context);
            if (!directorData) {
                addLog(`❌ Failed to generate audio prompts`);
                setIsLoading(false);
                return;
            }

            setDirectorResult(directorData);
            addLog(`✅ Prompt Generated: ${directorData.sfx?.prompt || "No SFX"}`);

            if (directorData.sfx?.required) {
                // 2. ElevenLabs Generation
                addLog(`=== Generating Audio (ElevenLabs) ===`);
                const audioResult = await generateAudioFromDirector(directorData);

                if (audioResult.sfx) {
                    setSfxUrl(audioResult.sfx);
                    addLog(`✅ SFX Received! (${Math.round(audioResult.sfx.length / 1024)} KB)`);

                    // Auto-play
                    setTimeout(() => {
                        if (audioRef.current) {
                            audioRef.current.play().catch(e => addLog(`Play Error: ${e}`));
                        }
                    }, 100);
                } else {
                    addLog(`❌ ElevenLabs generation failed`);
                }
            } else {
                addLog(`ℹ️ No SFX required by Director`);
            }

        } catch (e: any) {
            addLog(`Error: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 font-mono text-xs md:text-sm text-green-400">
            <div className="w-full max-w-4xl border border-green-500/30 bg-black p-6 rounded shadow-2xl relative flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-red-500 hover:text-red-400 z-10">[CLOSE]</button>

                {/* Left Panel: Inputs */}
                <div className="flex-1 flex flex-col gap-4">
                    <h1 className="text-xl font-bold mb-2 text-green-500 border-b border-green-500/30 pb-2">
                        ELEVENLABS AUDIO DIRECTOR
                    </h1>

                    <div>
                        <label className="block text-gray-500 mb-1">CONTEXT (Situation Description)</label>
                        <textarea
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            rows={3}
                            className="w-full bg-green-900/10 border border-green-500/50 p-2 text-green-300 focus:outline-none focus:border-green-400 resize-none"
                            placeholder="Describe the sound situation..."
                        />
                    </div>

                    {/* Logic Display */}
                    <div className="p-3 bg-green-900/5 border border-green-500/20 rounded min-h-[100px] text-xs">
                        <div className="text-gray-500 mb-1">DIRECTOR OUTPUT (GEMINI)</div>
                        {directorResult ? (
                            <div className="space-y-1">
                                <p><span className="text-gray-400">Summary:</span> {directorResult.context_summary}</p>
                                <div className="border-t border-green-900/30 my-1 pt-1">
                                    <span className="text-yellow-500">SFX Request:</span>
                                    {directorResult.sfx?.required ? (
                                        <ul className="pl-2 mt-1 space-y-1">
                                            <li>Prompt: <span className="text-white">{directorResult.sfx.prompt}</span></li>
                                            <li>Duration: {directorResult.sfx.duration_seconds}s</li>
                                        </ul>
                                    ) : (
                                        <span className="text-gray-500 ml-2"> (Not Required)</span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <span className="text-gray-600 italic">Waiting to analyze...</span>
                        )}
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full py-4 bg-green-700 hover:bg-green-600 text-black font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-auto border border-green-500"
                    >
                        {isLoading ? "DIRECTING..." : "GENERATE SFX"}
                    </button>

                    <div className="h-32 overflow-y-auto bg-black border border-green-500/20 p-2 text-xs text-gray-400 font-mono mt-4">
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1 border-b border-gray-800 pb-1">{log}</div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Result */}
                <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded min-h-[300px] relative">
                    <div className="absolute top-2 left-2 text-xs text-gray-500">AUDIO OUTPUT</div>

                    {sfxUrl ? (
                        <div className="flex flex-col items-center gap-4 w-full p-8">
                            <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                </svg>
                            </div>

                            <audio ref={audioRef} controls src={sfxUrl} className="w-full" />

                            <div className="text-xs text-center text-gray-400 mt-2">
                                <p>Prompt: "{directorResult?.sfx?.prompt}"</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-zinc-600 flex flex-col items-center">
                            {isLoading ? (
                                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-2" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-30 mb-2">
                                    <path d="M9 18V5l12-2v13"></path>
                                    <circle cx="6" cy="18" r="3"></circle>
                                    <circle cx="18" cy="16" r="3"></circle>
                                </svg>
                            )}
                            <span>{isLoading ? "Processing..." : "No Audio Generated"}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
