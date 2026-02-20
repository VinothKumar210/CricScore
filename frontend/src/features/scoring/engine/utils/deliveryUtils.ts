import type { BallEvent } from "../../types/ballEventTypes";

export function isLegalDelivery(event: BallEvent): boolean {
    if (event.type === "EXTRA") {
        return event.extraType === "BYE" || event.extraType === "LEG_BYE";
    }
    // RUN and WICKET are legal deliveries (consumes a ball)
    return true;
}

/**
 * Returns the total runs scored from a single BallEvent.
 * Used across all analytics/derived-stats engines to avoid duplication.
 */
export function getEventRuns(event: BallEvent): number {
    if (event.type === "RUN") {
        return event.runs;
    }
    if (event.type === "EXTRA") {
        let runs = event.additionalRuns || 0;
        if (event.extraType === "WIDE") {
            runs += 1; // 1 penalty run for wide
        } else if (event.extraType === "NO_BALL") {
            runs += 1; // 1 penalty run for no-ball
            runs += event.runsOffBat || 0;
        }
        // BYE and LEG_BYE: additionalRuns already covers it
        return runs;
    }
    // WICKET: no runs scored (run-out-with-runs not modelled yet)
    return 0;
}
