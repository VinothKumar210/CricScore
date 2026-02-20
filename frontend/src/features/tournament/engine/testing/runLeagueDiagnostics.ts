import { deriveLeagueTable } from "../deriveLeagueTable";
import {
    generateSimpleLeague,
    generatePointsTieBreakLeague,
    generateExactNrrTieLeague,
    generateRainLeague,
    generateAllOutLeague,
    generateSuperOverLeague
} from "./leagueGenerator";
import { convertOversToDecimal } from "../nrrUtils";

export function runLeagueDiagnostics(): string[] {
    const logs: string[] = [];
    const log = (msg: string) => {
        logs.push(msg);
        console.log(msg);
    };

    log("==========================================");
    log("🏆 TOURNAMENT LADDER ENGINE DIAGNOSTICS");
    log("==========================================");

    let allPassed = true;

    try {
        log("\n▶ Testing NRR Utility (convertOversToDecimal)");
        if (convertOversToDecimal("18.3") !== 18.5) throw new Error("18.3 must be 18.5");
        if (convertOversToDecimal(18.3) !== 18.5) throw new Error("18.3 (number) must be 18.5");
        if (convertOversToDecimal(20) !== 20) throw new Error("20 must be 20");

        let threw = false;
        try { convertOversToDecimal("18.6"); } catch { threw = true; }
        if (!threw) throw new Error("18.6 must throw");

        threw = false;
        try { convertOversToDecimal("-1.2"); } catch { threw = true; }
        if (!threw) throw new Error("Negative overs must throw");

        log("  ✔ NRR Math Bulletproof");
    } catch (e: any) {
        log(`  ✘ NRR Utility Failed: ${e.message}`);
        allPassed = false;
    }

    try {
        log("\n▶ Scenario A: Simple Mini League");
        const table = deriveLeagueTable(generateSimpleLeague());
        if (table[0].teamId !== "T1" || table[0].points !== 4) throw new Error("T1 should have 4 points and win");
        if (table[1].teamId !== "T3" || table[1].points !== 2) throw new Error("T3 should be 2nd");
        if (table[2].teamId !== "T2" || table[2].points !== 0) throw new Error("T2 should be last");
        log("  ✔ Correct simple points accumulation");
    } catch (e: any) {
        log(`  ✘ Scenario A Failed: ${e.message}`);
        allPassed = false;
    }

    try {
        log("\n▶ Scenario B: Points Tie, NRR Break");
        const table = deriveLeagueTable(generatePointsTieBreakLeague());
        if (table[0].points !== table[1].points || table[1].points !== table[2].points) throw new Error("Points should be tied 2pts each");
        if (table[0].teamId !== "T1") throw new Error("T1 should win on NRR");
        if (table[1].teamId !== "T3") throw new Error("T3 should be second on NRR");
        log("  ✔ Precision NRR sorting applied");
    } catch (e: any) {
        log(`  ✘ Scenario B Failed: ${e.message}`);
        allPassed = false;
    }

    try {
        log("\n▶ Scenario C: Exact Same NRR");
        const table = deriveLeagueTable(generateExactNrrTieLeague());
        if (table[0].netRunRate !== table[1].netRunRate) throw new Error("NRR should be exactly equal (+5.0)");
        if (table[0].teamId !== "T1") throw new Error("T1 should win on RunsFor");
        log("  ✔ RunsFor Tiebreaker applied");
    } catch (e: any) {
        log(`  ✘ Scenario C Failed: ${e.message}`);
        allPassed = false;
    }

    try {
        log("\n▶ Scenario D: Rain Match");
        const table = deriveLeagueTable(generateRainLeague());
        // T1 NRR: (150/20) - (90/12) = 7.5 - 7.5 = 0
        if (table[0].netRunRate !== 0 || table[1].netRunRate !== 0) throw new Error(`NRR should be exactly 0, got ${table[0].netRunRate}`);
        log("  ✔ Dynamic revisedOvers used correctly for proportion");
    } catch (e: any) {
        log(`  ✘ Scenario D Failed: ${e.message}`);
        allPassed = false;
    }

    try {
        log("\n▶ Scenario E: All Out Before Quota");
        const table = deriveLeagueTable(generateAllOutLeague());
        const t1 = table.find(t => t.teamId === "T1")!;
        const t2 = table.find(t => t.teamId === "T2")!;
        if (t1.oversFaced !== 20 || t2.oversBowled !== 20) throw new Error("T1 overs faced should be forced to 20 for quoting all-out");
        if (t2.oversFaced === 20) throw new Error("T2 was NOT all out, so it should use its exact faced balls");
        log("  ✔ Official All-Out Quota Rule applied");
    } catch (e: any) {
        log(`  ✘ Scenario E Failed: ${e.message}`);
        allPassed = false;
    }

    try {
        log("\n▶ Scenario F: Super Over Win");
        const table = deriveLeagueTable(generateSuperOverLeague());
        const t1 = table.find(t => t.teamId === "T1")!;
        const t2 = table.find(t => t.teamId === "T2")!;
        if (t1.points !== 2) throw new Error("T1 should gain 2 points from Super Over Win");
        if (t2.points !== 0) throw new Error("T2 should gain 0 points from Super Over Loss");
        log("  ✔ Super Over logic strictly grants Win points");
    } catch (e: any) {
        log(`  ✘ Scenario F Failed: ${e.message}`);
        allPassed = false;
    }

    log("\n==========================================");
    if (allPassed) {
        log("✅ LADDER RANKING DIAGNOSTICS PASSED");
    } else {
        log("❌ DIAGNOSTICS FAILED");
    }
    log("==========================================");

    return logs;
}

// Auto-execution if run from command line directly with Node/TSX
runLeagueDiagnostics();
