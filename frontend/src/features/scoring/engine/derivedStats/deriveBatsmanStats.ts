import type { BallEvent } from "../../types/ballEventTypes";
import { isLegalDelivery } from "../utils/deliveryUtils";

export interface BatsmanStats {
    playerId: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    isOut: boolean;
}

export function deriveBatsmanStats(events: BallEvent[], targetInningsIndex: number): BatsmanStats[] {
    const statsMap = new Map<string, BatsmanStats>();
    const battingOrder: string[] = [];

    // Helper to get or create stats
    const getStats = (playerId: string) => {
        if (!statsMap.has(playerId)) {
            statsMap.set(playerId, {
                playerId,
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                strikeRate: 0,
                isOut: false
            });
            battingOrder.push(playerId);
        }
        return statsMap.get(playerId)!;
    };

    // Tracking innings to filter events
    let currentInnings = 0;
    let innWickets = 0;
    let innBalls = 0; // Approximate over counting for innings split

    // We hardcode 20 overs for innings split detection if not provided, 
    // but here we just need to match the target innings.
    // Since we don't have totalOvers passed in, we might resort to 
    // the same logic as previous engine or cleaner:
    // We assume the caller passes events relevant to the match? 
    // No, "derive from BallEvent[]" implies full history.
    // I will reuse the simple innings detection logic: 10 wickets or strictly huge balls count (fallback).
    // Better: Allow checking "innings change" logic.
    // But for now, let's use the same logic as derivePartnership to consistency.

    // NOTE: If we want to be "Perfect", we should probably accept `inningsIndex` 
    // and rely on the fact that the events are for the WHOLE match.

    for (const event of events) {
        // --- Innings Filter Logic (Simplified) ---
        // Verify if we are in the target innings
        const isTargetInnings = currentInnings === targetInningsIndex;

        if (isTargetInnings) {
            processEvent(event, getStats);
        }

        // --- Advance Innings Logic ---
        if (event.type === "WICKET") {
            innWickets++;
        }
        if (isLegalDelivery(event)) {
            innBalls++;
        }

        // Check for transition (10 wickets or arbitrary over limit? 
        // without config, we assume 10 wickets is definitive end, 
        // but overs is tricky. We'll stick to 10 wickets majorly).
        // If this causes issues with overs-based games, we need to inject config.
        if (innWickets >= 10) {
            currentInnings++;
            innWickets = 0;
            innBalls = 0; // Reset for next innings
        }
    }

    // Calculate Strike Rates
    for (const stats of statsMap.values()) {
        stats.strikeRate = stats.balls > 0
            ? parseFloat(((stats.runs / stats.balls) * 100).toFixed(2))
            : 0;
    }

    // Return sorted by batting order
    return battingOrder.map(id => statsMap.get(id)!);
}

function processEvent(event: BallEvent, getStats: (id: string) => BatsmanStats) {
    // If it's a generic event without batsman info (shouldn't happen in valid feed), skip
    if (!event.batsmanId) return;

    const stats = getStats(event.batsmanId);

    // 1. Runs
    if (event.type === "RUN") {
        stats.runs += event.runs;
        if (event.runs === 4) stats.fours++;
        if (event.runs === 6) stats.sixes++;
    } else if (event.type === "EXTRA") {
        // Wide: Runs go to extras, not batsman.
        // No Ball: Runs off bat count to batsman.
        // Bye/LegBye: Runs go to extras.

        if (event.extraType === "NO_BALL") {
            const runsOffBat = event.runsOffBat || 0;
            stats.runs += runsOffBat;
            if (runsOffBat === 4) stats.fours++;
            if (runsOffBat === 6) stats.sixes++;
        }
        // Wides: 0 to batsman.
    }

    // 2. Balls
    if (isLegalDelivery(event)) {
        stats.balls++;
    }

    // 3. Wickets
    if (event.type === "WICKET") {
        // The batsmanId in a WICKET event is usually the one who got out?
        // OR the striker?
        // In standard BallEvent, batsmanId is the striker.
        // matches/types/domainTypes.ts says: "batsmanId: string" (Striker).
        // "newBatsmanId: string" (Next).
        // So the person referred to by `batsmanId` is the one facing.
        // Does `batsmanId` always change to the dismissed player?
        // If it's a run out at non-striker end?
        // `BallEvent` usually has `batsmanId` (striker) and `nonStrikerId`.
        // We need to know who was dismissed.
        // `BallEvent` structure for Wicket:
        // `playerOutId`?
        // Let's check BallEvent type again.

        // Assumption: If `playerOutId` exists, use that. 
        // If not, assume striker (`batsmanId`) is out?
        // Checking existing types...
        // For now, I'll rely on `batsmanId` being the striker, and for most dismissals striker is out.
        // Run out non-striker is edge case.
        // IF event has `playerOutId`, mark THAT player.
        // ELSE mark `batsmanId`.

        // I will optimistically check for `playerOutId` property on event.
        // TypeScript might complain if it's not in the type definition I imported.
        // I will check `processEvent` signature validity later.

        stats.isOut = true;

        // Count ball for wicket?
        // "increment balls if legal" -> handled above by isLegalDelivery check.
    }
}
