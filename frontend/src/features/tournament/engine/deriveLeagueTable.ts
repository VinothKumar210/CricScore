import { convertOversToDecimal } from "./nrrUtils";
import type { CompletedMatch, TeamStanding } from "./types";

/**
 * Pure function to derive league standings from an array of completed matches.
 * 
 * Sorts by Points (DESC) -> NRR (DESC) -> Runs For (DESC)
 */
export function deriveLeagueTable(matches: CompletedMatch[]): TeamStanding[] {
    const standingsMap = new Map<string, TeamStanding>();

    const getTeam = (teamId: string): TeamStanding => {
        let team = standingsMap.get(teamId);
        if (!team) {
            team = {
                teamId, played: 0, won: 0, lost: 0, tied: 0, noResult: 0,
                points: 0, runsFor: 0, runsAgainst: 0, oversFaced: 0, oversBowled: 0, netRunRate: 0
            };
            standingsMap.set(teamId, team);
        }
        return team;
    };

    for (const match of matches) {
        const teamA = getTeam(match.teamAId);
        const teamB = getTeam(match.teamBId);

        teamA.played += 1;
        teamB.played += 1;

        // Apply Points
        if (match.result === "A_WIN" || match.isSuperOverWin === "A") {
            teamA.won += 1;
            teamA.points += 2;
            teamB.lost += 1;
        } else if (match.result === "B_WIN" || match.isSuperOverWin === "B") {
            teamB.won += 1;
            teamB.points += 2;
            teamA.lost += 1;
        } else if (match.result === "TIE" && !match.isSuperOverWin) {
            teamA.tied += 1;
            teamA.points += 1;
            teamB.tied += 1;
            teamB.points += 1;
        } else if (match.result === "NO_RESULT") {
            teamA.noResult += 1;
            teamA.points += 1;
            teamB.noResult += 1;
            teamB.points += 1;
        }

        // Apply NRR Stats (Skip for NO_RESULT matches as they don't count towards NRR typically)
        // If a match is abandoned, NRR is not affected by partial runs
        if (match.result !== "NO_RESULT") {
            // Determine effective overs faced
            // If all out, use matchOversLimit (which is revisedOvers for rain matches, or 20 for standard)
            const teamAOversFaced = match.teamAAllOut ? match.matchOversLimit : convertOversToDecimal(match.teamAOvers);
            const teamBOversFaced = match.teamBAllOut ? match.matchOversLimit : convertOversToDecimal(match.teamBOvers);

            // Runs For
            teamA.runsFor += match.teamARuns;
            teamB.runsFor += match.teamBRuns;

            // Runs Against
            teamA.runsAgainst += match.teamBRuns;
            teamB.runsAgainst += match.teamARuns;

            // Overs Faced
            teamA.oversFaced += teamAOversFaced;
            teamB.oversFaced += teamBOversFaced;

            // Overs Bowled (Opponent's Overs Faced)
            teamA.oversBowled += teamBOversFaced;
            teamB.oversBowled += teamAOversFaced;
        }
    }

    // Compute NRR and Convert to Array
    const standings: TeamStanding[] = Array.from(standingsMap.values()).map(team => {
        let nrr = 0;
        if (team.oversFaced > 0 || team.oversBowled > 0) { // Avoid NaN
            const forRate = team.oversFaced > 0 ? team.runsFor / team.oversFaced : 0;
            const againstRate = team.oversBowled > 0 ? team.runsAgainst / team.oversBowled : 0;
            nrr = forRate - againstRate;
        }

        // Store full precision internally using number parsing, avoid float accumulation drift
        team.netRunRate = Number(nrr.toFixed(6));
        return team;
    });

    // Sort: Points DESC, NRR DESC, RunsFor DESC
    return standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.netRunRate !== a.netRunRate) return b.netRunRate - a.netRunRate;
        return b.runsFor - a.runsFor; // Final tiebreaker
    });
}
