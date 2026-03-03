import { PrismaClient } from '@prisma/client';

async function main() {
    console.log("DB URL from env:", process.env.DATABASE_URL);
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        },
        log: ['query', 'error', 'info', 'warn']
    });

    try {
        await prisma.$connect();
        console.log("✅ CONNECTED SUCCESSFULLY");
        const user = await prisma.user.findFirst();
        console.log("Query result:", user);
    } catch (e: any) {
        console.error("❌ FAILED:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
