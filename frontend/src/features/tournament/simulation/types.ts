import type { BracketFormat } from "../bracket/types";
import type { CompletedMatch, TeamStanding } from "../engine/types";
import type { PlayoffMatchResult } from "../progression/types";
import type { Fixture } from "../projection/types";

export interface TournamentTeam {
    teamId: string;
    name: string;
}

export interface TournamentBlueprint {
    format: BracketFormat;
    teams: TournamentTeam[];
    fixtures: Fixture[];
}

export interface SimulationResult {
    leagueMatches: CompletedMatch[];
    leagueTable: TeamStanding[];
    playoffResults: PlayoffMatchResult[];
    championId: string;
}
