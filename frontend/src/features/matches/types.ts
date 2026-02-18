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
