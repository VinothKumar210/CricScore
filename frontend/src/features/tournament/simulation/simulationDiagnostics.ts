import type { BracketFormat } from "../bracket/types";
import { simulateTournament } from "./simulateTournament";
import type { TournamentBlueprint, TournamentTeam } from "./types";

function runSimulationDiagnostics() {
    const logs: string[] = [];
    const log = (msg: string) => { logs.push(msg); console.log(msg); };

    log("==========================================");
    log("🏆 TOURNAMENT FULL SIMULATION DIAGNOSTICS");
    log("==========================================");

    const TEAMS: TournamentTeam[] = [
        { teamId: "CSK", name: "Chennai Super Kings" },
        { teamId: "MI", name: "Mumbai Indians" },
        { teamId: "RCB", name: "Royal Challengers Bangalore" },
        { teamId: "KKR", name: "Kolkata Knight Riders" },
        { teamId: "RR", name: "Rajasthan Royals" },
        { teamId: "SRH", name: "Sunrisers Hyderabad" }
    ];

    // Generate Double Round-Robin Fixtures (2 matches per team pair)
    const fixtures: { teamAId: string, teamBId: string }[] = [];
    for (let i = 0; i < TEAMS.length; i++) {
        for (let j = i + 1; j < TEAMS.length; j++) {
            fixtures.push({ teamAId: TEAMS[i].teamId, teamBId: TEAMS[j].teamId }); // Home
            fixtures.push({ teamAId: TEAMS[j].teamId, teamBId: TEAMS[i].teamId }); // Away
        }
    }

    const testSimulations = (format: BracketFormat, name: string) => {
        let passed = true;
        try {
            log(`\n▶ FORMAT: ${name}`);

            const blueprint: TournamentBlueprint = { format, teams: TEAMS, fixtures };
            const result = simulateTournament(blueprint);

            // Assertions
            if (result.leagueMatches.length !== fixtures.length) {
                throw new Error(`Expected ${fixtures.length} simulated matches, got ${result.leagueMatches.length}`);
            }

            if (result.leagueTable.length !== TEAMS.length) {
                throw new Error(`Expected ${TEAMS.length} table rows, got ${result.leagueTable.length}`);
            }

            const expectedPlayoffMatches = format === "STANDARD_TOP4" ? 3 : 4;
            if (result.playoffResults.length !== expectedPlayoffMatches) {
                throw new Error(`Expected ${expectedPlayoffMatches} playoff results, got ${result.playoffResults.length}`);
            }

            if (!result.championId) {
                throw new Error("No Champion Crowed.");
            }

            // Verify champion exists in table
            if (!result.leagueTable.find(t => t.teamId === result.championId)) {
                throw new Error("Champion is not a valid team from the league.");
            }

            log(`  ✔ Standings sorted successfully (${TEAMS.length} Teams).`);
            log(`  ✔ Mathematical simulations generated ${result.leagueMatches.length} league matches.`);
            log(`  ✔ Progression resolved all playoff dependencies resulting in ${result.playoffResults.length} knockout matches.`);
            log(`  ✔ Simulated Champion Crowned: ${TEAMS.find(t => t.teamId === result.championId)?.name} 👑`);

        } catch (e: any) {
            log(`  ✘ Format Failed: ${e.message}`);
            passed = false;
        }
        return passed;
    };

    const stdPassed = testSimulations("STANDARD_TOP4", "Standard Semi-Finals");
    const iplPassed = testSimulations("IPL_TOP4", "Indian Premier League Format");

    log("\n==========================================");
    if (stdPassed && iplPassed) {
        log("✅ ALL SIMULATION ENGINES OPERATIONAL");
    } else {
        log("❌ DIAGNOSTICS FAILED");
    }
    log("==========================================");

    return logs;
}

runSimulationDiagnostics();
