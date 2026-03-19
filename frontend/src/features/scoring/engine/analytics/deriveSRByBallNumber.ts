import type { BallEvent } from "../../types/ballEventTypes";

export interface SRByBallNumber {
    1: { runs: number; balls: number; sr: number };
    2: { runs: number; balls: number; sr: number };
    3: { runs: number; balls: number; sr: number };
    4: { runs: number; balls: number; sr: number };
    5: { runs: number; balls: number; sr: number };
    6: { runs: number; balls: number; sr: number };
    "7+": { runs: number; balls: number; sr: number }; // Extras balls
}

export function deriveSRByBallNumber(events: BallEvent[], batsmanId?: string): SRByBallNumber {
    const data: SRByBallNumber = {
        1: { runs: 0, balls: 0, sr: 0 },
        2: { runs: 0, balls: 0, sr: 0 },
        3: { runs: 0, balls: 0, sr: 0 },
        4: { runs: 0, balls: 0, sr: 0 },
        5: { runs: 0, balls: 0, sr: 0 },
        6: { runs: 0, balls: 0, sr: 0 },
        "7+": { runs: 0, balls: 0, sr: 0 },
    };

    const targetEvents = batsmanId ? events.filter(e => e.batsmanId === batsmanId) : events.filter(e => e.type !== "PHASE_CHANGE" && e.type !== "INTERRUPTION");
    
    for (const event of targetEvents) {
        if (!event.ballNumber) continue;

        let key: keyof SRByBallNumber = "7+";
        if (event.ballNumber <= 6 && event.ballNumber >= 1) {
            key = event.ballNumber as keyof SRByBallNumber;
        }

        let batRuns = 0;
        let faced = false;

        if (event.type === "RUN") {
            batRuns = event.runs;
            faced = true;
        } else if (event.type === "EXTRA") {
            if (event.extraType === "NO_BALL") {
                batRuns = event.runsOffBat || 0;
                faced = true;
            } else if (event.extraType !== "WIDE") {
                faced = true; // Byes/Leg byes count as ball faced for the batter
            }
        } else if (event.type === "WICKET") {
            faced = true;
        }

        if (faced) {
            data[key].runs += batRuns;
            data[key].balls += 1;
        }
    }

    // Calculate SRs
    (Object.keys(data) as (keyof typeof data)[]).forEach(k => {
        const d = data[k];
        d.sr = d.balls > 0 ? Number(((d.runs / d.balls) * 100).toFixed(2)) : 0;
    });

    return data;
}
