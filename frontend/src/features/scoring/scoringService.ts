import { api } from '../../lib/api';
import type { MatchDetail, TeamSummary } from "../matches/types/domainTypes";
import type { BallEvent } from "./types/ballEventTypes";

/**
 * Fetch match state + raw operations log from backend.
 * Maps backend payload back into `BallEvent` for the frontend replay engine.
 */
export async function getMatchState(matchId: string): Promise<{ matchState: MatchDetail, events: BallEvent[], version: number }> {
    // 1. Fetch metadata and operations concurrently
    const [metaRes, opsRes] = await Promise.all([
        api.get(`/api/matches/${matchId}`),
        api.get(`/api/matches/${matchId}/operations`)
    ]);

    const backendMatch = metaRes.data?.match || metaRes.match;
    const backendOps = opsRes.data?.operations || opsRes.operations || [];

    // Map Backend Teams to frontend TeamSummary shape
    const teamA: TeamSummary = {
        id: backendMatch.homeTeam?.id || "home-mock",
        name: backendMatch.homeTeamName || backendMatch.homeTeam?.name || "Home Team",
        shortName: backendMatch.homeTeam?.shortName || "",
        players: [] // Store logic expects this, maybe fetch members? For now, we rely on the backend state logic.
    };

    const teamB: TeamSummary = {
        id: backendMatch.awayTeam?.id || "away-mock",
        name: backendMatch.awayTeamName || backendMatch.awayTeam?.name || "Away Team",
        shortName: backendMatch.awayTeam?.shortName || "",
        players: []
    };

    const matchState: MatchDetail = {
        id: matchId,
        status: backendMatch.status,
        teamA,
        teamB,
        innings: [], // Populated by engine
        startTime: backendMatch.matchDate,
        isUserInvolved: true,
        recentOvers: [], // Populated by engine
        tossWinnerName: backendMatch.tossWinnerName,
        tossDecision: backendMatch.tossDecision
    };

    // Extract expected properties back into BallEvent shape
    const events: BallEvent[] = backendOps.map((op: any) => ({
        ...op.payload,  // The exact payload frontend had previously sent is preserved
        _version: op.opIndex // Help tracking if needed
    }));

    const version = backendOps.length > 0 ? backendOps[backendOps.length - 1].opIndex : 0;

    return {
        matchState,
        events,
        version
    };
}

/**
 * Map frontend BallEvent schema into strictly allowed Backend MatchOpType
 */
function mapFrontendTypeToBackend(type: string): string {
    if (type === "RUN" || type === "EXTRA") return "DELIVER_BALL";
    // WICKET, UNDO, PHASE_CHANGE, INTERRUPTION will pass through directly if schema matches,
    // otherwise fallback/throw. Actually the backend has `WICKET`, `UNDO`.
    // Let's rely on standard backend ops.
    return type;
}

/**
 * Submit scoring operation (with OCC concurrency control)
 */
export async function submitScoreOperation(matchId: string, payload: any, expectedVersion: number): Promise<{ version: number }> {
    const backendType = mapFrontendTypeToBackend(payload.type);

    // Provide clientOpId for idempotency if it has one, or generate it.
    // The store should realistically provide this. If not, generate for safety.
    const clientOpId = payload.id || crypto.randomUUID();

    const res = await api.post(`/api/matches/${matchId}/operations`, {
        clientOpId,
        expectedVersion,
        type: backendType,
        payload
    });

    return {
        version: res.data?.version || res.version
    };
}
