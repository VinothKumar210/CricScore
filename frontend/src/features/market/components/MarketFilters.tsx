import React from 'react';
import { useMarketStore } from '../marketStore';
import { MapPinIcon, FunnelIcon } from '@heroicons/react/24/outline';

const OVERS = [10, 15, 20, 25, 30, 40, 50];
const RADII = [5, 10, 25, 50, 100]; // km
const BALL_TYPES = ['TENNIS', 'LEATHER', 'TAPE', 'PLASTIC'];

export const MarketFilters: React.FC = () => {
    const { filters, setFilters } = useMarketStore();

    return (
        <div className="bg-white dark:bg-card-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                    <FunnelIcon className="h-5 w-5 text-brand-500" />
                    <h2>Discover Settings</h2>
                </div>
                <button
                    onClick={() => setFilters({ radius: 25, overs: undefined, ballType: undefined })}
                    className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                >
                    Clear Filters
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Distance Filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Search Radius (km)
                    </label>
                    <div className="relative">
                        <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            value={filters.radius || ''}
                            onChange={(e) => setFilters({ radius: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-card-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-brand-500 dark:text-white"
                        >
                            {RADII.map(r => (
                                <option key={r} value={r}>{r} km</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Overs Filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Format (Overs)
                    </label>
                    <select
                        value={filters.overs || ''}
                        onChange={(e) => setFilters({ overs: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-card-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-brand-500 dark:text-white"
                    >
                        <option value="">Any Format</option>
                        {OVERS.map(o => (
                            <option key={o} value={o}>T{o}</option>
                        ))}
                    </select>
                </div>

                {/* Ball Type Filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Ball Type
                    </label>
                    <select
                        value={filters.ballType || ''}
                        onChange={(e) => setFilters({ ballType: e.target.value || undefined })}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-card-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-brand-500 dark:text-white"
                    >
                        <option value="">Any Ball</option>
                        {BALL_TYPES.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};
