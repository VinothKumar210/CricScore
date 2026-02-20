import type { CompletedMatch } from "../engine/types";
import type { Fixture } from "./types";

/**
 * Helper to simulate a fixture outcome.
 * Generates a minimal CompletedMatch payload just enough to
 * evaluate points. Does not generate realistic runs/NRR.
 * 
 * @param fixture The upcoming fixture
 * @param bit The outcome bit (0 = A wins, 1 = B wins)
 * @returns Simulated CompletedMatch
 */
export function simulateOutcome(fixture: Fixture, bit: number): CompletedMatch {
    const isAWin = bit === 0;

    return {
        teamAId: fixture.teamAId,
        teamBId: fixture.teamBId,
        result: isAWin ? "A_WIN" : "B_WIN",

        // Minimal data for simulation. NRR requires runs/overs.
        // We ensure neither team gets 0 mathematically if NRR is tie-breaking later.
        teamARuns: isAWin ? 2 : 1,
        teamAOvers: 1,
        teamAAllOut: false,

        teamBRuns: isAWin ? 1 : 2,
        teamBOvers: 1,
        teamBAllOut: false,

        matchOversLimit: 1
    };
}
