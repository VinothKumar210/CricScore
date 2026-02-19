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
