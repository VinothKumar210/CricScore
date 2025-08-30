import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTeamSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Users, Crown, LogOut } from "lucide-react";
import { z } from "zod";

const teamFormSchema = insertTeamSchema.omit({ captainId: true });
type TeamFormData = z.infer<typeof teamFormSchema>;

export default function Teams() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: teams, isLoading } = useQuery({
    queryKey: ["/api/teams"],
  });

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: "",
      description: "",
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

  function onSubmit(values: TeamFormData) {
    createTeamMutation.mutate(values);
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground" data-testid="title-teams">
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

      {/* Teams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {teams && teams.length > 0 ? (
          teams.map((team: any) => (
            <Card key={team.id} className="hover:shadow-lg transition-shadow" data-testid={`card-team-${team.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(team.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={team.captainId === user?.id ? "default" : "secondary"}
                    className="flex items-center space-x-1"
                  >
                    {team.captainId === user?.id ? (
                      <>
                        <Crown className="h-3 w-3" />
                        <span>Captain</span>
                      </>
                    ) : (
                      <span>Member</span>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {team.description && (
                  <p className="text-sm text-muted-foreground mb-4">{team.description}</p>
                )}

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Team ID</span>
                    <span className="font-medium text-foreground">{team.id.substring(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-medium text-foreground">
                      {team.captainId === user?.id ? "Captain" : "Member"}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {team.captainId === user?.id ? (
                    <Button className="flex-1" data-testid={`button-manage-${team.id}`}>
                      <Users className="mr-2 h-4 w-4" />
                      Manage Team
                    </Button>
                  ) : (
                    <>
                      <Button variant="secondary" className="flex-1" data-testid={`button-view-${team.id}`}>
                        View Team
                      </Button>
                      <Button variant="destructive" size="sm" data-testid={`button-leave-${team.id}`}>
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
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
