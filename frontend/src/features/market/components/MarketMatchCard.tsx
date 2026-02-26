import React, { useState } from 'react';
import { MarketMatch } from '../marketService';
import { useMarketStore } from '../marketStore';
import { CalendarIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';


interface Props {
    match: MarketMatch;
    currentTeamId?: string; // Passed down from context/selector in the future
}

export const MarketMatchCard: React.FC<Props> = ({ match, currentTeamId = 'temp-team-id' }) => {
    const { sendMatchInvite } = useMarketStore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Derived strictly visually from Server State
    const myResponse = match.responses?.find(r => r.responderTeamId === currentTeamId);

    let buttonState: 'INVITE' | 'SENT' | 'JOINED' | 'FULL' = 'INVITE';
    if (myResponse) {
        if (myResponse.status === 'ACCEPTED') buttonState = 'JOINED';
        else if (myResponse.status === 'PENDING') buttonState = 'SENT';
    } else if (match.status === 'CLOSED') {
        buttonState = 'FULL'; // Closed effectively implies fullness in a bilateral challenge
    }

    const handleInvite = async () => {
        if (buttonState !== 'INVITE' || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await sendMatchInvite(match, currentTeamId);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-card-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 transition-shadow hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-brand-100 dark:bg-card-800 flex items-center justify-center shrink-0">
                        {match.team.logoUrl ? (
                            <img src={match.team.logoUrl} alt="Team" className="h-full w-full rounded-full object-cover" />
                        ) : (
                            <span className="text-brand-600 font-bold text-lg">{match.team.name.charAt(0)}</span>
                        )}
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                            {match.team.name}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {match.team.reliability !== undefined ? `Reliability: ${match.team.reliability}%` : 'New Team'}
                        </span>
                    </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-card-800 dark:text-blue-400">
                    {match.ballType ? match.ballType.charAt(0) + match.ballType.slice(1).toLowerCase() : 'Any'} Ball
                </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                {match.message || "Looking for a competitive match this weekend."}
            </p>

            <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-5 text-sm">
                <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {match.preferredDate ? new Date(match.preferredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Any Date'}
                </div>
                <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    {match.overs ? `${match.overs} Overs` : 'Any Overs'}
                </div>
                <div className="flex items-center text-gray-500 dark:text-gray-400 col-span-2">
                    <MapPinIcon className="h-4 w-4 mr-2 shrink-0" />
                    <span>~{Math.round(match.radius || 0)}km away</span>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <button
                    onClick={handleInvite}
                    disabled={buttonState !== 'INVITE' || isSubmitting}
                    className={`font-medium py-2 px-6 rounded-lg transition-all duration-150 focus:ring-2 focus:ring-offset-2 ${buttonState === 'INVITE'
                        ? 'bg-brand-600 hover:bg-brand-700 active:scale-[0.98] hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50 text-white focus:ring-brand-500'
                        : 'bg-gray-100 text-gray-500 dark:bg-card-800 dark:text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {isSubmitting ? 'Sending...' : buttonState === 'SENT' ? 'Invite Sent' : buttonState === 'JOINED' ? 'Joined' : buttonState === 'FULL' ? 'Match Full' : 'Invite'}
                </button>
            </div>
        </div>
    );
};
