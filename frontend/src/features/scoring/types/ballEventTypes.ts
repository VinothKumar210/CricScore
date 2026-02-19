import type { DismissalType } from "../../matches/types/domainTypes";

export type BallEvent =
    | RunEvent
    | ExtraEvent
    | WicketEvent;

export interface RunEvent {
    type: "RUN";
    runs: 0 | 1 | 2 | 3 | 4 | 6; // Standard runs, ignoring 5/7 for now
}

export type ExtraType =
    | "WIDE"
    | "NO_BALL"
    | "BYE"
    | "LEG_BYE";

export interface ExtraEvent {
    type: "EXTRA";
    extraType: ExtraType;
    runsOffBat?: number;        // For No Balls where batsman hits runs
    additionalRuns?: number;    // For overthrows, etc. 
    // Note: Wides usually contribute 1 extra + additionalRuns (if ran/boundaries)
}

export interface WicketEvent {
    type: "WICKET";
    dismissalType: DismissalType;
    fielderId?: string;
    newBatsmanId?: string; // Required for state update but technically part of the "event" payload
}
