import { create } from 'zustand';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { getMatchState, submitScoreOperation } from './scoringService';
import type { MatchDetail, DismissalType, WicketDraft } from '../matches/types/domainTypes';
import type { BallEvent, BallEventInput } from './types/ballEventTypes';
import type { MatchState } from './types/matchStateTypes'; // Engine State
import { reconstructMatchState } from './engine/replayEngine';
import type { MatchConfig } from './engine/initialState';
import { mapEngineStateToDomain } from './engine/stateMapper';
import type { MatchChaseInfo } from './engine/selectors/getMatchChaseInfo';
import type { PartnershipSummary } from './engine/derivedStats/derivePartnership';
import type { BatsmanStats } from './engine/derivedStats/deriveBatsmanStats';
import type { BowlingStats } from './engine/derivedStats/deriveBowlingStats';
import type { FallOfWicket } from './engine/derivedStats/deriveFallOfWickets';
import type { OverRunRatePoint, MomentumState, PressureState, PhaseStats, WinProbability } from './engine/analytics';
import type { Milestone } from './engine/types/milestoneTypes';
import type { CommentaryEntry } from './engine/commentary/commentaryTypes';

// ─── Layered Lazy Bundle ───
import { createDerivedBundle } from './derived/derivedBundle';
import type { DerivedBundle } from './derived/derivedBundle';
import { engineMetrics } from './diagnostics/engineMetrics';


export type { DisplayScoreState } from './derived/derivedBundle';

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

    // Replay Timeline State
    replayIndex: number | null;

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
    recordBall: (event: BallEventInput) => Promise<void>;
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

    // Super Over
    startSuperOver: () => Promise<void>;

    // Rain Interruption
    applyRainInterruption: (newOvers: number) => Promise<void>;

    // Replay Actions
    setReplayIndex: (index: number | null) => void;

    // Computed Selectors (delegated to Layered Lazy Bundle)
    _getDerivedBundle: () => DerivedBundle | null;
    getDisplayScore: () => import('./derived/derivedBundle').DisplayScoreState | null;
    getCurrentOverBalls: () => any[];
    getLastBall: () => any | null;
    getChaseInfo: () => MatchChaseInfo | null;
    getPartnershipInfo: () => PartnershipSummary | null;
    getBatsmanStats: () => BatsmanStats[];
    getBowlingStats: () => BowlingStats[];
    getFallOfWickets: () => FallOfWicket[];
    getMilestones: () => Milestone[];
    getCommentary: () => CommentaryEntry[];

    // Analytics Selectors
    getRunRateProgression: () => OverRunRatePoint[];
    getMomentum: () => MomentumState;
    getPressureIndex: () => PressureState | null;
    getPhaseStats: () => PhaseStats[];
    getWinProbability: () => WinProbability | null;
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



