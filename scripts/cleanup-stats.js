// Cleanup script for stats data - Phase 4 fresh start
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupStats() {
    console.log("🧹 Starting stats cleanup...\n");

    try {
        // 1. Delete all PlayerMatchHistory
        const deletedHistory = await prisma.playerMatchHistory.deleteMany({});
        console.log(`✅ Deleted ${deletedHistory.count} PlayerMatchHistory records`);

        // 2. Delete all MatchSummary
        const deletedSummaries = await prisma.matchSummary.deleteMany({});
        console.log(`✅ Deleted ${deletedSummaries.count} MatchSummary records`);

        // 3. Delete all TeamMatch and TeamMatchPlayer
        const deletedTeamMatchPlayers = await prisma.teamMatchPlayer.deleteMany({});
        console.log(`✅ Deleted ${deletedTeamMatchPlayers.count} TeamMatchPlayer records`);

        const deletedTeamMatches = await prisma.teamMatch.deleteMany({});
        console.log(`✅ Deleted ${deletedTeamMatches.count} TeamMatch records`);

        // 4. Reset all CareerStats to zero
        const resetStats = await prisma.careerStats.updateMany({
            data: {
                matchesPlayed: 0,
                totalRuns: 0,
                ballsFaced: 0,
                fours: 0,
                sixes: 0,
                highestScore: 0,
                wicketsTaken: 0,
                oversBowled: 0,
                runsConceded: 0,
                catchesTaken: 0,
                runOuts: 0,
                stumpings: 0,
                strikeRate: 0,
                economy: 0,
                timesOut: 0,
                bestBowlingWickets: 0,
                bestBowlingRuns: 0,
            }
        });
        console.log(`✅ Reset ${resetStats.count} CareerStats records to zero`);

        // 5. Reset all GuestPlayer stats to zero
        const resetGuests = await prisma.guestPlayer.updateMany({
            data: {
                matchesPlayed: 0,
                totalRuns: 0,
                ballsFaced: 0,
                fours: 0,
                sixes: 0,
                wicketsTaken: 0,
                runsConceded: 0,
                oversBowled: 0,
                catchesTaken: 0,
                runOuts: 0,
            }
        });
        console.log(`✅ Reset ${resetGuests.count} GuestPlayer stats to zero`);

        // 6. Reset TeamStatistics
        const resetTeamStats = await prisma.teamStatistics.updateMany({
            data: {
                matchesPlayed: 0,
                matchesWon: 0,
                matchesLost: 0,
                matchesDrawn: 0,
                winRatio: 0,
                topRunScorerRuns: 0,
                topWicketTakerWickets: 0,
                bestStrikeRate: 0,
                bestEconomy: 0,
                mostManOfTheMatch: 0,
            }
        });
        console.log(`✅ Reset ${resetTeamStats.count} TeamStatistics records`);

        console.log("\n✨ Stats cleanup complete! Ready for fresh start.");
    } catch (error) {
        console.error("❌ Error during cleanup:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

cleanupStats()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
