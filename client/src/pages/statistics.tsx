import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Target, Hand, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useEffect } from 'react';
import { useAuth } from "@/components/auth/auth-context";
import type { CareerStats, Match } from "@shared/schema";

export default function Statistics() {
  const { user } = useAuth();
  
  const { data: stats, isLoading, refetch: refetchStats } = useQuery<CareerStats>({
    queryKey: ["/api/stats"],
  });

  const { data: matches, isLoading: matchesLoading, refetch: refetchMatches } = useQuery<Match[]>({
    queryKey: ["/api/matches"],
  });

  // Refresh statistics data when user changes or statistics page mounts
  useEffect(() => {
    if (user) {
      // Ensure fresh data from database on statistics page load
      refetchStats();
      refetchMatches();
    }
  }, [user, refetchStats, refetchMatches]);

  if (isLoading || matchesLoading) {
    return (
      <div className="container-mobile">
        <div className="animate-pulse space-mobile-lg">
          <div className="h-6 sm:h-8 bg-muted rounded w-1/3"></div>
          <div className="grid-mobile-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-mobile space-mobile-lg">
      <div className="mobile-stack">
        <h2 className="text-mobile-h1" data-testid="title-statistics">
          Career Statistics
        </h2>
        <div className="text-mobile-caption text-right sm:text-left" data-testid="text-last-updated">
          Last updated: {stats?.updatedAt ? new Date(stats.updatedAt).toLocaleDateString() : "Never"}
        </div>
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid-mobile-3">
        {/* Batting Statistics */}
        <Card className="card-mobile stagger-mobile">
          <CardHeader>
            <CardTitle className="flex items-center text-mobile-h3">
              <BarChart3 className="text-green-600 mr-2 w-5 h-5 sm:w-6 sm:h-6" />
              Batting Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Runs</span>
                <span className="font-semibold text-foreground" data-testid="stat-total-runs">
                  {stats?.totalRuns || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balls Faced</span>
                <span className="font-semibold text-foreground" data-testid="stat-balls-faced">
                  {stats?.ballsFaced || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Strike Rate</span>
                <span className="font-semibold text-foreground" data-testid="stat-strike-rate">
                  {stats?.strikeRate || "0.00"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Matches Played</span>
                <span className="font-semibold text-foreground" data-testid="stat-matches-played">
                  {stats?.matchesPlayed || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bowling Statistics */}
        <Card className="card-mobile stagger-mobile">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="text-red-600 mr-2" />
              Bowling Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overs Bowled</span>
                <span className="font-semibold text-foreground" data-testid="stat-overs-bowled">
                  {stats?.oversBowled || "0.0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Runs Conceded</span>
                <span className="font-semibold text-foreground" data-testid="stat-runs-conceded">
                  {stats?.runsConceded || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wickets Taken</span>
                <span className="font-semibold text-foreground" data-testid="stat-wickets-taken">
                  {stats?.wicketsTaken || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Economy Rate</span>
                <span className="font-semibold text-foreground" data-testid="stat-economy-rate">
                  {stats?.economy || "0.00"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fielding Statistics */}
        <Card className="card-mobile stagger-mobile">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Hand className="text-blue-600 mr-2" />
              Fielding Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Catches Taken</span>
                <span className="font-semibold text-foreground" data-testid="stat-catches-taken">
                  {stats?.catchesTaken || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Run Outs</span>
                <span className="font-semibold text-foreground">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stumpings</span>
                <span className="font-semibold text-foreground">0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
