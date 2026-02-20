import type { TeamStanding } from "../engine/types";
import type { BracketFormat, BracketMatch, TournamentBracket } from "./types";

/**
 * Deterministic Knockout Bracket Generator.
 * Consumes final league standings and computationally maps them to a structured dependency graph.
 * 
 * @param sortedStandings Evaluated ladder standings, MUST be sorted Points -> NRR -> RunsFor.
 * @param format Blueprint mode ("STANDARD_TOP4" or "IPL_TOP4")
 * @returns TournamentBracket static dependency graph
 */
export function deriveKnockoutBracket(
    sortedStandings: TeamStanding[],
    format: BracketFormat
): TournamentBracket {
    // 1. Guard against incomplete league completions
    if (sortedStandings.length < 4) {
        throw new Error("Tournament bracket requires at least 4 teams to generate playoffs.");
    }

    // 2. Safely extract exact top 4 seeds without trusting global indexes
    const [seed1, seed2, seed3, seed4] = sortedStandings.slice(0, 4);

    const matches: BracketMatch[] = [];

    // 3. Blueprint mappings
    if (format === "STANDARD_TOP4") {
        matches.push(
            {
                matchId: "SF1",
                stage: "Semi Final 1",
                teamAId: seed1.teamId,
                teamBId: seed4.teamId
            },
            {
                matchId: "SF2",
                stage: "Semi Final 2",
                teamAId: seed2.teamId,
                teamBId: seed3.teamId
            },
            {
                matchId: "FINAL",
                stage: "Final",
                teamAId: null, // Resolved progression
                teamBId: null, // Resolved progression
                dependsOn: {
                    winnerOf: ["SF1", "SF2"]
                }
            }
        );
    } else if (format === "IPL_TOP4") {
        matches.push(
            {
                matchId: "Q1",
                stage: "Qualifier 1",
                teamAId: seed1.teamId,
                teamBId: seed2.teamId
            },
            {
                matchId: "ELIM",
                stage: "Eliminator",
                teamAId: seed3.teamId,
                teamBId: seed4.teamId
            },
            {
                matchId: "Q2",
                stage: "Qualifier 2",
                teamAId: null, // Loser Q1
                teamBId: null, // Winner ELIM
                dependsOn: {
                    loserOf: ["Q1"],
                    winnerOf: ["ELIM"]
                }
            },
            {
                matchId: "FINAL",
                stage: "Final",
                teamAId: null, // Winner Q1
                teamBId: null, // Winner Q2
                dependsOn: {
                    winnerOf: ["Q1", "Q2"]
                }
            }
        );
    } else {
        throw new Error(`Unsupported Bracket Format: ${format}`);
    }

    return { matches };
}
