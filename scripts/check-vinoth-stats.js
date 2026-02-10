// Query database for user @vinoth stats
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // 1. Get user with career stats
        const user = await prisma.user.findUnique({
            where: { username: 'vinoth' },
            include: { careerStats: true }
        });

        console.log('=== USER @vinoth ===');
        if (user) {
            console.log('ID:', user.id);
            console.log('Username:', user.username);
            console.log('Name:', user.profileName || user.username);
            console.log('\n=== CAREER STATS ===');
            if (user.careerStats) {
                console.log(JSON.stringify(user.careerStats, null, 2));
            } else {
                console.log('No career stats found');
            }

            // 2. Get match history for user
            console.log('\n=== PLAYER MATCH HISTORY ===');
            const matchHistory = await prisma.playerMatchHistory.findMany({
                where: { userId: user.id }
            });
            console.log('Total match records:', matchHistory.length);
            if (matchHistory.length > 0) {
                matchHistory.forEach((mh, i) => {
                    console.log(`\nMatch ${i + 1}:`, {
                        runsScored: mh.runsScored,
                        ballsFaced: mh.ballsFaced,
                        wicketsTaken: mh.wicketsTaken,
                        matchSummaryId: mh.matchSummaryId
                    });
                });
            }

            // 3. Get all match summaries
            console.log('\n=== ALL MATCH SUMMARIES ===');
            const matchSummaries = await prisma.matchSummary.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5
            });
            console.log('Recent matches:', matchSummaries.length);
            matchSummaries.forEach((ms, i) => {
                console.log(`\nMatch ${i + 1}:`, {
                    id: ms.id,
                    homeTeam: ms.homeTeamName,
                    awayTeam: ms.awayTeamName,
                    result: ms.result,
                    date: ms.matchDate
                });
            });

        } else {
            console.log('User @vinoth not found!');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
