import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// GET /api/stats/career/:userId
router.get('/career/:userId', requireAuth, async (req, res) => {
    try {
        const userId = String(req.params.userId);
        const career = await prisma.playerCareerStats.findUnique({
            where: { playerType_playerId: { playerType: 'REGISTERED', playerId: userId } }
        });
        const formatStats = await prisma.playerFormatStats.findMany({
            where: { playerType: 'REGISTERED', playerId: String(userId) }
        });
        const seasonStats = await prisma.playerSeasonStats.findMany({
            where: { playerType: 'REGISTERED', playerId: String(userId) },
            orderBy: { season: 'desc' }
        });
        
        res.json({ success: true, career, formatStats, seasonStats });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch career stats' });
    }
});

// GET /api/stats/h2h
router.get('/h2h', requireAuth, async (req, res) => {
    try {
        const { batsmanId, bowlerId } = req.query;
        if (!batsmanId || !bowlerId) return res.status(400).json({ error: 'Missing params' });
        
        const h2h = await prisma.headToHead.findUnique({
            where: {
                batsmanType_batsmanId_bowlerType_bowlerId: {
                    batsmanType: 'REGISTERED',
                    batsmanId: String(batsmanId),
                    bowlerType: 'REGISTERED',
                    bowlerId: String(bowlerId)
                }
            }
        });
        
        res.json({ success: true, h2h });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch H2H stats' });
    }
});

// GET /api/stats/team-record
router.get('/team-record', requireAuth, async (req, res) => {
    try {
        const { teamAId, teamBId } = req.query;
        if (!teamAId || !teamBId) return res.status(400).json({ error: 'Missing params' });
        
        const ids = [String(teamAId), String(teamBId)].sort();
        const record = await prisma.teamRecord.findUnique({
             where: {
                 teamAId_teamBId: { teamAId: String(ids[0]), teamBId: String(ids[1]) }
             }
        });
        
        res.json({ success: true, record });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch Team Record' });
    }
});

// GET /api/stats/venue/:venue
router.get('/venue/:venue', requireAuth, async (req, res) => {
    try {
        const venue = String(req.params.venue);
        const venueStats = await prisma.venueStats.findUnique({
            where: { venueName: venue }
        });
        
        res.json({ success: true, venueStats });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch Venue stats' });
    }
});

export const careerStatsRoutes = router;
