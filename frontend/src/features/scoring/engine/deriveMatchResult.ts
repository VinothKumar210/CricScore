import type { MatchState, MatchResult } from "../types/matchStateTypes";

export function deriveMatchResult(state: MatchState): MatchResult | undefined {
    // Basic validation
    if (!state.innings || state.innings.length < 2) {
        return undefined; // Match not advanced enough
    }

    const firstInnings = state.innings[0];
    const secondInnings = state.innings[1];

    // We only calculate result if certain conditions are met in 2nd innings
    // or if 2nd innings is actively being played?
    // Actually, we check every time.

    const target = firstInnings.totalRuns + 1;
    const chaseRuns = secondInnings.totalRuns;

    // Total overs for the match (e.g., 20)
    const totalMatchOvers = state.totalMatchOvers;
    const maxBalls = totalMatchOvers * 6;

    // ✅ Condition 1: Target Achieved
    if (chaseRuns >= target) {
        const teamName = state.teams[secondInnings.battingTeamId]?.name || "Second Team";
        // Calculate wickets remaining
        const wicketsLost = secondInnings.totalWickets;
        const wicketsRemaining = 10 - wicketsLost;

        return {
            resultType: "WIN",
            winnerTeamId: secondInnings.battingTeamId,
            description: `${teamName} won by ${wicketsRemaining} wickets`
        };
    }

    // Check if 2nd innings is "Complete" (All out or Overs exhausted)
    const isAllOut = secondInnings.totalWickets >= 10;
    const isOversDone = secondInnings.totalBalls >= maxBalls;
    const isInningsComplete = isAllOut || isOversDone || secondInnings.isCompleted;

    if (isInningsComplete) {
        // ❌ Condition 2: All Out & Below Target OR Overs Done & Below Target
        if (chaseRuns < firstInnings.totalRuns) {
            const teamName = state.teams[firstInnings.battingTeamId]?.name || "First Team";
            const runsMargin = firstInnings.totalRuns - chaseRuns;

            return {
                resultType: "WIN",
                winnerTeamId: firstInnings.battingTeamId,
                description: `${teamName} won by ${runsMargin} runs`
            };
        }

        // 🤝 Condition 4: Tie
        if (chaseRuns === firstInnings.totalRuns) {
            return {
                resultType: "TIE",
                description: "Match tied"
            };
        }
    }

    // Case 3: Match theoretically over by overs but logic covered above by `isOversDone`

    return undefined;
}
