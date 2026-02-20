/**
 * Converts cricket overs (e.g., 18.3 or "18.3") to standard decimal notation (18.5)
 * for NRR calculations.
 *
 * Rules:
 * - 1 ball = 1/6 over (~0.1666...)
 * - 3 balls = 3/6 over = 0.5
 * - A value like 18.5 is fundamentally invalid if treated literally as 5 balls decimal unless handled carefully.
 *   Here, we expect the input `.5` to mean 5 balls, not 0.5 overs.
 *
 * @param overs Number or string representing overs (e.g. 18.3)
 * @returns Decimal representation of overs (e.g., 18.5)
 */
export function convertOversToDecimal(overs: number | string): number {
    const oversStr = overs.toString();
    const parts = oversStr.split(".");

    if (parts.length === 1) {
        const fullOvers = parseInt(parts[0], 10);
        if (fullOvers < 0 || isNaN(fullOvers)) throw new Error(`Invalid overs format: ${oversStr}`);
        return fullOvers;
    }

    if (parts.length > 2) {
        throw new Error(`Invalid overs format: ${oversStr}`);
    }

    const fullOvers = parseInt(parts[0], 10);
    const balls = parseInt(parts[1], 10);

    if (fullOvers < 0 || isNaN(fullOvers)) throw new Error(`Invalid full overs: ${oversStr}`);
    if (balls < 0 || balls > 5 || isNaN(balls)) throw new Error(`Invalid balls in over (must be 0-5): ${oversStr}`);

    return fullOvers + (balls / 6);
}
