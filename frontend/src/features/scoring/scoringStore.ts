import { create } from 'zustand';
import { getMatchState, submitScoreOperation } from './scoringService';
import type { MatchDetail } from '../matches/types/domainTypes';

export interface DisplayScoreState {
    totalRuns: number;
    totalWickets: number;
    overs: string;
    crr: string;
}

interface ScoringState {
    matchId: string | null;
    matchState: MatchDetail | null;
    expectedVersion: number;
    isSubmitting: boolean;
    syncState: "IDLE" | "SYNCING" | "CONFLICT";

    initialize: (matchId: string) => Promise<void>;
    recordBall: (payload: any) => Promise<void>;
    undo: () => Promise<void>;
    refetch: () => Promise<void>;
    applySocketUpdate: (incoming: MatchDetail) => void;

    // Computed Selectors
    getDisplayScore: () => DisplayScoreState | null;
    getDisplayScore: () => DisplayScoreState | null;
    getCurrentOverBalls: () => any[];
    getLastBall: () => any | null;
}

export const useScoringStore = create<ScoringState>((set, get) => ({
    matchId: null,
    matchState: null,
    expectedVersion: 0,
    isSubmitting: false,
    syncState: "IDLE",
    error: null,

    initialize: async (matchId: string) => {
        set({ isSubmitting: true, error: null, matchId, syncState: "SYNCING" });
        try {
            const { matchState, version } = await getMatchState(matchId);
            set({ matchState, expectedVersion: version, isSubmitting: false, syncState: "IDLE" });
        } catch (err) {
            set({ error: "Failed to initialize scoring", isSubmitting: false, syncState: "IDLE" });
        }
    },

    refetch: async () => {
        const { matchId } = get();
        if (!matchId) return;

        set({ isSubmitting: true, error: null, syncState: "SYNCING" });
        try {
            const { matchState, version } = await getMatchState(matchId);
            set({ matchState, expectedVersion: version, isSubmitting: false, syncState: "IDLE" });
        } catch (err) {
            set({ error: "Sync failed", isSubmitting: false, syncState: "IDLE" });
        }
    },

    recordBall: async (payload: any) => {
        const { matchId, expectedVersion, isSubmitting, syncState } = get();
        if (!matchId || isSubmitting || syncState === "CONFLICT") return;

        set({ isSubmitting: true, error: null, syncState: "SYNCING" });

        try {
            const { version } = await submitScoreOperation(matchId, payload, expectedVersion);
            set({ expectedVersion: version, isSubmitting: false, syncState: "IDLE" });
        } catch (err: any) {
            if (err.status === 409) {
                set({ error: "Sync conflict", isSubmitting: false, syncState: "CONFLICT" });
                // Auto-refetch to resolve conflict
                await get().refetch();
            } else if (err.status === 429) {
                set({ error: "Too fast", isSubmitting: false, syncState: "IDLE" });
            } else {
                set({ error: "Failed to submit score", isSubmitting: false, syncState: "IDLE" });
            }
        }
    },

    undo: async () => {
        const undoPayload = { type: "UNDO" };
        await get().recordBall(undoPayload);
    },

    getDisplayScore: () => {
        const { matchState } = get();
        if (!matchState) return null;

        // Get current innings (last in array)
        const currentInnings = matchState.innings.length > 0
            ? matchState.innings[matchState.innings.length - 1]
            : null;

        if (!currentInnings) return null;

        const runs = currentInnings.totalRuns;
        const wickets = currentInnings.totalWickets;
        const overs = currentInnings.totalOvers;

        // CRR Calculation
        // Parse overs "14.2" -> 14.333
        const [oversMain, balls] = overs.split('.').map(Number);
        const totalOversDec = oversMain + (balls || 0) / 6;
        const crr = totalOversDec > 0 ? (runs / totalOversDec).toFixed(2) : "0.00";

        return {
            totalRuns: runs,
            totalWickets: wickets,
            overs,
            crr
        };
    },

    getCurrentOverBalls: () => {
        const { matchState } = get();
        if (!matchState || !matchState.recentOvers || matchState.recentOvers.length === 0) {
            return [];
        }
        // Return balls from the last available over in the list
        // In a real app, ensure this matches the 'current' over being bowled
        const currentOver = matchState.recentOvers[matchState.recentOvers.length - 1];
        return currentOver.balls || [];
    },

    getLastBall: () => {
        const { matchState } = get();
        if (!matchState || !matchState.recentOvers || matchState.recentOvers.length === 0) {
            return null;
        }

        // Search backwards for the first over with balls
        for (let i = matchState.recentOvers.length - 1; i >= 0; i--) {
            const over = matchState.recentOvers[i];
            if (over.balls && over.balls.length > 0) {
                const lastBall = over.balls[over.balls.length - 1];
                return {
                    ...lastBall,
                    overNumber: over.overNumber
                };
            }
        }
        return null;
    }
}));
