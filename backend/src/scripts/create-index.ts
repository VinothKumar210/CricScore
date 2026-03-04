import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Creating 2dsphere index on MatchSeeker.location...');
    try {
        const result = await prisma.$runCommandRaw({
            createIndexes: "MatchSeeker",
            indexes: [
                {
                    key: { location: "2dsphere" },
                    name: "location_2dsphere"
                }
            ]
        });
        console.log('Result:', result);
        console.log('Index created successfully!');
    } catch (e) {
        console.error('Error creating index:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
