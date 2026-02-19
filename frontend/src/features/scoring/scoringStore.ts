import { create } from 'zustand';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { getMatchState, submitScoreOperation } from './scoringService';
import type { MatchDetail } from '../matches/types/domainTypes';

export interface DisplayScoreState {
    totalRuns: number;
    totalWickets: number;
    overs: string;
    crr: string;
}

export interface QueuedScoringEvent {
    id: string;
    type: "BALL" | "UNDO";
    payload: any;
    expectedVersion: number;
    timestamp: number;
}

export interface ScoringState {
    matchId: string | null;
    matchState: MatchDetail | null;
    expectedVersion: number;
    isSubmitting: boolean;
    syncState: "IDLE" | "SYNCING" | "CONFLICT";
    isOffline: boolean;
    offlineQueue: QueuedScoringEvent[];
    unsyncedCount: number;
    error: string | null;

    initialize: (matchId: string) => Promise<void>;
    recordBall: (payload: any) => Promise<void>;
    undo: () => Promise<void>;
    refetch: () => Promise<void>;
    applySocketUpdate: (incoming: MatchDetail) => void;
    flushQueue: () => Promise<void>;
    enqueueEvent: (type: "BALL" | "UNDO", payload: any) => void;

    // Computed Selectors
    getDisplayScore: () => DisplayScoreState | null;
    getCurrentOverBalls: () => any[];
    getLastBall: () => any | null;
}

// Keep track of listener initialization to avoid duplicates
let listenersInitialized = false;

// Helper to persist state
const persistState = async (matchId: string, queue: QueuedScoringEvent[], version: number) => {
    try {
        if (queue.length > 0) {
            await idbSet(`scoring-queue-${matchId}`, queue);
        } else {
            await idbDel(`scoring-queue-${matchId}`);
        }
        await idbSet(`scoring-version-${matchId}`, version);
    } catch (e) {
        console.error("Failed to persist scoring state", e);
    }
};

