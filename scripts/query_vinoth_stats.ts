import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function queryVinothStats() {
    const output: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        output.push(msg);
    };

    try {
        // Find user vinoth - list all users to find one matching vinoth
        const allUsers = await prisma.user.findMany();
        const user = allUsers.find((u: any) =>
            u.username?.toLowerCase().includes('vinoth') ||
            u.profileName?.toLowerCase().includes('vinoth')
        );

        if (!user) {
            log('User @vinoth not found in the database.');
            log('Available users: ' + allUsers.map((u: any) => u.username || u.profileName).join(', '));
            return;
        }

        log('========== USER INFO ==========');
        log(JSON.stringify(user, null, 2));
        log('');

        // Get career stats for this user
        const stats = await prisma.careerStats.findUnique({
            where: { userId: user.id }
        });

        if (!stats) {
            log('No CareerStats record found for this user.');
            return;
        }

        log('========== CAREER STATS (ALL FIELDS) ==========');
        log(JSON.stringify(stats, null, 2));

        // Also check for any match records
        const matches = await prisma.match.findMany({
            where: { userId: user.id },
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        log('');
        log('========== RECENT MATCHES (up to 5) ==========');
        if (matches.length === 0) {
            log('No match records found.');
        } else {
            log(JSON.stringify(matches, null, 2));
        }

    } catch (error) {
        log('Error querying database: ' + String(error));
    } finally {
        await prisma.$disconnect();
        // Write output to file
        fs.writeFileSync('vinoth_stats_output.txt', output.join('\n'));
        console.log('\n\nOutput also saved to vinoth_stats_output.txt');
    }
}

queryVinothStats();
