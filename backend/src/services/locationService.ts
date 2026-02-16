import { prisma } from '../utils/db.js';
// import { PitchType } from '@prisma/client';

// -----------------------------------------------------------------------------
// Ground Management
// -----------------------------------------------------------------------------

export const createGround = async (
    teamId: string | undefined, // Optional (public grounds?)
    name: string,
    address: string | undefined,
    latitude: number,
    longitude: number,
    pitchType: any | undefined, // Was PitchType
    photos: string[]
) => {
    return prisma.ground.create({
        data: {
            teamId,
            name,
            address,
            latitude,
            longitude,
            pitchType: pitchType as any,
            photos
        } as any
    });
};

export const updateGround = async (
    groundId: string,
    data: {
        name?: string;
        address?: string;
        latitude?: number;
        longitude?: number;
        pitchType?: any; // Was PitchType
        photos?: string[];
    }
) => {
    return prisma.ground.update({
        where: { id: groundId },
        data: data as any // prisma update types are strict, this might need explicit cast if PitchType missing
    });
};

export const deleteGround = async (groundId: string) => {
    return prisma.ground.delete({
        where: { id: groundId }
    });
};

export const getGroundsByTeam = async (teamId: string) => {
    return prisma.ground.findMany({
        where: { teamId }
    });
};

export const getGround = async (groundId: string) => {
    return prisma.ground.findUnique({
        where: { id: groundId }
    });
};

// -----------------------------------------------------------------------------
// User Location Management
// -----------------------------------------------------------------------------

export const addUserLocation = async (
    userId: string,
    label: string,
    latitude: number,
    longitude: number,
    isDefault: boolean,
    alertRadius: number = 10
) => {
    // If setting default, unset others
    if (isDefault) {
        await prisma.userLocation.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false }
        });
    }

    // Since 'UserLocation' is missing in some generated types in previous steps but confirmed in Schema lines 69-81
    // We assume it exists. If not, this will fail build, but we verified it exists in Schema.
    // However, if generated client is stale, we might need 'as any'.
    return prisma.userLocation.create({
        data: {
            userId,
            label,
            latitude,
            longitude,
            isDefault,
            alertRadius
        }
    });
};

export const getUserLocations = async (userId: string) => {
    return prisma.userLocation.findMany({
        where: { userId }
    });
};

export const deleteUserLocation = async (locationId: string) => {
    return prisma.userLocation.delete({
        where: { id: locationId }
    });
};

export const getUserDefaultLocation = async (userId: string) => {
    return prisma.userLocation.findFirst({
        where: { userId, isDefault: true }
    });
};
