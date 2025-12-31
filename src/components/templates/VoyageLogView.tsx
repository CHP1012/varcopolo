import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Skull, Anchor, Trophy, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface VoyageRecord {
    timestamp: string;
    world_name: string;
    voyage_title: string;
    ending_type: string; // 'PLAYER_INITIATED' | 'DEATH' | 'INCAPACITATED' | 'NARRATIVE_COMPLETE'
    artifact: {
        name: string;
        data_log: string;
    };
    visual_keywords?: string;
}

interface VoyageLogViewProps {
    onClose: () => void;
}

export default function VoyageLogView({ onClose }: VoyageLogViewProps) {
    const [history, setHistory] = useState<VoyageRecord[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<VoyageRecord | null>(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('voyage_history');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Sort by timestamp descending (newest first)
                setHistory(parsed.reverse());
            }
        } catch (e) {
            console.error("Failed to load voyage history", e);
        }
    }, []);

    const getTheme = (type: string) => {
        if (type === 'DEATH' || type === 'INCAPACITATED') {
            return {
                color: 'text-red-500',
                border: 'border-red-500/30',
                bg: 'bg-red-950/20',
                icon: <Skull size={16} />,
                label: 'SIGNAL LOST',
                glitch: true
            };
        } else if (type === 'PLAYER_INITIATED') {
            return {
                color: 'text-emerald-400',
                border: 'border-emerald-400/30',
                bg: 'bg-emerald-950/20',
                icon: <Anchor size={16} />,
                label: 'SETTLED',
                glitch: false
            };
        } else { // NARRATIVE_COMPLETE
            return {
                color: 'text-blue-400',
                border: 'border-blue-400/30',
                bg: 'bg-blue-950/20',
                icon: <Trophy size={16} />,
                label: 'COMPLETED',
                glitch: false
            };
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col md:flex-row p-4 md:p-8 gap-6 overflow-hidden"
        >
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
            <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />

            {/* Header / Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-secondary hover:text-white transition-colors z-50"
            >
                <X size={24} />
            </button>

            {/* Left Panel: Record List */}
            <div className="flex-1 flex flex-col min-h-0 bg-black/40 border border-white/10 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-primary font-retro tracking-widest flex items-center gap-2">
                        <BookOpen size={20} />
                        DIMENSIONAL VOYAGE LOG
                    </h2>
                    <span className="text-xs text-secondary/50 font-mono">
                        {history.length} RECORDS FOUND
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-hide">
                    {history.length === 0 ? (
                        <div className="text-center py-20 text-secondary/40 font-mono text-sm">
                            NO VOYAGE DATA RECORDED
                        </div>
                    ) : (
                        history.map((record, idx) => {
                            const theme = getTheme(record.ending_type);
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => setSelectedRecord(record)}
                                    className={clsx(
                                        "p-3 rounded border cursor-pointer transition-all hover:bg-white/5",
                                        selectedRecord === record ? `bg-white/10 ${theme.border}` : "border-transparent bg-transparent",
                                        theme.border
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={clsx("text-xs font-bold font-mono px-1.5 py-0.5 rounded border border-current flex items-center gap-1", theme.color)}>
                                            {theme.icon}
                                            {theme.label}
                                        </span>
                                        <span className="text-[10px] text-secondary/50 font-mono">
                                            {new Date(record.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-bold text-white mb-0.5 truncate">{record.voyage_title}</h3>
                                    <p className="text-xs text-secondary/70 truncate">{record.world_name}</p>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Panel: Detail View (Artifact) */}
            <div className="flex-1 md:flex-[1.5] min-h-0 bg-black/60 border border-white/10 rounded-lg relative overflow-hidden flex flex-col items-center justify-center p-8 text-center">
                {selectedRecord ? (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedRecord.timestamp}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-lg"
                        >
                            {/* Hologram Effect Container */}
                            <div className="relative mb-8 group">
                                <div className={clsx(
                                    "absolute inset-0 blur-2xl opacity-20 transition-all duration-1000",
                                    getTheme(selectedRecord.ending_type).color.replace('text-', 'bg-')
                                )} />
                                <div className="relative w-32 h-32 mx-auto border-4 border-double border-white/20 rounded-full flex items-center justify-center bg-black/50 overflow-hidden">
                                    {/* Simple Artifact Placeholder Icon since we don't have generated images yet */}
                                    {getTheme(selectedRecord.ending_type).icon}
                                </div>
                            </div>

                            <h3 className={clsx("text-2xl md:text-3xl font-bold font-serif mb-2", getTheme(selectedRecord.ending_type).color)}>
                                "{selectedRecord.artifact.name}"
                            </h3>
                            <div className="h-px w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mb-6" />

                            <p className="text-sm md:text-base text-gray-300 italic mb-8 leading-relaxed">
                                {selectedRecord.artifact.data_log}
                            </p>

                            <div className="grid grid-cols-2 gap-4 text-left border-t border-white/10 pt-6">
                                <div>
                                    <span className="text-[10px] text-secondary uppercase block mb-1">World</span>
                                    <span className="text-sm font-mono text-white">{selectedRecord.world_name}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-secondary uppercase block mb-1">Title</span>
                                    <span className="text-sm font-mono text-white">{selectedRecord.voyage_title}</span>
                                </div>
                            </div>

                            {/* Glitch Overlay for 'Signal Lost' */}
                            {getTheme(selectedRecord.ending_type).glitch && (
                                <div className="absolute inset-0 pointer-events-none opacity-10 mix-blend-overlay animate-pulse bg-red-500/20" />
                            )}
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <div className="text-secondary/30 font-mono text-xs flex flex-col items-center gap-4">
                        <AlertTriangle size={32} className="opacity-50" />
                        <span>SELECT A VOYAGE RECORD TO INITIALIZE HOLOGRAPHIC REPLAY</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
