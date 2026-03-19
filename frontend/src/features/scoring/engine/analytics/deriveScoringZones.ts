import type { BallEvent } from "../../types/ballEventTypes";
import { deriveWagonWheelData, type ScoringZone } from "./deriveWagonWheelData";

export interface ZoneAggregate {
    zone: ScoringZone;
    runs: number;
    balls: number;
    boundaries: number;
}

export function deriveScoringZones(events: BallEvent[], targetBatsmanId?: string): Record<ScoringZone, ZoneAggregate> {
    const shots = deriveWagonWheelData(events, targetBatsmanId);

    const zones: Record<ScoringZone, ZoneAggregate> = {
        "THIRD_MAN": { zone: "THIRD_MAN", runs: 0, balls: 0, boundaries: 0 },
        "POINT": { zone: "POINT", runs: 0, balls: 0, boundaries: 0 },
        "COVERS": { zone: "COVERS", runs: 0, balls: 0, boundaries: 0 },
        "EXTRA_COVER": { zone: "EXTRA_COVER", runs: 0, balls: 0, boundaries: 0 },
        "LONG_OFF": { zone: "LONG_OFF", runs: 0, balls: 0, boundaries: 0 },
        "LONG_ON": { zone: "LONG_ON", runs: 0, balls: 0, boundaries: 0 },
        "MID_WICKET": { zone: "MID_WICKET", runs: 0, balls: 0, boundaries: 0 },
        "SQUARE_LEG": { zone: "SQUARE_LEG", runs: 0, balls: 0, boundaries: 0 },
        "FINE_LEG": { zone: "FINE_LEG", runs: 0, balls: 0, boundaries: 0 }
    };

    for (const shot of shots) {
        const zoneData = zones[shot.zone];
        if (zoneData) {
            zoneData.runs += shot.runs;
            zoneData.balls += 1;
            if (shot.isBoundary) {
                zoneData.boundaries += 1;
            }
        }
    }

    return zones;
}
