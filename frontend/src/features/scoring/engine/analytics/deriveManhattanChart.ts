import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery } from "../utils/deliveryUtils";

export interface ManhattanBar {
    overNumber: number; // 1-indexed
    runs: number;
    wickets: number;
}

export function deriveManhattanChart(events: BallEvent[], targetInningsIndex: number = 0): ManhattanBar[] {
    const bars: ManhattanBar[] = [];
    
    let currentInnings = 0;
    let innWickets = 0;
    
    let currentOverRuns = 0;
    let currentOverWickets = 0;
    let overLegalBalls = 0;
    let currentOverNumber = 1;

    const commitOver = () => {
        bars.push({
            overNumber: currentOverNumber,
            runs: currentOverRuns,
            wickets: currentOverWickets
        });
        currentOverNumber++;
        currentOverRuns = 0;
        currentOverWickets = 0;
        overLegalBalls = 0;
    };

    for (const event of events) {
        if (event.type === "WICKET") {
            innWickets++;
            if (innWickets >= 10 && currentInnings === 0) {
                if (currentInnings === targetInningsIndex && overLegalBalls > 0) commitOver();
                currentInnings++;
                innWickets = 0;
                currentOverNumber = 1;
                overLegalBalls = 0;
                currentOverRuns = 0;
                currentOverWickets = 0;
            }
            if (currentInnings === targetInningsIndex) currentOverWickets++;
        }

        if (currentInnings !== targetInningsIndex) continue;
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
        currentOverRuns += ballRuns;

        if (isLegalDelivery(event)) {
            overLegalBalls++;
            if (overLegalBalls === 6) {
                commitOver();
            }
        }
    }

    if (currentInnings === targetInningsIndex && overLegalBalls > 0) {
        commitOver();
    }

    return bars;
}
