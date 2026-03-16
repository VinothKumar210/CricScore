import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middlewares/auth.js';
import { uploadAttachment } from '../services/uploadService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

/**
 * POST /api/upload
 * Upload a file attachment for a message
 */
router.post('/', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return sendError(res, 'No file provided', 400, 'BAD_REQUEST');
        }

        const result = await uploadAttachment(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
        );

        return sendSuccess(res, { 
            url: result.url,
            filename: req.file.originalname,
            sizeBytes: result.bytes,
            mimeType: req.file.mimetype,
            // For images/videos, Cloudinary supports on-the-fly transformations via URL
            thumbnailUrl: req.file.mimetype.startsWith('image/') || req.file.mimetype.startsWith('video/') 
                ? result.url.replace('/upload/', '/upload/w_200,h_200,c_fill/') 
                : undefined
        }, 201);
    } catch (error: any) {
        console.error('[UploadRoutes] File upload error:', error);
        return sendError(res, 'Failed to upload file', 500, 'INTERNAL_ERROR');
    }
});

export default router;
