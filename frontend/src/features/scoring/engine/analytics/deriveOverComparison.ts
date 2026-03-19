import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery } from "../utils/deliveryUtils";

export interface OverComparisonData {
    overNumber: number; // 1-indexed
    innings1Runs: number;
    innings1Wickets: number;
    innings2Runs: number | null;
    innings2Wickets: number | null;
}

export function deriveOverComparison(events: BallEvent[]): OverComparisonData[] {
    const inningsData: { runs: number; wickets: number }[][] = [[], []];

    let currentInnings = 0;
    let innWickets = 0;
    
    let currentOverRuns = 0;
    let currentOverWickets = 0;
    let overLegalBalls = 0;
    let cumulativeRuns = 0;
    let cumulativeWickets = 0;

    const commitOver = () => {
        cumulativeRuns += currentOverRuns;
        cumulativeWickets += currentOverWickets;
        inningsData[currentInnings].push({
            runs: cumulativeRuns,
            wickets: cumulativeWickets
        });
        currentOverRuns = 0;
        currentOverWickets = 0;
        overLegalBalls = 0;
    };

    for (const event of events) {
        if (event.type === "PHASE_CHANGE" || event.type === "INTERRUPTION") continue;

        let ballRuns = 0;
        if (event.type === "RUN") {
            ballRuns += event.runs;
        } else if (event.type === "EXTRA") {
            if (event.extraType === "WIDE" || event.extraType === "NO_BALL") {
                ballRuns += 1 + (event.additionalRuns || 0) + (event.extraType === "NO_BALL" ? (event.runsOffBat || 0) : 0);
            } else if (event.extraType === "BYE" || event.extraType === "LEG_BYE") {
                ballRuns += (event.additionalRuns || 0) + (event.runsOffBat || 0);
            } else if (event.extraType === "PENALTY") {
                ballRuns += (event.additionalRuns || 0);
            }
        }
        currentOverRuns += ballRuns;

        if (event.type === "WICKET") {
            currentOverWickets++;
            innWickets++;
        }

        if (isLegalDelivery(event)) {
            overLegalBalls++;
            if (overLegalBalls === 6) {
                commitOver();
            }
        }

        // Innings transition
        if (innWickets >= 10 && currentInnings === 0) {
            if (overLegalBalls > 0) commitOver();
            currentInnings = 1;
            innWickets = 0;
            cumulativeRuns = 0;
            cumulativeWickets = 0;
            currentOverRuns = 0;
            currentOverWickets = 0;
            overLegalBalls = 0;
        }
    }

    // Capture partial over if match ended abruptly or is live
    if (overLegalBalls > 0) {
        commitOver();
    }

    // Merge innings data
    const maxLength = Math.max(inningsData[0].length, inningsData[1].length);
    const result: OverComparisonData[] = [];

    for (let i = 0; i < maxLength; i++) {
        const inn1 = inningsData[0][i];
        const inn2 = inningsData[1][i];

        result.push({
            overNumber: i + 1,
            innings1Runs: inn1 ? inn1.runs : (inningsData[0][inningsData[0].length - 1]?.runs || 0),
            innings1Wickets: inn1 ? inn1.wickets : (inningsData[0][inningsData[0].length - 1]?.wickets || 0),
            innings2Runs: inn2 ? inn2.runs : (i < inningsData[1].length ? 0 : null),
            innings2Wickets: inn2 ? inn2.wickets : (i < inningsData[1].length ? 0 : null),
        });
    }

    return result;
}
