import React, { useMemo } from 'react';
import { BracketRound } from './BracketRound';
import { ChampionBanner } from './ChampionBanner';
import type { BracketMatch, TournamentBracket } from './types';
import type { PlayoffMatchResult } from '../progression/types';

interface BracketViewProps {
    bracket: TournamentBracket;
    results: PlayoffMatchResult[];
    teamNames: Record<string, string>;
    tournamentStatus?: string;
    isCreator?: boolean;
}

/**
 * BracketView — Full horizontal bracket visualization.
 *
 * ARCHITECTURAL RULES:
 * - Receives bracket from engine selector (getBracket/getResolvedBracket)
 * - Does NOT call deriveKnockoutBracket
 * - Does NOT compute bracket logic
 * - Groups matches by round for visual layout
 * - Scrollable horizontally on mobile
 */
export const BracketView: React.FC<BracketViewProps> = React.memo(({
    bracket,
    results,
    teamNames,
    tournamentStatus,
    isCreator,
}) => {
    // Group matches into rounds by stage for visual layout
    // The engine returns matches in order: early rounds → final
    // We group by stage name for each column
    const rounds = useMemo(() => {
        const roundMap = new Map<string, BracketMatch[]>();
        const roundOrder: string[] = [];

        for (const match of bracket.matches) {
            if (!roundMap.has(match.stage)) {
                roundMap.set(match.stage, []);
                roundOrder.push(match.stage);
            }
            roundMap.get(match.stage)!.push(match);
        }

        return roundOrder.map(stage => ({
            name: stage,
            matches: roundMap.get(stage)!,
        }));
    }, [bracket.matches]);

    // Detect champion from resolved final
    const champion = useMemo(() => {
        const finalMatch = bracket.matches.find(m => m.stage === 'Final');
        if (!finalMatch) return null;
        const finalResult = results.find(r => r.matchId === finalMatch.matchId);
        if (!finalResult) return null;
        return {
            teamId: finalResult.winnerTeamId,
            name: teamNames[finalResult.winnerTeamId] || finalResult.winnerTeamId,
        };
    }, [bracket.matches, results, teamNames]);

    if (bracket.matches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-surface border border-dashed border-border/60 rounded-xl text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl opacity-50">🏆</span>
                </div>
                <h3 className="text-sm font-bold text-textPrimary mb-2">Bracket Not Generated Yet</h3>
                <p className="text-xs text-textSecondary max-w-sm mb-6">
                    The knockout bracket will appear here once the league stage is completed and playoff spots are finalized.
                </p>
                {isCreator && (
                    <button className="px-5 py-2.5 bg-brand text-white text-xs font-bold rounded-lg shadow-sm">
                        Manage Playoffs
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Champion Banner */}
            {champion && tournamentStatus === 'COMPLETED' && (
                <ChampionBanner teamName={champion.name} />
            )}

            {/* Bracket Grid — scrollable horizontally */}
            <div className="overflow-x-auto pb-4">
                <div className="flex gap-6 items-stretch min-w-max px-1">
                    {rounds.map(round => (
                        <BracketRound
                            key={round.name}
                            roundName={round.name}
                            matches={round.matches}
                            results={results}
                            teamNames={teamNames}
                        />
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[9px] text-textSecondary border-t border-border/30 pt-3">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-brand/30 rounded-sm" /> Winner
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-200 rounded-sm" /> Eliminated
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-surface border border-border/50 rounded-sm" /> TBD
                </span>
            </div>
        </div>
    );
});

BracketView.displayName = 'BracketView';
