import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, TrendingUp, Trophy } from 'lucide-react';

interface SuperStarsTabProps {
    match: any;
}

export function SuperStarsTab({ match }: SuperStarsTabProps) {
    // Calculate fantasy points for a player
    // Rules: Run=1, 4=1, 6=2, Wicket=25, Catch=8, RunOut=12, Maiden=8
    // 50 runs = +8, 100 runs = +16
    // 3 wkts = +4, 5 wkts = +16
    const calculatePoints = (batting: any, bowling: any) => {
        let points = 0;

        // Batting points
        if (batting) {
            points += (batting.runs || 0);
            points += (batting.fours || 0) * 1;
            points += (batting.sixes || 0) * 2;

            if (batting.runs >= 100) points += 16;
            else if (batting.runs >= 50) points += 8;
            else if (batting.runs >= 30) points += 4;

            if (batting.runs === 0 && batting.isOut && batting.dismissalType !== 'not out') points -= 2; // Duck
        }

        // Bowling points
        if (bowling) {
            points += (bowling.wickets || 0) * 25;
            points += (bowling.maidens || 0) * 8; // Assuming maidens might be tracked in future or passed

            if (bowling.wickets >= 5) points += 16;
            else if (bowling.wickets >= 4) points += 8;
            else if (bowling.wickets >= 3) points += 4;
        }

        return points;
    };

    // Aggregate all players and calculate points
    const getAllPlayers = () => {
        const playersMap = new Map<string, any>();

        // Helper to add/update player
        const updatePlayer = (p: any, type: 'batting' | 'bowling', innings: number) => {
            const key = p.playerName; // Fallback to name if id missing
            if (!playersMap.has(key)) {
                playersMap.set(key, {
                    name: p.playerName,
                    batting: null,
                    bowling: null,
                    team: innings === 1 ? match.firstInningsTeam : match.secondInningsTeam // Rough approximation
                });
            }
            const player = playersMap.get(key);
            if (type === 'batting') player.batting = p;
            if (type === 'bowling') player.bowling = p;

            // Fix team assignment for bowling (bowlers belong to fielding team)
            if (type === 'bowling') {
                player.team = innings === 1 ? match.secondInningsTeam : match.firstInningsTeam;
            }
        };

        match.firstInningsBatsmen?.forEach((p: any) => updatePlayer(p, 'batting', 1));
        match.firstInningsBowlers?.forEach((p: any) => updatePlayer(p, 'bowling', 1));
        match.secondInningsBatsmen?.forEach((p: any) => updatePlayer(p, 'batting', 2));
        match.secondInningsBowlers?.forEach((p: any) => updatePlayer(p, 'bowling', 2));

        // Calculate points and sort
        return Array.from(playersMap.values())
            .map(p => ({
                ...p,
                points: calculatePoints(p.batting, p.bowling)
            }))
            .sort((a, b) => b.points - a.points);
    };

    const topPlayers = getAllPlayers();
    const MVP = topPlayers[0];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* MVP Card */}
            {MVP && (
                <Card className="bg-gradient-to-r from-amber-100 to-yellow-50 dark:from-amber-900/40 dark:to-background border-amber-200 dark:border-amber-800">
                    <CardContent className="p-6 flex items-center gap-6">
                        <div className="relative">
                            <div className="bg-amber-500 rounded-full p-4 text-white shadow-lg">
                                <Trophy className="w-8 h-8" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                                MVP
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">{MVP.name}</h3>
                            <div className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-2">
                                <Star className="w-4 h-4 fill-current" />
                                {MVP.points} Fantasy Points
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                                {MVP.batting && `${MVP.batting.runs} runs `}
                                {MVP.batting && MVP.bowling && '• '}
                                {MVP.bowling && `${MVP.bowling.wickets} wickets`}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Leaderboard */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Top Performers (Fantasy Points)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {topPlayers.slice(0, 10).map((player, index) => (
                            <div key={index} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm
                    ${index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                                            index === 1 ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                                                index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400' :
                                                    'bg-muted text-muted-foreground'}`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="font-semibold">{player.name}</div>
                                        <div className="text-xs text-muted-foreground">{player.team}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-primary">{player.points}</div>
                                    <div className="text-xs text-muted-foreground">pts</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
