import { prisma } from '../utils/db.js';
import { redisClient } from './presenceService.js'; // Reuse redis client
import { calculateDistance } from '../utils/geoUtils.js';
// Remove imports that might be missing in generated client
// import { BallType, TimeSlot, NotificationType } from '@prisma/client';

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
    const invite = await prisma.matchSeeker.create({
        data: {
            team: { connect: { id: teamId } },
            ...data,
            isActive: true
        } as any
    });

    // TODO: Trigger Proximity Alerts (Async)
    // triggerProximityAlerts(invite);

    return invite;
};

export const getFeed = async (
    userLat: number,
    userLon: number,
    filters: {
        maxDistance?: number; // km
        overs?: number;
        ballType?: any; // Was BallType
    }
) => {
    const maxDist = filters.maxDistance || 50;

    // 1. Efficient Bounding Box Filter (Approx 1 deg ~ 111km)
    const latDelta = maxDist / 111;
    const lonDelta = maxDist / (111 * Math.cos(userLat * (Math.PI / 180)));

    const candidates = await prisma.matchSeeker.findMany({
        where: {
            isActive: true,
            expiresAt: { gt: new Date() },
            latitude: { gte: userLat - latDelta, lte: userLat + latDelta },
            longitude: { gte: userLon - lonDelta, lte: userLon + lonDelta },
            ...(filters.overs ? { overs: filters.overs } : {}),
            ...(filters.ballType ? { ballType: filters.ballType } : {})
        },
        include: {
            team: { select: { id: true, name: true, logoUrl: true, matchesConfirmed: true, matchesCancelled: true } }
        }
    });

    // 2. Ranking & Exact Distance Calculation
    const ranked = candidates.map((invite: any) => {
        const dist = calculateDistance(userLat, userLon, invite.latitude, invite.longitude);
        if (dist > maxDist + invite.radius) return null;

        if (dist > maxDist) return null;

        // Score Calculation
        // Recency
        const daysOld = (Date.now() - new Date(invite.createdAt).getTime()) / (1000 * 3600 * 24);
        let recencyMult = 0.1;
        if (daysOld < 1) recencyMult = 1.0;
        else if (daysOld < 3) recencyMult = 0.5;

        let score = (1 / (dist + 0.1)) * recencyMult;

        return { ...invite, distance: dist, score };
    }).filter(Boolean).sort((a: any, b: any) => (b.score - a.score));

    return ranked;
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
    const invite = await prisma.matchSeeker.findUnique({
        where: { id: inviteId },
        include: { team: { select: { ownerId: true, name: true } } }
    });
    if (!invite || !invite.isActive) throw new Error('Invite not active');

    if (status === 'REJECTED') {
        return { status: 'REJECTED' };
    }

    if (status === 'ACCEPTED') {
        const match = await prisma.matchSummary.create({
            data: {
                matchType: 'TEAM_MATCH' as any,
                status: 'SCHEDULED',
                homeTeamName: invite.team.name || 'Home Team',
                awayTeamName: 'Pending',
                matchDate: invite.preferredDate || new Date(),
                overs: invite.overs || 20,
            } as any
        });

        // Deactivate invite
        await prisma.matchSeeker.update({ where: { id: inviteId }, data: { isActive: false } });

        return { status: 'MATCH_CREATED', matchId: match.id };
    }

    if (status === 'COUNTER') {
        const key = `${PROPOSAL_PREFIX}${inviteId}:${responderTeamId}`;
        await redisClient.setex(key, PROPOSAL_TTL, JSON.stringify(proposal));

        // Notify Inviter
        await prisma.notification.create({
            data: {
                userId: invite.team.ownerId,
                type: 'MATCH_INVITE' as any, // Use cast
                title: 'New Counter Proposal',
                body: `A team has proposed changes to your invite.`,
                data: { inviteId, responderTeamId, proposal }
            } as any
        });

        return { status: 'PROPOSAL_SENT' };
    }
};
