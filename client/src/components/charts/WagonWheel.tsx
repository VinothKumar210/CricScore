import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BallEventRecord, ShotDirection, ShotDistance } from '@shared/scoring';

interface WagonWheelProps {
    ballHistory: BallEventRecord[];
    team1Name: string;
    team2Name: string;
}

// Zone layout: angle from top (12 o'clock), clockwise
const ZONE_ANGLES: Record<ShotDirection, number> = {
    'straight': 0,
    'cover': 45,
    'point': 90,
    'third-man': 135,
    'fine-leg': 180,
    'square-leg': 225,
    'mid-wicket': 270,
    'long-on': 315,
};

const ZONE_LABELS: Record<ShotDirection, string> = {
    'straight': 'Straight',
    'cover': 'Cover',
    'point': 'Point',
    'third-man': 'Third Man',
    'fine-leg': 'Fine Leg',
    'square-leg': 'Square Leg',
    'mid-wicket': 'Mid Wicket',
    'long-on': 'Long On',
};

const DISTANCE_RADIUS: Record<ShotDistance, number> = {
    'short': 25,
    'medium': 45,
    'boundary': 72,
};

const RUN_COLORS: Record<string, string> = {
    '0': '#9CA3AF',
    '1': '#60A5FA',
    '2': '#34D399',
    '3': '#FBBF24',
    '4': '#F97316',
    '6': '#EF4444',
};

function getRunColor(runs: number): string {
    return RUN_COLORS[String(runs)] || '#60A5FA';
}

