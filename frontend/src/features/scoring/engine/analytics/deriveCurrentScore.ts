import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery } from "../utils/deliveryUtils";

export interface CurrentScore {
    totalRuns: number;
    totalWickets: number;
    oversString: string; // "14.2"
    runRate: number;
    extras: {
        wides: number;
        noBalls: number;
        byes: number;
        legByes: number;
        penalty: number;
        total: number; // Sum of all extras runs
    };
}

export function deriveCurrentScore(events: BallEvent[], targetInningsIndex: number = 0): CurrentScore {
    let currentInnings = 0;
    let innWickets = 0;

    const extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 };
    let totalRuns = 0;
    let totalWickets = 0;
    let legalBalls = 0;

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
            legalBalls++;
        }

        if (event.type === "WICKET") {
            totalWickets++;
        }

        if (event.type === "RUN") {
            totalRuns += event.runs;
        } else if (event.type === "EXTRA") {
            if (event.extraType === "WIDE") {
                const totalExtraRuns = 1 + (event.additionalRuns || 0);
                extras.wides += totalExtraRuns;
                extras.total += totalExtraRuns;
                totalRuns += totalExtraRuns;
            } else if (event.extraType === "NO_BALL") {
                const extraPart = 1 + (event.additionalRuns || 0);
                const batRuns = (event.runsOffBat || 0);
                extras.noBalls += extraPart;
                extras.total += extraPart; // Bat runs are NOT extras
                totalRuns += (extraPart + batRuns);
            } else if (event.extraType === "BYE") {
                extras.byes += (event.additionalRuns || 0);
                extras.total += (event.additionalRuns || 0);
                totalRuns += (event.additionalRuns || 0);
            } else if (event.extraType === "LEG_BYE") {
                extras.legByes += (event.additionalRuns || 0);
                extras.total += (event.additionalRuns || 0);
                totalRuns += (event.additionalRuns || 0);
            } else if (event.extraType === "PENALTY") {
                const pts = event.additionalRuns || 0;
                // Since this pure function only analyzes the events sequentially for the target innings,
                // if it's penalty awarded to bowling team, it should not be processed here unless handled gracefully.
                // Assuming standard:
                if ((event as any).teamId) {
                    // It's a penalty awarded to a specific team
                    // We only add if it's awarded to the target team. This requires knowing which team is batting...
                    // For pure function without knowledge of teams, we just count it if it has no team ID (Short Run)
                } else {
                    extras.penalty += pts;
                    extras.total += pts;
                    totalRuns += pts;
                }
            }
        }
    }

    const oversFull = Math.floor(legalBalls / 6);
    const ballsRem = legalBalls % 6;
    const oversString = `${oversFull}.${ballsRem}`;
    
    const oversDecimal = oversFull + (ballsRem / 6);
    const runRate = oversDecimal > 0 ? parseFloat((totalRuns / oversDecimal).toFixed(2)) : 0;

    return {
        totalRuns,
        totalWickets,
        oversString,
        runRate,
        extras
    };
}
