import React from 'react';
import { useScoringStore } from '../scoringStore';
import { clsx } from 'clsx';
import { SkipBack, Play, History } from 'lucide-react';

export const ReplaySlider: React.FC = () => {
    const replayIndex = useScoringStore((s) => s.replayIndex);
    const setReplayIndex = useScoringStore((s) => s.setReplayIndex);
    const events = useScoringStore((s) => s.events);
    const matchState = useScoringStore((s) => s.matchState);

    // Only visible in spectator mode (not scorer mode).
    // We can infer spectator mode by absence of wicket flow/ability to edit?
    // Based on requirements, "Only visible in spectator mode."
    // In our app, spectator mode is `/live` not `/score`. The `MatchLiveShell` is shared.
    // We can use a prop or infer it from the router/store.
    // Since `ControlPad` has disabled states, we can check if `matchState?.status === 'LIVE'` and user has scorer access.
    // The requirement says "Inside MatchLiveShell. Only visible in spectator mode." 
    // To cleanly handle this, we can check if window.location.pathname includes '/live'
    const isSpectatorMode = typeof window !== 'undefined' && window.location.pathname.includes('/live');

    if (!isSpectatorMode) return null;
    if (events.length === 0) return null;

    const maxIndex = events.length;
    const currentIndex = replayIndex !== null ? replayIndex : maxIndex;
    const isReplaying = replayIndex !== null;

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        if (val === maxIndex) {
            setReplayIndex(null); // Back to live
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
            isReplaying ? "bg-brand/5 border-brand/20" : "bg-white border-border"
        )}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <History className={clsx("w-4 h-4", isReplaying ? "text-brand animate-pulse" : "text-textSecondary")} />
                    <span className="text-sm font-semibold text-textPrimary uppercase tracking-wider">
                        Timeline Replay
                    </span>
                </div>
                {isReplaying && (
                    <button
                        onClick={handleBackToLive}
                        className="flex items-center gap-1.5 px-3 py-1 bg-brand text-white text-xs font-bold rounded-full shadow-sm hover:bg-brand/90 transition-colors"
                    >
                        <Play className="w-3 h-3 fill-current" />
                        BACK TO LIVE
                    </button>
                )}
                {!isReplaying && matchState?.status === "LIVE" && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-danger/10 text-danger text-[10px] font-bold rounded uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                        LIVE
                    </span>
                )}
            </div>

            <div className="flex items-center gap-3">
                <SkipBack className="w-4 h-4 text-textSecondary flex-shrink-0" />
                <div className="relative flex-1 group">
                    <input
                        type="range"
                        min={0}
                        max={maxIndex}
                        value={currentIndex}
                        onChange={handleSliderChange}
                        className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-brand focus:outline-none focus:ring-2 focus:ring-brand/30 transition-all"
                    />
                    <div className="absolute -bottom-5 w-full flex justify-between px-1 pointer-events-none">
                        <span className="text-[10px] font-medium text-textSecondary uppercase tracking-wider">Start</span>
                        <span className="text-[10px] font-medium text-textSecondary uppercase tracking-wider">{maxIndex} balls</span>
                    </div>
                </div>
            </div>
            {isReplaying && (
                <div className="mt-4 text-center">
                    <span className="text-xs font-medium text-textSecondary">
                        Viewing ball <span className="text-brand font-bold">{currentIndex}</span> of {maxIndex}
                    </span>
                </div>
            )}
        </div>
    );
};
