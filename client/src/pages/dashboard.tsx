import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useAuth } from "@/components/auth/auth-context";
import { Gamepad, TrendingUp, Zap, Target, Users, Crown } from "lucide-react";
import { useEffect } from 'react';
import { refreshUserStatistics } from "@/lib/queryClient";
import type { CareerStats, Match, Team } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, refetch: refetchStats } = useQuery<CareerStats>({
    queryKey: ["/api/stats"],
  });

  const { data: recentMatches, refetch: refetchMatches } = useQuery<Match[]>({
    queryKey: ["/api/matches"],
  });

  const { data: teams, refetch: refetchTeams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: invitations, refetch: refetchInvitations } = useQuery<any[]>({
    queryKey: ["/api/invitations"],
  });

  // Refresh all data when user changes or dashboard mounts
  useEffect(() => {
    if (user) {
      // Ensure fresh data from database on dashboard load
      refetchStats();
      refetchMatches();
      refetchTeams();
      refetchInvitations();
    }
  }, [user, refetchStats, refetchMatches, refetchTeams, refetchInvitations]);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-sky-400 rounded-xl p-6 text-primary-foreground">
        <h2 className="text-2xl font-bold mb-2" data-testid="text-welcome">
          Welcome back, {user?.username || 'Player'}!
        </h2>
        <p className="opacity-90">Ready to update your cricket statistics?</p>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Matches Played</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-matches-played">
                  {stats?.matchesPlayed || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Gamepad className="text-primary h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Runs</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-runs">
                  {stats?.totalRuns || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="text-green-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Strike Rate</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-strike-rate">
                  {stats?.strikeRate || "0.00"}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Zap className="text-orange-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Wickets Taken</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-wickets">
                  {stats?.wicketsTaken || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Target className="text-red-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Teams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Matches */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMatches && recentMatches.length > 0 ? (
                recentMatches.slice(0, 3).map((match: Match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    data-testid={`match-${match.id}`}
                  >
                    <div>
                      <p className="font-medium text-foreground">vs {match.opponent}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(match.matchDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {match.runsScored} ({match.ballsFaced})
                      </p>
                      <p className="text-xs text-green-600">Match completed</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No matches recorded yet
                </div>
              )}
            </div>
            <Button variant="link" asChild className="w-full mt-4" data-testid="link-add-match">
              <Link href="/add-match">Add Match →</Link>
            </Button>
          </CardContent>
        </Card>

        {/* My Teams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              My Teams
              {invitations && invitations.length > 0 && (
                <Badge variant="destructive" data-testid="badge-invitations">
                  {invitations.length} pending
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teams && teams.length > 0 ? (
                teams.slice(0, 3).map((team: Team) => (
                  <Link 
                    key={team.id} 
                    href={`/teams/${team.id}`}
                    onClick={() => sessionStorage.setItem("teamDetailReferrer", "/dashboard")}
                  >
                    <div
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                      data-testid={`team-${team.id}`}
                    >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <Users className="text-primary-foreground text-sm" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{team.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {team.captainId === user?.id ? "Captain" : "Member"}
                        </p>
                      </div>
                    </div>
                    {team.captainId === user?.id && (
                      <Crown className="text-yellow-500 h-5 w-5" />
                    )}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No teams joined yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Floating Local Match Button */}
      <Button 
        asChild 
        className="fixed bottom-6 right-6 rounded-full w-16 h-16 shadow-lg hover:shadow-xl transition-shadow z-50" 
        data-testid="floating-local-match"
      >
        <Link href="/local-match">
          <Gamepad className="h-6 w-6" />
        </Link>
      </Button>
    </div>
  );
}
