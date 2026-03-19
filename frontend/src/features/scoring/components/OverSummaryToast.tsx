import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import type { BallEvent } from '../types/ballEventTypes';

interface OverSummaryToastProps {
    overNumber: number;
    balls: BallEvent[];
    bowlerName: string;
    bowlerFigures: string;
    onDismiss?: () => void;
}

export const OverSummaryToast = ({ overNumber, balls, bowlerName, bowlerFigures, onDismiss }: OverSummaryToastProps) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onDismiss) setTimeout(onDismiss, 300); // Wait for transition
        }, 4000); // 4 seconds
        return () => clearTimeout(timer);
    }, [onDismiss]);

    if (!isVisible) return null;

    const totalRuns = balls.reduce((acc, ball) => {
        if (ball.type === 'RUN') return acc + ball.runs;
        if (ball.type === 'EXTRA') return acc + (ball.runsOffBat || 0) + (ball.additionalRuns || 0);
        return acc;
    }, 0);
    const wickets = balls.filter(b => b.type === 'WICKET').length;

    const getBallLabel = (ball: BallEvent) => {
        if (ball.type === 'RUN') return ball.runs === 0 ? '•' : ball.runs;
        if (ball.type === 'EXTRA') return `${ball.extraType === 'WIDE' ? 'Wd' : ball.extraType === 'NO_BALL' ? 'NB' : ball.extraType === 'BYE' ? 'B' : 'LB'}`;
        if (ball.type === 'WICKET') return 'W';
        return '?';
    };

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm">
            <div className={clsx(
                "bg-card border border-border rounded-xl shadow-lg p-3",
                "animate-in fade-in slide-in-from-bottom-4 duration-300",
                "flex flex-col gap-1.5"
            )}>
                <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">
                        End of Over {overNumber}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                        {totalRuns} runs{wickets > 0 ? `, ${wickets} wkt` : ''}
                    </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{bowlerName}</span>
                    <span className="font-medium text-foreground">{bowlerFigures}</span>
                </div>
                <div className="flex items-center gap-1 mt-1 overflow-x-auto pb-1 no-scrollbar">
                    {balls.map((ball, i) => (
                        <div key={i} className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                            {getBallLabel(ball)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
