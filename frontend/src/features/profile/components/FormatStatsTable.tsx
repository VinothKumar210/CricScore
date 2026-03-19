import { useState } from 'react';
import { clsx } from 'clsx';

export interface FormatStats {
    format: string;
    matchesPlayed: number;
    runs: number;
    highestScore: number;
    battingAverage: number;
    battingSR: number;
    wickets: number;
    bestBowling?: string;
    bowlingEconomy: number;
}

interface Props {
    stats: FormatStats[];
}

export const FormatStatsTable = ({ stats }: Props) => {
    const [activeTab, setActiveTab] = useState<'BATTING' | 'BOWLING'>('BATTING');

    if (!stats || stats.length === 0) return null;

    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/50">
                <h3 className="text-sm font-semibold text-foreground">Format Records</h3>
                <div className="flex bg-secondary rounded-lg p-0.5">
                    <button
                        onClick={() => setActiveTab('BATTING')}
                        className={clsx("px-3 py-1 text-xs font-medium rounded-md transition-all", activeTab === 'BATTING' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                    >
                        Batting
                    </button>
                    <button
                        onClick={() => setActiveTab('BOWLING')}
                        className={clsx("px-3 py-1 text-xs font-medium rounded-md transition-all", activeTab === 'BOWLING' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                    >
                        Bowling
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-muted-foreground text-left text-xs uppercase tracking-wider border-b border-border">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Format</th>
                            <th className="px-3 py-3 font-semibold text-right">M</th>
                            {activeTab === 'BATTING' ? (
                                <>
                                    <th className="px-3 py-3 font-semibold text-right">Runs</th>
                                    <th className="px-3 py-3 font-semibold text-right">Avg</th>
                                    <th className="px-3 py-3 font-semibold text-right">SR</th>
                                    <th className="px-4 py-3 font-semibold text-right">HS</th>
                                </>
                            ) : (
                                <>
                                    <th className="px-3 py-3 font-semibold text-right">Wkts</th>
                                    <th className="px-3 py-3 font-semibold text-right">Econ</th>
                                    <th className="px-4 py-3 font-semibold text-right">BBI</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {stats.map((s) => (
                            <tr key={s.format} className="hover:bg-secondary/20 transition-colors">
                                <td className="px-4 py-3 font-medium text-foreground">{s.format}</td>
                                <td className="px-3 py-3 tabular-nums text-right">{s.matchesPlayed}</td>
                                {activeTab === 'BATTING' ? (
                                    <>
                                        <td className="px-3 py-3 tabular-nums text-right font-medium">{s.runs}</td>
                                        <td className="px-3 py-3 tabular-nums text-right text-muted-foreground">{s.battingAverage.toFixed(1)}</td>
                                        <td className="px-3 py-3 tabular-nums text-right text-muted-foreground">{s.battingSR.toFixed(1)}</td>
                                        <td className="px-4 py-3 tabular-nums text-right text-foreground font-semibold">{s.highestScore}</td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-3 py-3 tabular-nums text-right font-bold">{s.wickets}</td>
                                        <td className="px-3 py-3 tabular-nums text-right text-muted-foreground">{s.bowlingEconomy.toFixed(2)}</td>
                                        <td className="px-4 py-3 tabular-nums text-right font-medium text-foreground">{s.bestBowling || '-'}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
