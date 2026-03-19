import type { BallEvent } from "../../types/ballEventTypes";
import { deriveBatsmanStats } from "../derivedStats/deriveBatsmanStats";
import { deriveBowlingStats } from "../derivedStats/deriveBowlingStats";

export interface MVPRating {
    playerId: string;
    points: number;
    battingPoints: number;
    bowlingPoints: number;
    fieldingPoints: number;
}

export function deriveMVPRating(events: BallEvent[]): MVPRating[] {
    const playerPoints = new Map<string, MVPRating>();

    const getPlayer = (id: string) => {
        if (!playerPoints.has(id)) {
            playerPoints.set(id, { playerId: id, points: 0, battingPoints: 0, bowlingPoints: 0, fieldingPoints: 0 });
        }
        return playerPoints.get(id)!;
    };

    // Calculate Batting Points
    const batStats = deriveBatsmanStats(events, 0).concat(deriveBatsmanStats(events, 1));
    for (const bat of batStats) {
        let pts = 0;
        pts += bat.runs * 1; // 1 pt per run
        pts += bat.fours * 1; // 1 bonus pt per four
        pts += bat.sixes * 2; // 2 bonus pts per six
        
        // Milestones
        if (bat.runs >= 100) pts += 20; // Century bonus
        else if (bat.runs >= 50) pts += 10; // Half-century bonus

        // Strike rate bonus (min 10 balls faced)
        if (bat.balls >= 10) {
            const sr = (bat.runs / bat.balls) * 100;
            if (sr > 150) pts += 10;
            else if (sr < 80) pts -= 5;
        }

        const player = getPlayer(bat.playerId);
        player.battingPoints += pts;
        player.points += pts;
    }

    // Calculate Bowling Points
    const bowlStats = deriveBowlingStats(events, 0).concat(deriveBowlingStats(events, 1));
    for (const bowl of bowlStats) {
        let pts = 0;
        pts += bowl.wickets * 10; // 10 pts per wicket
        pts += bowl.maidens * 5; // 5 pts per maiden
        
        if (bowl.wickets >= 5) pts += 25;
        else if (bowl.wickets >= 3) pts += 10;

        // Economy bonus
        const oversVal = parseFloat(bowl.overs);
        const oversDec = Math.floor(oversVal) + (oversVal - Math.floor(oversVal)) * 10 / 6; // Rough conversion
        if (oversDec >= 2) {
            if (bowl.economy <= 5) pts += 10;
            else if (bowl.economy >= 10) pts -= 5;
        }

        const player = getPlayer(bowl.bowlerId); // Uses bowlerId from BowlingStats
        player.bowlingPoints += pts;
        player.points += pts;
    }

    // Calculate Fielding Points
    for (const event of events) {
        if (event.type === "WICKET" && event.fielderId) {
            const isRunOut = event.dismissalType === "RUN_OUT";
            const pts = isRunOut ? 10 : 8; // Catch/Stump = 8, Direct Hit/RunOut = 10 (simplified)

            const player = getPlayer(event.fielderId);
            player.fieldingPoints += pts;
            player.points += pts;
        }
    }

    return Array.from(playerPoints.values()).sort((a, b) => b.points - a.points);
}
