// =============================================================================
// Head-to-Head Comparison Page — Compare two players
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BattingStats {
    innings: number; runs: number; balls: number; fours: number; sixes: number;
    highestScore: number; average: number; strikeRate: number;
    fifties: number; hundreds: number; notOuts: number; ducks: number;
}

interface BowlingStats {
    innings: number; overs: number; maidens: number; runs: number; wickets: number;
    economy: number; average: number; bestFigures: string;
    fourWickets: number; fiveWickets: number; dotBalls: number;
}

interface PlayerSummary {
    id: string; fullName: string; username: string | null;
    profilePictureUrl: string | null; role: string | null;
    battingHand: string | null; bowlingStyle: string | null;
}

interface ComparisonResult {
    player1: PlayerSummary; player2: PlayerSummary;
    batting: { player1: BattingStats; player2: BattingStats };
    bowling: { player1: BowlingStats; player2: BowlingStats };
    matches: { player1Total: number; player2Total: number; sharedMatches: number };
    dateRange: { from: string | null; to: string | null };
}

interface SearchHit { id: string; title: string; subtitle: string | null; imageUrl: string | null; }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ComparePage = () => {
    const [player1Id, setPlayer1Id] = useState('');
    const [player2Id, setPlayer2Id] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [result, setResult] = useState<ComparisonResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Player search state
    const [search1, setSearch1] = useState('');
    const [search2, setSearch2] = useState('');
    const [hits1, setHits1] = useState<SearchHit[]>([]);
    const [hits2, setHits2] = useState<SearchHit[]>([]);
    const [player1Name, setPlayer1Name] = useState('');
    const [player2Name, setPlayer2Name] = useState('');

    const searchPlayers = useCallback(async (q: string, setter: (h: SearchHit[]) => void) => {
        if (q.length < 2) { setter([]); return; }
        try {
            const { data } = await api.get('/api/search', { params: { q, category: 'USER', limit: 5 } } as any);
            const res = data.data || data;
            setter(res.results || []);
        } catch { setter([]); }
    }, []);

    // Debounced player search
    useEffect(() => {
        const t = setTimeout(() => searchPlayers(search1, setHits1), 250);
        return () => clearTimeout(t);
    }, [search1, searchPlayers]);

    useEffect(() => {
        const t = setTimeout(() => searchPlayers(search2, setHits2), 250);
        return () => clearTimeout(t);
    }, [search2, searchPlayers]);

    const selectPlayer = (slot: 1 | 2, hit: SearchHit) => {
        if (slot === 1) { setPlayer1Id(hit.id); setPlayer1Name(hit.title); setSearch1(''); setHits1([]); }
        else { setPlayer2Id(hit.id); setPlayer2Name(hit.title); setSearch2(''); setHits2([]); }
    };

