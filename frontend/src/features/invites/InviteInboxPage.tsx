import React, { useEffect } from 'react';
import { useInviteStore } from './inviteStore';
import { InviteTabs } from './components/InviteTabs';
import { InviteEmptyState } from './components/InviteEmptyState';
import { InviteCard } from './components/InviteCard';
import { RefreshCw } from 'lucide-react';
import { useInviteSocket } from './useInviteSocket';

export const InviteInboxPage: React.FC = () => {
    const { activeTab, received, sent, isLoading, error, fetchInvites } = useInviteStore();

    useInviteSocket();

    // Initial fetch depends on activeTab
    useEffect(() => {
        fetchInvites(activeTab);
    }, [activeTab, fetchInvites]);

    const displayList = activeTab === 'received' ? received : sent;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">My Invites</h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Manage incoming challenges and track your sent requests.
                </p>
            </div>

            <InviteTabs />

            {error && (
                <div className="p-4 mb-6 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm">
                    {error}
                </div>
            )}

            {isLoading && displayList.length === 0 ? (
                <div className="py-20 flex justify-center">
                    <RefreshCw className="h-8 w-8 text-brand-500 animate-spin" />
                </div>
            ) : displayList.length > 0 ? (
                <div className="space-y-4 relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-card-950/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                            <RefreshCw className="h-8 w-8 text-brand-500 animate-spin" />
                        </div>
                    )}
                    {displayList.map(invite => (
                        <InviteCard key={invite.id} invite={invite} />
                    ))}
                </div>
            ) : (
                <InviteEmptyState />
            )}
        </div>
    );
};
