import type { BallEvent } from "../../types/ballEventTypes";

export interface RunningAnalysis {
    dots: number;
    singles: number;
    twos: number;
    threes: number;
    fours: number;
    sixes: number;
    extras: number; // Events where all runs came from extras
}

export function deriveRunningAnalysis(events: BallEvent[], targetInningsIndex: number = 0): RunningAnalysis {
    let currentInnings = 0;
    let innWickets = 0;

    const analysis: RunningAnalysis = {
        dots: 0,
        singles: 0,
        twos: 0,
        threes: 0,
        fours: 0,
        sixes: 0,
        extras: 0
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

        if (event.type === "RUN") {
            if (event.runs === 0) analysis.dots++;
            else if (event.runs === 1) analysis.singles++;
            else if (event.runs === 2) analysis.twos++;
            else if (event.runs === 3) analysis.threes++;
            else if (event.runs === 4) analysis.fours++;
            else if (event.runs === 6) analysis.sixes++;
        } else if (event.type === "EXTRA") {
            if (event.extraType === "NO_BALL" && (event.runsOffBat || 0) > 0) {
                // Determine running based on bat runs
                const batRuns = event.runsOffBat;
                if (batRuns === 1) analysis.singles++;
                else if (batRuns === 2) analysis.twos++;
                else if (batRuns === 3) analysis.threes++;
                else if (batRuns === 4) analysis.fours++;
                else if (batRuns === 6) analysis.sixes++;
                else analysis.dots++; // Technically 0 off bat
            } else {
                analysis.extras++;
            }
        } else if (event.type === "WICKET") {
            // Usually dot, but if they ran before wicket, it's complex
            // Simple: treat as dot if no runs attached (event.runs not existing on WicketEvent directly)
            analysis.dots++;
        }
    }

    return analysis;
}
