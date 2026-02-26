import React, { useState } from 'react';
import { useScoringStore } from '../scoringStore';
import { clsx } from 'clsx';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const CommentaryPanel: React.FC = () => {
    const commentary = useScoringStore((s) => s.getCommentary());
    const [isExpanded, setIsExpanded] = useState(false);

    if (commentary.length === 0) {
        return null;
    }

    const displayedCommentary = isExpanded ? commentary : commentary.slice(0, 3);

    return (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm mx-3 mt-1 mb-3">
            {/* Header / Toggle */}
            <div
                className="flex items-center justify-between p-3 bg-card cursor-pointer hover:bg-cardAlt transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2 text-foreground">
                    <span className="text-sm font-semibold uppercase tracking-wider">
                        Auto Commentary
                    </span>
                    <span className="text-xs text-muted-foreground bg-bgPrimary px-2 rounded-full">
                        {commentary.length} balls
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
            </div>

            {/* Content List */}
            <div className={clsx("transition-all duration-300", isExpanded ? "max-h-64 overflow-y-auto" : "max-h-32 overflow-hidden")}>
                <ul className="divide-y divide-border/40">
                    {displayedCommentary.map((entry) => (
                        <li key={entry.id} className="p-3 flex gap-3 animate-in fade-in">
                            <div className="flex-shrink-0 w-12 text-center">
                                <span className="bg-cardAlt text-foreground text-xs font-bold px-1.5 py-0.5 rounded border border-border">
                                    {entry.overLabel}
                                </span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-foreground leading-snug">
                                    {entry.text}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
