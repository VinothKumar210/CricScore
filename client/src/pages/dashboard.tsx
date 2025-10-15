import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useAuth } from "@/components/auth/auth-context";
import { Gamepad, TrendingUp, Zap, Target, Users, Crown, Activity, ArrowUpRight, Sparkles } from "lucide-react";
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
    <div className="p-6 space-y-8 pb-24 min-h-screen">
      {/* Welcome Section - Enhanced */}
      <div className="relative overflow-hidden gradient-primary rounded-2xl p-8 text-primary-foreground shadow-modern">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-3 tracking-tight" data-testid="text-welcome">
                Game on, {user?.profileName || user?.username || 'Champion'}! 
              </h2>
              <p className="text-lg opacity-90 font-medium">Time to smash some records and track your cricket journey!</p>
            </div>
            <div className="hidden md:flex items-center space-x-2">
              <Sparkles className="w-8 h-8 text-yellow-300 float-animation" />
            </div>
          </div>
          <div className="flex items-center space-x-4 mt-6">
            <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Level Up Your Game</span>
            </div>
          </div>
        </div>
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl opacity-50 animate-pulse"></div>
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <Card className="glassmorphism border-0 group relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2 tracking-wide uppercase">
                  Matches Played
                </p>
                <p className="text-3xl font-bold text-foreground mb-1 tracking-tight" data-testid="text-matches-played">
                  {stats?.matchesPlayed || 0}
                </p>
                <div className="flex items-center space-x-1 text-xs">
                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                  <span className="text-green-600 font-medium">Active</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-sky-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Gamepad className="text-white h-7 w-7" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-sky-500 rounded-b-lg"></div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-0 group relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2 tracking-wide uppercase">
                  Total Runs
                </p>
                <p className="text-3xl font-bold text-foreground mb-1 tracking-tight" data-testid="text-total-runs">
                  {stats?.totalRuns || 0}
                </p>
                <div className="flex items-center space-x-1 text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-600 font-medium">Scoring</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="text-white h-7 w-7" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-b-lg"></div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-0 group relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2 tracking-wide uppercase">
                  Strike Rate
                </p>
                <p className="text-3xl font-bold text-foreground mb-1 tracking-tight" data-testid="text-strike-rate">
                  {stats?.strikeRate || "0.00"}
                </p>
                <div className="flex items-center space-x-1 text-xs">
                  <Zap className="w-3 h-3 text-orange-500" />
                  <span className="text-orange-600 font-medium">Power</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Zap className="text-white h-7 w-7" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-b-lg"></div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-0 group relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2 tracking-wide uppercase">
                  Wickets Taken
                </p>
                <p className="text-3xl font-bold text-foreground mb-1 tracking-tight" data-testid="text-wickets">
                  {stats?.wicketsTaken || 0}
                </p>
                <div className="flex items-center space-x-1 text-xs">
                  <Target className="w-3 h-3 text-red-500" />
                  <span className="text-red-600 font-medium">Precision</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Target className="text-white h-7 w-7" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600 rounded-b-lg"></div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-0 group relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2 tracking-wide uppercase">
                  Economy Rate
                </p>
                <p className="text-3xl font-bold text-foreground mb-1 tracking-tight" data-testid="text-economy">
                  {stats?.economy || "0.00"}
                </p>
                <div className="flex items-center space-x-1 text-xs">
                  <Activity className="w-3 h-3 text-blue-500" />
                  <span className="text-blue-600 font-medium">Control</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Activity className="text-white h-7 w-7" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-b-lg"></div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Teams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Matches */}
        <Card className="glassmorphism border-0 group">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-foreground flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span>Recent Matches</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMatches && recentMatches.length > 0 ? (
                recentMatches.slice(0, 3).map((match: Match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm rounded-xl border border-white/10 hover:border-primary/30 transition-all duration-300 group"
                    data-testid={`match-${match.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-sky-500 rounded-lg flex items-center justify-center">
                        <Gamepad className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">vs {match.opponent}</p>
                        <p className="text-sm text-muted-foreground font-medium">
                          {new Date(match.matchDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground mb-1">
                        {match.runsScored} ({match.ballsFaced})
                      </p>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <p className="text-xs text-green-600 font-medium">Completed</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Gamepad className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium mb-2">No matches recorded yet</p>
                  <p className="text-sm text-muted-foreground/70">Your match history will appear here</p>
                </div>
              )}
            </div>
            <Button variant="ghost" asChild className="w-full mt-6 btn-modern group bg-gradient-to-r from-primary/5 to-sky-500/5 hover:from-primary/10 hover:to-sky-500/10 border border-primary/20 rounded-xl" data-testid="link-add-match">
              <Link href="/add-match" className="flex items-center justify-center space-x-2 font-medium">
                <span>Add New Match</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* My Teams */}
        <Card className="glassmorphism border-0 group">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-foreground flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span>My Teams</span>
              </div>
              {invitations && invitations.length > 0 && (
                <Badge variant="destructive" className="bg-gradient-to-r from-red-500 to-rose-600 border-0 shadow-lg" data-testid="badge-invitations">
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
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm rounded-xl border border-white/10 hover:border-emerald-500/30 transition-all duration-300 cursor-pointer group"
                      data-testid={`team-${team.id}`}
                    >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Users className="text-white h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground group-hover:text-emerald-600 transition-colors">{team.name}</p>
                        <p className="text-sm text-muted-foreground font-medium flex items-center space-x-1">
                          {team.captainId === user?.id ? (
                            <><Crown className="w-3 h-3 text-yellow-500" /><span>Captain</span></>
                          ) : (
                            <><Users className="w-3 h-3" /><span>Member</span></>
                          )}
                        </p>
                      </div>
                    </div>
                    {team.captainId === user?.id && (
                      <div className="flex items-center space-x-2">
                        <div className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-lg">
                          <Crown className="text-white h-4 w-4" />
                        </div>
                      </div>
                    )}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium mb-2">No teams joined yet</p>
                  <p className="text-sm text-muted-foreground/70">Join a team to start playing</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Floating Local Match Button */}
      <Button 
        asChild 
        className="fixed bottom-6 right-6 rounded-2xl px-6 py-4 shadow-modern hover:shadow-modern-hover transition-all duration-300 z-50 btn-modern bg-gradient-to-r from-primary to-sky-500 hover:from-primary-hover hover:to-sky-600 border-0 group" 
        data-testid="floating-local-match"
      >
        <Link href="/local-match" className="flex items-center space-x-3 text-white">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <Gamepad className="h-6 w-6" />
          </div>
          <div className="text-left">
            <div className="font-bold text-sm">Create Match</div>
            <div className="text-xs opacity-90">Start playing now</div>
          </div>
          <ArrowUpRight className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </Link>
      </Button>
    </div>
  );
}
