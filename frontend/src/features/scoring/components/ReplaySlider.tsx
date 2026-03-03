import React from 'react';
import { useScoringStore } from '../scoringStore';
import { clsx } from 'clsx';
import { SkipBack, Play, History } from 'lucide-react';

/**
 * ReplaySlider — Timeline scrubber for spectator mode.
 * Only visible on /live routes.
 */
export const ReplaySlider: React.FC = () => {
    const replayIndex = useScoringStore((s) => s.replayIndex);
    const setReplayIndex = useScoringStore((s) => s.setReplayIndex);
    const events = useScoringStore((s) => s.events);
    const matchState = useScoringStore((s) => s.matchState);

    const isSpectatorMode = typeof window !== 'undefined' && window.location.pathname.includes('/live');

    if (!isSpectatorMode) return null;
    if (events.length === 0) return null;

    const maxIndex = events.length;
    const currentIndex = replayIndex !== null ? replayIndex : maxIndex;
    const isReplaying = replayIndex !== null;

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        if (val === maxIndex) {
            setReplayIndex(null);
        } else {
            setReplayIndex(val);
        }
    };

    const handleBackToLive = () => {
        setReplayIndex(null);
    };

    return (
        <div className={clsx(
            "mx-3 mt-3 p-3 rounded-xl border transition-all duration-300 shadow-sm",
            isReplaying ? "bg-primary/5 border-primary/20" : "bg-card border-border"
        )}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <History className={clsx("w-4 h-4", isReplaying ? "text-primary animate-pulse" : "text-muted-foreground")} />
                    <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        Timeline Replay
                    </span>
                </div>
                {isReplaying && (
                    <button
                        onClick={handleBackToLive}
                        className="flex items-center gap-1.5 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-sm shadow-primary/20 hover:bg-primary/90 transition-colors"
                    >
                        <Play className="w-3 h-3 fill-current" />
                        BACK TO LIVE
                    </button>
                )}
                {!isReplaying && matchState?.status === "LIVE" && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-destructive/10 text-destructive text-[10px] font-bold rounded uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                        LIVE
                    </span>
                )}
            </div>

            <div className="flex items-center gap-3">
                <SkipBack className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="relative flex-1 group">
                    <input
                        type="range"
                        min={0}
                        max={maxIndex}
                        value={currentIndex}
                        onChange={handleSliderChange}
                        className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                    <div className="absolute -bottom-5 w-full flex justify-between px-1 pointer-events-none">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Start</span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider tabular-nums">{maxIndex} balls</span>
                    </div>
                </div>
            </div>
            {isReplaying && (
                <div className="mt-4 text-center">
                    <span className="text-xs font-medium text-muted-foreground">
                        Viewing ball <span className="text-primary font-bold tabular-nums">{currentIndex}</span> of {maxIndex}
                    </span>
                </div>
            )}
        </div>
    );
};
