import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Circle, Dot } from 'lucide-react';

interface BallsTabProps {
    match: any;
}

export function BallsTab({ match }: BallsTabProps) {
    const balls = match.ballByBallData || [];

    if (balls.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                <div className="text-4xl mb-4">🏏</div>
                <p>No ball-by-ball data available for this match.</p>
            </div>
        );
    }

    // Reverse to show latest balls first
    const reversedBalls = [...balls].reverse();

    // Helper to get ball color/style
    const getBallStyle = (ball: any) => {
        if (ball.wicket) return 'bg-red-500 text-white border-red-600';
        if (ball.completedRuns >= 4) return 'bg-green-500 text-white border-green-600';
        if (ball.completedRuns === 6) return 'bg-purple-500 text-white border-purple-600';
        if (ball.extraType === 'wide' || ball.extraType === 'noball') return 'bg-amber-500 text-white border-amber-600';
        return 'bg-muted text-foreground border-border';
    };

    const getEventDescription = (ball: any) => {
        if (ball.wicket) {
            return (
                <span className="text-red-600 font-semibold">
                    OUT! {ball.wicket.type.replace('_', ' ')}
                    {ball.wicket.fielder && ` by ${ball.wicket.fielder}`}
                </span>
            );
        }

        let parts = [];
        if (ball.completedRuns > 0) parts.push(`${ball.completedRuns} run${ball.completedRuns > 1 ? 's' : ''}`);
        if (ball.extraType !== 'none') parts.push(ball.extraType);
        if (ball.isFreeHit) parts.push('Free Hit');

        return parts.length > 0 ? parts.join(', ') : 'no run';
    };

    return (
        <Card className="animate-in fade-in duration-500">
            <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                    <div className="divide-y">
                        {reversedBalls.map((ball, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors">
                                {/* Ball Number & Result */}
                                <div className="flex flex-col items-center gap-1 min-w-[50px]">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 ${getBallStyle(ball)}`}>
                                        {ball.displayText}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono">
                                        {ball.overNumber}.{ball.ballNumber + 1}
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between">
                                        <div className="font-semibold text-sm">
                                            {ball.bowlerName} to {ball.strikerAfter?.name || 'Batsman'}
                                        </div>
                                        <Badge variant="outline" className="text-[10px]">
                                            Innings {ball.inningsNumber}
                                        </Badge>
                                    </div>
                                    <div className="text-sm">
                                        {getEventDescription(ball)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
