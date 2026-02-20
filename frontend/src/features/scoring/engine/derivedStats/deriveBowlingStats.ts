import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery } from "../utils/deliveryUtils";

export interface BowlingStats {
    bowlerId: string;
    overs: string;
    maidens: number;
    runsConceded: number;
    wickets: number;
    economy: number;
}

export function deriveBowlingStats(events: BallEvent[], targetInningsIndex: number): BowlingStats[] {
    const statsMap = new Map<string, BowlingStats>();
    const bowlerOrder: string[] = [];

    // Internal tracker for the current over's runs to calculate maidens
    // key: bowlerId, value: runsInCurrentOver
    const currentOverRunsMap = new Map<string, number>();
    const currentOverBallsMap = new Map<string, number>();

    const getStats = (bowlerId: string) => {
        if (!statsMap.has(bowlerId)) {
            statsMap.set(bowlerId, {
                bowlerId,
                overs: "0.0",
                maidens: 0,
                runsConceded: 0,
                wickets: 0,
                economy: 0
            });
            bowlerOrder.push(bowlerId);
            currentOverRunsMap.set(bowlerId, 0);
            currentOverBallsMap.set(bowlerId, 0);
        }
        return statsMap.get(bowlerId)!;
    };

    let currentInnings = 0;
    let innWickets = 0;

    // Track balls to handle innings change logic manually if needed
    // But mostly checking wickets for innings split

    for (const event of events) {
        if (currentInnings === targetInningsIndex) {
            processEvent(event, getStats, currentOverRunsMap, currentOverBallsMap);
        }

        if (event.type === "WICKET") {
            innWickets++;
            if (innWickets >= 10) {
                currentInnings++;
                innWickets = 0;
            }
        }
    }

    // Final calculations (Economy)
    // And convert balls to "Overs.Balls" format
    for (const [id, stats] of statsMap) {
        const legalBalls = currentOverBallsMap.get(id) || 0;
        const oversFull = Math.floor(legalBalls / 6);
        const ballsRem = legalBalls % 6;
        stats.overs = `${oversFull}.${ballsRem}`;

        const totalOvers = oversFull + (ballsRem / 6);
        stats.economy = totalOvers > 0
            ? parseFloat((stats.runsConceded / totalOvers).toFixed(2))
            : 0;
    }

    return bowlerOrder.map(id => statsMap.get(id)!);
}

function processEvent(
    event: BallEvent,
    getStats: (id: string) => BowlingStats,
    overRunsMap: Map<string, number>,
    overBallsMap: Map<string, number>
) {
    if (!event.bowlerId) return;

    const stats = getStats(event.bowlerId);

    // 1. Runs Conceded
    // Bowler charged for runs off bat + Wides + No Balls.
    // Byes/LegByes are NOT charged to bowler.
    let runs = 0;
    if (event.type === "RUN") {
        runs += event.runs;
    } else if (event.type === "EXTRA") {
        if (event.extraType === "WIDE" || event.extraType === "NO_BALL") {
            runs += (event.additionalRuns || 0); // usually 1
            if (event.extraType === "NO_BALL") {
                runs += (event.runsOffBat || 0);
            }
        }
        // BYE/LEG_BYE: 0 runs to bowler
    }

    stats.runsConceded += runs;

    // Update current over tracker for maiden check
    const currentRuns = overRunsMap.get(event.bowlerId) || 0;
    overRunsMap.set(event.bowlerId, currentRuns + runs);

    // 2. Balls & Maidens
    if (isLegalDelivery(event)) {
        const balls = (overBallsMap.get(event.bowlerId) || 0) + 1;
        overBallsMap.set(event.bowlerId, balls);

        // Check for Maiden Completion
        if (balls % 6 === 0) {
            // Over completed.
            // If runsInCurrentOver == 0, it's a maiden.
            // Wait, "runsInCurrentOver" tracks runs conceded in this over.
            // Reset tracker after over.
            if (overRunsMap.get(event.bowlerId) === 0) {
                stats.maidens++;
            }
            // Reset runs counter for next over
            overRunsMap.set(event.bowlerId, 0);
        }
    }

    // 3. Wickets
    if (event.type === "WICKET") {
        // Exclude RUN_OUT, RETIRED_HURT, TIMED_OUT usually?
        // Common credited: BOWLED, CAUGHT, LBW, STUMPED, HIT_WICKET.
        // Uncredited: RUN_OUT, OBSTRUCTING_FIELD?

        const dismissal = event.dismissalType;
        const credited = ["BOWLED", "CAUGHT", "LBW", "STUMPED", "HIT_WICKET"].includes(dismissal || "");

        if (credited) {
            stats.wickets++;
        }
    }
}
