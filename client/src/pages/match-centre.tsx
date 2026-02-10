/**
 * Match Centre Page
 * Displays detailed match information with 5 tabs:
 * Summary, Scorecard, Stats, SuperStars, Balls
 */
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trophy, Calendar, MapPin, Share2, Download } from 'lucide-react';
import { useLocation } from 'wouter';
import { AvatarWithFallback } from '@/components/avatar-with-fallback';

// Tab Components (to be created separately for cleaner code)
import { SummaryTab } from './match-centre/SummaryTab';
import { ScorecardTab } from './match-centre/ScorecardTab';
import { StatsTab } from './match-centre/StatsTab';
import { SuperStarsTab } from './match-centre/SuperStarsTab';
import { BallsTab } from './match-centre/BallsTab';

// Interface matching the MatchSummary schema
interface MatchData {
    id: string;
    matchDate: string;
    venue: string;
    homeTeamName: string;
    homeTeamId?: string;
    homeTeamLogo?: string;
    awayTeamName: string;
    awayTeamId?: string;
    awayTeamLogo?: string;
    matchType?: string;
    matchFormat?: string;
    result: 'HOME_WIN' | 'AWAY_WIN' | 'DRAW';
    winningTeam: string;
    resultDescription?: string;

    // Innings scores
    firstInningsTeam: string;
    firstInningsRuns: number;
    firstInningsWickets: number;
    firstInningsOvers: number;
    secondInningsTeam: string;
    secondInningsRuns: number;
    secondInningsWickets: number;
    secondInningsOvers: number;
    target?: number;
    totalOvers: number;

    // Man of the match
    manOfTheMatchPlayerName?: string;
    manOfTheMatchUserId?: string;
    manOfTheMatchStats?: any;

    // Player data (JSON arrays)
    firstInningsBatsmen: any[];
    firstInningsBowlers: any[];
    secondInningsBatsmen: any[];
    secondInningsBowlers: any[];

    // Extras breakdown
    firstInningsExtras?: {
        byes: number;
        legByes: number;
        wides: number;
        noBalls: number;
        penalty: number;
    };
    secondInningsExtras?: {
        byes: number;
        legByes: number;
        wides: number;
        noBalls: number;
        penalty: number;
    };

    // FOW
    firstInningsFOW?: Array<{
        wicket: number;
        runs: number;
        overs: number;
        batsman: string;
    }>;
    secondInningsFOW?: Array<{
        wicket: number;
        runs: number;
        overs: number;
        batsman: string;
    }>;

    // Partnerships
    firstInningsPartnerships?: Array<{
        batsman1: string;
        batsman2: string;
        runs: number;
        balls: number;
    }>;
    secondInningsPartnerships?: Array<{
        batsman1: string;
        batsman2: string;
        runs: number;
        balls: number;
    }>;

    // Ball by ball
    ballByBallData?: any[];
}

