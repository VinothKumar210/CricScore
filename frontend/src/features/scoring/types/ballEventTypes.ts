import type { DismissalType, MatchPhase } from "../../matches/types/domainTypes";

export interface BallEventBase {
    matchId?: string;
    overNumber?: number;
    ballNumber?: number;
    batsmanId: string;
    nonStrikerId: string;
    bowlerId: string;
    timestamp?: number;
}

// Input type for UI/actions (context inferred by store)
export type BallEventInput = (RunEvent | ExtraEvent | WicketEvent | PhaseChangeEvent | InterruptionEvent) & Partial<BallEventBase>;

export type BallEvent = (RunEvent | ExtraEvent | WicketEvent | PhaseChangeEvent | InterruptionEvent) & BallEventBase;

export interface InterruptionEvent {
    type: "INTERRUPTION";
    revisedOvers: number;
}

export interface PhaseChangeEvent {
    type: "PHASE_CHANGE";
    newPhase: MatchPhase;
}

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
