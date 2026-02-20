/**
 * deterministicAssertions.ts
 * Pure TS equality checkers without external deps.
 */

export function assertDeepEqual(a: unknown, b: unknown, path: string = "root"): boolean {
    if (a === b) return true;

    if (a === null && b === null) return true;
    if (a === undefined && b === undefined) return true;

    if (a === null || b === null || a === undefined || b === undefined) {
        console.error(`Assertion failed at ${path}: Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
        return false;
    }

    if (typeof a !== typeof b) {
        console.error(`Assertion failed at ${path}: Type mismatch ${typeof a} vs ${typeof b}`);
        return false;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            console.error(`Assertion failed at ${path}: Array length mismatch ${a.length} vs ${b.length}`);
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (!assertDeepEqual(a[i], b[i], `${path}[${i}]`)) return false;
        }
        return true;
    }

    if (typeof a === "object" && typeof b === "object") {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) {
            console.error(`Assertion failed at ${path}: Key length mismatch ${keysA.length} vs ${keysB.length}`);
            return false;
        }

        for (const key of keysA) {
            if (!keysB.includes(key)) {
                console.error(`Assertion failed at ${path}: Missing key '${key}' in second object`);
                return false;
            }
            if (!assertDeepEqual((a as any)[key], (b as any)[key], `${path}.${key}`)) {
                return false;
            }
        }
        return true;
    }

    console.error(`Assertion failed at ${path}: Primitive mismatch ${a} !== ${b}`);
    return false;
}
