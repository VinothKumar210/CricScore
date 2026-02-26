import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../profileStore';
import { Container } from '../../../components/ui/Container';
import { Card } from '../../../components/ui/Card';
import { typography } from '../../../constants/typography';
import { clsx } from 'clsx';
import { Loader2, User, Trophy } from 'lucide-react';

const TIER_CONFIG: Record<string, { icon: string; color: string }> = {
    Rookie: { icon: '🏷️', color: 'text-gray-400' },
    Rising: { icon: '🌱', color: 'text-green-500' },
    Veteran: { icon: '⭐', color: 'text-blue-500' },
    Elite: { icon: '💎', color: 'text-purple-500' },
    Legend: { icon: '👑', color: 'text-amber-500' },
};

/**
 * LeaderboardPage — /leaderboard route.
 *
 * Shows top players by Impact Rating.
 * Uses 30s client-side cache.
 * Backend does ALL computation — frontends only renders.
 */
export const LeaderboardPage = () => {
    const navigate = useNavigate();
    const leaderboard = useProfileStore(s => s.leaderboard);
    const isLeaderboardLoading = useProfileStore(s => s.isLeaderboardLoading);
    const fetchLeaderboard = useProfileStore(s => s.fetchLeaderboard);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    return (
        <Container className="py-4 space-y-6">
            <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" />
                <h1 className={typography.headingLg}>Impact Leaderboard</h1>
            </div>

            {/* Loading */}
            {isLeaderboardLoading && !leaderboard && (
                <div className="flex flex-col items-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading rankings...</p>
                </div>
            )}

            {/* Empty */}
            {leaderboard && leaderboard.entries.length === 0 && (
                <Card padding="lg">
                    <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                            No ranked players yet. Play 5+ matches to qualify.
                        </p>
                    </div>
                </Card>
            )}

            {/* Leaderboard */}
            {leaderboard && leaderboard.entries.length > 0 && (
                <div className="space-y-2">
                    {leaderboard.entries.map(entry => {
                        const tierCfg = TIER_CONFIG[entry.prestigeTier] || TIER_CONFIG.Rookie;
                        const isTop3 = entry.rank <= 3;
                        const medalColor = entry.rank === 1 ? 'from-amber-100 to-yellow-50 border-amber-300'
                            : entry.rank === 2 ? 'from-gray-100 to-gray-50 border-border'
                                : entry.rank === 3 ? 'from-orange-50 to-amber-50 border-orange-200'
                                    : '';

                        return (
                            <div
                                key={entry.userId}
                                onClick={() => entry.username ? navigate(`/u/${entry.username}`) : null}
                                className={clsx(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                                    isTop3
                                        ? `bg-gradient-to-r ${medalColor} cursor-pointer`
                                        : 'bg-card border-border/50 hover:border-brand/30 cursor-pointer',
                                )}
                            >
                                {/* Rank */}
                                <span className={clsx(
                                    'w-8 text-center font-black tabular-nums',
                                    entry.rank === 1 ? 'text-amber-500 text-lg'
                                        : entry.rank === 2 ? 'text-gray-400 text-lg'
                                            : entry.rank === 3 ? 'text-orange-400 text-lg'
                                                : 'text-muted-foreground text-sm',
                                )}>
                                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                                </span>

                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-brand/70
                                                flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {entry.profilePictureUrl ? (
                                        <img src={entry.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-4 h-4 text-white" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-foreground truncate">{entry.name}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <span className={tierCfg.color}>{tierCfg.icon} {entry.prestigeTier}</span>
                                        <span>·</span>
                                        <span>{entry.matches} matches</span>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="text-right flex-shrink-0">
                                    <p className="text-lg font-black text-primary tabular-nums">
                                        {entry.impactRating}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground">
                                        {entry.runs}r / {entry.wickets}w
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer */}
            {leaderboard && (
                <p className="text-center text-[10px] text-muted-foreground">
                    Showing {leaderboard.entries.length} of {leaderboard.total} ranked players
                </p>
            )}
        </Container>
    );
};
