import { prisma } from '../src/utils/db.js';

async function main() {
    console.log('Creating MongoDB text index on Message.content...');

    try {
        // MongoDB raw command to create text index
        await prisma.$runCommandRaw({
            createIndexes: "Message",
            indexes: [
                {
                    key: { content: "text" },
                    name: "Message_content_text_index",
                    weights: { content: 1 }
                }
            ]
        });
        console.log('✅ Text index created successfully.');
    } catch (error) {
        console.error('❌ Failed to create text index:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
