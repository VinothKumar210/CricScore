import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trophy, TrendingUp, User } from 'lucide-react';
import { AvatarWithFallback } from '@/components/avatar-with-fallback';

interface SummaryTabProps {
    match: any;
}

export function SummaryTab({ match }: SummaryTabProps) {
    // Determine top performers from first innings
    const firstInningsTopBatsman = match.firstInningsBatsmen
        ?.sort((a: any, b: any) => b.runs - a.runs)[0];

    const firstInningsTopBowler = match.firstInningsBowlers
        ?.sort((a: any, b: any) => b.wickets - a.wickets || a.runs - b.runs)[0];

    // Determine top performers from second innings
    const secondInningsTopBatsman = match.secondInningsBatsmen
        ?.sort((a: any, b: any) => b.runs - a.runs)[0];

    const secondInningsTopBowler = match.secondInningsBowlers
        ?.sort((a: any, b: any) => b.wickets - a.wickets || a.runs - b.runs)[0];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Match Result Card */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6 text-center">
                    <Badge className="mb-4 text-base px-4 py-1">Result</Badge>
                    <h2 className="text-2xl font-bold text-primary mb-2">
                        {match.resultDescription || (match.result === 'DRAW' ? 'Match Drawn' : `${match.winningTeam} Won`)}
                    </h2>
                    <p className="text-muted-foreground">
                        {match.venue} • {new Date(match.matchDate).toLocaleDateString()}
                    </p>
                </CardContent>
            </Card>

            {/* Man of the Match */}
            {match.manOfTheMatchPlayerName && (
                <Card className="overflow-hidden border-amber-200 dark:border-amber-800">
                    <div className="bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-background p-4 flex items-center gap-4">
                        <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-full">
                            <Trophy className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                Player of the Match
                            </h3>
                            <div className="text-xl font-bold mt-1">
                                {match.manOfTheMatchPlayerName}
                            </div>
                            {match.manOfTheMatchStats && (
                                <div className="text-sm text-muted-foreground mt-1">
                                    {match.manOfTheMatchStats.runsScored > 0 && `${match.manOfTheMatchStats.runsScored} runs `}
                                    {match.manOfTheMatchStats.wicketsTaken > 0 && `& ${match.manOfTheMatchStats.wicketsTaken} wickets`}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* Key Performers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Innings Performers */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            {match.firstInningsTeam} Innings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Top Batsman */}
                        {firstInningsTopBatsman && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="font-semibold">{firstInningsTopBatsman.playerName}</div>
                                        <div className="text-xs text-muted-foreground">Top Scorer</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">{firstInningsTopBatsman.runs}</div>
                                    <div className="text-xs text-muted-foreground">({firstInningsTopBatsman.balls})</div>
                                </div>
                            </div>
                        )}

                        <Separator />

                        {/* Top Bowler (from opposition) */}
                        {secondInningsTopBowler && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                                        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <div className="font-semibold">{secondInningsTopBowler.playerName}</div>
                                        <div className="text-xs text-muted-foreground">Best Bowling</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">{secondInningsTopBowler.wickets}-{secondInningsTopBowler.runs}</div>
                                    <div className="text-xs text-muted-foreground">({secondInningsTopBowler.overs})</div>
                                </div>
                            </div>
                        )}

                        <div className="text-sm font-medium pt-2 text-center bg-muted/50 py-2 rounded">
                            Score: {match.firstInningsRuns}/{match.firstInningsWickets} ({match.firstInningsOvers} ov)
                        </div>
                    </CardContent>
                </Card>

                {/* Second Innings Performers */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            {match.secondInningsTeam} Innings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Top Batsman */}
                        {secondInningsTopBatsman && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="font-semibold">{secondInningsTopBatsman.playerName}</div>
                                        <div className="text-xs text-muted-foreground">Top Scorer</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">{secondInningsTopBatsman.runs}</div>
                                    <div className="text-xs text-muted-foreground">({secondInningsTopBatsman.balls})</div>
                                </div>
                            </div>
                        )}

                        <Separator />

                        {/* Top Bowler (from opposition) */}
                        {firstInningsTopBowler && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                                        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <div className="font-semibold">{firstInningsTopBowler.playerName}</div>
                                        <div className="text-xs text-muted-foreground">Best Bowling</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">{firstInningsTopBowler.wickets}-{firstInningsTopBowler.runs}</div>
                                    <div className="text-xs text-muted-foreground">({firstInningsTopBowler.overs})</div>
                                </div>
                            </div>
                        )}

                        <div className="text-sm font-medium pt-2 text-center bg-muted/50 py-2 rounded">
                            Score: {match.secondInningsRuns}/{match.secondInningsWickets} ({match.secondInningsOvers} ov)
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
