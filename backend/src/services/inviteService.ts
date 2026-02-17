import { prisma } from '../utils/db.js';
import { redisClient } from './presenceService.js'; // Reuse redis client
import { calculateDistance } from '../utils/geoUtils.js';
import { notificationService } from './notificationService.js';

const PROPOSAL_PREFIX = 'invite:proposal:'; // invite:proposal:<seekerId>:<teamId>
const PROPOSAL_TTL = 86400 * 7; // 7 days

// -----------------------------------------------------------------------------
// Match Seeker (Invite) Management
// -----------------------------------------------------------------------------

export const createInvite = async (
    teamId: string,
    data: {
        preferredDate?: Date;
        preferredTime?: any; // Was TimeSlot
        overs?: number;
        ballType?: any; // Was BallType
        message?: string;
        latitude: number;
        longitude: number;
        radius: number;
        expiresAt: Date;
    }
) => {
    // GeoJSON Point
    const location = {
        type: 'Point',
        coordinates: [data.longitude, data.latitude]
    };

    const invite = await prisma.matchSeeker.create({
        data: {
            team: { connect: { id: teamId } },
            ...data,
            location, // Store GeoJSON
            isActive: true
        } as any
    });

    // 5. Emit Event for Proximity Alerts (Async)
    import('../events/eventBus.js').then(({ eventBus }) => {
        eventBus.emit('invite.created', invite);
    });

    return invite;
};

export const getFeed = async (
    userLat: number,
    userLon: number,
    filters: {
        maxDistance?: number; // km
        overs?: number;
        ballType?: any; // Was BallType
        limit?: number;
        cursor?: string; // ID for pagination (Not fully supported with $near yet, relying on limit)
    }
) => {
    const maxDistMeters = (filters.maxDistance || 50) * 1000;
    const limit = filters.limit || 50;
    const now = new Date();

    // 1. Raw MongoDB Query using $near (2dsphere index)
    // This returns documents sorted by distance automatically.
    const rawCandidates = await prisma.matchSeeker.findRaw({
        filter: {
            isActive: true, // Boolean true in Mongo
            expiresAt: { $gt: { $date: now.toISOString() } }, // Mongo Date Query
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [userLon, userLat]
                    },
                    $maxDistance: maxDistMeters
                }
            },
            ...(filters.overs ? { overs: filters.overs } : {}),
            ...(filters.ballType ? { ballType: filters.ballType } : {})
        },
        options: {
            limit: limit,
            // $near requires no sort (implicit distance sort)
        }
    });

    // Handle raw result
    const candidates = Array.isArray(rawCandidates) ? rawCandidates : [];

    if (candidates.length === 0) return [];

    // 2. Extract IDs preserving order
    // Raw Mongo returns _id as { $oid: "..." }
    const ids = candidates.map((doc: any) => {
        if (doc._id?.$oid) return doc._id.$oid;
        return String(doc._id);
    });

    // 3. Hydrate with Relations (findMany)
    const hydrated = await prisma.matchSeeker.findMany({
        where: { id: { in: ids } },
        include: {
            team: { select: { id: true, name: true, logoUrl: true, matchesConfirmed: true, matchesCancelled: true } }
        }
    });

    // 4. Map back to original sorted order
    const hydratedMap = new Map(hydrated.map(h => [h.id, h]));
    const result = ids.map(id => hydratedMap.get(id)).filter(Boolean);

    // 5. Append Distance (Optional, calculated just for frontend display if needed)
    // $near guarantees sort, but doesn't inject 'distance' field unless using $geoNear aggregate.
    // We can re-calc Haversine cheaply for these 50 items if the UI needs "5 km away".
    const finalResult = result.map((invite: any) => {
        const team = invite.team;
        let reliability = 100;
        if (team && team.matchesConfirmed > 0) {
            reliability = Math.round(((team.matchesConfirmed - team.matchesCancelled) / team.matchesConfirmed) * 100);
        }

        return {
            ...invite,
            distance: calculateDistance(userLat, userLon, invite.latitude, invite.longitude),
            team: {
                ...team,
                reliability
            }
        };
    });

    return finalResult;
};

