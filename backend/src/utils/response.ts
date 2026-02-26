// =============================================================================
// Standardized API Response Helpers
// =============================================================================

import type { Response } from 'express';

// ---------------------------------------------------------------------------
// Response Types
// ---------------------------------------------------------------------------

interface SuccessResponse<T> {
    success: true;
    data: T;
}

interface PaginatedResponse<T> {
    success: true;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
        stack?: string; // dev only
    };
}

// ---------------------------------------------------------------------------
// Success Helpers
// ---------------------------------------------------------------------------

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200) => {
    const body: SuccessResponse<T> = {
        success: true,
        data,
    };
    return res.status(statusCode).json(body);
};

export const sendCreated = <T>(res: Response, data: T) => {
    return sendSuccess(res, data, 201);
};

export const sendNoContent = (res: Response) => {
    return res.status(204).end();
};

export const sendPaginated = <T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
) => {
    const body: PaginatedResponse<T> = {
        success: true,
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
    return res.status(200).json(body);
};

// ---------------------------------------------------------------------------
// Error Helper (used by error middleware — prefer throwing AppError directly)
// ---------------------------------------------------------------------------

export const sendError = (
    res: Response,
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: Record<string, unknown>,
    stack?: string,
) => {
    const body: ErrorResponse = {
        success: false,
        error: {
            code,
            message,
            ...(details && { details }),
            ...(stack && { stack }),
        },
    };
    return res.status(statusCode).json(body);
};
