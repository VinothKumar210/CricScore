// =============================================================================
// User Settings — Routes
// =============================================================================
//
// GET    /api/settings       → Get current user's settings
// PATCH  /api/settings       → Update settings (partial)
// POST   /api/settings/reset → Reset all settings to defaults
//
// =============================================================================

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { updateSettingsSchema } from '../types/settingsSchema.js';
import { getUserSettings, updateUserSettings, resetUserSettings } from '../services/settingsService.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';

const router = Router();

// All settings routes require authentication
router.use(requireAuth);

// ---------------------------------------------------------------------------
// GET /api/settings
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await getUserSettings(req.user!.id);
        return sendSuccess(res, settings);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// PATCH /api/settings
// ---------------------------------------------------------------------------
router.patch('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate input
        const parsed = updateSettingsSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError('VALIDATION_FAILED', 'Invalid settings data', {
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        // Reject empty body
        if (Object.keys(parsed.data).length === 0) {
            throw new AppError('INVALID_INPUT', 'No fields to update');
        }

        const settings = await updateUserSettings(req.user!.id, parsed.data);
        return sendSuccess(res, settings);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// POST /api/settings/reset
// ---------------------------------------------------------------------------
router.post('/reset', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await resetUserSettings(req.user!.id);
        return sendSuccess(res, settings);
    } catch (err) {
        next(err);
    }
});

export default router;
