import type { CompletedMatch } from "../types";

// Scenario A — Simple Mini League
export function generateSimpleLeague(): CompletedMatch[] {
    return [
        { teamAId: "T1", teamBId: "T2", teamARuns: 150, teamAOvers: 20, teamAAllOut: false, teamBRuns: 120, teamBOvers: 20, teamBAllOut: false, result: "A_WIN", matchOversLimit: 20 },
        { teamAId: "T1", teamBId: "T3", teamARuns: 180, teamAOvers: 20, teamAAllOut: false, teamBRuns: 160, teamBOvers: 20, teamBAllOut: false, result: "A_WIN", matchOversLimit: 20 },
        { teamAId: "T2", teamBId: "T3", teamARuns: 140, teamAOvers: 20, teamAAllOut: false, teamBRuns: 141, teamBOvers: 19.4, teamBAllOut: false, result: "B_WIN", matchOversLimit: 20 },
    ];
}

// Scenario B — Points Tie, NRR Break
export function generatePointsTieBreakLeague(): CompletedMatch[] {
    return [
        { teamAId: "T1", teamBId: "T2", teamARuns: 200, teamAOvers: 20, teamAAllOut: false, teamBRuns: 150, teamBOvers: 20, teamBAllOut: false, result: "A_WIN", matchOversLimit: 20 }, // T1 massacres T2
        { teamAId: "T2", teamBId: "T3", teamARuns: 150, teamAOvers: 20, teamAAllOut: false, teamBRuns: 140, teamBOvers: 20, teamBAllOut: false, result: "A_WIN", matchOversLimit: 20 }, // T2 beats T3
        { teamAId: "T3", teamBId: "T1", teamARuns: 160, teamAOvers: 20, teamAAllOut: false, teamBRuns: 150, teamBOvers: 20, teamBAllOut: false, result: "A_WIN", matchOversLimit: 20 }, // T3 beats T1
    ];
    // T1: 1W (2pts), NRR high from massacre
    // T2: 1W (2pts), NRR terrible
    // T3: 1W (2pts), NRR average
    // T1 should win
}

// Scenario C — Exact Same NRR, RunsFor decides
export function generateExactNrrTieLeague(): CompletedMatch[] {
    return [
        // Both T1 and T2 beat T3, but T1 scores higher in both innings
        { teamAId: "T1", teamBId: "T3", teamARuns: 200, teamAOvers: 20, teamAAllOut: false, teamBRuns: 100, teamBOvers: 20, teamBAllOut: false, result: "A_WIN", matchOversLimit: 20 },
        { teamAId: "T2", teamBId: "T4", teamARuns: 100, teamAOvers: 10, teamAAllOut: false, teamBRuns: 50, teamBOvers: 10, teamBAllOut: false, result: "A_WIN", matchOversLimit: 10 },
    ];
    // T1: 200/20 - 100/20 = 10 - 5 = +5.0 NRR
    // T2: 100/10 - 50/10 = 10 - 5 = +5.0 NRR
    // Points same (2). NRR same (+5.0). RunsFor: T1 (200) > T2 (100)
}

// Scenario D — Rain Match (Reduced overs)
export function generateRainLeague(): CompletedMatch[] {
    return [
        // 20-over match. Rain reduces chase to 12 overs. T1 made 150. T2 made 90 in 12.
        { teamAId: "T1", teamBId: "T2", teamARuns: 150, teamAOvers: 20, teamAAllOut: false, teamBRuns: 90, teamBOvers: 12, teamBAllOut: false, result: "A_WIN", matchOversLimit: 12, isRainAffected: true },
    ];
    // T1 NRR: (150/20) - (90/12) = 7.5 - 7.5 = 0
    // T2 NRR: (90/12) - (150/20) = 7.5 - 7.5 = 0
}

// Scenario E — All Out Before Quota
export function generateAllOutLeague(): CompletedMatch[] {
    return [
        // T1 all out for 120 in 15.3 overs of a 20 over match.
        // T2 chases it in 10.1 overs without losing all wickets.
        { teamAId: "T1", teamBId: "T2", teamARuns: 120, teamAOvers: 15.3, teamAAllOut: true, teamBRuns: 121, teamBOvers: 10.1, teamBAllOut: false, result: "B_WIN", matchOversLimit: 20 },
    ];
    // T1 NRR: (120/20) - (121/10.1666) -> 6 - ~11.9
    // Overs Faced for T1 MUST be 20.
    // Overs Bowled for T2 MUST be 20.
}

// Scenario F — Super Over Win
export function generateSuperOverLeague(): CompletedMatch[] {
    return [
        // T1 and T2 tie. T1 wins Super Over.
        { teamAId: "T1", teamBId: "T2", teamARuns: 150, teamAOvers: 20, teamAAllOut: false, teamBRuns: 150, teamBOvers: 20, teamBAllOut: false, result: "TIE", isSuperOverWin: "A", matchOversLimit: 20 },
    ];
    // T1 gets 2 points. T2 gets 0. (As requested "Super over counted as win -> 2 pts")
    // Note: Official rules sometimes vary (Tie=1pt each, winner gets advanced, but user specified "Super Over win counts as Win (2 pts)")
}
