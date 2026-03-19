import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Structured API error with parsed JSON body.
 * Replaces the generic `Error("HTTP error 500")` so that
 * callers can read `err.data.message`, `err.status`, etc.
 */
export class ApiError extends Error {
    status: number;
    code: string;
    data: any;

    constructor(status: number, body: any) {
        super(body?.message || `HTTP error ${status}`);
        this.name = 'ApiError';
        this.status = status;
        this.code = body?.code || 'UNKNOWN';
        this.data = body;
    }
}

/**
 * Get auth headers. Prefers fresh Firebase token (auto-refreshes),
 * falls back to localStorage token for scenarios where Firebase
 * hasn't initialized yet.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
    let token: string | null = null;

    // Try getting fresh token from Firebase (auto-refreshes if expired)
    if (auth.currentUser) {
        try {
            token = await auth.currentUser.getIdToken();
            localStorage.setItem('authToken', token);
        } catch {
            token = localStorage.getItem('authToken');
        }
    } else {
        token = localStorage.getItem('authToken');
    }

    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

/**
 * Throw an ApiError with parsed JSON body from the response.
 */
async function throwApiError(res: Response): Promise<never> {
    let body: any = {};
    try {
        body = await res.json();
    } catch {
        body = { message: res.statusText || `HTTP error ${res.status}` };
    }
    throw new ApiError(res.status, body);
}

interface ApiOptions {
    params?: Record<string, any>;
}

export const api = {
    get: async (url: string, options?: ApiOptions) => {
        let finalUrl = `${API_BASE}${url}`;
        if (options?.params) {
            const searchParams = new URLSearchParams();
            Object.entries(options.params).forEach(([k, v]) => {
                if (v !== undefined && v !== null) {
                    searchParams.append(k, String(v));
                }
            });
            const qs = searchParams.toString();
            if (qs) finalUrl += `?${qs}`;
        }

        const res = await fetch(finalUrl, { headers: await getAuthHeaders() });
        if (!res.ok) await throwApiError(res);
        return res.json();
    },
    post: async (url: string, data?: any) => {
        const isFormData = data instanceof FormData;
        const headers = await getAuthHeaders();
        if (isFormData) delete headers['Content-Type'];

        const res = await fetch(`${API_BASE}${url}`, {
            method: 'POST',
            headers,
            body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
        });
        if (!res.ok) await throwApiError(res);
        return res.json();
    },
    put: async (url: string, data?: any) => {
        const isFormData = data instanceof FormData;
        const headers = await getAuthHeaders();
        if (isFormData) delete headers['Content-Type'];

        const res = await fetch(`${API_BASE}${url}`, {
            method: 'PUT',
            headers,
            body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
        });
        if (!res.ok) await throwApiError(res);
        return res.json();
    },
    patch: async (url: string, data?: any) => {
        const isFormData = data instanceof FormData;
        const headers = await getAuthHeaders();
        if (isFormData) delete headers['Content-Type'];

        const res = await fetch(`${API_BASE}${url}`, {
            method: 'PATCH',
            headers,
            body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
        });
        if (!res.ok) await throwApiError(res);
        return res.json();
    },
    delete: async (url: string) => {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'DELETE',
            headers: await getAuthHeaders(),
        });
        if (!res.ok) await throwApiError(res);
        return res.json();
    }
};
