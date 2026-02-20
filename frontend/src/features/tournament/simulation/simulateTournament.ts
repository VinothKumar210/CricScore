import { deriveKnockoutBracket } from "../bracket/deriveKnockoutBracket";
import { deriveLeagueTable } from "../engine/deriveLeagueTable";
import type { CompletedMatch } from "../engine/types";
import { resolveBracketProgression } from "../progression/resolveBracketProgression";
import type { PlayoffMatchResult } from "../progression/types";
import { resetSimulatorSeed, simulateLeagueMatch, simulatePlayoffMatch } from "./teamSimulator";
import type { SimulationResult, TournamentBlueprint } from "./types";

/**
 * Executes a deterministic end-to-end simulation of an entire cricket tournament.
 * From League phase execution -> Ladder sorting -> Bracket derivation -> Playoff progression -> Champion crowning.
 * 
 * Runs synchronously and purely without mutating any external database stores.
 */
export function simulateTournament(blueprint: TournamentBlueprint): SimulationResult {
    // 1. Reset PRNG for consistent runs
    resetSimulatorSeed();

    const { format, fixtures } = blueprint;

    // Phase 1: League Simulation
    const leagueMatches: CompletedMatch[] = fixtures.map(fixture => simulateLeagueMatch(fixture));

    // Phase 2: Derive Final Standings
    const leagueTable = deriveLeagueTable(leagueMatches);

    // Phase 3: Structural Bracket Generation
    let currentBracket = deriveKnockoutBracket(leagueTable, format);
    const playoffResults: PlayoffMatchResult[] = [];

    // Phase 4: Chronological Playoff Resolution Loop
    // We must find matches that are "Ready to Play" (Team A and B are both known and non-null)
    // Validate we don't accidentally play a match twice.
    let championId: string | null = null;
    let safeGuardIterations = 0;

    while (championId === null && safeGuardIterations < 20) {
        safeGuardIterations++;

        // Find immediately playable matches that haven't been resolved yet
        const playableMatches = currentBracket.matches.filter(m =>
            m.teamAId !== null &&
            m.teamBId !== null &&
            !playoffResults.find(pr => pr.matchId === m.matchId)
        );

        if (playableMatches.length === 0) {
            throw new Error(`Simulation Stalled: Could not find any playable playoff matches derived from current graph. Format: ${format}`);
        }

        // Simulate each playable match
        for (const match of playableMatches) {
            // Because they are filtered, we guarantee A and B are strings
            const result = simulatePlayoffMatch(match.matchId, match.teamAId as string, match.teamBId as string);
            playoffResults.push(result);

            if (match.matchId === "FINAL") {
                championId = result.winnerTeamId;
            }
        }

        // Pipe the newly generated results into the progression engine to unlock downstream matches
        currentBracket = resolveBracketProgression({
            bracket: currentBracket,
            results: playoffResults
        });
    }

    if (!championId) {
        throw new Error("Simulation Stalled: Exceeded safeguard loop iterations without crowning a champion.");
    }

    return {
        leagueMatches,
        leagueTable,
        playoffResults,
        championId
    };
}
