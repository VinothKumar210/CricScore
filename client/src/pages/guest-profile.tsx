import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Users, Trophy, Target, Zap, User, Link as LinkIcon, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-context";
import { AvatarWithFallback } from "@/components/avatar-with-fallback";
import { LinkPlayerDialog } from "@/components/match/LinkPlayerDialog";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

interface GuestPlayer {
    id: string;
    name: string;
    guestCode: string;
    profilePictureUrl?: string;
    matchesPlayed: number;
    totalRuns: number;
    ballsFaced: number;
    fours: number;
    sixes: number;
    wicketsTaken: number;
    runsConceded: number;
    oversBowled: number;
    catchesTaken: number;
    runOuts: number;
    teamId: string;
    addedByUserId: string;
    team: {
        id: string;
        name: string;
        captainId?: string;
        viceCaptainId?: string;
    };
    addedBy: {
        id: string;
        username: string;
        profileName?: string;
    };
    linkedUser?: {
        id: string;
        username: string;
    };
    redirectToUser?: boolean;
}

export default function GuestProfile() {
    const { code } = useParams<{ code: string }>();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

    const { data: guest, isLoading, error } = useQuery<GuestPlayer>({
        queryKey: ["guest", code],
        enabled: !!code,
        queryFn: async () => {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
            const response = await fetch(`${baseUrl}/api/guest/${code}`);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Guest player not found");
                }
                throw new Error("Failed to fetch guest player");
            }
            return response.json();
        },
    });

    // Self-claim mutation: logged-in user claims this guest profile as their own
    const selfClaimMutation = useMutation({
        mutationFn: async () => {
            if (!currentUser || !code) throw new Error("Not authenticated");
            const response = await apiRequest("POST", `/api/guest/${code}/link`, {
                userId: currentUser.id
            });
            return response.json();
        },
        onSuccess: (data: any) => {
            toast({
                title: "Profile Linked! 🎉",
                description: `${guest?.name}'s stats have been merged into your account.${data.addedToTeam ? ` You've been added to ${guest?.team?.name}.` : ''}`,
            });
            queryClient.invalidateQueries({ queryKey: ["guest", code] });
            queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
            // Navigate to own profile after linking
            setTimeout(() => setLocation("/profile"), 1500);
        },
        onError: (error: any) => {
            toast({
                title: "Link Failed",
                description: error.message || "Failed to link profile. You may not have permission.",
                variant: "destructive",
            });
        }
    });

    // Redirect to user profile if linked
    if (guest?.redirectToUser && guest.linkedUser) {
        setLocation(`/player/${guest.linkedUser.id}`);
        return null;
    }

    const copyCode = () => {
        if (code) {
            navigator.clipboard.writeText(code);
            toast({
                title: "Copied!",
                description: "Guest code copied to clipboard",
            });
        }
    };

    // Determine if current user can link this guest
    const canLink = currentUser && guest && !guest.linkedUser && (
        guest.team?.captainId === currentUser.id ||
        guest.team?.viceCaptainId === currentUser.id ||
        guest.addedByUserId === currentUser.id
    );

    // Can self-claim: any logged-in user can claim a guest profile as their own
    const canSelfClaim = currentUser && guest && !guest.linkedUser;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !guest) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation("/search")}
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Search
                    </Button>
                    <Card>
                        <CardContent className="p-12 text-center">
                            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Guest Not Found</h3>
                            <p className="text-muted-foreground">
                                No guest player found with code "{code}"
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Calculate stats
    const strikeRate = guest.ballsFaced > 0
        ? ((guest.totalRuns / guest.ballsFaced) * 100).toFixed(2)
        : "0.00";
    const battingAverage = guest.matchesPlayed > 0
        ? (guest.totalRuns / guest.matchesPlayed).toFixed(2)
        : "0.00";
    const economy = guest.oversBowled > 0
        ? (guest.runsConceded / guest.oversBowled).toFixed(2)
        : "0.00";
    const bowlingAverage = guest.wicketsTaken > 0
        ? (guest.runsConceded / guest.wicketsTaken).toFixed(2)
        : "-";

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation("/search")}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Search
                </Button>

                {/* Header Section */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                            {/* Avatar */}
                            <AvatarWithFallback
                                src={guest.profilePictureUrl}
                                name={guest.name}
                                size="xl"
                            />

                            {/* Info */}
                            <div className="flex-1 text-center sm:text-left">
                                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                        Guest Player
                                    </Badge>
                                </div>
                                <h1 className="text-2xl font-bold mb-1">{guest.name}</h1>

                                {/* Guest Code */}
                                <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
                                    <span className="text-sm text-muted-foreground">Code:</span>
                                    <code className="font-mono text-sm bg-orange-50 text-orange-700 px-2 py-0.5 rounded">
                                        {guest.guestCode}
                                    </code>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={copyCode}>
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>

                                {/* Team Info */}
                                <div className="text-sm text-muted-foreground">
                                    <p>Team: <span className="font-medium text-foreground">{guest.team.name}</span></p>
                                    <p>Added by: {guest.addedBy.profileName || guest.addedBy.username}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Link to Account Section */}
                {canSelfClaim && (
                    <Card className="mb-6 border-primary/30 bg-primary/5">
                        <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="flex-1">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <LinkIcon className="w-4 h-4 text-primary" />
                                        Link to Account
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Is this you? Claim this guest profile to merge stats into your account.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => selfClaimMutation.mutate()}
                                        disabled={selfClaimMutation.isPending}
                                        size="sm"
                                        className="gap-2"
                                    >
                                        {selfClaimMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4" />
                                        )}
                                        Claim as Mine
                                    </Button>
                                    {canLink && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsLinkDialogOpen(true)}
                                            className="gap-2"
                                        >
                                            <LinkIcon className="h-4 w-4" />
                                            Link to Other User
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Already Linked Notice */}
                {guest.linkedUser && (
                    <Card className="mb-6 border-green-300 bg-green-50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <div>
                                    <p className="font-medium text-green-800">Linked to @{guest.linkedUser.username}</p>
                                    <p className="text-sm text-green-600">Stats have been merged into their account.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="ml-auto"
                                    onClick={() => setLocation(`/player/${guest.linkedUser!.id}`)}
                                >
                                    View Profile
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Batting Card */}
                    <Card className="border-t-4 border-t-blue-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Target className="w-4 h-4 text-blue-500" />
                                BATTING
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600 mb-2">
                                {guest.totalRuns}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Runs</div>
                            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                                <div>
                                    <div className="text-sm font-medium">{battingAverage}</div>
                                    <div className="text-xs text-muted-foreground">Avg</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium">{strikeRate}</div>
                                    <div className="text-xs text-muted-foreground">SR</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium">{guest.fours}/{guest.sixes}</div>
                                    <div className="text-xs text-muted-foreground">4s/6s</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bowling Card */}
                    <Card className="border-t-4 border-t-green-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Zap className="w-4 h-4 text-green-500" />
                                BOWLING
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600 mb-2">
                                {guest.wicketsTaken}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Wickets</div>
                            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                                <div>
                                    <div className="text-sm font-medium">{bowlingAverage}</div>
                                    <div className="text-xs text-muted-foreground">Avg</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium">{economy}</div>
                                    <div className="text-xs text-muted-foreground">Eco</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium">{guest.oversBowled}</div>
                                    <div className="text-xs text-muted-foreground">Overs</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Matches Card */}
                    <Card className="border-t-4 border-t-purple-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-purple-500" />
                                MATCHES
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-purple-600 mb-2">
                                {guest.matchesPlayed}
                            </div>
                            <div className="text-sm text-muted-foreground">Matches Played</div>
                            <div className="grid grid-cols-2 gap-2 mt-4 text-center">
                                <div>
                                    <div className="text-sm font-medium">{guest.catchesTaken}</div>
                                    <div className="text-xs text-muted-foreground">Catches</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium">{guest.runOuts}</div>
                                    <div className="text-xs text-muted-foreground">Run Outs</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Team Link */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Team
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            onClick={() => setLocation(`/teams/${guest.team.id}`)}
                        >
                            View {guest.team.name}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Link Player Dialog */}
            <LinkPlayerDialog
                isOpen={isLinkDialogOpen}
                onClose={() => setIsLinkDialogOpen(false)}
                guestParams={{
                    guestId: guest.id,
                    playerName: guest.name,
                    teamId: guest.team.id
                }}
            />
        </div>
    );
}
