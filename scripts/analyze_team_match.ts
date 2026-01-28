import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function analyzeTeamMatchStats() {
    const output: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        output.push(msg);
    };

    try {
        // 1. Find Kovai Bulls team
        log('========== FINDING KOVAI BULLS TEAM ==========');
        const allTeams = await prisma.team.findMany();
        const kovaiBulls = allTeams.find((t: any) =>
            t.name?.toLowerCase().includes('kovai') ||
            t.name?.toLowerCase().includes('bulls')
        );

        if (!kovaiBulls) {
            log('Kovai Bulls team not found.');
            log('Available teams: ' + allTeams.map((t: any) => t.name).join(', '));
            return;
        }

        log('Team Found:');
        log(JSON.stringify(kovaiBulls, null, 2));

        // 2. Find team members
        log('\n========== TEAM MEMBERS ==========');
        const teamMembers = await prisma.teamMember.findMany({
            where: { teamId: kovaiBulls.id }
        });
        log(JSON.stringify(teamMembers, null, 2));

        // 3. Check if vinoth is a member
        log('\n========== CHECKING VINOTH MEMBERSHIP ==========');
        const vinothUser = await prisma.user.findFirst({
            where: { username: 'vinoth' }
        });
        if (vinothUser) {
            const isMember = teamMembers.find((m: any) => m.userId === vinothUser.id);
            log(`Vinoth user ID: ${vinothUser.id}`);
            log(`Is Vinoth a member of Kovai Bulls? ${isMember ? 'YES' : 'NO'}`);
            if (isMember) {
                log('Membership details: ' + JSON.stringify(isMember, null, 2));
            }
        }

        // 4. Find all match summaries involving Kovai Bulls
        log('\n========== MATCH SUMMARIES (Kovai Bulls) ==========');
        const matchSummaries = await prisma.matchSummary.findMany({
            where: {
                OR: [
                    { homeTeamId: kovaiBulls.id },
                    { awayTeamId: kovaiBulls.id }
                ]
            }
        });
        log(`Found ${matchSummaries.length} match summaries`);
        log(JSON.stringify(matchSummaries, null, 2));

        // 5. Find all player performances for these matches
        if (matchSummaries.length > 0) {
            log('\n========== PLAYER PERFORMANCES ==========');
            for (const match of matchSummaries) {
                log(`\n--- Match ID: ${match.id} ---`);
                const performances = await prisma.playerMatchPerformance.findMany({
                    where: { matchSummaryId: match.id }
                });
                log(`Found ${performances.length} player performances`);
                log(JSON.stringify(performances, null, 2));
            }
        }

        // 6. Check TeamMatch records
        log('\n========== TEAM MATCHES ==========');
        const teamMatches = await prisma.teamMatch.findMany({
            where: {
                OR: [
                    { homeTeamId: kovaiBulls.id },
                    { awayTeamId: kovaiBulls.id }
                ]
            }
        });
        log(`Found ${teamMatches.length} team matches`);
        log(JSON.stringify(teamMatches, null, 2));

    } catch (error) {
        log('Error: ' + String(error));
    } finally {
        await prisma.$disconnect();
        fs.writeFileSync('team_match_analysis.txt', output.join('\n'));
        console.log('\n\nOutput saved to team_match_analysis.txt');
    }
}

analyzeTeamMatchStats();
