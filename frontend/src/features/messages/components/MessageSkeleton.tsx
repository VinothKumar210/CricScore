import React from 'react';

export const MessageSkeleton: React.FC = () => {
    return (
        <div className="flex flex-col space-y-4 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%] rounded-2xl px-4 py-2 bg-secondary dark:bg-card-800 animate-shimmer">
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};
