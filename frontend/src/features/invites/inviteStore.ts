import { create } from 'zustand';
import { inviteService } from './inviteService';
import type { Invite } from './inviteService';

interface InviteState {
    received: Invite[];
    sent: Invite[];
    activeTab: 'received' | 'sent';
    isLoading: boolean;
    error: string | null;

    // Actions
    setTab: (tab: 'received' | 'sent') => void;
    fetchInvites: (type: 'received' | 'sent') => Promise<void>;
    respondToInvite: (inviteId: string, responderTeamId: string, status: 'ACCEPTED' | 'DECLINED') => Promise<void>;
    updateInviteSafe: (updatedInvite: Invite) => void;
    reset: () => void;
}

export const useInviteStore = create<InviteState>((set, get) => ({
    received: [],
    sent: [],
    activeTab: 'received',
    isLoading: false,
    error: null,

    setTab: (tab) => {
        set({ activeTab: tab });
        // Auto fetch when switching tab if no data, or force refetch for freshness
        get().fetchInvites(tab);
    },

    fetchInvites: async (type) => {
        set({ isLoading: true, error: null });
        try {
            const data = await inviteService.getInvites(type);
            if (type === 'received') {
                set({ received: data });
            } else {
                set({ sent: data });
            }
        } catch (error: any) {
            set({ error: error.message || 'Failed to load invites' });
        } finally {
            set({ isLoading: false });
        }
    },

    respondToInvite: async (inviteId, responderTeamId, status) => {
        // Find which array it belongs to (usually received for respond logic)
        set({ isLoading: true, error: null });
        try {
            await inviteService.respond(inviteId, responderTeamId, status);
            // Refresh explicitly after response to get truthful server state
            await get().fetchInvites(get().activeTab);
        } catch (error: any) {
            set({ error: error.message || 'Failed to respond to invite' });
        } finally {
            set({ isLoading: false });
        }
    },

    updateInviteSafe: (updatedInvite: Invite) => {
        // Replaces invite strictly by ID, without mutating or checking types
        set(state => ({
            received: state.received.map(inv => inv.id === updatedInvite.id ? updatedInvite : inv),
            sent: state.sent.map(inv => inv.id === updatedInvite.id ? updatedInvite : inv)
        }));
    },

    reset: () => set({
        received: [],
        sent: [],
        activeTab: 'received',
        isLoading: false,
        error: null
    })
}));
