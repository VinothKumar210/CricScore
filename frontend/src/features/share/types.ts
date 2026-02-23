/**
 * Share page types — scrubbed match data (no user/team IDs).
 */

export interface ScrubbedTeam {
    name: string;
    shortName?: string;
    logoUrl?: string;
}

export interface ScrubbedMatch {
    id: string;
    status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'ABANDONED' | 'INNINGS_BREAK';
    homeTeamName: string;
    awayTeamName: string;
    homeTeam?: ScrubbedTeam;
    awayTeam?: ScrubbedTeam;
    result?: string;
    winningTeamName?: string;
    winMargin?: string;
    venue?: string;
    matchDate: string;
    overs: number;
    matchType: string;
}

export interface ShareEvent {
    opIndex: number;
    payload: any;
}

export interface ShareMatchConfig {
    overs: number;
    ballType?: string;
    powerplayEnabled: boolean;
    matchType: string;
    homeTeamName: string;
    awayTeamName: string;
}

export interface ShareEventsResponse {
    matchId: string;
    status: string;
    eventCount: number;
    events: ShareEvent[];
    matchConfig: ShareMatchConfig;
}
