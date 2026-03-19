import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery } from "../utils/deliveryUtils";

export interface BowlerEconomyDataPoint {
    overNumber: number; // e.g. 1st over they bowled, 2nd over they bowled
    runsGiven: number;
    economy: number; // Cumulative economy up to this over
    wickets: number;
}

export function deriveEconomyProgression(events: BallEvent[], bowlerId: string): BowlerEconomyDataPoint[] {
    const data: BowlerEconomyDataPoint[] = [];

    // Filter events for this bowler
    const bowlerEvents = events.filter(e => e.bowlerId === bowlerId && e.type !== "PHASE_CHANGE" && e.type !== "INTERRUPTION");
    
    let cumulativeRuns = 0;
    let cumulativeLegalBalls = 0;
    
    let currentOverRuns = 0;
    let currentOverWickets = 0;
    let overLegalBalls = 0;
    let spellOverCount = 1;

    const commitOver = () => {
        cumulativeRuns += currentOverRuns;
        const economy = (cumulativeRuns / (cumulativeLegalBalls / 6));

        data.push({
            overNumber: spellOverCount,
            runsGiven: currentOverRuns,
            wickets: currentOverWickets,
            economy: Number(economy.toFixed(2))
        });
        
        spellOverCount++;
        currentOverRuns = 0;
        currentOverWickets = 0;
        overLegalBalls = 0;
    };

    for (const event of bowlerEvents) {
        let ballRuns = 0;
        if (event.type === "RUN") {
            ballRuns += event.runs;
        } else if (event.type === "EXTRA") {
             if (event.extraType === "WIDE" || event.extraType === "NO_BALL") {
                 ballRuns += 1 + (event.additionalRuns || 0) + (event.extraType === "NO_BALL" ? (event.runsOffBat || 0) : 0);
             }
        }
        currentOverRuns += ballRuns;

        if (event.type === "WICKET") {
            const credited = ["BOWLED", "CAUGHT", "LBW", "STUMPED", "HIT_WICKET"].includes(event.dismissalType || "");
            if (credited) currentOverWickets++;
        }

        if (isLegalDelivery(event)) {
            overLegalBalls++;
            cumulativeLegalBalls++;
            if (overLegalBalls === 6) {
                commitOver();
            }
        }
    }

    if (overLegalBalls > 0) {
        // Partial over
        cumulativeRuns += currentOverRuns;
        // Decimal overs definition: e.g. 3.2 overs = 3.333
        const oversDec = Math.floor(cumulativeLegalBalls / 6) + ((cumulativeLegalBalls % 6) / 6);
        const economy = oversDec > 0 ? (cumulativeRuns / oversDec) : 0;

        data.push({
            overNumber: spellOverCount - 1 + ((cumulativeLegalBalls % 6) / 10), // e.g., 3.2
            runsGiven: currentOverRuns,
            wickets: currentOverWickets,
            economy: Number(economy.toFixed(2))
        });
    }

    return data;
}
