import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Target, Hand, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import type { CareerStats, Match } from "@shared/schema";

export default function Statistics() {
  const { data: stats, isLoading } = useQuery<CareerStats>({
    queryKey: ["/api/stats"],
  });

  const { data: matches, isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: ["/api/matches"],
  });

  if (isLoading || matchesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground" data-testid="title-statistics">
          Career Statistics
        </h2>
        <div className="text-sm text-muted-foreground" data-testid="text-last-updated">
          Last updated: {stats?.updatedAt ? new Date(stats.updatedAt).toLocaleDateString() : "Never"}
        </div>
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batting Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="text-green-600 mr-2" />
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
        <Card>
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
        <Card>
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

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trend - Last {matches && matches.length > 0 ? Math.min(matches.length, 15) : 0} Matches</CardTitle>
        </CardHeader>
        <CardContent>
          {matches && matches.length > 0 ? (
            <div className="space-y-6">
              {/* Show matches count info */}
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {matches.length < 15 
                    ? `Showing all ${matches.length} matches played`
                    : "Showing last 15 matches"
                  }
                </p>
              </div>
              
              {/* Batting Performance Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Batting Performance</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={matches.slice(0, 15).reverse().map((match, index) => ({
                    match: index + 1,
                    runs: match.runsScored,
                    strikeRate: match.ballsFaced > 0 ? ((match.runsScored / match.ballsFaced) * 100).toFixed(1) : 0,
                    opponent: match.opponent
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="match" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'runs' ? `${value} runs` : `${value}%`,
                        name === 'runs' ? 'Runs Scored' : 'Strike Rate'
                      ]}
                      labelFormatter={(label) => `Match ${label}`}
                    />
                    <Line type="monotone" dataKey="runs" stroke="#22c55e" strokeWidth={2} name="runs" />
                    <Line type="monotone" dataKey="strikeRate" stroke="#3b82f6" strokeWidth={2} name="strikeRate" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Bowling Performance Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Bowling Performance</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={matches.slice(0, 15).reverse().map((match, index) => ({
                    match: index + 1,
                    wickets: match.wicketsTaken,
                    economy: match.oversBowled > 0 ? (match.runsConceded / match.oversBowled).toFixed(1) : 0,
                    opponent: match.opponent
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="match" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'wickets' ? `${value} wickets` : `${value} economy`,
                        name === 'wickets' ? 'Wickets Taken' : 'Economy Rate'
                      ]}
                      labelFormatter={(label) => `Match ${label}`}
                    />
                    <Bar dataKey="wickets" fill="#ef4444" name="wickets" />
                    <Bar dataKey="economy" fill="#f59e0b" name="economy" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  No matches played yet. Add your first match to see performance trends!
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
