import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { Crown, Users, Shield, ArrowLeft, MoreVertical, UserMinus, TrendingUp, TrendingDown, UserCheck } from "lucide-react";
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
        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
        data-testid={`member-${member.id}`}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-medium">
              {member.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">
              {member.profileName || member.username}
            </p>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-muted-foreground">
                @{member.username}
              </p>
              {member.role && (
                <Badge variant="outline" className="text-xs">
                  {member.role}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="title-team-name">
              {team.name}
            </h1>
            <p className="text-muted-foreground">
              {team.description || "No description provided"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isCaptain && (
            <Badge variant="default" className="flex items-center space-x-1">
              <Crown className="h-3 w-3" />
              <span>Captain</span>
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
                {captain && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                      <Crown className="mr-2 h-5 w-5 text-yellow-500" />
                      Captain
                    </h3>
                    {renderMemberCard(captain, 'captain')}
                  </div>
                )}

                {/* Vice Captain Section */}
                {viceCaptain && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                      <Shield className="mr-2 h-5 w-5 text-blue-500" />
                      Vice Captain
                    </h3>
                    {renderMemberCard(viceCaptain, 'vice-captain')}
                  </div>
                )}

                {/* Members Section */}
                {regularMembers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                      <Users className="mr-2 h-5 w-5 text-gray-500" />
                      Members ({regularMembers.length})
                    </h3>
                    <div className="space-y-3">
                      {regularMembers.map((member) => renderMemberCard(member, 'member'))}
                    </div>
                  </div>
                )}
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
    </div>
  );
}