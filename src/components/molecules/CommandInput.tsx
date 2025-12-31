'use client';

import { useState } from 'react';
import { SendHorizonal } from 'lucide-react';

interface CommandInputProps {
    onSubmit: (text: string) => void;
    disabled?: boolean;
}

export default function CommandInput({ onSubmit, disabled }: CommandInputProps) {
    const [input, setInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !disabled) {
            onSubmit(input);
            setInput('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full border-t border-secondary/20 bg-ui-bg">
            <div className="flex items-center px-4 py-3">
                <span className="text-primary mr-2 font-mono blink-cursor animate-pulse text-lg">&gt;</span>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={disabled}
                    placeholder="무엇을 하시겠습니까?"
                    className="flex-1 bg-transparent border-none outline-none font-mono text-foreground placeholder-secondary/50 focus:placeholder-transparent"
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={!input.trim() || disabled}
                    className="ml-2 text-secondary hover:text-primary disabled:opacity-30 transition-colors"
                >
                    <SendHorizonal size={20} />
                </button>
            </div>
        </form>
    );
}
