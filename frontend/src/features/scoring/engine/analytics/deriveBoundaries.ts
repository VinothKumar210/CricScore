import type { BallEvent } from "../../types/ballEventTypes";

export interface BoundaryAnalysis {
    totalFours: number;
    totalSixes: number;
    fourRuns: number;
    sixRuns: number;
    boundaryRuns: number;
    totalRuns: number;
    boundaryPercentage: number; // 0 to 100
    runningBetweenWicketsRuns: number;
    runningPercentage: number; // 0 to 100
}

export function deriveBoundaries(events: BallEvent[], targetInningsIndex: number = 0): BoundaryAnalysis {
    let currentInnings = 0;
    let innWickets = 0;

    let totalFours = 0;
    let totalSixes = 0;
    let totalRuns = 0;

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

        let ballRuns = 0;
        let batRuns = 0;
        
        if (event.type === "RUN") {
            ballRuns = event.runs;
            batRuns = event.runs;
        } else if (event.type === "EXTRA") {
            if (event.extraType === "WIDE") {
                ballRuns = 1 + (event.additionalRuns || 0);
                // Wides are usually boundaries if runs = 4, but they are wide boundaries, not bat boundaries
                // We typically only count bat boundaries for 4s and 6s
            } else if (event.extraType === "NO_BALL") {
                ballRuns = 1 + (event.additionalRuns || 0) + (event.runsOffBat || 0);
                batRuns = event.runsOffBat || 0;
            } else {
                ballRuns = event.additionalRuns || 0;
            }
        }

        totalRuns += ballRuns;

        if (batRuns === 4) totalFours++;
        else if (batRuns === 6) totalSixes++;
    }

    const fourRuns = totalFours * 4;
    const sixRuns = totalSixes * 6;
    const boundaryRuns = fourRuns + sixRuns;
    // Note: Extras like 4 Wides or 4 Byes are usually technically NOT "boundaries" for the batting team's boundary % charts.
    // They are extras.
    
    // So "Running between wickets" = totalRuns - boundaryRuns - (all extras?)
    // Actually, boundary % is usually calculated as (boundaryRuns / totalRuns off bat). 
    // Let's do it out of total team runs.
    const runningBetweenWicketsRuns = totalRuns - boundaryRuns;
    const boundaryPercentage = totalRuns > 0 ? (boundaryRuns / totalRuns) * 100 : 0;
    const runningPercentage = totalRuns > 0 ? (runningBetweenWicketsRuns / totalRuns) * 100 : 0;

    return {
        totalFours,
        totalSixes,
        fourRuns,
        sixRuns,
        boundaryRuns,
        totalRuns,
        boundaryPercentage,
        runningBetweenWicketsRuns,
        runningPercentage
    };
}
