import type { MatchDetail } from "../matches/types/domainTypes";

export async function getMatchState(matchId: string): Promise<{ matchState: MatchDetail, version: number }> {
    // Simulate API delay
    await new Promise(res => setTimeout(res, 300));

    // For now, return a mock object compatible with MatchDetail
    // In a real app, this would fetch from GET /matches/:id/state
    const mockMatchState: MatchDetail = {
        id: matchId,
        status: "LIVE",
        teamA: { id: "t1", name: "Cric Tigers", shortName: "CT" },
        teamB: { id: "t2", name: "Green Warriors", shortName: "GW" },
        innings: [],
        startTime: new Date().toISOString(),
        isUserInvolved: true
    };

    return {
        matchState: mockMatchState,
        version: 1 // Mock version
    };
}

export async function submitScoreOperation(_matchId: string, _payload: any, expectedVersion: number): Promise<{ version: number }> {
    // Simulate API delay
    await new Promise(res => setTimeout(res, 400));

    // Simulate conflicts or rate limits here if needed using payload flags
    // e.g. if (payload.type === 'FORCE_CONFLICT') throw { status: 409 };

    return {
        version: expectedVersion + 1
    };
}
