import { create } from 'zustand';
import { getMatchState } from './scoringService';
import { matchDB } from './db/matchDB';
import { syncManager } from './sync/SyncManager';
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

export interface ScoringState {
    matchId: string | null;
    matchState: MatchDetail | null; // UI State (Mapped)
    derivedState: MatchState | null; // Engine State
    events: BallEvent[]; // Source of Truth
    matchConfig: MatchConfig | null; // For Replay

    // Replay Timeline State
    replayIndex: number | null;

    isSubmitting: boolean;
    syncStatus: "IDLE" | "SYNCING" | "OFFLINE";
    pendingSyncCount: number;
    error: string | null;

    // Wicket Draft State
    wicketDraft: WicketDraft | null;
    isWicketFlowActive: boolean;

    // Transition States
    pendingBowlerId: string | null;
    showNextBowlerSheet: boolean;
    showOverSummaryToast: boolean;
    showInningsBreakCard: boolean;

    // UI State Setters
    setNextBowler: (playerId: string) => void;
    setShowOverSummaryToast: (show: boolean) => void;
    setShowNextBowlerSheet: (show: boolean) => void;
    setShowInningsBreakCard: (show: boolean) => void;

    // Wagon Wheel toggle
    isWagonWheelEnabled: boolean;
    toggleWagonWheel: () => void;

    // Edge Cases Actions
    deductShortRun: () => Promise<void>;
    addPenalty: (teamId: string, runs: number) => Promise<void>;
    abandonMatch: () => Promise<void>;

    initialize: (matchId: string) => Promise<void>;
    recordBall: (event: BallEventInput) => Promise<void>;
    undo: () => Promise<void>;
    refetch: () => Promise<void>;
    applySocketUpdate: (incoming: MatchDetail | BallEvent) => void;
    updateSyncStatus: () => Promise<void>;

    // Wicket Actions
    startWicketFlow: () => void;
    setDismissalType: (type: DismissalType) => void;
    setFielder: (fielderId: string) => void;
    setRunOutData: (data: { playerOutId: string; completedRuns: number }) => void;
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

        isSubmitting: false,
        syncStatus: typeof navigator !== 'undefined' && navigator.onLine ? "IDLE" : "OFFLINE",
        pendingSyncCount: 0,
        error: null,

        wicketDraft: null,
        isWicketFlowActive: false,

        // Transition States
        pendingBowlerId: null,
        showNextBowlerSheet: false,
        showOverSummaryToast: false,
        showInningsBreakCard: false,

        isWagonWheelEnabled: false,
        toggleWagonWheel: () => set(state => ({ isWagonWheelEnabled: !state.isWagonWheelEnabled })),

        deductShortRun: async () => {
            const { matchId } = get();
            if (!matchId) return;
            const payload = {
                type: "EXTRA",
                extraType: "PENALTY",
                additionalRuns: -1 // Negative run for short run
            } as any;
            await get().recordBall(payload);
        },

        addPenalty: async (teamId: string, runs: number) => {
            const { matchId } = get();
            if (!matchId) return;
            const payload = {
                type: "EXTRA",
                extraType: "PENALTY",
                additionalRuns: runs,
                teamId // This indicates which team gets it. Needs engine support.
            } as any;
            await get().recordBall(payload);
        },

        abandonMatch: async () => {
            const { matchId } = get();
            if (!matchId) return;
            const payload = {
                type: "PHASE_CHANGE",
                newPhase: "ABANDONED"
            } as any;
            await get().recordBall(payload);
        },

        setNextBowler: (playerId: string) => set({ pendingBowlerId: playerId, showNextBowlerSheet: false }),
        setShowOverSummaryToast: (show: boolean) => set({ showOverSummaryToast: show }),
        setShowNextBowlerSheet: (show: boolean) => set({ showNextBowlerSheet: show }),
        setShowInningsBreakCard: (show: boolean) => set({ showInningsBreakCard: show }),

        // Replay Timeline State
        replayIndex: null,

        updateSyncStatus: async () => {
            const { matchId } = get();
            if (!matchId) return;
            const count = await matchDB.matchEvents.where({ matchId, syncStatus: 'PENDING' }).count();
            set({ pendingSyncCount: count, syncStatus: navigator.onLine ? (count > 0 ? "SYNCING" : "IDLE") : "OFFLINE" });
        },

