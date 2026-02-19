import type { MatchDetail, TeamSummary } from "../matches/types/domainTypes";
import type { BallEvent } from "./types/ballEventTypes";

// Mock Service — but typed!

// Helper to create mock events
function createMockEvents(): BallEvent[] {
    return [
        { type: "RUN", runs: 1 },
        { type: "RUN", runs: 4 },
        { type: "WICKET", dismissalType: "BOWLED" },
        { type: "EXTRA", extraType: "WIDE", additionalRuns: 0 },
        { type: "RUN", runs: 6 }
    ];
}

export async function getMatchState(matchId: string): Promise<{ matchState: MatchDetail, events: BallEvent[], version: number }> {
    // Simulate API delay
    await new Promise(res => setTimeout(res, 300));

    const events = createMockEvents();

    const teamA: TeamSummary = {
        id: "t1",
        name: "Cric Tigers",
        shortName: "CT",
        players: [
            { id: "p1", name: "Virat K" },
            { id: "p2", name: "Rohit S" },
            { id: "p3", name: "Hardik P" },
            { id: "p4", name: "Jasprit B" },
        ]
    };

    const teamB: TeamSummary = {
        id: "t2",
        name: "Green Warriors",
        shortName: "GW",
        players: [
            { id: "p5", name: "Babar A" },
            { id: "p6", name: "Shaheen A" },
            { id: "p7", name: "Shadab K" },
        ]
    };

    // For now, return a mock object compatible with MatchDetail
    // This is acting as the "Initial Snapshot" + Metadata
    const mockMatchState: MatchDetail = {
        id: matchId,
        status: "LIVE",
        teamA,
        teamB,
        innings: [], // Will be populated by engine in store
        startTime: new Date().toISOString(),
        isUserInvolved: true,
        recentOvers: [] // Will be populated by engine in store
    };

    return {
        matchState: mockMatchState,
        events, // Return events for replay
        version: 5 // Mock version
    };
}

export async function submitScoreOperation(_matchId: string, _payload: BallEvent | { type: "UNDO" }, expectedVersion: number): Promise<{ version: number }> {
    // Simulate API delay
    await new Promise(res => setTimeout(res, 400));

    return {
        version: expectedVersion + 1
    };
}
