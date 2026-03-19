import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery } from "../utils/deliveryUtils";

export interface MaidenOverData {
    bowlerId: string;
    overNumber: number;
    inningsIndex: number;
}

export function deriveMaidenOvers(events: BallEvent[]): MaidenOverData[] {
    const maidens: MaidenOverData[] = [];
    
    let currentInnings = 0;
    let innWickets = 0;

    let currentOverNumber = 1;
    let currentBowlerId = "";
    let currentOverRunsConceded = 0; // Runs credited to bowler
    let overLegalBalls = 0;

    const commitOver = () => {
        if (overLegalBalls === 6 && currentOverRunsConceded === 0 && currentBowlerId) {
            maidens.push({
                bowlerId: currentBowlerId,
                overNumber: currentOverNumber,
                inningsIndex: currentInnings
            });
        }
        currentOverNumber++;
        currentOverRunsConceded = 0;
        overLegalBalls = 0;
        currentBowlerId = "";
    };

    for (const event of events) {
        if (event.type === "WICKET") {
            innWickets++;
            if (innWickets >= 10 && currentInnings === 0) {
                if (overLegalBalls > 0) commitOver();
                currentInnings++;
                innWickets = 0;
                currentOverNumber = 1;
                overLegalBalls = 0;
                currentOverRunsConceded = 0;
                continue;
            }
        }

        if (event.type === "PHASE_CHANGE" || event.type === "INTERRUPTION") continue;

        const bowlerId = event.bowlerId;
        if (!bowlerId) continue;

        if (currentBowlerId && currentBowlerId !== bowlerId && overLegalBalls > 0) {
            commitOver(); // Bowling change mid-over
        }

        currentBowlerId = bowlerId;

        // Calculate runs conceded by bowler
        let ballRuns = 0;
        if (event.type === "RUN") {
            ballRuns += event.runs;
        } else if (event.type === "EXTRA") {
             if (event.extraType === "WIDE" || event.extraType === "NO_BALL") {
                 ballRuns += 1 + (event.additionalRuns || 0) + (event.extraType === "NO_BALL" ? (event.runsOffBat || 0) : 0);
             }
        }
        currentOverRunsConceded += ballRuns;

        if (isLegalDelivery(event)) {
            overLegalBalls++;
            if (overLegalBalls === 6) {
                commitOver();
            }
        }
    }

    if (overLegalBalls > 0) {
        commitOver(); // Might be a maiden if they abruptly ended the innings
    }

    return maidens;
}
