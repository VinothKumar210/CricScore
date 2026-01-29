import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
// These should be set in your .env file:
// CLOUDINARY_CLOUD_NAME=your_cloud_name
// CLOUDINARY_API_KEY=your_api_key
// CLOUDINARY_API_SECRET=your_api_secret

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
    url: string;
    publicId: string;
}

/**
 * Upload an image to Cloudinary from a base64 string
 * @param base64Data - Base64 encoded image data (with or without data URI prefix)
 * @param folder - Folder name in Cloudinary (e.g., 'profiles', 'teams')
 * @param publicId - Optional custom public ID for the image
 */
export async function uploadImage(
    base64Data: string,
    folder: string,
    publicId?: string
): Promise<UploadResult> {
    try {
        // Ensure data has proper prefix
        const dataUri = base64Data.startsWith('data:')
            ? base64Data
            : `data:image/jpeg;base64,${base64Data}`;

        const uploadOptions: any = {
            folder: `cricscore/${folder}`,
            resource_type: 'image',
            transformation: [
                { width: 500, height: 500, crop: 'fill', gravity: 'face' },
                { quality: 'auto', fetch_format: 'auto' }
            ]
        };

        if (publicId) {
            uploadOptions.public_id = publicId;
            uploadOptions.overwrite = true;
        }

        const result = await cloudinary.uploader.upload(dataUri, uploadOptions);

        return {
            url: result.secure_url,
            publicId: result.public_id,
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload image');
    }
}

/**
 * Delete an image from Cloudinary
 * @param publicId - The public ID of the image to delete
 */
export async function deleteImage(publicId: string): Promise<boolean> {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        return false;
    }
}

/**
 * Generate initials from a name for avatar fallback
 * @param name - Full name (e.g., "Vinoth Kumar")
 * @returns Initials (e.g., "VK")
 */
export function getInitials(name: string | null | undefined): string {
    if (!name) return '?';

    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].charAt(0).toUpperCase();
    }

    // Take first letter of first and last word
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export default cloudinary;
