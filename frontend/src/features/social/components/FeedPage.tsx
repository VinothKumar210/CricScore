import { useEffect, useState } from 'react';
import { socialService } from '../socialService';
import type { PostType } from '../socialService';
import { Loader2, Heart, MessageCircle, Share2, MoreHorizontal, UserPlus } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { PostComposer } from './PostComposer';

const timeAgo = (dateStr: string) => {
    const diff = (new Date().getTime() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
};

export const FeedPage = () => {
    const [posts, setPosts] = useState<PostType[]>([]);
    const [loading, setLoading] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchFeed = async (reset = false) => {
        try {
            setLoading(true);
            const data = await socialService.getFeed(reset ? undefined : cursor || undefined);
            setPosts(prev => reset ? data.posts : [...prev, ...data.posts]);
            setCursor(data.nextCursor);
        } catch (error) {
            console.error('Failed to load feed', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeed(true);
    }, []);

    const handleReaction = async (postId: string, currentReaction?: string | null) => {
        // Optimistic UI patch
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                const isLiking = !currentReaction;
                return {
                    ...p,
                    userReaction: isLiking ? 'LIKE' : null,
                    likesCount: p.likesCount + (isLiking ? 1 : -1)
                };
            }
            return p;
        }));

        try {
            if (currentReaction) {
                await socialService.removeReaction(postId);
            } else {
                await socialService.reactToPost(postId, 'LIKE');
            }
        } catch (error) {
            // Revert optimistically
            fetchFeed(true);
        }
    };

    return (
        <div className="min-h-screen bg-bgPrimary pb-24 pt-6 px-4">
            <header className="mb-6 flex justify-between items-center px-2">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                        Feed
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium mt-1">Updates from your network</p>
                </div>
            </header>

            <PostComposer onPostCreated={() => fetchFeed(true)} />

            <div className="space-y-5">
                {posts.map(post => (
                    <PostCard
                        key={post.id}
                        post={post}
                        onReact={() => handleReaction(post.id, post.userReaction)}
                        onNavigate={(userId) => navigate(`/u/${userId}`)}
                    />
                ))}

                {loading && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                )}

                {!loading && posts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-secondary/50 rounded-3xl border border-border/50 backdrop-blur-sm">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                            <UserPlus className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">Your feed is quiet</h3>
                        <p className="text-muted-foreground text-sm max-w-[200px] text-center mt-2">
                            Follow other players and teams to see their updates here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const PostCard = ({
    post,
    onReact,
    onNavigate
}: {
    post: PostType;
    onReact: () => void;
    onNavigate: (userId: string) => void;
}) => {
    const isLiked = !!post.userReaction;

    return (
        <article className="bg-cardAlt rounded-3xl p-5 border border-border/50 shadow-sm transition-all hover:border-primary/20">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={() => onNavigate(post.author.id)}
                    className="flex items-center gap-3 active:scale-95 transition-transform text-left"
                >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-background">
                        {post.author.profilePictureUrl ? (
                            <img src={post.author.profilePictureUrl} alt={post.author.fullName} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-primary font-bold">{post.author.fullName.charAt(0)}</span>
                        )}
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground text-[15px] leading-tight flex items-center gap-1.5">
                            {post.author.fullName}
                            {post.type === 'AUTO_MILESTONE' && (
                                <span className="bg-amber-500/20 text-amber-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">Milestone</span>
                            )}
                        </h4>
                        <span className="text-xs text-muted-foreground font-medium">
                            {timeAgo(post.createdAt)}
                        </span>
                    </div>
                </button>
                <button className="text-muted-foreground hover:bg-secondary/80 p-2 rounded-full transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className={clsx(
                "mb-4 text-[15px]",
                post.type === 'AUTO_MILESTONE' ? 'font-medium text-primary italic border-l-2 border-primary pl-3 py-1' : 'text-foreground/90 leading-relaxed'
            )}>
                {post.content}
            </div>

            {/* Media */}
            {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className="relative rounded-2xl overflow-hidden mb-4 bg-background aspect-video border border-border/50 group">
                    <img
                        src={post.mediaUrls[0]}
                        alt="Post media"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-6 text-muted-foreground pt-3 border-t border-border/50">
                <button
                    onClick={onReact}
                    className={clsx(
                        "flex items-center gap-2 transition-all active:scale-90",
                        isLiked ? "text-rose-500 font-semibold" : "hover:text-foreground"
                    )}
                >
                    <Heart className={clsx("w-5 h-5", isLiked && "fill-current scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all")} />
                    <span className="text-sm">{post.likesCount > 0 ? post.likesCount : ''}</span>
                </button>
                <button className="flex items-center gap-2 hover:text-foreground transition-all active:scale-90">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm">{post.commentsCount > 0 ? post.commentsCount : ''}</span>
                </button>
                <button className="flex items-center gap-2 hover:text-foreground transition-all ml-auto active:scale-90">
                    <Share2 className="w-5 h-5" />
                </button>
            </div>
        </article>
    );
};
