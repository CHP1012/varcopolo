'use client';

import { useState, useEffect } from 'react';

interface GlitchTextProps {
    texts: string[]; // Array of texts to cycle through (e.g., [Korean, English])
    interval?: number; // Interval between text changes (ms)
    glitchDuration?: number; // Duration of glitch animation (ms)
    className?: string;
}

// Random glitch characters
const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789ABCDEFabcdef';

export default function GlitchText({
    texts,
    interval = 3000,
    glitchDuration = 500,
    className = ''
}: GlitchTextProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [displayText, setDisplayText] = useState(texts[0] || '');
    const [isGlitching, setIsGlitching] = useState(false);

    useEffect(() => {
        if (texts.length <= 1) return;

        const cycleTexts = () => {
            setIsGlitching(true);
            const targetText = texts[(currentIndex + 1) % texts.length];
            const maxLength = Math.max(displayText.length, targetText.length);

            // Glitch animation: scramble characters progressively
            let frame = 0;
            const totalFrames = 15;
            const frameInterval = glitchDuration / totalFrames;

            const glitchInterval = setInterval(() => {
                frame++;

                // Calculate how many characters should be "settled"
                const settledChars = Math.floor((frame / totalFrames) * targetText.length);

                // Build display string
                let newDisplay = '';
                for (let i = 0; i < targetText.length; i++) {
                    if (i < settledChars) {
                        // This character is settled - show target
                        newDisplay += targetText[i];
                    } else {
                        // This character is still glitching
                        newDisplay += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
                    }
                }

                setDisplayText(newDisplay);

                if (frame >= totalFrames) {
                    clearInterval(glitchInterval);
                    setDisplayText(targetText);
                    setCurrentIndex((currentIndex + 1) % texts.length);
                    setIsGlitching(false);
                }
            }, frameInterval);
        };

        const timer = setInterval(cycleTexts, interval);
        return () => clearInterval(timer);
    }, [texts, currentIndex, interval, glitchDuration, displayText.length]);

    // Update display when texts prop changes
    useEffect(() => {
        if (texts[0]) {
            setDisplayText(texts[0]);
            setCurrentIndex(0);
        }
    }, [texts]);

    return (
        <span className={`${className} ${isGlitching ? 'animate-pulse' : ''}`}>
            {displayText}
        </span>
    );
}
