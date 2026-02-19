import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import { useScoringStore } from '../scoringStore';
import { StateBadge } from '../../../components/ui/StateBadge';
import { typography } from '../../../constants/typography';

export const ScorePanel = React.memo(() => {
    const matchState = useScoringStore((s) => s.matchState);
    const isSubmitting = useScoringStore((s) => s.isSubmitting);
    const displayScore = useScoringStore((s) => s.getDisplayScore());

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

        </div>
    )
}

            {/* Offline Banner (Prioritize over Conflict) */ }
            { useScoringStore(s => s.isOffline) && (
    <div className="bg-warning/10 text-warning text-xs px-4 py-1 text-center font-medium rounded-md mb-2 border border-warning/20">
        Offline Mode — Events will sync when connection is restored
    </div>
)}

{/* Sync Conflict Banner */ }
{
    useScoringStore(s => s.syncState) === "CONFLICT" && !useScoringStore.getState().isOffline && (
        <div className="bg-danger/10 text-danger text-xs px-4 py-1 text-center font-medium rounded-md mb-2">
            State updated by another scorer. Syncing...
        </div>
    )
}

{/* Row 2: Score & Stats */ }
<div className="flex items-end justify-between">
    <div className="flex items-end">
        {scoreDisplay}
    </div>

    <div className="flex flex-col items-end text-textSecondary">
        <span className="text-xs font-medium uppercase tracking-wide">CRR</span>
        <span className="tabular-nums font-bold text-textPrimary">
            {displayScore?.crr || "0.00"}
        </span>
    </div>
</div>
        </div >
    );
});

ScorePanel.displayName = 'ScorePanel';
