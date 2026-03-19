import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery } from "../utils/deliveryUtils";

export interface RRRDataPoint {
    overNumber: number; // Can be decimal like 14.1
    runsRequired: number;
    ballsRemaining: number;
    rrr: number;
}

export function deriveRequiredRateProgression(events: BallEvent[], targetScore: number, totalOvers: number = 20): RRRDataPoint[] {
    const data: RRRDataPoint[] = [];

    let currentInnings = 0;
    let innWickets = 0;
    
    let totalRuns = 0;
    let legalBalls = 0;
    const totalMatchBalls = totalOvers * 6;

    for (const event of events) {
        if (event.type === "WICKET") {
            innWickets++;
            if (innWickets >= 10 && currentInnings === 0) {
                currentInnings++;
                innWickets = 0;
            }
        }

        if (currentInnings !== 1) continue; // Only process the run chase
        if (event.type === "PHASE_CHANGE" || event.type === "INTERRUPTION") continue;

        let ballRuns = 0;
        if (event.type === "RUN") {
            ballRuns = event.runs;
        } else if (event.type === "EXTRA") {
            if (event.extraType === "WIDE" || event.extraType === "NO_BALL") {
                ballRuns = 1 + (event.additionalRuns || 0) + (event.extraType === "NO_BALL" ? (event.runsOffBat || 0) : 0);
            } else if (event.extraType === "BYE" || event.extraType === "LEG_BYE" || event.extraType === "PENALTY") {
                ballRuns = (event.additionalRuns || 0) + (event.runsOffBat || 0);
            }
        }
        totalRuns += ballRuns;

        if (isLegalDelivery(event)) {
            legalBalls++;
            
            // Record data point at end of every over
            if (legalBalls % 6 === 0) {
                const ballsRemaining = totalMatchBalls - legalBalls;
                const runsRequired = targetScore - totalRuns;
                const oversRemaining = ballsRemaining / 6;
                let rrr = 0;
                
                if (oversRemaining > 0 && runsRequired > 0) {
                    rrr = runsRequired / oversRemaining;
                }

                data.push({
                    overNumber: legalBalls / 6,
                    runsRequired: Math.max(0, runsRequired),
                    ballsRemaining: Math.max(0, ballsRemaining),
                    rrr: Number(rrr.toFixed(2))
                });
            }
        }
    }

    // Add trailing partial over if any
    if (legalBalls > 0 && legalBalls % 6 !== 0) {
        const ballsRemaining = totalMatchBalls - legalBalls;
        const runsRequired = targetScore - totalRuns;
        const oversRemaining = ballsRemaining / 6;
        let rrr = 0;
        
        if (oversRemaining > 0 && runsRequired > 0) {
            rrr = runsRequired / oversRemaining;
        }

        const oversFull = Math.floor(legalBalls / 6);
        const rem = legalBalls % 6;
        const partialOver = Number(`${oversFull}.${rem}`);

        data.push({
            overNumber: partialOver,
            runsRequired: Math.max(0, runsRequired),
            ballsRemaining: Math.max(0, ballsRemaining),
            rrr: Number(rrr.toFixed(2))
        });
    }

    return data;
}
