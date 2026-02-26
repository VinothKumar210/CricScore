import React from 'react';
import { InboxIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useInviteStore } from '../inviteStore';

export const InviteEmptyState: React.FC = () => {
    const { activeTab } = useInviteStore();

    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-16 w-16 bg-brand-50 dark:bg-card-800 rounded-full flex items-center justify-center mb-4">
                {activeTab === 'received' ? (
                    <InboxIcon className="h-8 w-8 text-brand-500" />
                ) : (
                    <PaperAirplaneIcon className="h-8 w-8 text-brand-500" />
                )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {activeTab === 'received' ? 'No pending invites' : 'No sent invites'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                {activeTab === 'received'
                    ? "When other teams challenge you, their invites will appear here."
                    : "You haven't challenged any teams recently. Go to a team's profile to issue a challenge."}
            </p>
        </div>
    );
};
