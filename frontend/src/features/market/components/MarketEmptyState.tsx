import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

export const MarketEmptyState: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="h-16 w-16 bg-brand-50 dark:bg-card-800 rounded-full flex items-center justify-center mb-4">
                <SparklesIcon className="h-8 w-8 text-brand-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No matches found in this area.
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                Try increasing radius or resetting your search formats to discover more teams nearby.
            </p>
        </div>
    );
};
