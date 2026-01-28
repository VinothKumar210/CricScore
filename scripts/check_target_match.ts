import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function checkMatch() {
    const result: any = { found: false, matches: [] };

    try {
        const matches = await prisma.matchSummary.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        const targetMatch = matches.find(m =>
            (m.homeTeamName.toLowerCase().includes('kovai') || m.homeTeamName.toLowerCase().includes('bulls')) &&
            (m.awayTeamName.toLowerCase().includes('game') || m.awayTeamName.toLowerCase().includes('changer'))
            ||
            (m.awayTeamName.toLowerCase().includes('kovai') || m.awayTeamName.toLowerCase().includes('bulls')) &&
            (m.homeTeamName.toLowerCase().includes('game') || m.homeTeamName.toLowerCase().includes('changer'))
        );

        if (targetMatch) {
            result.found = true;
            result.match = targetMatch;

            const history = await prisma.playerMatchHistory.findMany({
                where: { matchSummaryId: targetMatch.id }
            });
            result.history = history;
        }

        result.matches = matches.map(m => ({
            id: m.id,
            description: `${m.homeTeamName} vs ${m.awayTeamName}`,
            date: m.createdAt,
            result: m.result
        }));

    } catch (error) {
        result.error = error;
    } finally {
        await prisma.$disconnect();
        fs.writeFileSync('match_check_output.json', JSON.stringify(result, null, 2));
        console.log("Done writing to match_check_output.json");
    }
}

checkMatch();
