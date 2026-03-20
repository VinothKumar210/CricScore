import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * Generate a random 6-character hex invite code.
 * Example: 3F86A7
 */
export const generateJoinCode = (): string => {
    // Generate 3 bytes -> hex string (6 chars) -> uppercase
    return crypto.randomBytes(3).toString('hex').toUpperCase();
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
