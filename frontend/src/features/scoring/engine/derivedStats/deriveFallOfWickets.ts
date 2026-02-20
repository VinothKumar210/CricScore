import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery } from "../utils/deliveryUtils";

export interface FallOfWicket {
    wicketNumber: number;
    score: string; // "45/2"
    batsmanId: string;
    over: string;
}

export function deriveFallOfWickets(events: BallEvent[], targetInningsIndex: number): FallOfWicket[] {
    const fowList: FallOfWicket[] = [];

    let currentInnings = 0;

    // Running Totals
    let totalRuns = 0;
    let totalWickets = 0;
    let legalBalls = 0;

    for (const event of events) {
        if (currentInnings === targetInningsIndex) {
            // Update Score for snapshot
            let runsInEvent = 0;
            if (event.type === "RUN") {
                runsInEvent += event.runs;
            } else if (event.type === "EXTRA") {
                runsInEvent += (event.additionalRuns || 0);
                if (event.extraType === "NO_BALL") runsInEvent += (event.runsOffBat || 0);
            }
            totalRuns += runsInEvent;

            // Update Balls (to calc over string)
            if (isLegalDelivery(event)) {
                legalBalls++;
            }

            // Check Wicket
            if (event.type === "WICKET") {
                totalWickets++;

                const oversFull = Math.floor(legalBalls / 6);
                const ballsRem = legalBalls % 6;
                // Format: "4.2"
                // Standard FOW notation uses completed overs + balls?
                // If it's the run out on the last ball (6th legal ball)?
                // ballsRem == 0 -> "x.0"?
                // "4.2" usually means 4 overs done, 2 balls into 5th.
                // If legalBalls = 26 (4*6 + 2).
                // oversFull = 4. ballsRem = 2. -> "4.2". Correct.

                // Special case: legalBalls=6 (1 over).
                // oversFull=1. ballsRem=0. -> "1.0". Correct.

                const overStr = `${oversFull}.${ballsRem}`;

                fowList.push({
                    wicketNumber: totalWickets,
                    score: `${totalRuns}/${totalWickets}`,
                    batsmanId: event.batsmanId,
                    over: overStr
                });
            }
        }

        // Innings Transition Logic (Simplified 10 wickets)
        if (event.type === "WICKET") {
            // We can't rely on `totalWickets` because that resets? 
            // Logic in other engines uses a local counter that tracks ALL innings.
            // Here we only track logic inside current...
            // Wait, if I want to correctly track `currentInnings` variable, I must check ALL events.
        }
    }

    // RE-WRITE LOOP TO TRACK INNINGS CORRECTLY
    // Resetting for safety
    currentInnings = 0;
    let innWickets = 0;

    // Clear list to avoid duplication if I appended above?
    // No, I need ONE pass.
    // The previous loop was buggy because I didn't update `currentInnings`.

    // Reset List
    fowList.length = 0;
    totalRuns = 0;
    totalWickets = 0;
    legalBalls = 0;

    for (const event of events) {
        if (currentInnings === targetInningsIndex) {
            // ... Logic ...
            let runsInEvent = 0;
            if (event.type === "RUN") {
                runsInEvent += event.runs;
            } else if (event.type === "EXTRA") {
                runsInEvent += (event.additionalRuns || 0);
                if (event.extraType === "NO_BALL") runsInEvent += (event.runsOffBat || 0);
            }
            totalRuns += runsInEvent;

            if (isLegalDelivery(event)) {
                legalBalls++;
            }

            if (event.type === "WICKET") {
                totalWickets++;
                const oversFull = Math.floor(legalBalls / 6);
                const ballsRem = legalBalls % 6;
                const overStr = `${oversFull}.${ballsRem}`;
                fowList.push({
                    wicketNumber: totalWickets,
                    score: `${totalRuns}/${totalWickets}`,
                    batsmanId: event.batsmanId,
                    over: overStr
                });
            }
        }

        // TRANSITION
        if (event.type === "WICKET") {
            innWickets++;
            if (innWickets >= 10) {
                currentInnings++;
                innWickets = 0;
                // Reset local trackers if we just entered the target?
                // Actually if valid feed, currentInnings increments.
                // Do I need to reset totalRuns/etc if I enter target?
                // `totalRuns` accumulates only IF currentInnings == target. So it starts at 0.
            }
        }
    }

    return fowList;
}
