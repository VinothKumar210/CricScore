import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useAuth } from "@/components/auth/auth-context";
import { Gamepad, TrendingUp, Zap, Target, Users, Crown, Activity, ArrowUpRight, Sparkles, Eye, Lock, Play, BarChart3, Plus, Search } from "lucide-react";
import { useEffect } from 'react';
import type { CareerStats, Match, Team } from "@shared/schema";

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

  // Fetch ongoing live room matches
  const { data: liveMatches } = useQuery<any[]>({
    queryKey: ["/api/local-matches/ongoing"],
    enabled: !!user?.id,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Refresh all data when user changes or dashboard mounts
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
      {/* Welcome Section - Mobile First */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-blue-500 to-primary rounded-3xl p-6 sm:p-8 text-primary-foreground shadow-2xl mb-6">
        <div className="relative z-10">
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 mb-3">
              <div className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
              <span className="text-xs sm:text-sm font-semibold">Welcome Back</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2 tracking-tight drop-shadow-lg" data-testid="text-welcome">
              Hey, {user?.profileName || user?.username || 'Champion'}!
            </h2>
            <p className="text-base sm:text-lg opacity-95 font-medium">Ready to play cricket?</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl opacity-50"></div>
      </div>

      {/* Quick Actions - Large Touch Targets */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        <Button
          asChild
          className="h-24 sm:h-28 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 border-0"
          data-testid="button-create-match"
        >
          <Link href="/local-match" className="flex flex-col items-center justify-center gap-2 text-white">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Plus className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-sm sm:text-base font-bold">Create Match</span>
          </Link>
        </Button>

        <Button
          asChild
          className="h-24 sm:h-28 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 border-0"
          data-testid="button-live-rooms"
        >
          <Link href="/live-scoreboard" className="flex flex-col items-center justify-center gap-2 text-white">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Eye className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-sm sm:text-base font-bold">Live Rooms</span>
          </Link>
        </Button>

        <Button
          asChild
          className="h-24 sm:h-28 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-300 border-0"
          data-testid="button-my-stats"
        >
          <Link href="/statistics" className="flex flex-col items-center justify-center gap-2 text-white">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-sm sm:text-base font-bold">My Stats</span>
          </Link>
        </Button>

        <Button
          asChild
          className="h-24 sm:h-28 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 border-0"
          data-testid="button-find-players"
        >
          <Link href="/search" className="flex flex-col items-center justify-center gap-2 text-white">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Search className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-sm sm:text-base font-bold">Find Players</span>
          </Link>
        </Button>
      </div>

      {/* Live Room Matches Feed */}
      <Card className="mb-6 border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span>Live Match Rooms</span>
          </CardTitle>
          <CardDescription className="text-sm">Join and watch ongoing matches</CardDescription>
        </CardHeader>
        <CardContent>
          {liveMatches && liveMatches.length > 0 ? (
            <div className="space-y-3">
              {liveMatches.slice(0, 3).map((match: any) => (
                <Link key={match.id} href={`/live-scoreboard?matchId=${match.id}`}>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-background/50 to-background/30 rounded-xl border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer min-h-[60px]">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate text-sm sm:text-base">
                          {match.matchName || `${match.myTeamName} vs ${match.opponentTeamName}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1 animate-pulse"></div>
                            LIVE
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {match.isRoomMatch && <Lock className="w-3 h-3" />}
                            <Eye className="w-3 h-3" />
                            <span>{match.spectators?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                  </div>
                </Link>
              ))}
              {liveMatches.length > 3 && (
                <Button
                  asChild
                  variant="ghost"
                  className="w-full rounded-xl border border-border hover:border-primary/50 h-12"
                  data-testid="button-view-all-rooms"
                >
                  <Link href="/live-scoreboard" className="flex items-center justify-center gap-2">
                    <span className="font-semibold">View All Rooms</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Eye className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">No live matches</p>
              <p className="text-xs text-muted-foreground/70">Create a match to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Stats - Mobile Optimized */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-500 rounded-xl flex items-center justify-center">
                  <Gamepad className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-foreground" data-testid="text-matches-played">
                    {stats?.matchesPlayed || 0}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Matches</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-foreground" data-testid="text-total-runs">
                    {stats?.totalRuns || 0}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Runs</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-foreground" data-testid="text-strike-rate">
                    {stats?.strikeRate ? Number(stats.strikeRate).toFixed(1) : "0.0"}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Strike Rate</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-foreground" data-testid="text-wickets">
                    {stats?.wicketsTaken || 0}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Wickets</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teams Section */}
      <Card className="mb-6 border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              <span>My Teams</span>
            </CardTitle>
            {invitations && invitations.length > 0 && (
              <Badge variant="destructive" className="bg-gradient-to-r from-red-500 to-rose-600" data-testid="badge-invitations">
                {invitations.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {teams && teams.length > 0 ? (
            <div className="space-y-3">
              {teams.slice(0, 3).map((team: Team) => (
                <Link 
                  key={team.id} 
                  href={`/teams/${team.id}`}
                  onClick={() => sessionStorage.setItem("teamDetailReferrer", "/dashboard")}
                >
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-background/50 to-background/30 rounded-xl border border-border hover:border-emerald-500/50 transition-all duration-300 cursor-pointer min-h-[60px]" data-testid={`team-${team.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm sm:text-base">{team.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {team.captainId === user?.id && <Crown className="w-3 h-3 text-yellow-500" />}
                          <span>{team.captainId === user?.id ? 'Captain' : 'Member'}</span>
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">No teams yet</p>
              <p className="text-xs text-muted-foreground/70">Join or create a team to play together</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
