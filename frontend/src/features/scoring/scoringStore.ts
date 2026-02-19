import { create } from 'zustand';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { getMatchState, submitScoreOperation } from './scoringService';
import type { MatchDetail, DismissalType, WicketDraft } from '../matches/types/domainTypes';
import type { BallEvent } from './types/ballEventTypes';
import type { MatchState } from './types/matchStateTypes'; // Engine State
import { reconstructMatchState } from './engine/replayEngine';
import type { MatchConfig } from './engine/initialState';
import { mapEngineStateToDomain } from './engine/stateMapper';
import { getMatchChaseInfo } from './engine/selectors/getMatchChaseInfo';
import type { MatchChaseInfo } from './engine/selectors/getMatchChaseInfo';
import { derivePartnership } from './engine/derivedStats/derivePartnership';
import type { PartnershipSummary } from './engine/derivedStats/derivePartnership';


export interface DisplayScoreState {
    totalRuns: number;
    totalWickets: number;
    overs: string;
    crr: string;
}

export interface QueuedScoringEvent {
    id: string;
    type: "BALL" | "UNDO" | "WICKET";
    payload: any;
    expectedVersion: number;
    timestamp: number;
}

export interface ScoringState {
    matchId: string | null;
    matchState: MatchDetail | null; // UI State (Mapped)
    derivedState: MatchState | null; // Engine State
    events: BallEvent[]; // Source of Truth
    matchConfig: MatchConfig | null; // For Replay

    expectedVersion: number;
    isSubmitting: boolean;
    syncState: "IDLE" | "SYNCING" | "CONFLICT";
    isOffline: boolean;
    offlineQueue: QueuedScoringEvent[];
    unsyncedCount: number;
    error: string | null;

    // Wicket Draft State
    wicketDraft: WicketDraft | null;
    isWicketFlowActive: boolean;

    initialize: (matchId: string) => Promise<void>;
    recordBall: (event: BallEvent) => Promise<void>;
    undo: () => Promise<void>;
    refetch: () => Promise<void>;
    applySocketUpdate: (incoming: MatchDetail | BallEvent) => void; // Updated signature
    flushQueue: () => Promise<void>;
    enqueueEvent: (type: "BALL" | "UNDO" | "WICKET", payload: any) => void;

    // Wicket Actions
    startWicketFlow: () => void;
    setDismissalType: (type: DismissalType) => void;
    setFielder: (fielderId: string) => void;
    setNewBatsman: (playerId: string) => void;
    cancelWicketFlow: () => void;
    commitWicket: () => Promise<void>;

    // Computed Selectors
    getDisplayScore: () => DisplayScoreState | null;
    getCurrentOverBalls: () => any[];
    getLastBall: () => any | null;
    getChaseInfo: () => MatchChaseInfo | null;
    getPartnershipInfo: () => PartnershipSummary | null;
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

function dismissalRequiresFielder(type: DismissalType): boolean {
    return ["CAUGHT", "RUN_OUT", "STUMPED"].includes(type);
}



export const useScoringStore = create<ScoringState>((set, get) => ({
    matchId: null,
    matchState: null,
    derivedState: null,
    events: [],
    matchConfig: null,

    expectedVersion: 0,
    isSubmitting: false,
    syncState: "IDLE",
    error: null,
    isOffline: !navigator.onLine,
    offlineQueue: [],
    unsyncedCount: 0,

    wicketDraft: null,
    isWicketFlowActive: false,

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
            } else if (savedVersion) {
                set({ expectedVersion: savedVersion });
            }
        } catch (e) {
            console.error("Failed to load offline data", e);
        }

        // Listener Setup
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

        // 2. Fetch latest from API (Events + Snapshot Metadata)
        try {
            // Note: service now returns events too
            const { matchState: metadata, events, version } = await getMatchState(matchId);

            // Create Config for Replay
            const config: MatchConfig = {
                matchId: metadata.id,
                teamA: { id: metadata.teamA.id, name: metadata.teamA.name, players: metadata.teamA.players?.map(p => p.id) || [] },
                teamB: { id: metadata.teamB.id, name: metadata.teamB.name, players: metadata.teamB.players?.map(p => p.id) || [] },
                // Mock initial strikers/bowlers as they are not in metadata yet
                initialStrikerId: metadata.teamA.players?.[0]?.id,
                initialNonStrikerId: metadata.teamA.players?.[1]?.id,
                initialBowlerId: metadata.teamB.players?.[0]?.id,
            };

            set((state) => {
                const newVersion = state.offlineQueue.length > 0 ? state.expectedVersion : version;

                // Replay
                const engineState = reconstructMatchState(config, events);
                const mappedState = mapEngineStateToDomain(engineState, metadata, events);

                if (state.offlineQueue.length === 0) {
                    idbSet(`scoring-version-${matchId}`, newVersion);
                }

                return {
                    matchConfig: config,
                    events: events,
                    derivedState: engineState,
                    matchState: mappedState,
                    expectedVersion: newVersion,
                    isSubmitting: false,
                    syncState: "IDLE"
                };
            });

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
            expectedVersion: expectedVersion + offlineQueue.length,
            timestamp: Date.now()
        };

        const newQueue = [...offlineQueue, event];
        set((state) => ({ offlineQueue: newQueue, unsyncedCount: state.unsyncedCount + 1 }));
        persistState(matchId, newQueue, expectedVersion);

        // Optimistic Update (Offline)
        // If type is BALL/WICKET/EXTRA, we can apply it locally to 'events'?
        // Rules say "Offline queue stores BallEvent[]".
        // The Payload IS BallEvent (or UNDO).
        // To maintain consistent UI, we should probably update `events` too?
        // Yes, "Replay engine must plug into current flow".
        // We push to `events` and re-reconstruct.

        if (type === "UNDO") {
            const newEvents = get().events.slice(0, -1);
            const config = get().matchConfig;
            if (config) {
                const newState = reconstructMatchState(config, newEvents);
                const mapped = mapEngineStateToDomain(newState, get().matchState!, newEvents);
                set({ events: newEvents, derivedState: newState, matchState: mapped });
            }
        } else {
            // Assuming payload is BallEvent
            const newEvents = [...get().events, payload as BallEvent];
            const config = get().matchConfig;
            if (config) {
                const newState = reconstructMatchState(config, newEvents);
                const mapped = mapEngineStateToDomain(newState, get().matchState!, newEvents);
                set({ events: newEvents, derivedState: newState, matchState: mapped });
            }
        }
    },

