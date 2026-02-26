import React, { useState } from 'react';
import type { Invite } from '../inviteService';
import { useInviteStore } from '../inviteStore';
import { formatRelativeTime } from '../../../utils/dateUtils';
import { CalendarIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Props {
    invite: Invite;
}

export const InviteCard: React.FC<Props> = ({ invite }) => {
    const { activeTab, respondToInvite } = useInviteStore();
    const [isResponding, setIsResponding] = useState(false);
    const [isNew, setIsNew] = useState(true);

    React.useEffect(() => {
        const timer = setTimeout(() => setIsNew(false), 300);
        return () => clearTimeout(timer);
    }, []);

    // Derive active status indicator loosely without rewriting business rules
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
            case 'PENDING':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'ACCEPTED':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'DECLINED':
            case 'EXPIRED':
            case 'CLOSED':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white';
        }
    };

    const handleAction = async (status: 'ACCEPTED' | 'DECLINED') => {
        // Find our team role in responses if responding. Technically backend validates via token, but UI needs responderTeamId
        // The backend expects ANY valid teamId we own that was targeted. 
        // For simplicity, assuming backend extracts responder based on user JWT for strict match, 
        // BUT the endpoint requires `responderTeamId` body payload.
        // We will pass the target team Id from responses if present, or stub it if backend relaxes it.
        const myTeamResponse = invite.responses?.[0]; // Usually 1 target
        if (!myTeamResponse?.responderTeamId) return;

        setIsResponding(true);
        try {
            await respondToInvite(invite.id, myTeamResponse.responderTeamId, status);
            if (status === 'ACCEPTED') {
                toast.success('Invite accepted', { duration: 2000 });
            }
        } finally {
            // Loading flags always clear in finally, component remounts upon parent fetch
            setIsResponding(false);
        }
    };

    return (
        <div className={`bg-white dark:bg-card-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 transition-shadow hover:shadow-md ${isNew ? 'animate-slide-in' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    {/* Render Opponent depending on Context */}
                    <div className="h-12 w-12 rounded-full bg-brand-100 dark:bg-card-800 flex items-center justify-center shrink-0">
                        {invite.team.logoUrl ? (
                            <img src={invite.team.logoUrl} alt="Team" className="h-full w-full rounded-full object-cover" />
                        ) : (
                            <span className="text-brand-600 font-bold text-lg">{invite.team.name.charAt(0)}</span>
                        )}
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                            {invite.team.name}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Sent {formatRelativeTime(invite.createdAt)}
                        </span>
                    </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(invite.status)}`}>
                    {invite.status}
                </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                {invite.message || "We challenge you to a match!"}
            </p>

            <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-5 text-sm">
                {invite.preferredDate && (
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {new Date(invite.preferredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                )}
                {invite.overs && (
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        {invite.overs} Overs
                    </div>
                )}
                <div className="flex items-center text-gray-500 dark:text-gray-400 col-span-2">
                    <MapPinIcon className="h-4 w-4 mr-2 shrink-0" />
                    <span>Lat: {invite.latitude.toFixed(2)}, Lon: {invite.longitude.toFixed(2)}</span>
                </div>
            </div>

            {/* Action Buttons ONLY IF RECEIVED and ACTIVE/PENDING */}
            {activeTab === 'received' && invite.status === 'ACTIVE' && (
                <div className="flex items-center gap-3 border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
                    <button
                        onClick={() => handleAction('ACCEPTED')}
                        disabled={isResponding}
                        className="flex-1 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-all duration-150 focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                    >
                        {isResponding ? '...' : 'Accept'}
                    </button>
                    <button
                        onClick={() => handleAction('DECLINED')}
                        disabled={isResponding}
                        className="flex-1 bg-gray-100 dark:bg-card-800 hover:bg-gray-200 dark:hover:bg-card-700 active:scale-[0.98] hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50 text-gray-700 dark:text-white font-medium py-2 px-4 rounded-lg transition-all duration-150"
                    >
                        Decline
                    </button>
                </div>
            )}
        </div>
    );
};
