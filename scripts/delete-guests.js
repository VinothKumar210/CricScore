// Script to delete all guest players
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const result = await prisma.guestPlayer.deleteMany({});
        console.log(`Deleted ${result.count} guest players`);
    } catch (error) {
        console.error('Error deleting guest players:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
