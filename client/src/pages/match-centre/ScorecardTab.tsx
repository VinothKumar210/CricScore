import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ScorecardTabProps {
    match: any;
}

export function ScorecardTab({ match }: ScorecardTabProps) {
    // Helper to render batting table
    const BattingTable = ({ batsmen }: { batsmen: any[] }) => (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="w-[40%]">Batter</TableHead>
                        <TableHead className="text-right">R</TableHead>
                        <TableHead className="text-right">B</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">4s</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">6s</TableHead>
                        <TableHead className="text-right">SR</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {batsmen.map((batsman, i) => (
                        <TableRow key={i}>
                            <TableCell>
                                <div className="font-medium">{batsman.playerName}</div>
                                <div className="text-xs text-muted-foreground">
                                    {batsman.isOut ? 'out' : 'not out'}
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-bold">{batsman.runs}</TableCell>
                            <TableCell className="text-right">{batsman.balls}</TableCell>
                            <TableCell className="text-right hidden sm:table-cell">{batsman.fours}</TableCell>
                            <TableCell className="text-right hidden sm:table-cell">{batsman.sixes}</TableCell>
                            <TableCell className="text-right">
                                {batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(1) : '0.0'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );

    // Helper to render bowling table
    const BowlingTable = ({ bowlers }: { bowlers: any[] }) => (
        <div className="rounded-md border mt-4">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="w-[40%]">Bowler</TableHead>
                        <TableHead className="text-right">O</TableHead>
                        <TableHead className="text-right">M</TableHead>
                        <TableHead className="text-right">R</TableHead>
                        <TableHead className="text-right">W</TableHead>
                        <TableHead className="text-right">Eco</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {bowlers.map((bowler, i) => (
                        <TableRow key={i}>
                            <TableCell className="font-medium">{bowler.playerName}</TableCell>
                            <TableCell className="text-right">{bowler.overs}</TableCell>
                            <TableCell className="text-right">0</TableCell> {/* Maidens not always in simple JSON stats */}
                            <TableCell className="text-right">{bowler.runs}</TableCell>
                            <TableCell className="text-right font-bold">{bowler.wickets}</TableCell>
                            <TableCell className="text-right">
                                {(bowler.runs / (typeof bowler.overs === 'string' ? parseFloat(bowler.overs) : bowler.overs || 1)).toFixed(1)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );

    // Helper for Extras display
    const ExtrasDisplay = ({ extras }: { extras: any }) => {
        if (!extras) return null;
        const total = (extras.wides || 0) + (extras.noBalls || 0) + (extras.byes || 0) + (extras.legByes || 0) + (extras.penalty || 0);
        return (
            <div className="flex justify-between items-center text-sm py-2 px-4 bg-muted/30 rounded mt-4">
                <span className="font-semibold">Extras</span>
                <span className="font-mono">
                    {total} (wd {extras.wides || 0}, nb {extras.noBalls || 0}, b {extras.byes || 0}, lb {extras.legByes || 0})
                </span>
            </div>
        );
    };

    return (
        <Tabs defaultValue="innings1" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="innings1">{match.firstInningsTeam}</TabsTrigger>
                <TabsTrigger value="innings2">{match.secondInningsTeam}</TabsTrigger>
            </TabsList>

            <TabsContent value="innings1" className="space-y-4 animate-in fade-in duration-500">
                <Card>
                    <CardHeader className="py-3 bg-muted/20">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-base">Batting</CardTitle>
                            <div className="text-sm font-bold">
                                {match.firstInningsRuns}/{match.firstInningsWickets} ({match.firstInningsOvers})
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-4">
                        <BattingTable batsmen={match.firstInningsBatsmen || []} />
                        <ExtrasDisplay extras={match.firstInningsExtras} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="py-3 bg-muted/20">
                        <CardTitle className="text-base">Bowling</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-4">
                        <BowlingTable bowlers={match.secondInningsBowlers || []} />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="innings2" className="space-y-4 animate-in fade-in duration-500">
                <Card>
                    <CardHeader className="py-3 bg-muted/20">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-base">Batting</CardTitle>
                            <div className="text-sm font-bold">
                                {match.secondInningsRuns}/{match.secondInningsWickets} ({match.secondInningsOvers})
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-4">
                        <BattingTable batsmen={match.secondInningsBatsmen || []} />
                        <ExtrasDisplay extras={match.secondInningsExtras} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="py-3 bg-muted/20">
                        <CardTitle className="text-base">Bowling</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-4">
                        <BowlingTable bowlers={match.firstInningsBowlers || []} />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
