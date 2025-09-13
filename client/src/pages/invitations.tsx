import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-context";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { Users, Mail, Check, X, Send } from "lucide-react";
import { z } from "zod";
import type { Team } from "@shared/schema";

const inviteFormSchema = z.object({
  teamId: z.string().min(1, "Please select a team"),
  username: z.string().min(1, "Please enter a username"),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

export default function Invitations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invitations, isLoading: invitationsLoading } = useQuery<any[]>({
    queryKey: ["/api/invitations"],
    enabled: !!user,
  });

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: !!user,
  });

  const form = useForm<InviteFormData>({
    defaultValues: {
      teamId: "",
      username: "",
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const response = await apiRequest('POST', '/api/invitations', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invitation sent successfully!",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const respondToInviteMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "ACCEPTED" | "REJECTED" }) => {
      const response = await apiRequest('PUT', `/api/invitations/${id}`, { status });
      return response.json();
    },
    onSuccess: (_, { status }) => {
      toast({
        title: "Success",
        description: `Invitation ${status} successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to respond to invitation",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: InviteFormData) {
    sendInviteMutation.mutate(values);
  }

  function acceptInvitation(id: string) {
    respondToInviteMutation.mutate({ id, status: "ACCEPTED" });
  }

  function rejectInvitation(id: string) {
    respondToInviteMutation.mutate({ id, status: "REJECTED" });
  }

  if (invitationsLoading || teamsLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-4 sm:space-y-6">
          <div className="h-6 sm:h-8 bg-muted rounded w-1/2 sm:w-1/3"></div>
          <div className="space-y-3 sm:space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 sm:h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const captainTeams = teams?.filter((team: Team) => team.captainId === team.captainId) || [];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="title-invitations">
        Team Invitations
      </h2>
      <div className="space-y-6">
        {/* Pending Invitations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Invitations you've received from other teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invitations && invitations.length > 0 ? (
                invitations.map((invite: any) => (
                  <div
                    key={invite.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-muted/30 rounded-lg space-y-3 sm:space-y-0"
                    data-testid={`invitation-${invite.id}`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="text-primary-foreground text-sm" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{invite.team.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Invited by @{invite.inviter.username}
                        </p>
                        <p className="text-xs text-muted-foreground sm:hidden">
                          {new Date(invite.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2 sm:flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => acceptInvitation(invite.id)}
                        disabled={respondToInviteMutation.isPending}
                        data-testid={`button-accept-${invite.id}`}
                        className="flex-1 sm:flex-none"
                      >
                        <Check className="mr-1 h-4 w-4" />
                        <span className="hidden xs:inline">Accept</span>
                        <span className="xs:hidden">Accept</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectInvitation(invite.id)}
                        disabled={respondToInviteMutation.isPending}
                        data-testid={`button-reject-${invite.id}`}
                        className="flex-1 sm:flex-none"
                      >
                        <X className="mr-1 h-4 w-4" />
                        <span className="hidden xs:inline">Decline</span>
                        <span className="xs:hidden">Reject</span>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No pending invitations</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Send Invitation */}
        {captainTeams.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Send className="mr-2 h-5 w-5" />
                Invite Players to Your Teams
              </CardTitle>
              <CardDescription>
                Send invitations to other players to join your teams
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="teamId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Team</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={teamsLoading}>
                            <SelectTrigger data-testid="select-team">
                              <SelectValue placeholder="Choose a team" />
                            </SelectTrigger>
                            <SelectContent>
                              {captainTeams.map((team: any) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter username"
                              data-testid="input-invite-username"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={sendInviteMutation.isPending}
                    data-testid="button-send-invitation"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {sendInviteMutation.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
