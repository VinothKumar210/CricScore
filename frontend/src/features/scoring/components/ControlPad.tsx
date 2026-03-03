import { clsx } from 'clsx';
import { Loader2, RotateCcw, ArrowLeftRight, UserMinus } from 'lucide-react';
import { useScoringStore } from '../scoringStore';
import { WicketFlowSheet } from './wicket/WicketFlowSheet';

/**
 * ControlPad — Premium cricket scoring pad.
 *
 * Layout optimized for UX:
 * - Row 1: Run buttons (0–6) — large, main actions, easy thumb reach
 * - Row 2: Extras (WD, NB, B, LB) + OUT — secondary actions
 * - Row 3: Operations (Undo, Swap, Retire) — tertiary
 *
 * Design:
 * - Run buttons: large 56px, numbers prominent, 4 and 6 highlighted
 * - OUT: full-width destructive red with glow
 * - Extras: compact, outlined style
 * - Ops: ghost style, bottom row
 */
export const ControlPad = () => {
    const recordBall = useScoringStore((state) => state.recordBall);
    const undo = useScoringStore((state) => state.undo);
    const isSubmitting = useScoringStore((state) => state.isSubmitting);
    const matchState = useScoringStore((state) => state.matchState);
    const startWicketFlow = useScoringStore((state) => state.startWicketFlow);
    const derivedState = useScoringStore((state) => state.derivedState);

    const isMatchLive = matchState?.status === 'LIVE';
    const isComplete = !!derivedState?.matchResult;
    const isDisabled = isSubmitting || !isMatchLive || isComplete;

    const handleRun = (runs: 0 | 1 | 2 | 3 | 4 | 6) => {
        recordBall({ type: 'RUN', runs });
    };

    const handleExtra = (extraType: "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE") => {
        recordBall({
            type: "EXTRA",
            extraType,
            runsOffBat: 0,
            additionalRuns: 0
        });
    };

    return (
        <div className="relative p-3 bg-card rounded-xl border border-border shadow-sm">
            {/* Spinner Overlay */}
            {isSubmitting && (
                <div className="absolute top-2 right-2 text-primary animate-spin z-10 pointer-events-none">
                    <Loader2 size={16} />
                </div>
            )}

            <div className={clsx(
                "flex flex-col gap-2.5 transition-opacity",
                isDisabled && "opacity-40 pointer-events-none"
            )}>
                {/* ─── Row 1: Run Buttons ─── */}
                <div className="grid grid-cols-6 gap-2">
                    {([0, 1, 2, 3, 4, 6] as const).map(runs => (
                        <button
                            key={runs}
                            onClick={() => handleRun(runs)}
                            disabled={isDisabled}
                            className={clsx(
                                "h-14 rounded-xl font-bold text-xl transition-all active:scale-[0.93] flex items-center justify-center select-none",
                                runs === 4
                                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 active:bg-emerald-500/30"
                                    : runs === 6
                                        ? "bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 active:bg-primary/30"
                                        : runs === 0
                                            ? "bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 text-base"
                                            : "bg-card border border-border text-foreground hover:bg-secondary active:bg-secondary/80"
                            )}
                        >
                            {runs === 0 ? '•' : runs}
                        </button>
                    ))}
                </div>

                {/* ─── Row 2: OUT + Extras ─── */}
                <div className="grid grid-cols-5 gap-2">
                    {/* OUT — Wider, prominent */}
                    <button
                        onClick={startWicketFlow}
                        disabled={isDisabled}
                        className="col-span-1 h-12 rounded-xl font-bold text-sm transition-all active:scale-[0.93] flex items-center justify-center select-none
                                   bg-destructive text-destructive-foreground border border-destructive/50 shadow-sm shadow-destructive/20
                                   hover:bg-destructive/90 active:bg-destructive/80"
                    >
                        OUT
                    </button>

                    {/* Extras */}
                    <button onClick={() => handleExtra("WIDE")} disabled={isDisabled} className={extraBtnClass}>
                        WD
                    </button>
                    <button onClick={() => handleExtra("NO_BALL")} disabled={isDisabled} className={extraBtnClass}>
                        NB
                    </button>
                    <button onClick={() => handleExtra("BYE")} disabled={isDisabled} className={extraBtnClass}>
                        B
                    </button>
                    <button onClick={() => handleExtra("LEG_BYE")} disabled={isDisabled} className={extraBtnClass}>
                        LB
                    </button>
                </div>

                {/* ─── Row 3: Operations ─── */}
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={undo}
                        disabled={isDisabled}
                        className="h-10 rounded-lg text-xs font-semibold transition-all active:scale-[0.95] flex items-center justify-center gap-1.5 select-none
                                   bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Undo
                    </button>
                    <button
                        disabled={isDisabled}
                        className="h-10 rounded-lg text-xs font-semibold transition-all active:scale-[0.95] flex items-center justify-center gap-1.5 select-none
                                   bg-transparent border border-dashed border-border text-muted-foreground hover:bg-card hover:text-foreground"
                    >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        Swap
                    </button>
                    <button
                        disabled={isDisabled}
                        className="h-10 rounded-lg text-xs font-semibold transition-all active:scale-[0.95] flex items-center justify-center gap-1.5 select-none
                                   bg-transparent border border-dashed border-border text-muted-foreground hover:bg-card hover:text-foreground"
                    >
                        <UserMinus className="w-3.5 h-3.5" />
                        Retire
                    </button>
                </div>
            </div>

            {/* Wicket Flow Sheet */}
            <WicketFlowSheet />
        </div>
    );
};

const extraBtnClass = clsx(
    "h-12 rounded-xl font-bold text-xs transition-all active:scale-[0.93] flex items-center justify-center select-none",
    "bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
);
