import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { BallEventRecord } from '@shared/scoring';

interface OverComparisonProps {
    ballHistory: BallEventRecord[];
    team1Name: string;
    team2Name: string;
    team1BattingFirst: boolean;
}

export function OverComparison({ ballHistory, team1Name, team2Name, team1BattingFirst }: OverComparisonProps) {
    const chartData = useMemo(() => {
        // Group balls by over and innings
        const overMap: Record<number, { innings1: number; innings2: number }> = {};

        ballHistory.forEach(ball => {
            if (!ball.isLegal && ball.extraType === 'wide') {
                // Wides don't advance the over count but do add runs
                // We'll attribute them to the current over
            }
            const overNum = ball.overNumber + 1; // 1-indexed
            if (!overMap[overNum]) {
                overMap[overNum] = { innings1: 0, innings2: 0 };
            }

            const runs = ball.completedRuns + ball.automaticRuns;
            if (ball.inningsNumber === 1) {
                overMap[overNum].innings1 += runs;
            } else {
                overMap[overNum].innings2 += runs;
            }
        });

        // Get the batting team names for each innings
        const firstBattingTeam = team1BattingFirst ? team1Name : team2Name;
        const secondBattingTeam = team1BattingFirst ? team2Name : team1Name;

        // Convert to array sorted by over number
        const maxOver = Math.max(...Object.keys(overMap).map(Number), 0);
        const data = [];
        for (let i = 1; i <= maxOver; i++) {
            const entry = overMap[i] || { innings1: 0, innings2: 0 };
            data.push({
                over: `${i}`,
                [firstBattingTeam]: entry.innings1,
                [secondBattingTeam]: entry.innings2,
            });
        }

        return { data, firstBattingTeam, secondBattingTeam };
    }, [ballHistory, team1Name, team2Name, team1BattingFirst]);

    if (chartData.data.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader className="py-3 bg-muted/20">
                <CardTitle className="text-base">Over-by-Over Comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData.data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis
                            dataKey="over"
                            tick={{ fontSize: 11 }}
                            label={{ value: 'Over', position: 'insideBottomRight', offset: -5, fontSize: 11 }}
                        />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            label={{ value: 'Runs', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11 }}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '8px',
                                fontSize: '12px',
                                border: '1px solid hsl(var(--border))',
                                backgroundColor: 'hsl(var(--background))',
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar
                            dataKey={chartData.firstBattingTeam}
                            fill="#3B82F6"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={24}
                        />
                        <Bar
                            dataKey={chartData.secondBattingTeam}
                            fill="#EF4444"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={24}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
