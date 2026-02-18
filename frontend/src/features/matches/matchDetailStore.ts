import { create } from "zustand";
import { getMatchDetail, type MatchDetail } from "./matchDetailService";

interface MatchDetailState {
    match: MatchDetail | null;
    isLoading: boolean;
    error: string | null;
    fetchMatchDetail: (id: string) => Promise<void>;
}

export const useMatchDetailStore = create<MatchDetailState>((set) => ({
    match: null,
    isLoading: false,
    error: null,

    fetchMatchDetail: async (id: string) => {
        set({ isLoading: true, error: null, match: null }); // Reset match on new fetch

        try {
            const data = await getMatchDetail(id);
            set({ match: data, isLoading: false });
        } catch (err) {
            set({
                error: "Failed to load match details",
                isLoading: false,
            });
        }
    },
}));
