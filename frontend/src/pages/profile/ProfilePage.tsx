import { useEffect } from 'react';
import { useProfileStore } from '../../features/profile/profileStore';
import { ProfileHeader } from '../../features/profile/components/ProfileHeader';
import { CareerStatsGrid } from '../../features/profile/components/CareerStatsGrid';
import { PrestigeBadges } from '../../features/profile/components/PrestigeBadges';
import { RecentMatchHistory } from '../../features/profile/components/RecentMatchHistory';
import { ImpactRatingCard } from '../../features/profile/components/ImpactRatingCard';
import { PrestigeProgress } from '../../features/profile/components/PrestigeProgress';
import { BestPerformanceCard } from '../../features/profile/components/BestPerformanceCard';
import { Container } from '../../components/ui/Container';
import { Loader2 } from 'lucide-react';

/**
 * ProfilePage — /profile route
 *
 * Beautiful, stat-heavy, prestige-focused, competitive profile dashboard.
 * Phase 12A+ additions: Impact Rating, Prestige Progress, Best Performance,
 * Share Profile, backend-computed competitive metrics.
 */
export const ProfilePage = () => {
    const profile = useProfileStore(s => s.profile);
    const stats = useProfileStore(s => s.stats);
    const form = useProfileStore(s => s.form);
    const competitive = useProfileStore(s => s.competitive);
    const isStatsLoading = useProfileStore(s => s.isStatsLoading);
    const statsError = useProfileStore(s => s.statsError);
    const setProfile = useProfileStore(s => s.setProfile);
    const fetchStats = useProfileStore(s => s.fetchStats);
    const fetchForm = useProfileStore(s => s.fetchForm);
    const fetchCompetitive = useProfileStore(s => s.fetchCompetitive);
    const reset = useProfileStore(s => s.reset);

    // Hydrate profile from localStorage (set by auth flow)
    useEffect(() => {
        const stored = localStorage.getItem('userProfile');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setProfile(parsed);
                if (parsed.id) {
                    fetchStats(parsed.id);
                    fetchForm(parsed.id);
                    fetchCompetitive(parsed.id);
                }
            } catch {
                // Invalid stored profile
            }
        }
        return () => reset();
    }, [setProfile, fetchStats, fetchForm, fetchCompetitive, reset]);

    // Loading
    if (isStatsLoading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading your profile...</p>
            </div>
        );
    }

    // No profile
    if (!profile) {
        return (
            <Container className="py-8">
                <div className="flex flex-col items-center py-12 gap-3">
                    <span className="text-4xl">🏏</span>
                    <p className="text-muted-foreground text-sm">
                        Profile not available. Please log in again.
                    </p>
                </div>
            </Container>
        );
    }

    return (
        <Container className="py-4 space-y-5 pb-24">
            {/* Hero Header */}
            <ProfileHeader
                profile={profile}
                matchCount={competitive?.matchesPlayed ?? stats?.innings ?? 0}
                rank={competitive?.globalRank ?? undefined}
                prestigeTier={competitive?.prestigeTier}
                tournamentWins={competitive?.tournamentWins}
            />

            {/* Impact Rating (Phase 12A+) */}
            {competitive && <ImpactRatingCard competitive={competitive} />}

            {/* Prestige Progress (Phase 12A+) */}
            {competitive && <PrestigeProgress competitive={competitive} />}

            {/* Best Performance (Phase 12A+) */}
            {competitive && <BestPerformanceCard bestPerformance={competitive.bestPerformance} />}

            {/* Error */}
            {statsError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-red-600">{statsError}</p>
                    <button
                        onClick={() => profile.id && fetchStats(profile.id)}
                        className="mt-2 text-xs text-primary font-medium underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Career Stats */}
            {stats && <CareerStatsGrid stats={stats} />}

            {/* Prestige Badges */}
            {stats && <PrestigeBadges stats={stats} />}

            {/* Recent Form */}
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
