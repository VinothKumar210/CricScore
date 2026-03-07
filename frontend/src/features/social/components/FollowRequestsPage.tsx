import { useEffect, useState } from 'react';
import { socialService } from '../socialService';
import type { FollowRequest } from '../socialService';
import { Container } from '../../../components/ui/Container';
import { ChevronLeft, Check, X, Loader2, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const FollowRequestsPage = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<FollowRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const data = await socialService.getFollowRequests();
            setRequests(data.requests);
        } catch (error) {
            console.error('Failed to load requests', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (followerId: string, accept: boolean) => {
        // Optimistic UI
        setRequests(prev => prev.filter(req => req.followerId !== followerId));
        try {
            await socialService.respondToFollowRequest(followerId, accept);
        } catch (error) {
            // Revert
            fetchRequests();
        }
    };

    return (
        <Container className="py-6 px-4">
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-lg bg-secondary border border-border hover:bg-card transition-colors active:scale-95"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Follow Requests</h1>
                    <p className="text-sm text-muted-foreground">Approve or ignore followers</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-cardAlt rounded-xl border border-border/50">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <UserPlus className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">No Pending Requests</h3>
                    <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
                        You don't have any pending follow requests right now.
                    </p>
                </div>
            ) : (
                <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border/50">
                    {requests.map(req => (
                        <div key={req.id} className="p-4 flex items-center justify-between gap-4 transition-colors hover:bg-secondary/40">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-full bg-secondary border border-border overflow-hidden shrink-0 flex items-center justify-center relative">
                                    {req.follower.profilePictureUrl ? (
                                        <img src={req.follower.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-bold text-muted-foreground">
                                            {req.follower.fullName.charAt(0)}
                                        </span>
                                    )}
                                </div>
                                <div className="truncate shrink">
                                    <p className="font-semibold text-sm truncate">{req.follower.fullName}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {req.follower.username ? `@${req.follower.username}` : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleAction(req.followerId, true)}
                                    className="h-9 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs transition-transform active:scale-95 shadow-sm hover:shadow-primary/20 flex items-center gap-1.5"
                                >
                                    <Check className="w-4 h-4" />
                                    Confirm
                                </button>
                                <button
                                    onClick={() => handleAction(req.followerId, false)}
                                    className="h-9 w-9 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground transition-all active:scale-95 flex items-center justify-center"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Container>
    );
};
