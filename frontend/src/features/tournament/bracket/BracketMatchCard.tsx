import React from 'react';
import type { BracketMatch } from '../bracket/types';
import type { PlayoffMatchResult } from '../progression/types';

interface BracketMatchCardProps {
    match: BracketMatch;
    result?: PlayoffMatchResult;
    teamNames: Record<string, string>;
    isLive?: boolean;
}

/**
 * BracketMatchCard — Single match in the bracket.
 *
 * Shows: Team A, Team B, winner highlight, "LIVE" badge, "TBD" for unresolved slots.
 * ALL data from engine selectors — zero local computation.
 * Memoized to prevent re-renders.
 */
export const BracketMatchCard: React.FC<BracketMatchCardProps> = React.memo(({
    match,
    result,
    teamNames,
    isLive = false,
}) => {
    const teamA = match.teamAId ? teamNames[match.teamAId] || match.teamAId : null;
    const teamB = match.teamBId ? teamNames[match.teamBId] || match.teamBId : null;
    const winnerId = result?.winnerTeamId;

    const getTeamStyle = (teamId: string | null) => {
        if (!teamId || !result) return 'text-foreground font-medium';
        if (teamId === winnerId) return 'text-primary font-black'; // Increased contrast for winner
        return 'text-muted-foreground line-through opacity-60';
    };

    const ariaLabel = `${match.stage}: ${teamA || 'To be decided'} versus ${teamB || 'To be decided'}. ${winnerId ? `Winner is ${teamNames[winnerId] || winnerId}.` : 'Match not completed.'}`;

    return (
        <div
            className="relative bg-card outline outline-1 outline-border/60 rounded-xl overflow-hidden
                       min-w-[200px] shadow-sm focus:outline-brand focus:ring-2 focus:ring-brand/20 transition-all"
            tabIndex={0}
            role="article"
            aria-label={ariaLabel}
        >
            {/* Stage label */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-background border-b border-border/30">
                <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {match.stage}
                </span>
                {isLive && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-destructive">
                        <span className="w-1.5 h-1.5 bg-destructive/100 rounded-full animate-pulse" />
                        LIVE
                    </span>
                )}
                {result && !isLive && (
                    <span className="text-[9px] font-bold text-primary">✓ Completed</span>
                )}
            </div>

            {/* Team A */}
            <div className={`flex items-center justify-between px-3 py-2.5 border-b border-border/20
                            ${match.teamAId === winnerId ? 'bg-primary/5' : ''}`}>
                <div className="flex items-center gap-2 min-w-0">
                    {match.teamAId === winnerId && (
                        <span className="text-[10px]">🏆</span>
                    )}
                    <span className={`text-xs truncate ${getTeamStyle(match.teamAId)}`}>
                        {teamA || 'TBD'}
                    </span>
                </div>
                {match.dependsOn && !match.teamAId && (
                    <span className="text-[8px] text-muted-foreground italic">
                        {match.dependsOn.loserOf?.[0]
                            ? `L${match.dependsOn.loserOf[0]}`
                            : match.dependsOn.winnerOf?.[0]
                                ? `W${match.dependsOn.winnerOf[0]}`
                                : ''}
                    </span>
                )}
            </div>

            {/* Divider with VS */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                            w-5 h-5 rounded-full bg-card border border-border/50
                            flex items-center justify-center z-10">
                <span className="text-[7px] font-black text-muted-foreground">VS</span>
            </div>

            {/* Team B */}
            <div className={`flex items-center justify-between px-3 py-2.5
                            ${match.teamBId === winnerId ? 'bg-primary/5' : ''}`}>
                <div className="flex items-center gap-2 min-w-0">
                    {match.teamBId === winnerId && (
                        <span className="text-[10px]">🏆</span>
                    )}
                    <span className={`text-xs truncate ${getTeamStyle(match.teamBId)}`}>
                        {teamB || 'TBD'}
                    </span>
                </div>
                {match.dependsOn && !match.teamBId && (
                    <span className="text-[8px] text-muted-foreground italic">
                        {match.dependsOn.winnerOf?.[match.dependsOn.loserOf ? 0 : 1]
                            ? `W${match.dependsOn.winnerOf[match.dependsOn.loserOf ? 0 : 1]}`
                            : ''}
                    </span>
                )}
            </div>
        </div>
    );
});

BracketMatchCard.displayName = 'BracketMatchCard';
