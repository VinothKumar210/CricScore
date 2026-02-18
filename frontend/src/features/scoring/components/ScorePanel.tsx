import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import { useScoringStore } from '../scoringStore';
import { StateBadge } from '../../../components/ui/StateBadge';
import { typography } from '../../../constants/typography';
import type { ScoreSummary } from '../../matches/types/domainTypes';

export const ScorePanel = React.memo(() => {
    const matchState = useScoringStore((s) => s.matchState);
    const isSubmitting = useScoringStore((s) => s.isSubmitting);

    if (!matchState) return null;

    // Helper to get current innings score (assuming last innings in array is current)
    // In a real app, this logic might be more complex or come from backend
    const currentInnings = matchState.innings.length > 0
        ? matchState.innings[matchState.innings.length - 1]
        : null;

    const scoreDisplay = currentInnings ? (
        <>
            <span className={clsx(typography.headingXl, "tabular-nums font-bold")}>
                {currentInnings.totalRuns}/{currentInnings.totalWickets}
            </span>
            <span className={clsx(typography.bodyMd, "text-textSecondary ml-2 mb-1")}>
                ({currentInnings.totalOvers})
            </span>
        </>
    ) : (
        <span className={clsx(typography.headingLg, "text-textSecondary")}>
            Innings Break / Start
        </span>
    );

    // CRR Calculation (Basic)
    const runs = currentInnings?.totalRuns || 0;
    // Parse overs "14.2" -> 14.333
    const oversStr = currentInnings?.totalOvers || "0.0";
    const [oversMain, balls] = oversStr.split('.').map(Number);
    const totalOversDec = oversMain + (balls || 0) / 6;
    const crr = totalOversDec > 0 ? (runs / totalOversDec).toFixed(2) : "0.00";

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
                    {/* Spinner (Absolute or Flex depending on layout preference, keeping it in flow for alignment or absolute if requested strict) */}
                    {/* Per requirement: Absolute top-right */}
                </div>
            </div>

            {/* Spinner Absolute Position per requirement */}
            {isSubmitting && (
                <div className="absolute top-3 right-3 text-brand animate-spin pointer-events-none">
                    <Loader2 size={16} />
                </div>
            )}


            {/* Row 2: Score & Stats */}
            <div className="flex items-end justify-between">
                <div className="flex items-end">
                    {scoreDisplay}
                </div>

                <div className="flex flex-col items-end text-textSecondary">
                    <span className="text-xs font-medium uppercase tracking-wide">CRR</span>
                    <span className="tabular-nums font-bold text-textPrimary">{crr}</span>
                </div>
            </div>
        </div>
    );
});

ScorePanel.displayName = 'ScorePanel';
