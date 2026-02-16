import type { Response } from 'express';

interface ApiResponse<T> {
    success: true;
    data: T;
}

interface ApiErrorResponse {
    success: false;
    error: string;
    code?: string;
    details?: any;
}

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200) => {
    const response: ApiResponse<T> = {
        success: true,
        data,
    };
    return res.status(statusCode).json(response);
};

export const sendError = (
    res: Response,
    message: string,
    statusCode = 500,
    code?: string,
    details?: any
) => {
    const response: ApiErrorResponse = {
        success: false,
        error: message,
        details,
    };

    if (code) {
        response.code = code;
    }

    return res.status(statusCode).json(response);
};
