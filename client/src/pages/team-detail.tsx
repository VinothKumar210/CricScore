import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { Crown, Users, Shield, ArrowLeft, MoreVertical, UserMinus, TrendingUp, TrendingDown, UserCheck, UserPlus, Search, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Team, User } from "@shared/schema";

interface TeamMember extends User {
  isViceCaptain?: boolean;
}

export default function TeamDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchError, setSearchError] = useState<string>("");
  const [referrerPage, setReferrerPage] = useState<string>("/dashboard");

  // Detect where the user came from
  useEffect(() => {
    const stored = sessionStorage.getItem("teamDetailReferrer");
    if (stored) {
      setReferrerPage(stored);
      // Clear it after use
      sessionStorage.removeItem("teamDetailReferrer");
    }
  }, []);

  const { data: team } = useQuery<Team>({
    queryKey: ["/api/teams", id],
  });

  const { data: members, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/teams", id, "members"],
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiRequest('DELETE', `/api/teams/${id}/members/${memberId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Member removed",
        description: "The member has been removed from the team.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  const promoteToViceCaptainMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiRequest('PUT', `/api/teams/${id}/promote-vice-captain`, { memberId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Member promoted",
        description: "The member has been promoted to vice captain.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to promote member",
        variant: "destructive",
      });
    },
  });

  const demoteViceCaptainMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PUT', `/api/teams/${id}/demote-vice-captain`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vice captain demoted",
        description: "The vice captain has been demoted to member.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to demote vice captain",
        variant: "destructive",
      });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/teams/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Team deleted",
        description: "The team has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team",
        variant: "destructive",
      });
    },
  });

  const transferCaptaincyMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiRequest('PUT', `/api/teams/${id}/transfer-captaincy`, { memberId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Captaincy transferred",
        description: "The captaincy has been transferred successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to transfer captaincy",
        variant: "destructive",
      });
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await apiRequest('POST', '/api/invitations', {
        teamId: id,
        username: username
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "Player invitation sent successfully!",
      });
      setIsInviteDialogOpen(false);
      setSearchTerm("");
      setSearchResults([]);
      setSelectedUser(null);
      setShowDropdown(false);
      setSearchError("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  // Live search effect
  useEffect(() => {
    const performLiveSearch = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        setSearchError("");
        return;
      }
      
      try {
        const response = await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(searchTerm.trim())}`);
        const users = await response.json();
        
        // Filter out current user and already team members
        const filteredUsers = users.filter((player: any) => 
          player.id !== user?.id && // Exclude current user
          !members?.some(member => member.id === player.id) // Exclude existing members
        );
        
        setSearchResults(filteredUsers.slice(0, 10)); // Limit to 10 results
        setShowDropdown(filteredUsers.length > 0);
        setSearchError("");
      } catch (error) {
        setSearchResults([]);
        setShowDropdown(false);
        setSearchError("Failed to search players");
      }
    };

    const delayedSearch = setTimeout(performLiveSearch, 300); // Debounce search
    return () => clearTimeout(delayedSearch);
  }, [searchTerm, user?.id, members]);

  // Handle user selection from dropdown
  const handleUserSelect = (player: User) => {
    setSelectedUser(player);
    setSearchTerm(player.profileName || player.username || "");
    setShowDropdown(false);
    setSearchError("");
  };

  // Handle manual search button click
  const handleSearch = async () => {
    if (searchTerm.trim().length < 2) {
      setSearchError("Please enter at least 2 characters");
      return;
    }
    
    try {
      const response = await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(searchTerm.trim())}`);
      const users = await response.json();
      
      // Filter out current user and already team members
      const filteredUsers = users.filter((player: any) => 
        player.id !== user?.id && // Exclude current user
        !members?.some(member => member.id === player.id) // Exclude existing members
      );
      
      if (filteredUsers.length === 0) {
        setSearchError("No users found with that username");
        setSelectedUser(null);
        setShowDropdown(false);
        return;
      }
      
      // If exact match found, select it
      const exactMatch = filteredUsers.find((u: User) => 
        u.username?.toLowerCase() === searchTerm.trim().toLowerCase() ||
        u.profileName?.toLowerCase() === searchTerm.trim().toLowerCase()
      );
      
      if (exactMatch) {
        handleUserSelect(exactMatch);
      } else {
        setSearchResults(filteredUsers.slice(0, 10));
        setShowDropdown(true);
        setSearchError("");
      }
    } catch (error) {
      setSearchError("Failed to search players");
      setSelectedUser(null);
      setShowDropdown(false);
    }
  };

  // Handle invite action
  const handleInvite = () => {
    if (!selectedUser) {
      setSearchError("Please select a user from the dropdown or search results");
      return;
    }
    
    sendInviteMutation.mutate(selectedUser.username || "");
  };

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isInviteDialogOpen) {
      setSearchTerm("");
      setSearchResults([]);
      setSelectedUser(null);
      setShowDropdown(false);
      setSearchError("");
    }
  }, [isInviteDialogOpen]);

  if (!team || isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isCaptain = team.captainId === user?.id;
  const isViceCaptain = team.viceCaptainId === user?.id;
  const canManageMembers = isCaptain || isViceCaptain;

  const handleRemoveMember = (memberId: string) => {
    removeMemberMutation.mutate(memberId);
  };

  const handlePromoteToViceCaptain = (memberId: string) => {
    promoteToViceCaptainMutation.mutate(memberId);
  };

  const handleDemoteViceCaptain = () => {
    demoteViceCaptainMutation.mutate();
  };

  const handleDeleteTeam = () => {
    deleteTeamMutation.mutate();
  };

  const handleTransferCaptaincy = (memberId: string) => {
    transferCaptaincyMutation.mutate(memberId);
  };

  // Group members by role
  const captain = members?.find(member => member.id === team.captainId);
  const viceCaptain = members?.find(member => member.id === team.viceCaptainId);
  const regularMembers = members?.filter(member => 
    member.id !== team.captainId && member.id !== team.viceCaptainId
  ) || [];

  const renderMemberCard = (member: TeamMember, role: 'captain' | 'vice-captain' | 'member') => {
    const isMemberCaptain = member.id === team.captainId;
    const isMemberViceCaptain = member.id === team.viceCaptainId;
    const isCurrentUser = member.id === user?.id;
    
    // Determine what actions the current user can perform
    const canRemove = !isCurrentUser && (
      (isCaptain && !isMemberCaptain) || 
      (isViceCaptain && !isMemberCaptain && !isMemberViceCaptain)
    );
    const canPromote = !isMemberCaptain && !isMemberViceCaptain && (isCaptain || isViceCaptain);
    const canDemote = isMemberViceCaptain && (isCaptain || isViceCaptain);
    const canTransferCaptaincy = isCaptain && !isMemberCaptain;

    return (
      <div
        key={member.id}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors space-y-3 sm:space-y-0"
        data-testid={`member-${member.id}`}
        onClick={() => setLocation(`/player/${member.id}`)}
      >
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-medium">
              {member.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground truncate">
              {member.profileName || member.username}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-sm text-muted-foreground truncate">
                @{member.username}
              </p>
              {member.role && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {member.role}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:space-x-2 sm:gap-0">
          {/* Role badges */}
          {isMemberCaptain && (
            <Badge variant="default" className="flex items-center space-x-1">
              <Crown className="h-3 w-3" />
              <span>Captain</span>
            </Badge>
          )}
          {isMemberViceCaptain && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Shield className="h-3 w-3" />
              <span>Vice Captain</span>
            </Badge>
          )}
          {!isMemberCaptain && !isMemberViceCaptain && (
            <Badge variant="outline">Member</Badge>
          )}

          {/* Action dropdown */}
          {canManageMembers && !isCurrentUser && (canTransferCaptaincy || canPromote || canDemote || canRemove) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid={`dropdown-actions-${member.id}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canTransferCaptaincy && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        data-testid={`action-transfer-captaincy-${member.id}`}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Transfer Captaincy
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Transfer Team Captaincy</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to transfer captaincy to {member.profileName || member.username}? You will become the vice captain and lose captain privileges.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleTransferCaptaincy(member.id)}
                          disabled={transferCaptaincyMutation.isPending}
                          data-testid={`confirm-transfer-${member.id}`}
                        >
                          {transferCaptaincyMutation.isPending ? "Transferring..." : "Transfer Captaincy"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {canPromote && (
                  <DropdownMenuItem
                    onClick={() => handlePromoteToViceCaptain(member.id)}
                    disabled={promoteToViceCaptainMutation.isPending}
                    data-testid={`action-promote-${member.id}`}
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Promote to Vice Captain
                  </DropdownMenuItem>
                )}
                {canDemote && (
                  <DropdownMenuItem
                    onClick={handleDemoteViceCaptain}
                    disabled={demoteViceCaptainMutation.isPending}
                    data-testid={`action-demote-${member.id}`}
                  >
                    <TrendingDown className="mr-2 h-4 w-4" />
                    Demote to Member
                  </DropdownMenuItem>
                )}
                {canRemove && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive focus:text-destructive"
                        data-testid={`action-remove-${member.id}`}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Remove from Team
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove {member.profileName || member.username} from the team? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removeMemberMutation.isPending}
                          data-testid={`confirm-remove-${member.id}`}
                        >
                          {removeMemberMutation.isPending ? "Removing..." : "Remove Member"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 relative">
      {/* Delete Team Button - Top Right Corner */}
      {isCaptain && (
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="xs"
                data-testid="button-delete-team"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                <span className="hidden sm:inline">Delete</span>
                <span className="sm:hidden">×</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Team</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to permanently delete "{team.name}"? This action cannot be undone. All team members, invitations, and team data will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteTeam}
                  disabled={deleteTeamMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="confirm-delete-team"
                >
                  {deleteTeamMutation.isPending ? "Deleting..." : "Delete Team"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Header */}
      <div className="space-y-4">
        {/* Back button - full width on mobile */}
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(referrerPage)}
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {referrerPage === "/teams" ? "Back to Teams" : "Back to Dashboard"}
          </Button>
        </div>
        
        {/* Team info and actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pr-16 sm:pr-20">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground break-words" data-testid="title-team-name">
              {team.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              {team.description || "No description provided"}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {isCaptain && (
              <Badge variant="default" className="flex items-center space-x-1 shrink-0">
                <Crown className="h-3 w-3" />
                <span className="hidden sm:inline">Captain</span>
                <span className="sm:hidden">Cap</span>
              </Badge>
            )}
            {isViceCaptain && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Shield className="h-3 w-3" />
                <span>Vice Captain</span>
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Team Members</span>
            <Badge variant="outline">{members?.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {members && members.length > 0 ? (
              <>
                {/* Captain Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                    <Crown className="mr-2 h-5 w-5 text-yellow-500" />
                    Captain {captain ? '(1)' : '(0)'}
                  </h3>
                  {captain ? (
                    renderMemberCard(captain, 'captain')
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No captain assigned</p>
                    </div>
                  )}
                </div>

                {/* Vice Captain Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                    <Shield className="mr-2 h-5 w-5 text-blue-500" />
                    Vice Captain {viceCaptain ? '(1)' : '(0)'}
                  </h3>
                  {viceCaptain ? (
                    renderMemberCard(viceCaptain, 'vice-captain')
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No vice captain assigned</p>
                    </div>
                  )}
                </div>

                {/* Members Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                    <Users className="mr-2 h-5 w-5 text-gray-500" />
                    Members ({regularMembers.length})
                  </h3>
                  {regularMembers.length > 0 ? (
                    <div className="space-y-3">
                      {regularMembers.map((member) => renderMemberCard(member, 'member'))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No members yet</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No team members found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Floating Invite Button */}
      {canManageMembers && (
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg"
              size="lg"
              data-testid="button-invite-player"
            >
              <UserPlus className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Player to Team</DialogTitle>
              <DialogDescription>
                Search for a player by username and send them an invitation to join {team.name}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Search Input with Dropdown */}
              <div className="relative">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Search by username or profile name..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setSelectedUser(null); // Clear selection when typing
                      }}
                      onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                      onFocus={() => {
                        if (searchResults.length > 0 && !selectedUser) {
                          setShowDropdown(true);
                        }
                      }}
                      onBlur={(e) => {
                        // Only hide dropdown if not clicking on dropdown items
                        const relatedTarget = e.relatedTarget as HTMLElement;
                        if (!relatedTarget || !relatedTarget.closest('[data-dropdown]')) {
                          setTimeout(() => setShowDropdown(false), 150);
                        }
                      }}
                      data-testid="input-search-username"
                      className={searchError ? "border-red-500" : ""}
                    />
                    
                    {/* Live Search Dropdown */}
                    {showDropdown && searchResults.length > 0 && (
                      <div 
                        data-dropdown
                        className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto"
                        onMouseDown={(e) => e.preventDefault()} // Prevent input from losing focus
                      >
                        {searchResults.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center space-x-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                            onClick={() => handleUserSelect(player)}
                            data-testid={`dropdown-item-${player.id}`}
                          >
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-primary-foreground text-sm font-medium">
                                {(player.profileName || player.username)?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {player.profileName || player.username}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                @{player.username}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button onClick={handleSearch} variant="outline" data-testid="button-search">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Error Message */}
                {searchError && (
                  <p className="text-sm text-red-500 mt-2" data-testid="search-error">
                    {searchError}
                  </p>
                )}
              </div>
              
              {/* Selected User Display */}
              {selectedUser && (
                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {(selectedUser.profileName || selectedUser.username)?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-green-800 dark:text-green-200">
                          {selectedUser.profileName || selectedUser.username}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          @{selectedUser.username}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={handleInvite}
                      disabled={sendInviteMutation.isPending}
                      data-testid="button-invite-selected"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {sendInviteMutation.isPending ? "Sending..." : "Send Invite"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}