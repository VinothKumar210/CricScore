/**
 * Hub types — metadata-only types for hub feed.
 * No engine types, no derived bundle types.
 */

export interface HubTeam {
    id: string;
    name: string;
    shortName?: string;
    logoUrl?: string;
}

export interface HubScore {
    runs: number;
    wickets: number;
    overs: string;
}

export interface HubMatchItem {
    id: string;
    status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'ABANDONED' | 'INNINGS_BREAK';
    homeTeamName: string;
    awayTeamName: string;
    homeTeam?: HubTeam;
    awayTeam?: HubTeam;
    scoreA?: HubScore;
    scoreB?: HubScore;
    result?: string;
    matchDate: string;
    overs?: number;
    tournamentName?: string;
    isUserInvolved?: boolean;
}

export interface HubFeedResponse {
    yourMatches: HubMatchItem[];
    liveMatches: HubMatchItem[];
    recentCompleted: HubMatchItem[];
    liveCount: number;
}
