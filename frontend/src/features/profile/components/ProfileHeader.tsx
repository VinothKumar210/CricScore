import React, { useCallback } from 'react';
import type { UserProfile } from '../profileService';
import { User, MapPin, Hash, Shield, Share2 } from 'lucide-react';

interface ProfileHeaderProps {
    profile: UserProfile;
    matchCount: number;
    rank?: number;
    prestigeTier?: string;
    tournamentWins?: number;
}

/**
 * ProfileHeader — Hero section with avatar, name, rank badge, location, role.
 * Premium glassmorphism aesthetic.
 */
export const ProfileHeader: React.FC<ProfileHeaderProps> = React.memo(({ profile, matchCount, rank, prestigeTier, tournamentWins }) => {
    const roleLabel: Record<string, string> = {
        BATSMAN: '🏏 Batsman',
        BOWLER: '🎳 Bowler',
        ALL_ROUNDER: '⚡ All-Rounder',
        WICKET_KEEPER_BATSMAN: '🧤 Wicket-Keeper',
    };

    const handLabel = profile.battingHand === 'LEFT_HANDED' ? 'Left-handed' : 'Right-handed';

    const rankBadge = () => {
        if (!rank) return null;
        const colors: Record<number, string> = {
            1: 'from-amber-400 to-yellow-500 shadow-amber-300/40',
            2: 'from-gray-300 to-gray-400 shadow-gray-300/40',
            3: 'from-orange-400 to-amber-600 shadow-orange-300/40',
        };
        const bg = rank <= 3 ? colors[rank] : 'from-brand to-blue-600 shadow-brand/30';
        return (
            <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br ${bg}
                             flex items-center justify-center text-white text-xs font-black shadow-lg`}>
                #{rank}
            </div>
        );
    };

    // Prestige tier — use backend-computed if provided, else fallback to match count
    const tier = prestigeTier === 'Legend' ? { label: 'Legend', color: 'text-amber-500', icon: '👑' }
        : prestigeTier === 'Elite' ? { label: 'Elite', color: 'text-purple-500', icon: '💎' }
            : prestigeTier === 'Veteran' ? { label: 'Veteran', color: 'text-blue-500', icon: '⭐' }
                : prestigeTier === 'Rising' ? { label: 'Rising', color: 'text-green-500', icon: '🌱' }
                    : prestigeTier === 'Rookie' ? { label: 'Rookie', color: 'text-gray-400', icon: '🏷️' }
                        : matchCount >= 100 ? { label: 'Legend', color: 'text-amber-500', icon: '👑' }
                            : matchCount >= 50 ? { label: 'Elite', color: 'text-purple-500', icon: '💎' }
                                : matchCount >= 20 ? { label: 'Veteran', color: 'text-blue-500', icon: '⭐' }
                                    : matchCount >= 5 ? { label: 'Rising', color: 'text-green-500', icon: '🌱' }
                                        : { label: 'Rookie', color: 'text-gray-400', icon: '🏷️' };

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
        <div className="relative bg-gradient-to-br from-brand/10 via-brand/5 to-transparent
                        rounded-2xl p-6 border border-brand/10 overflow-hidden">
            {/* Decorative bg elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand/10 to-transparent
                            rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-amber-400/10 to-transparent
                            rounded-full blur-2xl" />

            <div className="relative flex items-start gap-5">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand to-brand/70
                                    flex items-center justify-center overflow-hidden ring-2 ring-brand/20 ring-offset-2">
                        {profile.profilePictureUrl ? (
                            <img
                                src={profile.profilePictureUrl}
                                alt={profile.fullName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <User className="w-10 h-10 text-white" />
                        )}
                    </div>
                    {rankBadge()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-xl font-black text-textPrimary truncate">{profile.fullName}</h1>
                        <span className={`text-base ${tier.color}`}>{tier.icon}</span>
                    </div>

                    {profile.username && (
                        <p className="text-xs text-textSecondary mb-2">@{profile.username}</p>
                    )}

                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        {/* Tournament Champion Title Badge */}
                        {tournamentWins ? (
                            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/20 text-amber-500
                                             rounded-full text-[10px] font-bold border border-amber-500/30 shadow-sm">
                                🏆 {tournamentWins}× Champion
                            </span>
                        ) : null}

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tier.color}
                                         bg-current/10 border border-current/20`}
                            style={{ background: 'rgba(0,0,0,0.04)' }}>
                            {tier.label}
                        </span>
                        <span className="px-2 py-0.5 bg-brand/10 text-brand rounded-full text-[10px] font-bold">
                            {roleLabel[profile.role] || profile.role}
                        </span>
                        {profile.jerseyNumber !== null && profile.jerseyNumber !== undefined && (
                            <span className="flex items-center gap-0.5 px-2 py-0.5 bg-surface
                                             rounded-full text-[10px] font-bold text-textSecondary
                                             border border-border/50">
                                <Hash className="w-2.5 h-2.5" />
                                {profile.jerseyNumber}
                            </span>
                        )}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-[10px] text-textSecondary">
                        {profile.battingHand && (
                            <span className="flex items-center gap-0.5">
                                <Shield className="w-2.5 h-2.5" />
                                {handLabel}
                            </span>
                        )}
                        {(profile.city || profile.country) && (
                            <span className="flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {[profile.city, profile.country].filter(Boolean).join(', ')}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Description + Share */}
            {profile.description && (
                <p className="mt-4 text-xs text-textSecondary leading-relaxed italic border-t
                              border-border/30 pt-3">
                    "{profile.description}"
                </p>
            )}

            {/* Share button */}
            <button
                onClick={handleShare}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 text-brand
                           rounded-full text-[11px] font-bold hover:bg-brand/20 transition-colors"
            >
                <Share2 className="w-3 h-3" />
                Share Profile
            </button>
        </div>
    );
});

ProfileHeader.displayName = 'ProfileHeader';
