import type { DismissalType, MatchPhase } from "../../matches/types/domainTypes";

export interface PowerplayConfig {
    powerplayOvers: number;
    middleOversEnd: number;
}

export interface BatterState {
    playerId: string;
    runs: number;
    ballsFaced: number;
    fours: number;
    sixes: number;
    isOut: boolean;
    dismissal?: DismissalType;
    fielderId?: string; // For catches/runouts
    bowlerId?: string; // Who took the wicket
}

export interface BowlerState {
    playerId: string;
    overs: number; // Stored as balls (e.g. 14 balls = 2.2 overs)
    maidens: number;
    runsConceded: number;
    wickets: number;
}

export interface InningsState {
    battingTeamId: string;
    bowlingTeamId: string;
    totalRuns: number;
    totalWickets: number;
    totalBalls: number; // Legal deliveries
    isCompleted: boolean; // Added
    extras: {
        wides: number;
        noBalls: number;
        byes: number;
        legByes: number;
        penalty: number;
    };
    batters: Record<string, BatterState>; // Map by playerId
    bowlers: Record<string, BowlerState>; // Map by playerId

    // Track current state
    strikerId: string | null;
    nonStrikerId: string | null;
    currentBowlerId: string | null;
}

export interface MatchState {
    matchId: string;
    status: "SCHEDULED" | "LIVE" | "COMPLETED" | "ABANDONED";
    matchPhase?: MatchPhase;
    currentInningsIndex: number; // 0 or 1
    totalMatchOvers: number; // Added
    powerplayConfig?: PowerplayConfig; // NEW
    innings: InningsState[];
    superOverInnings?: InningsState[];

    // We might need to store team players to validate IDs but engine assumes valid IDs
    teams: {
        [teamId: string]: {
            name: string;
            players: string[]; // List of playerIds
        };
    };

    // Sequence of events for debugging/replay verification
    version: number;

    matchResult?: MatchResult; // NEW
    interruption?: MatchInterruption;
}

export interface MatchInterruption {
    isRainActive: boolean;
    revisedOvers?: number;
    revisedTarget?: number;
}

export type MatchResultType = "WIN" | "TIE" | "NO_RESULT";

export interface MatchResult {
    winnerTeamId?: string;
    resultType: MatchResultType;
    description: string;
}
