import React from 'react';
import type { CareerStats } from '../profileService';
import { ArrowRight } from 'lucide-react';

interface CareerStatsGridProps {
    stats: CareerStats;
}

/**
 * CareerStatsGrid — 2x2 divided grid matching shadcn reference.
 * Section header + divide grid + "View Full Statistics" link.
 */
export const CareerStatsGrid: React.FC<CareerStatsGridProps> = React.memo(({ stats }) => {
    return (
        <div className="space-y-4">
            {/* Batting */}
            <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="p-6 pb-4 border-b border-border">
                    <h3 className="font-semibold leading-none tracking-tight">Career Statistics</h3>
                    <p className="text-sm text-muted-foreground mt-1.5">Batting Performance</p>
                </div>

                <div className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border">
                    <StatCell value={stats.battingAverage} label="Average" />
                    <StatCell value={stats.strikeRate} label="Strike Rate" />
                    <StatCell value={stats.innings} label="Innings" />
                    <StatCell value={stats.totalRuns?.toLocaleString()} label="Runs" />
                </div>

                <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                    <StatCell value={stats.highestScore} label="Highest" small />
                    <StatCell value={stats.fifties} label="50s" small />
                    <StatCell value={stats.hundreds} label="100s" small />
                </div>

                <div className="p-4 bg-secondary/30">
                    <button className="w-full text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1">
                        View Full Statistics
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Bowling */}
            <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="p-6 pb-4 border-b border-border">
                    <h3 className="font-semibold leading-none tracking-tight">Bowling</h3>
                    <p className="text-sm text-muted-foreground mt-1.5">All-time bowling figures</p>
                </div>

                <div className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border">
                    <StatCell value={stats.totalWickets} label="Wickets" />
                    <StatCell value={stats.bowlingAverage} label="Average" />
                    <StatCell value={stats.economy} label="Economy" />
                    <StatCell value={stats.bestBowling} label="Best" />
                </div>

                <div className="grid grid-cols-2 divide-x divide-border">
                    <StatCell value={stats.fiveWicketHauls} label="5-Wicket Hauls" small />
                    <StatCell value={stats.innings} label="Overs Bowled" small />
                </div>
            </div>
        </div>
    );
});

CareerStatsGrid.displayName = 'CareerStatsGrid';

/** Individual stat cell for the divided grid */
function StatCell({ value, label, small }: { value: string | number | undefined; label: string; small?: boolean }) {
    return (
        <div className="p-4 flex flex-col items-center justify-center text-center">
            <span className={`font-bold tracking-tight tabular-nums ${small ? 'text-xl' : 'text-2xl'}`}>
                {value ?? '—'}
            </span>
            <span className="text-xs text-muted-foreground font-medium mt-1 uppercase">
                {label}
            </span>
        </div>
    );
}
