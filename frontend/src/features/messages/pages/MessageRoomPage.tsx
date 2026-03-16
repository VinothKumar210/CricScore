import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMessageStore } from '../messageStore';
import { messageService } from '../messageService';
import { useMessageSocket } from '../useMessageSocket';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import TypingIndicator from '../components/TypingIndicator';
import { useAuthStore } from '../../../store/authStore';
import { ArrowLeft } from 'lucide-react';

const EMPTY_ROOM = { messages: [] as any[], isLoading: false, hasMore: true, cursor: null as string | null };

export const MessageRoomPage: React.FC = () => {
    const { conversationId } = useParams<{ conversationId: string }>();
    const navigate = useNavigate();
    const currentUser = useAuthStore(state => state.user);

    // Use individual selectors to prevent full-store subscription
    const currentRoom = useMessageStore(state =>
        conversationId ? (state.rooms[conversationId] || EMPTY_ROOM) : EMPTY_ROOM
    );
    const setActiveRoom = useMessageStore(state => state.setActiveRoom);
    const fetchMessages = useMessageStore(state => state.fetchMessages);
    const addOptimisticMessage = useMessageStore(state => state.addOptimisticMessage);
    const reconcileMessage = useMessageStore(state => state.reconcileMessage);
    const markMessageFailed = useMessageStore(state => state.markMessageFailed);
    const markConversationRead = useMessageStore(state => state.markConversationRead);
    const replyingToMessage = useMessageStore(state => state.replyingToMessage);
    const clearReply = useMessageStore(state => state.clearReply);
    const typingUsers = useMessageStore(state =>
        conversationId ? (state.typingUsers[conversationId] || []).filter(u => u.userId !== currentUser?.id) : []
    );

    useMessageSocket();

    // We only want to fetch once when the room changes
    useEffect(() => {
        if (!conversationId) return;
        setActiveRoom(conversationId);
        markConversationRead(conversationId);

        // Since currentRoom is derived from zustand state, we should check its contents directly here
        const roomState = useMessageStore.getState().rooms[conversationId];
        if (!roomState || roomState.messages.length === 0) {
            fetchMessages(conversationId);
        }

        return () => {
            setActiveRoom('');
        };
    }, [conversationId, setActiveRoom, fetchMessages, markConversationRead]);

    const handleLoadMore = useCallback(() => {
        // Use getState to avoid capturing stale closures or triggering renders
        const roomState = useMessageStore.getState().rooms[conversationId || ''] || EMPTY_ROOM;
        if (!roomState.isLoading && roomState.hasMore && conversationId) {
            fetchMessages(conversationId, roomState.cursor);
        }
    }, [conversationId, fetchMessages]);

    const handleSend = useCallback(async (content: string, overrideTempId?: string, overrideNonce?: string, attachments?: any[], replyToId?: string) => {
        if (!currentUser || !conversationId) return;

        const tempId = overrideTempId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const clientNonce = overrideNonce || crypto.randomUUID();

        // Capture reply context for optimistic rendering
        const replyTo = replyToId && replyingToMessage ? {
            id: replyingToMessage.id,
            content: replyingToMessage.content,
            type: replyingToMessage.attachments?.[0]?.type,
            sender: { fullName: replyingToMessage.sender?.fullName || replyingToMessage.sender?.name }
        } : undefined;

        if (!overrideTempId) {
            addOptimisticMessage(conversationId, {
                id: tempId,
                conversationId,
                senderId: currentUser.id,
                content,
                clientNonce,
                tempId,
                status: 'sending',
                attachments,
                replyTo: replyTo || null,
                createdAt: new Date().toISOString(),
                sender: {
                    id: currentUser.id,
                    name: currentUser.name,
                    avatarUrl: currentUser.avatarUrl
                }
            });
        }

        // Clear reply state immediately after capturing context
        if (replyToId) clearReply();

        try {
            const serverMessage = await messageService.sendMessage(conversationId, content, clientNonce, attachments, replyToId);
            reconcileMessage(conversationId, tempId, serverMessage);
        } catch (error) {
            console.error('Failed to send message:', error);
            markMessageFailed(conversationId, tempId);
        }
    }, [currentUser, conversationId, addOptimisticMessage, reconcileMessage, markMessageFailed, replyingToMessage, clearReply]);

    const handleRetry = useCallback((message: any) => {
        if (message.status === 'failed' && message.tempId) {
            handleSend(message.content, message.tempId, message.clientNonce);
        }
    }, [handleSend]);

    if (!conversationId) return null;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-background">
            {/* Header */}
            <header className="bg-card border-b border-border px-4 py-3 shrink-0 flex items-center">
                <button
                    onClick={() => navigate(-1)}
                    className="mr-3 p-2 rounded-lg bg-secondary border border-border hover:bg-card transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-foreground capitalize">
                        Chat
                    </h1>
                    {/* Could potentially fetch conversation header info like name hereafter */}
                </div>
            </header>

            {/* List */}
            <MessageList
                messages={currentRoom.messages}
                isLoading={currentRoom.isLoading}
                hasMore={currentRoom.hasMore}
                onLoadMore={handleLoadMore}
                onRetry={handleRetry}
            />

            {/* Typing indicator */}
            <TypingIndicator typingUsers={typingUsers} />

            {/* Input */}
            <MessageInput
                onSend={(content, attachments, replyToId) => handleSend(content, undefined, undefined, attachments, replyToId)}
                disabled={!currentUser}
            />
        </div>
    );
};
