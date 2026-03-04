import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
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
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
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
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
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
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
    },
    delete: async (url: string) => {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'DELETE',
            headers: await getAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
    }
};
