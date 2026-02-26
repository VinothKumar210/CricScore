// =============================================================================
// Global Search Page — Search across Users, Teams, Matches, Tournaments
// =============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResult {
    id: string;
    type: 'USER' | 'TEAM' | 'MATCH' | 'TOURNAMENT';
    title: string;
    subtitle: string | null;
    imageUrl: string | null;
    metadata: Record<string, unknown>;
}

interface SearchResponse {
    query: string;
    results: SearchResult[];
    categories: {
        users: number;
        teams: number;
        matches: number;
        tournaments: number;
    };
    total: number;
    hasMore: boolean;
}

type Category = 'ALL' | 'USER' | 'TEAM' | 'MATCH' | 'TOURNAMENT';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SearchPage = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState<Category>('ALL');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Auto-focus search input
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Debounced search
    const handleSearch = useCallback((q: string, cat: Category) => {
        setQuery(q);
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (q.trim().length < 2) {
            setResults(null);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const params: Record<string, string> = { q: q.trim() };
                if (cat !== 'ALL') params.category = cat;
                const { data } = await api.get('/api/search', { params } as any);
                setResults(data.data || data);
            } catch {
                setResults(null);
            } finally {
                setLoading(false);
            }
        }, 300);
    }, []);

    const changeCategory = (cat: Category) => {
        setActiveCategory(cat);
        handleSearch(query, cat);
    };

    const handleResultClick = (r: SearchResult) => {
        switch (r.type) {
            case 'USER': navigate(`/profile/${r.id}`); break;
            case 'TEAM': navigate(`/teams/${r.id}`); break;
            case 'MATCH': navigate(`/match/${r.id}`); break;
            case 'TOURNAMENT': navigate(`/tournaments/${r.id}`); break;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Search Input */}
            <div style={{
                position: 'relative',
                background: 'var(--bg-card, #191B20)',
                border: '1px solid var(--border, #2A2D35)',
                borderRadius: 14, overflow: 'hidden',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                }}>
                    <span style={{ fontSize: 18, color: 'var(--text-secondary, #888)', flexShrink: 0 }}>🔍</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => handleSearch(e.target.value, activeCategory)}
                        placeholder="Search players, teams, matches..."
                        style={{
                            flex: 1, background: 'transparent', border: 'none', outline: 'none',
                            fontSize: 15, color: 'var(--text-primary, #EBECEF)', fontFamily: 'inherit',
                        }}
                    />
                    {query && (
                        <button
                            onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }}
                            style={{
                                background: 'var(--bg-surface, #24262D)', border: 'none',
                                borderRadius: '50%', width: 24, height: 24, cursor: 'pointer',
                                color: 'var(--text-secondary, #888)', fontSize: 12,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >✕</button>
                    )}
                </div>
            </div>

            {/* Category Tabs */}
            {results && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {CATEGORIES.map(cat => {
                        const count = cat.key === 'ALL'
                            ? results.total
                            : results.categories[cat.countKey as keyof typeof results.categories] || 0;
                        const isActive = activeCategory === cat.key;

                        return (
                            <button
                                key={cat.key}
                                onClick={() => changeCategory(cat.key as Category)}
                                style={{
                                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                    fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
                                    border: '1px solid',
                                    borderColor: isActive ? 'var(--accent, #D7A65B)' : 'var(--border, #2A2D35)',
                                    background: isActive ? 'rgba(215,166,91,0.12)' : 'transparent',
                                    color: isActive ? 'var(--accent, #D7A65B)' : 'var(--text-secondary, #888)',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {cat.icon} {cat.label} {count > 0 && `(${count})`}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary, #888)', fontSize: 13 }}>
                    Searching...
                </div>
            )}

            {/* Results */}
            {results && !loading && (
                <>
                    {results.results.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '40px 20px',
                            color: 'var(--text-secondary, #888)',
                        }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                            <p style={{ fontSize: 14, fontWeight: 500 }}>No results for "{results.query}"</p>
                            <p style={{ fontSize: 12, marginTop: 4 }}>Try different keywords or check spelling</p>
                        </div>
                    ) : (
                        <div style={{
                            background: 'var(--bg-card, #191B20)',
                            border: '1px solid var(--border, #2A2D35)',
                            borderRadius: 14, overflow: 'hidden',
                        }}>
                            {results.results.map((r, idx) => (
                                <ResultRow
                                    key={`${r.type}-${r.id}`}
                                    result={r}
                                    onClick={() => handleResultClick(r)}
                                    isLast={idx === results.results.length - 1}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Initial state */}
            {!results && !loading && query.length < 2 && (
                <div style={{
                    textAlign: 'center', padding: '60px 20px',
                    color: 'var(--text-secondary, #888)',
                }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary, #EBECEF)' }}>
                        Search CricScore
                    </p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>
                        Find players, teams, matches, and tournaments
                    </p>
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Result Row
// ---------------------------------------------------------------------------

const ResultRow = ({
    result: r,
    onClick,
    isLast,
}: {
    result: SearchResult;
    onClick: () => void;
    isLast: boolean;
}) => {
    const typeConfig = TYPE_CONFIG[r.type];

    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', cursor: 'pointer',
                borderBottom: isLast ? 'none' : '1px solid var(--border, #2A2D35)',
                transition: 'background 0.15s',
            }}
        >
            {/* Avatar / Icon */}
            <div style={{
                width: 42, height: 42, borderRadius: r.type === 'USER' ? '50%' : 10,
                background: r.imageUrl
                    ? `url(${r.imageUrl}) center/cover`
                    : 'var(--bg-surface, #24262D)',
                border: '1px solid var(--border, #2A2D35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0, overflow: 'hidden',
            }}>
                {!r.imageUrl && typeConfig.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 14, fontWeight: 600,
                    color: 'var(--text-primary, #EBECEF)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {r.title}
                </div>
                {r.subtitle && (
                    <div style={{
                        fontSize: 12, color: 'var(--text-secondary, #888)', marginTop: 2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {r.subtitle}
                    </div>
                )}
            </div>

            {/* Type Badge */}
            <span style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 6,
                background: typeConfig.bgColor, color: typeConfig.textColor,
                flexShrink: 0,
            }}>
                {typeConfig.label}
            </span>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
    { key: 'ALL', label: 'All', icon: '📋', countKey: 'total' },
    { key: 'USER', label: 'Players', icon: '👤', countKey: 'users' },
    { key: 'TEAM', label: 'Teams', icon: '🏏', countKey: 'teams' },
    { key: 'MATCH', label: 'Matches', icon: '⚔️', countKey: 'matches' },
    { key: 'TOURNAMENT', label: 'Tournaments', icon: '🏆', countKey: 'tournaments' },
];

const TYPE_CONFIG: Record<string, { icon: string; label: string; bgColor: string; textColor: string }> = {
    USER: { icon: '👤', label: 'Player', bgColor: 'rgba(99,179,237,0.12)', textColor: '#63B3ED' },
    TEAM: { icon: '🏏', label: 'Team', bgColor: 'rgba(72,187,120,0.12)', textColor: '#48BB78' },
    MATCH: { icon: '⚔️', label: 'Match', bgColor: 'rgba(237,137,54,0.12)', textColor: '#ED8936' },
    TOURNAMENT: { icon: '🏆', label: 'Tournament', bgColor: 'rgba(159,122,234,0.12)', textColor: '#9F7AEA' },
};
