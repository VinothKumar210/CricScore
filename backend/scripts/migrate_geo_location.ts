import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
    console.log('🌍 Starting GeoJSON Migration...');

    // Fetch all match seekers (active or not, all need migration)
    const seekers = await prisma.matchSeeker.findMany();
    console.log(`Found ${seekers.length} seekers to migrate.`);

    let updated = 0;

    for (const seeker of seekers) {
        if (seeker.latitude && seeker.longitude) {
            // GeoJSON Format: { type: "Point", coordinates: [longitude, latitude] }
            const location = {
                type: 'Point',
                coordinates: [seeker.longitude, seeker.latitude]
            };

            await prisma.matchSeeker.update({
                where: { id: seeker.id },
                data: { location }
            });
            updated++;
        }
    }

    console.log(`✅ Migration Complete. Updated ${updated} records.`);
    await prisma.$disconnect();
}

migrate().catch(e => {
    console.error(e);
    process.exit(1);
});
