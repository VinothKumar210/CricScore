import React, { useRef, useLayoutEffect, useState } from 'react';
import type { Message } from '../messageService';
import { MessageBubble } from './MessageBubble';
import { MessageSkeleton } from './MessageSkeleton';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

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

    // Track scroll events to disable auto-scroll if user scrolls up
    const handleScroll = () => {
        if (!listRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;

        setIsAutoScrolling(isAtBottom);

        // Load older messages naturally
        if (scrollTop === 0 && hasMore && !isLoading) {
            // Before loading, capture current height to anchor later
            setPrevScrollHeight(scrollHeight);
            onLoadMore();
        }
    };

    // Scroll anchoring
    useLayoutEffect(() => {
        if (!listRef.current) return;

        // If we just prepended messages (inferred by prevScrollHeight > 0), anchor to old position
        if (prevScrollHeight > 0 && messages.length > 0) {
            const { scrollHeight } = listRef.current;
            listRef.current.scrollTop = scrollHeight - prevScrollHeight;
            setPrevScrollHeight(0); // Reset after anchoring
        } else if (isAutoScrolling) {
            // Auto-scroll to bottom on new arriving message
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
                    {isLoading && <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />}
                </div>
            )}

            {!hasMore && messages.length === 0 && !isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <p>No messages yet.</p>
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
