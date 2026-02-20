import type { BallEvent } from "../../../scoring/types/ballEventTypes";
import type { MatchDetail } from "../../../matches/types/domainTypes";

export function derivePlayerOfMatch(events: BallEvent[], domainState: MatchDetail): { playerId: string; score: number } | null {
    if (!domainState || !domainState.innings || domainState.innings.length === 0) {
        return null;
    }

    const playerScores: Record<string, number> = {};

    // 1. Base Batting and Bowling Impact from Domain State
    for (const inn of domainState.innings) {
        if (inn.batting) {
            for (const batter of inn.batting) {
                if (!playerScores[batter.playerId]) playerScores[batter.playerId] = 0;

                // BattingImpact = runs * 1.2 + fours*2 + sixes*3
                const battingImpact = (batter.runs * 1.2) + (batter.fours * 2) + (batter.sixes * 3);
                playerScores[batter.playerId] += battingImpact;
            }
        }

        if (inn.bowling) {
            for (const bowler of inn.bowling) {
                if (!playerScores[bowler.playerId]) playerScores[bowler.playerId] = 0;

                // BowlingImpact = wickets*25 - economy*2
                // Protect against Infinity if over is 0
                const oversNum = parseFloat(bowler.overs) || 0;
                const eco = oversNum > 0 ? bowler.economy : 0;
                const bowlingImpact = (bowler.wickets * 25) - (eco * 2);

                // Award points only if positive impact, or penalize slightly
                playerScores[bowler.playerId] += bowlingImpact;
            }
        }
    }

    // 2. Clutch Bonus from Events (e.g., boundaries in Death Overs (over > 15), or wickets in Death)
    // We do an O(n) pass over events
    for (const ev of events) {
        const isDeathOver = (() => {
            // Assume 20 over match, overs 16+ (index 15) are death
            // In a real scenario, use matchConfig.overs
            const overNum = (ev as any).overNumber || 0;
            return overNum >= 15;
        })();

        if (isDeathOver) {
            if (ev.type === "RUN" && ev.runs != null && ev.runs >= 4) {
                if (ev.batsmanId && playerScores[ev.batsmanId] !== undefined) {
                    playerScores[ev.batsmanId] += 5; // +5 clutch bonus for boundary
                }
            }
            if (ev.type === "WICKET") {
                if (ev.bowlerId && playerScores[ev.bowlerId] !== undefined) {
                    playerScores[ev.bowlerId] += 10; // +10 clutch bonus for wicket
                }
            }
        }
    }

    // 3. Find Max Score
    let mvpId: string | null = null;
    let maxScore = -Infinity;

    for (const [playerId, score] of Object.entries(playerScores)) {
        if (score > maxScore) {
            maxScore = score;
            mvpId = playerId;
        }
    }

    if (!mvpId) return null;

    return {
        playerId: mvpId,
        score: Math.round(maxScore * 10) / 10 // round to 1 decimal
    };
}
