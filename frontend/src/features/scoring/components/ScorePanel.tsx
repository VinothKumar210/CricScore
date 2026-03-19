import React from 'react';
import { clsx } from 'clsx';
import { Loader2, Radio } from 'lucide-react';
import { useScoringStore } from '../scoringStore';
import { useShallow } from 'zustand/react/shallow';
import { StateBadge } from '../../../components/ui/StateBadge';

/**
 * ScorePanel — Premium dark header for live scoring.
 *
 * Visual hierarchy:
 * Row 1: Tournament label + StateBadge
 * Row 2: Team vs Team (bold)
 * Row 3: Large score (5xl bold) + Overs + CRR/RRR
 * Row 4: Chase info bar (if applicable)
 *
 * Banners: Offline, Sync Conflict, Match Result
 */
export const ScorePanel = React.memo(() => {
    const { matchState, isSubmitting, displayScore, chaseInfo } = useScoringStore(
        useShallow((s) => ({
            matchState: s.matchState,
            isSubmitting: s.isSubmitting,
            displayScore: s.getDisplayScore(),
            chaseInfo: s.getChaseInfo(),
        }))
    );

    if (!matchState) return null;

    const scoreDisplay = displayScore ? (
        <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black tabular-nums tracking-tight text-foreground">
                {displayScore.totalRuns}
            </span>
            <span className="text-2xl font-bold text-muted-foreground">/</span>
            <span className="text-2xl font-bold text-muted-foreground tabular-nums">
                {displayScore.totalWickets}
            </span>
            <span className="text-sm font-medium text-muted-foreground ml-1 self-end mb-1.5">
                ({displayScore.overs})
            </span>
        </div>
    ) : (
        <span className="text-lg font-semibold text-muted-foreground">
            Innings Break / Start
        </span>
    );

    return (
        <div className="sticky top-0 z-40 bg-gradient-to-b from-card to-card/95 border-b border-border px-4 pt-3 pb-4 shadow-lg shadow-black/10">
            {/* Row 1: Tournament + Status */}
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                    {matchState.tournamentName || "Friendly Match"}
                </span>
                <div className="flex items-center gap-2">
                    {isSubmitting && (
                        <Loader2 size={14} className="text-primary animate-spin" />
                    )}
                    <StateBadge status={matchState.status} />
                </div>
            </div>

            {/* Row 2: Teams */}
            <h2 className="text-base font-bold text-foreground tracking-tight">
                {matchState.teamA.name}
                <span className="text-muted-foreground font-normal mx-2">vs</span>
                {matchState.teamB.name}
            </h2>

            {/* Banners */}
            {useScoringStore(s => s.syncStatus) === "OFFLINE" && (
                <div className="bg-amber-500/10 text-amber-400 text-xs px-3 py-1.5 text-center font-medium rounded-lg mt-2 border border-amber-500/20 flex items-center justify-center gap-2">
                    <Radio className="w-3 h-3" />
                    Offline Mode — {useScoringStore(s => s.pendingSyncCount)} unsynced balls
                </div>
            )}

            {chaseInfo?.isComplete && chaseInfo.result && (
                <div className={clsx(
                    "text-xs px-3 py-2 text-center font-bold rounded-lg mt-2 border",
                    chaseInfo.result.resultType === "WIN"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-secondary text-muted-foreground border-border"
                )}>
                    {chaseInfo.result.description}
                </div>
            )}

            {useScoringStore(s => s.syncStatus) === "SYNCING" && useScoringStore(s => s.pendingSyncCount) > 0 && (
                <div className="bg-primary/10 text-primary text-xs px-3 py-1.5 text-center font-medium rounded-lg mt-2 border border-primary/20">
                    Syncing {useScoringStore(s => s.pendingSyncCount)} events...
                </div>
            )}

            {/* Row 3: Score + CRR/RRR */}
            <div className="flex items-end justify-between mt-3">
                <div className="flex flex-col">
                    {scoreDisplay}

                    {/* Chase Info */}
                    {chaseInfo && (
                        <div className="mt-1.5 flex items-center gap-3 text-xs font-medium tabular-nums">
                            <span className="text-muted-foreground">
                                Target: <span className="text-foreground font-bold">{chaseInfo.target}</span>
                            </span>
                            <span className={chaseInfo.requiredRuns > 0 ? "text-primary" : "text-emerald-400"}>
                                {chaseInfo.requiredRuns > 0
                                    ? `Need ${chaseInfo.requiredRuns} off ${chaseInfo.remainingBalls}`
                                    : "Target Achieved ✓"}
                            </span>
                        </div>
                    )}
                </div>

                {/* Run Rate Column */}
                <div className="flex flex-col items-end gap-1">
                    {chaseInfo && chaseInfo.remainingBalls > 0 && chaseInfo.requiredRuns > 0 ? (
                        <>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">RRR</span>
                                <span className="text-lg font-bold tabular-nums text-primary">{chaseInfo.requiredRunRate}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">CRR</span>
                                <span className="text-sm font-semibold tabular-nums text-foreground">{displayScore?.crr || "0.00"}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">CRR</span>
                            <span className="text-lg font-bold tabular-nums text-foreground">{displayScore?.crr || "0.00"}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

ScorePanel.displayName = 'ScorePanel';
