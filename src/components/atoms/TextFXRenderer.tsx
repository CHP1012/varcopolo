'use client';

import React, { useState, useEffect, useRef } from 'react';
import '@/styles/textFX.css'; // Global import for FX styles

interface TextFXRendererProps {
    text: string;
    onComplete?: () => void; // For typewriter effect completion
}

export default function TextFXRenderer({ text, onComplete }: TextFXRendererProps) {
    // Regex to capture discrete tags like <burn>content</burn>
    // This simple regex assumes no nested tags for now as per guideline strictness
    const tagRegex = /(<[a-z]+>.*?<\/[a-z]+>)/g;
    const parts = text.split(tagRegex);

    return (
        <span className="text-fx-container">
            {parts.map((part, index) => {
                const match = part.match(/<([a-z]+)>(.*?)<\/[a-z]+>/);
                if (match) {
                    const [, tag, content] = match;
                    return <FXComponent key={index} tag={tag} content={content} />;
                }
                // Render plain text directly
                return <span key={index}>{part}</span>;
            })}
        </span>
    );
}

// Sub-component to handle stateful interactions per tag
function FXComponent({ tag, content }: { tag: string; content: string }) {
    const [interacted, setInteracted] = useState(false);
    const [isHolding, setIsHolding] = useState(false);

    // <blur>: Click/Tap to toggle reveal
    if (tag === 'blur') {
        return (
            <span
                className={`fx-blur ${interacted ? 'revealed' : ''}`}
                onClick={() => setInteracted(!interacted)}
            >
                {content}
            </span>
        );
    }

    // <glitch>: Hold to decode
    if (tag === 'glitch') {
        const handleDown = () => setIsHolding(true);
        const handleUp = () => setIsHolding(false);

        return (
            <span
                className={`fx-glitch ${isHolding ? 'decoding' : ''}`}
                data-text={content} // For CSS attr()
                onMouseDown={handleDown}
                onMouseUp={handleUp}
                onMouseLeave={handleUp}
                onTouchStart={handleDown}
                onTouchEnd={handleUp}
            >
                {isHolding ? content : scrambleText(content)}
            </span>
        );
    }

    // <scratch>: Drag/Rub to reveal
    if (tag === 'scratch') {
        const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
            // Simple threshold: if user moves over it, consider it scratched
            // In a real game, might want distance accumulation
            if ((e.nativeEvent as any).buttons > 0 || e.type === 'touchmove') {
                setInteracted(true);
            }
        };

        return (
            <span
                className={`fx-scratch ${interacted ? 'scratched' : ''}`}
                onMouseMove={handleMove}
                onTouchMove={handleMove}
            >
                {content}
            </span>
        );
    }

    // <type>: Typewriter effect (simplified for this component context)
    // Note: Managing timing across multiple mixed text nodes is complex.
    // For this implementation, we allow the parent NarrativeLog to handle main typing,
    // and this <type> tag just adds the blinking cursor effect via CSS.
    if (tag === 'type') {
        return <span className="fx-type">{content}</span>;
    }

    // <hidden>: Blocked content
    if (tag === 'hidden') {
        return <span className="fx-hidden">{content}</span>;
    }

    // Passive tags (burn, freeze, neon, etc.) - just render class
    return <span className={`fx-${tag}`}>{content}</span>;
}

// Helper for glitch effect
function scrambleText(text: string) {
    const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~';
    return text.split('').map(c =>
        c === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)]
    ).join('');
}
