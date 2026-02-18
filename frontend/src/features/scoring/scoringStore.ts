import { create } from 'zustand';
import { getMatchState, submitScoreOperation } from './scoringService';
import type { MatchDetail } from '../matches/types/domainTypes';

interface ScoringState {
    matchId: string | null;
    matchState: MatchDetail | null;
    expectedVersion: number;
    isSubmitting: boolean;
    error: string | null;

    initialize: (matchId: string) => Promise<void>;
    recordBall: (payload: any) => Promise<void>;
    undo: () => Promise<void>;
    refetch: () => Promise<void>;
}

export const useScoringStore = create<ScoringState>((set, get) => ({
    matchId: null,
    matchState: null,
    expectedVersion: 0,
    isSubmitting: false,
    error: null,

    initialize: async (matchId: string) => {
        set({ isSubmitting: true, error: null, matchId });
        try {
            const { matchState, version } = await getMatchState(matchId);
            set({ matchState, expectedVersion: version, isSubmitting: false });
        } catch (err) {
            set({ error: "Failed to initialize scoring", isSubmitting: false });
        }
    },

    refetch: async () => {
        const { matchId } = get();
        if (!matchId) return;

        set({ isSubmitting: true, error: null });
        try {
            const { matchState, version } = await getMatchState(matchId);
            set({ matchState, expectedVersion: version, isSubmitting: false });
        } catch (err) {
            set({ error: "Sync failed", isSubmitting: false });
        }
    },

    recordBall: async (payload: any) => {
        const { matchId, expectedVersion, isSubmitting } = get();
        if (!matchId || isSubmitting) return;

        set({ isSubmitting: true, error: null });

        // Optimistic Update can be applied here to matchState
        // e.g., set(state => ({ matchState: applyOptimisticUpdate(state.matchState, payload) }))

        try {
            const { version } = await submitScoreOperation(matchId, payload, expectedVersion);
            set({ expectedVersion: version, isSubmitting: false });
        } catch (err: any) {
            if (err.status === 409) {
                set({ error: "Sync conflict", isSubmitting: false }); // Will trigger UI to show reload
                await get().refetch();
            } else if (err.status === 429) {
                set({ error: "Too fast", isSubmitting: false });
            } else {
                set({ error: "Failed to submit score", isSubmitting: false });
            }
        }
    },

    undo: async () => {
        // Re-use recordBall with UNDO type
        const undoPayload = { type: "UNDO" };
        await get().recordBall(undoPayload);
    }
}));
