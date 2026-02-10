import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-context";

interface LocalPlayer {
  name: string;
  username?: string;      // For registered users - unique username
  guestCode?: string;     // For guest players - 5-char code
  isCaptain?: boolean;
  isWicketKeeper?: boolean;
}

interface Fixture {
  id: string;
  teamAId?: string | null;
  teamAName: string;
  teamALogo?: string | null;
  teamAPlayers: LocalPlayer[];
  teamBId?: string | null;
  teamBName: string;
  teamBLogo?: string | null;
  teamBPlayers: LocalPlayer[];
  overs: number;
  venue?: string | null;
  createdAt: string;
}

interface CachedFixtures {
  userId: string;
  data: Fixture[];
  timestamp: number;
}

const CACHE_KEY = "fixtures_cache";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function getCachedFixtures(userId: string): Fixture[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedFixtures = JSON.parse(cached);

    if (parsed.userId !== userId) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    if (Date.now() - parsed.timestamp > CACHE_MAX_AGE_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed.data;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function setCachedFixtures(userId: string, data: Fixture[]): void {
  try {
    const cached: CachedFixtures = {
      userId,
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
  }
}

export function clearFixturesCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

export function useFixturesCache() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryResult = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/fixtures", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch fixtures");
      }
      const data = await response.json();

      if (user?.id) {
        setCachedFixtures(user.id, data);
      }

      return data;
    },
    enabled: !!user,
    initialData: () => {
      if (user?.id) {
        return getCachedFixtures(user.id) ?? undefined;
      }
      return undefined;
    },
    initialDataUpdatedAt: () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed: CachedFixtures = JSON.parse(cached);
          return parsed.timestamp;
        }
      } catch { }
      return 0;
    },
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!user?.id) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CACHE_KEY && e.newValue) {
        try {
          const parsed: CachedFixtures = JSON.parse(e.newValue);
          if (parsed.userId === user.id) {
            queryClient.setQueryData(["/api/fixtures"], parsed.data);
          }
        } catch {
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user?.id, queryClient]);

  const updateCache = useCallback(
    (updater: (prev: Fixture[]) => Fixture[]) => {
      if (!user?.id) return;

      const currentData = queryClient.getQueryData<Fixture[]>(["/api/fixtures"]) ?? [];
      const newData = updater(currentData);

      queryClient.setQueryData(["/api/fixtures"], newData);
      setCachedFixtures(user.id, newData);
    },
    [user?.id, queryClient]
  );

  const deleteFixtureMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/fixtures/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to delete fixture");
      }
      return { id };
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/fixtures"] });
      const previousFixtures = queryClient.getQueryData<Fixture[]>(["/api/fixtures"]);

      updateCache((prev) => prev.filter((f) => f.id !== id));

      return { previousFixtures };
    },
    onError: (_err, _id, context) => {
      if (context?.previousFixtures && user?.id) {
        queryClient.setQueryData(["/api/fixtures"], context.previousFixtures);
        setCachedFixtures(user.id, context.previousFixtures);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fixtures"] });
    },
  });

  return {
    fixtures: queryResult.data ?? [],
    isLoading: queryResult.isLoading && !queryResult.data,
    isFetching: queryResult.isFetching,
    error: queryResult.error,
    deleteFixture: deleteFixtureMutation.mutate,
    isDeleting: deleteFixtureMutation.isPending,
    updateCache,
    refetch: queryResult.refetch,
  };
}
