import React from 'react';
import { Target, Shield } from 'lucide-react';
import { clsx } from 'clsx';

interface H2HStats {
    batsmanName: string;
    bowlerName: string;
    balls: number;
    runs: number;
    fours: number;
    sixes: number;
    dotBalls: number;
    dismissals: number;
}

interface Props {
    stats: H2HStats | null;
    isLoading?: boolean;
}

export const HeadToHeadCard = ({ stats, isLoading }: Props) => {
    if (isLoading) {
        return <div className="h-48 bg-card rounded-2xl animate-pulse" />;
    }

    if (!stats || stats.balls === 0) {
        return (
            <div className="bg-card rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
                No head-to-head records found for these players.
            </div>
        );
    }

    const strikeRate = (stats.runs / stats.balls) * 100;
    const dotPercentage = (stats.dotBalls / stats.balls) * 100;

    return (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Shield className="w-3 h-3" /> Batsman</span>
                    <span className="text-base font-bold text-foreground">{stats.batsmanName}</span>
                </div>
                <div className="text-sm font-black text-muted-foreground italic px-4">VS</div>
                <div className="flex flex-col text-right">
                    <span className="text-xs text-muted-foreground flex items-center justify-end gap-1"><Target className="w-3 h-3" /> Bowler</span>
                    <span className="text-base font-bold text-foreground">{stats.bowlerName}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <H2HStatBox label="Runs" value={stats.runs} highlight={stats.runs > 30} />
                <H2HStatBox label="Balls" value={stats.balls} />
                <H2HStatBox label="Dismissals" value={stats.dismissals} highlight={stats.dismissals > 0} highlightColor="text-destructive" />
                <H2HStatBox label="Strike Rate" value={strikeRate.toFixed(1)} />
            </div>

            <div className="flex items-center gap-6 pt-2">
                <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Boundaries</span>
                        <span className="font-medium text-foreground">{stats.fours}x 4s &middot; {stats.sixes}x 6s</span>
                    </div>
                </div>
                <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Dot Balls</span>
                        <span className="font-medium text-foreground">{dotPercentage.toFixed(1)}% ({stats.dotBalls})</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const H2HStatBox = ({ label, value, highlight = false, highlightColor = "text-primary" }: { label: string; value: string | number; highlight?: boolean; highlightColor?: string }) => (
    <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">{label}</span>
        <span className={clsx("text-xl font-bold tabular-nums", highlight ? highlightColor : "text-foreground")}>{value}</span>
    </div>
);
