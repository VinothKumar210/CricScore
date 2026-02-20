export type BracketFormat = "STANDARD_TOP4" | "IPL_TOP4";

export interface BracketMatch {
    matchId: string;
    teamAId: string | null;
    teamBId: string | null;
    stage: string;
    dependsOn?: {
        winnerOf?: string[];
        loserOf?: string[];
    };
}

export interface TournamentBracket {
    matches: BracketMatch[];
}
