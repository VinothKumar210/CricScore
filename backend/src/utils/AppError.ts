// =============================================================================
// AppError — Structured application error with code + status mapping
// =============================================================================

/**
 * Error codes used across the entire application.
 * Each code maps to an HTTP status and a default message.
 *
 * Usage:   throw new AppError('MATCH_NOT_FOUND')
 *          throw new AppError('VALIDATION_FAILED', 'Overs must be positive')
 *          throw new AppError('UNAUTHORIZED', undefined, { requiredRole: 'CAPTAIN' })
 */

// ---------------------------------------------------------------------------
// Error Code Registry
// ---------------------------------------------------------------------------

interface ErrorDef {
    status: number;
    message: string;
}

export const ERROR_CODES = {

    // --- Authentication & Authorization (401/403) ---
    UNAUTHORIZED: { status: 401, message: 'Authentication required' },
    TOKEN_EXPIRED: { status: 401, message: 'Token has expired' },
    TOKEN_INVALID: { status: 401, message: 'Invalid authentication token' },
    FORBIDDEN: { status: 403, message: 'You do not have permission to perform this action' },
    INSUFFICIENT_ROLE: { status: 403, message: 'Insufficient role for this action' },

    // --- Validation (400) ---
    VALIDATION_FAILED: { status: 400, message: 'Request validation failed' },
    INVALID_INPUT: { status: 400, message: 'Invalid input provided' },
    MISSING_FIELD: { status: 400, message: 'Required field is missing' },
    INVALID_FORMAT: { status: 400, message: 'Invalid data format' },

    // --- Not Found (404) ---
    NOT_FOUND: { status: 404, message: 'Resource not found' },
    USER_NOT_FOUND: { status: 404, message: 'User not found' },
    TEAM_NOT_FOUND: { status: 404, message: 'Team not found' },
    MATCH_NOT_FOUND: { status: 404, message: 'Match not found' },
    TOURNAMENT_NOT_FOUND: { status: 404, message: 'Tournament not found' },
    INVITE_NOT_FOUND: { status: 404, message: 'Invite not found' },
    GROUND_NOT_FOUND: { status: 404, message: 'Ground not found' },

    // --- Conflict / Business Logic (409) ---
    CONFLICT: { status: 409, message: 'Resource already exists' },
    DUPLICATE_ENTRY: { status: 409, message: 'Duplicate entry' },
    ALREADY_MEMBER: { status: 409, message: 'User is already a member' },
    MATCH_ALREADY_LIVE: { status: 409, message: 'Match is already live' },
    MATCH_ALREADY_COMPLETED: { status: 409, message: 'Match is already completed' },
    INVITE_ALREADY_HANDLED: { status: 409, message: 'Invite has already been accepted or rejected' },

    // --- Rate Limiting (429) ---
    RATE_LIMITED: { status: 429, message: 'Too many requests, please try again later' },

    // --- Server Errors (500) ---
    INTERNAL_ERROR: { status: 500, message: 'An unexpected error occurred' },
    DATABASE_ERROR: { status: 500, message: 'Database operation failed' },
    EXTERNAL_SERVICE_ERROR: { status: 502, message: 'External service unavailable' },

} as const satisfies Record<string, ErrorDef>;

export type ErrorCode = keyof typeof ERROR_CODES;

// ---------------------------------------------------------------------------
// AppError Class
// ---------------------------------------------------------------------------

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: ErrorCode;
    public readonly details: Record<string, unknown> | undefined;
    public readonly isOperational: boolean;

    /**
     * @param code     - A key from ERROR_CODES (e.g., 'MATCH_NOT_FOUND')
     * @param message  - Optional override for the default message
     * @param details  - Optional structured context (field errors, IDs, etc.)
     */
    constructor(
        code: ErrorCode,
        message?: string,
        details?: Record<string, unknown>,
    ) {
        const def = ERROR_CODES[code];
        super(message || def.message);

        this.code = code;
        this.statusCode = def.status;
        this.details = details;
        this.isOperational = true; // distinguishes expected errors from crashes

        // Maintain proper stack trace
        Error.captureStackTrace(this, this.constructor);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
