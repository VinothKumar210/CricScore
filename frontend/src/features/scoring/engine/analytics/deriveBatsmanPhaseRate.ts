import type { BallEvent } from "../../types/ballEventTypes";

export interface PhaseStats {
    runs: number;
    balls: number;
    sr: number;
    boundaries: number;
    dots: number;
}

export interface BatsmanPhaseRate {
    powerplay: PhaseStats;
    middleOvers: PhaseStats;
    deathOvers: PhaseStats;
}

export function deriveBatsmanPhaseRate(events: BallEvent[], batsmanId?: string, powerplayOvers: number = 6, totalOvers: number = 20): BatsmanPhaseRate {
    const data: BatsmanPhaseRate = {
        powerplay: { runs: 0, balls: 0, sr: 0, boundaries: 0, dots: 0 },
        middleOvers: { runs: 0, balls: 0, sr: 0, boundaries: 0, dots: 0 },
        deathOvers: { runs: 0, balls: 0, sr: 0, boundaries: 0, dots: 0 },
    };

    const targetEvents = batsmanId ? events.filter(e => e.batsmanId === batsmanId) : events.filter(e => e.type !== "PHASE_CHANGE" && e.type !== "INTERRUPTION");
    
    // Define death overs boundary (typically last 4-5 overs for T20)
    // If 20 overs: PP is 1-6 (0.1 to 6.0), Middle is 7-15, Death is 16-20.
    const deathStartOver = totalOvers >= 20 ? totalOvers - 5 : totalOvers - Math.floor(totalOvers * 0.25);

    for (const event of targetEvents) {
        if (!event.overNumber) continue;

        let phaseKey: keyof BatsmanPhaseRate = "middleOvers";
        if (event.overNumber <= powerplayOvers) {
            phaseKey = "powerplay";
        } else if (event.overNumber > deathStartOver) {
            phaseKey = "deathOvers";
        }

        const phase = data[phaseKey];

        let batRuns = 0;
        let faced = false;
        let isDot = false;
        let isBoundary = false;

        if (event.type === "RUN") {
            batRuns = event.runs;
            faced = true;
            if (batRuns === 0) isDot = true;
            if (batRuns === 4 || batRuns === 6) isBoundary = true;
        } else if (event.type === "EXTRA") {
            if (event.extraType === "NO_BALL") {
                batRuns = event.runsOffBat || 0;
                faced = true;
                if (batRuns === 0) isDot = true;
                if (batRuns === 4 || batRuns === 6) isBoundary = true;
            } else if (event.extraType !== "WIDE") {
                faced = true; // Byes/Leg byes count as faced
                isDot = true; // 0 off bat
            }
        } else if (event.type === "WICKET") {
            faced = true;
            isDot = true; // Typically 0 runs if out
        }

        if (faced) {
            phase.runs += batRuns;
            phase.balls += 1;
            if (isDot) phase.dots++;
            if (isBoundary) phase.boundaries++;
        }
    }

    // Assign SRs
    (["powerplay", "middleOvers", "deathOvers"] as const).forEach(k => {
        const d = data[k];
        d.sr = d.balls > 0 ? Number(((d.runs / d.balls) * 100).toFixed(2)) : 0;
    });

    return data;
}
