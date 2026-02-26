import React from 'react';

export const MarketSkeleton: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(key => (
                <div key={key} className="bg-card dark:bg-card-900 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 animate-shimmer"></div>
                            <div className="space-y-2">
                                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-shimmer"></div>
                                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-shimmer"></div>
                            </div>
                        </div>
                        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-800 rounded-full animate-shimmer"></div>
                    </div>

                    <div className="space-y-3 mb-5">
                        <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded animate-shimmer"></div>
                        <div className="h-3 w-4/5 bg-gray-200 dark:bg-gray-800 rounded animate-shimmer"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-shimmer"></div>
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-shimmer"></div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                        <div className="h-9 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-shimmer"></div>
                    </div>
                </div>
            ))}
        </div >
    );
};
