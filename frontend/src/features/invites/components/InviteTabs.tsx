import React from 'react';
import { useInviteStore } from '../inviteStore';

export const InviteTabs: React.FC = () => {
    const { activeTab, setTab, received, sent } = useInviteStore();

    return (
        <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-800 mb-6">
            <button
                onClick={() => setTab('received')}
                className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors duration-200 ${activeTab === 'received'
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
            >
                {received.filter(i => i.responses && i.responses.some(r => r.status === 'PENDING')).length > 0 && (
                    <span className="ml-2 bg-gray-100 dark:bg-card-800 text-gray-600 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
                        {received.filter(i => i.responses && i.responses.some(r => r.status === 'PENDING')).length}
                    </span>
                )}
            </button>
            <button
                onClick={() => setTab('sent')}
                className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors duration-200 ${activeTab === 'sent'
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
            >
                {sent.filter(i => i.responses && i.responses.some(r => r.status === 'PENDING')).length > 0 && (
                    <span className="ml-2 bg-gray-100 dark:bg-card-800 text-gray-600 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
                        {sent.filter(i => i.responses && i.responses.some(r => r.status === 'PENDING')).length}
                    </span>
                )}
            </button>
        </div>
    );
};
