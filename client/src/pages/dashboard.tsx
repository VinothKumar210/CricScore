import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-context";
import type { CareerStats, Match, Team } from "@shared/schema";
import { useEffect } from 'react';

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, refetch: refetchStats } = useQuery<CareerStats>({
    queryKey: ["/api/stats"],
    enabled: !!user?.id,
  });

  const { data: recentMatches, refetch: refetchMatches } = useQuery<Match[]>({
    queryKey: ["/api/matches"],
    enabled: !!user?.id,
  });

  const { data: teams, refetch: refetchTeams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: !!user?.id,
  });

  const { data: invitations, refetch: refetchInvitations } = useQuery<any[]>({
    queryKey: ["/api/invitations"],
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (user) {
      refetchStats();
      refetchMatches();
      refetchTeams();
      refetchInvitations();
    }
  }, [user, refetchStats, refetchMatches, refetchTeams, refetchInvitations]);

  return (
    <div className="container-responsive content-spacing pb-24 sm:pb-8 min-h-screen min-h-dvh">
      <h1>Hello, {user?.profileName || user?.username || 'Champion'}!</h1>
    </div>
  );
}
