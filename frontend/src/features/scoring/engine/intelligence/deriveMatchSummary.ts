import type { BallEvent } from "../../../scoring/types/ballEventTypes";
import type { MatchDetail } from "../../../matches/types/domainTypes";

export function deriveMatchSummary(_events: BallEvent[], matchState: MatchDetail): string {
    if (!matchState?.status || matchState.status !== "COMPLETED") {
        return "Match is currently ongoing.";
    }

    if (!matchState.innings || matchState.innings.length === 0) {
        return "Match finished without any innings.";
    }

    const inn1 = matchState.innings[0];
    const inn2 = matchState.innings.length > 1 ? matchState.innings[1] : null;

    const team1Name = matchState.teamA.id === inn1.battingTeamId ? matchState.teamA.name : matchState.teamB.name;
    const team2Name = matchState.teamA.id === inn1.bowlingTeamId ? matchState.teamA.name : matchState.teamB.name;

    // We can use derived stats for precision, or domain state. 
    // They asked to use O(n) data access. Let's get the top batter from the domain state (which is mapped).

    const getTopBatterText = (innings: any) => {
        if (!innings || !innings.batting || innings.batting.length === 0) return "";
        let top = innings.batting[0];
        for (const b of innings.batting) {
            if (b.runs > top.runs) top = b;
        }
        if (top.runs === 0) return "";
        return `a brilliant ${top.runs} off ${top.balls} balls from ${top.name}`;
    };

    const inn1Batter = getTopBatterText(inn1);
    const inn2Batter = inn2 ? getTopBatterText(inn2) : "";

    let summary = `${team1Name} posted ${inn1.totalRuns}/${inn1.totalWickets} in ${inn1.totalOvers} overs`;
    if (inn1Batter) {
        summary += ` powered by ${inn1Batter}. `;
    } else {
        summary += `. `;
    }

    if (inn2) {
        summary += `In reply, ${team2Name} `;

        // Find if they chased it
        if (inn2.totalRuns > inn1.totalRuns) {
            summary += `chased down the target in ${inn2.totalOvers} overs. `;
            if (inn2Batter) {
                summary += `${inn2Batter} led the charge. `;
            }
        } else if (inn2.totalRuns === inn1.totalRuns) {
            summary += `managed to tie the match scoring ${inn2.totalRuns}/${inn2.totalWickets}. `;
        } else {
            summary += `fell short by ${inn1.totalRuns - inn2.totalRuns} runs, finishing at ${inn2.totalRuns}/${inn2.totalWickets}. `;
            if (inn2Batter) {
                summary += `Despite a fighting ${inn2Batter}. `;
            }
        }
    }

    // Append match result
    const resultDetails = (matchState as any).matchResult; // might not be explicitly typed in MatchDetail yet depending on mapper, let's assume it maps or we just use score diff
    if (resultDetails?.description) {
        summary += `Ultimately, ${resultDetails.description}.`;
    } else if (inn2) {
        if (inn2.totalRuns > inn1.totalRuns) {
            const wicketsLeft = 10 - inn2.totalWickets;
            summary += `Ultimately, ${team2Name} won by ${wicketsLeft} wickets.`;
        } else if (inn1.totalRuns > inn2.totalRuns) {
            summary += `Ultimately, ${team1Name} won by ${inn1.totalRuns - inn2.totalRuns} runs.`;
        } else {
            summary += `Ultimately, the match ended in a tie.`;
        }
    } else {
        summary += `Match ended prematurely.`;
    }

    return summary.trim().replace(/\s+/g, ' ');
}
