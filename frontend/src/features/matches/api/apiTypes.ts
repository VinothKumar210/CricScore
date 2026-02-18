export interface MatchApiResponse {
    id: string;
    status: string;
    teamA: {
        id: string;
        name: string;
        shortName?: string;
        logoUrl?: string;
    };
    teamB: {
        id: string;
        name: string;
        shortName?: string;
        logoUrl?: string;
    };
    scoreA?: {
        runs: number;
        wickets: number;
        overs: string;
    };
    scoreB?: {
        runs: number;
        wickets: number;
        overs: string;
    };
    innings?: Array<{
        batting: Array<{
            playerId: string;
            name: string;
            runs: number;
            balls: number;
            fours: number;
            sixes: number;
            sr: number; // API might return 'sr' instead of 'strikeRate'
            dismissal?: string;
        }>;
        bowling: Array<{
            playerId: string;
            name: string;
            overs: string;
            maidens: number;
            runs: number;
            wickets: number;
            econ: number; // API might return 'econ'
        }>;
        totalRuns: number;
        totalWickets: number;
        totalOvers: string;
        extras: number;
    }>;
    result?: string;
    startTime: string;
    tournamentName?: string;
    isUserInvolved: boolean;
}
