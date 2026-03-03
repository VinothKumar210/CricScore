import { useMatchDetailStore } from "../matchDetailStore";
import { clsx } from "clsx";
import { Trophy, Clock, BarChart3, Target } from 'lucide-react';
import type { MatchDetail, Innings } from "../types/domainTypes";

/**
 * MatchSummaryTab — Match overview with key highlights.
 * Shows: result banner, key stats grid, recent overs summary, innings comparison.
 */
export const MatchSummaryTab = () => {
    const { match } = useMatchDetailStore();
    if (!match) return null;

    return (
        <div className="py-4 space-y-4">
            {/* Result Banner */}
            {match.status === 'COMPLETED' && match.result && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
                    <Trophy className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-sm font-bold text-foreground">{match.result}</p>
                </div>
            )}

            {/* Key Stats */}
            <KeyStatsGrid match={match} />

            {/* Innings Comparison */}
            {match.innings.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        Innings Comparison
                    </h3>
                    <div className="space-y-3">
                        {match.innings.map((inn, i) => (
                            <InningsBar key={i} innings={inn} index={i} match={match} />
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Overs */}
            {match.recentOvers && match.recentOvers.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        Recent Overs
                    </h3>
                    <div className="space-y-2">
                        {match.recentOvers.slice(-5).map(over => (
                            <div key={over.overNumber} className="flex items-center gap-3">
                                <span className="text-xs font-bold text-muted-foreground w-10 tabular-nums">
                                    Ov {over.overNumber}
                                </span>
                                <div className="flex gap-1.5 flex-wrap">
                                    {over.balls.map((ball, i) => (
                                        <span
                                            key={i}
                                            className={clsx(
                                                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border",
                                                ball.type === 'WICKET' ? "bg-destructive/20 text-destructive border-destructive/40"
                                                    : ball.runs >= 4 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                                        : "bg-secondary text-foreground border-border"
                                            )}
                                        >
                                            {ball.label}
                                        </span>
                                    ))}
                                </div>
                                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                                    {over.balls.reduce((s, b) => s + b.runs, 0)} runs
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Man of the Match placeholder */}
            {match.status === 'COMPLETED' && (
                <div className="bg-card rounded-xl border border-border p-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        Best Performance
                    </h3>
                    <BestPerformers match={match} />
                </div>
            )}
        </div>
    );
};

// --- Key Stats Grid ---
const KeyStatsGrid = ({ match }: { match: MatchDetail }) => {
    const totalBoundaries = match.innings.reduce((sum, inn) =>
        sum + inn.batting.reduce((s, b) => s + b.fours + b.sixes, 0), 0);
    const totalWickets = match.innings.reduce((sum, inn) => sum + inn.totalWickets, 0);
    const totalExtras = match.innings.reduce((sum, inn) => sum + inn.extras, 0);

    const stats = [
        { label: 'Innings', value: String(match.innings.length) },
        { label: 'Boundaries', value: String(totalBoundaries) },
        { label: 'Wickets', value: String(totalWickets) },
        { label: 'Extras', value: String(totalExtras) },
    ];

    return (
        <div className="grid grid-cols-4 gap-2">
            {stats.map(stat => (
                <div key={stat.label} className="bg-card rounded-xl border border-border p-3 text-center">
                    <span className="text-lg font-bold tabular-nums text-foreground">{stat.value}</span>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</p>
                </div>
            ))}
        </div>
    );
};

// --- Innings Bar ---
const InningsBar = ({ innings, index, match }: { innings: Innings; index: number; match: MatchDetail }) => {
    const maxRuns = Math.max(...match.innings.map(i => i.totalRuns), 1);
    const percentage = (innings.totalRuns / maxRuns) * 100;
    const teamName = index === 0 ? match.teamA.name : match.teamB.name;

    return (
        <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground w-16 truncate">{teamName}</span>
            <div className="flex-1 h-6 bg-secondary rounded-lg overflow-hidden">
                <div
                    className={clsx(
                        "h-full rounded-lg transition-all duration-500 flex items-center justify-end px-2",
                        index === 0 ? "bg-primary/60" : "bg-emerald-500/50"
                    )}
                    style={{ width: `${percentage}%` }}
                >
                    <span className="text-xs font-bold tabular-nums text-white">
                        {innings.totalRuns}/{innings.totalWickets}
                    </span>
                </div>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-14 text-right">
                ({innings.totalOvers})
            </span>
        </div>
    );
};

// --- Best Performers ---
const BestPerformers = ({ match }: { match: MatchDetail }) => {
    const topBatsmen = match.innings.flatMap(i => i.batting)
        .sort((a, b) => b.runs - a.runs)
        .slice(0, 2);
    const topBowlers = match.innings.flatMap(i => i.bowling)
        .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
        .slice(0, 2);

    return (
        <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="space-y-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Top Bat</span>
                {topBatsmen.map(b => (
                    <div key={b.playerId} className="text-sm">
                        <span className="font-medium text-foreground">{b.name}</span>
                        <span className="text-muted-foreground ml-1">
                            {b.runs}({b.balls})
                        </span>
                    </div>
                ))}
            </div>
            <div className="space-y-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Top Bowl</span>
                {topBowlers.map(b => (
                    <div key={b.playerId} className="text-sm">
                        <span className="font-medium text-foreground">{b.name}</span>
                        <span className="text-muted-foreground ml-1">
                            {b.wickets}/{b.runs}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
