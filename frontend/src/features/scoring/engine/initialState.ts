import type { MatchState, InningsState, PowerplayConfig } from "../types/matchStateTypes";

export interface MatchConfig {
    matchId: string;
    teamA: { id: string; name: string; players: string[] };
    teamB: { id: string; name: string; players: string[] };
    oversPerInnings?: number;
    powerplayConfig?: PowerplayConfig;
    initialStrikerId?: string;
    initialNonStrikerId?: string;
    initialBowlerId?: string;
}

export function createInitialMatchState(config: MatchConfig): MatchState {
    const firstInnings: InningsState = {
        battingTeamId: config.teamA.id,
        bowlingTeamId: config.teamB.id,
        totalRuns: 0,
        totalWickets: 0,
        totalBalls: 0,
        isCompleted: false,
        extras: {
            wides: 0,
            noBalls: 0,
            byes: 0,
            legByes: 0,
            penalty: 0
        },
        batters: {},
        bowlers: {},
        strikerId: config.initialStrikerId || null,
        nonStrikerId: config.initialNonStrikerId || null,
        currentBowlerId: config.initialBowlerId || null
    };

    // Initialize batters if IDs provided
    if (config.initialStrikerId) {
        firstInnings.batters[config.initialStrikerId] = createBatter(config.initialStrikerId);
    }
    if (config.initialNonStrikerId) {
        firstInnings.batters[config.initialNonStrikerId] = createBatter(config.initialNonStrikerId);
    }
    // Initialize bowler
    if (config.initialBowlerId) {
        firstInnings.bowlers[config.initialBowlerId] = createBowler(config.initialBowlerId);
    }

    return {
        matchId: config.matchId,
        status: "LIVE",
        matchPhase: "REGULAR",
        version: 0,
        currentInningsIndex: 0,
        totalMatchOvers: config.oversPerInnings || 20, // Default to 20 if not set
        powerplayConfig: config.powerplayConfig,
        innings: [firstInnings],
        teams: {
            [config.teamA.id]: config.teamA,
            [config.teamB.id]: config.teamB
        }
    };
}

function createBatter(playerId: string) {
    return {
        playerId,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        isOut: false
    };
}

function createBowler(playerId: string) {
    return {
        playerId,
        overs: 0, // In balls
        maidens: 0,
        runsConceded: 0,
        wickets: 0
    };
}
