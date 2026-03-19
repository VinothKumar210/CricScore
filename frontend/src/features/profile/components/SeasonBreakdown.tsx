import React from 'react';

export interface SeasonStats {
    season: string;
    matchesPlayed: number;
    runs: number;
    highestScore: number;
    wickets: number;
    bestBowling?: string;
}

interface Props {
    stats: SeasonStats[];
}

export const SeasonBreakdown = ({ stats }: Props) => {
    if (!stats || stats.length === 0) return null;

    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden mt-4">
            <div className="px-4 py-3 border-b border-border bg-background/50">
                <h3 className="text-sm font-semibold text-foreground">Season Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-muted-foreground text-left text-xs uppercase tracking-wider border-b border-border">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Season</th>
                            <th className="px-3 py-3 font-semibold text-right">M</th>
                            <th className="px-3 py-3 font-semibold text-right">Runs</th>
                            <th className="px-3 py-3 font-semibold text-right">HS</th>
                            <th className="px-3 py-3 font-semibold text-right">Wkts</th>
                            <th className="px-4 py-3 font-semibold text-right">BBI</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {stats.map((s) => (
                            <tr key={s.season} className="hover:bg-secondary/20 transition-colors">
                                <td className="px-4 py-3 font-medium text-foreground">{s.season}</td>
                                <td className="px-3 py-3 tabular-nums text-right">{s.matchesPlayed}</td>
                                <td className="px-3 py-3 tabular-nums text-right font-medium text-primary">{s.runs}</td>
                                <td className="px-3 py-3 tabular-nums text-right text-muted-foreground">{s.highestScore}</td>
                                <td className="px-3 py-3 tabular-nums text-right font-medium text-emerald-500">{s.wickets}</td>
                                <td className="px-4 py-3 tabular-nums text-right text-muted-foreground">{s.bestBowling || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
