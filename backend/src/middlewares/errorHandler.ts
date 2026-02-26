// =============================================================================
// Centralized Error Handling Middleware
// =============================================================================
//
// Catches all errors thrown in route handlers and services.
// Formats them into a consistent JSON envelope:
//
//   {
//     "success": false,
//     "error": {
//       "code": "MATCH_NOT_FOUND",
//       "message": "Match not found",
//       "details": { "matchId": "abc123" },   // optional
//       "stack": "..."                         // development only
//     }
//   }
//
// =============================================================================

import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/response.js';

const isDev = process.env.NODE_ENV !== 'production';

export const errorHandler = (
    err: Error | AppError,
    _req: Request,
    res: Response,
    _next: NextFunction,
) => {
    // -----------------------------------------------------------------
    // 1. AppError — expected, operational errors (our own throws)
    // -----------------------------------------------------------------
    if (err instanceof AppError) {
        if (isDev) {
            console.error(`[AppError] ${err.code}:`, err.message, err.details ?? '');
        }

        return sendError(
            res,
            err.message,
            err.statusCode,
            err.code,
            err.details,
            isDev ? err.stack : undefined,
        );
    }

    // -----------------------------------------------------------------
    // 2. Prisma known errors (P2025 = not found, P2002 = unique constraint)
    // -----------------------------------------------------------------
    if (isPrismaError(err)) {
        const { statusCode, code, message } = mapPrismaError(err);

        if (isDev) {
            console.error(`[PrismaError] ${code}:`, err.message);
        }

        return sendError(res, message, statusCode, code, undefined, isDev ? err.stack : undefined);
    }

    // -----------------------------------------------------------------
    // 3. JSON parse errors (malformed request body)
    // -----------------------------------------------------------------
    if (err instanceof SyntaxError && 'body' in err) {
        return sendError(
            res,
            'Malformed JSON in request body',
            400,
            'INVALID_FORMAT',
            undefined,
            isDev ? err.stack : undefined,
        );
    }

    // -----------------------------------------------------------------
    // 4. Unknown / unexpected errors — these are bugs
    // -----------------------------------------------------------------
    console.error('[UnhandledError]', err);

    return sendError(
        res,
        isDev ? err.message : 'An unexpected error occurred',
        500,
        'INTERNAL_ERROR',
        undefined,
        isDev ? err.stack : undefined,
    );
};

// ---------------------------------------------------------------------------
// Prisma Error Helpers
// ---------------------------------------------------------------------------

interface PrismaClientError extends Error {
    code: string;
    meta?: Record<string, unknown>;
}

function isPrismaError(err: unknown): err is PrismaClientError {
    return (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        typeof (err as PrismaClientError).code === 'string' &&
        (err as PrismaClientError).code.startsWith('P')
    );
}

function mapPrismaError(err: PrismaClientError): {
    statusCode: number;
    code: string;
    message: string;
} {
    switch (err.code) {
        case 'P2025': // Record not found
            return { statusCode: 404, code: 'NOT_FOUND', message: 'Requested record not found' };

        case 'P2002': // Unique constraint violation
            return { statusCode: 409, code: 'DUPLICATE_ENTRY', message: 'A record with this value already exists' };

        case 'P2003': // Foreign key constraint
            return { statusCode: 400, code: 'INVALID_INPUT', message: 'Referenced record does not exist' };

        case 'P2014': // Required relation violation
            return { statusCode: 400, code: 'VALIDATION_FAILED', message: 'Required relation is missing' };

        default:
            return { statusCode: 500, code: 'DATABASE_ERROR', message: 'Database operation failed' };
    }
}
