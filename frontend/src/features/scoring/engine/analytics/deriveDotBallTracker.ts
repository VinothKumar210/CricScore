import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery } from "../utils/deliveryUtils";

export interface DotBallTracker {
    longestDotStreak: number;
    currentDotStreak: number;
    totalDots: number;
    totalBalls: number;
}

export function deriveDotBallTracker(events: BallEvent[], targetInningsIndex: number = 0): DotBallTracker {
    let longestDotStreak = 0;
    let currentDotStreak = 0;
    let totalDots = 0;
    let totalBalls = 0;

    let currentInnings = 0;
    let innWickets = 0;

    for (const event of events) {
        if (event.type === "WICKET") {
            innWickets++;
            if (innWickets >= 10 && currentInnings === 0) {
                currentInnings++;
                innWickets = 0;
            }
        }

        if (currentInnings !== targetInningsIndex) continue;
        if (event.type === "PHASE_CHANGE" || event.type === "INTERRUPTION") continue;

        if (isLegalDelivery(event)) {
            totalBalls++;
        }

        // Determine if dot ball
        // A dot ball is generally a legal delivery with 0 runs scored off the bat and no extras (sometimes byes count as dots for bowler, but for team it's runs).
        // Let's count completely scoreless deliveries.
        let isDot = false;
        if (event.type === "RUN" && event.runs === 0) {
            isDot = true;
        } else if (event.type === "WICKET") {
            isDot = true; // Wicket without runs usually a dot
            // Unless they ran before caught/runout, but event structure handles that if runout + runs.
        }

        if (isDot) {
            currentDotStreak++;
            totalDots++;
            if (currentDotStreak > longestDotStreak) {
                longestDotStreak = currentDotStreak;
            }
        } else {
            // Not a dot ball (runs were scored or extra)
            currentDotStreak = 0;
        }
    }

    return {
        longestDotStreak,
        currentDotStreak,
        totalDots,
        totalBalls
    };
}
