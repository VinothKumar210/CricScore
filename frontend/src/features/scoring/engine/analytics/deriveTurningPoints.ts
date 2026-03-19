import type { BallEvent } from "../../types/ballEventTypes";
import { deriveCurrentScore } from "./deriveCurrentScore";

export interface TurningPoint {
    overNumber: number;
    ballNumber: number;
    description: string;
    shiftThreshold: number; // e.g. 5 means 5% change in win probability
    teamAFavorChange: number; // e.g. +7 for a positive shift for Team A
    eventSummary: string;
}

export function deriveTurningPoints(events: BallEvent[], targetScore: number, totalOvers: number = 20): TurningPoint[] {
    const points: TurningPoint[] = [];
    let previousProb = 50; 
    const totalMatchBalls = totalOvers * 6;

    for (let i = 1; i <= events.length; i++) {
        const currentSlice = events.slice(0, i);
        const event = currentSlice[currentSlice.length - 1];
        if (event.type === "PHASE_CHANGE" || event.type === "INTERRUPTION") continue;

        const current = deriveCurrentScore(currentSlice, 1); // Assuming targetInnings is index 1 for a chase
        
        const [oversF, ballsR] = current.oversString.split('.').map(Number);
        const ballsFaced = (oversF * 6) + ballsR;
        
        const runsNeeded = Math.max(targetScore - current.totalRuns, 0);
        const ballsRemaining = Math.max(totalMatchBalls - ballsFaced, 0);
        const wicketsLeft = Math.max(10 - current.totalWickets, 0);

        let battingProb = 50;

        if (runsNeeded <= 0) {
            battingProb = 100;
        } else if (ballsRemaining === 0 || wicketsLeft === 0) {
            battingProb = 0;
        } else {
            const requiredRate = (runsNeeded / ballsRemaining) * 6;
            const rrPenalty = Math.max(0, (requiredRate - 6) * 5);
            const rrBonus = Math.max(0, (6 - requiredRate) * 4);
            const wicketBonus = wicketsLeft * 3.5;
            const ballsFraction = ballsRemaining / totalMatchBalls;
            const ballsBonus = ballsFraction * 15;
            
            battingProb = 50 - rrPenalty + rrBonus + wicketBonus + ballsBonus - 35;
            battingProb = Math.max(2, Math.min(98, battingProb));
        }

        const change = battingProb - previousProb;
        
        if (Math.abs(change) >= 5 && i > 1) { // Ignore first ball massive shifts compared to 50
            let desc = "";
            let summary = "";
            
            if (event.type === "WICKET") {
                desc = `${event.dismissalType} WICKET`;
                summary = `WICKET! Shifted momentum by ${Math.abs(Math.round(change))}%`;
            } else if (event.type === "RUN" && (event.runs === 4 || event.runs === 6)) {
                desc = `Massive ${event.runs} RUNS`;
                summary = `Boundary! Shifted momentum by ${Math.abs(Math.round(change))}%`;
            } else if (event.type === "EXTRA") {
                desc = `${event.extraType} EXTRA`;
                summary = `Costly extra shifted momentum by ${Math.abs(Math.round(change))}%`;
            } else if (Math.abs(change) >= 10) {
                 desc = `Critical Dot Ball`;
                 summary = `Pressure building! Shifted momentum by ${Math.abs(Math.round(change))}%`;
            }

            if (desc) {
                points.push({
                    overNumber: event.overNumber || 0,
                    ballNumber: event.ballNumber || 0,
                    description: desc,
                    shiftThreshold: 5,
                    teamAFavorChange: Number(change.toFixed(1)), // Positive means batting team favor
                    eventSummary: summary
                });
            }
        }

        previousProb = battingProb;
    }

    return points;
}

