import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery, getEventRuns } from "../utils/deliveryUtils";

export interface OverRunRatePoint {
    over: number;       // 1-indexed completed over
    runs: number;       // Runs scored in this over
    cumulativeRuns: number;
    runRate: number;    // cumulativeRuns / over
}

/**
 * Derives per-over run rate progression for a given innings.
 * Pure function — no mutation, replay-safe, undo-safe.
 */
export function deriveRunRateProgression(
    events: BallEvent[],
    targetInningsIndex: number,
    totalMatchOvers: number = 20
): OverRunRatePoint[] {
    const points: OverRunRatePoint[] = [];

    let currentInnings = 0;
    let innWickets = 0;
    let innBalls = 0;

    // Per-over accumulators
    let overBalls = 0;    // Legal balls in current over
    let overRuns = 0;     // Runs in current over
    let cumulativeRuns = 0;
    let completedOvers = 0;

    for (const event of events) {
        if (currentInnings === targetInningsIndex) {
            const runs = getEventRuns(event);
            overRuns += runs;
            cumulativeRuns += runs;

            if (isLegalDelivery(event)) {
                overBalls++;
                innBalls++;

                // Over complete (6 legal balls)
                if (overBalls === 6) {
                    completedOvers++;
                    points.push({
                        over: completedOvers,
                        runs: overRuns,
                        cumulativeRuns,
                        runRate: parseFloat((cumulativeRuns / completedOvers).toFixed(2))
                    });
                    overBalls = 0;
                    overRuns = 0;
                }
            }
        } else if (currentInnings > targetInningsIndex) {
            break;
        }

        // Innings transition
        if (event.type === "WICKET") innWickets++;
        if (isLegalDelivery(event) && currentInnings !== targetInningsIndex) {
            // Count balls for non-target innings for transition
        }

        const maxBalls = totalMatchOvers * 6;
        if (innWickets >= 10 || innBalls >= maxBalls) {
            currentInnings++;
            innWickets = 0;
            innBalls = 0;
        }
    }

    // Push partial over (if any balls were bowled but over not complete)
    if (overBalls > 0 && currentInnings === targetInningsIndex) {
        const oversDecimal = completedOvers + overBalls / 6;
        points.push({
            over: completedOvers + 1, // Partial over number
            runs: overRuns,
            cumulativeRuns,
            runRate: parseFloat((cumulativeRuns / oversDecimal).toFixed(2))
        });
    }

    return points;
}
