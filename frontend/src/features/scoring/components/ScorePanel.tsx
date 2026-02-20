import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import { useScoringStore } from '../scoringStore';
import { useShallow } from 'zustand/react/shallow';
import { StateBadge } from '../../../components/ui/StateBadge';
import { typography } from '../../../constants/typography';

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
        <>
            <span className={clsx(typography.headingXl, "tabular-nums font-bold")}>
                {displayScore.totalRuns}/{displayScore.totalWickets}
            </span>
            <span className={clsx(typography.bodyMd, "text-textSecondary ml-2 mb-1")}>
                ({displayScore.overs})
            </span>
        </>
    ) : (
        <span className={clsx(typography.headingLg, "text-textSecondary")}>
            Innings Break / Start
        </span>
    );

    return (
        <div className="sticky top-0 z-40 bg-white border-b border-border px-4 py-3 shadow-sm">
            {/* Row 1: Header / Teams / Status */}
            <div className="flex justify-between items-start mb-2 relative">
                <div className="flex flex-col">
                    <span className={clsx(typography.caption, "text-textSecondary uppercase tracking-wider")}>
                        {matchState.tournamentName || "Friendly Match"}
                    </span>
                    <h2 className={clsx(typography.bodyMd, "font-semibold")}>
                        {matchState.teamA.name} vs {matchState.teamB.name}
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    <StateBadge status={matchState.status} />
                </div>
            </div>

            {/* Spinner Absolute Position per requirement */}
            {isSubmitting && (
                <div className="absolute top-3 right-3 text-brand animate-spin pointer-events-none">
                    <Loader2 size={16} />
                </div>
            )}

            {/* Offline Banner (Prioritize over Conflict) */}
            {useScoringStore(s => s.isOffline) && (
                <div className="bg-warning/10 text-warning text-xs px-4 py-1 text-center font-medium rounded-md mb-2 border border-warning/20">
                    Offline Mode — {useScoringStore(s => s.unsyncedCount)} unsynced balls
                </div>
            )}

            {/* Match Result Banner */}
            {chaseInfo?.isComplete && chaseInfo.result && (
                <div className={clsx(
                    "text-xs px-4 py-2 text-center font-bold rounded-md mb-2 border",
                    chaseInfo.result.resultType === "WIN" ? "bg-success/10 text-success border-success/20" : "bg-gray-100 text-gray-600 border-gray-200"
                )}>
                    {chaseInfo.result.description}
                </div>
            )}

            {/* Sync Conflict Banner */}
            {useScoringStore(s => s.syncState) === "CONFLICT" && !useScoringStore.getState().isOffline && (
                <div className="bg-danger/10 text-danger text-xs px-4 py-1 text-center font-medium rounded-md mb-2">
                    State updated by another scorer. Syncing...
                </div>
            )}

            {/* Row 2: Score & Stats */}
            <div className="flex items-end justify-between">
                <div className="flex flex-col">
                    <div className="flex items-end">
                        {scoreDisplay}
                    </div>
                    {/* Chase Info */}
                    {chaseInfo && (
                        <div className="mt-1 text-xs font-medium tabular-nums text-textPrimary bg-surface px-2 py-0.5 rounded flex gap-3">
                            <span>Target: {chaseInfo.target}</span>
                            <span className={chaseInfo.requiredRuns > 0 ? "text-brand" : "text-success"}>
                                {chaseInfo.requiredRuns > 0
                                    ? `Need ${chaseInfo.requiredRuns} off ${chaseInfo.remainingBalls}`
                                    : "Target Achieved"}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-end text-textSecondary h-full justify-end">
                    {/* RRR Display if chasing */}
                    {chaseInfo && chaseInfo.remainingBalls > 0 && chaseInfo.requiredRuns > 0 ? (
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-textSecondary">RRR</span>
                            <span className="tabular-nums font-bold text-brand">
                                {chaseInfo.requiredRunRate}
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-textSecondary">CRR</span>
                            <span className="tabular-nums font-bold text-textPrimary">
                                {displayScore?.crr || "0.00"}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

ScorePanel.displayName = 'ScorePanel';
