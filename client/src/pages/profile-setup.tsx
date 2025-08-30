import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSetupSchema, type ProfileSetup } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function ProfileSetup() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileSetup>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      username: "",
      role: undefined,
      battingHand: undefined,
      bowlingStyle: undefined,
    },
  });

  const selectedRole = form.watch("role");

  async function onSubmit(values: ProfileSetup) {
    setIsLoading(true);
    try {
      await apiRequest('PUT', '/api/profile', values);
      toast({
        title: "Success",
        description: "Profile completed successfully",
      });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Complete Your Cricket Profile</CardTitle>
            <CardDescription>Set up your cricket profile to start tracking your career</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold border-b border-border pb-2">Basic Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Choose a unique username"
                              data-testid="input-username"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">This will be your unique identifier</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Player Role *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-role">
                                <SelectValue placeholder="Select your role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="batsman">Batsman</SelectItem>
                              <SelectItem value="bowler">Bowler</SelectItem>
                              <SelectItem value="all-rounder">All-rounder</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Playing Style */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold border-b border-border pb-2">Playing Style</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="battingHand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Batting Hand *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-batting-hand">
                                <SelectValue placeholder="Select batting hand" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="right">Right Hand</SelectItem>
                              <SelectItem value="left">Left Hand</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {(selectedRole === "bowler" || selectedRole === "all-rounder") && (
                      <FormField
                        control={form.control}
                        name="bowlingStyle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bowling Style {selectedRole === "bowler" ? "*" : ""}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-bowling-style">
                                  <SelectValue placeholder="Select bowling style" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="fast">Fast</SelectItem>
                                <SelectItem value="medium-fast">Medium Fast</SelectItem>
                                <SelectItem value="spin">Spin</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Required for Bowlers and All-rounders</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-complete-profile"
                >
                  {isLoading ? "Completing profile..." : "Complete Profile Setup"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
