import type { BallEvent } from "../../types/ballEventTypes";

export interface WagonWheelShot {
    batsmanId: string;
    bowlerId: string;
    runs: number;
    angle: number;
    distance: number;
    isBoundary: boolean;
    zone: ScoringZone;
}

export type ScoringZone =
    | "THIRD_MAN"
    | "POINT"
    | "COVERS"
    | "EXTRA_COVER"
    | "LONG_OFF"
    | "LONG_ON"
    | "MID_WICKET"
    | "SQUARE_LEG"
    | "FINE_LEG";

export function getZoneFromAngle(angle: number): ScoringZone {
    // Basic approximate mapping (assuming 0 degrees = straight down ground, Right Handed Batter perspective)
    // 0-45: Long Off / Extra Cover
    // 45-90: Covers / Point
    // ... we adjust mapping based on UI logic later.
    const normalized = angle % 360;
    
    if (normalized >= 345 || normalized < 15) return "LONG_OFF";
    if (normalized >= 15 && normalized < 45) return "EXTRA_COVER";
    if (normalized >= 45 && normalized < 90) return "COVERS";
    if (normalized >= 90 && normalized < 135) return "POINT";
    if (normalized >= 135 && normalized < 180) return "THIRD_MAN";
    if (normalized >= 180 && normalized < 225) return "FINE_LEG";
    if (normalized >= 225 && normalized < 270) return "SQUARE_LEG";
    if (normalized >= 270 && normalized < 315) return "MID_WICKET";
    if (normalized >= 315 && normalized < 345) return "LONG_ON";
    
    return "MID_WICKET";
}

export function deriveWagonWheelData(events: BallEvent[], targetBatsmanId?: string): WagonWheelShot[] {
    const list: WagonWheelShot[] = [];

    for (const event of events) {
        if (targetBatsmanId && event.batsmanId !== targetBatsmanId) continue;
        if (!event.wagonWheel) continue; // Skip events without manual wagon wheel taps

        let runValue = 0;
        let isBoundary = false;

        if (event.type === "RUN") {
            runValue = event.runs;
            isBoundary = (event.runs === 4 || event.runs === 6);
        } else if (event.type === "EXTRA" && event.extraType === "NO_BALL") {
            runValue = event.runsOffBat || 0;
            isBoundary = (runValue === 4 || runValue === 6);
        }

        if (runValue > 0 || isBoundary) {
            list.push({
                batsmanId: event.batsmanId,
                bowlerId: event.bowlerId || "unknown",
                runs: runValue,
                angle: event.wagonWheel.angle,
                distance: event.wagonWheel.distance,
                isBoundary,
                zone: getZoneFromAngle(event.wagonWheel.angle)
            });
        }
    }

    return list;
}
