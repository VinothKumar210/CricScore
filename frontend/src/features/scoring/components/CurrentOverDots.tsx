import React from 'react';
import { useScoringStore } from '../scoringStore';
import { useShallow } from 'zustand/react/shallow';
import { clsx } from 'clsx';

/**
 * CurrentOverDots — Colored dots for the current over.
 * Colors: green=runs, red=wicket, gold=boundary(4/6), gray=dot, blue=extra.
 */
export const CurrentOverDots = React.memo(() => {
    const currentOverBalls = useScoringStore(
        useShallow((s) => s.getCurrentOverBalls())
    );

    if (!currentOverBalls || currentOverBalls.length === 0) return null;

    const getDotColor = (ball: any): string => {
        if (ball.isWicket || ball.type === 'WICKET') return 'bg-destructive text-destructive-foreground';
        if (ball.runs >= 4) return 'bg-amber-500 text-black';
        if (ball.extraType) return 'bg-blue-500 text-white';
        if (ball.runs === 0) return 'bg-muted text-muted-foreground';
        return 'bg-emerald-500 text-white';
    };

    const getDotLabel = (ball: any): string => {
        if (ball.isWicket || ball.type === 'WICKET') return 'W';
        if (ball.extraType === 'WIDE') return 'Wd';
        if (ball.extraType === 'NO_BALL') return 'Nb';
        if (ball.extraType === 'BYE') return 'B';
        if (ball.extraType === 'LEG_BYE') return 'Lb';
        return String(ball.runs ?? 0);
    };

    return (
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-card/50 border-b border-border">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mr-2 shrink-0">
                This Over
            </span>
            <div className="flex items-center gap-1 flex-wrap">
                {currentOverBalls.map((ball: any, i: number) => (
                    <div
                        key={i}
                        className={clsx(
                            "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all",
                            getDotColor(ball)
                        )}
                    >
                        {getDotLabel(ball)}
                    </div>
                ))}
                {/* Remaining dots as placeholders */}
                {Array.from({ length: Math.max(0, 6 - currentOverBalls.length) }).map((_, i) => (
                    <div
                        key={`empty-${i}`}
                        className="w-7 h-7 rounded-full border border-dashed border-border/50 flex items-center justify-center text-[10px] text-muted-foreground/30 shrink-0"
                    >
                        •
                    </div>
                ))}
            </div>
        </div>
    );
});

CurrentOverDots.displayName = 'CurrentOverDots';
