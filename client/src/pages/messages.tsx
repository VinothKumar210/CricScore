import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Send, MessageCircle, Users, MapPin, Image, Smile, Trash2, ChevronLeft, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/components/auth/auth-context';

interface UserInfo { id: string; username?: string; profileName?: string; profilePictureUrl?: string; }
interface MessageData {
    id: string; conversationId: string; senderId: string; type: string;
    content?: string; mediaUrl?: string; replyToId?: string; isDeleted: boolean;
    createdAt: string; sender: UserInfo;
    reactions: { id: string; emoji: string; userId: string; user: { id: string; profileName?: string } }[];
}
interface ConversationData {
    id: string; type: string; name?: string; teamId?: string; inviteId?: string; avatarUrl?: string;
    members: { userId: string; user: UserInfo }[];
    lastMessage?: MessageData | null; unreadCount: number;
    myMembership?: { lastReadAt: string; isMuted: boolean };
}

const EMOJIS = ['👍', '❤️', '😂', '🏏', '🔥', '👏'];

export default function MessagesPage() {
    const [, setLocation] = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();

    const [conversations, setConversations] = useState<ConversationData[]>([]);
    const [activeConv, setActiveConv] = useState<ConversationData | null>(null);
    const [messages, setMessages] = useState<MessageData[]>([]);
    const [msgInput, setMsgInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [teams, setTeams] = useState<any[]>([]);
    const [reactingTo, setReactingTo] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch conversations
    const fetchConversations = useCallback(async () => {
        try {
            const res = await apiRequest('GET', '/api/conversations');
            const data = await res.json();
            setConversations(data);
        } catch (err) { console.error('Failed to fetch conversations:', err); }
        finally { setLoading(false); }
    }, []);

    // Fetch messages for active conversation
    const fetchMessages = useCallback(async (convId: string) => {
        try {
            const res = await apiRequest('GET', `/api/conversations/${convId}/messages`);
            const data = await res.json();
            setMessages(data.messages?.reverse() || []);
        } catch (err) { console.error('Failed to fetch messages:', err); }
    }, []);

    useEffect(() => { fetchConversations(); }, [fetchConversations]);

    useEffect(() => {
        const fetchTeams = async () => {
            try { const res = await apiRequest('GET', '/api/teams'); setTeams(await res.json()); } catch { }
        };
        fetchTeams();
    }, []);

    // Poll for new messages when chat is open
    useEffect(() => {
        if (activeConv) {
            fetchMessages(activeConv.id);
            // Mark as read
            apiRequest('POST', `/api/conversations/${activeConv.id}/read`).catch(() => { });

            pollRef.current = setInterval(() => {
                fetchMessages(activeConv.id);
            }, 4000);

            return () => { if (pollRef.current) clearInterval(pollRef.current); };
        }
    }, [activeConv, fetchMessages]);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Send message
    const handleSend = async () => {
        if (!msgInput.trim() || !activeConv || sending) return;
        setSending(true);
        try {
            await apiRequest('POST', `/api/conversations/${activeConv.id}/messages`, { content: msgInput.trim(), type: 'TEXT' });
            setMsgInput('');
            fetchMessages(activeConv.id);
            fetchConversations();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to send', variant: 'destructive' });
        } finally { setSending(false); }
    };

    // Send image
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeConv) return;
        const reader = new FileReader();
        reader.onload = async () => {
            setSending(true);
            try {
                await apiRequest('POST', `/api/conversations/${activeConv.id}/messages`, {
                    content: '📷 Image', type: 'IMAGE', mediaData: reader.result
                });
                fetchMessages(activeConv.id);
                fetchConversations();
            } catch (err: any) {
                toast({ title: 'Upload failed', description: err.message || 'Failed to upload image', variant: 'destructive' });
            } finally { setSending(false); }
        };
        reader.readAsDataURL(file);
    };

    // Toggle reaction
    const handleReact = async (messageId: string, emoji: string) => {
        try {
            await apiRequest('POST', `/api/messages/${messageId}/react`, { emoji });
            fetchMessages(activeConv!.id);
            setReactingTo(null);
        } catch { }
    };

    // Delete message
    const handleDelete = async (messageId: string) => {
        try {
            await apiRequest('DELETE', `/api/messages/${messageId}`);
            fetchMessages(activeConv!.id);
        } catch { }
    };

    // Create team chat
    const handleStartTeamChat = async (teamId: string) => {
        try {
            const res = await apiRequest('POST', `/api/conversations/team/${teamId}`);
            const conv = await res.json();
            setActiveConv(conv);
            setShowNewChat(false);
            fetchConversations();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to create chat', variant: 'destructive' });
        }
    };

    // Get conversation display name
    const getConvName = (conv: ConversationData) => {
        if (conv.type === 'TEAM' || conv.type === 'INVITE') return conv.name || 'Group Chat';
        // DM: show other person's name
        const other = conv.members.find(m => m.userId !== user?.id);
        return other?.user.profileName || other?.user.username || 'Chat';
    };

    const getConvAvatar = (conv: ConversationData) => {
        if (conv.avatarUrl) return conv.avatarUrl;
        if (conv.type === 'DIRECT') {
            const other = conv.members.find(m => m.userId !== user?.id);
            return other?.user.profilePictureUrl || null;
        }
        return null;
    };

    const getConvIcon = (conv: ConversationData) => {
        if (conv.type === 'TEAM') return <Users className="w-5 h-5 text-blue-600" />;
        if (conv.type === 'INVITE') return <MapPin className="w-5 h-5 text-green-600" />;
        return <MessageCircle className="w-5 h-5 text-purple-600" />;
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) {
            return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        }
        const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    };

    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    // ========= CHAT VIEW =========
    if (activeConv) {
        return (
            <div className="h-screen h-dvh flex flex-col bg-gradient-to-br from-slate-50 to-blue-50/30">
                {/* Chat header */}
                <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
                    <Button variant="ghost" size="icon" onClick={() => { setActiveConv(null); fetchConversations(); }} className="rounded-full">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                        {getConvAvatar(activeConv)
                            ? <img src={getConvAvatar(activeConv)!} className="w-full h-full object-cover" />
                            : getConvName(activeConv).charAt(0).toUpperCase()
                        }
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-gray-900 truncate">{getConvName(activeConv)}</h2>
                        <p className="text-xs text-gray-500">{activeConv.members.length} member{activeConv.members.length > 1 ? 's' : ''}</p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                    {messages.map(msg => {
                        const isMe = msg.senderId === user?.id;
                        const isSystem = msg.type === 'SYSTEM';

                        if (msg.isDeleted) {
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className="px-4 py-2 rounded-2xl bg-gray-100 text-gray-400 text-sm italic">
                                        🚫 Message deleted
                                    </div>
                                </div>
                            );
                        }

                        if (isSystem) {
                            return (
                                <div key={msg.id} className="text-center text-xs text-gray-400 py-2">
                                    {msg.content}
                                </div>
                            );
                        }

                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                <div className={`max-w-[80%] relative`}>
                                    {/* Sender name for group chats */}
                                    {!isMe && activeConv.type !== 'DIRECT' && (
                                        <p className="text-xs font-semibold text-gray-500 mb-0.5 ml-3">
                                            {msg.sender.profileName || msg.sender.username}
                                        </p>
                                    )}

                                    <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${isMe
                                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-md'
                                            : 'bg-white text-gray-900 border border-gray-100 rounded-bl-md'
                                        }`}>
                                        {/* Image */}
                                        {msg.type === 'IMAGE' && msg.mediaUrl && (
                                            <img src={msg.mediaUrl} alt="Shared" className="rounded-xl max-w-full max-h-48 mb-1.5 cursor-pointer" onClick={() => window.open(msg.mediaUrl!, '_blank')} />
                                        )}

                                        {/* Text */}
                                        {msg.content && msg.type !== 'IMAGE' && (
                                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                        )}
                                        {msg.content && msg.type === 'IMAGE' && msg.content !== '📷 Image' && (
                                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                        )}

                                        {/* Time */}
                                        <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400'} text-right`}>
                                            {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>

                                    {/* Reactions */}
                                    {msg.reactions.length > 0 && (
                                        <div className="flex gap-1 mt-0.5 ml-2">
                                            {Object.entries(
                                                msg.reactions.reduce((acc: Record<string, number>, r) => {
                                                    acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc;
                                                }, {})
                                            ).map(([emoji, count]) => (
                                                <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                                                    className="text-xs bg-white border border-gray-200 rounded-full px-1.5 py-0.5 hover:bg-gray-50 shadow-sm">
                                                    {emoji} {count as number > 1 && count}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Actions (visible on hover) */}
                                    <div className={`absolute top-0 ${isMe ? '-left-16' : '-right-16'} hidden group-hover:flex gap-1`}>
                                        <button onClick={() => setReactingTo(reactingTo === msg.id ? null : msg.id)}
                                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50 text-xs">
                                            <Smile className="w-3.5 h-3.5 text-gray-500" />
                                        </button>
                                        {isMe && (
                                            <button onClick={() => handleDelete(msg.id)}
                                                className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-md border border-gray-200 hover:bg-red-50 text-xs">
                                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Emoji picker */}
                                    {reactingTo === msg.id && (
                                        <div className={`absolute ${isMe ? 'right-0' : 'left-0'} -top-10 flex gap-1 bg-white rounded-full shadow-lg border border-gray-200 px-2 py-1.5 z-10`}>
                                            {EMOJIS.map(e => (
                                                <button key={e} onClick={() => handleReact(msg.id, e)} className="hover:scale-125 transition-transform text-lg">{e}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message input */}
                <div className="bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom">
                    <div className="flex items-center gap-2">
                        <label className="cursor-pointer">
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors">
                                <Image className="w-5 h-5 text-gray-500" />
                            </div>
                        </label>
                        <Input
                            value={msgInput}
                            onChange={(e) => setMsgInput(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 rounded-full bg-gray-100 border-0 px-4 h-10 focus-visible:ring-1 focus-visible:ring-blue-300"
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!msgInput.trim() || sending}
                            size="icon"
                            className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-md disabled:opacity-50"
                        >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ========= CONVERSATION LIST =========
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                <div className="max-w-2xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Button variant="ghost" size="icon" onClick={() => setLocation('/dashboard')} className="text-white hover:bg-white/20 rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-2xl font-black tracking-tight">Messages</h1>
                            <p className="text-blue-100 text-sm">{totalUnread > 0 ? `${totalUnread} unread` : 'All caught up!'}</p>
                        </div>
                        <Button onClick={() => setShowNewChat(true)} size="icon" className="bg-white/20 hover:bg-white/30 rounded-full">
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Conversation list */}
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-3" />
                        <p className="text-sm">Loading conversations...</p>
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
                            <MessageCircle className="w-10 h-10 text-blue-300" />
                        </div>
                        <h3 className="font-bold text-gray-700 text-lg">No conversations yet</h3>
                        <p className="text-gray-400 text-sm mt-1">Start a team chat or DM someone!</p>
                        <Button onClick={() => setShowNewChat(true)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                            <Plus className="w-4 h-4 mr-1" /> New Chat
                        </Button>
                    </div>
                ) : (
                    conversations.map(conv => (
                        <Card
                            key={conv.id}
                            className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer rounded-2xl overflow-hidden"
                            onClick={() => setActiveConv(conv)}
                        >
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold overflow-hidden">
                                        {getConvAvatar(conv)
                                            ? <img src={getConvAvatar(conv)!} className="w-full h-full object-cover" />
                                            : getConvName(conv).charAt(0).toUpperCase()
                                        }
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                                            <span className="text-[10px] text-white font-bold">{conv.unreadCount}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className={`font-bold text-sm truncate ${conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                                            {getConvName(conv)}
                                        </h3>
                                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                                            {conv.lastMessage && formatTime(conv.lastMessage.createdAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {getConvIcon(conv)}
                                        <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                                            {conv.lastMessage
                                                ? conv.lastMessage.isDeleted
                                                    ? '🚫 Message deleted'
                                                    : conv.lastMessage.type === 'IMAGE'
                                                        ? '📷 Photo'
                                                        : conv.lastMessage.content || 'No message'
                                                : 'No messages yet'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* New Chat Dialog */}
            <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Start a Chat</DialogTitle>
                        <DialogDescription>Open a team chat to message all members.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm font-semibold text-gray-700">Your Teams</p>
                        {teams.length === 0 ? (
                            <p className="text-sm text-gray-400">No teams yet. Create or join a team first.</p>
                        ) : (
                            teams.map((t: any) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleStartTeamChat(t.id)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all text-left"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                        {t.logoUrl ? <img src={t.logoUrl} className="w-full h-full object-cover rounded-full" /> : t.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" /> Team Chat</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewChat(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
