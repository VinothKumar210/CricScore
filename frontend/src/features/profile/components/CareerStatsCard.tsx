import { Target, Swords } from 'lucide-react';
import { clsx } from 'clsx';
import { FormSparkline } from './FormSparkline';

interface CareerStats {
    matchesBatted: number;
    totalRuns: number;
    battingAverage: number;
    battingSR: number;
    highestScore: number;
    fifties: number;
    hundreds: number;
    ducks: number;
    recentScores?: number[];
    
    matchesBowled: number;
    totalWickets: number;
    bowlingAverage: number;
    bowlingEconomy: number;
    bowlingSR: number;
    bestBowling: string;
    fiveWickets: number;
    recentWickets?: number[];
}

interface Props {
    stats: CareerStats | null;
    isLoading?: boolean;
}

export const CareerStatsCard = ({ stats, isLoading }: Props) => {
    if (isLoading) {
        return <div className="h-64 bg-card rounded-2xl animate-pulse" />;
    }

    if (!stats) {
        return (
            <div className="bg-card rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
                No career stats available yet.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Batting Stats */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Swords className="w-5 h-5 text-primary" />
                        Batting Career
                    </h3>
                    <div className="text-sm font-medium text-muted-foreground">
                        {stats.matchesBatted} <span className="text-xs">Inns</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <StatBox label="Runs" value={stats.totalRuns} highlight />
                    <StatBox label="Average" value={stats.battingAverage.toFixed(1)} />
                    <StatBox label="Strike Rate" value={stats.battingSR.toFixed(1)} />
                    <StatBox label="High Score" value={stats.highestScore} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex gap-4">
                        <MiniStat label="100s" value={stats.hundreds} />
                        <MiniStat label="50s" value={stats.fifties} />
                        <MiniStat label="0s" value={stats.ducks} />
                    </div>
                    {stats.recentScores && stats.recentScores.length > 0 && (
                        <div className="w-24">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Form</span>
                            <FormSparkline data={stats.recentScores} type="batting" />
                        </div>
                    )}
                </div>
            </div>

            {/* Bowling Stats */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        Bowling Career
                    </h3>
                    <div className="text-sm font-medium text-muted-foreground">
                        {stats.matchesBowled} <span className="text-xs">Inns</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <StatBox label="Wickets" value={stats.totalWickets} highlight />
                    <StatBox label="Economy" value={stats.bowlingEconomy.toFixed(2)} />
                    <StatBox label="Average" value={stats.bowlingAverage.toFixed(1)} />
                    <StatBox label="Strike Rate" value={stats.bowlingSR.toFixed(1)} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex gap-4">
                        <MiniStat label="BBI" value={stats.bestBowling || '-'} />
                        <MiniStat label="5W" value={stats.fiveWickets} />
                    </div>
                    {stats.recentWickets && stats.recentWickets.length > 0 && (
                        <div className="w-24">
                             <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Form</span>
                            <FormSparkline data={stats.recentWickets} type="bowling" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) => (
    <div className={clsx("p-3 rounded-xl border", highlight ? "bg-primary/10 border-primary/20" : "bg-card border-border")}>
        <div className="text-xs text-muted-foreground mb-1 font-medium">{label}</div>
        <div className={clsx("text-2xl font-bold tabular-nums", highlight ? "text-primary" : "text-foreground")}>
            {value}
        </div>
    </div>
);

const MiniStat = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
        <span className="text-sm font-bold tabular-nums text-foreground">{value}</span>
    </div>
);
