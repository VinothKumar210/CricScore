// =============================================================================
// Upload Service — Cloudinary + Sharp compression
// =============================================================================

import cloudinary from '../utils/cloudinary.js';
import sharp from 'sharp';
import { AppError } from '../utils/AppError.js';

// ---------------------------------------------------------------------------
// Avatar Upload
// ---------------------------------------------------------------------------

interface UploadResult {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
}

/**
 * Compresses an image buffer and uploads to Cloudinary.
 *
 * Pipeline:
 *   1. Resize to maxDimension (preserving aspect ratio)
 *   2. Convert to WebP (quality 80)
 *   3. Strip metadata (EXIF, GPS, etc.)
 *   4. Upload to Cloudinary folder
 *
 * @param buffer   - Raw file buffer from multer
 * @param userId   - Used as unique identifier in Cloudinary path
 * @param folder   - Cloudinary folder (e.g., 'cricscore/avatars')
 */
export async function uploadAvatar(
    buffer: Buffer,
    userId: string,
    folder = 'cricscore/avatars',
): Promise<UploadResult> {
    try {
        // 1. Compress with sharp
        const compressed = await sharp(buffer)
            .resize(400, 400, {
                fit: 'cover',         // Crop to square
                position: 'centre',
            })
            .webp({ quality: 80 })
            .withMetadata(false as any)
            .toBuffer();

        // 2. Upload to Cloudinary
        const result = await new Promise<any>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    public_id: `avatar_${userId}`,
                    overwrite: true,                 // Replace previous avatar
                    resource_type: 'image',
                    format: 'webp',
                    transformation: [
                        { quality: 'auto:good' },    // Cloudinary auto-quality
                    ],
                    invalidate: true,                // Purge CDN cache
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                },
            );

            stream.end(compressed);
        });

        return {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
        };
    } catch (err: any) {
        console.error('[UploadService] Avatar upload failed:', err);
        throw new AppError('EXTERNAL_SERVICE_ERROR', 'Image upload failed. Please try again.');
    }
}

// ---------------------------------------------------------------------------
// Delete Avatar
// ---------------------------------------------------------------------------

export async function deleteAvatar(publicId: string): Promise<void> {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (err: any) {
        console.error('[UploadService] Avatar delete failed:', err);
        // Non-critical — don't throw
    }
}
