import React from 'react';
import type { Message } from '../messageService';
import { formatRelativeTime } from '../../../utils/dateUtils';
import { useAuthStore } from '../../../store/authStore';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
    message: Message;
    onRetry?: (message: Message) => void;
}

export const MessageBubble: React.FC<Props> = React.memo(({ message, onRetry }) => {
    const currentUser = useAuthStore(state => state.user);
    const isMine = currentUser?.id === message.senderId;

    return (
        <div className={clsx("flex w-full mb-3", isMine ? "justify-end" : "justify-start")}>
            <div className={clsx("flex flex-col max-w-[80%]", isMine ? "items-end" : "items-start")}>
                {/* Sender Name */}
                {!isMine && (
                    <span className="text-[10px] text-muted-foreground mb-1 ml-1 font-medium">
                        {message.sender.name}
                    </span>
                )}

                {/* Bubble */}
                <div className={clsx(
                    "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border text-foreground rounded-bl-md",
                    message.status === 'failed' && "ring-2 ring-destructive/50"
                )}>
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground px-1">
                    <span>{formatRelativeTime(message.createdAt)}</span>

                    {isMine && message.status === 'sending' && (
                        <Clock className="h-3 w-3 animate-pulse" />
                    )}

                    {isMine && message.status === 'failed' && (
                        <button
                            onClick={() => onRetry?.(message)}
                            className="flex items-center text-destructive hover:text-destructive/80 ml-1 font-medium"
                        >
                            <AlertCircle className="h-3 w-3 mr-0.5" />
                            Retry
                        </button>
                    )}

                    {isMine && !message.status && (
                        <Check className="h-3 w-3 text-emerald-400" />
                    )}
                </div>
            </div>
        </div>
    );
});
