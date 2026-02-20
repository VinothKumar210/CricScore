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

/**
 * MatchLiveShell — shared visual core for Scoring and Spectator modes.
 * Renders: ScorePanel, OverTimeline, Partnership, BatsmanStats, BowlingStats.
 * No scoring actions. No mutations. Read-only derived state.
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

            {/* Timeline */}
            <div className="flex-none border-b border-border border-t bg-white pt-1">
                <OverTimeline />
            </div>

            <div className="flex-none bg-gray-50/50">
                <ReplaySlider />
            </div>

            {/* Commentary Toggle */}
            <div className="flex-none bg-gray-50/50 pt-2">
                <CommentaryPanel />
            </div>

            {/* Stats Section */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
                <div className="p-3 space-y-3">

                    {/* Partnership Card */}
                    {partnership && partnership.current.balls > 0 && (
                        <StatsCard title="🤝 Partnership">
                            <div className="flex justify-between text-sm">
                                <span className="tabular-nums font-semibold">
                                    {partnership.current.runs} ({partnership.current.balls})
                                </span>
                                <span className="text-textSecondary text-xs">
                                    Best: {partnership.highest.runs} ({partnership.highest.balls})
                                </span>
                            </div>
                        </StatsCard>
                    )}

                    {/* Momentum */}
                    <StatsCard title="🔥 Momentum">
                        <div className="flex items-center gap-2">
                            <span className={clsx(
                                "text-sm font-bold",
                                momentum.trend === "UP" && "text-success",
                                momentum.trend === "DOWN" && "text-danger",
                                momentum.trend === "STABLE" && "text-warning"
                            )}>
                                {momentum.trend === "UP" ? "▲" : momentum.trend === "DOWN" ? "▼" : "■"}{" "}
                                {momentum.impact > 0 ? "+" : ""}{momentum.impact}
                            </span>
                            <span className="text-xs text-textSecondary uppercase">{momentum.trend}</span>
                        </div>
                    </StatsCard>

                    {/* Batsman Stats */}
                    {batsmanStats.length > 0 && (
                        <StatsCard title="🏏 Batting">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-textSecondary border-b border-border">
                                        <th className="text-left py-1 font-medium">Batter</th>
                                        <th className="text-right py-1 font-medium">R</th>
                                        <th className="text-right py-1 font-medium">B</th>
                                        <th className="text-right py-1 font-medium">4s</th>
                                        <th className="text-right py-1 font-medium">6s</th>
                                        <th className="text-right py-1 font-medium">SR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {batsmanStats.map((b) => (
                                        <tr key={b.playerId} className="border-b border-border/30">
                                            <td className={clsx("py-1.5", b.isOut && "text-textSecondary line-through")}>
                                                {b.playerId}
                                            </td>
                                            <td className="text-right py-1.5 tabular-nums font-medium">{b.runs}</td>
                                            <td className="text-right py-1.5 tabular-nums">{b.balls}</td>
                                            <td className="text-right py-1.5 tabular-nums">{b.fours}</td>
                                            <td className="text-right py-1.5 tabular-nums">{b.sixes}</td>
                                            <td className="text-right py-1.5 tabular-nums">{b.strikeRate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </StatsCard>
                    )}

                    {/* Bowling Stats */}
                    {bowlingStats.length > 0 && (
                        <StatsCard title="🎳 Bowling">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-textSecondary border-b border-border">
                                        <th className="text-left py-1 font-medium">Bowler</th>
                                        <th className="text-right py-1 font-medium">O</th>
                                        <th className="text-right py-1 font-medium">M</th>
                                        <th className="text-right py-1 font-medium">R</th>
                                        <th className="text-right py-1 font-medium">W</th>
                                        <th className="text-right py-1 font-medium">Eco</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bowlingStats.map((b) => (
                                        <tr key={b.bowlerId} className="border-b border-border/30">
                                            <td className="py-1.5">{b.bowlerId}</td>
                                            <td className="text-right py-1.5 tabular-nums">{b.overs}</td>
                                            <td className="text-right py-1.5 tabular-nums">{b.maidens}</td>
                                            <td className="text-right py-1.5 tabular-nums">{b.runsConceded}</td>
                                            <td className="text-right py-1.5 tabular-nums font-medium">{b.wickets}</td>
                                            <td className="text-right py-1.5 tabular-nums">{b.economy}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </StatsCard>
                    )}
                </div>
            </div>
        </>
    );
});

MatchLiveShell.displayName = "MatchLiveShell";

// ─── Shared Card ───
const StatsCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white rounded-xl border border-border p-3 space-y-2 shadow-sm">
        <h4 className="text-xs font-semibold text-textSecondary uppercase tracking-wider">{title}</h4>
        {children}
    </div>
);
