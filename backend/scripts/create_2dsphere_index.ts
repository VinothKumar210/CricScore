import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createIndex() {
    console.log('🌍 Creating 2dsphere Index on MatchSeeker.location...');

    // Raw MongoDB Command
    // Requires Prisma to be connected to MongoDB
    try {
        await prisma.$runCommandRaw({
            createIndexes: "MatchSeeker",
            indexes: [
                {
                    key: { location: "2dsphere" },
                    name: "location_2dsphere"
                }
            ]
        });
        console.log('✅ Index Created Successfully');
    } catch (error) {
        console.error('❌ Failed to create index:', error);
    }

    await prisma.$disconnect();
}

createIndex().catch(e => {
    console.error(e);
    process.exit(1);
});
