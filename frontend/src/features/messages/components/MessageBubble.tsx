import React from 'react';
import type { Message } from '../messageService';
import { formatRelativeTime } from '../../../utils/dateUtils';
import { useAuthStore } from '../../../store/authStore';
import { Check, Clock, AlertCircle } from 'lucide-react';

interface Props {
    message: Message;
    onRetry?: (message: Message) => void;
}

export const MessageBubble: React.FC<Props> = React.memo(({ message, onRetry }) => {
    const currentUser = useAuthStore(state => state.user);
    const isMine = currentUser?.id === message.senderId;

    return (
        <div className={`flex w-full mb-4 ${isMine ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col max-w-[80%] ${isMine ? 'items-end' : 'items-start'}`}>
                {/* Sender Name for others */}
                {!isMine && (
                    <span className="text-xs text-gray-500 mb-1 ml-1 px-1">
                        {message.sender.name}
                    </span>
                )}

                {/* Bubble */}
                <div
                    className={`relative rounded-2xl px-4 py-2 text-sm shadow-sm ${isMine
                        ? 'bg-brand-600 text-white rounded-tr-sm'
                        : 'bg-white dark:bg-card-900 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                        } ${message.status === 'failed' ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-card-950' : ''}`}
                >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>

                {/* Footer (Time + Status) */}
                <div className={`flex items-center gap-1 mt-1 text-[10px] text-gray-400 px-1`}>
                    <span>{formatRelativeTime(message.createdAt)}</span>

                    {isMine && message.status === 'sending' && (
                        <Clock className="h-3 w-3 animate-pulse" />
                    )}

                    {isMine && message.status === 'failed' && (
                        <button
                            onClick={() => onRetry?.(message)}
                            className="flex items-center text-red-500 hover:text-red-600 ml-1"
                        >
                            <AlertCircle className="h-3 w-3 mr-0.5" />
                            Retry
                        </button>
                    )}

                    {isMine && !message.status && (
                        <Check className="h-3 w-3" />
                    )}
                </div>
            </div>
        </div>
    );
});
