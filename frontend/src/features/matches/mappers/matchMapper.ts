import type { MatchApiResponse } from "../api/apiTypes";
import type {
    MatchDetail,
    MatchStatus,
    TeamSummary,
    Innings,
    BattingEntry,
    BowlingEntry
} from "../types/domainTypes";

export function mapMatchApiToDomain(api: MatchApiResponse): MatchDetail {
    return {
        id: api.id,
        status: api.status as MatchStatus, // In real app, validate this cast
        teamA: mapTeam(api.teamA),
        teamB: mapTeam(api.teamB),
        scoreA: api.scoreA,
        scoreB: api.scoreB,
        innings: api.innings ? api.innings.map(mapInnings) : [],
        startTime: api.startTime,
        result: api.result,
        tournamentName: api.tournamentName,
        isUserInvolved: api.isUserInvolved,
        recentOvers: api.recentOvers?.map(mapOver) || [],
    };
}

function mapOver(apiOver: any) {
    return {
        overNumber: apiOver.overNumber,
        balls: apiOver.balls.map((b: any) => ({
            runs: b.runs,
            type: b.type,
            playerOut: b.playerOut,
            label: deriveBallLabel(b)
        }))
    };
}

function deriveBallLabel(ball: any): string {
    if (ball.type === "WICKET") return "W";
    if (ball.type === "WIDE") return "wd";
    if (ball.type === "NOBALL") return "nb";
    if (ball.type === "LEGBYE") return "lb";
    if (ball.type === "BYE") return "b";
    return ball.runs.toString();
}

function mapTeam(apiTeam: any): TeamSummary {
    return {
        id: apiTeam.id,
        name: apiTeam.name,
        shortName: apiTeam.shortName || apiTeam.name.substring(0, 3).toUpperCase(),
        logoUrl: apiTeam.logoUrl,
    };
}

function mapInnings(apiInnings: any): Innings {
    return {
        batting: apiInnings.batting.map(mapBatting),
        bowling: apiInnings.bowling.map(mapBowling),
        totalRuns: apiInnings.totalRuns,
        totalWickets: apiInnings.totalWickets,
        totalOvers: apiInnings.totalOvers,
        extras: apiInnings.extras,
    };
}

function mapBatting(p: any): BattingEntry {
    return {
        playerId: p.playerId,
        name: p.name,
        runs: p.runs,
        balls: p.balls,
        fours: p.fours,
        sixes: p.sixes,
        strikeRate: p.sr || 0, // Handle missing SR
        dismissal: p.dismissal,
    };
}

function mapBowling(p: any): BowlingEntry {
    return {
        playerId: p.playerId,
        name: p.name,
        overs: p.overs,
        maidens: p.maidens,
        runs: p.runs,
        wickets: p.wickets,
        economy: p.econ || 0, // Handle missing Econ
    };
}
