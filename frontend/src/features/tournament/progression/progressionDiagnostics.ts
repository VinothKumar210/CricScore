import { deriveKnockoutBracket } from "../bracket/deriveKnockoutBracket";
import type { TeamStanding } from "../engine/types";
import { resolveBracketProgression } from "./resolveBracketProgression";
import type { PlayoffMatchResult } from "./types";

const MOCK_STANDINGS: TeamStanding[] = [
    { teamId: "T1", played: 10, won: 8, lost: 2, tied: 0, noResult: 0, points: 16, netRunRate: +1.500, runsFor: 2000, oversFacedDecimal: 200, runsAgainst: 1800, oversBowledDecimal: 200 },
    { teamId: "T2", played: 10, won: 7, lost: 3, tied: 0, noResult: 0, points: 14, netRunRate: +0.800, runsFor: 1950, oversFacedDecimal: 200, runsAgainst: 1850, oversBowledDecimal: 200 },
    { teamId: "T3", played: 10, won: 6, lost: 4, tied: 0, noResult: 0, points: 12, netRunRate: +0.200, runsFor: 1900, oversFacedDecimal: 200, runsAgainst: 1880, oversBowledDecimal: 200 },
    { teamId: "T4", played: 10, won: 5, lost: 5, tied: 0, noResult: 0, points: 10, netRunRate: -0.100, runsFor: 1800, oversFacedDecimal: 200, runsAgainst: 1850, oversBowledDecimal: 200 },
];

export function runProgressionDiagnostics(): string[] {
    const logs: string[] = [];
    const log = (msg: string) => { logs.push(msg); console.log(msg); };

    log("==========================================");
    log("🏆 TOURNAMENT PROGRESSION DIAGNOSTICS");
    log("==========================================");

    let allPassed = true;

    try {
        log("\n▶ Scenario A: Standard Format Progressive Resolution");
        const bracket = deriveKnockoutBracket(MOCK_STANDINGS, "STANDARD_TOP4");

        // Step 1: Only SF1 finishes
        const results1: PlayoffMatchResult[] = [
            { matchId: "SF1", winnerTeamId: "T1", loserTeamId: "T4" }
        ];

        const step1 = resolveBracketProgression({ bracket, results: results1 });
        const final1 = step1.matches.find(m => m.matchId === "FINAL");
        if (final1?.teamAId !== "T1" || final1?.teamBId !== null) {
            throw new Error(`Step 1 failed: Expected T1 vs null. Got ${final1?.teamAId} vs ${final1?.teamBId}`);
        }

        // Step 2: SF2 finishes
        const results2: PlayoffMatchResult[] = [
            ...results1,
            { matchId: "SF2", winnerTeamId: "T3", loserTeamId: "T2" }
        ];

        const step2 = resolveBracketProgression({ bracket, results: results2 });
        const final2 = step2.matches.find(m => m.matchId === "FINAL");
        if (final2?.teamAId !== "T1" || final2?.teamBId !== "T3") {
            throw new Error(`Step 2 failed: Expected T1 vs T3. Got ${final2?.teamAId} vs ${final2?.teamBId}`);
        }

        log(`  ✔ Partial resolution maps independent winners safely.`);
        log(`  ✔ Final resolves purely without overwriting null boundaries.`);
    } catch (e: any) {
        log(`  ✘ Scenario A Failed: ${e.message}`);
        allPassed = false;
    }

    try {
        log("\n▶ Scenario B: IPL Format End-to-End");
        const bracket = deriveKnockoutBracket(MOCK_STANDINGS, "IPL_TOP4");

        // Initial Bracket Status
        // Q1: T1 vs T2
        // ELIM: T3 vs T4

        // Event 1: Missing Q1, But Eliminator Finishes.
        // Expects Q2 = null vs T3
        const resultELIM: PlayoffMatchResult = { matchId: "ELIM", winnerTeamId: "T3", loserTeamId: "T4" };
        const step1 = resolveBracketProgression({ bracket, results: [resultELIM] });

        const q2Step1 = step1.matches.find(m => m.matchId === "Q2");
        if (q2Step1?.teamAId !== null || q2Step1?.teamBId !== "T3") {
            throw new Error(`Step 1 failed: Expected null vs T3. Got ${q2Step1?.teamAId} vs ${q2Step1?.teamBId}`);
        }

        // Event 2: Q1 Finishes. (T2 wins, T1 goes to Q2)
        // Expects Q2 = T1 vs T3. FINAL = T2 vs null.
        const resultQ1: PlayoffMatchResult = { matchId: "Q1", winnerTeamId: "T2", loserTeamId: "T1" };
        const step2 = resolveBracketProgression({ bracket, results: [resultELIM, resultQ1] });

        const q2Step2 = step2.matches.find(m => m.matchId === "Q2");
        if (q2Step2?.teamAId !== "T1" || q2Step2?.teamBId !== "T3") {
            throw new Error(`Step 2 failed (Q2): Expected T1 vs T3. Got ${q2Step2?.teamAId} vs ${q2Step2?.teamBId}`);
        }

        const finalStep2 = step2.matches.find(m => m.matchId === "FINAL");
        if (finalStep2?.teamAId !== "T2" || finalStep2?.teamBId !== null) {
            throw new Error(`Step 2 failed (FINAL): Expected T2 vs null. Got ${finalStep2?.teamAId} vs ${finalStep2?.teamBId}`);
        }

        // Event 3: Q2 Finishes. (T3 wins)
        // Expects FINAL = T2 vs T3.
        const resultQ2: PlayoffMatchResult = { matchId: "Q2", winnerTeamId: "T3", loserTeamId: "T1" };
        const step3 = resolveBracketProgression({ bracket, results: [resultELIM, resultQ1, resultQ2] });

        const finalStep3 = step3.matches.find(m => m.matchId === "FINAL");
        if (finalStep3?.teamAId !== "T2" || finalStep3?.teamBId !== "T3") {
            throw new Error(`Step 3 failed (FINAL): Expected T2 vs T3. Got ${finalStep3?.teamAId} vs ${finalStep3?.teamBId}`);
        }

        log(`  ✔ Partial downstream dependencies isolate unpopulated parents flawlessly.`);
        log(`  ✔ Loser of Q1 successfully maps natively into Team A for Q2.`);
        log(`  ✔ Winner of Eliminator successfully maps natively into Team B for Q2.`);
        log(`  ✔ Progression maps out-of-order securely.`);

    } catch (e: any) {
        log(`  ✘ Scenario B Failed: ${e.message}`);
        allPassed = false;
    }

    try {
        log("\n▶ Scenario C: Mutation Immunity");
        const bracket = deriveKnockoutBracket(MOCK_STANDINGS, "STANDARD_TOP4");
        const bracketStr = JSON.stringify(bracket);

        resolveBracketProgression({
            bracket,
            results: [{ matchId: "SF1", winnerTeamId: "T1", loserTeamId: "T4" }]
        });

        const newStr = JSON.stringify(bracket);
        if (bracketStr !== newStr) throw new Error("Input Bracket was mutated inside logic engine.");

        log(`  ✔ Engine preserves pure references. Root bracket safely cloned.`);
    } catch (e: any) {
        log(`  ✘ Scenario C Failed: ${e.message}`);
        allPassed = false;
    }

    log("\n==========================================");
    if (allPassed) {
        log("✅ PROGRESSION ENGINE DIAGNOSTICS PASSED");
    } else {
        log("❌ DIAGNOSTICS FAILED");
    }
    log("==========================================");

    return logs;
}

runProgressionDiagnostics();
