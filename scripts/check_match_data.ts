import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
const prisma = new PrismaClient();

async function check() {
    const output: any = {};

    // Check PlayerMatchHistory records
    const history = await prisma.playerMatchHistory.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            userId: true,
            playerName: true,
            teamName: true,
            runsScored: true,
            wicketsTaken: true,
        }
    });
    output.playerMatchHistory = history;

    // Check MatchSummary
    const matches = await prisma.matchSummary.findMany({
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            homeTeamName: true,
            homeTeamId: true,
            awayTeamName: true,
            awayTeamId: true,
            result: true,
        }
    });
    output.matchSummary = matches;

    // Check what userIds exist in the match
    const vinothId = '696f24cfaf3734e4e1bc3513';
    output.vinothId = vinothId;
    output.vinothIdLength = vinothId.length;

    fs.writeFileSync('stats_debug.json', JSON.stringify(output, null, 2));
    console.log('Output written to stats_debug.json');

    await prisma.$disconnect();
}

check().catch(e => {
    console.error(e);
    prisma.$disconnect();
});
