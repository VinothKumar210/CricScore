import express from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as tournamentService from '../services/tournamentService.js';

const router = express.Router();

// POST /api/tournaments - Create a tournament
router.post('/', requireAuth, async (req, res) => {
    try {
        const tournament = await tournamentService.createTournament((req as any).user.uid, req.body);
        res.status(201).json(tournament);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/tournaments - List tournaments
router.get('/', async (req, res) => {
    try {
        const tournaments = await tournamentService.getTournaments();
        res.json(tournaments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/tournaments/:id - Get details, fixtures, standings
router.get('/:id', async (req, res) => {
    try {
        const tournament = await tournamentService.getTournament(req.params.id as string);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

        let standings = [];
        // If standings logic is dynamic or computed, we might want to fetch it separately or here.
        // Service's getTournament already includes standings relation.

        res.json(tournament);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/tournaments/:id/teams - Register a team
router.post('/:id/teams', requireAuth, async (req, res) => {
    try {
        const { teamId } = req.body;
        // Todo: verify user is captain of teamId
        const result = await tournamentService.registerTeam(req.params.id as string, teamId);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/tournaments/:id/fixtures/generate - Generate fixtures
router.post('/:id/fixtures/generate', requireAuth, async (req, res) => {
    try {
        // Todo: verify creator
        const fixtures = await tournamentService.generateFixtures(req.params.id as string);
        res.status(201).json(fixtures);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
