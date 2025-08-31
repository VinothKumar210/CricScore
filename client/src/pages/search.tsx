import { useState, useEffect, useRef } from "react";
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Query for search results (when user clicks search or presses enter)
  const { data: searchResults, isLoading, isError } = useQuery<UserType[]>({
    queryKey: ["search-users", searchTerm],
    enabled: searchTerm.length >= 1,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(searchTerm)}`);
      return response.json();
    },
  });

  // Query for selected user's statistics
  const { data: userStats } = useQuery({
    queryKey: ["user-stats", selectedUser?.id],
    enabled: !!selectedUser?.id,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/${selectedUser?.id}/stats`);
      return response.json();
    },
  });

  // Query for live suggestions (as user types)
  const { data: suggestions, isLoading: isSuggestionsLoading } = useQuery<UserType[]>({
    queryKey: ["suggestions", searchInput],
    enabled: searchInput.length >= 1 && showSuggestions,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(searchInput)}&limit=10`);
      return response.json();
    },
    staleTime: 300, // Cache for 300ms to avoid too many requests
  });

  const handleSearch = () => {
    const term = searchInput.trim();
    setSearchTerm(term);
    // If there's exactly one search result, select it automatically
    if (searchResults && searchResults.length === 1) {
      setSelectedUser(searchResults[0]);
    } else {
      setSelectedUser(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (!showSuggestions || !suggestions) {
      if (e.key === "Enter") {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveSuggestion(prev => prev > 0 ? prev - 1 : -1);
        break;
      case "Enter":
        e.preventDefault();
        if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
          selectSuggestion(suggestions[activeSuggestion]);
        } else {
          handleSearch();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setActiveSuggestion(-1);
        break;
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

  const selectSuggestion = (user: UserType) => {
    setSearchInput(user.username || "");
    setSearchTerm(user.username || "");
    setSelectedUser(user);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    setShowSuggestions(value.length >= 1);
    setActiveSuggestion(-1);
  };

  const handleInputFocus = () => {
    if (searchInput.length >= 1) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }, 200);
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setActiveSuggestion(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
                <div className="flex-1 relative" ref={suggestionsRef}>
                  <Input
                    placeholder="Search by username..."
                    value={searchInput}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    data-testid="input-search-players"
                    autoComplete="off"
                  />
                  
                  {/* Live Suggestions Dropdown */}
                  {showSuggestions && searchInput.length >= 1 && (
                    <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                      {isSuggestionsLoading && (
                        <div className="p-3 text-center text-muted-foreground">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                        </div>
                      )}
                      
                      {!isSuggestionsLoading && suggestions && suggestions.length > 0 && (
                        <div className="py-1">
                          {suggestions.slice(0, 10).map((user, index) => (
                            <div
                              key={user.id}
                              className={`px-3 py-2 cursor-pointer hover:bg-accent transition-colors ${
                                activeSuggestion === index ? 'bg-accent' : ''
                              }`}
                              onClick={() => selectSuggestion(user)}
                              data-testid={`suggestion-${user.id}`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                  <span className="text-primary-foreground text-sm font-medium">
                                    {user.username?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {user.profileName || user.username}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    @{user.username}
                                  </p>
                                </div>
                                {user.role && (
                                  <Badge variant="outline" className="text-xs">
                                    {formatRole(user.role)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {!isSuggestionsLoading && suggestions && suggestions.length === 0 && (
                        <div className="p-3 text-center text-muted-foreground text-sm">
                          No players found starting with "{searchInput}"
                        </div>
                      )}
                      
                      {!isSuggestionsLoading && suggestions && suggestions.length > 0 && (
                        <div className="px-3 py-2 border-t border-border">
                          <p className="text-xs text-muted-foreground text-center">
                            Press Enter to search or use arrow keys to navigate
                          </p>
                        </div>
                      )}
                    </div>
                  )}
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
              {searchInput.trim().length > 0 && searchInput.trim().length < 1 && (
                <p className="text-sm text-muted-foreground mt-2">Start typing to see suggestions</p>
              )}
            </CardContent>
          </Card>

          {/* Selected User Profile */}
          {selectedUser && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Player Profile</span>
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedUser(null)}
                    data-testid="button-clear-selection"
                  >
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground font-medium text-lg">
                        {selectedUser.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-lg text-foreground">
                        {selectedUser.profileName || selectedUser.username}
                      </p>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-muted-foreground">
                          @{selectedUser.username}
                        </p>
                        {selectedUser.role && (
                          <Badge variant="outline" className="text-xs">
                            {formatRole(selectedUser.role)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {selectedUser.battingHand && (
                      <Badge variant="secondary" className="text-xs">
                        {formatBattingHand(selectedUser.battingHand)}
                      </Badge>
                    )}
                    {selectedUser.bowlingStyle && (
                      <Badge variant="secondary" className="text-xs">
                        {formatBowlingStyle(selectedUser.bowlingStyle)}
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/player/${selectedUser.id}`, '_blank')}
                      data-testid="button-view-profile"
                    >
                      View Full Profile
                    </Button>
                  </div>
                </div>
                
                {selectedUser.description && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">{selectedUser.description}</p>
                  </div>
                )}
                
                {/* Quick Stats */}
                {userStats && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Batting Runs</p>
                      <p className="text-lg font-semibold">{userStats.battingRuns || 0}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Bowling Wickets</p>
                      <p className="text-lg font-semibold">{userStats.bowlingWickets || 0}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Catches</p>
                      <p className="text-lg font-semibold">{userStats.catches || 0}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">High Score</p>
                      <p className="text-lg font-semibold">{userStats.highestScore || 0}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Search Results List (when multiple results) */}
          {searchTerm && !selectedUser && searchResults && searchResults.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results for "{searchTerm}" ({searchResults.length} found)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {searchResults.map((player: UserType) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => setSelectedUser(player)}
                      data-testid={`search-result-${player.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-primary-foreground font-medium">
                            {player.username?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {player.profileName || player.username}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            @{player.username}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {player.role && (
                          <Badge variant="outline" className="text-xs">
                            {formatRole(player.role)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* No Results */}
          {searchTerm && !selectedUser && searchResults && searchResults.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No players found matching "{searchTerm}"</p>
              </CardContent>
            </Card>
          )}
          
          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Searching for players...</p>
              </CardContent>
            </Card>
          )}
          
          {/* Error State */}
          {isError && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Failed to search players. Please try again.</p>
              </CardContent>
            </Card>
          )}

          {/* Initial State */}
          {!searchTerm && !selectedUser && (
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