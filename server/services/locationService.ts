/**
 * Location Service
 * Haversine distance calculation and filtering for location-based match invites.
 */

/**
 * Calculate distance in kilometers between two GPS coordinates using
 * the Haversine formula.
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Filter items that have latitude/longitude within a radius (km).
 */
export function filterByDistance<T extends { latitude: number; longitude: number }>(
    items: T[],
    userLat: number,
    userLon: number,
    radiusKm: number
): (T & { distance: number })[] {
    return items
        .map(item => ({
            ...item,
            distance: calculateDistance(userLat, userLon, item.latitude, item.longitude)
        }))
        .filter(item => item.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);
}

/**
 * Format distance for display (e.g., "2.5 km" or "800 m")
 */
export function formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
}
