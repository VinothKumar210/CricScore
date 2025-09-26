import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginRequest } from "@shared/schema";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginRequest) {
    setIsLoading(true);
    // Clear any existing field errors
    form.clearErrors();
    
    try {
      const user = await login(values.email, values.password);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      
      // Small delay to ensure auth state is updated, then redirect
      setTimeout(() => {
        if (user.profileComplete) {
          setLocation("/dashboard");
        } else {
          setLocation("/profile-setup");
        }
      }, 100);
    } catch (error: any) {
      // Check if this is a field-specific error from the backend
      if (error.message && error.field) {
        if (error.field === "email") {
          form.setError("email", {
            type: "manual",
            message: error.message
          });
        } else if (error.field === "password") {
          form.setError("password", {
            type: "manual",
            message: error.message
          });
        }
      } else {
        // Fallback to toast for other errors
        toast({
          title: "Error",
          description: error.message || "Failed to login",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <span className="text-primary-foreground text-2xl font-bold">C</span>
          </div>
          <CardTitle className="text-3xl font-bold">CricketScore Pro</CardTitle>
          <CardDescription>Track your cricket career statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            variant="secondary"
            className="w-full mt-4"
            asChild
            data-testid="link-register"
          >
            <Link href="/register">Create New Account</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
