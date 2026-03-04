// =============================================================================
// Leaderboard Page — Multi-category, multi-scope cricket rankings
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import { Container } from '../../../components/ui/Container';
import { Loader2, Trophy, User } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category = 'runs' | 'wickets' | 'strikeRate' | 'economy' | 'impact';
type Scope = 'global' | 'city' | 'team';

interface LeaderboardEntry {
    rank: number;
    userId: string;
    name: string;
    username: string | null;
    profilePictureUrl: string | null;
    city: string | null;
    value: number;
    category: string;
    matches: number;
    _sum?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: { key: Category; label: string; icon: string; unit: string; lowerBetter?: boolean }[] = [
    { key: 'runs', label: 'Runs', icon: '🏏', unit: 'runs' },
    { key: 'wickets', label: 'Wickets', icon: '🎯', unit: 'wkts' },
    { key: 'strikeRate', label: 'Strike Rate', icon: '⚡', unit: 'SR' },
    { key: 'economy', label: 'Economy', icon: '🔒', unit: 'econ', lowerBetter: true },
    { key: 'impact', label: 'Impact', icon: '⭐', unit: 'pts' },
];

const SCOPES: { key: Scope; label: string }[] = [
    { key: 'global', label: '🌍 Global' },
    { key: 'city', label: '🏙️ My City' },
    { key: 'team', label: '🛡️ My Team' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const LeaderboardPage = () => {
    const navigate = useNavigate();
    const [category, setCategory] = useState<Category>('runs');
    const [scope, setScope] = useState<Scope>('global');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async (cat: Category, sc: Scope) => {
        setLoading(true);
        try {
            const params: Record<string, string> = { category: cat, scope: sc, limit: '30' };
            const { data } = await api.get('/api/stats/leaderboard', { params } as any);
            setEntries(data.data || data || []);
        } catch {
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(category, scope);
    }, [category, scope, fetchData]);

    const changeCategory = (cat: Category) => { setCategory(cat); };
    const changeScope = (sc: Scope) => { setScope(sc); };

    const catMeta = CATEGORIES.find(c => c.key === category)!;
    const top3 = entries.slice(0, 3);
    const rest = entries.slice(3);

    return (
        <Container className="py-4 space-y-5 pb-24">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" />
                <h1 className="text-xl font-black text-foreground">Leaderboard</h1>
            </div>

            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.key}
                        onClick={() => changeCategory(cat.key)}
                        style={{
                            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                            fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
                            border: '1px solid',
                            borderColor: category === cat.key ? 'var(--accent, #D7A65B)' : 'var(--border, #2A2D35)',
                            background: category === cat.key ? 'rgba(215,166,91,0.12)' : 'transparent',
                            color: category === cat.key ? 'var(--accent, #D7A65B)' : 'var(--text-secondary, #888)',
                            transition: 'all 0.15s',
                        }}
                    >
                        {cat.icon} {cat.label}
                    </button>
                ))}
            </div>

