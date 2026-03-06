import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMessageStore } from '../messageStore';
import { messageService } from '../messageService';
import { useMessageSocket } from '../useMessageSocket';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { useAuthStore } from '../../../store/authStore';
import { ArrowLeft } from 'lucide-react';

export const MessageRoomPage: React.FC = () => {
    const { conversationId } = useParams<{ conversationId: string }>();
    const navigate = useNavigate();
    const currentUser = useAuthStore(state => state.user);

    const {
        rooms,
        setActiveRoom,
        fetchMessages,
        addOptimisticMessage,
        reconcileMessage,
        markMessageFailed,
    } = useMessageStore();

    useMessageSocket();

    const currentRoom = conversationId ? (rooms[conversationId] || { messages: [], isLoading: false, hasMore: true, cursor: null }) : { messages: [], isLoading: false, hasMore: true, cursor: null };

    useEffect(() => {
        if (!conversationId) return;
        setActiveRoom(conversationId);
        if (currentRoom.messages.length === 0) {
            fetchMessages(conversationId);
        }
        return () => {
            setActiveRoom('');
        };
    }, [conversationId, setActiveRoom, fetchMessages]);

    const handleLoadMore = useCallback(() => {
        if (!currentRoom.isLoading && currentRoom.hasMore && conversationId) {
            fetchMessages(conversationId, currentRoom.cursor);
        }
    }, [currentRoom, conversationId, fetchMessages]);

    const handleSend = useCallback(async (content: string, overrideTempId?: string, overrideNonce?: string) => {
        if (!currentUser || !conversationId) return;

        const tempId = overrideTempId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const clientNonce = overrideNonce || crypto.randomUUID();

        if (!overrideTempId) {
            addOptimisticMessage(conversationId, {
                id: tempId,
                conversationId,
                senderId: currentUser.id,
                content,
                tempId,
                status: 'sending',
                createdAt: new Date().toISOString(),
                sender: {
                    id: currentUser.id,
                    name: currentUser.name,
                    avatarUrl: currentUser.avatarUrl
                }
            });
        }

        try {
            const serverMessage = await messageService.sendMessage(conversationId, content, clientNonce);
            reconcileMessage(conversationId, tempId, serverMessage);
        } catch (error) {
            console.error('Failed to send message:', error);
            markMessageFailed(conversationId, tempId);
        }
    }, [currentUser, conversationId, addOptimisticMessage, reconcileMessage, markMessageFailed]);

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

            {/* Input */}
            <MessageInput
                onSend={(content) => handleSend(content)}
                disabled={!currentUser}
            />
        </div>
    );
};
