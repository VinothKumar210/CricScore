import { useEffect } from 'react';
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
import { Loader2, ShieldX } from 'lucide-react';

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

    useEffect(() => {
        if (username) fetchPublicProfile(username);
        return () => resetPublic();
    }, [username, fetchPublicProfile, resetPublic]);

    // Loading
    if (isPublicLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
                <p className="text-sm text-textSecondary">Loading profile...</p>
            </div>
        );
    }

    // Not found
    if (publicError) {
        return (
            <Container className="py-8">
                <div className="flex flex-col items-center py-12 gap-3">
                    <ShieldX className="w-12 h-12 text-gray-300" />
                    <p className="text-textSecondary text-sm font-medium">{publicError}</p>
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
                    <p className="text-[10px] text-textSecondary">
                        Member since {new Date(profile.createdAt).toLocaleDateString(undefined, {
                            month: 'long', year: 'numeric',
                        })}
                    </p>
                </div>
            )}
        </Container>
    );
};