            {/* Scope Tabs */}
            <div style={{ display: 'flex', gap: 6 }}>
                {SCOPES.map(sc => (
                    <button
                        key={sc.key}
                        onClick={() => changeScope(sc.key)}
                        style={{
                            padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                            fontFamily: 'inherit', cursor: 'pointer',
                            border: 'none',
                            background: scope === sc.key ? 'var(--bg-card, #191B20)' : 'transparent',
                            color: scope === sc.key ? 'var(--text-primary, #EBECEF)' : 'var(--text-secondary, #666)',
                            transition: 'all 0.15s',
                        }}
                    >
                        {sc.label}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading rankings...</p>
                </div>
            )}

            {/* Empty */}
            {!loading && entries.length === 0 && (
                <div style={{
                    textAlign: 'center', padding: '48px 20px',
                    color: 'var(--text-secondary, #888)',
                }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>No ranked players yet</p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>Play more matches to qualify for this leaderboard</p>
                </div>
            )}

            {/* Top 3 Podium */}
            {!loading && top3.length > 0 && (
                <div style={{
                    display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
                    gap: 12, padding: '16px 0',
                }}>
                    {/* 2nd Place */}
                    {top3[1] && (
                        <PodiumCard
                            entry={top3[1]}
                            medal="🥈"
                            height={100}
                            gradientFrom="#C0C0C0"
                            gradientTo="#A9A9A9"
                            unit={catMeta.unit}
                            onClick={() => top3[1].username && navigate(`/u/${top3[1].username}`)}
                        />
                    )}

                    {/* 1st Place */}
                    {top3[0] && (
                        <PodiumCard
                            entry={top3[0]}
                            medal="🥇"
                            height={130}
                            gradientFrom="#FFD700"
                            gradientTo="#FFA500"
                            unit={catMeta.unit}
                            onClick={() => top3[0].username && navigate(`/u/${top3[0].username}`)}
                        />
                    )}

                    {/* 3rd Place */}
                    {top3[2] && (
                        <PodiumCard
                            entry={top3[2]}
                            medal="🥉"
                            height={80}
                            gradientFrom="#CD7F32"
                            gradientTo="#8B4513"
                            unit={catMeta.unit}
                            onClick={() => top3[2].username && navigate(`/u/${top3[2].username}`)}
                        />
                    )}
                </div>
            )}

            {/* Remaining List */}
            {!loading && rest.length > 0 && (
                <div style={{
                    background: 'var(--bg-card, #191B20)',
                    border: '1px solid var(--border, #2A2D35)',
                    borderRadius: 14, overflow: 'hidden',
                }}>
                    {rest.map((entry, idx) => (
                        <div
                            key={entry.userId}
                            onClick={() => entry.username && navigate(`/u/${entry.username}`)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '12px 16px', cursor: 'pointer',
                                borderBottom: idx < rest.length - 1 ? '1px solid var(--border, #2A2D35)' : 'none',
                                transition: 'background 0.15s',
                            }}
                        >
                            {/* Rank */}
                            <span style={{
                                width: 28, textAlign: 'center', fontSize: 13,
                                fontWeight: 800, color: 'var(--text-secondary, #888)',
                                fontVariantNumeric: 'tabular-nums',
                            }}>
                                #{entry.rank}
                            </span>

                            {/* Avatar */}
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: entry.profilePictureUrl
                                    ? `url(${entry.profilePictureUrl}) center/cover`
                                    : 'var(--bg-card, #24262D)',
                                border: '1px solid var(--border, #2A2D35)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, overflow: 'hidden',
                            }}>
                                {!entry.profilePictureUrl && <User size={14} color="#888" />}
                            </div>

                            {/* Name */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: 13, fontWeight: 700,
                                    color: 'var(--text-primary, #EBECEF)',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {entry.name}
                                </div>
                                {entry.username && (
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary, #666)' }}>
                                        @{entry.username}
                                    </div>
                                )}
                            </div>

                            {/* Value */}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <span style={{
                                    fontSize: 16, fontWeight: 800,
                                    color: 'var(--accent, #D7A65B)',
                                    fontVariantNumeric: 'tabular-nums',
                                }}>
                                    {entry.value}
                                </span>
                                <div style={{ fontSize: 9, color: 'var(--text-secondary, #666)', textTransform: 'uppercase' }}>
                                    {catMeta.unit}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Container>
    );
};

// ---------------------------------------------------------------------------
// Podium Card
// ---------------------------------------------------------------------------

const PodiumCard = ({
    entry, medal, height, gradientFrom, gradientTo, unit, onClick,
}: {
    entry: LeaderboardEntry;
    medal: string;
    height: number;
    gradientFrom: string;
    gradientTo: string;
    unit: string;
    onClick: () => void;
}) => (
    <div
        onClick={onClick}
        style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            cursor: 'pointer', width: 100,
        }}
    >
        {/* Medal */}
        <div style={{ fontSize: 28, marginBottom: 4 }}>{medal}</div>

        {/* Avatar */}
        <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: entry.profilePictureUrl
                ? `url(${entry.profilePictureUrl}) center/cover`
                : 'var(--bg-card, #24262D)',
            border: `2px solid ${gradientFrom}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', marginBottom: 6,
        }}>
            {!entry.profilePictureUrl && <User size={18} color="#888" />}
        </div>

        {/* Name */}
        <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-primary, #EBECEF)',
            textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden',
            textOverflow: 'ellipsis', width: '100%',
        }}>
            {entry.name}
        </div>

        {/* Podium Block */}
        <div style={{
            marginTop: 6, width: '100%', height, borderRadius: '10px 10px 0 0',
            background: `linear-gradient(180deg, ${gradientFrom}22, ${gradientTo}11)`,
            border: `1px solid ${gradientFrom}44`,
            borderBottom: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 2,
        }}>
            <span style={{
                fontSize: 20, fontWeight: 900,
                color: gradientFrom,
                fontVariantNumeric: 'tabular-nums',
            }}>
                {entry.value}
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-secondary, #666)', textTransform: 'uppercase' }}>
                {unit}
            </span>
        </div>
    </div>
);
