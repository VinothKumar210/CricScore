import type { MatchState } from "../types/matchStateTypes";
import type { BallEvent } from "../types/ballEventTypes";
import { applyEvent } from "./applyEvent";
import { createInitialMatchState } from "./initialState";
import type { MatchConfig } from "./initialState";

export function reconstructMatchState(config: MatchConfig, events: BallEvent[]): MatchState {
    let state = createInitialMatchState(config);

    for (const event of events) {
        state = applyEvent(state, event);
    }

    return state;
}

export function filterEventsForCurrentPhase(events: BallEvent[], phase?: string): BallEvent[] {
    if (phase === "SUPER_OVER") {
        const idx = events.map(e => e.type).lastIndexOf("PHASE_CHANGE");
        if (idx >= 0) {
            return events.slice(idx + 1);
        }
    }
    // For regular phase, return only events BEFORE phase change (if any)
    const idx = events.findIndex(e => e.type === "PHASE_CHANGE");
    if (idx >= 0) {
        return events.slice(0, idx);
    }
    return events;
}
