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
    overs: string;
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

// Domain Model
export interface MatchDetail {
    id: string;
    status: MatchStatus;
    teamA: TeamSummary;
    teamB: TeamSummary;
    scoreA?: ScoreSummary;
    scoreB?: ScoreSummary;
    innings: Innings[];
    startTime: string;
    result?: string;
    tournamentName?: string;
    isUserInvolved: boolean;
}

export interface MatchFeedItem extends Omit<MatchDetail, 'innings'> { }

export interface HomeFeedResponse {
    yourMatches: MatchFeedItem[];
    liveMatches: MatchFeedItem[];
}
