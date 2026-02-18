import { MatchFeedItem } from "./types";

// Re-using MatchFeedItem for now as it contains all necessary fields for the header.
// In a real app, MatchDetail might have more fields (squads, timeline, etc.)
export type MatchDetail = MatchFeedItem;

export async function getMatchDetail(matchId: string): Promise<MatchDetail> {
    // Simulate API delay
    await new Promise((res) => setTimeout(res, 500));

    return {
        id: matchId,
        status: "LIVE",
        teamA: { id: "t1", name: "Cric Tigers", shortName: "CT" },
        teamB: { id: "t2", name: "Green Warriors", shortName: "GW" },
        scoreA: { runs: 142, wickets: 3, overs: "18.4" },
        scoreB: { runs: 110, wickets: 5, overs: "16.2" }, // Added scoreB for realism in LIVE match
        startTime: new Date().toISOString(),
        tournamentName: "Weekday Blast",
        isUserInvolved: true,
    };
}
