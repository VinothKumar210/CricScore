export type MatchOpType =
    | 'DELIVER_BALL'
    | 'WICKET'
    | 'UNDO'
    | 'START_INNINGS'
    | 'END_INNINGS'
    | 'SUPER_OVER'
    | 'RETIRE_BATSMAN'
    | 'SWAP_BATSMAN'
    | 'SWAP_BOWLER';

export interface MatchOpPayload {
    type: MatchOpType;
    [key: string]: any;
}

export interface PlayerState {
    playerId: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    isOut: boolean;
    outType?: string;
    bowlerId?: string; // Who took the wicket
    fielderId?: string; // Who took the catch/run-out
    fielderName?: string; // Cache name if needed
}

export interface BowlerState {
    playerId: string;
    overs: number;
    balls: number; // Balls in current over (0-5)
    runsConceded: number;
    wickets: number;
    maidens: number;
    dotBalls: number;
    wides: number;
    noBalls: number;
}

export interface MatchState {
    matchId: string;
    status: string;
    currentInnings: number;
    battingTeamId: string | null;
    bowlingTeamId: string | null;

    // Score
    totalRuns: number;
    wickets: number;
    oversIndex: number; // 0.0 to 20.0 (represented as integer balls or float?) Let's use balls.
    ballsBowled: number; // Total legal balls
    extras: {
        wides: number;
        noBalls: number;
        byes: number;
        legByes: number;
    };

    // On Field
    strikerId: string | null;
    nonStrikerId: string | null;
    currentBowlerId: string | null;

    // Players Stats (Map)
    batsmen: Record<string, PlayerState>;
    bowlers: Record<string, BowlerState>;

    // Log
    lastBalls: string[]; // For UI (e.g. "1 4 W 0 6")
    isInningsComplete: boolean;
    target: number | null; // If pursuing
}

export const INITIAL_MATCH_STATE: MatchState = {
    matchId: '',
    status: 'SCHEDULED',
    currentInnings: 1,
    battingTeamId: null,
    bowlingTeamId: null,
    totalRuns: 0,
    wickets: 0,
    oversIndex: 0,
    ballsBowled: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    strikerId: null,
    nonStrikerId: null,
    currentBowlerId: null,
    batsmen: {},
    bowlers: {},
    lastBalls: [],
    isInningsComplete: false,
    target: null
};
