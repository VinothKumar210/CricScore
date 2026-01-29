import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Search, Trophy, Medal, Activity, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AvatarWithFallback } from "@/components/avatar-with-fallback";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/stats-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface GuestPlayer {
    id: string;
    name: string;
    guestCode: string;
    profilePictureUrl?: string;
    team?: {
        id: string;
        name: string;
    };
    addedBy: {
        id: string;
        username: string;
    };
    linkedUser?: {
        id: string;
        username: string;
        profileName?: string;
        profilePictureUrl?: string;
    };
}

export default function GuestProfile() {
    const [searchCode, setSearchCode] = useState("");
    const [searchedCode, setSearchedCode] = useState("");
    const [location, setLocation] = useLocation();

    // Extract code from URL if present (e.g., /guest/g7x3k)
    const urlCode = location.split("/").pop();
    const isSearchPage = location === "/guest";

    const { data: guest, isLoading, error } = useQuery<GuestPlayer>({
        queryKey: ["guest", searchedCode || urlCode],
        queryFn: async () => {
            const code = searchedCode || urlCode;
            if (!code || code === "guest") return null;
            const res = await fetch(`/api/guest/search/${code}`);
            if (!res.ok) throw new Error("Guest player not found");
            return res.json();
        },
        enabled: !!(searchedCode || (urlCode && urlCode !== "guest")),
        retry: false,
    });

    const { data: stats } = useQuery({
        queryKey: ["guest-stats", guest?.id],
        queryFn: async () => {
            if (!guest?.id) return null;
            const res = await fetch(`/api/guest/${guest.id}/stats`);
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!guest?.id,
    });

    const { data: matches } = useQuery({
        queryKey: ["guest-matches", guest?.id],
        queryFn: async () => {
            if (!guest?.id) return null;
            const res = await fetch(`/api/guest/${guest.id}/matches`);
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!guest?.id,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchCode.trim()) {
            setSearchedCode(searchCode.trim().toLowerCase());
            setLocation(`/guest/${searchCode.trim().toLowerCase()}`);
        }
    };

    if (isSearchPage && !searchedCode) {
        return (
            <div className="container mx-auto p-4 max-w-md min-h-[80vh] flex flex-col items-center justify-center">
                <Card className="w-full">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Find Guest Player</CardTitle>
                        <CardDescription>
                            Enter the 5-character guest code to view stats
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <Input
                                placeholder="e.g. g7x3k"
                                value={searchCode}
                                onChange={(e) => setSearchCode(e.target.value)}
                                maxLength={5}
                                className="text-center text-lg uppercase"
                            />
                            <Button type="submit">
                                <Search className="w-4 h-4" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 pb-20 max-w-4xl">
            <div className="flex items-center mb-6">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="mr-2">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Guest Profile</h1>
                <div className="ml-auto">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input
                            placeholder="Search code..."
                            value={searchCode}
                            onChange={(e) => setSearchCode(e.target.value)}
                            className="w-32 h-9"
                        />
                        <Button type="submit" size="sm" variant="outline">
                            <Search className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            ) : error || !guest ? (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Not Found</AlertTitle>
                    <AlertDescription>
                        Could not find a guest player with code "{searchedCode || urlCode}".
                    </AlertDescription>
                </Alert>
            ) : (
                <div className="space-y-6">
                    {/* Profile Header */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <AvatarWithFallback
                                    src={guest.profilePictureUrl || guest.linkedUser?.profilePictureUrl}
                                    name={guest.name}
                                    size="xl"
                                    className="w-24 h-24 text-3xl"
                                />

                                <div className="text-center md:text-left flex-1">
                                    <h2 className="text-2xl font-bold">{guest.name}</h2>
                                    <div className="flex items-center justify-center md:justify-start gap-2 mt-1 text-muted-foreground">
                                        <Badge variant="outline" className="font-mono">
                                            #{guest.guestCode}
                                        </Badge>
                                        {guest.team && (
                                            <span className="text-sm">
                                                Plays for {guest.team.name}
                                            </span>
                                        )}
                                    </div>

                                    {guest.linkedUser ? (
                                        <div className="mt-3 text-sm bg-primary/10 text-primary px-3 py-1 rounded-full inline-flex items-center">
                                            <Activity className="w-3 h-3 mr-1" />
                                            Linked to {guest.linkedUser.profileName || guest.linkedUser.username}
                                        </div>
                                    ) : (
                                        <div className="mt-3 text-sm text-muted-foreground">
                                            Added by {guest.addedBy.username}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 min-w-[200px] justify-center">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{stats?.matchesPlayed || 0}</div>
                                        <div className="text-xs text-muted-foreground uppercase">Matches</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{stats?.totalRuns || 0}</div>
                                        <div className="text-xs text-muted-foreground uppercase">Runs</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{stats?.wicketsTaken || 0}</div>
                                        <div className="text-xs text-muted-foreground uppercase">Wickets</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats Tabs */}
                    <Tabs defaultValue="batting">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="batting">Batting</TabsTrigger>
                            <TabsTrigger value="bowling">Bowling</TabsTrigger>
                        </TabsList>

                        <TabsContent value="batting" className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatsCard title="Runs" value={stats?.totalRuns || 0} icon={<Trophy className="h-4 w-4" />} />
                                <StatsCard title="Batting Avg" value={stats?.battingAverage || 0} />
                                <StatsCard title="Strike Rate" value={stats?.strikeRate || 0} />
                                <StatsCard title="Highest" value={stats?.highestScore || 0} />
                                <StatsCard title="Fours" value={stats?.fours || 0} />
                                <StatsCard title="Sixes" value={stats?.sixes || 0} />
                                <StatsCard title="Not Outs" value={stats?.timesOut === 0 ? '-' : (stats?.matchesPlayed || 0) - (stats?.timesOut || 0)} subtext="Innings finished not out" />
                                <StatsCard title="MOM Awards" value={stats?.manOfTheMatchAwards || 0} icon={<Medal className="h-4 w-4" />} />
                            </div>
                        </TabsContent>

                        <TabsContent value="bowling" className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatsCard title="Wickets" value={stats?.wicketsTaken || 0} icon={<Trophy className="h-4 w-4" />} />
                                <StatsCard title="Bowling Avg" value={stats?.bowlingAverage || 0} />
                                <StatsCard title="Economy" value={stats?.economy || 0} />
                                <StatsCard title="Overs" value={stats?.oversBowled || 0} />
                                <StatsCard title="Maidens" value={stats?.maidenOvers || 0} />
                                <StatsCard title="Runs Conceded" value={stats?.runsConceded || 0} />
                                <StatsCard title="Catches" value={stats?.catchesTaken || 0} />
                                <StatsCard title="Run Outs" value={stats?.runOuts || 0} />
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Recent Matches */}
                    <h3 className="text-lg font-semibold mt-8 mb-4">Match History</h3>
                    <div className="space-y-3">
                        {matches?.matches?.length > 0 ? (
                            matches.matches.map((match: any) => (
                                <Card key={match.id} className="overflow-hidden">
                                    <div className="p-4 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium">{new Date(match.matchSummary.matchDate).toLocaleDateString()}</div>
                                            <div className="text-xs text-muted-foreground">{match.matchSummary.venue}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold">
                                                {match.runsScored} ({match.ballsFaced})
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {match.wicketsTaken}/{match.runsConceded} ({match.oversBowled} ov)
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-lg">
                                No match history available
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
