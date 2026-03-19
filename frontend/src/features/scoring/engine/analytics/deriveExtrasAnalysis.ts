import type { BallEvent } from "../../types/ballEventTypes";

export interface ExtrasBreakdown {
    wides: number;
    widesRuns: number;
    noBalls: number;
    noBallsRuns: number;
    byes: number;
    legByes: number;
    penalties: number;
    totalExtras: number;
}

export function deriveExtrasAnalysis(events: BallEvent[], targetInningsIndex: number = 0): ExtrasBreakdown {
    let currentInnings = 0;
    let innWickets = 0;

    const data: ExtrasBreakdown = {
        wides: 0,
        widesRuns: 0,
        noBalls: 0,
        noBallsRuns: 0,
        byes: 0,
        legByes: 0,
        penalties: 0,
        totalExtras: 0
    };

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

        if (event.type === "EXTRA") {
            if (event.extraType === "WIDE") {
                data.wides++;
                const runs = 1 + (event.additionalRuns || 0);
                data.widesRuns += runs;
                data.totalExtras += runs;
            } else if (event.extraType === "NO_BALL") {
                data.noBalls++;
                const extraPart = 1 + (event.additionalRuns || 0);
                const batPart = event.runsOffBat || 0;
                data.noBallsRuns += (extraPart + batPart);
                data.totalExtras += extraPart;
            } else if (event.extraType === "BYE") {
                const runs = event.additionalRuns || 0;
                data.byes += runs;
                data.totalExtras += runs;
            } else if (event.extraType === "LEG_BYE") {
                const runs = event.additionalRuns || 0;
                data.legByes += runs;
                data.totalExtras += runs;
            } else if (event.extraType === "PENALTY") {
                if (!(event as any).teamId) { 
                    const pts = event.additionalRuns || 0;
                    data.penalties += pts;
                    data.totalExtras += pts;
                }
            }
        }
    }

    return data;
}
