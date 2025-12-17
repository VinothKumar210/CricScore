import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-context";
import { useEffect } from 'react';
import type { CareerStats, Match, Team } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, refetch: refetchStats } = useQuery<CareerStats>({
    queryKey: ["/api/stats"],
    enabled: !!user?.id,
  });

  useEffect(() => { if(user) refetchStats(); }, [user, refetchStats]);

  return (
    <div className="container-responsive content-spacing pb-24 sm:pb-8 min-h-screen min-h-dvh">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-blue-500 to-primary rounded-3xl p-6 sm:p-8 text-primary-foreground shadow-2xl mb-6">
        <div className="relative z-10">
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 mb-3">
              <div className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
              <span className="text-xs sm:text-sm font-semibold">Welcome Back</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2 tracking-tight drop-shadow-lg">
              Hey, {user?.profileName || user?.username || 'Champion'}!
            </h2>
            <p className="text-base sm:text-lg opacity-95 font-medium">Ready to play cricket?</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl opacity-50"></div>
      </div>
    </div>
  );
}
