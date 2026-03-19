import { useState } from 'react';
import { clsx } from 'clsx';
import { Loader2, RotateCcw, Settings } from 'lucide-react';
import { useScoringStore } from '../scoringStore';
import { WicketFlowSheet } from './wicket/WicketFlowSheet';
import { UndoBottomSheet } from './UndoBottomSheet';
import { ExtraSheet } from './ExtraSheet';
import { MatchSettingsMenu } from './MatchSettingsMenu';
import { WagonWheelInput } from './WagonWheelInput';
import { RainBreakSheet } from './RainBreakSheet';
import { SuperOverFlow } from './SuperOverFlow';

/**
 * ScoringPad — Premium cricket scoring input grid.
 *
 * Layout:
 * Row 1: [0] [1] [2] [3] [4] [6]  — Run buttons
 * Row 2: [Wide] [NB] [Bye] [LB]   — Extras
 * Row 3: [WICKET] [UNDO] [⚙️]     — Actions
 *
 * Each button calls the appropriate store action.
 */
export const ScoringPad = () => {
    const recordBall = useScoringStore((s) => s.recordBall);
    const isSubmitting = useScoringStore((s) => s.isSubmitting);
    const matchState = useScoringStore((s) => s.matchState);
    const startWicketFlow = useScoringStore((s) => s.startWicketFlow);
    const derivedState = useScoringStore((s) => s.derivedState);

    const isWagonWheelEnabled = useScoringStore((s) => s.isWagonWheelEnabled);
    const recordWagonWheel = useScoringStore((s) => s.recordWagonWheel);

    const [showUndo, setShowUndo] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showWagonWheel, setShowWagonWheel] = useState(false);
    const [showRainBreak, setShowRainBreak] = useState(false);
    const [activeExtra, setActiveExtra] = useState<'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | null>(null);

    const isMatchLive = matchState?.status === 'LIVE';
    const isComplete = !!derivedState?.matchResult;
    const isDisabled = !isMatchLive || isComplete;

    const handleRun = async (runs: 0 | 1 | 2 | 3 | 4 | 6) => {
        await recordBall({ type: 'RUN', runs });
        if (isWagonWheelEnabled && runs > 0) {
            setShowWagonWheel(true);
        }
    };

    return (
        <div className="relative p-3 bg-card rounded-t-2xl border-t border-x border-border shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
            {/* Submitting spinner */}
            {isSubmitting && (
                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                    <Loader2 size={14} className="text-primary animate-spin" />
                </div>
            )}

            <div className={clsx(
                "flex flex-col gap-2 transition-opacity",
                isDisabled && "opacity-30 pointer-events-none"
            )}>
                {/* ─── Row 1: Run Buttons ─── */}
                <div className="grid grid-cols-6 gap-1.5">
                    {([0, 1, 2, 3, 4, 6] as const).map(runs => (
                        <button
                            key={runs}
                            onClick={() => handleRun(runs)}
                            disabled={isDisabled}
                            className={clsx(
                                "h-14 rounded-xl font-bold text-xl transition-all active:scale-[0.92] flex items-center justify-center select-none",
                                runs === 4
                                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                                    : runs === 6
                                        ? "bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25"
                                        : runs === 0
                                            ? "bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 text-base font-medium"
                                            : "bg-card border border-border text-foreground hover:bg-secondary"
                            )}
                        >
                            {runs === 0 ? '•' : runs}
                        </button>
                    ))}
                </div>

                {/* ─── Row 2: Extras ─── */}
                <div className="grid grid-cols-4 gap-1.5">
                    {(['WIDE', 'NO_BALL', 'BYE', 'LEG_BYE'] as const).map(extra => (
                        <button
                            key={extra}
                            onClick={() => setActiveExtra(extra)}
                            disabled={isDisabled}
                            className="h-11 rounded-xl text-[11px] font-bold transition-all active:scale-[0.93] flex items-center justify-center select-none
                                       bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground uppercase tracking-wider"
                        >
                            {extra === 'WIDE' ? 'WD' : extra === 'NO_BALL' ? 'NB' : extra === 'BYE' ? 'B' : 'LB'}
                        </button>
                    ))}
                </div>

                {/* ─── Row 3: WICKET + UNDO + Settings ─── */}
                <div className="grid grid-cols-3 gap-1.5">
                    <button
                        onClick={startWicketFlow}
                        disabled={isDisabled}
                        className="h-12 rounded-xl font-bold text-sm transition-all active:scale-[0.93] flex items-center justify-center select-none
                                   bg-destructive text-destructive-foreground border border-destructive/50 shadow-sm shadow-destructive/20
                                   hover:bg-destructive/90 uppercase tracking-wider"
                    >
                        WICKET
                    </button>
                    <button
                        onClick={() => setShowUndo(true)}
                        disabled={isDisabled}
                        className="h-12 rounded-xl text-xs font-semibold transition-all active:scale-[0.93] flex items-center justify-center gap-1.5 select-none
                                   bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        UNDO
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        disabled={isDisabled}
                        className="h-12 rounded-xl text-xs font-semibold transition-all active:scale-[0.93] flex items-center justify-center gap-1.5 select-none
                                   bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                    >
                        <Settings className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Bottom Sheets */}
            <WicketFlowSheet />
            <UndoBottomSheet isOpen={showUndo} onClose={() => setShowUndo(false)} />
            <MatchSettingsMenu isOpen={showSettings} onClose={() => setShowSettings(false)} onRainBreak={() => setShowRainBreak(true)} />
            <ExtraSheet extraType={activeExtra} onClose={() => setActiveExtra(null)} />
            <RainBreakSheet isOpen={showRainBreak} onClose={() => setShowRainBreak(false)} />
            <SuperOverFlow />

            {/* Wagon Wheel Overlay */}
            {showWagonWheel && (
                <WagonWheelInput 
                    batsmanName={
                        derivedState?.innings[derivedState.currentInningsIndex]?.strikerId
                            ? matchState?.teamA?.players?.find(p => p.id === derivedState.innings[derivedState.currentInningsIndex].strikerId)?.name 
                              || matchState?.teamB?.players?.find(p => p.id === derivedState.innings[derivedState.currentInningsIndex].strikerId)?.name
                            : "Batsman"
                    }
                    onSave={(angle, dist) => {
                        recordWagonWheel(angle, dist);
                        setShowWagonWheel(false);
                    }}
                    onSkip={() => setShowWagonWheel(false)}
                />
            )}
        </div>
    );
};
