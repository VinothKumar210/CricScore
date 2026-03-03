import { useMarketStore } from '../marketStore';
import { SlidersHorizontal, X } from 'lucide-react';

const OVERS = [10, 15, 20, 25, 30, 40, 50];
const RADII = [5, 10, 25, 50, 100];
const BALL_TYPES = ['TENNIS', 'LEATHER', 'TAPE', 'PLASTIC'];

export const MarketFilters = () => {
    const { filters, setFilters } = useMarketStore();

    const hasFilters = filters.overs || filters.ballType;

    return (
        <div className="bg-card rounded-xl border border-border p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Filters</h2>
                </div>
                {hasFilters && (
                    <button
                        onClick={() => setFilters({ radius: 25, overs: undefined, ballType: undefined })}
                        className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                        <X className="w-3 h-3" />
                        Clear
                    </button>
                )}
            </div>

            <div className="grid grid-cols-3 gap-3">
                {/* Radius */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Radius
                    </label>
                    <select
                        value={filters.radius || ''}
                        onChange={(e) => setFilters({ radius: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full h-9 rounded-lg bg-secondary border border-border px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none cursor-pointer"
                    >
                        {RADII.map(r => (
                            <option key={r} value={r}>{r} km</option>
                        ))}
                    </select>
                </div>

                {/* Overs */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Format
                    </label>
                    <select
                        value={filters.overs || ''}
                        onChange={(e) => setFilters({ overs: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full h-9 rounded-lg bg-secondary border border-border px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none cursor-pointer"
                    >
                        <option value="">Any</option>
                        {OVERS.map(o => (
                            <option key={o} value={o}>T{o}</option>
                        ))}
                    </select>
                </div>

                {/* Ball Type */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Ball
                    </label>
                    <select
                        value={filters.ballType || ''}
                        onChange={(e) => setFilters({ ballType: e.target.value || undefined })}
                        className="w-full h-9 rounded-lg bg-secondary border border-border px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none cursor-pointer"
                    >
                        <option value="">Any</option>
                        {BALL_TYPES.map(b => (
                            <option key={b} value={b}>{b.charAt(0) + b.slice(1).toLowerCase()}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};
