import React, { useCallback } from 'react';
import type { UserProfile } from '../profileService';
import { User, Hash, Shield, Share2, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfileHeaderProps {
    profile: UserProfile;
    matchCount: number;
    rank?: number;
    prestigeTier?: string;
    tournamentWins?: number;
}

/**
 * ProfileHeader — Centered profile hero matching shadcn reference.
 * Avatar with verified badge, name, role tags, Follow/Compare buttons.
 */
export const ProfileHeader: React.FC<ProfileHeaderProps> = React.memo(({ profile, matchCount, rank, prestigeTier, tournamentWins }) => {
    const navigate = useNavigate();

    const roleLabel: Record<string, string> = {
        BATSMAN: 'Batsman',
        BOWLER: 'Bowler',
        ALL_ROUNDER: 'All-Rounder',
        WICKET_KEEPER_BATSMAN: 'Wicket-Keeper',
    };

    const handLabel = profile.battingHand === 'LEFT_HANDED' ? 'Left Hand Bat' : 'Right Hand Bat';

    const tier = prestigeTier === 'Legend' ? { label: 'Legend', color: 'text-amber-400' }
        : prestigeTier === 'Elite' ? { label: 'Elite', color: 'text-primary' }
            : prestigeTier === 'Veteran' ? { label: 'Veteran', color: 'text-chart-1' }
                : prestigeTier === 'Rising' ? { label: 'Rising', color: 'text-emerald-400' }
                    : matchCount >= 100 ? { label: 'Legend', color: 'text-amber-400' }
                        : matchCount >= 50 ? { label: 'Elite', color: 'text-primary' }
                            : matchCount >= 20 ? { label: 'Veteran', color: 'text-chart-1' }
                                : matchCount >= 5 ? { label: 'Rising', color: 'text-emerald-400' }
                                    : { label: 'Rookie', color: 'text-muted-foreground' };

    const handleShare = useCallback(async () => {
        const url = profile.username ? `${window.location.origin}/u/${profile.username}` : window.location.href;
        const shareData = {
            title: `${profile.fullName} on CricScore`,
            text: `Check out ${profile.fullName}'s cricket profile!`,
            url,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(url);
            }
        } catch {
            // User cancelled share
        }
    }, [profile.fullName, profile.username]);

    return (
        <div className="flex flex-col items-center space-y-4">
            {/* Avatar */}
            <div className="relative">
                <div className="h-24 w-24 rounded-full bg-secondary border-2 border-border overflow-hidden flex items-center justify-center">
                    {profile.profilePictureUrl ? (
                        <img
                            src={profile.profilePictureUrl}
                            alt={profile.fullName}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <User className="w-10 h-10 text-muted-foreground" />
                    )}
                </div>

                {/* Verified / rank badge */}
                <div className="absolute bottom-0 right-0 h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground border-2 border-background">
                    {rank ? (
                        <span className="text-[10px] font-black">#{rank}</span>
                    ) : (
                        <Shield className="w-4 h-4" />
                    )}
                </div>
            </div>

            {/* Name + subtitle */}
            <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{profile.fullName}</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {roleLabel[profile.role] || profile.role}
                    {(profile.city || profile.country) && (
                        <> • {[profile.city, profile.country].filter(Boolean).join(', ')}</>
                    )}
                </p>

                {/* Badges */}
                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                    {profile.battingHand && (
                        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-foreground">
                            {handLabel}
                        </span>
                    )}
                    <span className={`inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold ${tier.color}`}>
                        {tier.label}
                    </span>
                    {tournamentWins ? (
                        <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                            🏆 {tournamentWins}× Champion
                        </span>
                    ) : null}
                    {profile.jerseyNumber !== null && profile.jerseyNumber !== undefined && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                            <Hash className="w-3 h-3" />
                            {profile.jerseyNumber}
                        </span>
                    )}
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex w-full gap-3 pt-2">
                <button
                    onClick={() => navigate('/profile/edit')}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full shadow-sm shadow-primary/20 transition-colors active:scale-[0.98]"
                >
                    <Edit className="w-4 h-4" />
                    Edit Profile
                </button>
                <button
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium border border-border bg-card hover:bg-secondary h-10 px-4 py-2 w-full shadow-sm transition-colors active:scale-[0.98]"
                >
                    <Share2 className="w-4 h-4" />
                    Share
                </button>
            </div>
        </div>
    );
});

ProfileHeader.displayName = 'ProfileHeader';
