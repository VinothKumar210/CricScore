import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Fix Environment Variable Loading
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function run() {
    try {
        console.log('🔌 Connecting to Database via Prisma...');
        await prisma.$connect();
        console.log('✅ Connected.');

        console.log('🛠 Creating TTL index on Notification.createdAt...');

        // 30 Days Retention Policy
        const retentionSeconds = 60 * 60 * 24 * 30; // 30 days

        // Try to drop existing index if it clashes (Prisma might have created one without TTL)
        try {
            console.log('⚠️ Attempting to drop existing "Notification_createdAt_idx"...');
            await prisma.$runCommandRaw({
                dropIndexes: "Notification",
                index: "Notification_createdAt_idx"
            });
            console.log('✅ Dropped existing index.');
        } catch (e) {
            console.log('ℹ️ Index drop failed or not needed (ok if not exists).');
        }

        // Use Prisma $runCommandRaw for Mongo specific command
        // createIndexes command
        const result = await prisma.$runCommandRaw({
            createIndexes: "Notification",
            indexes: [
                {
                    key: { createdAt: 1 },
                    name: "notification_ttl_30d",
                    expireAfterSeconds: retentionSeconds,
                    background: true
                }
            ]
        });

        console.log('✅ TTL index created:', JSON.stringify(result, null, 2));
        console.log(`ℹ️ Notifications will auto-expire after ${retentionSeconds / 86400} days.`);

    } catch (error) {
        console.error('❌ Failed to create TTL index:', error);
    } finally {
        await prisma.$disconnect();
        console.log('🔌 Disconnected.');
    }
}

run();
