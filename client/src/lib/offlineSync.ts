
import { apiRequest } from "./queryClient";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "pending_match_syncs";

interface MatchSyncPayload {
    matchId: string;
    playerPerformances: any[];
    timestamp: number;
}

export const offlineSync = {
    /**
     * Save a match result to local storage for later sync
     */
    savePendingMatch: (payload: any) => {
        try {
            const pending = offlineSync.getPendingMatches();
            // Avoid duplicates
            if (pending.find((p: any) => p.matchId === payload.matchId)) return;

            const newEntry: MatchSyncPayload = {
                ...payload,
                timestamp: Date.now()
            };

            pending.push(newEntry);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
            console.log("Match saved offline for later sync", payload.matchId);
        } catch (e) {
            console.error("Failed to save pending match", e);
        }
    },

    /**
     * Get all pending matches
     */
    getPendingMatches: (): MatchSyncPayload[] => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    },

    /**
     * clear specific match after success
     */
    removePendingMatch: (matchId: string) => {
        const pending = offlineSync.getPendingMatches();
        const filtered = pending.filter(p => p.matchId !== matchId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    },

    /**
     * Attempt to sync all pending matches
     */
    syncPendingMatches: async () => {
        const pending = offlineSync.getPendingMatches();
        if (pending.length === 0) return;

        if (!navigator.onLine) return; // Still offline

        console.log(`Attempting to sync ${pending.length} pending matches...`);

        let syncedCount = 0;

        for (const match of pending) {
            try {
                // Construct payload without extra metadata if needed
                const { timestamp, ...apiPayload } = match;

                await apiRequest("POST", "/api/matches/submit-result", apiPayload);

                // On success, remove from storage
                offlineSync.removePendingMatch(match.matchId);
                syncedCount++;
            } catch (error) {
                console.error(`Failed to sync match ${match.matchId}:`, error);
                // Keep in storage to retry later
            }
        }

        if (syncedCount > 0) {
            toast({
                title: "Sync Complete",
                description: `Successfully uploaded ${syncedCount} offline match(es).`,
            });
        }
    }
};
