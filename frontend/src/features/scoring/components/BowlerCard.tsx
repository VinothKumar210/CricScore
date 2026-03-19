import React from 'react';
import { useScoringStore } from '../scoringStore';
import { useShallow } from 'zustand/react/shallow';

/**
 * BowlerCard — Current bowler stats: O, M, R, W, Eco
 */
export const BowlerCard = React.memo(() => {
    const bowlingStats = useScoringStore(
        useShallow((s) => s.getBowlingStats())
    );

    // Show the current (last) bowler most prominently
    const currentBowler = bowlingStats.length > 0 ? bowlingStats[bowlingStats.length - 1] : null;

    if (!currentBowler) return null;

    return (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-muted-foreground bg-secondary/40">
                        <th className="text-left py-2 px-3 font-medium">Bowler</th>
                        <th className="text-right py-2 px-1.5 font-medium w-8">O</th>
                        <th className="text-right py-2 px-1.5 font-medium w-8">M</th>
                        <th className="text-right py-2 px-1.5 font-medium w-8">R</th>
                        <th className="text-right py-2 px-1.5 font-medium w-8">W</th>
                        <th className="text-right py-2 px-3 font-medium w-12">Eco</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-t border-border/30">
                        <td className="py-2.5 px-3 font-semibold truncate max-w-[120px]">
                            {currentBowler.bowlerId}
                        </td>
                        <td className="text-right py-2.5 px-1.5 tabular-nums text-foreground">{currentBowler.overs}</td>
                        <td className="text-right py-2.5 px-1.5 tabular-nums text-muted-foreground">{currentBowler.maidens}</td>
                        <td className="text-right py-2.5 px-1.5 tabular-nums text-foreground">{currentBowler.runsConceded}</td>
                        <td className="text-right py-2.5 px-1.5 tabular-nums font-bold text-destructive">{currentBowler.wickets}</td>
                        <td className="text-right py-2.5 px-3 tabular-nums text-muted-foreground">{currentBowler.economy}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
});

BowlerCard.displayName = 'BowlerCard';
