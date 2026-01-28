import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function findAllMatches() {
    const output: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        output.push(msg);
    };

    try {
        // 1. Check ALL MatchSummary records
        log('========== ALL MATCH SUMMARIES ==========');
        const allMatchSummaries = await prisma.matchSummary.findMany();
        log(`Total MatchSummary records: ${allMatchSummaries.length}`);
        if (allMatchSummaries.length > 0) {
            log(JSON.stringify(allMatchSummaries, null, 2));
        }

        // 2. Check ALL TeamMatch records
        log('\n========== ALL TEAM MATCHES ==========');
        const allTeamMatches = await prisma.teamMatch.findMany();
        log(`Total TeamMatch records: ${allTeamMatches.length}`);
        if (allTeamMatches.length > 0) {
            log(JSON.stringify(allTeamMatches, null, 2));
        }

        // 3. Check ALL Match records (individual user matches)
        log('\n========== ALL MATCH RECORDS ==========');
        const allMatches = await prisma.match.findMany();
        log(`Total Match records: ${allMatches.length}`);
        if (allMatches.length > 0) {
            log(JSON.stringify(allMatches, null, 2));
        }

        // 4. Check ALL PlayerMatchPerformance records
        log('\n========== ALL PLAYER PERFORMANCES ==========');
        const allPerformances = await prisma.playerMatchPerformance.findMany();
        log(`Total PlayerMatchPerformance records: ${allPerformances.length}`);
        if (allPerformances.length > 0) {
            log(JSON.stringify(allPerformances, null, 2));
        }

        // 5. Check for CSK team
        log('\n========== LOOKING FOR CSK TEAM ==========');
        const allTeams = await prisma.team.findMany();
        log('All teams:');
        allTeams.forEach((t: any) => log(`  - ${t.name} (ID: ${t.id})`));

    } catch (error) {
        log('Error: ' + String(error));
    } finally {
        await prisma.$disconnect();
        fs.writeFileSync('all_matches_analysis.txt', output.join('\n'));
        console.log('\n\nOutput saved to all_matches_analysis.txt');
    }
}

findAllMatches();
