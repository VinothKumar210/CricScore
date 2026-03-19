import React from 'react';
import { useScoringStore } from '../scoringStore';
import { useShallow } from 'zustand/react/shallow';
import { SyncStatusBadge } from './SyncStatusBadge';

/**
 * ScoreHeader — Compact, premium header for the redesigned scoring page.
 * Shows: Team name, innings label, score/wickets/overs, CRR, RRR, partnership.
 */
export const ScoreHeader = React.memo(() => {
    const { matchState, displayScore, chaseInfo, partnership } = useScoringStore(
        useShallow((s) => ({
            matchState: s.matchState,
            displayScore: s.getDisplayScore(),
            chaseInfo: s.getChaseInfo(),
            partnership: s.getPartnershipInfo(),
        }))
    );

    if (!matchState || !displayScore) return null;

    const currentInningsIndex = matchState.innings.length - 1;
    const battingTeam = currentInningsIndex % 2 === 0 ? matchState.teamA : matchState.teamB;
    const inningsLabel = `${currentInningsIndex + 1}${currentInningsIndex === 0 ? 'st' : 'nd'} Innings`;

    return (
        <div className="bg-gradient-to-b from-card via-card to-card/80 px-4 pt-3 pb-3 border-b border-border">
            {/* Row 1: Team + Sync Badge */}
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-primary">
                        {battingTeam.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm font-medium">
                        {inningsLabel}
                    </span>
                </div>
                <SyncStatusBadge />
            </div>

            {/* Row 2: Big Score */}
            <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-black tabular-nums tracking-tight text-foreground leading-none">
                        {displayScore.totalRuns}-{displayScore.totalWickets}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground ml-1">
                        ({displayScore.overs})
                    </span>
                </div>

                {/* Run Rate Column */}
                <div className="flex items-center gap-3 text-right">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">CRR</span>
                        <span className="text-sm font-bold tabular-nums text-foreground">{displayScore.crr || '0.00'}</span>
                    </div>
                    {chaseInfo && chaseInfo.requiredRuns > 0 && (
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">RRR</span>
                            <span className="text-sm font-bold tabular-nums text-primary">{chaseInfo.requiredRunRate}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Row 3: Chase / Partnership */}
            <div className="flex items-center justify-between mt-1.5">
                {chaseInfo && chaseInfo.requiredRuns > 0 ? (
                    <span className="text-[11px] text-primary font-medium">
                        Need {chaseInfo.requiredRuns} off {chaseInfo.remainingBalls} balls
                    </span>
                ) : (
                    <span />
                )}
                {partnership && partnership.current.balls > 0 && (
                    <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
                        P'ship: {partnership.current.runs}({partnership.current.balls})
                    </span>
                )}
            </div>
        </div>
    );
});

ScoreHeader.displayName = 'ScoreHeader';
