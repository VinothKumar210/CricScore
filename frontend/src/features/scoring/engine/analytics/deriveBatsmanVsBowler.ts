import type { BallEvent } from "../../types/ballEventTypes";

export interface BatsmanVsBowlerStats {
    batsmanId: string;
    bowlerId: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    dismissals: number;
    dotBalls: number;
}

export function deriveBatsmanVsBowler(events: BallEvent[]): Record<string, BatsmanVsBowlerStats> {
    const matchups: Record<string, BatsmanVsBowlerStats> = {};

    for (const event of events) {
        if (!event.batsmanId || !event.bowlerId) continue;

        const key = `${event.batsmanId}_${event.bowlerId}`;
        if (!matchups[key]) {
            matchups[key] = {
                batsmanId: event.batsmanId,
                bowlerId: event.bowlerId,
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                dismissals: 0,
                dotBalls: 0
            };
        }

        const stats = matchups[key];

        // Balls faced
        // Wides don't count as ball faced, No Balls do
        if (event.type === "RUN" || event.type === "WICKET" || (event.type === "EXTRA" && event.extraType !== "WIDE")) {
            stats.balls++;
        }

        // Runs off bat
        let batRuns = 0;
        if (event.type === "RUN") {
            batRuns = event.runs;
        } else if (event.type === "EXTRA" && event.extraType === "NO_BALL") {
            batRuns = event.runsOffBat || 0;
        }

        stats.runs += batRuns;

        if (batRuns === 4) stats.fours++;
        if (batRuns === 6) stats.sixes++;
        if (batRuns === 0 && event.type === "RUN") stats.dotBalls++; // simplistic dot ball

        // Dismissals (excluding run outs usually for bowler credit, but for matchup we might count it if bowler effected it, standard is just out credited to bowler)
        if (event.type === "WICKET") {
            const credited = ["BOWLED", "CAUGHT", "LBW", "STUMPED", "HIT_WICKET"].includes(event.dismissalType || "");
            if (credited) {
                stats.dismissals++;
            }
        }
    }

    return matchups;
}
