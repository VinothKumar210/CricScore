import React from 'react';
import { BracketMatchCard } from './BracketMatchCard';
import type { BracketMatch } from './types';
import type { PlayoffMatchResult } from '../progression/types';

interface BracketRoundProps {
    roundName: string;
    matches: BracketMatch[];
    results: PlayoffMatchResult[];
    teamNames: Record<string, string>;
}

/**
 * BracketRound — Vertical stack of matches for a single round.
 * Pure display. No computation.
 */
export const BracketRound: React.FC<BracketRoundProps> = React.memo(({
    roundName,
    matches,
    results,
    teamNames,
}) => {
    const resultMap = new Map(results.map(r => [r.matchId, r]));

    return (
        <div className="flex flex-col gap-4 min-w-[220px]">
            {/* Round header */}
            <div className="text-center">
                <h3 className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                    {roundName}
                </h3>
            </div>

            {/* Matches */}
            <div className="flex flex-col gap-4 justify-center flex-1">
                {matches.map(match => (
                    <BracketMatchCard
                        key={match.matchId}
                        match={match}
                        result={resultMap.get(match.matchId)}
                        teamNames={teamNames}
                    />
                ))}
            </div>
        </div>
    );
});

BracketRound.displayName = 'BracketRound';
