import React from 'react';
import { clsx } from 'clsx';
import { useScoringStore } from '../scoringStore';

/**
 * OverTimeline — Ball-by-ball bubbles for current over.
 * Color-coded: wickets red, extras amber, boundaries emerald/purple, dots muted.
 */
const OverTimeline = React.memo(() => {
    const balls = useScoringStore((s) => s.getCurrentOverBalls());

    if (!balls || balls.length === 0) {
        return (
            <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
                Start of Over
            </div>
        );
    }

    const getBallStyles = (type: string, label: string) => {
        switch (type) {
            case 'WICKET':
                return "bg-destructive/20 text-destructive border-destructive/40 ring-1 ring-destructive/20";
            case 'WIDE':
            case 'NOBALL':
                return "bg-amber-500/15 text-amber-400 border-amber-500/30";
            case 'LEGBYE':
            case 'BYE':
                return "bg-secondary text-muted-foreground border-border";
            default: {
                // Boundaries get special treatment
                const runs = parseInt(label, 10);
                if (runs === 4) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
                if (runs === 6) return "bg-primary/15 text-primary border-primary/30 ring-1 ring-primary/20";
                if (runs === 0) return "bg-secondary text-muted-foreground border-border";
                return "bg-card text-foreground border-border";
            }
        }
    };

    return (
        <div className="w-full overflow-x-auto no-scrollbar py-2">
            <div className="flex items-center gap-2 px-4 min-w-max">
                {balls.map((ball, index) => (
                    <div
                        key={index}
                        className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center border shrink-0",
                            "text-sm font-bold tabular-nums uppercase",
                            "transition-all animate-in fade-in zoom-in-95",
                            getBallStyles(ball.type, ball.label)
                        )}
                    >
                        {ball.label}
                    </div>
                ))}

                {/* Remaining balls indicator */}
                {balls.length < 6 && (
                    Array.from({ length: 6 - balls.length }).map((_, i) => (
                        <div
                            key={`empty-${i}`}
                            className="w-10 h-10 rounded-full border border-dashed border-border/50 flex items-center justify-center shrink-0"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-border" />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});

OverTimeline.displayName = 'OverTimeline';

export { OverTimeline };
