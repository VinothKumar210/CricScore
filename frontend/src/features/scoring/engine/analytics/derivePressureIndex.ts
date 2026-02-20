import type { MatchState } from "../../types/matchStateTypes";

export interface PressureState {
    requiredRate: number;
    currentRate: number;
    pressureGap: number;
    pressureLevel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
}

/**
 * Derives the pressure index during a chase (2nd innings only).
 * Pure function — uses MatchState (derived from replay engine).
 * Returns null if not in a chase situation.
 */
export function derivePressureIndex(state: MatchState): PressureState | null {
    // Only relevant during 2nd innings chase
    if (state.innings.length < 2) return null;

    const first = state.innings[0];
    const second = state.innings[1];

    const effectiveOvers = state.interruption?.revisedOvers ?? state.totalMatchOvers;
    // First innings must be complete
    if (!first.isCompleted && first.totalWickets < 10 && first.totalBalls < effectiveOvers * 6) {
        return null;
    }

    const target = state.interruption?.revisedTarget ?? (first.totalRuns + 1);
    const requiredRuns = Math.max(target - second.totalRuns, 0);
    const totalMatchBalls = effectiveOvers * 6;
    const remainingBalls = Math.max(totalMatchBalls - second.totalBalls, 0);

    // Current Run Rate
    const oversDecimal = second.totalBalls > 0 ? second.totalBalls / 6 : 0;
    const currentRate = oversDecimal > 0
        ? parseFloat((second.totalRuns / oversDecimal).toFixed(2))
        : 0;

    // Required Run Rate
    const remainingOvers = remainingBalls / 6;
    const requiredRate = remainingOvers > 0
        ? parseFloat((requiredRuns / remainingOvers).toFixed(2))
        : 0;

    const pressureGap = parseFloat((requiredRate - currentRate).toFixed(2));

    let pressureLevel: PressureState["pressureLevel"];
    if (pressureGap < 0) {
        pressureLevel = "LOW";
    } else if (pressureGap <= 1) {
        pressureLevel = "MEDIUM";
    } else if (pressureGap <= 2) {
        pressureLevel = "HIGH";
    } else {
        pressureLevel = "EXTREME";
    }

    return {
        requiredRate,
        currentRate,
        pressureGap,
        pressureLevel
    };
}
