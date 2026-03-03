import React, { useRef, useLayoutEffect, useState } from 'react';
import type { Message } from '../messageService';
import { MessageBubble } from './MessageBubble';
import { MessageSkeleton } from './MessageSkeleton';
import { Loader2 } from 'lucide-react';

interface Props {
    messages: Message[];
    isLoading: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    onRetry?: (message: Message) => void;
}

export const MessageList: React.FC<Props> = ({ messages, isLoading, hasMore, onLoadMore, onRetry }) => {
    const listRef = useRef<HTMLDivElement>(null);
    const [prevScrollHeight, setPrevScrollHeight] = useState(0);
    const [isAutoScrolling, setIsAutoScrolling] = useState(true);

    const handleScroll = () => {
        if (!listRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
        setIsAutoScrolling(isAtBottom);

        if (scrollTop === 0 && hasMore && !isLoading) {
            setPrevScrollHeight(scrollHeight);
            onLoadMore();
        }
    };

    useLayoutEffect(() => {
        if (!listRef.current) return;
        if (prevScrollHeight > 0 && messages.length > 0) {
            const { scrollHeight } = listRef.current;
            listRef.current.scrollTop = scrollHeight - prevScrollHeight;
            setPrevScrollHeight(0);
        } else if (isAutoScrolling) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages.length, prevScrollHeight, isAutoScrolling]);

    return (
        <div
            ref={listRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0 relative scroll-smooth"
        >
            {hasMore && (
                <div className="flex justify-center py-2 h-10 w-full shrink-0">
                    {isLoading && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                </div>
            )}

            {!hasMore && messages.length === 0 && !isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-1">
                    <p className="text-sm">No messages yet.</p>
                    <p className="text-xs">Start the conversation!</p>
                </div>
            )}

            {isLoading && messages.length === 0 && (
                <MessageSkeleton />
            )}

            <div className="flex-1 flex flex-col justify-end">
                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id || msg.tempId}
                        message={msg}
                        onRetry={onRetry}
                    />
                ))}
            </div>
        </div>
    );
};
