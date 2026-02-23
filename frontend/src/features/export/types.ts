/**
 * Export types — no engine types, no scorer types.
 */

export type ExportFormat = 'json' | 'pdf';

export interface ExportStatus {
    isExporting: boolean;
    format: ExportFormat | null;
    progress: number;        // 0-100
    error: string | null;
}

export const INITIAL_EXPORT_STATUS: ExportStatus = {
    isExporting: false,
    format: null,
    progress: 0,
    error: null,
};

/**
 * Worker threshold — matches above this count use Web Worker.
 */
export const WORKER_THRESHOLD = 200;

/**
 * Serialized scorecard data returned from pure engine (main or worker thread).
 * Contains ONLY serializable data — no functions, no class instances.
 */
export interface SerializedScorecard {
    batsmanStats: Array<{
        playerId: string;
        runs: number;
        balls: number;
        fours: number;
        sixes: number;
        strikeRate: number;
        isOut: boolean;
    }>;
    bowlingStats: Array<{
        bowlerId: string;
        overs: string;
        maidens: number;
        runsConceded: number;
        wickets: number;
        economy: number;
    }>;
    fallOfWickets: Array<{
        wicketNumber: number;
        score: string;
        batsmanId: string;
        over: string;
    }>;
    displayScore: {
        totalRuns: number;
        totalWickets: number;
        overs: string;
        crr: string;
    } | null;
}

/**
 * Worker message types.
 */
export interface WorkerInput {
    events: any[];
    matchConfig: {
        matchId: string;
        overs: number;
        homeTeamName: string;
        awayTeamName: string;
    };
}

export interface WorkerOutput {
    success: boolean;
    data?: SerializedScorecard;
    error?: string;
}
