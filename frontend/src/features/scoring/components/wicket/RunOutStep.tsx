import { useState } from 'react';
import { clsx } from 'clsx';
import type { Player } from '../../../matches/types/domainTypes';

interface RunOutStepProps {
    striker: Player;
    nonStriker: Player;
    onSelect: (data: { playerOutId: string; completedRuns: number }) => void;
    onBack: () => void;
}

/**
 * RunOutStep — Specific flow for Run Out dismissal.
 * 1. Who was run out? (Striker or Non-Striker)
 * 2. How many runs were completed before the dismissal? (0, 1, 2, 3)
 */
export const RunOutStep = ({ striker, nonStriker, onSelect, onBack }: RunOutStepProps) => {
    const [playerOutId, setPlayerOutId] = useState<string | null>(null);
    const [completedRuns, setCompletedRuns] = useState<number | null>(null);

    const handleConfirm = () => {
        if (playerOutId && completedRuns !== null) {
            onSelect({ playerOutId, completedRuns });
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex items-center mb-5">
                <button
                    onClick={onBack}
                    className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 -ml-2 transition-colors"
                >
                    ← Back
                </button>
            </div>

            <div className="space-y-6">
                {/* 1. Who is out? */}
                <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Who was run out?</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { id: striker.id, name: striker.name, role: 'Striker' },
                            { id: nonStriker.id, name: nonStriker.name, role: 'Non-Striker' }
                        ].map((p) => {
                            const isSelected = playerOutId === p.id;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => setPlayerOutId(p.id)}
                                    className={clsx(
                                        "p-3 rounded-xl border text-left flex flex-col justify-center transition-all active:scale-[0.96]",
                                        isSelected
                                            ? "bg-destructive/10 border-destructive text-destructive"
                                            : "bg-card border-border hover:bg-secondary text-foreground"
                                    )}
                                >
                                    <span className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">{p.role}</span>
                                    <span className="font-bold truncate w-full">{p.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Runs Completed */}
                <div className={clsx("transition-opacity duration-300", !playerOutId ? "opacity-30 pointer-events-none" : "opacity-100")}>
                    <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Runs completed before dismissal?</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {[0, 1, 2, 3].map((r) => {
                            const isSelected = completedRuns === r;
                            return (
                                <button
                                    key={r}
                                    onClick={() => setCompletedRuns(r)}
                                    className={clsx(
                                        "h-14 rounded-xl font-bold text-xl transition-all active:scale-[0.92]",
                                        isSelected
                                            ? "bg-primary text-primary-foreground border-transparent shadow-md shadow-primary/20"
                                            : "bg-card border border-border text-foreground hover:bg-secondary"
                                    )}
                                >
                                    {r}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Confirm */}
                <div className={clsx("pt-4 transition-opacity duration-300", (!playerOutId || completedRuns === null) ? "opacity-0 pointer-events-none" : "opacity-100")}>
                    <button
                        onClick={handleConfirm}
                        className="w-full h-12 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm
                                   shadow-sm shadow-destructive/20 hover:bg-destructive/90 transition-all active:scale-[0.98]"
                    >
                        Confirm Run Out
                    </button>
                </div>
            </div>
        </div>
    );
};
