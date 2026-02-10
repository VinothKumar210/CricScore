import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTeamSchema, type Team, type User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Users, Crown, LogOut, Search, UserPlus, CheckCircle, XCircle, Shield } from "lucide-react";
import { z } from "zod";

const teamFormSchema = insertTeamSchema.omit({ captainId: true });
type TeamFormData = z.infer<typeof teamFormSchema>;

const userSearchSchema = z.object({
  username: z.string().min(1, "Username is required"),
});
type UserSearchData = z.infer<typeof userSearchSchema>;

export default function Teams() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [searchedUser, setSearchedUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Helper function to determine user's role in a team
  const getUserRole = (team: any) => {
    if (team.captainId === user?.id) {
      return { role: "Captain", icon: Crown, variant: "default" as const };
    } else if (team.viceCaptainId === user?.id) {
      return { role: "Vice Captain", icon: Shield, variant: "secondary" as const };
    } else {
      return { role: "Member", icon: Users, variant: "outline" as const };
    }
  };

  const { data: teams, isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: !!user,
  });

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const searchForm = useForm<UserSearchData>({
    resolver: zodResolver(userSearchSchema),
    defaultValues: {
      username: "",
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: TeamFormData) => {
      const response = await apiRequest('POST', '/api/teams', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Team created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create team",
        variant: "destructive",
      });
    },
  });

  const searchUserMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await fetch(`/api/users/search?username=${encodeURIComponent(username)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: (userData: User) => {
      setSearchedUser(userData);
      setIsSearching(false);
    },
    onError: (error: any) => {
      setSearchedUser(null);
      setIsSearching(false);
      toast({
        title: "User not found",
        description: error.message || "Could not find user with that username",
        variant: "destructive",
      });
    },
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async ({ teamId, username }: { teamId: string; username: string }) => {
      const response = await apiRequest('POST', '/api/invitations', { teamId, username });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent!",
        description: "The player will receive your team invitation.",
      });
      setSearchedUser(null);
      searchForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Could not send invitation",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: TeamFormData) {
    createTeamMutation.mutate(values);
  }

  function onSearchUser(values: UserSearchData) {
    setIsSearching(true);
    setSearchedUser(null);
    searchUserMutation.mutate(values.username);
  }

  function handleManageTeam(team: Team) {
    setSelectedTeam(team);
    setIsManageModalOpen(true);
    setSearchedUser(null);
    searchForm.reset();
  }

  function handleSendInvitation() {
    if (selectedTeam && searchedUser) {
      sendInvitationMutation.mutate({
        teamId: selectedTeam.id,
        username: searchedUser.username!,
      });
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-mobile space-mobile-lg">
      <div className="mobile-stack">
        <h2 className="text-mobile-h1" data-testid="title-teams">
          Team Management
        </h2>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-team">
              <Plus className="mr-2 h-4 w-4" />
              Create New Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Set up a new cricket team and invite players to join.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter team name"
                          data-testid="input-team-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Optional team description"
                          data-testid="input-team-description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setIsCreateModalOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createTeamMutation.isPending}
                    data-testid="button-submit-team"
                  >
                    {createTeamMutation.isPending ? "Creating..." : "Create Team"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Manage Team Dialog */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Team: {selectedTeam?.name}</DialogTitle>
            <DialogDescription>
              Search for players by username and send them team invitations.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* User Search Section */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center">
                <Search className="mr-2 h-4 w-4" />
                Find Player
              </h4>
              
              <Form {...searchForm}>
                <form onSubmit={searchForm.handleSubmit(onSearchUser)} className="space-y-4">
                  <FormField
                    control={searchForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <div className="flex space-x-2">
                          <FormControl>
                            <Input
                              placeholder="Enter username to search"
                              data-testid="input-search-username"
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={isSearching || searchUserMutation.isPending}
                            data-testid="button-search-user"
                          >
                            {isSearching || searchUserMutation.isPending ? "Searching..." : "Search"}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>

            {/* Search Results */}
            {searchedUser && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Player Found
                  </h4>
                  
                  <Card>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Username</span>
                          <span className="font-medium">{searchedUser.username}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Email</span>
                          <span className="font-medium">{searchedUser.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Role</span>
                          <Badge variant="outline">{searchedUser.role || "Not specified"}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Batting Hand</span>
                          <span className="font-medium">{searchedUser.battingHand || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Bowling Style</span>
                          <span className="font-medium">{searchedUser.bowlingStyle || "Not specified"}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex space-x-2">
                        <Button
                          onClick={handleSendInvitation}
                          disabled={sendInvitationMutation.isPending}
                          className="flex-1"
                          data-testid="button-send-invitation"
                        >
                          {sendInvitationMutation.isPending ? "Sending..." : "Send Invitation"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setSearchedUser(null)}
                          data-testid="button-clear-search"
                        >
                          Clear
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {teams && teams.length > 0 ? (
          teams.map((team: any) => {
            const userRole = getUserRole(team);
            const RoleIcon = userRole.icon;
            
            return (
              <Link 
                key={team.id} 
                href={`/teams/${team.id}`}
                onClick={() => sessionStorage.setItem("teamDetailReferrer", "/teams")}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer" data-testid={`card-team-${team.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(team.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={userRole.variant}
                        className="flex items-center space-x-1"
                      >
                        <RoleIcon className="h-3 w-3" />
                        <span>{userRole.role}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {team.description && (
                      <p className="text-sm text-muted-foreground mb-4">{team.description}</p>
                    )}

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Team ID</span>
                        <span className="font-medium text-foreground">{team.id.substring(0, 8)}...</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Role</span>
                        <span className="font-medium text-foreground">
                          {userRole.role}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        ) : (
          <div className="col-span-2 text-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No teams yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first team or wait for an invitation to join others.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)} data-testid="button-create-first-team">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Team
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
