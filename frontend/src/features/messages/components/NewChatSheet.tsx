import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { Search, Loader2, Users, MessageSquarePlus, Sheet } from 'lucide-react';
import { api } from '../../../lib/api';
import { messageService } from '../messageService';
import { useAuthStore } from '../../../store/authStore';

// User Search Result
interface UserSearchHit {
    id: string;
    username: string;
    fullName: string;
    profilePictureUrl: string | null;
}

export const NewChatSheet = ({ children }: { children: React.ReactNode }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UserSearchHit[]>([]);
    const [searching, setSearching] = useState(false);
    const [creating, setCreating] = useState(false);

    // Auth context to prevent searching for self
    const currentUserId = useAuthStore((s: any) => s.user?.id);
    const navigate = useNavigate();

    const handleSearch = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setQuery(q);

        if (q.length < 2) {
            setResults([]);
            return;
        }

        setSearching(true);
        try {
            // Re-using the general search endpoint or users endpoint
            const { data } = await api.get('/api/search/users', { params: { q } });

            // Filter out self
            const hits = (data.data || data).filter((u: any) => u.id !== currentUserId);
            setResults(hits);
        } catch (error) {
            console.error('User search failed', error);
        } finally {
            setSearching(false);
        }
    }, [currentUserId]);

    const handleStartDirectChat = async (targetUser: UserSearchHit) => {
        setCreating(true);
        try {
            const conversation = await messageService.createDirectConversation(targetUser.id);
            setOpen(false);
            navigate(`/messages/${conversation.id}`);
        } catch (error) {
            console.error('Failed to create chat', error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <div onClick={() => setOpen(true)}>{children}</div>

            {open && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
                        onClick={() => setOpen(false)}
                    />

                    {/* Sheet */}
                    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-200 border-t border-border flex flex-col h-[85vh]">
                        {/* Handle */}
                        <div className="w-10 h-1 bg-border rounded-full mx-auto mt-4 mb-2 shrink-0" />

                        <div className="px-6 py-3 border-b border-border shrink-0 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-foreground">New Message</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto w-full">
                            {/* Search Bar */}
                            <div className="p-4 sticky top-0 bg-card/95 backdrop-blur z-10">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search by username or name..."
                                        value={query}
                                        onChange={handleSearch}
                                        className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                                    />
                                    {searching && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
                                    )}
                                </div>
                            </div>

                            {/* Results / Options */}
                            <div className="px-2 pb-6">
                                {query.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-muted-foreground">
                                        <MessageSquarePlus className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm">Search for users to start chatting</p>

                                        {/* Future: Create Sub-group Button could go here */}
                                        <div className="mt-8 pt-6 border-t border-border">
                                            <button
                                                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-secondary hover:bg-secondary/80 text-sm font-medium transition-colors"
                                                onClick={() => {
                                                    alert("Sub-group creation UI coming soon");
                                                }}
                                            >
                                                <Users className="w-4 h-4" />
                                                Create Team Sub-Group
                                            </button>
                                        </div>
                                    </div>
                                ) : results.length > 0 ? (
                                    <div className="space-y-1">
                                        {results.map((user) => (
                                            <button
                                                key={user.id}
                                                onClick={() => handleStartDirectChat(user)}
                                                disabled={creating}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-secondary shrink-0 overflow-hidden border border-border flex items-center justify-center">
                                                    {user.profilePictureUrl ? (
                                                        <img src={user.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-sm font-bold opacity-50">{user.username.substring(0, 2).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-foreground truncate">{user.fullName}</p>
                                                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : query.length >= 2 && !searching ? (
                                    <p className="text-center text-muted-foreground text-sm py-8">No users found</p>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};
