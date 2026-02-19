import type { BallEvent } from "../../types/ballEventTypes";

export function isLegalDelivery(event: BallEvent): boolean {
    if (event.type === "EXTRA") {
        return event.extraType === "BYE" || event.extraType === "LEG_BYE";
    }
    // RUN and WICKET are legal deliveries (consumes a ball)
    return true;
}
