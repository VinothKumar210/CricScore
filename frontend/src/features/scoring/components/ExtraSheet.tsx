import { useState, useEffect } from 'react';
import { useScoringStore } from '../scoringStore';

type ExtraType = 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE';
type Step = 'RUNS' | 'NB_METHOD' | 'NB_BAT_RUNS' | 'NB_BYE_TYPE' | 'NB_BYE_RUNS';

interface ExtraSheetProps {
    extraType: ExtraType | null;
    onClose: () => void;
}

/**
 * ExtraSheet — Multi-step bottom sheet for recording extras.
 *
 * Flows:
 * - Wide:    "Runs taken?" [0,1,2,3,4] → all extras
 * - No Ball: "How scored?" → [Off Bat] → runs to batsman | [Bye/LB] → type → runs as extras
 * - Bye:     "How many?" [1,2,3,4] → extras
 * - Leg Bye: "How many?" [1,2,3,4] → extras
 */
export const ExtraSheet = ({ extraType, onClose }: ExtraSheetProps) => {
    const recordBall = useScoringStore((s) => s.recordBall);
    const [step, setStep] = useState<Step>('RUNS');
    const [nbByeType, setNbByeType] = useState<'BYE' | 'LEG_BYE'>('BYE');

    // Reset step when sheet opens with a new type
    useEffect(() => {
        if (extraType === 'NO_BALL') {
            setStep('NB_METHOD');
        } else {
            setStep('RUNS');
        }
    }, [extraType]);

    if (!extraType) return null;

    const title = (() => {
        switch (step) {
            case 'RUNS': return extraType === 'WIDE' ? 'Wide — Runs taken?' : `${extraType === 'BYE' ? 'Bye' : 'Leg Bye'} — How many?`;
            case 'NB_METHOD': return 'No Ball — How were runs scored?';
            case 'NB_BAT_RUNS': return 'No Ball — Runs off bat?';
            case 'NB_BYE_TYPE': return 'No Ball — Which type?';
            case 'NB_BYE_RUNS': return `No Ball + ${nbByeType === 'BYE' ? 'Bye' : 'Leg Bye'} — How many?`;
            default: return '';
        }
    })();

    // ── Wide Flow ──
    const handleWideRuns = (runs: number) => {
        recordBall({
            type: 'EXTRA',
            extraType: 'WIDE',
            runsOffBat: 0,
            additionalRuns: runs // Total wide penalty (1) + runs are handled by engine
        });
        onClose();
    };

    // ── Bye / Leg Bye Flow ──
    const handleByeRuns = (runs: number) => {
        recordBall({
            type: 'EXTRA',
            extraType: extraType as 'BYE' | 'LEG_BYE',
            runsOffBat: 0,
            additionalRuns: runs
        });
        onClose();
    };

    // ── No Ball: Off the Bat ──
    const handleNbBatRuns = (runs: number) => {
        recordBall({
            type: 'EXTRA',
            extraType: 'NO_BALL',
            runsOffBat: runs, // These go to the batsman
            additionalRuns: 0
        });
        onClose();
    };

    // ── No Ball: Bye/LB ──
    const handleNbByeRuns = (runs: number) => {
        recordBall({
            type: 'EXTRA',
            extraType: 'NO_BALL',
            runsOffBat: 0,
            additionalRuns: runs,
            // Engine will handle: 1 NB run + bye/lb runs
        });
        onClose();
    };

    const RunGrid = ({ options, onSelect }: { options: number[], onSelect: (n: number) => void }) => (
        <div className="grid grid-cols-5 gap-2">
            {options.map(n => (
                <button
                    key={n}
                    onClick={() => onSelect(n)}
                    className="h-14 rounded-xl bg-card border border-border text-foreground font-bold text-xl
                               hover:bg-secondary active:scale-[0.93] transition-all flex items-center justify-center"
                >
                    {n}
                </button>
            ))}
        </div>
    );

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl shadow-black/30 animate-in slide-in-from-bottom duration-200 border-t border-border">
                {/* Handle */}
                <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-2" />

                <div className="p-5 pt-2">
                    {/* Title */}
                    <h3 className="text-base font-bold text-foreground mb-4">{title}</h3>

                    {/* ── Wide: Pick runs ── */}
                    {extraType === 'WIDE' && step === 'RUNS' && (
                        <RunGrid options={[0, 1, 2, 3, 4]} onSelect={handleWideRuns} />
                    )}

                    {/* ── Bye / Leg Bye: Pick runs ── */}
                    {(extraType === 'BYE' || extraType === 'LEG_BYE') && step === 'RUNS' && (
                        <RunGrid options={[1, 2, 3, 4]} onSelect={handleByeRuns} />
                    )}

                    {/* ── No Ball: Method selection ── */}
                    {extraType === 'NO_BALL' && step === 'NB_METHOD' && (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setStep('NB_BAT_RUNS')}
                                className="h-16 rounded-xl bg-card border border-border text-foreground font-semibold text-sm
                                           hover:bg-secondary active:scale-[0.95] transition-all flex flex-col items-center justify-center gap-1"
                            >
                                <span className="text-lg">🏏</span>
                                Off the Bat
                            </button>
                            <button
                                onClick={() => setStep('NB_BYE_TYPE')}
                                className="h-16 rounded-xl bg-card border border-border text-foreground font-semibold text-sm
                                           hover:bg-secondary active:scale-[0.95] transition-all flex flex-col items-center justify-center gap-1"
                            >
                                <span className="text-lg">🔄</span>
                                Bye / Leg Bye
                            </button>
                        </div>
                    )}

                    {/* ── No Ball + Off Bat: Pick bat runs ── */}
                    {extraType === 'NO_BALL' && step === 'NB_BAT_RUNS' && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-3">1 no-ball run + runs to batsman</p>
                            <RunGrid options={[0, 1, 2, 3, 4, 6]} onSelect={handleNbBatRuns} />
                        </div>
                    )}

                    {/* ── No Ball + Bye Type: Pick Bye or LB ── */}
                    {extraType === 'NO_BALL' && step === 'NB_BYE_TYPE' && (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => { setNbByeType('BYE'); setStep('NB_BYE_RUNS'); }}
                                className="h-14 rounded-xl bg-card border border-border text-foreground font-bold text-sm
                                           hover:bg-secondary active:scale-[0.93] transition-all"
                            >
                                Bye
                            </button>
                            <button
                                onClick={() => { setNbByeType('LEG_BYE'); setStep('NB_BYE_RUNS'); }}
                                className="h-14 rounded-xl bg-card border border-border text-foreground font-bold text-sm
                                           hover:bg-secondary active:scale-[0.93] transition-all"
                            >
                                Leg Bye
                            </button>
                        </div>
                    )}

                    {/* ── No Ball + Bye/LB: Pick runs ── */}
                    {extraType === 'NO_BALL' && step === 'NB_BYE_RUNS' && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-3">
                                1 no-ball + {nbByeType === 'BYE' ? 'bye' : 'leg bye'} runs (all extras)
                            </p>
                            <RunGrid options={[0, 1, 2, 3, 4]} onSelect={handleNbByeRuns} />
                        </div>
                    )}

                    {/* Cancel */}
                    <button
                        onClick={onClose}
                        className="w-full mt-4 h-11 rounded-xl border border-border text-muted-foreground font-semibold text-sm
                                   hover:bg-secondary hover:text-foreground transition-all active:scale-[0.98]"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </>
    );
};