export function WagonWheel({ ballHistory, team1Name, team2Name }: WagonWheelProps) {
    const [teamFilter, setTeamFilter] = useState<'all' | '1' | '2'>('all');
    const [batsmanFilter, setBatsmanFilter] = useState<string>('all');
    const [shotTypeFilter, setShotTypeFilter] = useState<'all' | '4' | '6'>('all');

    // Get shots with direction data
    const shotsWithDirection = useMemo(() => {
        return ballHistory.filter(b => b.shotDirection && b.shotDistance);
    }, [ballHistory]);

    // Get unique batsmen
    const batsmen = useMemo(() => {
        const names = new Set<string>();
        shotsWithDirection.forEach(b => {
            if (b.strikerBefore.name) names.add(b.strikerBefore.name);
        });
        return Array.from(names);
    }, [shotsWithDirection]);

    // Apply filters
    const filteredShots = useMemo(() => {
        return shotsWithDirection.filter(b => {
            if (teamFilter !== 'all' && b.inningsNumber !== Number(teamFilter)) return false;
            if (batsmanFilter !== 'all' && b.strikerBefore.name !== batsmanFilter) return false;
            if (shotTypeFilter === '4' && b.completedRuns !== 4) return false;
            if (shotTypeFilter === '6' && b.completedRuns !== 6) return false;
            return true;
        });
    }, [shotsWithDirection, teamFilter, batsmanFilter, shotTypeFilter]);

    // Calculate stats
    const stats = useMemo(() => {
        const totalRuns = filteredShots.reduce((sum, b) => sum + b.completedRuns, 0);
        const totalBalls = filteredShots.length;
        const sr = totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(1) : '0.0';

        // Off side vs leg side
        const offSideDirections: ShotDirection[] = ['cover', 'point', 'third-man', 'straight'];
        const legSideDirections: ShotDirection[] = ['mid-wicket', 'square-leg', 'fine-leg', 'long-on'];

        const offSideShots = filteredShots.filter(b => offSideDirections.includes(b.shotDirection!));
        const legSideShots = filteredShots.filter(b => legSideDirections.includes(b.shotDirection!));

        const offPercent = totalBalls > 0 ? ((offSideShots.length / totalBalls) * 100).toFixed(0) : '0';
        const legPercent = totalBalls > 0 ? ((legSideShots.length / totalBalls) * 100).toFixed(0) : '0';

        return { totalRuns, totalBalls, sr, offPercent, legPercent };
    }, [filteredShots]);

    if (shotsWithDirection.length === 0) {
        return (
            <Card>
                <CardHeader className="py-3 bg-muted/20">
                    <CardTitle className="text-base">Wagon Wheel</CardTitle>
                </CardHeader>
                <CardContent className="p-8 text-center text-muted-foreground">
                    <p>No shot direction data available for this match.</p>
                    <p className="text-sm mt-1">Enable shot tracking during scoring to see the wagon wheel.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="py-3 bg-muted/20">
                <CardTitle className="text-base">Wagon Wheel</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v as any)}>
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue placeholder="Team" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Both Teams</SelectItem>
                            <SelectItem value="1">{team1Name}</SelectItem>
                            <SelectItem value="2">{team2Name}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={batsmanFilter} onValueChange={setBatsmanFilter}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue placeholder="Batsman" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Batsmen</SelectItem>
                            {batsmen.map(name => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={shotTypeFilter} onValueChange={(v) => setShotTypeFilter(v as any)}>
                        <SelectTrigger className="w-[110px] h-8 text-xs">
                            <SelectValue placeholder="Shots" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Shots</SelectItem>
                            <SelectItem value="4">Only 4s</SelectItem>
                            <SelectItem value="6">Only 6s</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Wagon Wheel SVG */}
                <div className="relative mx-auto" style={{ maxWidth: '340px' }}>
                    <svg viewBox="0 0 200 200" className="w-full h-auto">
                        {/* Field background */}
                        <circle cx="100" cy="100" r="85" fill="#1a472a" opacity="0.08" />
                        <circle cx="100" cy="100" r="85" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />

                        {/* Distance rings */}
                        <circle cx="100" cy="100" r="25" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.1" strokeDasharray="2,2" />
                        <circle cx="100" cy="100" r="45" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.1" strokeDasharray="2,2" />
                        <circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.15" strokeDasharray="3,2" />

                        {/* Sector lines */}
                        {Object.entries(ZONE_ANGLES).map(([dir, angle]) => {
                            const rad = (angle - 22.5) * (Math.PI / 180);
                            const x = 100 + 85 * Math.sin(rad);
                            const y = 100 - 85 * Math.cos(rad);
                            return (
                                <line key={dir} x1="100" y1="100" x2={x} y2={y} stroke="currentColor" strokeWidth="0.3" opacity="0.08" />
                            );
                        })}

                        {/* Pitch */}
                        <rect x="97" y="90" width="6" height="20" fill="hsl(var(--muted-foreground))" opacity="0.2" rx="1" />

                        {/* Shot lines */}
                        {filteredShots.map((shot, i) => {
                            const angle = ZONE_ANGLES[shot.shotDirection!];
                            const radius = DISTANCE_RADIUS[shot.shotDistance!];
                            // Add small random spread to avoid overlapping
                            const spread = (Math.random() - 0.5) * 15;
                            const rad = (angle + spread) * (Math.PI / 180);
                            const x = 100 + radius * Math.sin(rad);
                            const y = 100 - radius * Math.cos(rad);
                            const color = getRunColor(shot.completedRuns);

                            return (
                                <line
                                    key={i}
                                    x1="100"
                                    y1="100"
                                    x2={x}
                                    y2={y}
                                    stroke={color}
                                    strokeWidth={shot.completedRuns >= 4 ? 2 : 1}
                                    opacity={0.7}
                                    strokeLinecap="round"
                                />
                            );
                        })}

                        {/* Shot dots at end of lines */}
                        {filteredShots.map((shot, i) => {
                            const angle = ZONE_ANGLES[shot.shotDirection!];
                            const radius = DISTANCE_RADIUS[shot.shotDistance!];
                            const spread = (Math.random() - 0.5) * 15;
                            const rad = (angle + spread) * (Math.PI / 180);
                            const x = 100 + radius * Math.sin(rad);
                            const y = 100 - radius * Math.cos(rad);
                            const color = getRunColor(shot.completedRuns);

                            return (
                                <circle
                                    key={`dot-${i}`}
                                    cx={x}
                                    cy={y}
                                    r={shot.completedRuns >= 4 ? 2.5 : 1.5}
                                    fill={color}
                                    opacity={0.9}
                                />
                            );
                        })}

                        {/* Zone labels */}
                        {Object.entries(ZONE_ANGLES).map(([dir, angle]) => {
                            const rad = angle * (Math.PI / 180);
                            const x = 100 + 82 * Math.sin(rad);
                            const y = 100 - 82 * Math.cos(rad);
                            return (
                                <text
                                    key={`lbl-${dir}`}
                                    x={x}
                                    y={y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize="4.5"
                                    fill="currentColor"
                                    opacity="0.5"
                                    className="select-none"
                                >
                                    {ZONE_LABELS[dir as ShotDirection]}
                                </text>
                            );
                        })}

                        {/* Center dot (batsman) */}
                        <circle cx="100" cy="100" r="3" fill="hsl(var(--primary))" opacity="0.6" />
                    </svg>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs">
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-gray-400 inline-block"></span> Dot</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block"></span> 1</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-400 inline-block"></span> 2</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-yellow-400 inline-block"></span> 3</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-400 inline-block"></span> 4</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block"></span> 6</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-5 gap-2 mt-4 text-center text-sm">
                    <div>
                        <div className="font-bold">{stats.totalRuns}</div>
                        <div className="text-xs text-muted-foreground">Runs</div>
                    </div>
                    <div>
                        <div className="font-bold">{stats.totalBalls}</div>
                        <div className="text-xs text-muted-foreground">Balls</div>
                    </div>
                    <div>
                        <div className="font-bold">{stats.sr}</div>
                        <div className="text-xs text-muted-foreground">SR</div>
                    </div>
                    <div>
                        <div className="font-bold">{stats.offPercent}%</div>
                        <div className="text-xs text-muted-foreground">Off</div>
                    </div>
                    <div>
                        <div className="font-bold">{stats.legPercent}%</div>
                        <div className="text-xs text-muted-foreground">Leg</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
