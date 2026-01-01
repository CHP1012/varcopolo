'use client';

import clsx from 'clsx';
import TextFXRenderer from '@/components/atoms/TextFXRenderer';

interface Choice {
    id: string;
    text: string;
    type?: 'DEFAULT' | 'RISKY' | 'SPECIAL';
}

interface ChoiceViewProps {
    choices: Choice[];
    onSelect: (choiceId: string) => void;
    disabled?: boolean;
}

export default function ChoiceView({ choices, onSelect, disabled = false }: ChoiceViewProps) {
    return (
        <div className="flex flex-col gap-2 p-2 md:p-4 border-t border-secondary/20 bg-black/40">
            {choices.map((choice) => (
                <button
                    key={choice.id}
                    onClick={() => onSelect(choice.id)}
                    disabled={disabled}
                    className={clsx(
                        "w-full text-left p-3 border hover:bg-white/5 transition-all font-retro text-xs md:text-sm group",
                        choice.type === 'RISKY' ? "border-danger text-danger hover:bg-danger/10" :
                            choice.type === 'SPECIAL' ? "border-primary text-primary hover:bg-primary/10" :
                                "border-secondary text-foreground hover:border-primary hover:text-primary"
                    )}
                >
                    <span className="mr-2 opacity-50 group-hover:opacity-100 group-hover:text-primary">&gt;</span>
                    <TextFXRenderer text={choice.text} />
                </button>
            ))}
        </div>
    );
}
