import type { MatchDetail, Innings, BattingEntry, BowlingEntry, OverSummary, BallEvent as DomainBallEvent, TeamSummary } from "../../matches/types/domainTypes";
import type { MatchState, InningsState, BatterState, BowlerState } from "../types/matchStateTypes";
import type { BallEvent } from "../types/ballEventTypes";

// Helper to map Engine State back to Domain Model for UI
// We use the initial MatchDetail as a template for static data (Teams, Players, IDs)
export function mapEngineStateToDomain(engineState: MatchState, initialDetail: MatchDetail, events: BallEvent[]): MatchDetail {
    // Map Innings
    const mappedInnings: Innings[] = engineState.innings.map((inn, index) => {
        const battingTeam = index === 0 ? initialDetail.teamA : initialDetail.teamB; // Simplified assumption
        const bowlingTeam = index === 0 ? initialDetail.teamB : initialDetail.teamA;
        return mapInnings(inn, battingTeam, bowlingTeam);
    });

    let mappedSuperOverInnings: Innings[] | undefined;
    if (engineState.superOverInnings && engineState.superOverInnings.length > 0) {
        mappedSuperOverInnings = engineState.superOverInnings.map((inn) => {
            const battingTeam = inn.battingTeamId === initialDetail.teamA.id ? initialDetail.teamA : initialDetail.teamB;
            const bowlingTeam = inn.bowlingTeamId === initialDetail.teamA.id ? initialDetail.teamA : initialDetail.teamB;
            return mapInnings(inn, battingTeam, bowlingTeam);
        });
    }

    // Derive Recent Overs from events
    // Filter out PHASE_CHANGE before grouping
    const playableEvents = events.filter(e => e.type !== "PHASE_CHANGE");
    const recentOvers = deriveRecentOvers(playableEvents);

    return {
        ...initialDetail,
        status: engineState.status,
        phase: engineState.matchPhase,
        innings: mappedInnings,
        superOverInnings: mappedSuperOverInnings,
        scoreA: { runs: engineState.innings[0]?.totalRuns || 0, wickets: engineState.innings[0]?.totalWickets || 0, overs: toOvers(engineState.innings[0]?.totalBalls || 0) },
        scoreB: { runs: engineState.innings[1]?.totalRuns || 0, wickets: engineState.innings[1]?.totalWickets || 0, overs: toOvers(engineState.innings[1]?.totalBalls || 0) },
        recentOvers
    };
}

function mapInnings(inn: InningsState, battingTeam: TeamSummary, bowlingTeam: TeamSummary): Innings {
    return {
        battingTeamId: inn.battingTeamId,
        bowlingTeamId: inn.bowlingTeamId,
        totalRuns: inn.totalRuns,
        totalWickets: inn.totalWickets,
        totalOvers: toOvers(inn.totalBalls),
        extras: inn.extras.wides + inn.extras.noBalls + inn.extras.byes + inn.extras.legByes + inn.extras.penalty,
        batting: Object.values(inn.batters).map(b => mapBatter(b, battingTeam)),
        bowling: Object.values(inn.bowlers).map(b => mapBowler(b, bowlingTeam))
    };
}

function mapBatter(b: BatterState, team: TeamSummary): BattingEntry {
    const player = team.players?.find(p => p.id === b.playerId);
    return {
        playerId: b.playerId,
        name: player?.name || "Unknown",
        runs: b.runs,
        balls: b.ballsFaced,
        fours: b.fours,
        sixes: b.sixes,
        strikeRate: b.ballsFaced > 0 ? (b.runs / b.ballsFaced) * 100 : 0,
        dismissal: b.dismissal,
        isStriker: false, // Engine state has strikerId, we set it later if needed in UI context?
        isNonStriker: false
    };
}

function mapBowler(b: BowlerState, team: TeamSummary): BowlingEntry {
    const player = team.players?.find(p => p.id === b.playerId);
    const totalOvers = Math.floor(b.overs / 6) + (b.overs % 6) / 10;
    return {
        playerId: b.playerId,
        name: player?.name || "Unknown",
        overs: toOvers(b.overs),
        maidens: b.maidens,
        runs: b.runsConceded,
        wickets: b.wickets,
        economy: totalOvers > 0 ? b.runsConceded / totalOvers : 0
    };
}

function toOvers(balls: number): string {
    const over = Math.floor(balls / 6);
    const ball = balls % 6;
    return `${over}.${ball}`;
}

function deriveRecentOvers(events: BallEvent[]): OverSummary[] {
    // Group events into overs.
    // This is simple grouping: every 6 LEGAL balls = 1 over.
    // Events include non-legal balls.
    // Logic: Iterate events, count legal balls, group.

    const overs: OverSummary[] = [];
    let currentOver: DomainBallEvent[] = [];
    let legalBallsInOver = 0;
    let overNumber = 1;

    for (const event of events) {
        // Map to DomainBallEvent
        const label = getLabel(event);
        const domainEvent: DomainBallEvent = {
            runs: event.type === "RUN" ? event.runs : (event.type === "EXTRA" ? (event.additionalRuns || 0) : 0),
            type: event.type,
            label,
            extraType: event.type === "EXTRA" ? event.extraType : undefined,
            playerOut: event.type === "WICKET" ? "Batsman" : undefined // Name?
        };

        currentOver.push(domainEvent);

        // Check legality
        const isLegal = isLegalDelivery(event);
        if (isLegal) {
            legalBallsInOver++;
        }

        if (legalBallsInOver === 6) {
            overs.push({ overNumber, balls: currentOver });
            currentOver = [];
            legalBallsInOver = 0;
            overNumber++;
        }
    }

    if (currentOver.length > 0) {
        overs.push({ overNumber, balls: currentOver });
    }

    return overs.reverse(); // Newest first
}

function getLabel(event: BallEvent): string {
    if (event.type === "WICKET") return "W";
    if (event.type === "EXTRA") {
        if (event.extraType === "WIDE") return "wd";
        if (event.extraType === "NO_BALL") return "nb";
        return "ex";
    }
    if (event.type === "PHASE_CHANGE") return "P";
    return event.runs.toString();
}

function isLegalDelivery(event: BallEvent): boolean {
    if (event.type === "EXTRA") {
        return event.extraType === "BYE" || event.extraType === "LEG_BYE";
    }
    if (event.type === "PHASE_CHANGE") return false;
    return true;
}
