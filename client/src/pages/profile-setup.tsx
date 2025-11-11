import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-context";
import { useForm } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSetupSchema, type ProfileSetup } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Check, X, Loader2 } from "lucide-react";

export default function ProfileSetup() {
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: ""
  });

  const form = useForm<ProfileSetup>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      username: "",
      profileName: "",
      description: "",
      role: undefined,
      battingHand: undefined,
      bowlingStyle: undefined,
    },
  });

  const selectedRole = form.watch("role");
  const watchedUsername = form.watch("username");

  // Debounced username availability check
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus({ checking: false, available: null, message: "" });
      return;
    }

    setUsernameStatus({ checking: true, available: null, message: "" });
    
    try {
      const response = await fetch(`/api/users/check-username?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      
      setUsernameStatus({
        checking: false,
        available: data.available,
        message: data.message
      });
    } catch (error) {
      setUsernameStatus({
        checking: false,
        available: null,
        message: "Unable to check username availability"
      });
    }
  }, []);

  // Effect to debounce username checking
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (watchedUsername) {
        checkUsernameAvailability(watchedUsername);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [watchedUsername, checkUsernameAvailability]);

  async function onSubmit(values: ProfileSetup) {
    setIsLoading(true);
    try {
      await apiRequest('PUT', '/api/profile', values);
      // Refresh user data to get updated profileComplete status
      await refreshUser();
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
    <div className="min-h-screen min-h-dvh bg-background safe-area-top safe-area-bottom">
      <div className="container-mobile py-4 sm:py-8 max-w-2xl">
        <Card className="card-mobile">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4 shadow-lg">
              <span className="text-primary-foreground text-2xl">🏏</span>
            </div>
            <CardTitle className="text-mobile-h2">Complete Your Cricket Profile</CardTitle>
            <CardDescription className="text-mobile-caption">Set up your cricket profile to start tracking your career</CardDescription>
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
                            <div className="relative">
                              <Input
                                placeholder="Choose a unique username"
                                data-testid="input-username"
                                className={
                                  usernameStatus.available === true 
                                    ? "border-green-500 focus:border-green-500" 
                                    : usernameStatus.available === false 
                                    ? "border-red-500 focus:border-red-500" 
                                    : ""
                                }
                                {...field}
                              />
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                {usernameStatus.checking && (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                                {!usernameStatus.checking && usernameStatus.available === true && (
                                  <Check className="h-4 w-4 text-green-500" />
                                )}
                                {!usernameStatus.checking && usernameStatus.available === false && (
                                  <X className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </div>
                          </FormControl>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">This will be your unique identifier</p>
                            {usernameStatus.message && (
                              <p 
                                className={`text-xs ${
                                  usernameStatus.available === true 
                                    ? "text-green-600" 
                                    : usernameStatus.available === false 
                                    ? "text-red-600" 
                                    : "text-muted-foreground"
                                }`}
                                data-testid="username-status-message"
                              >
                                {usernameStatus.message}
                              </p>
                            )}
                          </div>
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
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BATSMAN">Batsman</SelectItem>
                              <SelectItem value="BOWLER">Bowler</SelectItem>
                              <SelectItem value="ALL_ROUNDER">All-rounder</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="profileName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Name (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Player"
                            data-testid="input-profile-name"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Display name for your profile (defaults to "Player" if left empty)</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about yourself, your cricket experience, favorite position, or anything else you'd like to share..."
                            className="resize-none"
                            rows={3}
                            data-testid="input-description"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Brief description about yourself or your cricket journey</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger data-testid="select-batting-hand">
                              <SelectValue placeholder="Select batting hand" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RIGHT">Right Hand</SelectItem>
                              <SelectItem value="LEFT">Left Hand</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {(selectedRole === "BOWLER" || selectedRole === "ALL_ROUNDER") && (
                      <FormField
                        control={form.control}
                        name="bowlingStyle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bowling Style {selectedRole === "BOWLER" ? "*" : ""}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger data-testid="select-bowling-style">
                                <SelectValue placeholder="Select bowling style" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FAST">Fast</SelectItem>
                                <SelectItem value="MEDIUM_FAST">Medium Fast</SelectItem>
                                <SelectItem value="SPIN">Spin</SelectItem>
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
