// =============================================================================
// Upload Middleware — Multer + Validation
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
    return (_req: any, file: any, cb: any) => {
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
