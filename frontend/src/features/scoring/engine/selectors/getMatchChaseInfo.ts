import type { MatchState } from "../../types/matchStateTypes";

export interface MatchChaseInfo {
    target: number;
    requiredRuns: number;
    remainingBalls: number;
    requiredRunRate: string;
    isComplete?: boolean;
    result?: MatchResult;
}

import type { MatchResult } from "../../types/matchStateTypes";

export function getMatchChaseInfo(state: MatchState): MatchChaseInfo | null {
    // If match result exists, we return a complete state info
    if (state.matchResult) {
        return {
            target: 0, // Not relevant? Or keep it?
            requiredRuns: 0,
            remainingBalls: 0,
            requiredRunRate: "0.00",
            isComplete: true,
            result: state.matchResult
        };
    }

    // Need at least 2 innings initialized (currentInningsIndex might be 1, or just innings array has 2 items)
    // But engine initializes innings only when they start?
    // initialState only initializes the first.
    // So if innings[0] is complete, we might plan for 2nd.
    // If we are IN the second innings (innings[1] exists), then we calculate chase.

    if (state.innings.length < 2) return null;

    const first = state.innings[0];
    const second = state.innings[1];

    if (!first.isCompleted && !forceCompletion(first, state.totalMatchOvers)) return null;

    const target = first.totalRuns + 1;
    const requiredRuns = Math.max(target - second.totalRuns, 0);

    const totalMatchBalls = state.totalMatchOvers * 6;
    const remainingBalls = Math.max(totalMatchBalls - second.totalBalls, 0);

    const requiredRunRate = remainingBalls > 0
        ? ((requiredRuns / remainingBalls) * 6).toFixed(2)
        : "0.00";

    return {
        target,
        requiredRuns,
        remainingBalls,
        requiredRunRate
    };
}

// Helper to check if technically complete even if flag missing (e.g. migration)
function forceCompletion(inn: any, totalOvers: number) {
    return inn.totalWickets >= 10 || inn.totalBalls >= totalOvers * 6;
}