    const fetchComparison = async () => {
        if (!player1Id || !player2Id) { setError('Select both players'); return; }
        setLoading(true); setError(null);
        try {
            const params: Record<string, string> = { player1: player1Id, player2: player2Id };
            if (dateFrom) params.from = dateFrom;
            if (dateTo) params.to = dateTo;
            const { data } = await api.get('/api/compare', { params } as any);
            setResult(data.data || data);
        } catch { setError('Failed to load comparison'); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Head-to-Head</h1>

            {/* Player Selection */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'start',
            }}>
                <PlayerPicker
                    label="Player 1"
                    selectedName={player1Name}
                    searchValue={search1}
                    onSearchChange={setSearch1}
                    hits={hits1}
                    onSelect={h => selectPlayer(1, h)}
                    onClear={() => { setPlayer1Id(''); setPlayer1Name(''); }}
                />

                <div style={{
                    fontSize: 18, fontWeight: 800, color: 'var(--text-muted, #555)',
                    alignSelf: 'center', paddingTop: 28,
                }}>VS</div>

                <PlayerPicker
                    label="Player 2"
                    selectedName={player2Name}
                    searchValue={search2}
                    onSearchChange={setSearch2}
                    hits={hits2}
                    onSelect={h => selectPlayer(2, h)}
                    onClear={() => { setPlayer2Id(''); setPlayer2Name(''); }}
                />
            </div>

            {/* Date Filter */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary, #888)' }}>Season Filter:</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    style={dateInputStyle} />
                <span style={{ fontSize: 12, color: 'var(--text-muted, #555)' }}>to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    style={dateInputStyle} />
                <button onClick={fetchComparison} disabled={loading || !player1Id || !player2Id}
                    style={{
                        padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: 'var(--accent, #D7A65B)', color: '#0a0e1a',
                        fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                        opacity: (!player1Id || !player2Id) ? 0.4 : 1,
                    }}>
                    {loading ? 'Comparing...' : 'Compare'}
                </button>
            </div>

            {error && <p style={{ color: '#D96055', fontSize: 13 }}>{error}</p>}

            {/* Results */}
            {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Match Overview */}
                    <StatCard title="Matches">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', textAlign: 'center', gap: 8 }}>
                            <BigNum value={result.matches.player1Total} label={result.player1.fullName} />
                            <div style={{ alignSelf: 'center' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted, #555)' }}>Shared</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent, #D7A65B)' }}>
                                    {result.matches.sharedMatches}
                                </div>
                            </div>
                            <BigNum value={result.matches.player2Total} label={result.player2.fullName} />
                        </div>
                    </StatCard>

                    {/* Batting Comparison */}
                    <StatCard title="🏏 Batting">
                        <ComparisonTable
                            stats={BATTING_ROWS}
                            p1={result.batting.player1 as any}
                            p2={result.batting.player2 as any}
                            p1Name={result.player1.fullName}
                            p2Name={result.player2.fullName}
                        />
                    </StatCard>

                    {/* Bowling Comparison */}
                    <StatCard title="🎯 Bowling">
                        <ComparisonTable
                            stats={BOWLING_ROWS}
                            p1={result.bowling.player1 as any}
                            p2={result.bowling.player2 as any}
                            p1Name={result.player1.fullName}
                            p2Name={result.player2.fullName}
                        />
                    </StatCard>
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

const PlayerPicker = ({
    label, selectedName, searchValue, onSearchChange, hits, onSelect, onClear,
}: {
    label: string; selectedName: string; searchValue: string;
    onSearchChange: (v: string) => void; hits: SearchHit[];
    onSelect: (h: SearchHit) => void; onClear: () => void;
}) => (
    <div style={{ position: 'relative' }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #555)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {label}
        </label>
        {selectedName ? (
            <div style={{
                marginTop: 6, padding: '10px 14px', borderRadius: 10,
                background: 'var(--bg-card, #191B20)', border: '1px solid var(--border, #2A2D35)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{selectedName}</span>
                <button onClick={onClear} style={{
                    background: 'none', border: 'none', color: 'var(--text-secondary, #888)',
                    cursor: 'pointer', fontSize: 12,
                }}>✕</button>
            </div>
        ) : (
            <input
                type="text" value={searchValue} onChange={e => onSearchChange(e.target.value)}
                placeholder="Search player..."
                style={{
                    marginTop: 6, width: '100%', padding: '10px 14px', borderRadius: 10,
                    background: 'var(--bg-card, #191B20)', border: '1px solid var(--border, #2A2D35)',
                    color: 'var(--text-primary, #EBECEF)', fontSize: 13, fontFamily: 'inherit',
                    outline: 'none', boxSizing: 'border-box',
                }}
            />
        )}
        {hits.length > 0 && (
            <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: 'var(--bg-card, #24262D)', border: '1px solid var(--border, #2A2D35)',
                borderRadius: 10, marginTop: 4, overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
                {hits.map(h => (
                    <div key={h.id} onClick={() => onSelect(h)} style={{
                        padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                        borderBottom: '1px solid var(--border, #2A2D35)',
                    }}>
                        <div style={{ fontWeight: 600 }}>{h.title}</div>
                        {h.subtitle && <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)' }}>{h.subtitle}</div>}
                    </div>
                ))}
            </div>
        )}
    </div>
);

const StatCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{
        background: 'var(--bg-card, #191B20)', border: '1px solid var(--border, #2A2D35)',
        borderRadius: 14, overflow: 'hidden',
    }}>
        <div style={{
            padding: '12px 18px', borderBottom: '1px solid var(--border, #2A2D35)',
            fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            color: 'var(--text-muted, #666)',
        }}>{title}</div>
        <div style={{ padding: '4px 0' }}>{children}</div>
    </div>
);

const BigNum = ({ value, label }: { value: number; label: string }) => (
    <div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div>
        <div style={{
            fontSize: 11, color: 'var(--text-secondary, #888)', marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{label}</div>
    </div>
);

const ComparisonTable = ({ stats, p1, p2, p1Name, p2Name }: {
    stats: { key: string; label: string; higherIsBetter: boolean }[];
    p1: { [key: string]: unknown }; p2: { [key: string]: unknown };
    p1Name: string; p2Name: string;
}) => (
    <div>
        {/* Header */}
        <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '8px 18px',
            fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #555)', textTransform: 'uppercase',
        }}>
            <span style={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p1Name}</span>
            <span style={{ textAlign: 'center' }}>Stat</span>
            <span style={{ textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p2Name}</span>
        </div>
        {/* Rows */}
        {stats.map(({ key, label, higherIsBetter }) => {
            const v1 = p1[key] as number | string;
            const v2 = p2[key] as number | string;
            const n1 = typeof v1 === 'number' ? v1 : 0;
            const n2 = typeof v2 === 'number' ? v2 : 0;
            const p1Wins = higherIsBetter ? n1 > n2 : n1 < n2;
            const p2Wins = higherIsBetter ? n2 > n1 : n2 < n1;
            const tie = n1 === n2;

            return (
                <div key={key} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                    padding: '10px 18px', fontSize: 13,
                    borderTop: '1px solid var(--border, #2A2D35)',
                }}>
                    <span style={{
                        textAlign: 'left', fontWeight: 600,
                        color: !tie && p1Wins ? 'var(--accent, #D7A65B)' : 'var(--text-primary, #EBECEF)',
                    }}>{v1}</span>
                    <span style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-secondary, #888)', alignSelf: 'center' }}>
                        {label}
                    </span>
                    <span style={{
                        textAlign: 'right', fontWeight: 600,
                        color: !tie && p2Wins ? 'var(--accent, #D7A65B)' : 'var(--text-primary, #EBECEF)',
                    }}>{v2}</span>
                </div>
            );
        })}
    </div>
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATTING_ROWS = [
    { key: 'innings', label: 'Innings', higherIsBetter: true },
    { key: 'runs', label: 'Runs', higherIsBetter: true },
    { key: 'average', label: 'Average', higherIsBetter: true },
    { key: 'strikeRate', label: 'Strike Rate', higherIsBetter: true },
    { key: 'highestScore', label: 'Highest', higherIsBetter: true },
    { key: 'fifties', label: '50s', higherIsBetter: true },
    { key: 'hundreds', label: '100s', higherIsBetter: true },
    { key: 'fours', label: 'Fours', higherIsBetter: true },
    { key: 'sixes', label: 'Sixes', higherIsBetter: true },
    { key: 'notOuts', label: 'Not Outs', higherIsBetter: true },
    { key: 'ducks', label: 'Ducks', higherIsBetter: false },
];

const BOWLING_ROWS = [
    { key: 'innings', label: 'Innings', higherIsBetter: true },
    { key: 'wickets', label: 'Wickets', higherIsBetter: true },
    { key: 'average', label: 'Average', higherIsBetter: false },
    { key: 'economy', label: 'Economy', higherIsBetter: false },
    { key: 'bestFigures', label: 'Best', higherIsBetter: true },
    { key: 'overs', label: 'Overs', higherIsBetter: true },
    { key: 'maidens', label: 'Maidens', higherIsBetter: true },
    { key: 'fiveWickets', label: '5W Hauls', higherIsBetter: true },
    { key: 'fourWickets', label: '4W Hauls', higherIsBetter: true },
    { key: 'dotBalls', label: 'Dot Balls', higherIsBetter: true },
];

const dateInputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 8,
    background: 'var(--bg-card, #191B20)', border: '1px solid var(--border, #2A2D35)',
    color: 'var(--text-primary, #EBECEF)', fontSize: 12, fontFamily: 'inherit',
    outline: 'none',
};
