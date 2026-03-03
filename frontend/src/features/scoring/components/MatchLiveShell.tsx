import React from 'react';
import { ScorePanel } from './ScorePanel';
import { OverTimeline } from './OverTimeline';
import { useScoringStore } from '../scoringStore';
import { useShallow } from 'zustand/react/shallow';
import { clsx } from 'clsx';
import { MilestoneWatcher } from './MilestoneWatcher';
import { CommentaryPanel } from './CommentaryPanel';
import { EventNotifier } from '../broadcast/EventNotifier';
import { ReplaySlider } from './ReplaySlider';
import { EngineDevPanel } from '../diagnostics/EngineDevPanel';
import { TrendingUp, TrendingDown, Minus, Handshake, Swords, CircleDot } from 'lucide-react';

/**
 * MatchLiveShell — shared visual core for Scoring and Spectator modes.
 * Renders: ScorePanel, OverTimeline, Partnership, BatsmanStats, BowlingStats.
 * Premium dark theme with bordered cards and clean tables.
 */
export const MatchLiveShell = React.memo(() => {
    const { partnership, batsmanStats, bowlingStats, momentum } = useScoringStore(
        useShallow((s) => ({
            partnership: s.getPartnershipInfo(),
            batsmanStats: s.getBatsmanStats(),
            bowlingStats: s.getBowlingStats(),
            momentum: s.getMomentum(),
        }))
    );

    return (
        <>
            <EventNotifier />
            <MilestoneWatcher />

            {/* Header: Score Panel */}
            <div className="flex-none">
                <ScorePanel />
            </div>

            {/* Over Timeline */}
            <div className="flex-none border-b border-border border-t bg-card/50 pt-1">
                <OverTimeline />
            </div>

            {/* Replay Slider (spectator only) */}
            <div className="flex-none bg-background/50">
                <ReplaySlider />
            </div>

            {/* Commentary */}
            <div className="flex-none bg-background/50 pt-2">
                <CommentaryPanel />
            </div>

            {/* Stats Section */}
            <div className="flex-1 overflow-y-auto bg-background/50">
                <div className="p-3 space-y-3">

                    {/* Partnership + Momentum Row */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Partnership Card */}
                        {partnership && partnership.current.balls > 0 && (
                            <StatsCard icon={<Handshake className="w-4 h-4 text-primary" />} title="Partnership">
                                <div className="flex flex-col gap-1 mt-1">
                                    <span className="text-xl font-bold tabular-nums text-foreground">
                                        {partnership.current.runs}
                                        <span className="text-sm font-normal text-muted-foreground ml-1">
                                            ({partnership.current.balls})
                                        </span>
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        Best: {partnership.highest.runs} ({partnership.highest.balls})
                                    </span>
                                </div>
                            </StatsCard>
                        )}

                        {/* Momentum Card */}
                        <StatsCard
                            icon={momentum.trend === "UP"
                                ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                                : momentum.trend === "DOWN"
                                    ? <TrendingDown className="w-4 h-4 text-destructive" />
                                    : <Minus className="w-4 h-4 text-amber-400" />}
                            title="Momentum"
                        >
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className={clsx(
                                    "text-xl font-bold tabular-nums",
                                    momentum.trend === "UP" && "text-emerald-400",
                                    momentum.trend === "DOWN" && "text-destructive",
                                    momentum.trend === "STABLE" && "text-amber-400"
                                )}>
                                    {momentum.impact > 0 ? "+" : ""}{momentum.impact}
                                </span>
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                                    {momentum.trend}
                                </span>
                            </div>
                        </StatsCard>
                    </div>

                    {/* Batsman Stats */}
                    {batsmanStats.length > 0 && (
                        <StatsCard icon={<Swords className="w-4 h-4 text-primary" />} title="Batting">
                            <table className="w-full text-xs mt-2">
                                <thead>
                                    <tr className="text-muted-foreground border-b border-border">
                                        <th className="text-left py-1.5 font-medium">Batter</th>
                                        <th className="text-right py-1.5 font-medium">R</th>
                                        <th className="text-right py-1.5 font-medium">B</th>
                                        <th className="text-right py-1.5 font-medium">4s</th>
                                        <th className="text-right py-1.5 font-medium">6s</th>
                                        <th className="text-right py-1.5 font-medium">SR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {batsmanStats.map((b) => (
                                        <tr key={b.playerId} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                                            <td className={clsx(
                                                "py-2 font-medium flex items-center gap-1.5",
                                                b.isOut && "text-muted-foreground line-through"
                                            )}>
                                                {!b.isOut && <CircleDot className="w-2.5 h-2.5 text-emerald-400" />}
                                                {b.playerId}
                                            </td>
                                            <td className="text-right py-2 tabular-nums font-bold">{b.runs}</td>
                                            <td className="text-right py-2 tabular-nums text-muted-foreground">{b.balls}</td>
                                            <td className="text-right py-2 tabular-nums">{b.fours}</td>
                                            <td className="text-right py-2 tabular-nums">{b.sixes}</td>
                                            <td className="text-right py-2 tabular-nums text-muted-foreground">{b.strikeRate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </StatsCard>
                    )}

                    {/* Bowling Stats */}
                    {bowlingStats.length > 0 && (
                        <StatsCard icon={<CircleDot className="w-4 h-4 text-primary" />} title="Bowling">
                            <table className="w-full text-xs mt-2">
                                <thead>
                                    <tr className="text-muted-foreground border-b border-border">
                                        <th className="text-left py-1.5 font-medium">Bowler</th>
                                        <th className="text-right py-1.5 font-medium">O</th>
                                        <th className="text-right py-1.5 font-medium">M</th>
                                        <th className="text-right py-1.5 font-medium">R</th>
                                        <th className="text-right py-1.5 font-medium">W</th>
                                        <th className="text-right py-1.5 font-medium">Eco</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bowlingStats.map((b) => (
                                        <tr key={b.bowlerId} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                                            <td className="py-2 font-medium">{b.bowlerId}</td>
                                            <td className="text-right py-2 tabular-nums">{b.overs}</td>
                                            <td className="text-right py-2 tabular-nums text-muted-foreground">{b.maidens}</td>
                                            <td className="text-right py-2 tabular-nums">{b.runsConceded}</td>
                                            <td className="text-right py-2 tabular-nums font-bold">{b.wickets}</td>
                                            <td className="text-right py-2 tabular-nums text-muted-foreground">{b.economy}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </StatsCard>
                    )}
                </div>
            </div>

            {/* DEV-ONLY: Engine Diagnostics */}
            {import.meta.env.DEV && <EngineDevPanel />}
        </>
    );
});

MatchLiveShell.displayName = "MatchLiveShell";

// ─── Shared Stats Card ───
const StatsCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-card rounded-xl border border-border p-3.5 shadow-sm">
        <div className="flex items-center gap-2">
            {icon}
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
        </div>
        {children}
    </div>
);
