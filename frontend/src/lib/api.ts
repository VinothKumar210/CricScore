const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
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

        const res = await fetch(finalUrl, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
    },
    post: async (url: string, data?: any) => {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: data ? JSON.stringify(data) : undefined,
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
    },
    put: async (url: string, data?: any) => {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: data ? JSON.stringify(data) : undefined,
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
    },
    patch: async (url: string, data?: any) => {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: data ? JSON.stringify(data) : undefined,
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
    },
    delete: async (url: string) => {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
    }
};
