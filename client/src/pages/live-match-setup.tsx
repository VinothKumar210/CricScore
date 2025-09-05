import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Plus, X, Check, Loader2, Bell, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useToast } from "@/hooks/use-toast";
import { type InsertLiveMatch, type LiveMatchForm } from "@shared/schema";

export default function LiveMatchSetup() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState<LiveMatchForm>({
    matchName: "",
    venue: "",
    matchDate: new Date().toISOString().split('T')[0],
    status: "SETUP" as const,
    myTeamName: "",
    opponentTeamName: "",
    overs: 20,
    spectatorUsernames: [],
  });

  const [spectatorInput, setSpectatorInput] = useState("");
  const [validatingUsername, setValidatingUsername] = useState<string | null>(null);
  const [usernameValidation, setUsernameValidation] = useState<Record<string, {
    isValid: boolean;
    userId?: string;
    profileName?: string;
  }>>({});

  // Validate username with debounce
  const validateUsername = async (username: string) => {
    if (!username || username.length < 3) return;
    
    setValidatingUsername(username);
    
    try {
      const response = await fetch(`/api/users/lookup-username?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      
      setUsernameValidation(prev => ({
        ...prev,
        [username]: {
          isValid: data.found,
          userId: data.user?.id,
          profileName: data.user?.profileName
        }
      }));
    } catch (error) {
      console.error("Error validating username:", error);
      setUsernameValidation(prev => ({
        ...prev,
        [username]: { isValid: false }
      }));
    }
    
    setValidatingUsername(null);
  };

  // Debounced username validation
  useEffect(() => {
    if (!spectatorInput) return;
    
    const timer = setTimeout(() => {
      validateUsername(spectatorInput);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [spectatorInput]);

  const addSpectator = () => {
    const username = spectatorInput.trim();
    if (!username) return;
    
    if (username === user?.username) {
      toast({
        title: "Cannot add yourself",
        description: "You are the match creator and will automatically have access to scoring.",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.spectatorUsernames.includes(username)) {
      toast({
        title: "Username already added",
        description: "This spectator has already been added to the list.",
        variant: "destructive",
      });
      return;
    }
    
    const validation = usernameValidation[username];
    if (!validation?.isValid) {
      toast({
        title: "Invalid username",
        description: "Please make sure the username exists and is spelled correctly.",
        variant: "destructive",
      });
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      spectatorUsernames: [...prev.spectatorUsernames, username]
    }));
    setSpectatorInput("");
  };

  const removeSpectator = (username: string) => {
    setFormData(prev => ({
      ...prev,
      spectatorUsernames: prev.spectatorUsernames.filter(u => u !== username)
    }));
  };

  const createLiveMatchMutation = useMutation({
    mutationFn: async (data: LiveMatchForm) => {
      const response = await fetch("/api/live-matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create live match");
      }
      
      return response.json();
    },
    onSuccess: (liveMatch) => {
      toast({
        title: "Live match created!",
        description: `${formData.spectatorUsernames.length} spectators will be notified when you start scoring.`,
      });
      
      // Navigate to the live scoring page
      setLocation(`/live-match/${liveMatch.id}/score`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create live match",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.matchName.trim() || !formData.venue.trim() || !formData.myTeamName.trim() || !formData.opponentTeamName.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required match details.",
        variant: "destructive",
      });
      return;
    }
    
    createLiveMatchMutation.mutate(formData);
  };

  const isFormValid = formData.matchName.trim() && formData.venue.trim() && 
                     formData.myTeamName.trim() && formData.opponentTeamName.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard")}
            className="mb-4"
            data-testid="button-back"
          >
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Live Match</h1>
          <p className="text-gray-600">Set up a live match that spectators can follow in real-time</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Match Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Match Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="matchName">Match Name *</Label>
                  <Input
                    id="matchName"
                    value={formData.matchName}
                    onChange={(e) => setFormData(prev => ({ ...prev, matchName: e.target.value }))}
                    placeholder="e.g., Sunday League Match"
                    data-testid="input-match-name"
                  />
                </div>
                <div>
                  <Label htmlFor="venue">Venue *</Label>
                  <Input
                    id="venue"
                    value={formData.venue}
                    onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                    placeholder="e.g., City Cricket Ground"
                    data-testid="input-venue"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="matchDate">Match Date *</Label>
                  <Input
                    id="matchDate"
                    type="date"
                    value={formData.matchDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, matchDate: e.target.value }))}
                    data-testid="input-match-date"
                  />
                </div>
                <div>
                  <Label htmlFor="myTeamName">Your Team Name *</Label>
                  <Input
                    id="myTeamName"
                    value={formData.myTeamName}
                    onChange={(e) => setFormData(prev => ({ ...prev, myTeamName: e.target.value }))}
                    placeholder="Your team name"
                    data-testid="input-my-team"
                  />
                </div>
                <div>
                  <Label htmlFor="opponentTeamName">Opponent Team *</Label>
                  <Input
                    id="opponentTeamName"
                    value={formData.opponentTeamName}
                    onChange={(e) => setFormData(prev => ({ ...prev, opponentTeamName: e.target.value }))}
                    placeholder="Opponent team name"
                    data-testid="input-opponent-team"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="overs">Overs per Innings</Label>
                <Input
                  id="overs"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.overs}
                  onChange={(e) => setFormData(prev => ({ ...prev, overs: parseInt(e.target.value) || 20 }))}
                  data-testid="input-overs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Spectator Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Spectator Notifications
              </CardTitle>
              <p className="text-sm text-gray-600">
                Add usernames of players who should receive notifications when the match starts.
                They'll be able to view live scores but not make changes.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Spectator Input */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={spectatorInput}
                    onChange={(e) => setSpectatorInput(e.target.value)}
                    placeholder="Enter username to add as spectator"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpectator())}
                    data-testid="input-spectator-username"
                  />
                  {spectatorInput && (
                    <div className="mt-1 text-sm">
                      {validatingUsername === spectatorInput ? (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Checking username...
                        </div>
                      ) : usernameValidation[spectatorInput] ? (
                        usernameValidation[spectatorInput].isValid ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <Check className="h-3 w-3" />
                            Found: {usernameValidation[spectatorInput].profileName}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <X className="h-3 w-3" />
                            Username not found
                          </div>
                        )
                      ) : null}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={addSpectator}
                  disabled={!spectatorInput || validatingUsername === spectatorInput || !usernameValidation[spectatorInput]?.isValid}
                  data-testid="button-add-spectator"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Spectator List */}
              {formData.spectatorUsernames.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Spectators ({formData.spectatorUsernames.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.spectatorUsernames.map((username) => (
                      <Badge key={username} variant="secondary" className="flex items-center gap-1">
                        {username}
                        {usernameValidation[username]?.profileName && (
                          <span className="text-xs text-gray-500">
                            ({usernameValidation[username].profileName})
                          </span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSpectator(username)}
                          className="h-4 w-4 p-0 hover:bg-red-100"
                          data-testid={`button-remove-spectator-${username}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {formData.spectatorUsernames.length === 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No spectators added. You can add spectators later, but they won't receive match start notifications.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || createLiveMatchMutation.isPending}
              data-testid="button-create-match"
            >
              {createLiveMatchMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Match...
                </>
              ) : (
                <>
                  Create Live Match
                  {formData.spectatorUsernames.length > 0 && (
                    <Badge className="ml-2" variant="secondary">
                      {formData.spectatorUsernames.length} spectators
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}