export const useScoringStore = create<ScoringState>((set, get) => ({
    matchId: null,
    matchState: null,
    expectedVersion: 0,
    isSubmitting: false,
    syncState: "IDLE",
    error: null,
    isOffline: !navigator.onLine,
    offlineQueue: [],
    unsyncedCount: 0,

    initialize: async (matchId: string) => {
        set({ isSubmitting: true, error: null, matchId, syncState: "SYNCING" });

        // 1. Load from IndexedDB
        try {
            const savedQueue = await idbGet<QueuedScoringEvent[]>(`scoring-queue-${matchId}`);
            const savedVersion = await idbGet<number>(`scoring-version-${matchId}`);

            if (savedQueue && savedQueue.length > 0) {
                set({
                    offlineQueue: savedQueue,
                    unsyncedCount: savedQueue.length,
                    expectedVersion: savedVersion || 0
                });
                console.log(`Loaded ${savedQueue.length} events from disk`);
            } else if (savedVersion) {
                set({ expectedVersion: savedVersion });
            }
        } catch (e) {
            console.error("Failed to load offline data", e);
        }

        // One-time listener setup
        if (!listenersInitialized) {
            window.addEventListener('online', () => {
                set({ isOffline: false });
                get().flushQueue();
            });
            window.addEventListener('offline', () => {
                set({ isOffline: true });
            });
            listenersInitialized = true;
        }

        // 2. Fetch latest from API (Network First for State, but respect Queue)
        try {
            const { matchState, version } = await getMatchState(matchId);

            set((state) => {
                // If queue is empty, accept API version. 
                // If queue exists, keep current expectedVersion
                const newVersion = state.offlineQueue.length > 0 ? state.expectedVersion : version;

                // Persist the new version if it changed (and queue is empty)
                if (state.offlineQueue.length === 0) {
                    idbSet(`scoring-version-${matchId}`, newVersion);
                }

                return {
                    matchState,
                    expectedVersion: newVersion,
                    isSubmitting: false,
                    syncState: "IDLE"
                };
            });

            // Auto-flush if online and have queue
            if (navigator.onLine && get().offlineQueue.length > 0) {
                get().flushQueue();
            }

        } catch (err) {
            set({ error: "Failed to initialize scoring (Network)", isSubmitting: false, syncState: "IDLE" });
        }
    },

    enqueueEvent: (type, payload) => {
        const { expectedVersion, offlineQueue, matchId } = get();
        if (!matchId) return;

        const event: QueuedScoringEvent = {
            id: crypto.randomUUID(),
            type,
            payload,
            expectedVersion: expectedVersion + offlineQueue.length, // Provisional
            timestamp: Date.now()
        };

        const newQueue = [...offlineQueue, event];

        set((state) => ({
            offlineQueue: newQueue,
            unsyncedCount: state.unsyncedCount + 1
        }));

        // Persist
        persistState(matchId, newQueue, expectedVersion);
    },

    flushQueue: async () => {
        const { offlineQueue, matchId } = get();
        if (offlineQueue.length === 0 || !matchId) return;

        set({ syncState: "SYNCING" });
        console.log(`Flushing ${offlineQueue.length} events...`);

        const queueToProcess = [...offlineQueue];

        for (const event of queueToProcess) {
            try {
                const currentVersion = get().expectedVersion;
                const { version } = await submitScoreOperation(matchId, event.payload, currentVersion);

                // Success
                set((state) => {
                    const remaining = state.offlineQueue.filter(e => e.id !== event.id);
                    persistState(matchId, remaining, version);

                    return {
                        offlineQueue: remaining,
                        unsyncedCount: state.unsyncedCount - 1,
                        expectedVersion: version
                    };
                });

            } catch (err: any) {
                if (err.status === 409) {
                    set({ syncState: "CONFLICT", error: "Sync conflict during flush" });
                    await get().refetch();
                    return;
                } else {
                    console.error("Flush failed for event", event.id);
                    set({ syncState: "IDLE" });
                    return;
                }
            }
        }

        set({ syncState: "IDLE" });
    },

    refetch: async () => {
        const { matchId } = get();
        if (!matchId) return;

        set({ isSubmitting: true, error: null, syncState: "SYNCING" });
        try {
            const { matchState, version } = await getMatchState(matchId);
            set({ matchState, expectedVersion: version, isSubmitting: false, syncState: "IDLE" });

            if (get().offlineQueue.length === 0) {
                idbSet(`scoring-version-${matchId}`, version);
            }
        } catch (err) {
            set({ error: "Sync failed", isSubmitting: false, syncState: "IDLE" });
        }
    },

    recordBall: async (payload: any) => {
        const { matchId, expectedVersion, isSubmitting, syncState, isOffline } = get();

        if (!matchId || (isSubmitting && !isOffline) || syncState === "CONFLICT") return;

        if (isOffline) {
            get().enqueueEvent(payload.type === "UNDO" ? "UNDO" : "BALL", payload);
            return;
        }

        set({ isSubmitting: true, error: null, syncState: "SYNCING" });

        try {
            const { version } = await submitScoreOperation(matchId, payload, expectedVersion);
            set({ expectedVersion: version, isSubmitting: false, syncState: "IDLE" });
            idbSet(`scoring-version-${matchId}`, version);
        } catch (err: any) {
            if (err.status === 409) {
                set({ error: "Sync conflict", isSubmitting: false, syncState: "CONFLICT" });
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

    applySocketUpdate: (incoming: MatchDetail) => {
        set({ matchState: incoming });
    },

    getDisplayScore: () => {
        const { matchState } = get();
        if (!matchState) return null;

        const currentInnings = matchState.innings.length > 0
            ? matchState.innings[matchState.innings.length - 1]
            : null;

        if (!currentInnings) return null;

        const runs = currentInnings.totalRuns;
        const wickets = currentInnings.totalWickets;
        const overs = currentInnings.totalOvers;

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
        const currentOver = matchState.recentOvers[matchState.recentOvers.length - 1];
        return currentOver.balls || [];
    },

    getLastBall: () => {
        const { matchState } = get();
        if (!matchState || !matchState.recentOvers || matchState.recentOvers.length === 0) {
            return null;
        }
        for (let i = matchState.recentOvers.length - 1; i >= 0; i--) {
            const over = matchState.recentOvers[i];
            if (over.balls && over.balls.length > 0) {
                const lastBall = over.balls[over.balls.length - 1];
                return { ...lastBall, overNumber: over.overNumber };
            }
        }
        return null;
    }
}));
