import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import { useScoringStore } from '../scoringStore';
import { WicketFlowSheet } from './wicket/WicketFlowSheet';

export const ControlPad = () => {
    const recordBall = useScoringStore((state) => state.recordBall);
    const undo = useScoringStore((state) => state.undo);
    const isSubmitting = useScoringStore((state) => state.isSubmitting);
    const matchState = useScoringStore((state) => state.matchState);
    const startWicketFlow = useScoringStore((state) => state.startWicketFlow);
    const derivedState = useScoringStore((state) => state.derivedState);

    // Disable if submitting or match is not live or match is complete
    const isMatchLive = matchState?.status === 'LIVE';
    const isComplete = !!derivedState?.matchResult;
    const isDisabled = isSubmitting || !isMatchLive || isComplete;

    const handleRun = (runs: 0 | 1 | 2 | 3 | 4 | 6) => {
        recordBall({ type: 'RUN', runs });
    };

    const handleExtra = (extraType: "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE") => {
        // Simple extra event with defaults
        recordBall({
            type: "EXTRA",
            extraType,
            runsOffBat: 0,
            additionalRuns: 0
        });
    };

    return (
        <div className="relative p-3 bg-surface rounded-xl border border-border shadow-sm">
            {/* Spinner Overlay Indicator */}
            {isSubmitting && (
                <div className="absolute top-2 right-2 text-brand animate-spin z-10 pointer-events-none">
                    <Loader2 size={16} />
                </div>
            )}

            <div className="flex flex-col gap-4">
                <div
                    className={clsx(
                        "grid grid-cols-3 gap-3",
                        isDisabled && "opacity-50 pointer-events-none cursor-not-allowed"
                    )}
                >
                    {/* Row 1: Runs (0, 1, 2, 3, 4, 6) */}
                    {/* Note: 0 is dot ball, maps to RUN type with 0 runs */}
                    <button onClick={() => handleRun(0)} disabled={isDisabled} className={getBtnClass(isDisabled)}>0</button>
                    <button onClick={() => handleRun(1)} disabled={isDisabled} className={getBtnClass(isDisabled)}>1</button>
                    <button onClick={() => handleRun(2)} disabled={isDisabled} className={getBtnClass(isDisabled)}>2</button>
                    <button onClick={() => handleRun(3)} disabled={isDisabled} className={getBtnClass(isDisabled)}>3</button>
                    <button onClick={() => handleRun(4)} disabled={isDisabled} className={getBtnClass(isDisabled)}>4</button>
                    <button onClick={() => handleRun(6)} disabled={isDisabled} className={getBtnClass(isDisabled)}>6</button>

                    {/* Wicket Button - Triggers Flow */}
                    <button
                        onClick={startWicketFlow}
                        disabled={isDisabled}
                        className={clsx(
                            "h-14 rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center shadow-sm select-none",
                            "bg-red-500 border border-red-600 text-white hover:bg-red-600 active:bg-red-700",
                            isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        OUT
                    </button>

                    {/* Other Buttons */}
                    <button onClick={() => handleExtra("WIDE")} disabled={isDisabled} className={getBtnClass(isDisabled, true)}>WD</button>
                    <button onClick={() => handleExtra("NO_BALL")} disabled={isDisabled} className={getBtnClass(isDisabled, true)}>NB</button>
                    <button onClick={() => handleExtra("BYE")} disabled={isDisabled} className={getBtnClass(isDisabled, true)}>B</button>
                    <button onClick={() => handleExtra("LEG_BYE")} disabled={isDisabled} className={getBtnClass(isDisabled, true)}>LB</button>

                    <button
                        onClick={undo}
                        disabled={isDisabled}
                        className={clsx(
                            "h-14 rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center shadow-sm select-none",
                            "bg-gray-200 border border-gray-300 text-textSecondary hover:bg-gray-300 active:bg-gray-400",
                            isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        UNDO
                    </button>

                    {/* Row 4: Ops (Swap, Retire) */}
                    <button disabled={isDisabled} className={getGhostClass(isDisabled)}>Swap</button>
                    <button disabled={isDisabled} className={getGhostClass(isDisabled)}>Retire</button>
                    <div />
                </div>
            </div>

            {/* Wicket Flow Logic is handled by the Sheet component which observes the store */}
            <WicketFlowSheet />
        </div>
    );
};

// Helper for classes to keep JSX clean
const getBtnClass = (disabled: boolean, isSecondary = false) => clsx(
    "h-14 rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center shadow-sm select-none",
    isSecondary
        ? "bg-surface border border-border text-textSecondary hover:bg-gray-100 active:bg-gray-200"
        : "bg-white border border-border text-textPrimary hover:bg-gray-50 active:bg-gray-100",
    disabled && "opacity-50 cursor-not-allowed"
);

const getGhostClass = (disabled: boolean) => clsx(
    "h-14 rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center shadow-sm select-none",
    "bg-transparent border border-border text-textSecondary border-dashed hover:bg-surface text-xs",
    disabled && "opacity-50 cursor-not-allowed"
);
