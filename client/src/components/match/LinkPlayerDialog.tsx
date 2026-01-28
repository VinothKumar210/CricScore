
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Link as LinkIcon, AlertCircle, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface User {
    id: string;
    username: string;
    profileName?: string;
    profilePictureUrl?: string;
}

interface LinkPlayerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    guestParams: {
        guestId?: string;
        playerName: string;
        teamId?: string; // Optional context to find guest
    };
}

export function LinkPlayerDialog({ isOpen, onClose, guestParams }: LinkPlayerDialogProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setSearchTerm("");
            setSelectedUser(null);
            setSearchResults([]);
        }
    }, [isOpen]);

    // Live user search
    useEffect(() => {
        const searchUsers = async () => {
            if (searchTerm.trim().length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const response = await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(searchTerm.trim())}`);
                const users = await response.json();
                setSearchResults(users.slice(0, 5));
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(searchUsers, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Query to find guest ID if not provided (by name + team)
    // This helps when we only have a name from the match summary
    const { data: resolvedGuest, isLoading: isResolvingGuest } = useQuery({
        queryKey: ['/api/guest-players/resolve', guestParams.playerName, guestParams.teamId],
        queryFn: async () => {
            // If we already have an ID, no need to resolve
            if (guestParams.guestId) return { id: guestParams.guestId };

            // Attempt to resolve by name
            if (!guestParams.playerName || !guestParams.teamId) return null;

            // We need a bespoke endpoint or just use the team's guest list
            const response = await apiRequest("GET", `/api/teams/${guestParams.teamId}/guest-players`);
            const guests: any[] = await response.json();
            return guests.find(g => g.name.toLowerCase() === guestParams.playerName.toLowerCase());
        },
        enabled: isOpen && !guestParams.guestId && !!guestParams.teamId
    });

    const linkMutation = useMutation({
        mutationFn: async () => {
            const guestId = guestParams.guestId || resolvedGuest?.id;
            if (!guestId) throw new Error("Could not identify guest player record");
            if (!selectedUser) throw new Error("No user selected");

            const response = await apiRequest("POST", "/api/stats/link-guest", {
                guestPlayerId: guestId,
                userId: selectedUser.id
            });
            return response.json();
        },
        onSuccess: () => {
            toast({
                title: "Profile Linked",
                description: `Successfully linked ${guestParams.playerName} to ${selectedUser?.profileName || selectedUser?.username}`,
            });
            queryClient.invalidateQueries({ queryKey: ['/api/match-summary'] }); // Refresh summary to show linked status
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: "Link Failed",
                description: error.message || "Failed to link profile",
                variant: "destructive",
            });
        }
    });

    const activeGuestId = guestParams.guestId || resolvedGuest?.id;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Link Player to Profile</DialogTitle>
                    <DialogDescription>
                        Connect <strong>{guestParams.playerName}</strong>'s stats to a registered user account.
                        This will merge all historical stats to the user.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {!activeGuestId && !isResolvingGuest && guestParams.teamId && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Could not find a Guest Record for {guestParams.playerName}. Stats might not have been tracked yet.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by username or name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {/* Search Results */}
                        {searchTerm.length >= 2 && (
                            <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                                {isSearching && <div className="p-3 text-sm text-center text-muted-foreground">Searching...</div>}
                                {!isSearching && searchResults.length === 0 && (
                                    <div className="p-3 text-sm text-center text-muted-foreground">No users found</div>
                                )}
                                {searchResults.map(user => (
                                    <div
                                        key={user.id}
                                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-accent transition-colors ${selectedUser?.id === user.id ? 'bg-accent' : ''}`}
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setSearchTerm(user.profileName || user.username);
                                            setSearchResults([]); // Clear list on select
                                        }}
                                    >
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.profilePictureUrl || undefined} />
                                            <AvatarFallback>{(user.profileName || user.username).substring(0, 1).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="font-medium truncate">{user.profileName || user.username}</div>
                                            {user.username && <div className="text-xs text-muted-foreground truncate">@{user.username}</div>}
                                        </div>
                                        {selectedUser?.id === user.id && <div className="text-primary text-sm font-bold">Selected</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedUser && (
                        <div className="bg-muted/50 p-3 rounded-md flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Link to:</span>
                                <span className="font-bold text-primary">{selectedUser.profileName || selectedUser.username}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>Change</Button>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={() => linkMutation.mutate()}
                        disabled={!selectedUser || !activeGuestId || linkMutation.isPending}
                        className="gap-2"
                    >
                        {linkMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <LinkIcon className="h-4 w-4" />
                        )}
                        Link & Merge Stats
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
