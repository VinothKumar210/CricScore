// =============================================================================
// Search Routes — Global search across all entities
// =============================================================================
//
// GET /api/search?q=term&limit=20&offset=0&category=USER
//
// =============================================================================

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { globalSearch } from '../services/searchService.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/search — Global search
// ---------------------------------------------------------------------------
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new AppError('UNAUTHORIZED');

        const q = (req.query.q as string || '').trim();
        if (!q) throw new AppError('MISSING_FIELD', 'Search query "q" is required');

        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
        const offset = parseInt(req.query.offset as string) || 0;
        const category = req.query.category as 'USER' | 'TEAM' | 'MATCH' | 'TOURNAMENT' | undefined;

        // Validate category if provided
        if (category && !['USER', 'TEAM', 'MATCH', 'TOURNAMENT'].includes(category)) {
            throw new AppError('INVALID_INPUT', 'Category must be USER, TEAM, MATCH, or TOURNAMENT');
        }

        const results = await globalSearch(q, { limit, offset, category });
        return sendSuccess(res, results);
    } catch (err) {
        next(err);
    }
});

export default router;
