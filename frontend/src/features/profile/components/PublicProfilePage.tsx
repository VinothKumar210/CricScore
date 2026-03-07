import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProfileStore } from '../profileStore';
import { ProfileHeader } from './ProfileHeader';
import { CareerStatsGrid } from './CareerStatsGrid';
import { PrestigeBadges } from './PrestigeBadges';
import { RecentMatchHistory } from './RecentMatchHistory';
import { ImpactRatingCard } from './ImpactRatingCard';
import { PrestigeProgress } from './PrestigeProgress';
import { BestPerformanceCard } from './BestPerformanceCard';
import { Container } from '../../../components/ui/Container';
import { Loader2, ShieldX, UserPlus, UserCheck } from 'lucide-react';
import { socialService } from '../../social/socialService';
import { clsx } from 'clsx';

/**
 * PublicProfilePage — /u/:username
 *
 * Public view of a player's profile.
 * - No edit controls
 * - No private toggles
 * - Shows all competitive metrics from backend
 * - Security: scrubbed data (no email, no Firebase UID)
 */
export const PublicProfilePage = () => {
    const { username } = useParams<{ username: string }>();
    const publicProfile = useProfileStore(s => s.publicProfile);
    const isPublicLoading = useProfileStore(s => s.isPublicLoading);
    const publicError = useProfileStore(s => s.publicError);
    const fetchPublicProfile = useProfileStore(s => s.fetchPublicProfile);
    const resetPublic = useProfileStore(s => s.resetPublic);

    // Social state
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);

    useEffect(() => {
        if (username) fetchPublicProfile(username);
        return () => resetPublic();
    }, [username, fetchPublicProfile, resetPublic]);

    // Check initial follow status when profile loads
    useEffect(() => {
        const checkFollowStatus = async () => {
            if (!publicProfile?.profile?.id) return;
            try {
                // Determine if we follow this user (inefficient for big lists, but works for MVP)
                // Ideally backend profile response includes `isFollowingByViewer`.
                // We will optimistically just allow following for now, or assume false initially.
            } catch (e) { }
        };
        checkFollowStatus();
    }, [publicProfile]);

    const handleFollowToggle = async () => {
        if (!publicProfile?.profile?.id || isFollowLoading) return;

        setIsFollowLoading(true);
        try {
            if (isFollowing) {
                await socialService.unfollowUser(publicProfile.profile.id);
                setIsFollowing(false);
            } else {
                await socialService.followUser(publicProfile.profile.id);
                setIsFollowing(true);
            }
        } catch (error) {
            console.error('Failed to toggle follow', error);
        } finally {
            setIsFollowLoading(false);
        }
    };

    // Loading
    if (isPublicLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading profile...</p>
            </div>
        );
    }

    // Not found
    if (publicError) {
        return (
            <Container className="py-8">
                <div className="flex flex-col items-center py-12 gap-3">
                    <ShieldX className="w-12 h-12 text-gray-300" />
                    <p className="text-muted-foreground text-sm font-medium">{publicError}</p>
                </div>
            </Container>
        );
    }

    if (!publicProfile) return null;

    const { profile, stats, competitive, form } = publicProfile;

    return (
        <Container className="py-4 space-y-5 pb-24">
            {/* Hero Header */}
            <ProfileHeader
                profile={profile as any}
                matchCount={competitive.matchesPlayed}
                rank={competitive.globalRank ?? undefined}
                prestigeTier={competitive.prestigeTier}
                tournamentWins={competitive.tournamentWins}
            />

            {/* Follow Actions */}
            <div className="flex justify-center -mt-2 mb-2 px-4">
                <button
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading}
                    className={clsx(
                        "flex items-center gap-2 justify-center w-full max-w-xs py-2.5 rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98] shadow-sm",
                        isFollowing
                            ? "bg-secondary text-foreground border border-border/50"
                            : "bg-primary text-primary-foreground shadow-primary/20",
                        isFollowLoading && "opacity-70 pointer-events-none"
                    )}
                >
                    {isFollowLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isFollowing ? (
                        <>
                            <UserCheck className="w-5 h-5" />
                            Following
                        </>
                    ) : (
                        <>
                            <UserPlus className="w-5 h-5" />
                            Follow {profile.fullName.split(' ')[0]}
                        </>
                    )}
                </button>
            </div>

            {/* Impact Rating */}
            <ImpactRatingCard competitive={competitive} />

            {/* Prestige Progress */}
            <PrestigeProgress competitive={competitive} />

            {/* Best Performance */}
            <BestPerformanceCard bestPerformance={competitive.bestPerformance} />

            {/* Career Stats */}
            <CareerStatsGrid stats={stats} />

            {/* Prestige Badges */}
            <PrestigeBadges stats={stats} />

            {/* Recent Form (limited) */}
            <RecentMatchHistory form={form} />

            {/* Member Since */}
            {profile.createdAt && (
                <div className="text-center py-4 border-t border-border/30">
                    <p className="text-[10px] text-muted-foreground">
                        Member since {new Date(profile.createdAt).toLocaleDateString(undefined, {
                            month: 'long', year: 'numeric',
                        })}
                    </p>
                </div>
            )}
        </Container>
    );
};
