import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface EpilogueProps {
    data: {
        type: string; // 'PLAYER_INITIATED' | 'DEATH' | 'INCAPACITATED' | 'NARRATIVE_COMPLETE'
        reason?: string;
        epilogue?: string;
        can_continue?: boolean; // Restored
        ending_metadata?: {
            world_name: string;
            voyage_title: string;
            artifact: { name: string; data_log: string };
            visual_keywords?: string;
        };
    };
    onRestart: () => void;
    onContinue?: () => void;
}

export default function EpilogueView({ data, onRestart, onContinue }: EpilogueProps) {
    const [textVisible, setTextVisible] = useState(false);

    useEffect(() => {
        // Simple delay for effect
        const timer = setTimeout(() => setTextVisible(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    const getTitle = () => {
        switch (data.type) {
            case 'DEATH': return 'YOU DIED';
            case 'INCAPACITATED': return 'GAME OVER';
            case 'NARRATIVE_COMPLETE': return 'THE END';
            case 'PLAYER_INITIATED': return 'EPILOGUE';
            default: return 'THE END';
        }
    };

    const getColor = () => {
        switch (data.type) {
            case 'DEATH': return 'text-red-600';
            case 'INCAPACITATED': return 'text-orange-500';
            case 'NARRATIVE_COMPLETE': return 'text-yellow-400';
            case 'PLAYER_INITIATED': return 'text-blue-400';
            default: return 'text-white';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center font-mono"
        >
            <motion.h1
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                className={`text-6xl md:text-8xl font-black tracking-widest mb-8 ${getColor()}`}
            >
                {getTitle()}
            </motion.h1>

            {/* Ending Reason / Type Description */}
            {data.reason && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="text-gray-500 text-sm mb-12 uppercase tracking-widest max-w-2xl"
                >
                    [{data.reason}]
                </motion.p>
            )}

            {/* Main Epilogue Text */}
            <div className="max-w-3xl space-y-6 text-lg md:text-xl leading-relaxed text-gray-300">
                {textVisible && data.epilogue && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                    >
                        {data.epilogue.split('\n').map((line, i) => (
                            <p key={i} className="mb-4">{line}</p>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* V6.1 Artifact Display */}
            {data.ending_metadata && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3 }}
                    className="mt-8 p-6 border border-white/10 rounded bg-white/5 max-w-xl w-full backdrop-blur-sm"
                >
                    <div className="text-xs text-secondary mb-2 uppercase tracking-widest flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                        Voyage Archived
                    </div>
                    <div className="text-2xl font-bold text-white mb-4 font-serif">{data.ending_metadata.voyage_title}</div>

                    <div className="border-t border-white/10 pt-4 flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 uppercase mb-2">Retrieved Artifact</span>
                        <div className="text-xl text-yellow-200 font-serif italic mb-2">"{data.ending_metadata.artifact.name}"</div>
                        <p className="text-xs text-gray-400 max-w-sm leading-relaxed">{data.ending_metadata.artifact.data_log}</p>
                    </div>
                </motion.div>
            )}

            {/* Controls */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 4 }}
                className="mt-20 flex gap-6"
            >
                {data.can_continue && onContinue && (
                    <button
                        onClick={onContinue}
                        className="px-8 py-3 border border-gray-600 text-gray-400 hover:border-white hover:text-white transition-all rounded uppercase tracking-widest text-sm"
                    >
                        Continue Journey
                    </button>
                )}

                <button
                    onClick={onRestart}
                    className={`px-8 py-3 border transition-all rounded uppercase tracking-widest text-sm font-bold
                        ${data.type === 'DEATH' ? 'border-red-900 text-red-700 hover:bg-red-950' : 'border-white text-white hover:bg-white hover:text-black'}
                    `}
                >
                    {data.type === 'NARRATIVE_COMPLETE' ? 'New Story' : 'Restart'}
                </button>
            </motion.div>
        </motion.div>
    );
}