        initialize: async (matchId: string) => {
            set({ isSubmitting: true, error: null, matchId });
            get().updateSyncStatus();

            // Listener Setup
            if (!listenersInitialized) {
                window.addEventListener('online', () => {
                    set({ syncStatus: "SYNCING" });
                    syncManager.triggerSync().then(() => get().updateSyncStatus());
                });
                window.addEventListener('offline', () => {
                    set({ syncStatus: "OFFLINE" });
                });
                
                setInterval(() => {
                    get().updateSyncStatus();
                }, 5000);
                
                listenersInitialized = true;
            }

            // Sync manager start
            syncManager.startAutoSync(10000);

            try {
                // Initialize match data (Network First)
                let metadata: any;
                let eventsToReplay: BallEvent[] = [];

                if (navigator.onLine) {
                    try {
                        const { matchState, events } = await getMatchState(matchId);
                        metadata = matchState;
                        
                        // Save metadata to DB
                        await matchDB.matchState.put({ matchId, stateJson: JSON.stringify(metadata), updatedAt: Date.now() });

                        // Get local pending events
                        const pendingEvents = await matchDB.matchEvents.where({ matchId, syncStatus: 'PENDING' }).toArray();
                        
                        eventsToReplay = [...events, ...(pendingEvents as unknown as BallEvent[])];
                    } catch (e) {
                        console.error('Failed network fetch, falling back to cache', e);
                    }
                }

                if (!metadata) {
                    const cached = await matchDB.matchState.get(matchId);
                    if (cached) {
                        metadata = JSON.parse(cached.stateJson);
                    } else {
                        throw new Error('Match not available offline');
                    }
                    
                    const localEvents = await matchDB.matchEvents.where({ matchId }).sortBy('localId');
                    eventsToReplay = localEvents as unknown as BallEvent[]; 
                }

                // Create Config for Replay
                const config: MatchConfig = {
                    matchId: metadata.id,
                    teamA: { id: metadata.teamA.id, name: metadata.teamA.name, players: metadata.teamA.players?.map((p: any) => p.id) || [] },
                    teamB: { id: metadata.teamB.id, name: metadata.teamB.name, players: metadata.teamB.players?.map((p: any) => p.id) || [] },
                    initialStrikerId: metadata.teamA.players?.[0]?.id,
                    initialNonStrikerId: metadata.teamA.players?.[1]?.id,
                    initialBowlerId: metadata.teamB.players?.[0]?.id,
                };

                const engineState = reconstructMatchState(config, eventsToReplay);
                const mappedState = mapEngineStateToDomain(engineState, metadata, eventsToReplay);

                set({
                    matchConfig: config,
                    events: eventsToReplay,
                    derivedState: engineState,
                    matchState: mappedState,
                    isSubmitting: false,
                });

            } catch (err: any) {
                set({ error: err.message || "Failed to initialize scoring", isSubmitting: false });
            }
        },

        refetch: async () => {
             const { matchId } = get();
             if (matchId) get().initialize(matchId);
        },

