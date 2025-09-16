import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, User, Trophy, Users, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { User as UserType } from "@shared/schema";

export default function SearchPlayers() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [inputPosition, setInputPosition] = useState<{top: number, left: number, width: number} | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchResults, isLoading, isError } = useQuery<UserType[]>({
    queryKey: ["search-users", searchTerm],
    enabled: searchTerm.length >= 2,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(searchTerm)}`);
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
    setSearchTerm(searchInput.trim());
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
    setLocation(`/player/${user.id}`);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    if (value.length >= 1) {
      updateInputPosition();
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
    setActiveSuggestion(-1);
  };

  const updateInputPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setInputPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const handleInputFocus = () => {
    if (searchInput.length >= 1) {
      updateInputPosition();
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
      setInputPosition(null);
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
    <>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/")}
                  className="flex items-center space-x-2"
                  data-testid="button-back-to-dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Dashboard</span>
                </Button>
              </div>
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-foreground">Search Players</h1>
                <p className="text-muted-foreground">Find and connect with cricket players</p>
              </div>
            </div>

            {/* Search Section */}
            <Card className="overflow-visible relative">
              <CardContent className="p-6 overflow-visible">
                <div className="flex space-x-4">
                  <div className="flex-1 relative" ref={suggestionsRef}>
                    <Input
                      ref={inputRef}
                      placeholder="Search by username..."
                      value={searchInput}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyPress}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      data-testid="input-search-players"
                      autoComplete="off"
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
                {searchInput.trim().length > 0 && searchInput.trim().length < 1 && (
                  <p className="text-sm text-muted-foreground mt-2">Start typing to see suggestions</p>
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
                          <Card 
                            key={player.id} 
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setLocation(`/player/${player.id}`)}
                            data-testid={`player-card-${player.id}`}
                          >
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
      
      {/* Portal-based Suggestions Dropdown */}
      {showSuggestions && searchInput.length >= 1 && inputPosition && typeof document !== 'undefined' && createPortal(
        <div 
          ref={suggestionsRef}
          style={{
            position: 'fixed',
            top: inputPosition.top + 4,
            left: window.innerWidth < 640 ? 8 : Math.max(8, Math.min(inputPosition.left, window.innerWidth - Math.max(inputPosition.width, 320) - 8)),
            width: window.innerWidth < 640 ? window.innerWidth - 16 : Math.min(inputPosition.width, window.innerWidth - 16),
            zIndex: 9999
          }}
          className="bg-card border border-border rounded-md shadow-lg max-h-60 sm:max-h-80 overflow-y-auto"
        >
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
                  className={`px-2 sm:px-3 py-2 sm:py-3 cursor-pointer hover:bg-accent transition-colors ${
                    activeSuggestion === index ? 'bg-accent' : ''
                  }`}
                  onMouseDown={() => selectSuggestion(user)}
                  data-testid={`suggestion-${user.id}`}
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-foreground text-xs sm:text-sm font-medium">
                        {user.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate leading-tight">
                        {user.profileName || "Player"}
                      </p>
                      <div className="flex items-center justify-between mt-0.5 sm:mt-1">
                        <p className="text-xs text-muted-foreground truncate flex-1 min-w-0 mr-1 sm:mr-2">
                          @{user.username}
                        </p>
                        {user.role && (
                          <Badge variant="outline" className="text-xs py-0 px-1 sm:px-2 h-4 sm:h-5 flex-shrink-0">
                            <span className="hidden sm:inline">{formatRole(user.role)}</span>
                            <span className="sm:hidden">{formatRole(user.role).charAt(0)}</span>
                          </Badge>
                        )}
                      </div>
                    </div>
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
        </div>,
        document.body
      )}
    </>
  );
}