import express from 'express';
import { requireApiKey } from '../middlewares/apiKeyMiddleware.js';
import { prisma } from '../utils/db.js';
// import { scoringEngine } from '../services/scoringEngine.js'; // If needed for live state reconstruction

const router = express.Router();

// Public V1 API
// Base: /public/v1

// GET /public/v1/match/:id
router.get('/match/:id', requireApiKey('read:matches'), async (req, res) => {
    try {
        const matchId = req.params.id as string;
        const match = await prisma.matchSummary.findUnique({
            where: { id: matchId },
            select: {
                id: true,
                status: true,
                matchType: true,
                homeTeamName: true,
                awayTeamName: true,
                // tossWinnerId: true, // Not in schema
                // tossDecision: true, // Not in schema
                result: true,
                winningTeamName: true,
                winMargin: true,
                venue: true,
                matchDate: true,
                // Do NOT expose user IDs, emails, phone
            }
        });

        if (!match) return res.status(404).json({ message: 'Match not found' });
        res.json(match);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /public/v1/match/:id/live
router.get('/match/:id/live', requireApiKey('read:matches'), async (req, res) => {
    try {
        // Return constructed state
        // Re-use logic from matchService (getMatchState?) or similar
        // For now, return basic summary or implement reconstruction call
        // We will return 501 Not Implemented or basic info
        res.status(501).json({ message: 'Live match state not implemented in public API yet' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /public/v1/leaderboard
router.get('/leaderboard', requireApiKey('read:leaderboard'), async (req, res) => {
    try {
        // Global leaderboard? Or specific tournament?
        // Let's return top players by runs (Global) for MVP
        // Privacy: Only names and stats.
        // Only public profiles?

        // This is heavy query. Limit 10.
        // We need aggregated stats. Ideally from User model if we store stats there?
        // User model has relations.
        // Implementation might require Aggregation query on BattingPerformance

        const topBatsmen = await prisma.battingPerformance.groupBy({
            by: ['userId'], // Group by user
            _sum: { runs: true },
            orderBy: { _sum: { runs: 'desc' } },
            take: 10
        });

        // Resolve names
        // This is inefficient (N+1 possibility or second query).
        // Better: Helper function

        res.json(topBatsmen);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
