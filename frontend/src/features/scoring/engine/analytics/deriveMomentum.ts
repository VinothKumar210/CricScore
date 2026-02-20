import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery } from "../utils/deliveryUtils";

export interface MomentumState {
    impact: number;
    trend: "UP" | "DOWN" | "STABLE";
}

const MOMENTUM_WINDOW = 6; // Last 6 legal balls

/**
 * Returns the weighted momentum impact of the last N legal deliveries.
 * Pure function — no mutation, replay-safe, undo-safe.
 */
export function deriveMomentum(
    events: BallEvent[],
    targetInningsIndex: number,
    totalMatchOvers: number = 20
): MomentumState {
    // Collect inning-scoped events
    const inningsEvents = filterInningsEvents(events, targetInningsIndex, totalMatchOvers);

    // Take last MOMENTUM_WINDOW events (all events, not just legal — but weight only applies to all)
    // Actually spec says "last 6 legal balls" — so we filter to legal first? 
    // But wickets and extras also have impact weights. Let's keep all events in window.
    const window = inningsEvents.slice(-MOMENTUM_WINDOW);

    let impact = 0;
    for (const event of window) {
        impact += getEventWeight(event);
    }

    const trend: MomentumState["trend"] =
        impact >= 5 ? "UP" :
            impact <= -5 ? "DOWN" :
                "STABLE";

    return { impact: parseFloat(impact.toFixed(1)), trend };
}

function getEventWeight(event: BallEvent): number {
    if (event.type === "WICKET") return -6;

    if (event.type === "EXTRA") {
        // Wide / No Ball = +1
        if (event.extraType === "WIDE" || event.extraType === "NO_BALL") {
            let w = 1;
            // If NB with bat runs, add bat-run weight too
            if (event.extraType === "NO_BALL" && event.runsOffBat) {
                w += getRunWeight(event.runsOffBat);
            }
            return w;
        }
        // Byes/LBs — treat like dot or runs depending on additionalRuns
        return (event.additionalRuns || 0) > 0 ? 0.5 : -1;
    }

    if (event.type === "RUN") {
        return getRunWeight(event.runs);
    }

    return 0;
}

function getRunWeight(runs: number): number {
    switch (runs) {
        case 0: return -1;
        case 1: return 0.5;
        case 2: return 1;
        case 3: return 1.5;
        case 4: return 3;
        case 6: return 5;
        default: return 0;
    }
}

/**
 * Filters events belonging to the target innings.
 * Replicates the innings-transition logic used across all engines.
 */
function filterInningsEvents(
    events: BallEvent[],
    targetInningsIndex: number,
    totalMatchOvers: number
): BallEvent[] {
    const result: BallEvent[] = [];
    let currentInnings = 0;
    let innWickets = 0;
    let innBalls = 0;

    for (const event of events) {
        if (currentInnings === targetInningsIndex) {
            result.push(event);
        } else if (currentInnings > targetInningsIndex) {
            break;
        }

        // Transition tracking
        if (event.type === "WICKET") innWickets++;
        if (isLegalDelivery(event)) innBalls++;

        const maxBalls = totalMatchOvers * 6;
        if (innWickets >= 10 || innBalls >= maxBalls) {
            currentInnings++;
            innWickets = 0;
            innBalls = 0;
        }
    }

    return result;
}
