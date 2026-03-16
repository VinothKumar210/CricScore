import React, { useState } from 'react';
import type { Message } from '../messageService';
import { messageService } from '../messageService';
import { formatRelativeTime } from '../../../utils/dateUtils';
import { useAuthStore } from '../../../store/authStore';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { MediaPreview } from './MediaPreview';

interface Props {
    message: Message;
    onRetry?: (message: Message) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '🏏', '🎉'];

export const MessageBubble: React.FC<Props> = React.memo(({ message, onRetry }) => {
    const currentUser = useAuthStore(state => state.user);
    const isMine = currentUser?.id === message.senderId;
    const [isHovered, setIsHovered] = useState(false);

    // Group reactions by emoji
    const reactionGroups = (message.reactions || []).reduce((acc, curr) => {
        if (!acc[curr.emoji]) acc[curr.emoji] = [];
        acc[curr.emoji].push(curr.userId);
        return acc;
    }, {} as Record<string, string[]>);

    const handleQuickReact = async (emoji: string) => {
        if (!currentUser || message.status === 'sending' || message.status === 'failed') return;
        
        try {
            const hasReacted = reactionGroups[emoji]?.includes(currentUser.id);
            if (hasReacted) {
                await messageService.removeReaction(message.conversationId, message.id, emoji);
            } else {
                await messageService.addReaction(message.conversationId, message.id, emoji);
            }
        } catch (error) {
            console.error('Failed to react:', error);
        }
    };

    const renderContentWithMentions = (text: string) => {
        const parts = [];
        const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index));
            }
            parts.push(
                <span key={match.index} className="text-secondary-foreground font-semibold cursor-pointer hover:underline bg-secondary px-1 rounded-sm">
                    @{match[1]}
                </span>
            );
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }

        return parts.length > 0 ? parts : text;
    };

    return (
        <div 
            className={clsx("flex w-full mb-3 group relative w-full", isMine ? "justify-end" : "justify-start")}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Quick React Bar (Desktop Hover) */}
            {isHovered && message.status !== 'sending' && message.status !== 'failed' && (
                <div className={clsx(
                    "absolute top-0 -mt-8 flex items-center gap-1 bg-card border border-border rounded-full px-2 py-1 shadow-md z-10 transition-all duration-200",
                    isMine ? "right-0 mr-4" : "left-0 ml-4"
                )}>
                    {QUICK_REACTIONS.map((emoji) => (
                        <button
                            key={emoji}
                            onClick={() => handleQuickReact(emoji)}
                            className="text-base hover:scale-125 transition-transform px-1 cursor-pointer"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}

            <div className={clsx("flex flex-col max-w-[80%] relative", isMine ? "items-end" : "items-start")}>
                {/* Sender Name */}
                {!isMine && (
                    <span className="text-[10px] text-muted-foreground mb-1 ml-1 font-medium">
                        {message.sender?.fullName || message.sender?.name || 'Unknown'}
                    </span>
                )}

                {/* Bubble */}
                <div className={clsx(
                    "rounded-2xl px-4 py-2.5 text-sm shadow-sm relative",
                    isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border text-foreground rounded-bl-md",
                    message.status === 'failed' && "ring-2 ring-destructive/50",
                    message.attachments && message.attachments.length > 0 && !message.content ? "p-1.5" : ""
                )}>
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-col gap-1 mb-1">
                            {message.attachments.map((att: any, i: number) => (
                                <MediaPreview key={att.id || i} attachment={att} />
                            ))}
                        </div>
                    )}
                    {message.content && (
                        <p className="whitespace-pre-wrap break-words">{renderContentWithMentions(message.content)}</p>
                    )}
                </div>

                {/* Reaction Pills */}
                {Object.keys(reactionGroups).length > 0 && (
                    <div className={clsx(
                        "flex flex-wrap gap-1 mt-1 z-10",
                        isMine ? "justify-end" : "justify-start"
                    )}>
                        {Object.entries(reactionGroups).map(([emoji, userIds]) => {
                            const hasReacted = currentUser && userIds.includes(currentUser.id);
                            return (
                                <button
                                    key={emoji}
                                    onClick={() => handleQuickReact(emoji)}
                                    className={clsx(
                                        "flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border shadow-sm transition-colors",
                                        hasReacted 
                                            ? "bg-primary/20 border-primary/30 text-primary" 
                                            : "bg-background border-border text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    <span>{emoji}</span>
                                    <span className="font-medium">{userIds.length > 1 ? userIds.length : ''}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

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