export default function MatchCentrePage() {
    const { id } = useParams<{ id: string }>();
    const [, setLocation] = useLocation();
    const [activeTab, setActiveTab] = useState('summary');

    const { data: match, isLoading, error } = useQuery<MatchData>({
        queryKey: ['/api/match-summary', id],
        enabled: !!id,
    });

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatOvers = (overs: number): string => {
        const wholeOvers = Math.floor(overs);
        const balls = Math.round((overs - wholeOvers) * 6);
        return `${wholeOvers}.${Math.min(balls, 5)}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading match details...</p>
                </div>
            </div>
        );
    }

    if (error || !match) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <div className="text-4xl mb-4">🏏</div>
                        <h2 className="text-xl font-bold mb-2">Match Not Found</h2>
                        <p className="text-muted-foreground mb-4">
                            Unable to load match details. The match may have been deleted or you don't have access.
                        </p>
                        <Button onClick={() => setLocation('/dashboard')} variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Determine home/away based on first innings
    const homeTeamScore = match.firstInningsTeam === match.homeTeamName
        ? { runs: match.firstInningsRuns, wickets: match.firstInningsWickets, overs: match.firstInningsOvers }
        : { runs: match.secondInningsRuns, wickets: match.secondInningsWickets, overs: match.secondInningsOvers };

    const awayTeamScore = match.firstInningsTeam === match.awayTeamName
        ? { runs: match.firstInningsRuns, wickets: match.firstInningsWickets, overs: match.firstInningsOvers }
        : { runs: match.secondInningsRuns, wickets: match.secondInningsWickets, overs: match.secondInningsOvers };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setLocation('/dashboard')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                            <Share2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                            <Download className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Match Header Card */}
            <div className="container mx-auto px-4 py-6">
                <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/20 mb-6">
                    <CardContent className="p-6">
                        {/* Match Info */}
                        <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">{match.matchFormat || 'T20'}</Badge>
                                {match.matchType && match.matchType !== 'Open Match' && (
                                    <Badge variant="outline">{match.matchType}</Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {formatDate(match.matchDate)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {match.venue}
                                </span>
                            </div>
                        </div>

                        {/* Teams and Scores */}
                        <div className="grid grid-cols-3 items-center gap-4 my-6">
                            {/* Home Team */}
                            <div className="text-center">
                                <div className="relative inline-block mb-3">
                                    <AvatarWithFallback
                                        src={match.homeTeamLogo}
                                        name={match.homeTeamName}
                                        size="xl"
                                        className="bg-primary/10 text-primary font-bold"
                                    />
                                    {match.winningTeam === match.homeTeamName && (
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                                            <Trophy className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                                <h2 className="font-bold text-lg">{match.homeTeamName}</h2>
                                <div className="text-3xl font-bold text-primary mt-2">
                                    {homeTeamScore.runs}/{homeTeamScore.wickets}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    ({formatOvers(homeTeamScore.overs)} ov)
                                </div>
                            </div>

                            {/* VS */}
                            <div className="text-center">
                                <div className="text-2xl font-bold text-muted-foreground mb-2">VS</div>
                                {match.target && (
                                    <div className="text-sm text-muted-foreground">
                                        Target: {match.target}
                                    </div>
                                )}
                            </div>

                            {/* Away Team */}
                            <div className="text-center">
                                <div className="relative inline-block mb-3">
                                    <AvatarWithFallback
                                        src={match.awayTeamLogo}
                                        name={match.awayTeamName}
                                        size="xl"
                                        className="bg-primary/10 text-primary font-bold"
                                    />
                                    {match.winningTeam === match.awayTeamName && (
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                                            <Trophy className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                                <h2 className="font-bold text-lg">{match.awayTeamName}</h2>
                                <div className="text-3xl font-bold text-primary mt-2">
                                    {awayTeamScore.runs}/{awayTeamScore.wickets}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    ({formatOvers(awayTeamScore.overs)} ov)
                                </div>
                            </div>
                        </div>

                        {/* Result */}
                        <div className="text-center py-3 bg-primary/10 rounded-lg">
                            <p className="font-semibold text-primary">
                                {match.resultDescription || (match.result === 'DRAW' ? 'Match Drawn' : `${match.winningTeam} Won`)}
                            </p>
                        </div>

                        {/* Man of the Match */}
                        {match.manOfTheMatchPlayerName && (
                            <div className="mt-4 text-center flex items-center justify-center gap-2 text-sm">
                                <Trophy className="w-4 h-4 text-amber-500" />
                                <span className="text-muted-foreground">Man of the Match:</span>
                                <span className="font-semibold">{match.manOfTheMatchPlayerName}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full grid grid-cols-5 mb-6">
                        <TabsTrigger value="summary" className="text-xs sm:text-sm">Summary</TabsTrigger>
                        <TabsTrigger value="scorecard" className="text-xs sm:text-sm">Scorecard</TabsTrigger>
                        <TabsTrigger value="stats" className="text-xs sm:text-sm">Stats</TabsTrigger>
                        <TabsTrigger value="superstars" className="text-xs sm:text-sm">SuperStars</TabsTrigger>
                        <TabsTrigger value="balls" className="text-xs sm:text-sm">Balls</TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary">
                        <SummaryTab match={match} />
                    </TabsContent>

                    <TabsContent value="scorecard">
                        <ScorecardTab match={match} />
                    </TabsContent>

                    <TabsContent value="stats">
                        <StatsTab match={match} />
                    </TabsContent>

                    <TabsContent value="superstars">
                        <SuperStarsTab match={match} />
                    </TabsContent>

                    <TabsContent value="balls">
                        <BallsTab match={match} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
