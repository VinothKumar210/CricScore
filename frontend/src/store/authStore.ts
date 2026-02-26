import { create } from 'zustand';
import { UserRole } from '../constants/enums';
import { useNotificationStore } from '../features/notifications/notificationStore';
import { useInviteStore } from '../features/invites/inviteStore';
import { useMarketStore } from '../features/market/marketStore';
import { useMessageStore } from '../features/messages/messageStore';

interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
}

interface AuthState {
    user: User | null;
    role: UserRole;
    isAuthenticated: boolean;
    login: (user: User, role: UserRole) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null, // Placeholder: Replace with real user later
    role: UserRole.GUEST,
    isAuthenticated: false,
    login: (user, role) => set({ user, role, isAuthenticated: true }),
    logout: () => {
        useNotificationStore.getState().reset();
        useInviteStore.getState().reset();
        useMarketStore.getState().reset();
        useMessageStore.getState().reset();
        set({ user: null, role: UserRole.GUEST, isAuthenticated: false });
    },
}));
