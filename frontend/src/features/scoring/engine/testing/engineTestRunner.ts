import { reconstructMatchState } from "../replayEngine";
import { assertDeepEqual } from "./deterministicAssertions";
import type { BallEvent } from "../../../scoring/types/ballEventTypes";

// We need a dummy matchConfig for reconstructMatchState
const DUMMY_CONFIG = {
    matchId: "test-match",
    teamA: { id: "teamA", name: "Team A", players: [] },
    teamB: { id: "teamB", name: "Team B", players: [] },
    oversPerInnings: 20
};

export function runReplayValidation(events: BallEvent[]): { success: boolean; error?: string } {
    try {
        // 1. Full Replay
        const fullState = reconstructMatchState(DUMMY_CONFIG as any, events);

        // 2. Incremental Replay
        let incrementalState: any = null;
        for (let i = 1; i <= events.length; i++) {
            const slicedEvents = events.slice(0, i);
            incrementalState = reconstructMatchState(DUMMY_CONFIG as any, slicedEvents);
        }

        // 3. Assert deep equality of final states
        // Even though reconstructMatchState might return different object references,
        // the structured data MUST be identical if the engine is deterministic.
        const isEqual = assertDeepEqual(fullState, incrementalState, "MatchState");

        if (!isEqual) {
            return { success: false, error: "Incremental state diverged from full replay state" };
        }

        return { success: true };
    } catch (e: any) {
        console.error("Replay Error Trace:", e.stack);
        return {
            success: false,
            error: e.message
        };
    }
}
