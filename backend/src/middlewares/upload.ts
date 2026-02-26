// =============================================================================
// Upload Middleware — Multer + Validation
// =============================================================================
//
// Uses multer memory storage (no disk writes).
// Files are validated for type and size, then passed as req.file buffer.
//
// Usage in routes:
//   router.post('/avatar', uploadSingle('avatar', 5), handler);
//
// =============================================================================

import multer from 'multer';
import { AppError } from '../utils/AppError.js';

// ---------------------------------------------------------------------------
// Allowed MIME types
// ---------------------------------------------------------------------------

const IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);

// ---------------------------------------------------------------------------
// Multer Config — memory storage (buffer only, no tmp files)
// ---------------------------------------------------------------------------

const storage = multer.memoryStorage();

function createFileFilter(allowedTypes: Set<string>) {
    return (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        if (allowedTypes.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new AppError(
                'INVALID_FORMAT',
                `Unsupported file type: ${file.mimetype}. Allowed: ${[...allowedTypes].join(', ')}`,
            ));
        }
    };
}

// ---------------------------------------------------------------------------
// Export: Single-file upload middleware factory
// ---------------------------------------------------------------------------

/**
 * Creates a multer middleware for a single file upload.
 *
 * @param fieldName - Form field name (e.g., 'avatar')
 * @param maxSizeMB - Maximum file size in megabytes (default: 5)
 */
export function uploadSingle(fieldName: string, maxSizeMB = 5) {
    return multer({
        storage,
        fileFilter: createFileFilter(IMAGE_TYPES),
        limits: {
            fileSize: maxSizeMB * 1024 * 1024,
            files: 1,
        },
    }).single(fieldName);
}
