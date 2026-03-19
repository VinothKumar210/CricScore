import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, X } from 'lucide-react';
import { api } from '../../lib/api';
import { ComparisonRadar } from '../../components/ComparisonRadar';
import type { RadarDataPoint } from '../../components/ComparisonRadar';
import toast from 'react-hot-toast';

export const PlayerComparisonPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [player1Id, _setPlayer1Id] = useState(searchParams.get('player1') || '');
    const [player2Id, setPlayer2Id] = useState(searchParams.get('player2') || '');
    
    const [player1Stats, setPlayer1Stats] = useState<any>(null);
    const [player2Stats, setPlayer2Stats] = useState<any>(null);
    const [h2h, setH2H] = useState<any>(null);
    
    // Simplistic search state for demo
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    useEffect(() => {
        if (player1Id) fetchStats(player1Id, 1);
        if (player2Id) fetchStats(player2Id, 2);
    }, [player1Id, player2Id]);

    useEffect(() => {
        if (player1Id && player2Id) {
            fetchH2H(player1Id, player2Id);
        }
    }, [player1Id, player2Id]);

    const fetchStats = async (id: string, slot: 1 | 2) => {
        try {
            const res = await api.get(`/stats/career/${id}`);
            if (slot === 1) setPlayer1Stats(res.data.career);
            if (slot === 2) setPlayer2Stats(res.data.career);
        } catch (err) {
            console.error('Failed to load stats for', id);
        }
    };
    
    const fetchH2H = async (p1: string, p2: string) => {
        try {
            const res = await api.get(`/stats/h2h?batsmanId=${p1}&bowlerId=${p2}`);
            setH2H(res.data.h2h);
        } catch (err) {
            console.error('Failed to load h2h');
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        try {
            const res = await api.get(`/search/users?q=${searchQuery}`);
            setSearchResults(res.data.users || []);
        } catch (err) {
            toast.error('Search failed');
        }
    };

    const normalize = (val1: number, val2: number, max: number = 100) => {
        const highest = Math.max(val1, val2);
        if (highest === 0) return { n1: 0, n2: 0 };
        return {
            n1: (val1 / highest) * max,
            n2: (val2 / highest) * max
        };
    };

    const generateRadarData = (): RadarDataPoint[] => {
        if (!player1Stats || !player2Stats) return [];
        
        const avg = normalize(player1Stats.battingAverage || 0, player2Stats.battingAverage || 0);
        const sr = normalize(player1Stats.battingSR || 0, player2Stats.battingSR || 0);
        const hs = normalize(player1Stats.highestScore || 0, player2Stats.highestScore || 0);
        const wkts = normalize(player1Stats.totalWickets || 0, player2Stats.totalWickets || 0);
        
        // Economy is better when lower. We invert it for the chart.
        const e1 = player1Stats.bowlingEconomy || 10;
        const e2 = player2Stats.bowlingEconomy || 10;
        const econ = normalize(20 - e1, 20 - e2); 

        return [
            { metric: 'Avg', player1: avg.n1, player2: avg.n2, fullMark: 100 },
            { metric: 'SR', player1: sr.n1, player2: sr.n2, fullMark: 100 },
            { metric: 'High Score', player1: hs.n1, player2: hs.n2, fullMark: 100 },
            { metric: 'Wickets', player1: wkts.n1, player2: wkts.n2, fullMark: 100 },
            { metric: 'Economy', player1: econ.n1, player2: econ.n2, fullMark: 100 },
        ];
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-background">
            <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold text-foreground">Compare Players</h1>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* Selection Area */}
                <div className="flex gap-4 items-center justify-between">
                    <div className="flex-1 bg-card border border-primary/30 p-3 rounded-xl text-center">
                        <div className="text-xs text-muted-foreground uppercase mb-1">Player 1</div>
                        <div className="font-bold text-primary truncate">
                            {player1Stats ? player1Stats.playerName : player1Id || 'Select'}
                        </div>
                    </div>
                    <div className="text-muted-foreground font-black italic">VS</div>
                    <div className="flex-1 bg-card border border-amber-500/30 p-3 rounded-xl text-center">
                        <div className="text-xs text-muted-foreground uppercase mb-1">Player 2</div>
                        <div className="font-bold text-amber-500 truncate">
                            {player2Stats ? player2Stats.playerName : 'Select Opponent'}
                        </div>
                    </div>
                </div>

                {!player2Stats && (
                    <div className="bg-card border border-border p-4 rounded-xl">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Search by name or phone..."
                                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <button onClick={handleSearch} className="bg-primary text-primary-foreground p-2 rounded-lg">
                                <Search className="w-5 h-5" />
                            </button>
                        </div>
                        {searchResults.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {searchResults.map(u => (
                                    <div key={u.id} 
                                        onClick={() => setPlayer2Id(u.id)}
                                        className="p-3 bg-secondary rounded-lg flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
                                    >
                                        <div className="font-medium text-foreground">{u.name}</div>
                                        <div className="text-xs text-muted-foreground">{u.phoneNumber}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Radar Chart */}
                {player1Stats && player2Stats && (
                    <section>
                        <h2 className="text-base font-bold mb-3 px-1">Attribute Comparison</h2>
                        <ComparisonRadar 
                            data={generateRadarData()} 
                            player1Name={player1Stats.playerName}
                            player2Name={player2Stats.playerName}
                        />

                        {/* Direct H2H if played against each other */}
                        {h2h && h2h.balls > 0 && (
                            <div className="mt-6 bg-card border border-border p-4 rounded-xl text-center">
                                <h3 className="font-bold text-sm mb-2">Direct Face-off</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    <span className="font-semibold text-foreground">{h2h.batsmanName}</span> vs <span className="font-semibold text-foreground">{h2h.bowlerName}</span>
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-secondary p-2 rounded-lg">
                                        <div className="text-xs text-muted-foreground">Runs</div>
                                        <div className="font-bold">{h2h.runs}</div>
                                    </div>
                                    <div className="bg-secondary p-2 rounded-lg">
                                        <div className="text-xs text-muted-foreground">Balls</div>
                                        <div className="font-bold">{h2h.balls}</div>
                                    </div>
                                    <div className="bg-secondary p-2 rounded-lg text-destructive">
                                        <div className="text-xs">Dismissals</div>
                                        <div className="font-bold">{h2h.dismissals}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <button 
                            onClick={() => {
                                setPlayer2Id(''); 
                                setPlayer2Stats(null); 
                                setSearchResults([]);
                            }}
                            className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-secondary text-foreground rounded-xl font-medium"
                        >
                            <X className="w-4 h-4" /> Change Opponent
                        </button>
                    </section>
                )}
            </main>
        </div>
    );
};
