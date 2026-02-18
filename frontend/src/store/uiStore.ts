import { create } from 'zustand';

interface UiState {
    unreadNotifications: number;
    unreadMessages: number;
    isOffline: boolean;
    setUnreadNotifications: (count: number) => void;
    setUnreadMessages: (count: number) => void;
    setOffline: (status: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
    unreadNotifications: 2, // Mocked
    unreadMessages: 5, // Mocked
    isOffline: false,
    setUnreadNotifications: (count) => set({ unreadNotifications: count }),
    setUnreadMessages: (count) => set({ unreadMessages: count }),
    setOffline: (status) => set({ isOffline: status }),
}));
