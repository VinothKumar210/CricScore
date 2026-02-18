import { create } from 'zustand';
import { UserRole } from '../constants/enums';

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
    logout: () => set({ user: null, role: UserRole.GUEST, isAuthenticated: false }),
}));
