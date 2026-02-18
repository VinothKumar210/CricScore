import { HomeFeedResponse, MatchFeedItem } from "./types";

export async function getHomeFeed(): Promise<HomeFeedResponse> {
    // Simulate API delay
    await new Promise((res) => setTimeout(res, 500));

    const matches: MatchFeedItem[] = [
        // Mixed bag of matches
        {
            id: "1",
            status: "LIVE",
            teamA: { id: "t1", name: "Cric Tigers", shortName: "CT" },
            teamB: { id: "t2", name: "Green Warriors", shortName: "GW" },
            scoreA: { runs: 142, wickets: 3, overs: "18.4" },
            scoreB: undefined,
            startTime: new Date().toISOString(),
            tournamentName: "Weekday Blast",
            isUserInvolved: true,
        },
        {
            id: "2",
            status: "SCHEDULED",
            teamA: { id: "t3", name: "Chennai Kings" },
            teamB: { id: "t4", name: "Mumbai Indians" },
            startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            isUserInvolved: true,
        },
        {
            id: "3",
            status: "LIVE",
            teamA: { id: "t5", name: "Public Team A" },
            teamB: { id: "t6", name: "Public Team B" },
            scoreA: { runs: 45, wickets: 1, overs: "5.2" },
            startTime: new Date().toISOString(),
            isUserInvolved: false,
        },
        {
            id: "4",
            status: "COMPLETED",
            teamA: { id: "t7", name: "Old Stars" },
            teamB: { id: "t8", name: "New Comers" },
            scoreA: { runs: 120, wickets: 10, overs: "19.5" },
            scoreB: { runs: 121, wickets: 4, overs: "16.2" },
            result: "New Comers won by 6 wickets",
            startTime: new Date(Date.now() - 86400000).toISOString(), // Yesterday
            isUserInvolved: false,
        },
        {
            id: "5",
            status: "LIVE",
            teamA: { id: "t9", name: "Alpha 11" },
            teamB: { id: "t10", name: "Beta 11" },
            scoreA: { runs: 200, wickets: 2, overs: "20.0" },
            scoreB: { runs: 180, wickets: 5, overs: "18.0" },
            startTime: new Date().toISOString(),
            isUserInvolved: false,
        },
    ];

    const yourMatches = matches.filter((m) => m.isUserInvolved);
    const liveMatches = matches.filter((m) => !m.isUserInvolved);

    return {
        yourMatches,
        liveMatches,
    };
}