        recordBall: async (eventInput: BallEventInput) => {
            const { matchId, events, matchConfig, derivedState } = get();
            if (!matchId) return;

            const currentInningsIndex = derivedState?.currentInningsIndex ?? 0;
            const currentInnings = derivedState?.innings[currentInningsIndex];

            const event = {
                ...eventInput,
                matchId,
                batsmanId: eventInput.batsmanId || currentInnings?.strikerId || "unknown",
                nonStrikerId: eventInput.nonStrikerId || currentInnings?.nonStrikerId || "unknown",
                bowlerId: eventInput.bowlerId || get().pendingBowlerId || currentInnings?.currentBowlerId || "unknown",
                overNumber: Math.floor((currentInnings?.totalBalls || 0) / 6),
                ballNumber: events.length + 1,
                timestamp: Date.now()
            };

            // Clear pending bowler if used
            if (get().pendingBowlerId && !eventInput.bowlerId) {
                set({ pendingBowlerId: null });
            }

            // 1. Save to Dexie
            await matchDB.matchEvents.add({
                ...(event as any),
                clientOpId: crypto.randomUUID(),
                syncStatus: 'PENDING'
            });

            syncManager.triggerSync().finally(() => get().updateSyncStatus());
            get().updateSyncStatus();

            // 2. Optimistic Update
            const newEvents = [...events, event as any];
            if (matchConfig && get().matchState) {
                const newState = reconstructMatchState(matchConfig, newEvents);
                const mappedState = mapEngineStateToDomain(newState, get().matchState!, newEvents);
                
                // --- Transition Detectors ---
                const newInnings = newState.innings[newState.currentInningsIndex];
                
                let showOverSummaryToast = get().showOverSummaryToast;
                let showNextBowlerSheet = get().showNextBowlerSheet;
                let showInningsBreakCard = get().showInningsBreakCard;

                // End of innings detection (new innings is marked completed but old wasn't)
                if (currentInnings && !currentInnings.isCompleted && newInnings && newInnings.isCompleted) {
                    showInningsBreakCard = true;
                } 
                // End of over detection (if we just hit a multiple of 6 balls and it's not the end of the innings)
                else if (currentInnings && newInnings && currentInnings.totalBalls < newInnings.totalBalls && newInnings.totalBalls % 6 === 0) {
                    showOverSummaryToast = true;
                    showNextBowlerSheet = true;
                }

                set({ 
                    events: newEvents, 
                    derivedState: newState, 
                    matchState: mappedState,
                    showOverSummaryToast,
                    showNextBowlerSheet,
                    showInningsBreakCard
                });
            }
        },

        undo: async () => {
            const { matchId, events, matchConfig } = get();
            if (!matchId || events.length === 0) return;

            // 1. Optimistic Update
            const newEvents = events.slice(0, -1);
            if (matchConfig && get().matchState) {
                const newState = reconstructMatchState(matchConfig, newEvents);
                const mappedState = mapEngineStateToDomain(newState, get().matchState!, newEvents);
                set({ events: newEvents, derivedState: newState, matchState: mappedState });
            }

            // 2. Queue UNDO
            await matchDB.matchEvents.add({
                matchId,
                type: 'UNDO',
                runs: 0,
                batsmanId: '',
                bowlerId: '',
                nonStrikerId: '',
                timestamp: Date.now(),
                clientOpId: crypto.randomUUID(),
                syncStatus: 'PENDING'
            });

            syncManager.triggerSync().finally(() => get().updateSyncStatus());
            get().updateSyncStatus();
        },

        applySocketUpdate: (_incoming: MatchDetail | BallEvent) => {
            get().refetch();
        },

        // ... (rest of methods: Wicket Draft, Selectors same as before)
        // Wicket Draft Actions
        startWicketFlow: () => {
            const { matchState } = get();
            if (matchState?.status !== "LIVE") return;
            set({ isWicketFlowActive: true, wicketDraft: { dismissalType: null } });
        },

        setRunOutData: (data: { playerOutId: string; completedRuns: number }) => {
            set((state) => ({
                wicketDraft: state.wicketDraft ? { ...state.wicketDraft, runOutData: data } : null
            }));
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
            const { wicketDraft, matchId } = get();

            if (!wicketDraft || !wicketDraft.dismissalType || !matchId) return;

            if (dismissalRequiresFielder(wicketDraft.dismissalType) && !wicketDraft.fielderId) {
                set({ error: "Fielder required" });
                return;
            }
            if (!wicketDraft.newBatsmanId) {
                set({ error: "New batsman required" });
                return;
            }

            const payload: any = {
                type: "WICKET",
                dismissalType: wicketDraft.dismissalType,
                fielderId: wicketDraft.fielderId,
                newBatsmanId: wicketDraft.newBatsmanId,
                ...(wicketDraft.dismissalType === 'RUN_OUT' && wicketDraft.runOutData ? {
                    runOutData: wicketDraft.runOutData
                } : {})
            };

            await get().recordBall(payload);

            const newState = get();
            if (!newState.error) {
                set({ isWicketFlowActive: false, wicketDraft: null });
            }
        },

        startSuperOver: async () => {
            const { derivedState, matchId } = get();
            if (!matchId) return;

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
            const { derivedState, matchId } = get();
            if (!matchId) return;

            if (derivedState?.matchPhase === "SUPER_OVER") return;

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
