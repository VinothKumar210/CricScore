import { create } from "zustand";
import { getHomeFeed } from "./homeFeedService";
import type { MatchFeedItem } from "./types/domainTypes";

interface HomeFeedState {
    yourMatches: MatchFeedItem[];
    liveMatches: MatchFeedItem[];
    isLoading: boolean;
    error: string | null;
    fetchHomeFeed: () => Promise<void>;
}

export const useHomeFeedStore = create<HomeFeedState>((set) => ({
    yourMatches: [],
    liveMatches: [],
    isLoading: false,
    error: null,

    fetchHomeFeed: async () => {
        set({ isLoading: true, error: null });

        try {
            const data = await getHomeFeed();

            // PRIORITY RULE: Your matches sorted: LIVE first
            const sortedYourMatches = [...data.yourMatches].sort((a, b) => {
                if (a.status === "LIVE" && b.status !== "LIVE") return -1;
                if (a.status !== "LIVE" && b.status === "LIVE") return 1;
                return 0; // Keep original order for others
            });

            // Public matches: Only LIVE
            const liveOnly = data.liveMatches.filter(
                (m) => m.status === "LIVE"
            );

            set({
                yourMatches: sortedYourMatches,
                liveMatches: liveOnly,
                isLoading: false,
            });
        } catch (err) {
            set({
                error: "Failed to load matches",
                isLoading: false,
            });
        }
    },
}));
