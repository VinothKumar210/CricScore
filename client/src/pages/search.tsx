import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, User, Trophy, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { User as UserType } from "@shared/schema";

export default function SearchPlayers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data: searchResults, isLoading, isError } = useQuery<UserType[]>({
    queryKey: ["/api/users/search", searchTerm],
    enabled: searchTerm.length >= 2,
    queryFn: async () => {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to search users');
      }
      return response.json();
    },
  });

  const handleSearch = () => {
    setSearchTerm(searchInput.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const formatRole = (role: string) => {
    switch (role) {
      case "BATSMAN":
        return "Batsman";
      case "BOWLER":
        return "Bowler";
      case "ALL_ROUNDER":
        return "All-rounder";
      default:
        return role;
    }
  };

  const formatBattingHand = (hand: string) => {
    return hand === "RIGHT" ? "Right Hand" : "Left Hand";
  };

  const formatBowlingStyle = (style: string) => {
    switch (style) {
      case "FAST":
        return "Fast";
      case "MEDIUM_FAST":
        return "Medium Fast";
      case "SPIN":
        return "Spin";
      default:
        return style;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Search Players</h1>
            <p className="text-muted-foreground">Find and connect with cricket players</p>
          </div>

          {/* Search Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by username..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    data-testid="input-search-players"
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={searchInput.trim().length < 2}
                  data-testid="button-search-players"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
              {searchInput.trim().length > 0 && searchInput.trim().length < 2 && (
                <p className="text-sm text-muted-foreground mt-2">Enter at least 2 characters to search</p>
              )}
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchTerm && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Search Results for "{searchTerm}"</h2>
              
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}

              {isError && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Failed to search players. Please try again.</p>
                  </CardContent>
                </Card>
              )}

              {!isLoading && !isError && searchResults && (
                <>
                  {searchResults.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">No players found matching "{searchTerm}"</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchResults.map((player: UserType) => (
                        <Card key={player.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="text-center">
                            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-3">
                              <User className="w-8 h-8 text-primary-foreground" />
                            </div>
                            <CardTitle className="text-lg">{player.profileName || "Player"}</CardTitle>
                            <CardDescription>@{player.username}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Playing Style */}
                            <div className="space-y-2">
                              <div className="flex justify-center">
                                <Badge variant="secondary" className="text-xs" data-testid={`player-role-${player.id}`}>
                                  {player.role ? formatRole(player.role) : "Role not specified"}
                                </Badge>
                              </div>
                              <div className="flex justify-center space-x-2">
                                {player.battingHand && (
                                  <Badge variant="outline" className="text-xs" data-testid={`player-batting-${player.id}`}>
                                    {formatBattingHand(player.battingHand)}
                                  </Badge>
                                )}
                                {player.bowlingStyle && (
                                  <Badge variant="outline" className="text-xs" data-testid={`player-bowling-${player.id}`}>
                                    {formatBowlingStyle(player.bowlingStyle)}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Description */}
                            {player.description && (
                              <p className="text-sm text-muted-foreground text-center line-clamp-2" data-testid={`player-description-${player.id}`}>
                                {player.description}
                              </p>
                            )}

                            {/* Member Since */}
                            <div className="text-center text-xs text-muted-foreground">
                              Member since {player.createdAt ? new Date(player.createdAt).toLocaleDateString() : "N/A"}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Initial State */}
          {!searchTerm && (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Search for Cricket Players</h3>
                <p className="text-muted-foreground">
                  Enter a username in the search box above to find other cricket players and view their profiles.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}