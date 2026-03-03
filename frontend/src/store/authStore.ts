import { create } from 'zustand';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { api } from '../lib/api';
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
    isLoading: boolean;          // true while Firebase resolves initial auth state
    login: (user: User, role: UserRole) => void;
    logout: () => Promise<void>;
    initAuth: () => () => void;  // returns unsubscribe fn
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    role: UserRole.GUEST,
    isAuthenticated: false,
    isLoading: true,

    login: (user, role) => set({ user, role, isAuthenticated: true }),

    logout: async () => {
        try {
            await signOut(auth);
        } catch (e) {
            console.error('[Auth] Sign-out error:', e);
        }
        localStorage.removeItem('authToken');
        useNotificationStore.getState().reset();
        useInviteStore.getState().reset();
        useMarketStore.getState().reset();
        useMessageStore.getState().reset();
        set({ user: null, role: UserRole.GUEST, isAuthenticated: false });
    },

    initAuth: () => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Get fresh Firebase ID token
                    const idToken = await firebaseUser.getIdToken();
                    localStorage.setItem('authToken', idToken);

                    // Fetch DB user from backend
                    const res = await api.get('/api/auth/me');
                    const dbUser = res.data?.user || res.user;

                    if (dbUser) {
                        set({
                            user: {
                                id: dbUser.id,
                                name: dbUser.fullName || dbUser.name || firebaseUser.displayName || 'User',
                                email: dbUser.email || firebaseUser.email || '',
                                avatarUrl: dbUser.profilePictureUrl || firebaseUser.photoURL || undefined,
                            },
                            role: UserRole.USER,
                            isAuthenticated: true,
                            isLoading: false,
                        });
                    } else {
                        // Backend didn't return user — clear
                        set({ user: null, isAuthenticated: false, isLoading: false });
                    }
                } catch (error) {
                    console.error('[Auth] Failed to fetch user:', error);
                    // Token might be invalid — still mark as not loading
                    set({ user: null, isAuthenticated: false, isLoading: false });
                }
            } else {
                // Not signed in
                localStorage.removeItem('authToken');
                set({
                    user: null,
                    role: UserRole.GUEST,
                    isAuthenticated: false,
                    isLoading: false,
                });
            }
        });

        return unsubscribe;
    },
}));
