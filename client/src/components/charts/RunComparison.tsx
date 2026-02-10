import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { BallEventRecord } from '@shared/scoring';

interface RunComparisonProps {
    ballHistory: BallEventRecord[];
    team1Name: string;
    team2Name: string;
    team1BattingFirst: boolean;
    target?: number;
}

export function RunComparison({ ballHistory, team1Name, team2Name, team1BattingFirst, target }: RunComparisonProps) {
    const chartData = useMemo(() => {
        const firstBattingTeam = team1BattingFirst ? team1Name : team2Name;
        const secondBattingTeam = team1BattingFirst ? team2Name : team1Name;

        // Calculate cumulative runs per over for each innings
        const innings1Runs: Record<number, number> = {};
        const innings2Runs: Record<number, number> = {};

        let cumRuns1 = 0;
        let cumRuns2 = 0;

        ballHistory.forEach(ball => {
            const runs = ball.completedRuns + ball.automaticRuns;
            const over = ball.overNumber + 1;

            if (ball.inningsNumber === 1) {
                cumRuns1 += runs;
                innings1Runs[over] = cumRuns1;
            } else {
                cumRuns2 += runs;
                innings2Runs[over] = cumRuns2;
            }
        });

        // Build data points
        const maxOver = Math.max(
            ...Object.keys(innings1Runs).map(Number),
            ...Object.keys(innings2Runs).map(Number),
            0
        );

        const data = [{ over: 0, [firstBattingTeam]: 0, [secondBattingTeam]: 0 }];

        for (let i = 1; i <= maxOver; i++) {
            data.push({
                over: i,
                [firstBattingTeam]: innings1Runs[i] ?? data[data.length - 1]?.[firstBattingTeam] ?? 0,
                [secondBattingTeam]: innings2Runs[i] ?? data[data.length - 1]?.[secondBattingTeam] ?? 0,
            });
        }

        // Key overs (powerplay end, middle, death)
        const keyOvers = [];
        if (maxOver >= 6) {
            keyOvers.push({
                over: 6,
                label: 'PP End',
                team1: innings1Runs[6] || 0,
                team2: innings2Runs[6] || 0,
            });
        }
        if (maxOver >= 10) {
            keyOvers.push({
                over: 10,
                label: 'Halfway',
                team1: innings1Runs[10] || 0,
                team2: innings2Runs[10] || 0,
            });
        }
        if (maxOver >= 15) {
            keyOvers.push({
                over: 15,
                label: 'Over 15',
                team1: innings1Runs[15] || 0,
                team2: innings2Runs[15] || 0,
            });
        }
        if (maxOver >= 20) {
            keyOvers.push({
                over: maxOver,
                label: 'Final',
                team1: innings1Runs[maxOver] || 0,
                team2: innings2Runs[maxOver] || 0,
            });
        }

        return { data, firstBattingTeam, secondBattingTeam, keyOvers };
    }, [ballHistory, team1Name, team2Name, team1BattingFirst]);

    if (chartData.data.length <= 1) {
        return null;
    }

    return (
        <Card>
            <CardHeader className="py-3 bg-muted/20">
                <CardTitle className="text-base">Run Comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartData.data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
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
                        {target && (
                            <ReferenceLine
                                y={target}
                                stroke="#F59E0B"
                                strokeDasharray="5 3"
                                label={{ value: `Target: ${target}`, position: 'right', fontSize: 10, fill: '#F59E0B' }}
                            />
                        )}
                        <Line
                            type="monotone"
                            dataKey={chartData.firstBattingTeam}
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                        <Line
                            type="monotone"
                            dataKey={chartData.secondBattingTeam}
                            stroke="#EF4444"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                </ResponsiveContainer>

                {/* Key Overs Table */}
                {chartData.keyOvers.length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Key Overs</h4>
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                            <div className="font-medium text-muted-foreground">Phase</div>
                            <div className="font-medium text-muted-foreground">Over</div>
                            <div className="font-medium text-blue-500">{chartData.firstBattingTeam}</div>
                            <div className="font-medium text-red-500">{chartData.secondBattingTeam}</div>
                            {chartData.keyOvers.map((ko, i) => (
                                <>
                                    <div key={`label-${i}`} className="text-muted-foreground">{ko.label}</div>
                                    <div key={`over-${i}`}>{ko.over}</div>
                                    <div key={`t1-${i}`} className="font-medium">{ko.team1}</div>
                                    <div key={`t2-${i}`} className="font-medium">{ko.team2}</div>
                                </>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
