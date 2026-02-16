import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * Generate a random 8-character alphanumeric join code.
 * Example: A7B2-9XZ1
 */
export const generateJoinCode = (): string => {
    // Generate 4 bytes -> hex string (8 chars) -> uppercase
    return crypto.randomBytes(4).toString('hex').toUpperCase();
};

/**
 * Generate a QR code as a base64 string.
 * This can be directly used in <img src="..."> in the frontend.
 */
export const generateQRCode = async (data: string): Promise<string> => {
    try {
        // data:image/png;base64,...
        return await QRCode.toDataURL(data);
    } catch (err) {
        console.error('QR Code generation failed:', err);
        throw new Error('Failed to generate QR code');
    }
};
