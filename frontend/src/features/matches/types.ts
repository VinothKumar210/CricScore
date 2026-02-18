export type MatchStatus =
    | "SCHEDULED"
    | "LIVE"
    | "INNINGS_BREAK"
    | "COMPLETED"
    | "ABANDONED";

export interface TeamSummary {
    id: string;
    name: string;
    shortName?: string;
    logoUrl?: string;
}

export interface ScoreSummary {
    runs: number;
    wickets: number;
    overs: string; // "14.2"
}

export interface MatchFeedItem {
    id: string;
    status: MatchStatus;

    teamA: TeamSummary;
    teamB: TeamSummary;

    scoreA?: ScoreSummary;
    scoreB?: ScoreSummary;

    result?: string;
    startTime: string;

    tournamentName?: string;

    isUserInvolved: boolean; // important for priority sorting
}

export interface HomeFeedResponse {
    yourMatches: MatchFeedItem[];
    liveMatches: MatchFeedItem[];
}

// Scorecard Types
export interface BattingEntry {
    playerId: string;
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    dismissal?: string;
}

export interface BowlingEntry {
    playerId: string;
    name: string;
    overs: string;
    maidens: number;
    runs: number;
    wickets: number;
    economy: number;
}

export interface Innings {
    batting: BattingEntry[];
    bowling: BowlingEntry[];
    totalRuns: number;
    totalWickets: number;
    totalOvers: string;
    extras: number;
}