export const useScoringStore = create<ScoringState>((set, get) => {

    // ─── Store-Scoped Bundle Cache (private to this instance) ───
    let _bundleCache: {
        eventsRef: BallEvent[] | null;
        replayIndex: number | null | undefined;
        bundle: DerivedBundle | null;
    } = { eventsRef: null, replayIndex: undefined, bundle: null };

    return ({
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

        // Replay Timeline State
        replayIndex: null,

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

        recordBall: async (eventInput: BallEventInput) => {
            const { matchId, expectedVersion, isSubmitting, syncState, isOffline, events, matchConfig, derivedState } = get();

            if (!matchId || (isSubmitting && !isOffline) || syncState === "CONFLICT") return;

            // enrich event with context
            const currentInningsIndex = derivedState?.currentInningsIndex ?? 0;
            const currentInnings = derivedState?.innings[currentInningsIndex];

            const event: BallEvent = {
                ...eventInput,
                matchId,
                batsmanId: eventInput.batsmanId || currentInnings?.strikerId || "unknown",
                nonStrikerId: eventInput.nonStrikerId || currentInnings?.nonStrikerId || "unknown",
                bowlerId: eventInput.bowlerId || currentInnings?.currentBowlerId || "unknown",
                // Calculate over number from total balls
                overNumber: Math.floor((currentInnings?.totalBalls || 0) / 6),
                ballNumber: events.length + 1,
                timestamp: Date.now()
            } as BallEvent;

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

        startSuperOver: async () => {
            const { derivedState, matchId, isSubmitting, syncState, isOffline } = get();
            if (!matchId || (isSubmitting && !isOffline) || syncState === "CONFLICT") return;

            // Only allow if match is tied in REGULAR phase
            if (derivedState?.matchResult?.resultType !== "TIE" || derivedState?.matchPhase === "SUPER_OVER") {
                return;
            }

            const payload = {
                type: "PHASE_CHANGE",
                newPhase: "SUPER_OVER"
            } as const;

            await get().recordBall(payload as any);
        },

        applyRainInterruption: async (newOvers: number) => {
            const { derivedState, matchId, isSubmitting, syncState, isOffline } = get();
            if (!matchId || (isSubmitting && !isOffline) || syncState === "CONFLICT") return;

            // Only allow in regular phase
            if (derivedState?.matchPhase === "SUPER_OVER") return;

            // Ignore if trying to increase overs
            const currentOvers = derivedState?.interruption?.revisedOvers ?? derivedState?.totalMatchOvers ?? 20;
            if (newOvers >= currentOvers) return;

            const payload = {
                type: "INTERRUPTION",
                revisedOvers: newOvers
            } as const;

            await get().recordBall(payload as any);
        },

        setReplayIndex: (index) => set({ replayIndex: index }),

        // ═══════════════════════════════════════════════════════════════
        // Layered Lazy Bundle — Single controlled computation pipeline
        // Core replay runs ONCE. Phase/Analytics/Broadcast are lazy.
        // Cache invalidation by reference identity on events + replayIndex.
        // ═══════════════════════════════════════════════════════════════

        _getDerivedBundle: () => {
            const { events, matchConfig, matchState, replayIndex } = get();
            if (!matchConfig || !matchState) return null;

            // Cache hit: same events reference + same replayIndex
            if (
                _bundleCache.bundle &&
                _bundleCache.eventsRef === events &&
                _bundleCache.replayIndex === replayIndex
            ) {
                engineMetrics.bundleHits++;
                return _bundleCache.bundle;
            }

            // Cache miss: rebuild bundle (one replay, lazy layers)
            engineMetrics.bundleMisses++;
            const bundle = createDerivedBundle(events, matchConfig, matchState, replayIndex);
            _bundleCache = { eventsRef: events, replayIndex, bundle };
            return bundle;
        },

        // ─── Core Layer Selectors (always computed) ───

        getDisplayScore: () => get()._getDerivedBundle()?.core.displayScore ?? null,

        getCurrentOverBalls: () => get()._getDerivedBundle()?.core.currentOverBalls ?? [],

        getLastBall: () => get()._getDerivedBundle()?.core.lastBall ?? null,

        getChaseInfo: () => get()._getDerivedBundle()?.core.chaseInfo ?? null,

        // ─── Phase Layer Selectors (lazy — computed on first access) ───

        getPartnershipInfo: () => get()._getDerivedBundle()?.getPhase().partnershipInfo ?? null,

        getBatsmanStats: () => get()._getDerivedBundle()?.getPhase().batsmanStats ?? [],

        getBowlingStats: () => get()._getDerivedBundle()?.getPhase().bowlingStats ?? [],

        getFallOfWickets: () => get()._getDerivedBundle()?.getPhase().fallOfWickets ?? [],

        getPhaseStats: () => get()._getDerivedBundle()?.getPhase().phaseStats ?? [],

        // ─── Broadcast Layer Selectors (lazy — computed on first access) ───

        getMilestones: () => get()._getDerivedBundle()?.getBroadcast().milestones ?? [],

        getCommentary: () => get()._getDerivedBundle()?.getBroadcast().commentary ?? [],

        // ─── Analytics Layer Selectors (lazy — computed on first access) ───

        getRunRateProgression: () => get()._getDerivedBundle()?.getAnalytics().runRateProgression ?? [],

        getMomentum: () => get()._getDerivedBundle()?.getAnalytics().momentum ?? { impact: 0, trend: "STABLE" as const },

        getPressureIndex: () => get()._getDerivedBundle()?.getAnalytics().pressureIndex ?? null,

        getWinProbability: () => get()._getDerivedBundle()?.getAnalytics().winProbability ?? null
    });
});