    flushQueue: async () => {
        // ... (Flush logic unchanged, just handles syncing)
        // Note: flushQueue doesn't update local state, initialize/refetch/recordBall does.
        // It just syncs queue to backend.
        const { offlineQueue, matchId } = get();
        if (offlineQueue.length === 0 || !matchId) return;

        set({ syncState: "SYNCING" });
        const queueToProcess = [...offlineQueue];

        for (const event of queueToProcess) {
            try {
                const currentVersion = get().expectedVersion;
                const { version } = await submitScoreOperation(matchId, event.payload as BallEvent | { type: "UNDO" }, currentVersion);

                set((state) => {
                    const remaining = state.offlineQueue.filter(e => e.id !== event.id);
                    persistState(matchId, remaining, version);
                    return { offlineQueue: remaining, unsyncedCount: state.unsyncedCount - 1, expectedVersion: version };
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
        get().initialize(matchId); // Re-run initialize logic which handles replay
    },

    recordBall: async (event: BallEvent) => {
        const { matchId, expectedVersion, isSubmitting, syncState, isOffline, events, matchConfig } = get();

        if (!matchId || (isSubmitting && !isOffline) || syncState === "CONFLICT") return;

        // 1. Optimistic Update (Replay Engine)
        const newEvents = [...events, event];
        if (matchConfig && get().matchState) {
            const newState = reconstructMatchState(matchConfig, newEvents);
            const mappedState = mapEngineStateToDomain(newState, get().matchState!, newEvents);
            set({ events: newEvents, derivedState: newState, matchState: mappedState });
        }

        // 2. Queue Logic
        let queueType: "BALL" | "WICKET" | "UNDO" = "BALL";
        if (event.type === "WICKET") queueType = "WICKET";

        if (isOffline) {
            get().enqueueEvent(queueType, event);
            return;
        }

        set({ isSubmitting: true, error: null, syncState: "SYNCING" });

        try {
            const { version } = await submitScoreOperation(matchId, event, expectedVersion);
            set({ expectedVersion: version, isSubmitting: false, syncState: "IDLE" });
            idbSet(`scoring-version-${matchId}`, version);
        } catch (err: any) {
            // Revert Optimistic Update on failure?
            // "Conflict handling still works" -> 409 triggers refetch.
            if (err.status === 409) {
                set({ error: "Sync conflict", isSubmitting: false, syncState: "CONFLICT" });
                await get().refetch(); // This will revert local state to server state
            } else {
                set({ error: "Failed to submit score", isSubmitting: false, syncState: "IDLE" });
                // Should revert events? Yes.
                set({ events: events }); // Reset to previous
            }
        }
    },

    undo: async () => {
        const { matchId, expectedVersion, isSubmitting, syncState, isOffline, events, matchConfig } = get();
        if (!matchId || (isSubmitting && !isOffline) || syncState === "CONFLICT") return;

        // 1. Optimistic Update (Remove last event)
        const newEvents = events.slice(0, -1);
        if (matchConfig && get().matchState) {
            const newState = reconstructMatchState(matchConfig, newEvents);
            const mappedState = mapEngineStateToDomain(newState, get().matchState!, newEvents);
            set({ events: newEvents, derivedState: newState, matchState: mappedState });
        }

        const payload = { type: "UNDO" } as const;

        if (isOffline) {
            get().enqueueEvent("UNDO", payload);
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
            } else {
                set({ error: "Failed to undo", isSubmitting: false, syncState: "IDLE" });
                set({ events: events }); // Reset
            }
        }
    },

    applySocketUpdate: (incoming: MatchDetail | BallEvent) => {
        // Contradiction handling:
        // if incoming is Event -> push and replay.
        // if incoming is MatchDetail -> refetch or replace?
        // Replay Engine needs events. If we get MatchDetail, we assume it's a desync/reset.

        // Check if incoming is MatchDetail (has id, status etc) or BallEvent (type, runs)
        // BallEvent has 'type' which is string. MatchDetail has 'status'.

        const isEvent = (obj: any): obj is BallEvent => 'runs' in obj || ('extraType' in obj) || ('dismissalType' in obj);

        if (isEvent(incoming as any)) {
            const event = incoming as BallEvent;
            const { events, matchConfig } = get();
            const newEvents = [...events, event];
            if (matchConfig && get().matchState) {
                const newState = reconstructMatchState(matchConfig, newEvents);
                const mappedState = mapEngineStateToDomain(newState, get().matchState!, newEvents);
                set({ events: newEvents, derivedState: newState, matchState: mappedState });
            }
        } else {
            // It's a full state update. Since we can't derive events from it, 
            // and we must use replay engine... 
            // We probably need to refetch full event history?
            // Or we accept the state as new baseline?
            // Replay Engine requires events.
            // If socket sends snapshot, we are stuck unless we fetch events.
            get().refetch();
        }
    },

    // ... (rest of methods: Wicket Draft, Selectors same as before)
    // Wicket Draft Actions
    startWicketFlow: () => {
        const { matchState } = get();
        if (matchState?.status !== "LIVE") return;
        set({ isWicketFlowActive: true, wicketDraft: { dismissalType: null } });
    },

    setDismissalType: (type: DismissalType) => {
        set((state) => {
            if (!state.wicketDraft) return {};
            const requiresFielder = dismissalRequiresFielder(type);
            return {
                wicketDraft: {
                    ...state.wicketDraft,
                    dismissalType: type,
                    fielderId: requiresFielder ? state.wicketDraft.fielderId : undefined
                }
            };
        });
    },

    setFielder: (fielderId: string) => {
        set((state) => ({
            wicketDraft: state.wicketDraft ? { ...state.wicketDraft, fielderId } : null
        }));
    },

    setNewBatsman: (playerId: string) => {
        set((state) => ({
            wicketDraft: state.wicketDraft ? { ...state.wicketDraft, newBatsmanId: playerId } : null
        }));
    },

    cancelWicketFlow: () => {
        set({ isWicketFlowActive: false, wicketDraft: null });
    },

    commitWicket: async () => {
        const { wicketDraft, matchId, isSubmitting, syncState, isOffline } = get();

        // Validation
        if (!wicketDraft || !wicketDraft.dismissalType || !matchId) return;

        // Guard: Do not attempt if blocked (matches recordBall guard)
        if ((isSubmitting && !isOffline) || syncState === "CONFLICT") {
            return;
        }

        // Strict validation based on type
        if (dismissalRequiresFielder(wicketDraft.dismissalType) && !wicketDraft.fielderId) {
            set({ error: "Fielder required" });
            return;
        }
        if (!wicketDraft.newBatsmanId) {
            set({ error: "New batsman required" });
            return;
        }

        // Construct Typed Wicket Event
        const payload: any = { // Cast to any because BallEvent Wicket definition mismatch with store payload needs?
            // Actually, we should send BallEvent.
            // But WicketEvent definition: { type: "WICKET", dismissalType, fielderId, ... }
            // Missing newBatsmanId in strict definition?
            // User told me to defined WicketEvent earlier.
            // Store uses 'recordBall' which takes BallEvent.
            // If newBatsmanId is part of it? I added it in previous steps.
            // So:
            type: "WICKET",
            dismissalType: wicketDraft.dismissalType,
            fielderId: wicketDraft.fielderId,
            newBatsmanId: wicketDraft.newBatsmanId
        };

        // Use existing recordBall which handles offline/optimistic/locks
        await get().recordBall(payload);

        // Check state after submission
        const newState = get();
        // If successful (IDLE) or Queued (IDLE+isOffline), reset draft
        if (newState.syncState !== "CONFLICT" && !newState.error) {
            set({ isWicketFlowActive: false, wicketDraft: null });
        }
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
    },

    getChaseInfo: () => {
        const { derivedState } = get();
        if (!derivedState) return null;
        return getMatchChaseInfo(derivedState);
    },

    getPartnershipInfo: () => {
        const { events, derivedState } = get();
        if (!derivedState) return null;

        const currentInnings = derivedState.currentInningsIndex;
        // Default to 20 overs if config missing, or use state.totalMatchOvers
        const limit = derivedState.totalMatchOvers || 20;

        return derivePartnership(events, currentInnings, limit);
    }
}));
