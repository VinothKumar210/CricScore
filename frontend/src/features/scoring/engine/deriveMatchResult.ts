import type { MatchState, MatchResult } from "../types/matchStateTypes";

export function deriveMatchResult(state: MatchState): MatchResult | undefined {
    let inningsArr = state.innings;

    if (state.matchPhase === "SUPER_OVER" && state.superOverInnings) {
        inningsArr = state.superOverInnings;
    }

    // Basic validation
    if (!inningsArr || inningsArr.length < 2) {
        return undefined; // Match not advanced enough
    }

    const firstInnings = inningsArr[0];
    const secondInnings = inningsArr[1];

    const target = state.interruption?.revisedTarget ?? (firstInnings.totalRuns + 1);
    const chaseRuns = secondInnings.totalRuns;

    const effectiveOvers = state.interruption?.revisedOvers ?? state.totalMatchOvers;
    const maxBalls = state.matchPhase === "SUPER_OVER" ? 6 : effectiveOvers * 6;
    const maxWickets = state.matchPhase === "SUPER_OVER" ? 2 : 10; // 2 wickets means 1 is out and only 1 left = all out? No, "Max 2 wickets" means 2 wickets lost. Wait, 2 wickets lost = all out. So maxWickets = 2.

    // ✅ Condition 1: Target Achieved
    if (chaseRuns >= target) {
        const teamName = state.teams[secondInnings.battingTeamId]?.name || "Second Team";
        // Calculate wickets remaining
        const wicketsLost = secondInnings.totalWickets;
        const wicketsRemaining = maxWickets - wicketsLost;

        return {
            resultType: "WIN",
            winnerTeamId: secondInnings.battingTeamId,
            description: `${teamName} won by ${wicketsRemaining} wickets` + (state.matchPhase === "SUPER_OVER" ? " (Super Over)" : "")
        };
    }

    // Check if 2nd innings is "Complete" (All out or Overs exhausted)
    const isAllOut = secondInnings.totalWickets >= maxWickets;
    const isOversDone = secondInnings.totalBalls >= maxBalls;
    const isInningsComplete = isAllOut || isOversDone || secondInnings.isCompleted;

    if (isInningsComplete) {
        // ❌ Condition 2: All Out & Below Target OR Overs Done & Below Target
        if (chaseRuns < target - 1) {
            const teamName = state.teams[firstInnings.battingTeamId]?.name || "First Team";
            const runsMargin = (target - 1) - chaseRuns;

            return {
                resultType: "WIN",
                winnerTeamId: firstInnings.battingTeamId,
                description: `${teamName} won by ${runsMargin} runs` + (state.matchPhase === "SUPER_OVER" ? " (Super Over)" : (state.interruption?.revisedTarget ? " (DLS)" : ""))
            };
        }

        // 🤝 Condition 4: Tie
        if (chaseRuns === target - 1) {
            return {
                resultType: "TIE",
                description: "Match tied" + (state.matchPhase === "SUPER_OVER" ? " (Super Over)" : (state.interruption?.revisedTarget ? " (DLS)" : ""))
            };
        }
    }

    // Case 3: Match theoretically over by overs but logic covered above by `isOversDone`

    return undefined;
}
