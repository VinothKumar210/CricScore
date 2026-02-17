
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function checkDuplicates() {
    console.log('Checking for duplicate TournamentFixtures...');

    // Aggregation to find duplicates
    const duplicates = await prisma.tournamentFixture.groupBy({
        by: ['tournamentId', 'round', 'matchNumber'],
        _count: {
            _all: true,
        },
        having: {
            matchNumber: {
                _count: {
                    gt: 1,
                },
            },
        },
    });

    if (duplicates.length > 0) {
        console.error('❌ Found duplicate fixtures!');
        console.table(duplicates);

        for (const dup of duplicates) {
            const details = await prisma.tournamentFixture.findMany({
                where: {
                    tournamentId: dup.tournamentId,
                    round: dup.round,
                    matchNumber: dup.matchNumber
                }
            });
            console.log(`\nDetails for Tournament ${dup.tournamentId}, Round ${dup.round}, Match ${dup.matchNumber}:`);
            console.log(JSON.stringify(details, null, 2));
        }

        process.exit(1);
    } else {
        console.log('✅ No duplicate fixtures found. Safe to apply unique constraint.');
    }

    await prisma.$disconnect();
}

checkDuplicates().catch((e) => {
    console.error(e);
    process.exit(1);
});
