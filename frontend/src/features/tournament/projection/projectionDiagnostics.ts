import { deriveQualificationScenarios } from "./deriveQualificationScenarios";
import type { Fixture } from "./types";
import type { CompletedMatch } from "../engine/types";

// Helper to quickly generate matches
const m = (a: string, b: string, aWin: boolean): CompletedMatch => ({
    teamAId: a, teamBId: b,
    result: aWin ? "A_WIN" : "B_WIN",
    teamARuns: aWin ? 2 : 1, teamAOvers: 1, teamAAllOut: false,
    teamBRuns: aWin ? 1 : 2, teamBOvers: 1, teamBAllOut: false,
    matchOversLimit: 1
});

export function runProjectionDiagnostics(): string[] {
    const logs: string[] = [];
    const log = (msg: string) => { logs.push(msg); console.log(msg); };

    log("==========================================");
    log("🔮 QUALIFICATION PROJECTION DIAGNOSTICS");
    log("==========================================");

    let allPassed = true;

    try {
        log("\n▶ Scenario A: Locked Leader (Guaranteed Qualified)");

        // T1 is 3-0. Others are 1-2 or 0-3. Top 2 spots.
        const completed: CompletedMatch[] = [
            m("T1", "T2", true), // T1 wins
            m("T1", "T3", true), // T1 wins
            m("T1", "T4", true), // T1 wins
            m("T2", "T3", true), // T2 wins
            m("T4", "T2", false) // T2 wins
        ];

        // Only 1 match left. 2^1 = 2 scenarios.
        const remaining: Fixture[] = [{ teamAId: "T3", teamBId: "T4" }];

        const results = deriveQualificationScenarios(completed, remaining, { qualificationSpots: 2 });
        const t1 = results.find(r => r.teamId === "T1")!;

        if (!t1.guaranteedQualified) throw new Error("T1 should be guaranteed qualified");
        if (t1.qualificationProbability !== 1) throw new Error("T1 probability should be exactly 1");

        log(`  ✔ T1 is strictly locked (Prob: ${t1.qualificationProbability})`);
    } catch (e: any) {
        log(`  ✘ Scenario A Failed: ${e.message}`);
        allPassed = false;
    }

    try {
        log("\n▶ Scenario B: Eliminated Bottom (Guaranteed Eliminated)");

        // T4 is 0-3. T1, T2, T3 are all 2-1 or 1-2. Top 2 spots.
        const completed: CompletedMatch[] = [
            m("T1", "T4", true), // T1 beats T4
            m("T2", "T4", true), // T2 beats T4
            m("T3", "T4", true), // T3 beats T4
            m("T1", "T2", true), // T1 beats T2
        ];

        // T4 has no matches left, others play.
        const remaining: Fixture[] = [{ teamAId: "T2", teamBId: "T3" }];

        const results = deriveQualificationScenarios(completed, remaining, { qualificationSpots: 2 });
        const t4 = results.find(r => r.teamId === "T4")!;

        if (!t4.guaranteedEliminated) throw new Error("T4 should be guaranteed eliminated");
        if (t4.qualificationProbability !== 0) throw new Error("T4 probability should be exactly 0");

        log(`  ✔ T4 is strictly eliminated (Prob: ${t4.qualificationProbability})`);
    } catch (e: any) {
        log(`  ✘ Scenario B Failed: ${e.message}`);
        allPassed = false;
    }

    try {
        log("\n▶ Scenario C: Edge Case (Battle Case)");

        // T1 is 2-0. T2 is 1-1. T3 is 1-1. T4 is 0-2. Top 2 spots.
        const completed: CompletedMatch[] = [
            m("T1", "T2", true), // T1 wins
            m("T1", "T4", true), // T1 wins
            m("T2", "T4", true), // T2 wins
            m("T3", "T4", true), // T3 wins
        ];

        // 2 matches left = 4 scenarios
        // Match 1: T2 vs T3. Winner gets to 2 wins.
        // Match 2: T1 vs T3. 
        const remaining: Fixture[] = [
            { teamAId: "T2", teamBId: "T3" },
            { teamAId: "T1", teamBId: "T3" }
        ];

        const results = deriveQualificationScenarios(completed, remaining, { qualificationSpots: 2 });

        const t2 = results.find(r => r.teamId === "T2")!;
        const t3 = results.find(r => r.teamId === "T3")!;

        if (t2.qualificationProbability <= 0 || t2.qualificationProbability >= 1) throw new Error("T2 probability should be fractional");
        if (t3.qualificationProbability <= 0 || t3.qualificationProbability >= 1) throw new Error("T3 probability should be fractional");

        log(`  ✔ Teams correctly show fractional probabilities (T2: ${t2.qualificationProbability}, T3: ${t3.qualificationProbability})`);
    } catch (e: any) {
        log(`  ✘ Scenario C Failed: ${e.message}`);
        allPassed = false;
    }

    try {
        log("\n▶ Scenario D: Symmetry Case (All Teams Equal)");

        // 0 matches played. 4 teams. 2 matches to play total (Semis style). 1 spot.
        const completed: CompletedMatch[] = [];
        const remaining: Fixture[] = [
            { teamAId: "T1", teamBId: "T2" },
            { teamAId: "T3", teamBId: "T4" }
        ];

        // To force an equal tie, let's say 4 spots are available but we only want top 2.
        // Wait, if no matches are played and 2 matches happen, winners have 1 win, losers 0.
        // Top 2 spots will go exactly to the 2 winners.
        // Total scenarios = 4. 
        // T1 wins in 2 scenarios. T2 wins in 2.
        // Probability of top 2 should be exactly 0.5 for all 4 teams.

        const results = deriveQualificationScenarios(completed, remaining, { qualificationSpots: 2 });

        const p1 = results.find(r => r.teamId === "T1")!.qualificationProbability;
        const p2 = results.find(r => r.teamId === "T2")!.qualificationProbability;
        const p3 = results.find(r => r.teamId === "T3")!.qualificationProbability;
        const p4 = results.find(r => r.teamId === "T4")!.qualificationProbability;

        if (p1 !== 0.5 || p2 !== 0.5 || p3 !== 0.5 || p4 !== 0.5) {
            throw new Error(`Probabilities not symmetric: ${Math.max(p1, p2, p3, p4)}`);
        }

        log(`  ✔ Symmetric tie resolves equally (Prob: 0.5 for all)`);
    } catch (e: any) {
        log(`  ✘ Scenario D Failed: ${e.message}`);
        allPassed = false;
    }

    try {
        log("\n▶ Scenario E: Combinatoric Guard");
        const plentyFixtures: Fixture[] = Array.from({ length: 7 }).map(() => ({ teamAId: "A", teamBId: "B" }));
        let threw = false;
        try {
            deriveQualificationScenarios([], plentyFixtures, { maxFixturesAllowed: 6 });
        } catch (e) {
            threw = true;
        }
        if (!threw) throw new Error("Engine failed to block > maxFixturesAllowed");

        log(`  ✔ Combinatoric guard blocked explosion`);
    } catch (e: any) {
        log(`  ✘ Scenario E Failed: ${e.message}`);
        allPassed = false;
    }

    log("\n==========================================");
    if (allPassed) {
        log("✅ PROJECTION ENGINE DIAGNOSTICS PASSED");
    } else {
        log("❌ DIAGNOSTICS FAILED");
    }
    log("==========================================");

    return logs;
}

runProjectionDiagnostics();
