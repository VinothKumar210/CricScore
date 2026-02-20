import type { MatchState } from "../../types/matchStateTypes";

export interface WinProbability {
    battingTeam: number;  // 0–100
    bowlingTeam: number;  // 0–100
    battingTeamId: string;
    bowlingTeamId: string;
}

/**
 * Deterministic win probability heuristic for a chase.
 * Not ML — uses runs needed, balls remaining, wickets in hand.
 * Pure function — replay-safe, undo-safe.
 * Returns null if not in a chase (1st innings or match complete).
 */
export function deriveWinProbability(state: MatchState): WinProbability | null {
    // Only during 2nd innings
    if (state.innings.length < 2) return null;
    if (state.matchResult) return null; // Match already decided

    const first = state.innings[0];
    const second = state.innings[1];

    // First must be complete
    if (!first.isCompleted && first.totalWickets < 10 && first.totalBalls < state.totalMatchOvers * 6) {
        return null;
    }

    const target = first.totalRuns + 1;
    const runsNeeded = Math.max(target - second.totalRuns, 0);
    const totalMatchBalls = state.totalMatchOvers * 6;
    const ballsRemaining = Math.max(totalMatchBalls - second.totalBalls, 0);
    const wicketsLeft = Math.max(10 - second.totalWickets, 0);

    // If target already achieved, batting team wins 100%
    if (runsNeeded <= 0) {
        return {
            battingTeam: 100,
            bowlingTeam: 0,
            battingTeamId: second.battingTeamId,
            bowlingTeamId: second.bowlingTeamId
        };
    }

    // If no balls or wickets left, bowling team wins
    if (ballsRemaining === 0 || wicketsLeft === 0) {
        return {
            battingTeam: 0,
            bowlingTeam: 100,
            battingTeamId: second.battingTeamId,
            bowlingTeamId: second.bowlingTeamId
        };
    }

    // ─── Heuristic Model ───
    // Base probability starts at 50%
    // Adjusted by:
    //   - Required run rate pressure (higher RRR = lower batting probability)
    //   - Wickets in hand (more wickets = higher batting probability)
    //   - Balls remaining (more balls = higher batting probability)

    const requiredRate = (runsNeeded / ballsRemaining) * 6;

    // Factor 1: Run rate pressure (RRR of 6 = neutral, above = harder)
    const rrPenalty = Math.max(0, (requiredRate - 6) * 5); // Each run above 6 RRR = -5%
    const rrBonus = Math.max(0, (6 - requiredRate) * 4);   // Each run below 6 RRR = +4%

    // Factor 2: Wickets in hand
    const wicketBonus = wicketsLeft * 3.5; // Each wicket = +3.5% for batting

    // Factor 3: Balls remaining proportion
    const ballsFraction = ballsRemaining / totalMatchBalls;
    const ballsBonus = ballsFraction * 15; // More balls = more comfort

    // Calculate
    let battingProb = 50 - rrPenalty + rrBonus + wicketBonus + ballsBonus - 35;
    // The -35 is a calibration offset (wicketBonus at 10 wickets = 35, neutral start)

    // Clamp 2–98 (never show absolute certainty)
    battingProb = Math.max(2, Math.min(98, battingProb));
    const bowlingProb = 100 - battingProb;

    return {
        battingTeam: Math.round(battingProb),
        bowlingTeam: Math.round(bowlingProb),
        battingTeamId: second.battingTeamId,
        bowlingTeamId: second.bowlingTeamId
    };
}
