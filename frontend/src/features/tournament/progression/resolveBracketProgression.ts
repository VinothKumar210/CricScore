import type { BracketMatch, TournamentBracket } from "../bracket/types";
import type { BracketProgressionInput, PlayoffMatchResult } from "./types";

/**
 * Pure function to automatically advance teams through a tournament bracket 
 * based on the outcomes of playoff matches.
 * 
 * It maps the dependency graph (`dependsOn.winnerOf`, `dependsOn.loserOf`)
 * to populate `teamAId` and `teamBId` of downstream matches dynamically.
 */
export function resolveBracketProgression(input: BracketProgressionInput): TournamentBracket {
    const { bracket, results } = input;

    // 1. Build an O(1) lookup map of completed playoff results
    const resultMap = new Map<string, PlayoffMatchResult>();
    for (const result of results) {
        resultMap.set(result.matchId, result);
    }

    // 2. Map over the original matches to generate a purely new array (No Mutation)
    const resolvedMatches: BracketMatch[] = bracket.matches.map((match) => {
        // Clone the original match structurally
        const resolvedMatch = { ...match };

        if (!resolvedMatch.dependsOn) {
            return resolvedMatch;
        }

        const { winnerOf, loserOf } = resolvedMatch.dependsOn;

        // Note: The logic below accommodates the possibility of an array of dependencies.
        // It simply reads the first result to populate Team A, the second to populate Team B.
        // This is safe because SF1 vs SF2 (Standard) always guarantees 2 slots.
        // And Q1/ELIM vs Q2 (IPL) maps tightly to winner/loser.

        const sourceMatches: Array<{ matchId: string; type: "winner" | "loser" }> = [];

        if (loserOf) {
            loserOf.forEach(id => sourceMatches.push({ matchId: id, type: "loser" }));
        }
        if (winnerOf) {
            winnerOf.forEach(id => sourceMatches.push({ matchId: id, type: "winner" }));
        }

        // Apply findings to team slots. teamA receives index 0, teamB receives index 1.
        sourceMatches.forEach((source, index) => {
            const completedResult = resultMap.get(source.matchId);
            if (completedResult) {
                const advancedTeamId = source.type === "winner"
                    ? completedResult.winnerTeamId
                    : completedResult.loserTeamId;

                if (index === 0) {
                    resolvedMatch.teamAId = advancedTeamId;
                } else if (index === 1) {
                    resolvedMatch.teamBId = advancedTeamId;
                }
            }
        });

        return resolvedMatch;
    });

    return {
        matches: resolvedMatches
    };
}
