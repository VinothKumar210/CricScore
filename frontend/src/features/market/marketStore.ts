import { create } from 'zustand';
import { marketService } from './marketService';
import type { MarketMatch, MarketFiltersContext } from './marketService';

interface MarketState {
    matches: MarketMatch[];
    filters: MarketFiltersContext;
    isLoading: boolean;
    error: string | null;

    // Actions
    setFilters: (filters: Partial<MarketFiltersContext>) => void;
    fetchFeed: () => Promise<void>;
    sendMatchInvite: (match: MarketMatch, responderTeamId: string) => Promise<void>;
    reset: () => void;
}

// Store a module-level reference to the controller to allow debounce cancellation
let currentAbortController: AbortController | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useMarketStore = create<MarketState>((set, get) => ({
    matches: [],
    // Provide a default lat/lon (e.g., center of map or fallback 0/0)
    // In a real app, you'd pull this from navigator.geolocation on mount
    filters: { lat: 12.9716, lon: 77.5946, radius: 25 },
    isLoading: false,
    error: null,

    setFilters: (newFilters) => {
        set(state => ({ filters: { ...state.filters, ...newFilters } }));

        // Debounce & Cancel previous requests automatically
        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
            get().fetchFeed();
        }, 300);
    },

    fetchFeed: async () => {
        // Cancel any actively flying request
        if (currentAbortController) {
            currentAbortController.abort();
        }

        // Create new cancellation token
        currentAbortController = new AbortController();

        set({ isLoading: true, error: null });
        try {
            const matches = await marketService.getFeed(get().filters, currentAbortController.signal);
            set({ matches });
        } catch (error: any) {
            // Ignore abort errors as they are intentional
            if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED' || error?.message === 'canceled') {
                return;
            }
            set({ error: error.message || 'Failed to fetch market feed' });
        } finally {
            // Only toggle loading off if this is the active request
            if (!currentAbortController?.signal.aborted) {
                set({ isLoading: false });
            }
        }
    },

    sendMatchInvite: async (match, responderTeamId) => {
        try {
            const proposalResult = await marketService.sendInvite(match.id, responderTeamId);

            // Backend respondToInvite returns InviteProposal details currently.
            // Strict immutability: Rebuild the match correctly based on backend result to avoid mutating objects directly
            // We append the new response into the responses array for the local UI state truthfully.
            const updatedResponses = [...(match.responses || []), {
                id: proposalResult.id || Date.now().toString(),
                responderTeamId,
                status: 'PENDING'
            }];

            const updatedMatch: MarketMatch = {
                ...match,
                responses: updatedResponses
            };

            set(state => ({
                matches: state.matches.map(m => m.id === updatedMatch.id ? updatedMatch : m)
            }));

        } catch (error: any) {
            console.error('Failed to send invite:', error);
            throw error; // Re-throw to let component UI handle locking state / toast
        }
    },

    reset: () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (currentAbortController) currentAbortController.abort();
        set({
            matches: [],
            filters: { lat: 12.9716, lon: 77.5946, radius: 25 },
            isLoading: false,
            error: null
        });
    }
}));
