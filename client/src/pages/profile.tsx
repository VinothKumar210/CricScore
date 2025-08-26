import { useAuth } from "@/components/auth/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, Trophy } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Player Profile</h1>
            <p className="text-muted-foreground">Your cricket profile and playing details</p>
          </div>

          {/* Profile Card */}
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-4">
                <User className="w-10 h-10 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">{user.profileName || "Cricketer"}</CardTitle>
              <CardDescription className="text-lg">@{user.username}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b border-border pb-2">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium" data-testid="profile-email">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Username</p>
                      <p className="font-medium" data-testid="profile-username">{user.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Trophy className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Profile Name</p>
                      <p className="font-medium" data-testid="profile-name">{user.profileName || "Cricketer"}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Member Since</p>
                      <p className="font-medium" data-testid="profile-created">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Playing Style */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b border-border pb-2">Playing Style</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Player Role</p>
                    <Badge variant="secondary" className="text-sm" data-testid="profile-role">
                      {user.role ? formatRole(user.role) : "Not specified"}
                    </Badge>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Batting Hand</p>
                    <Badge variant="outline" className="text-sm" data-testid="profile-batting-hand">
                      {user.battingHand ? formatBattingHand(user.battingHand) : "Not specified"}
                    </Badge>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Bowling Style</p>
                    <Badge variant="outline" className="text-sm" data-testid="profile-bowling-style">
                      {user.bowlingStyle ? formatBowlingStyle(user.bowlingStyle) : "Not specified"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Profile Status */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b border-border pb-2">Account Status</h2>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Profile Completion</span>
                  <Badge 
                    variant={user.profileComplete ? "default" : "destructive"}
                    data-testid="profile-status"
                  >
                    {user.profileComplete ? "Complete" : "Incomplete"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}