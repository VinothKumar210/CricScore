import type { BallEvent } from "../../types/ballEventTypes";
import { deriveCurrentScore } from "./deriveCurrentScore";

export interface ProjectedScore {
    currentRunRate: number;
    projectedCurrent: number; // CRR * totalOvers
    projectedSix: number; // Score if they score 6 RPO for remaining
    projectedEight: number; // 8 RPO for remaining
    projectedTen: number; // 10 RPO for remaining
}

export function deriveProjectedScore(events: BallEvent[], totalOvers: number = 20): ProjectedScore {
    const current = deriveCurrentScore(events, 0);
    
    const crr = current.runRate;
    const [oversF, ballsR] = current.oversString.split('.').map(Number);
    const ballsFaced = (oversF * 6) + ballsR;
    const ballsRemaining = (totalOvers * 6) - ballsFaced;
    const oversRemaining = ballsRemaining / 6;

    // If innings is mostly empty or 0 overs
    if (ballsFaced === 0) {
        return { currentRunRate: 0, projectedCurrent: 0, projectedSix: 0, projectedEight: 0, projectedTen: 0 };
    }

    return {
        currentRunRate: crr,
        projectedCurrent: Math.round(current.totalRuns + (crr * oversRemaining)),
        projectedSix: Math.round(current.totalRuns + (6 * oversRemaining)),
        projectedEight: Math.round(current.totalRuns + (8 * oversRemaining)),
        projectedTen: Math.round(current.totalRuns + (10 * oversRemaining))
    };
}
