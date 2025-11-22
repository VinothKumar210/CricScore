import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Trophy } from "lucide-react";
import { useLocation } from "wouter";

interface BattingStats {
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: string;
  dismissalType: string;
  bowlerName: string;
  fielderName: string;
}

interface BowlingStats {
  playerName: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: string;
}

interface MatchSummary {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  matchDate: string;
  venue: string;
  overs: number;
  homeTeamScore: number;
  homeTeamWickets: number;
  homeTeamOvers: number;
  awayTeamScore: number;
  awayTeamWickets: number;
  awayTeamOvers: number;
  winningTeam: string;
  manOfTheMatchUser?: {
    id: string;
    profileName: string;
    username: string;
  };
  manOfTheMatchStats: any;
  firstInningsBatsmen: BattingStats[];
  firstInningsBowlers: BowlingStats[];
  secondInningsBatsmen: BattingStats[];
  secondInningsBowlers: BowlingStats[];
}

export default function MatchSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: matchSummary, isLoading, error } = useQuery<MatchSummary>({
    queryKey: ['/api/match-summary', id],
    enabled: !!id,
  });

  const handlePDFDownload = () => {
    // Trigger browser print dialog for PDF generation
    window.print();
  };

  const formatOvers = (overs: number): string => {
    if (overs === 0) return '0.0';
    
    // Handle cricket format where 14.3 means 14 overs and 3 balls
    const wholeOvers = Math.floor(overs);
    const decimalPart = overs - wholeOvers;
    
    // Extract balls from decimal part (14.3 means 3 balls)
    // Round to handle floating point precision issues
    const balls = Math.round(decimalPart * 10);
    
    // Ensure balls are valid (0-5)
    if (balls < 0 || balls > 5) {
      // If invalid, treat as decimal and convert properly
      const convertedBalls = Math.round(decimalPart * 6);
      return convertedBalls === 0 ? `${wholeOvers}.0` : `${wholeOvers}.${Math.min(convertedBalls, 5)}`;
    }
    
    return balls === 0 ? `${wholeOvers}.0` : `${wholeOvers}.${balls}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">Loading match summary...</div>
      </div>
    );
  }

  if (error || !matchSummary) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-destructive">
          Failed to load match summary. Please try again.
        </div>
      </div>
    );
  }

  const BattingTable = ({ stats, inningsTitle }: { stats: BattingStats[], inningsTitle: string }) => {
    if (!stats || stats.length === 0) {
      return (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              🏏 {inningsTitle} - Batting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-4">
              No batting data available
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            🏏 {inningsTitle} - Batting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batsman</TableHead>
                <TableHead className="text-right">Runs</TableHead>
                <TableHead className="text-right">Balls</TableHead>
                <TableHead className="text-right">4s</TableHead>
                <TableHead className="text-right">6s</TableHead>
                <TableHead className="text-right">SR</TableHead>
                <TableHead>Dismissal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((stat, index) => (
                <TableRow key={index} data-testid={`batting-row-${inningsTitle}-${index}`}>
                  <TableCell className="font-medium" data-testid={`text-batsman-${stat.playerName}`}>
                    {stat.playerName || 'Unknown Player'}
                  </TableCell>
                  <TableCell className="text-right" data-testid={`text-runs-${stat.runs}`}>
                    {stat.runs || 0}
                  </TableCell>
                  <TableCell className="text-right" data-testid={`text-balls-${stat.balls}`}>
                    {stat.balls || 0}
                  </TableCell>
                  <TableCell className="text-right">{stat.fours || 0}</TableCell>
                  <TableCell className="text-right">{stat.sixes || 0}</TableCell>
                  <TableCell className="text-right">{stat.strikeRate || '0.00'}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{stat.dismissalType || 'Not Out'}</div>
                      {stat.dismissalType && stat.dismissalType !== 'Not Out' && (
                        <div className="text-muted-foreground text-xs">
                          {stat.bowlerName && `b: ${stat.bowlerName}`}
                          {stat.fielderName && ` c: ${stat.fielderName}`}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const BowlingTable = ({ stats, inningsTitle }: { stats: BowlingStats[], inningsTitle: string }) => {
    if (!stats || stats.length === 0) {
      return (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              ⚾ {inningsTitle} - Bowling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-4">
              No bowling data available
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            ⚾ {inningsTitle} - Bowling
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bowler</TableHead>
                <TableHead className="text-right">Overs</TableHead>
                <TableHead className="text-right">Maidens</TableHead>
                <TableHead className="text-right">Runs</TableHead>
                <TableHead className="text-right">Wickets</TableHead>
                <TableHead className="text-right">Economy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((stat, index) => (
                <TableRow key={index} data-testid={`bowling-row-${inningsTitle}-${index}`}>
                  <TableCell className="font-medium" data-testid={`text-bowler-${stat.playerName}`}>
                    {stat.playerName || 'Unknown Player'}
                  </TableCell>
                  <TableCell className="text-right">{formatOvers(stat.overs || 0)}</TableCell>
                  <TableCell className="text-right">{stat.maidens || 0}</TableCell>
                  <TableCell className="text-right" data-testid={`text-runs-conceded-${stat.runs}`}>
                    {stat.runs || 0}
                  </TableCell>
                  <TableCell className="text-right" data-testid={`text-wickets-${stat.wickets}`}>
                    {stat.wickets || 0}
                  </TableCell>
                  <TableCell className="text-right">{stat.economy || '0.00'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header with navigation and PDF download */}
      <div className="flex items-center justify-between mb-6 no-print">
        <Button
          variant="outline"
          onClick={() => setLocation('/dashboard')}
          className="flex items-center gap-2"
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <Button
          onClick={handlePDFDownload}
          className="flex items-center gap-2"
          data-testid="button-download-pdf"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Match Header */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold" data-testid="text-match-title">
              Cricket Match Summary
            </h1>
            <div className="text-lg text-muted-foreground">
              {formatDate(matchSummary.matchDate)} • {matchSummary.venue || 'Unknown Venue'}
            </div>
            
            {/* Teams and Scores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center my-8">
              {/* Home Team */}
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-home-team">
                  {matchSummary.homeTeamName}
                </div>
                <div className="text-3xl font-bold text-primary" data-testid="text-home-score">
                  {matchSummary.homeTeamScore}/{matchSummary.homeTeamWickets}
                </div>
                <div className="text-sm text-muted-foreground" data-testid="text-home-overs">
                  ({formatOvers(matchSummary.homeTeamOvers || 0)} overs)
                </div>
              </div>

              {/* VS */}
              <div className="text-center">
                <div className="text-4xl font-bold text-muted-foreground">VS</div>
              </div>

              {/* Away Team */}
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-away-team">
                  {matchSummary.awayTeamName}
                </div>
                <div className="text-3xl font-bold text-primary" data-testid="text-away-score">
                  {matchSummary.awayTeamScore}/{matchSummary.awayTeamWickets}
                </div>
                <div className="text-sm text-muted-foreground" data-testid="text-away-overs">
                  ({formatOvers(matchSummary.awayTeamOvers || 0)} overs)
                </div>
              </div>
            </div>

            {/* Match Result */}
            <div className="text-center">
              <Badge variant="secondary" className="text-lg px-4 py-2" data-testid="text-match-result">
                {matchSummary.winningTeam === 'Draw' 
                  ? '🤝 Match Drawn' 
                  : `🏆 ${matchSummary.winningTeam} Won`
                }
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* First Innings */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4" data-testid="text-first-innings-title">
          First Innings
        </h2>
        <BattingTable stats={matchSummary.firstInningsBatsmen || []} inningsTitle="First" />
        <BowlingTable stats={matchSummary.firstInningsBowlers || []} inningsTitle="First" />
      </div>

      {/* Second Innings */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4" data-testid="text-second-innings-title">
          Second Innings
        </h2>
        <BattingTable stats={matchSummary.secondInningsBatsmen || []} inningsTitle="Second" />
        <BowlingTable stats={matchSummary.secondInningsBowlers || []} inningsTitle="Second" />
      </div>

      {/* Man of the Match */}
      {matchSummary.manOfTheMatchUser && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center items-center gap-2">
                <Trophy className="h-8 w-8 text-amber-500" />
                <h2 className="text-2xl font-bold">Man of the Match</h2>
              </div>
              <div className="text-xl font-semibold text-amber-600 dark:text-amber-400" data-testid="text-mom-name">
                {matchSummary.manOfTheMatchUser.profileName || matchSummary.manOfTheMatchUser.username || 'Unknown Player'}
              </div>
              {matchSummary.manOfTheMatchUser.username && (
                <div className="text-sm text-muted-foreground" data-testid="text-mom-username">
                  @{matchSummary.manOfTheMatchUser.username}
                </div>
              )}
              {matchSummary.manOfTheMatchStats && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 max-w-md mx-auto">
                  <div className="text-sm font-medium mb-2">Performance Score</div>
                  <div className="text-2xl font-bold text-primary" data-testid="text-mom-score">
                    {matchSummary.manOfTheMatchStats?.performanceScore || 0} points
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Print Styles for PDF */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            font-size: 12px;
          }
          
          .no-print {
            display: none !important;
          }
          
          .container {
            max-width: none !important;
            margin: 0 !important;
            padding: 1rem !important;
          }
          
          h1, h2 {
            page-break-after: avoid;
            margin-bottom: 1rem !important;
          }
          
          h1 {
            font-size: 24px !important;
          }
          
          h2 {
            font-size: 18px !important;
          }
          
          .card {
            break-inside: avoid;
            margin-bottom: 1.5rem !important;
            border: 1px solid #e5e5e5 !important;
            border-radius: 8px !important;
            box-shadow: none !important;
          }
          
          .card-header {
            padding: 1rem !important;
            border-bottom: 1px solid #e5e5e5 !important;
          }
          
          .card-content {
            padding: 1rem !important;
          }
          
          table {
            page-break-inside: avoid;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          
          th, td {
            border: 1px solid #e5e5e5 !important;
            padding: 8px !important;
            text-align: left !important;
          }
          
          th {
            background-color: #f8f9fa !important;
            font-weight: bold !important;
          }
          
          .text-center {
            text-align: center !important;
          }
          
          .text-right {
            text-align: right !important;
          }
        }
      `}</style>
    </div>
  );
}