export const closeInvite = async (inviteId: string, teamId: string) => {
    // Verify ownership
    const invite = await prisma.matchSeeker.findUnique({ where: { id: inviteId } });
    if (!invite || invite.teamId !== teamId) throw new Error('Unauthorized or not found');

    return prisma.matchSeeker.update({
        where: { id: inviteId },
        data: { isActive: false }
    });
};

// -----------------------------------------------------------------------------
// Response / Negotiation (Redis Backed)
// -----------------------------------------------------------------------------

export const respondToInvite = async (
    inviteId: string,
    responderTeamId: string,
    status: 'ACCEPTED' | 'REJECTED' | 'COUNTER',
    proposal?: any
) => {
    if (status === 'REJECTED') {
        return { status: 'REJECTED' };
    }

    if (status === 'ACCEPTED') {
        // Atomic Acceptance Transaction
        return prisma.$transaction(async (tx: any) => {
            const invite = await tx.matchSeeker.findUnique({
                where: { id: inviteId },
                include: { team: { select: { ownerId: true, name: true } } }
            });

            // Validate
            if (!invite) throw new Error('Invite not found');
            if (!invite.isActive) throw new Error('Invite is no longer active');
            if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
                throw new Error('Invite has expired');
            }

            // Create Match
            const match = await tx.matchSummary.create({
                data: {
                    matchType: 'TEAM_MATCH' as any,
                    status: 'SCHEDULED',
                    homeTeamName: invite.team.name || 'Home Team',
                    awayTeamName: 'Pending',
                    matchDate: invite.preferredDate || new Date(),
                    overs: invite.overs || 20,
                    matchSeekerId: inviteId,
                    awayTeamId: responderTeamId
                } as any
            });

            // Deactivate
            await tx.matchSeeker.update({
                where: { id: inviteId },
                data: { isActive: false }
            });

            return { status: 'MATCH_CREATED', matchId: match.id };
        });
    }

    if (status === 'COUNTER') {
        const invite = await prisma.matchSeeker.findUnique({
            where: { id: inviteId },
            include: { team: { select: { ownerId: true } } }
        });

        if (!invite || !invite.isActive) throw new Error('Invite not active');
        if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
            throw new Error('Invite has expired');
        }

        // DB Persistence (Source of Truth)
        await prisma.inviteProposal.upsert({
            where: {
                seekerId_fromTeamId: {
                    seekerId: inviteId,
                    fromTeamId: responderTeamId
                }
            },
            update: {
                proposedDate: proposal.date ? new Date(proposal.date) : undefined,
                proposedTime: proposal.time,
                proposedOvers: proposal.overs,
                proposedGroundId: proposal.groundId,
                status: 'PENDING',
                createdAt: new Date() // specific check: update timestamp
            },
            create: {
                seekerId: inviteId,
                fromTeamId: responderTeamId,
                proposedDate: proposal.date ? new Date(proposal.date) : undefined,
                proposedTime: proposal.time,
                proposedOvers: proposal.overs,
                proposedGroundId: proposal.groundId,
                status: 'PENDING'
            }
        } as any);

        // Redis Cache (For Fast Access / TTL)
        const key = `${PROPOSAL_PREFIX}${inviteId}:${responderTeamId}`;
        await redisClient.setex(key, PROPOSAL_TTL, JSON.stringify(proposal));

        await notificationService.createNotification({
            userId: invite.team.ownerId,
            type: 'MATCH_INVITE',
            title: 'New Counter Proposal',
            body: 'A team has proposed changes to your invite.',
            data: { inviteId, responderTeamId, proposal } as any,
            dedupeKey: `counter:${inviteId}:${responderTeamId}`,
        } as any);

        return { status: 'PROPOSAL_SENT' };
    }
};
