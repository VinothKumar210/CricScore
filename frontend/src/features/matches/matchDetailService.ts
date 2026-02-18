import { mapMatchApiToDomain } from "./mappers/matchMapper";
import type { MatchApiResponse } from "./api/apiTypes";
import type { MatchDetail } from "./types/domainTypes";

export async function getMatchDetail(matchId: string): Promise<MatchDetail> {
    // Simulate API delay
    await new Promise((res) => setTimeout(res, 500));

    // Mock API Response (Internal Backend Shape)
    const mockApiResponse: MatchApiResponse = {
        id: matchId,
        status: "LIVE",
        teamA: { id: "t1", name: "Cric Tigers", shortName: "CT" },
        teamB: { id: "t2", name: "Green Warriors", shortName: "GW" },
        scoreA: { runs: 142, wickets: 3, overs: "18.4" },
        scoreB: { runs: 110, wickets: 5, overs: "16.2" },
        startTime: new Date().toISOString(),
        tournamentName: "Weekday Blast",
        isUserInvolved: true,
        innings: [
            {
                totalRuns: 142,
                totalWickets: 3,
                totalOvers: "18.4",
                extras: 12,
                batting: [
                    { playerId: "p1", name: "V. Sehwag", runs: 45, balls: 28, fours: 6, sixes: 2, sr: 160.71, dismissal: "c & b Anderson" },
                    { playerId: "p2", name: "S. Tendulkar", runs: 62, balls: 45, fours: 8, sixes: 0, sr: 137.77 },
                    { playerId: "p3", name: "V. Kohli", runs: 12, balls: 10, fours: 1, sixes: 0, sr: 120.00, dismissal: "run out" },
                    { playerId: "p4", name: "MS Dhoni", runs: 18, balls: 12, fours: 1, sixes: 1, sr: 150.00 },
                ],
                bowling: [
                    { playerId: "p5", name: "J. Anderson", overs: "4.0", maidens: 0, runs: 32, wickets: 1, econ: 8.00 },
                    { playerId: "p6", name: "S. Broad", overs: "3.4", maidens: 0, runs: 28, wickets: 0, econ: 7.63 },
                ]
            },
            {
                totalRuns: 110,
                totalWickets: 5,
                totalOvers: "16.2",
                extras: 8,
                batting: [
                    { playerId: "p7", name: "D. Warner", runs: 35, balls: 22, fours: 4, sixes: 1, sr: 159.09, dismissal: "b Bumrah" },
                    { playerId: "p8", name: "S. Smith", runs: 40, balls: 38, fours: 3, sixes: 0, sr: 105.26 },
                ],
                bowling: [
                    { playerId: "p9", name: "J. Bumrah", overs: "4.0", maidens: 1, runs: 24, wickets: 2, econ: 6.00 },
                    { playerId: "p10", name: "R. Ashwin", overs: "4.0", maidens: 0, runs: 22, wickets: 1, econ: 5.50 },
                ]
            }
        ]
    };

    // Apply Mapper
    return mapMatchApiToDomain(mockApiResponse);
}
