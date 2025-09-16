import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Users, Trophy, Shield, Crown, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Team, User } from "@shared/schema";

type TeamWithCaptains = Team & {
  captain: User;
  viceCaptain?: User;
};

export default function TeamSearch() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [inputPosition, setInputPosition] = useState<{top: number, left: number, width: number} | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchResults, isLoading, isError } = useQuery<TeamWithCaptains[]>({
    queryKey: ["search-teams", searchTerm],
    enabled: searchTerm.length >= 2,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/teams/search?q=${encodeURIComponent(searchTerm)}`);
      return response.json();
    },
  });

  // Query for live suggestions (as user types)
  const { data: suggestions, isLoading: isSuggestionsLoading } = useQuery<TeamWithCaptains[]>({
    queryKey: ["team-suggestions", searchInput],
    enabled: searchInput.length >= 1 && showSuggestions,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/teams/search?q=${encodeURIComponent(searchInput)}`);
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

  const selectSuggestion = (team: TeamWithCaptains) => {
    setLocation(`/teams/${team.id}`);
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
    }, 200);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setActiveSuggestion(-1);
      }
    };

    const handleResize = () => {
      if (showSuggestions) {
        updateInputPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [showSuggestions]);

  const renderSuggestions = () => {
    if (!showSuggestions || !suggestions || suggestions.length === 0 || !inputPosition) return null;

    const suggestionsList = (
      <div
        ref={suggestionsRef}
        className="absolute z-50 w-full max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg"
        style={{
          top: inputPosition.top,
          left: inputPosition.left,
          width: inputPosition.width,
          maxWidth: '500px'
        }}
      >
        {isSuggestionsLoading ? (
          <div className="p-4 text-center text-gray-500">
            <Search className="h-4 w-4 animate-spin mx-auto mb-2" />
            Searching teams...
          </div>
        ) : (
          suggestions.map((team, index) => (
            <div
              key={team.id}
              className={`p-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                index === activeSuggestion 
                  ? 'bg-blue-50 dark:bg-blue-900/20' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
              onClick={() => selectSuggestion(team)}
              data-testid={`suggestion-team-${team.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {team.name}
                    </span>
                  </div>
                  {team.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                      {team.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-3 mt-1">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Crown className="h-3 w-3" />
                      <span>{team.captain?.profileName || team.captain?.username || 'Unknown Captain'}</span>
                    </div>
                    {team.viceCaptain && (
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Shield className="h-3 w-3" />
                        <span>{team.viceCaptain.profileName || team.viceCaptain.username || 'Unknown Vice Captain'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );

    return createPortal(suggestionsList, document.body);
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/dashboard')}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Search Teams</h1>
            <p className="text-muted-foreground">Find and explore cricket teams</p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Team Search</span>
          </CardTitle>
          <CardDescription>
            Search for cricket teams by name. Type to see live suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 relative">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Enter team name..."
                value={searchInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="text-base"
                data-testid="input-team-search"
              />
              {renderSuggestions()}
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={!searchInput.trim()}
              data-testid="button-search"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Type at least 2 characters to search for teams
          </p>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchTerm && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              Results for "{searchTerm}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Search className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Searching teams...</p>
                </div>
              </div>
            ) : isError ? (
              <div className="text-center py-12">
                <div className="text-red-500 mb-4">
                  <Search className="h-8 w-8 mx-auto" />
                </div>
                <p className="text-muted-foreground">Error occurred while searching teams</p>
              </div>
            ) : searchResults && searchResults.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No teams found</h3>
                <p className="text-sm text-muted-foreground">
                  Try searching with different keywords or check the spelling
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {searchResults?.map((team) => (
                  <Card 
                    key={team.id} 
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary"
                    onClick={() => setLocation(`/teams/${team.id}`)}
                    data-testid={`team-card-${team.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Team Name and Badge */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate" data-testid="text-team-name">
                              {team.name}
                            </h3>
                            {team.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {team.description}
                              </p>
                            )}
                          </div>
                          <Users className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                        </div>

                        {/* Team Leadership */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                            <span className="text-sm font-medium">Captain</span>
                            <span className="text-sm text-muted-foreground truncate">
                              {team.captain?.profileName || team.captain?.username || 'Unknown Captain'}
                            </span>
                          </div>
                          {team.viceCaptain && (
                            <div className="flex items-center space-x-2">
                              <Shield className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              <span className="text-sm font-medium">Vice Captain</span>
                              <span className="text-sm text-muted-foreground truncate">
                                {team.viceCaptain.profileName || team.viceCaptain.username || 'Unknown Vice Captain'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Team Info */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            {team.createdAt ? `Created ${new Date(team.createdAt).toLocaleDateString()}` : 'Team Profile'}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Team Profile
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}