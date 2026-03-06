// @ts-nocheck
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import scoringRoutes from '../../routes/scoringRoutes.js';

// Mock auth middleware to bypass JWT checks
jest.unstable_mockModule('../../middlewares/auth.js', () => ({
    requireAuth: (req: Request, res: Response, next: NextFunction) => {
        req.user = { id: 'testUserId', role: 'USER' } as any;
        next();
    }
}));

// Mock match role permission to bypass database role lookup
jest.unstable_mockModule('../../middlewares/matchPermission.js', () => ({
    requireMatchRole: () => (req: Request, res: Response, next: NextFunction) => next()
}));

// Mock Scoring Engine
const mockAddOperation = jest.fn();
const mockGetMatchState = jest.fn();
const mockGetOperations = jest.fn();

jest.unstable_mockModule('../../services/scoringEngine.js', () => ({
    scoringEngine: {
        addOperation: mockAddOperation,
        getMatchState: mockGetMatchState,
        getOperations: mockGetOperations,
    }
}));

// Mock Redis Client for Rate Limiting to prevent hang
jest.unstable_mockModule('../../services/presenceService.js', () => ({
    redisClient: {
        pipeline: () => ({
            zremrangebyscore: jest.fn(),
            zcard: jest.fn(),
            zadd: jest.fn(),
            expire: jest.fn(),
            exec: jest.fn().mockResolvedValue([[null, 1], [null, 0], [null, 1], [null, 1]])
        })
    }
}));

// Setup Express App
const app = express();
app.use(express.json());

// Need to await imports for unstable_mockModule to work correctly with ES modules
beforeEach(async () => {
    jest.clearAllMocks();

    // Mount the routes after mocks are initialized
    const { default: routes } = await import('../../routes/scoringRoutes.js');

    // Clear existing middleware stack except the body parser if initialized
    if (app._router && app._router.stack) {
        app._router.stack = app._router.stack.slice(0, 2);
    }
    app.use('/api', routes);
});

describe('scoringRoutes Integration', () => {

    describe('POST /api/matches/:id/operations', () => {
        it('returns 400 when missing required payload fields', async () => {
            const res = await request(app)
                .post('/api/matches/m1/operations')
                .send({
                    type: 'START_INNINGS'
                    // missing clientOpId and expectedVersion
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error.code).toBe('MISSING_PARAM');
        });

        it('returns 200 and success when payload is valid', async () => {
            mockAddOperation.mockResolvedValueOnce({ success: true, newVersion: 2 });

            const res = await request(app)
                .post('/api/matches/m1/operations')
                .send({
                    clientOpId: 'op_123',
                    expectedVersion: 1,
                    type: 'DELIVER_BALL',
                    payload: { runs: 4, isBoundary: true }
                });

            expect(mockAddOperation).toHaveBeenCalledWith(
                'm1',
                'testUserId',
                expect.objectContaining({ type: 'DELIVER_BALL' })
            );

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.newVersion).toBe(2);
        });

        it('returns matched error payload when the Engine rejects the state update', async () => {
            // Example version mismatch exception
            mockAddOperation.mockRejectedValueOnce({
                statusCode: 409,
                message: 'Version conflict',
                code: 'VERSION_CONFLICT',
                currentVersion: 5
            });

            const res = await request(app)
                .post('/api/matches/m1/operations')
                .send({
                    clientOpId: 'op_123',
                    expectedVersion: 1, // Stale!
                    type: 'DELIVER_BALL',
                    payload: { runs: 1 }
                });

            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
            expect(res.body.error.code).toBe('VERSION_CONFLICT');
            expect(res.body.error.details.currentVersion).toBe(5);
        });
    });

    describe('GET /api/matches/:id/state', () => {
        it('fetches complete reconstructed match state', async () => {
            mockGetMatchState.mockResolvedValueOnce({
                totalRuns: 120,
                wickets: 4,
                ballsBowled: 60
            });

            const res = await request(app).get('/api/matches/m1/state');

            expect(res.status).toBe(200);
            expect(res.body.data.state.totalRuns).toBe(120);
            expect(mockGetMatchState).toHaveBeenCalledWith('m1');
        });

        it('returns HTTP 500 when state reconstruction throws unexpectedly', async () => {
            mockGetMatchState.mockRejectedValueOnce(new Error('Corrupted sequence'));

            const res = await request(app).get('/api/matches/m1/state');

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.error.code).toBe('INTERNAL_ERROR');
        });
    });

    describe('GET /api/matches/:id/operations', () => {
        it('returns event log sync payload without bounds', async () => {
            mockGetOperations.mockResolvedValueOnce([{ type: 'START_MATCH' }, { type: 'TOSS' }]);

            const res = await request(app).get('/api/matches/m1/operations');
            expect(res.status).toBe(200);
            expect(res.body.data.operations.length).toBe(2);
            // Since was not provided, default 0
            expect(mockGetOperations).toHaveBeenCalledWith('m1', 0);
        });

        it('parses since parameters to constrain the operations returned', async () => {
            mockGetOperations.mockResolvedValueOnce([{ type: 'DELIVER_BALL' }]);

            const res = await request(app).get('/api/matches/m1/operations?since=5');
            expect(res.status).toBe(200);
            expect(mockGetOperations).toHaveBeenCalledWith('m1', 5);
        });
    });
});
