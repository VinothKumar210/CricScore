import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMessageStore } from '../messageStore';
import { messageService } from '../messageService';
import type { RoomType } from '../messageService';
import { useMessageSocket } from '../useMessageSocket';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { useAuthStore } from '../../../store/authStore';
import { ArrowLeft } from 'lucide-react';

export const MessageRoomPage: React.FC = () => {
    const { roomType, roomId } = useParams<{ roomType: string; roomId: string }>();
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

    // Hook to initialize socket connection automatically
    useMessageSocket();

    const fullRoomId = `${roomType}:${roomId}`;
    const currentRoom = rooms[fullRoomId] || { messages: [], isLoading: false, hasMore: true, cursor: null };

    useEffect(() => {
        if (!roomType || !roomId) return;

        setActiveRoom(fullRoomId);

        // Initial Fetch
        if (currentRoom.messages.length === 0) {
            fetchMessages(roomType as RoomType, roomId);
        }

        return () => {
            setActiveRoom(''); // Clear active room on unmount
        };
    }, [fullRoomId, roomType, roomId, setActiveRoom, fetchMessages]);

    const handleLoadMore = useCallback(() => {
        if (!currentRoom.isLoading && currentRoom.hasMore && roomType && roomId) {
            fetchMessages(roomType as RoomType, roomId, currentRoom.cursor);
        }
    }, [currentRoom, roomType, roomId, fetchMessages]);

    const handleSend = useCallback(async (content: string, overrideTempId?: string, overrideNonce?: string) => {
        if (!currentUser || !roomType || !roomId) return;

        const tempId = overrideTempId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const clientNonce = overrideNonce || crypto.randomUUID();

        if (!overrideTempId) {
            addOptimisticMessage(fullRoomId, {
                id: tempId,
                roomId: fullRoomId,
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
        } else {
            // If it's a retry, we just re-flag it sending (reconcile to itself basically to reset status)
            // But we actually only have reconcileMessage to swap it with server. 
            // We can just keep it failed until server comes back, or we might need a `markMessageSending` action.
            // For simplicity, we just leave it failed while we retry, or dispatch reconcile early if needed.
        }

        try {
            const serverMessage = await messageService.sendMessage(roomType as RoomType, roomId, content, clientNonce);
            reconcileMessage(fullRoomId, tempId, serverMessage);
        } catch (error) {
            console.error('Failed to send message:', error);
            markMessageFailed(fullRoomId, tempId);
        }
    }, [currentUser, roomType, roomId, fullRoomId, addOptimisticMessage, reconcileMessage, markMessageFailed]);

    const handleRetry = useCallback((message: any) => {
        if (message.status === 'failed' && message.tempId) {
            handleSend(message.content, message.tempId, message.clientNonce);
        }
    }, [handleSend]);

    if (!roomType || !roomId) return null;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)] bg-gray-50 dark:bg-card-950">
            {/* Header */}
            <header className="bg-white dark:bg-card-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 shrink-0 flex items-center">
                <button
                    onClick={() => navigate(-1)}
                    className="mr-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-card-800 transition-colors text-gray-500"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                        {roomType} Chat
                    </h1>
                    <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                        ID: {roomId}
                    </p>
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
