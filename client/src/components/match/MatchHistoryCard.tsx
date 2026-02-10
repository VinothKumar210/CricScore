/**
 * MatchHistoryCard Component
 * Displays a match card for match history with team logos, scores, and result
 */
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { AvatarWithFallback } from '@/components/avatar-with-fallback';

interface MatchHistoryCardProps {
    match: {
        id: string;
        matchDate: string;
        venue?: string;
        matchType?: string;
        matchFormat?: string;
        homeTeamName: string;
        homeTeamLogo?: string;
        awayTeamName: string;
        awayTeamLogo?: string;
        homeTeamRuns?: number;
        homeTeamWickets?: number;
        homeTeamOvers?: number;
        awayTeamRuns?: number;
        awayTeamWickets?: number;
        awayTeamOvers?: number;
        winningTeam?: string;
        resultDescription?: string;
        result?: 'HOME_WIN' | 'AWAY_WIN' | 'DRAW';
        // First innings info - to show which team batted first
        firstInningsTeam?: string;
        // User's performance (when viewing from profile)
        userPerformance?: {
            runsScored: number;
            ballsFaced: number;
            wicketsTaken: number;
            runsConceded: number;
            oversBowled: number;
        };
        // Man of the Match
        manOfTheMatchPlayerName?: string;
        manOfTheMatchUserId?: string;
    };
    showUserPerformance?: boolean;
    currentUserId?: string;
}

export function MatchHistoryCard({ match, showUserPerformance = false, currentUserId }: MatchHistoryCardProps) {
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatOvers = (overs?: number): string => {
        if (!overs) return '0.0';
        const wholeOvers = Math.floor(overs);
        const balls = Math.round((overs - wholeOvers) * 6);
        return `${wholeOvers}.${Math.min(balls, 5)}`;
    };

    const getResultColor = () => {
        if (match.result === 'DRAW') return 'bg-gray-500';
        if (match.winningTeam === match.homeTeamName) return 'bg-emerald-500';
        return 'bg-blue-500';
    };

    const isUserManOfTheMatch = currentUserId && match.manOfTheMatchUserId === currentUserId;

    return (
        <Link href={`/match/${match.id}`}>
            <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/50 hover:-translate-y-0.5 bg-gradient-to-br from-background to-muted/20">
                <CardContent className="p-4">
                    {/* Header Row: Match Type, Date, Venue */}
                    <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                {match.matchFormat || 'T20'}
                            </Badge>
                            {match.matchType && match.matchType !== 'Open Match' && (
                                <Badge variant="outline" className="text-xs px-2 py-0.5">
                                    {match.matchType}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(match.matchDate)}
                            </span>
                            {match.venue && (
                                <span className="flex items-center gap-1 hidden sm:flex">
                                    <MapPin className="w-3 h-3" />
                                    <span className="max-w-[100px] truncate">{match.venue}</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Teams and Scores */}
                    <div className="flex items-center justify-between gap-4">
                        {/* Home Team */}
                        <div className="flex-1 flex flex-col items-center text-center">
                            <div className="relative mb-2">
                                <AvatarWithFallback
                                    src={match.homeTeamLogo}
                                    name={match.homeTeamName}
                                    size="lg"
                                    className="bg-primary/10 text-primary font-bold"
                                />
                                {match.winningTeam === match.homeTeamName && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                        <Trophy className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </div>
                            <h3 className="font-semibold text-sm line-clamp-1">{match.homeTeamName}</h3>
                            <div className="text-2xl font-bold mt-1">
                                {match.homeTeamRuns ?? 0}/{match.homeTeamWickets ?? 0}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                ({formatOvers(match.homeTeamOvers)} ov)
                            </div>
                            {match.firstInningsTeam === match.homeTeamName && (
                                <Badge variant="outline" className="mt-1 text-[10px] px-1">
                                    1st Batting
                                </Badge>
                            )}
                        </div>

                        {/* VS Divider */}
                        <div className="flex flex-col items-center px-2">
                            <div className="text-lg font-bold text-muted-foreground">vs</div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </div>

                        {/* Away Team */}
                        <div className="flex-1 flex flex-col items-center text-center">
                            <div className="relative mb-2">
                                <AvatarWithFallback
                                    src={match.awayTeamLogo}
                                    name={match.awayTeamName}
                                    size="lg"
                                    className="bg-primary/10 text-primary font-bold"
                                />
                                {match.winningTeam === match.awayTeamName && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                        <Trophy className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </div>
                            <h3 className="font-semibold text-sm line-clamp-1">{match.awayTeamName}</h3>
                            <div className="text-2xl font-bold mt-1">
                                {match.awayTeamRuns ?? 0}/{match.awayTeamWickets ?? 0}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                ({formatOvers(match.awayTeamOvers)} ov)
                            </div>
                            {match.firstInningsTeam === match.awayTeamName && (
                                <Badge variant="outline" className="mt-1 text-[10px] px-1">
                                    1st Batting
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Result Description */}
                    <div className="mt-4 pt-3 border-t border-border/50">
                        <div className={`text-center py-1.5 px-3 rounded-md text-white text-sm font-medium ${getResultColor()}`}>
                            {match.resultDescription || (match.result === 'DRAW' ? 'Match Drawn' : `${match.winningTeam} Won`)}
                        </div>
                    </div>

                    {/* User Performance (if viewing from profile) */}
                    {showUserPerformance && match.userPerformance && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex justify-around text-center text-sm">
                                {match.userPerformance.runsScored > 0 || match.userPerformance.ballsFaced > 0 ? (
                                    <div>
                                        <div className="font-bold text-lg">{match.userPerformance.runsScored}</div>
                                        <div className="text-xs text-muted-foreground">
                                            ({match.userPerformance.ballsFaced} balls)
                                        </div>
                                    </div>
                                ) : null}
                                {match.userPerformance.wicketsTaken > 0 && (
                                    <div>
                                        <div className="font-bold text-lg">
                                            {match.userPerformance.wicketsTaken}/{match.userPerformance.runsConceded}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            ({Math.floor(match.userPerformance.oversBowled)} ov)
                                        </div>
                                    </div>
                                )}
                            </div>
                            {isUserManOfTheMatch && (
                                <div className="flex items-center justify-center gap-1 mt-2 text-amber-500 text-xs font-medium">
                                    <Trophy className="w-3 h-3" />
                                    Man of the Match
                                </div>
                            )}
                        </div>
                    )}

                    {/* Man of the Match (when not showing user performance) */}
                    {!showUserPerformance && match.manOfTheMatchPlayerName && (
                        <div className="mt-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                            <Trophy className="w-3 h-3 text-amber-500" />
                            <span>MoM: {match.manOfTheMatchPlayerName}</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </Link>
    );
}

export default MatchHistoryCard;
