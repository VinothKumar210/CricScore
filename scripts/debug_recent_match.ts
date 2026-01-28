
import { prisma } from "../server/db";
import * as fs from 'fs';

async function main() {
    console.log("Searching for recent matches...");
    const recentMatches = await prisma.matchSummary.findMany({
        orderBy: { matchDate: 'desc' },
        take: 1,
        include: {
            playerHistory: true
        }
    });

    const debugData: any = {
        timestamp: new Date().toISOString(),
        matchFound: false,
        match: null
    };

    if (recentMatches.length > 0) {
        debugData.matchFound = true;
        const match = recentMatches[0];

        let homeCode = "N/A", awayCode = "N/A";
        let homeStats = null, awayStats = null;

        if (match.homeTeamId) {
            const t = await prisma.team.findUnique({ where: { id: match.homeTeamId } });
            homeCode = t?.teamCode || "N/A";
            homeStats = await prisma.teamStatistics.findUnique({ where: { teamId: match.homeTeamId } });
        }
        if (match.awayTeamId) {
            const t = await prisma.team.findUnique({ where: { id: match.awayTeamId } });
            awayCode = t?.teamCode || "N/A";
            awayStats = await prisma.teamStatistics.findUnique({ where: { teamId: match.awayTeamId } });
        }

        debugData.match = {
            ...match,
            homeTeamCode: homeCode,
            awayTeamCode: awayCode,
            homeTeamStats: homeStats,
            awayTeamStats: awayStats,
            playerHistory: match.playerHistory
        };
    }

    fs.writeFileSync('recent_match_debug.json', JSON.stringify(debugData, null, 2));
    console.log("Debug data written to recent_match_debug.json");
}

main().catch(console.error).finally(() => prisma.$disconnect());
