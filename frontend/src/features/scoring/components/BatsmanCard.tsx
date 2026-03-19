import React from 'react';
import { useScoringStore } from '../scoringStore';
import { useShallow } from 'zustand/react/shallow';
import { clsx } from 'clsx';

/**
 * BatsmanCard — Shows striker (*) and non-striker stats in a clean table.
 * Columns: R, B, 4s, 6s, SR
 */
export const BatsmanCard = React.memo(() => {
    const batsmanStats = useScoringStore(
        useShallow((s) => s.getBatsmanStats())
    );

    // Only show the active (not-out) batsmen
    const activeBatsmen = batsmanStats.filter(b => !b.isOut);

    if (activeBatsmen.length === 0) return null;

    return (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-muted-foreground bg-secondary/40">
                        <th className="text-left py-2 px-3 font-medium">Batter</th>
                        <th className="text-right py-2 px-1.5 font-medium w-8">R</th>
                        <th className="text-right py-2 px-1.5 font-medium w-8">B</th>
                        <th className="text-right py-2 px-1.5 font-medium w-8">4s</th>
                        <th className="text-right py-2 px-1.5 font-medium w-8">6s</th>
                        <th className="text-right py-2 px-3 font-medium w-12">SR</th>
                    </tr>
                </thead>
                <tbody>
                    {activeBatsmen.map((b, i) => (
                        <tr
                            key={b.playerId}
                            className={clsx(
                                "border-t border-border/30 transition-colors",
                                i === 0 && "bg-primary/[0.03]" // Striker highlight
                            )}
                        >
                            <td className="py-2.5 px-3 font-semibold flex items-center gap-1.5">
                                {i === 0 && (
                                    <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px] font-black shrink-0">
                                        *
                                    </span>
                                )}
                                <span className="truncate max-w-[100px]">{b.playerId}</span>
                            </td>
                            <td className="text-right py-2.5 px-1.5 tabular-nums font-bold text-foreground">{b.runs}</td>
                            <td className="text-right py-2.5 px-1.5 tabular-nums text-muted-foreground">{b.balls}</td>
                            <td className="text-right py-2.5 px-1.5 tabular-nums text-emerald-500">{b.fours}</td>
                            <td className="text-right py-2.5 px-1.5 tabular-nums text-primary">{b.sixes}</td>
                            <td className="text-right py-2.5 px-3 tabular-nums text-muted-foreground">{b.strikeRate}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

BatsmanCard.displayName = 'BatsmanCard';
