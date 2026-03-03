import React from 'react';

export const MessageSkeleton: React.FC = () => {
    return (
        <div className="flex flex-col space-y-4 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-secondary animate-pulse">
                        <div className="h-3 w-28 bg-border rounded mb-2" />
                        <div className="h-3 w-44 bg-border rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
};
