import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery } from "../utils/deliveryUtils";

export interface BowlerPhaseStats {
    overs: number; // Stored in balls
    runs: number;
    wickets: number;
    economy: number;
}

export interface BowlerPhaseBreakdown {
    bowlerId: string;
    powerplay: BowlerPhaseStats;
    middleOvers: BowlerPhaseStats;
    deathOvers: BowlerPhaseStats;
}

export function deriveBowlerOverBreakdown(events: BallEvent[], powerplayOvers: number = 6, totalOvers: number = 20): Record<string, BowlerPhaseBreakdown> {
    const data: Record<string, BowlerPhaseBreakdown> = {};
    const deathStartOver = totalOvers >= 20 ? totalOvers - 5 : totalOvers - Math.floor(totalOvers * 0.25);

    for (const event of events) {
        if (event.type === "PHASE_CHANGE" || event.type === "INTERRUPTION") continue;

        const bowlerId = event.bowlerId;
        if (!bowlerId) continue;

        if (!data[bowlerId]) {
            data[bowlerId] = {
                bowlerId,
                powerplay: { overs: 0, runs: 0, wickets: 0, economy: 0 },
                middleOvers: { overs: 0, runs: 0, wickets: 0, economy: 0 },
                deathOvers: { overs: 0, runs: 0, wickets: 0, economy: 0 }
            };
        }

        const bData = data[bowlerId];
        const overNum = event.overNumber || 1;
        
        let phaseKey: keyof Omit<BowlerPhaseBreakdown, "bowlerId"> = "middleOvers";
        if (overNum <= powerplayOvers) phaseKey = "powerplay";
        else if (overNum > deathStartOver) phaseKey = "deathOvers";

        const phase = bData[phaseKey];

        // Runs conceded
        let ballRuns = 0;
        if (event.type === "RUN") {
            ballRuns += event.runs;
        } else if (event.type === "EXTRA") {
             if (event.extraType === "WIDE" || event.extraType === "NO_BALL") {
                 ballRuns += 1 + (event.additionalRuns || 0) + (event.extraType === "NO_BALL" ? (event.runsOffBat || 0) : 0);
             } // Byes/Leg byes don't count against bowler
        }
        phase.runs += ballRuns;

        // Wickets
        if (event.type === "WICKET") {
            const credited = ["BOWLED", "CAUGHT", "LBW", "STUMPED", "HIT_WICKET"].includes(event.dismissalType || "");
            if (credited) phase.wickets++;
        }

        // Balls
        if (isLegalDelivery(event)) {
            phase.overs++;
        }
    }

    // Calculate economies
    Object.values(data).forEach(bowler => {
        (["powerplay", "middleOvers", "deathOvers"] as const).forEach(k => {
            const p = bowler[k];
            const oversDec = Math.floor(p.overs / 6) + ((p.overs % 6) / 6);
            p.economy = oversDec > 0 ? Number((p.runs / oversDec).toFixed(2)) : 0;
        });
    });

    return data;
}
