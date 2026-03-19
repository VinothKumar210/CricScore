import React from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip, Legend
} from 'recharts';

export interface RadarDataPoint {
    metric: string;
    player1: number;
    player2: number;
    fullMark: number;
}

interface Props {
    data: RadarDataPoint[];
    player1Name: string;
    player2Name: string;
}

export const ComparisonRadar = ({ data, player1Name, player2Name }: Props) => {
    if (!data || data.length === 0) return null;

    return (
        <div className="w-full h-80 bg-card rounded-2xl border border-border p-4">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis 
                        dataKey="metric" 
                        tick={{ fill: 'var(--foreground)', fontSize: 12, fontWeight: 500 }}
                    />
                    <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, 100]} // We normalize everything to 0-100 for proper radar display
                        tick={false} 
                        axisLine={false} 
                    />
                    
                    <Radar
                        name={player1Name}
                        dataKey="player1"
                        stroke="hsla(var(--primary))"
                        fill="hsla(var(--primary))"
                        fillOpacity={0.5}
                    />
                    
                    <Radar
                        name={player2Name}
                        dataKey="player2"
                        stroke="#f59e0b" // Amber
                        fill="#f59e0b"
                        fillOpacity={0.5}
                    />
                    
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: 'var(--card)', 
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--foreground)'
                        }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};
