import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { WagonWheel } from '@/components/charts/WagonWheel';
import { OverComparison } from '@/components/charts/OverComparison';
import { RunComparison } from '@/components/charts/RunComparison';

interface StatsTabProps {
    match: any;
}

export function StatsTab({ match }: StatsTabProps) {
    const ballHistory = match.ballByBallData || [];

    // Helper to render partnerships
    const Partnerships = ({ partnerships, teamName }: { partnerships: any[], teamName: string }) => {
        if (!partnerships || partnerships.length === 0) return null;

        // Sort by runs descending and take top 5
        const topPartnerships = [...partnerships]
            .sort((a, b) => b.runs - a.runs)
            .slice(0, 5);

        return (
            <Card className="mb-6">
                <CardHeader className="py-3 bg-muted/20">
                    <CardTitle className="text-base">Top Partnerships - {teamName}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    {topPartnerships.map((p, i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex gap-2 font-medium">
                                    <span>{p.batsman1}</span>
                                    <span className="text-muted-foreground">&</span>
                                    <span>{p.batsman2}</span>
                                </div>
                                <div className="font-bold">{p.runs} <span className="text-muted-foreground font-normal">({p.balls})</span></div>
                            </div>
                            <Progress value={Math.min(p.runs, 100)} className="h-2" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    };

    // Helper to render Fall of Wickets
    const FallOfWickets = ({ fow, teamName }: { fow: any[], teamName: string }) => {
        if (!fow || fow.length === 0) return null;

        return (
            <Card className="mb-6">
                <CardHeader className="py-3 bg-muted/20">
                    <CardTitle className="text-base">Fall of Wickets - {teamName}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2">
                        {fow.map((w, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm border p-2 rounded bg-muted/10">
                                <span className="font-bold">{w.runs}/{w.wicket}</span>
                                <span className="text-muted-foreground">({w.overs} ov)</span>
                                <span className="text-xs text-muted-foreground max-w-[100px] truncate">{w.batsman}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Charts Section */}
            {ballHistory.length > 0 && (
                <>
                    {/* Wagon Wheel */}
                    <WagonWheel
                        ballHistory={ballHistory}
                        team1Name={match.firstInningsTeam || match.homeTeamName}
                        team2Name={match.secondInningsTeam || match.awayTeamName}
                    />

                    {/* Over-by-Over Comparison */}
                    <OverComparison
                        ballHistory={ballHistory}
                        team1Name={match.homeTeamName}
                        team2Name={match.awayTeamName}
                        team1BattingFirst={match.firstInningsTeam === match.homeTeamName}
                    />

                    {/* Run Comparison */}
                    <RunComparison
                        ballHistory={ballHistory}
                        team1Name={match.homeTeamName}
                        team2Name={match.awayTeamName}
                        team1BattingFirst={match.firstInningsTeam === match.homeTeamName}
                        target={match.target}
                    />

                    <Separator className="my-2" />
                </>
            )}

            {/* Innings 1 Stats */}
            <div>
                <h3 className="text-lg font-semibold mb-3 px-1">{match.firstInningsTeam} Innings</h3>
                <Partnerships partnerships={match.firstInningsPartnerships} teamName={match.firstInningsTeam} />
                <FallOfWickets fow={match.firstInningsFOW} teamName={match.firstInningsTeam} />
            </div>

            <Separator className="my-6" />

            {/* Innings 2 Stats */}
            <div>
                <h3 className="text-lg font-semibold mb-3 px-1">{match.secondInningsTeam} Innings</h3>
                <Partnerships partnerships={match.secondInningsPartnerships} teamName={match.secondInningsTeam} />
                <FallOfWickets fow={match.secondInningsFOW} teamName={match.secondInningsTeam} />
            </div>
        </div>
    );
}
