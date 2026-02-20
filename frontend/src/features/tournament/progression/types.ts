import type { TournamentBracket } from "../bracket/types";

export interface PlayoffMatchResult {
    matchId: string;
    winnerTeamId: string;
    loserTeamId: string;
}

export interface BracketProgressionInput {
    bracket: TournamentBracket;
    results: PlayoffMatchResult[];
}
