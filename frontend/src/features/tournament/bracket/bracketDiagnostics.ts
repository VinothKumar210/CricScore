import type { TeamStanding } from "../engine/types";
import { deriveKnockoutBracket } from "./deriveKnockoutBracket";

const MOCK_STANDINGS: TeamStanding[] = [
    { teamId: "T1", played: 10, won: 8, lost: 2, tied: 0, noResult: 0, points: 16, netRunRate: +1.500, runsFor: 2000, oversFaced: 200, runsAgainst: 1800, oversBowled: 200 },
    { teamId: "T2", played: 10, won: 7, lost: 3, tied: 0, noResult: 0, points: 14, netRunRate: +0.800, runsFor: 1950, oversFaced: 200, runsAgainst: 1850, oversBowled: 200 },
    { teamId: "T3", played: 10, won: 6, lost: 4, tied: 0, noResult: 0, points: 12, netRunRate: +0.200, runsFor: 1900, oversFaced: 200, runsAgainst: 1880, oversBowled: 200 },
    { teamId: "T4", played: 10, won: 5, lost: 5, tied: 0, noResult: 0, points: 10, netRunRate: -0.100, runsFor: 1800, oversFaced: 200, runsAgainst: 1850, oversBowled: 200 },
    { teamId: "T5", played: 10, won: 4, lost: 6, tied: 0, noResult: 0, points: 8, netRunRate: -0.500, runsFor: 1750, oversFaced: 200, runsAgainst: 1900, oversBowled: 200 },
];

export function runBracketDiagnostics(): string[] {
    const logs: string[] = [];
    const log = (msg: string) => { logs.push(msg); console.log(msg); };

    log("==========================================");
    log("🏆 KNOCKOUT BRACKET DIAGNOSTICS");
    log("==========================================");

    let allPassed = true;

    try {
        log("\n▶ Scenario A: Standard Top 4 Format");
        const bracket = deriveKnockoutBracket(MOCK_STANDINGS, "STANDARD_TOP4");

        const sf1 = bracket.matches.find(m => m.matchId === "SF1");
        const sf2 = bracket.matches.find(m => m.matchId === "SF2");
        const final = bracket.matches.find(m => m.matchId === "FINAL");

        if (!sf1 || !sf2 || !final) throw new Error("Missing structural matches");

        // Asserts
        if (sf1.teamAId !== "T1" || sf1.teamBId !== "T4") throw new Error(`SF1 mapping incorrect. Expected T1 v T4. Got ${sf1.teamAId} v ${sf1.teamBId}`);
        if (sf2.teamAId !== "T2" || sf2.teamBId !== "T3") throw new Error(`SF2 mapping incorrect. Expected T2 v T3. Got ${sf2.teamAId} v ${sf2.teamBId}`);

        if (final.teamAId !== null || final.teamBId !== null) throw new Error("FINAL should not have hardcoded teams");
        if (!final.dependsOn?.winnerOf?.includes("SF1") || !final.dependsOn?.winnerOf?.includes("SF2")) {
            throw new Error("FINAL missing SF1/SF2 winner dependencies");
        }

        log(`  ✔ Standard Bracket Structure Matches (SF1, SF2, FINAL)`);
        log(`  ✔ Dependency Pointers Resolving Correctly`);
    } catch (e: any) {
        log(`  ✘ Scenario A Failed: ${e.message}`);
        allPassed = false;
    }

    try {
        log("\n▶ Scenario B: IPL Format");
        const bracket = deriveKnockoutBracket(MOCK_STANDINGS, "IPL_TOP4");

        const q1 = bracket.matches.find(m => m.matchId === "Q1");
        const elim = bracket.matches.find(m => m.matchId === "ELIM");
        const q2 = bracket.matches.find(m => m.matchId === "Q2");
        const final = bracket.matches.find(m => m.matchId === "FINAL");

        if (!q1 || !elim || !q2 || !final) throw new Error("Missing structural matches");

        // Asserts
        if (q1.teamAId !== "T1" || q1.teamBId !== "T2") throw new Error(`Q1 mapping incorrect. Expected T1 v T2. Got ${q1.teamAId} v ${q1.teamBId}`);
        if (elim.teamAId !== "T3" || elim.teamBId !== "T4") throw new Error(`ELIM mapping incorrect. Expected T3 v T4. Got ${elim.teamAId} v ${elim.teamBId}`);

        if (q2.teamAId !== null || q2.teamBId !== null) throw new Error("Q2 should not have hardcoded teams");
        if (!q2.dependsOn?.loserOf?.includes("Q1") || !q2.dependsOn?.winnerOf?.includes("ELIM")) {
            throw new Error("Q2 missing Q1 loser / ELIM winner dependencies");
        }

        if (final.teamAId !== null || final.teamBId !== null) throw new Error("FINAL should not have hardcoded teams");
        if (!final.dependsOn?.winnerOf?.includes("Q1") || !final.dependsOn?.winnerOf?.includes("Q2")) {
            throw new Error("FINAL missing Q1/Q2 winner dependencies");
        }

        log(`  ✔ IPL Bracket Structure Matches (Q1, ELIM, Q2, FINAL)`);
        log(`  ✔ Hybrid Dependency Pointers (Winner/Loser) Resolving Correctly`);
    } catch (e: any) {
        log(`  ✘ Scenario B Failed: ${e.message}`);
        allPassed = false;
    }

    try {
        log("\n▶ Scenario C: Incomplete League Guard");
        let threw = false;
        try {
            deriveKnockoutBracket([], "STANDARD_TOP4");
        } catch (e) {
            threw = true;
        }
        if (!threw) throw new Error("Failed to block incomplete league parsing");

        log(`  ✔ League completion guard triggered correctly against empty mappings.`);
    } catch (e: any) {
        log(`  ✘ Scenario C Failed: ${e.message}`);
        allPassed = false;
    }

    log("\n==========================================");
    if (allPassed) {
        log("✅ BRACKET ENGINE DIAGNOSTICS PASSED");
    } else {
        log("❌ DIAGNOSTICS FAILED");
    }
    log("==========================================");

    return logs;
}

runBracketDiagnostics();
