import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery } from "../utils/deliveryUtils";

export interface PartnershipStats {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
}

export interface PartnershipSummary {
    current: PartnershipStats;
    highest: PartnershipStats;
}

const createEmptyStats = (): PartnershipStats => ({
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0
});

export function derivePartnership(events: BallEvent[], targetInningsIndex: number, totalOvers: number = 20): PartnershipSummary {
    return processEvents(events, targetInningsIndex, totalOvers);
}

function processEvents(events: BallEvent[], targetInningsIndex: number, totalOvers: number = 20): PartnershipSummary {
    let currentStats = createEmptyStats();
    let highestStats = createEmptyStats();

    let currentInnings = 0;

    // Track innings state to detect switching
    let innWickets = 0;
    let innBalls = 0; // Legal balls

    for (const event of events) {
        // Determine if we should switch innings BEFORE processing?
        // Logic: if previous event ended innings.
        // But we update state incrementally.

        // Check if we are in the target innings
        if (currentInnings === targetInningsIndex) {
            processEventForPartnership(event, currentStats);

            // Update highest if current > highest, or if runs are equal but balls are higher
            if (currentStats.runs > highestStats.runs || (currentStats.runs === highestStats.runs && currentStats.balls > highestStats.balls)) {
                highestStats = { ...currentStats };
            }
        }

        // Update innings state (Wickets/Balls) to check for switch
        // Uses simplified logic matching `applyEvent` roughly
        if (event.type === "WICKET") {
            innWickets++;
        }

        if (isLegalDelivery(event)) {
            innBalls++;
        }

        // Check for Innings End
        const maxBalls = totalOvers * 6;
        if (innWickets >= 10 || innBalls >= maxBalls) {
            currentInnings++;
            innWickets = 0;
            innBalls = 0;
            // If we just finished the target innings, we can break?
            if (currentInnings > targetInningsIndex) break;
        }

        // After processing the event and updating the highest stats,
        // if this was a wicket in the target innings, reset the current partnership for the next ball
        if (event.type === "WICKET" && currentInnings === targetInningsIndex) {
            currentStats = createEmptyStats();
        }
    }

    return {
        current: currentStats,
        highest: highestStats
    };
}

function processEventForPartnership(event: BallEvent, stats: PartnershipStats) {
    // Runs
    let totalRuns = 0;
    if (event.type === "RUN") {
        totalRuns += event.runs;
        if (event.runs === 4) stats.fours++;
        if (event.runs === 6) stats.sixes++;
    } else if (event.type === "EXTRA") {
        totalRuns += (event.additionalRuns || 0); // Base extras

        if (event.extraType === "WIDE") {
            totalRuns += 1;
            // Wides don't count as fours/sixes usually unless 4 wds?
            // "Include runsOffBat + additionalRuns"
        } else if (event.extraType === "NO_BALL") {
            totalRuns += 1;
            totalRuns += (event.runsOffBat || 0);
            if (event.runsOffBat === 4) stats.fours++;
            if (event.runsOffBat === 6) stats.sixes++;
        } else if (event.extraType === "BYE" || event.extraType === "LEG_BYE") {
            // Runs included
        }
    } else if (event.type === "WICKET") {
        // Wickets don't typically add runs unless modelled specifically (like run out with runs completed)
        // But we DO need to make sure the ball counts. That's handled below by isLegalDelivery.
    }

    stats.runs += totalRuns;

    // Balls
    if (isLegalDelivery(event)) {
        stats.balls++;
    }
}
