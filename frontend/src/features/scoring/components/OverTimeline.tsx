import React from 'react';
import { clsx } from 'clsx';
import { useScoringStore } from '../scoringStore';
import { typography } from '../../../constants/typography';

// We are using the selector which returns simple objects with { label, type }

const OverTimeline = React.memo(() => {
    // Selective subscription
    const balls = useScoringStore((s) => s.getCurrentOverBalls());

    if (!balls || balls.length === 0) {
        return (
            <div className="flex items-center justify-center py-4 text-textSecondary text-sm">
                Start of Over
            </div>
        );
    }

    const getBallStyles = (type: string) => {
        switch (type) {
            case 'WICKET': return "bg-danger text-white border-danger";
            case 'WIDE':
            case 'NOBALL': return "bg-warning text-white border-warning";
            case 'LEGBYE':
            case 'BYE': return "bg-surface text-textSecondary border-textSecondary"; // Or specific color
            default: return "bg-surface text-textPrimary border-border"; // Normal run
        }
    };

    return (
        <div className="w-full overflow-x-auto no-scrollbar py-2">
            <div className="flex items-center gap-2 px-4 min-w-max">
                {balls.map((ball, index) => (
                    <div
                        key={index}
                        className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center border shadow-sm shrink-0",
                            typography.bodyMd,
                            "font-bold tabular-nums uppercase",
                            getBallStyles(ball.type)
                        )}
                    >
                        {ball.label}
                    </div>
                ))}
            </div>
        </div>
    );
});

OverTimeline.displayName = 'OverTimeline';

export { OverTimeline };
