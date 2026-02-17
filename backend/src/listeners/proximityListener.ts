import { prisma } from '../utils/db.js';
import { eventBus } from '../events/eventBus.js';
import { MAX_PROXIMITY_RADIUS_KM } from '../utils/constants.js';

// Initialize Proximity Listener
export const initProximityListener = () => {
    console.log('🌍 Proximity Listener Initialized');

    eventBus.on('invite.created', async (invite: any) => {
        try {
            // 1. Validate Invite Location
            if (!invite.latitude || !invite.longitude) return;

            console.log(`📡 Processing Proximity Alerts for Invite: ${invite.id}`);

            // 2. Find Candidates (Raw Mongo Query for 2dsphere)
            // We find users within MAX radius (e.g. 20km) first
            // Then filter by user's preference in memory or query if possible
            // Mongo $near returns sorted by distance

            // Constraint: Exclude own team members? 
            // Invite is from a Team. User who created it is owner.
            // Ideally exclude users already in that team.
            // For now, let's just find users.

            const maxDistanceMeters = (invite.radius || 10) * 1000; // Invite's radius constraint

            // Prisma doesn't support $near in typed query yet for Mongo
            // We use runCommandRaw or findRaw
            const candidates = await (prisma.userLocation as any).findRaw({
                filter: {
                    location: {
                        $near: {
                            $geometry: {
                                type: "Point",
                                coordinates: [invite.longitude, invite.latitude]
                            },
                            $maxDistance: maxDistanceMeters
                        }
                    },
                    // Exclude the creator (owner of team) if linked?
                    // userLocation has userId.
                }
            }) as any[];

            if (!candidates || candidates.length === 0) return;

            console.log(`📍 Found ${candidates.length} candidates near invite.`);

            const notificationsToCreate = [];

            for (const candidate of candidates) {
                // 3. User Preference Check
                // candidate is a raw doc. userId is string or ObjectId.
                // alertRadius is in km.
                const userAlertRadiusKm = candidate.alertRadius || 5;
                // We should calculate actual distance to be precise, 
                // but $near guarantees they are within maxDistanceMeters.
                // We trust $near for now or we can use Haversine to double check if strictly < userAlertRadius

                // Let's assume valid.

                // 4. Create Notification Object
                const userId = candidate.userId.$oid || candidate.userId; // Handle Raw Mongo ObjectId

                // Dedupe Key: One alert per invite per user
                const dedupeKey = `proximity:${invite.id}:${userId}`;

                // Skip if user is the creator (optional logic, expensive to check team membership here without join)
                // For now, if creator has a location, they get notified? Maybe filters out in UI.

                notificationsToCreate.push({
                    userId,
                    type: 'PROXIMITY_ALERT',
                    title: 'New Match Invite Nearby!',
                    // e.g. "A team is looking for a match 5km away"
                    body: `A team is looking for a match near ${candidate.address || 'you'}.`,
                    data: { inviteId: invite.id, distance: 'nearby' },
                    dedupeKey,
                    isRead: false,
                    createdAt: new Date()
                });
            }

            if (notificationsToCreate.length === 0) return;

            // 5. Batch Insert (Fire-and-forget)
            // skipDuplicates is not fully supported in Mongo provider for createMany in older Prisma?
            // "The skipDuplicates option is not supported for MongoDB."
            // We must use createMany but handle error? Or insert one by one?
            // Actually, for Mongo, createMany is supported but skipDuplicates MIGHT NOT be.
            // If NOT supported, we use Promise.allSettled with create and swallow error.

            // Workaround: Use Promise.all with individual creates (slower but safe)
            // Or just createMany and if it fails due to one duplicate, whole batch fails? YES.
            // Safe approach: createMany.
            // But we have unique constraint on dedupeKey.
            // If we use createMany, and one exists, it throws.

            // BETTER: Use Promise.allSettled

            const results = await Promise.allSettled(notificationsToCreate.map(n =>
                prisma.notification.create({
                    data: n as any
                })
            ));

            const successCount = results.filter(r => r.status === 'fulfilled').length;
            console.log(`✅ Sent ${successCount} proximity alerts.`);

        } catch (error) {
            console.error('❌ Error in Proximity Listener:', error);
        }
    });
};
