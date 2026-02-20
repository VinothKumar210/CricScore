export type MatchStatus = "SCHEDULED" | "LIVE" | "COMPLETED" | "ABANDONED" | "INNINGS_BREAK";
export type MatchPhase = "REGULAR" | "SUPER_OVER";

export interface Player {
    id: string;
    name: string;
}

export interface TeamSummary {
    id: string;
    name: string;
    shortName?: string; // Optional
    logoUrl?: string;
    players?: Player[]; // Optional
}

export interface BattingEntry {
    playerId: string;
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    dismissal?: string;
    isStriker?: boolean; // Optional
    isNonStriker?: boolean; // Optional
}

export interface BowlingEntry {
    playerId: string;
    name: string;
    overs: string;
    maidens: number;
    runs: number;
    wickets: number;
    economy: number;
    isBowling?: boolean; // Optional
}

// Domain/Legacy BallEvent for View/Mapper
export interface BallEvent {
    runs: number;
    type: string;
    label: string;
    playerOut?: string;
    extraType?: string;
}

export interface OverSummary {
    overNumber: number;
    balls: BallEvent[];
}

export interface Innings {
    battingTeamId?: string; // Optional
    bowlingTeamId?: string; // Optional
    totalRuns: number;
    totalWickets: number;
    totalOvers: string;
    extras: number;
    batting: BattingEntry[];
    bowling: BowlingEntry[];
}

export type DismissalType =
    | "BOWLED"
    | "CAUGHT"
    | "LBW"
    | "RUN_OUT"
    | "STUMPED"
    | "HIT_WICKET"
    | "TIMED_OUT"
    | "OBSTRUCTING_FIELD"
    | "RETIRED_HURT"
    | "RETIRED_OUT";

export interface WicketDraft {
    dismissalType: DismissalType | null;
    fielderId?: string;
    newBatsmanId?: string;
}

export interface ScoreSummary {
    runs: number;
    wickets: number;
    overs: string;
}

export interface MatchFeedItem {
    id: string;
    tournamentName?: string;
    status: MatchStatus;
    teamA: TeamSummary;
    teamB: TeamSummary;
    scoreA?: ScoreSummary;
    scoreB?: ScoreSummary;
    result?: string;
    startTime: string;
    isUserInvolved?: boolean; // Added
}

export interface HomeFeedResponse {
    yourMatches: MatchFeedItem[]; // Was live/completed/scheduled in snippet 4615 but homeFeedService (4630) returns { yourMatches, liveMatches }
    liveMatches: MatchFeedItem[];
    // Wait, let me check homeFeedService return type again. 
    // Step 4630: return { yourMatches, liveMatches };
    // Step 4615 defined: { live: ..., completed: ..., scheduled: ... }
    // This mismatch needs fixing!
}

export interface MatchDetail {
    id: string;
    tournamentName?: string;
    status: MatchStatus;
    teamA: TeamSummary;
    teamB: TeamSummary;
    scoreA?: ScoreSummary;
    scoreB?: ScoreSummary;
    result?: string;
    phase?: MatchPhase;
    innings: Innings[];
    superOverInnings?: Innings[];
    startTime: string;
    isUserInvolved: boolean;
    recentOvers: OverSummary[];
}
