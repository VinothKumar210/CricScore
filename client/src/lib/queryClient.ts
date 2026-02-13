import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { authService } from "./auth";

// Base URL for API requests. 
// In production (Vercel), this should be the Render backend URL.
// In development, it falls back to empty string (relative path, proxied by Vite)
const BASE_URL = import.meta.env.VITE_API_URL || "";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorData;
    try {
      errorData = await res.json();
    } catch {
      errorData = { message: res.statusText };
    }

    // If the error has field-specific information, preserve it
    if (errorData.field && errorData.message) {
      const error = new Error(errorData.message) as Error & { field?: string };
      error.field = errorData.field;
      throw error;
    }

    // Otherwise, throw a regular error
    const text = errorData.message || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  // Add Authorization header if token exists
  const token = authService.getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const headers: Record<string, string> = {};

      // Add Authorization header if token exists
      const token = authService.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const url = queryKey.join("/");
      // If url starts with /, append BASE_URL. If not, assume it's absolute or handled elsewhere (but usually api routes start with /)
      const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;

      const res = await fetch(fullUrl, {
        headers,
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Utility function to refresh user statistics data
 * This invalidates and refetches statistics and matches data from the API
 */
export const refreshUserStatistics = async (userId?: string): Promise<void> => {
  if (!userId) {
    // Clear all cached queries if no specific user
    await queryClient.clear();
    return;
  }

  // Invalidate and force refetch statistics and matches data for specific user
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["/api/stats", userId],
      refetchType: 'active'
    }),
    queryClient.invalidateQueries({
      queryKey: ["/api/matches", userId],
      refetchType: 'active'
    }),
    queryClient.invalidateQueries({
      queryKey: ["/api/teams"],
      refetchType: 'active'
    }),
    queryClient.invalidateQueries({
      queryKey: ["/api/invitations"],
      refetchType: 'active'
    })
  ]);

  // Force refetch of statistics data to ensure fresh data from database
  await Promise.all([
    queryClient.refetchQueries({ queryKey: ["/api/stats", userId] }),
    queryClient.refetchQueries({ queryKey: ["/api/matches", userId] }),
    queryClient.refetchQueries({ queryKey: ["/api/teams"] }),
    queryClient.refetchQueries({ queryKey: ["/api/invitations"] })
  ]);
};
