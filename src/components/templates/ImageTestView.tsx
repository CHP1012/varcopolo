'use client';

import React, { useState } from 'react';
import { generateImageAction } from '@/actions/image';
import clsx from 'clsx';

export default function ImageTestView({ onClose }: { onClose: () => void }) {
    const [prompt, setPrompt] = useState("어두운 골목길, 네온 사인이 비치는 젖은 바닥, 사이버펑크 분위기");
    const [theme, setTheme] = useState("Sci-Fi");
    const [style, setStyle] = useState("noir, high contrast, cinematic lighting, photorealistic");

    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    // Configured Model Info (derived from server action code)
    const MODEL_INFO = {
        provider: "Google Generative AI (Gemini/Imagen)",
        endpoint: "generativelanguage.googleapis.com",
        modelName: "Auto-Switching (Tier 1: 4.0 Fast ➔ Tier 2: 4.0 Standard)"
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        addLog(`=== Generating Image ===`);
        addLog(`Target: ${MODEL_INFO.modelName} via ${MODEL_INFO.provider}`);
        addLog(`Prompt: "${prompt}"`);
        addLog(`Theme: ${theme}, Style: ${style}`);

        try {
            const result = await generateImageAction(prompt, theme, { enforce_style_prompt: style, negative_constraints_prompt: "" }, prompt);

            if (result && !result.startsWith("ERROR") && !result.includes("data:image/svg+xml")) {
                setGeneratedImage(result);
                addLog(`✅ Success! Image received.`);
            } else {
                setGeneratedImage(result || null); // Display fallback if present
                addLog(`❌ Failed. ${result?.startsWith("data") ? "Fallback image returned (Timeout/Error)" : result}`);
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
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 font-mono text-xs md:text-sm text-cyan-400">
            <div className="w-full max-w-4xl border border-cyan-500/30 bg-black p-6 rounded shadow-2xl relative flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-red-500 hover:text-red-400 z-10">[CLOSE]</button>

                {/* Left Panel: Inputs */}
                <div className="flex-1 flex flex-col gap-4">
                    <h1 className="text-xl font-bold mb-2 text-cyan-500 border-b border-cyan-500/30 pb-2">
                        VARCO IMAGE GEN TESTER
                    </h1>

                    <div>
                        <label className="block text-gray-500 mb-1">PROMPT (Scene Description)</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={4}
                            className="w-full bg-cyan-900/10 border border-cyan-500/50 p-2 text-cyan-300 focus:outline-none focus:border-cyan-400 resize-none"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-gray-500 mb-1">THEME</label>
                            <input
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                                className="w-full bg-cyan-900/10 border border-cyan-500/50 p-2 text-cyan-300 focus:outline-none"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-gray-500 mb-1">STYLE CONSTRAINTS</label>
                            <input
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                className="w-full bg-cyan-900/10 border border-cyan-500/50 p-2 text-cyan-300 focus:outline-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                    >
                        {isLoading ? "GENERATING..." : "GENERATE IMAGE"}
                    </button>

                    <div className="h-32 overflow-y-auto bg-black border border-cyan-500/20 p-2 text-xs text-gray-400 font-mono mt-4">
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1 border-b border-gray-800 pb-1">{log}</div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Result */}
                <div className="flex-1 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded min-h-[300px] relative overflow-hidden">
                    {generatedImage ? (
                        <div className="relative w-full h-full">
                            <img
                                src={generatedImage}
                                alt="Generated Result"
                                className="w-full h-full object-contain"
                            />
                            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded">
                                RESULT PREVIEW
                            </div>
                        </div>
                    ) : (
                        <div className="text-zinc-600 flex flex-col items-center">
                            {isLoading ? (
                                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2" />
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-16 h-16 mb-2 opacity-50">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                            )}
                            <span>{isLoading ? "Processing Request..." : "No Image Generated"}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
