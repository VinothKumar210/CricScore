import type { CompletedMatch } from "../engine/types";
import type { PlayoffMatchResult } from "../progression/types";
import type { Fixture } from "../projection/types";

/**
 * Deterministic PRNG to ensure the same tournament matches generate the same results 
 * if run sequentially, preventing sporadic flaky tests during continuous integration.
 */
function sfc32(a: number, b: number, c: number, d: number) {
    return function () {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        let t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

// Fixed seed for stable simulation runs
let random = sfc32(1, 2, 3, 4);

export function resetSimulatorSeed() {
    random = sfc32(1, 2, 3, 4);
}

/**
 * Returns a randomized boolean heavily weighted towards 50/50 but strictly deterministic.
 */
function flipCoin() {
    return random() > 0.5;
}

/**
 * Generates a purely random but realistic T20 Score (between 120 and 220)
 */
function generateScore() {
    return Math.floor(random() * 100) + 120;
}

/**
 * Converts a Fixture into a CompletedMatch populated with realistic dummy stats.
 * Uses a deterministic PRNG to ensure replayable tests.
 */
export function simulateLeagueMatch(fixture: Fixture): CompletedMatch {
    const aWins = flipCoin();
    const winningScore = generateScore();
    const losingScore = winningScore - (Math.floor(random() * 30) + 1); // Lose by 1-30 runs

    // To prevent infinite NRR ties, we occasionally sprinkle in some early chases.
    const isEarlyChase = random() > 0.8;
    const chaseOversMatch = isEarlyChase ? (15 + (Math.floor(random() * 4))) : 20;

    return {
        teamAId: fixture.teamAId,
        teamBId: fixture.teamBId,
        teamARuns: aWins ? winningScore : losingScore,
        teamAOvers: aWins && isEarlyChase ? chaseOversMatch : 20,
        teamAAllOut: aWins ? (isEarlyChase ? false : true) : true,
        teamBRuns: aWins ? losingScore : winningScore,
        teamBOvers: !aWins && isEarlyChase ? chaseOversMatch : 20,
        teamBAllOut: aWins ? true : (isEarlyChase ? false : true),
        result: aWins ? "A_WIN" : "B_WIN",
        matchOversLimit: 20
    };
}

/**
 * Generates a PlayoffMatchResult based on Team IDs. Extremely simple randomizer 
 * as NRR and scores no longer matter in pure playoff progression mathematically.
 */
export function simulatePlayoffMatch(matchId: string, teamAId: string, teamBId: string): PlayoffMatchResult {
    const aWins = flipCoin();
    return {
        matchId,
        winnerTeamId: aWins ? teamAId : teamBId,
        loserTeamId: aWins ? teamBId : teamAId
    };
}
