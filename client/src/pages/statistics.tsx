import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Target, Hand, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { Link } from "wouter";
import type { CareerStats } from "@shared/schema";

export default function Statistics() {
  const { user } = useAuth();
  
  const { data: stats, isLoading, refetch: refetchStats } = useQuery<CareerStats>({
    queryKey: ["/api/stats"],
    enabled: !!user?.id,
  });


  // Calculate batting average
  const calculateBattingAverage = (totalRuns?: number, timesOut?: number) => {
    if (totalRuns && timesOut && timesOut > 0) {
      return (totalRuns / timesOut).toFixed(2);
    }
    return totalRuns && totalRuns > 0 ? 'Not Out' : '0.00';
  };

  // Get best bowling figures from stored career stats
  const getBestBowlingFigures = (stats: CareerStats | undefined) => {
    if (!stats) {
      return '0/0';
    }
    
    // Access the new fields safely - they might not be in types yet but will be in runtime data
    const bestWickets = (stats as any).bestBowlingWickets;
    const bestRuns = (stats as any).bestBowlingRuns;
    
    if (bestWickets == null || bestRuns == null) {
      return '0/0';
    }
    
    // If no wickets have been taken, show 0/0
    if (bestWickets === 0) {
      return '0/0';
    }
    
    return `${bestWickets}/${bestRuns}`;
  };

  if (isLoading) {
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
      {/* Page Header */}
      <div className="mobile-stack">
        <h2 className="text-mobile-h1" data-testid="title-statistics">
          Career Statistics
        </h2>
        <div className="text-mobile-caption text-right sm:text-left" data-testid="text-last-updated">
          Last updated: {stats?.updatedAt ? new Date(stats.updatedAt).toLocaleDateString() : "Never"}
        </div>
      </div>
      
      {/* Back Button */}
      <div className="mt-4 mb-6">
        <Link href="/dashboard">
          <button className="flex items-center gap-2 px-4 py-2 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors" data-testid="button-back-dashboard">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </Link>
      </div>

      {/* Key Performance Metrics */}
      <div className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-300" data-testid="stat-matches-played">
                  {stats?.matchesPlayed || 0}
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400">Matches Played</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300" data-testid="stat-total-runs">
                  {stats?.totalRuns || 0}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Total Runs</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300" data-testid="stat-batting-average">
                  {calculateBattingAverage(stats?.totalRuns, stats?.timesOut)}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Batting Average</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300" data-testid="stat-wickets-taken">
                  {stats?.wicketsTaken || 0}
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-400">Wickets Taken</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-700 dark:text-red-300" data-testid="stat-economy-rate">
                  {stats?.economy ? stats.economy.toFixed(2) : "0.00"}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">Economy Rate</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300" data-testid="stat-man-of-match">
                  {stats?.manOfTheMatchAwards || 0}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">Man of the Match</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batting Statistics */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <BarChart3 className="text-green-600 mr-2 w-5 h-5" />
              Batting Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Total Runs</span>
                <span className="font-bold text-lg" data-testid="stat-total-runs-detailed">
                  {stats?.totalRuns || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Batting Average</span>
                <span className="font-bold text-lg" data-testid="stat-batting-average-detailed">
                  {calculateBattingAverage(stats?.totalRuns, stats?.timesOut)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Highest Score</span>
                <span className="font-bold text-lg" data-testid="stat-highest-score">
                  {stats?.highestScore || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Balls Faced</span>
                <span className="font-bold text-lg" data-testid="stat-balls-faced">
                  {stats?.ballsFaced || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Strike Rate</span>
                <span className="font-bold text-lg" data-testid="stat-strike-rate-detailed">
                  {stats?.strikeRate ? stats.strikeRate.toFixed(2) : "0.00"}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Times Out</span>
                <span className="font-bold text-lg" data-testid="stat-times-out">
                  {stats?.timesOut || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bowling Statistics */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Target className="text-red-600 mr-2 w-5 h-5" />
              Bowling Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Overs Bowled</span>
                <span className="font-bold text-lg" data-testid="stat-overs-bowled">
                  {stats?.oversBowled || "0.0"}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Runs Conceded</span>
                <span className="font-bold text-lg" data-testid="stat-runs-conceded">
                  {stats?.runsConceded || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Wickets Taken</span>
                <span className="font-bold text-lg" data-testid="stat-wickets-taken">
                  {stats?.wicketsTaken || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Economy Rate</span>
                <span className="font-bold text-lg" data-testid="stat-economy-rate">
                  {stats?.economy ? stats.economy.toFixed(2) : "0.00"}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Best Bowling</span>
                <span className="font-bold text-lg" data-testid="stat-best-bowling">
                  {getBestBowlingFigures(stats)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fielding Statistics */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Hand className="text-blue-600 mr-2 w-5 h-5" />
              Fielding Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Catches Taken</span>
                <span className="font-bold text-lg" data-testid="stat-catches-taken">
                  {stats?.catchesTaken || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Run Outs</span>
                <span className="font-bold text-lg" data-testid="stat-run-outs">
                  {stats?.runOuts || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Total Dismissals</span>
                <span className="font-bold text-lg" data-testid="stat-total-dismissals">
                  {(stats?.catchesTaken || 0) + (stats?.runOuts || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
