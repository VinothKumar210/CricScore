// Query database for user @vinoth stats - write output to file
import { prisma } from '../server/db.js';
import * as fs from 'fs';

async function main() {
    let output = '';

    const log = (msg: string) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        // 1. Get user with career stats
        const user = await prisma.user.findUnique({
            where: { username: 'vinoth' },
            include: { careerStats: true }
        });

        log('=== USER @vinoth ===');
        if (user) {
            log('ID: ' + user.id);
            log('Username: ' + user.username);
            log('Name: ' + (user.profileName || user.username));
            log('\n=== CAREER STATS ===');
            if (user.careerStats) {
                log(JSON.stringify(user.careerStats, null, 2));
            } else {
                log('No career stats found - this is the problem!');
            }

            // 2. Get match history for user
            log('\n=== PLAYER MATCH HISTORY ===');
            const matchHistory = await prisma.playerMatchHistory.findMany({
                where: { userId: user.id },
                include: { matchSummary: true }
            });
            log('Total match records: ' + matchHistory.length);
            if (matchHistory.length === 0) {
                log('*** NO MATCH HISTORY RECORDS - this is why stats are missing ***');
            } else {
                matchHistory.forEach((mh: any, i: number) => {
                    log(`\nMatch ${i + 1}:`);
                    log('  Runs: ' + mh.runsScored);
                    log('  Balls: ' + mh.ballsFaced);
                    log('  Wickets: ' + mh.wicketsTaken);
                    log('  Match ID: ' + mh.matchSummaryId);
                });
            }

            // 3. Get all match summaries
            log('\n=== ALL MATCH SUMMARIES ===');
            const matchSummaries = await prisma.matchSummary.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5
            });
            log('Total recent matches: ' + matchSummaries.length);
            matchSummaries.forEach((ms: any, i: number) => {
                log(`\nMatch ${i + 1}:`);
                log('  ID: ' + ms.id);
                log('  ' + ms.homeTeamName + ' vs ' + ms.awayTeamName);
                log('  Result: ' + ms.result);
                log('  Home Score: ' + ms.homeTeamRuns + '/' + ms.homeTeamWickets);
                log('  Away Score: ' + ms.awayTeamRuns + '/' + ms.awayTeamWickets);
                log('  Date: ' + ms.matchDate);
            });

            // 4. Check first innings batsmen from match summary
            if (matchSummaries.length > 0) {
                const firstMatch = matchSummaries[0];
                log('\n=== FIRST INNINGS BATSMEN (latest match) ===');
                log(JSON.stringify(firstMatch.firstInningsBatsmen, null, 2));
                log('\n=== SECOND INNINGS BATSMEN (latest match) ===');
                log(JSON.stringify(firstMatch.secondInningsBatsmen, null, 2));
            }

        } else {
            log('User @vinoth not found!');
        }

        // Write to file
        fs.writeFileSync('scripts/vinoth-stats-output.txt', output);
        console.log('\n\nOutput written to scripts/vinoth-stats-output.txt');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
