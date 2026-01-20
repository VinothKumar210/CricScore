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
import { registerSchema, type RegisterRequest } from "@shared/schema";

export default function Register() {
  const [, setLocation] = useLocation();
  const { register: registerUser, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<RegisterRequest>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: RegisterRequest) {
    setIsLoading(true);
    try {
      await registerUser(values.email, values.password);
      toast({
        title: "Success",
        description: "Account created successfully",
      });
      setLocation("/profile-setup");
    } catch (error: any) {
      const errorMessage = error?.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists'
        : error?.code === 'auth/weak-password'
        ? 'Password should be at least 6 characters'
        : error?.code === 'auth/invalid-email'
        ? 'Please enter a valid email address'
        : error.message || "Failed to create account";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setIsGoogleLoading(true);
    try {
      const user = await loginWithGoogle();
      toast({
        title: "Success",
        description: "Signed up with Google successfully",
      });
      
      setTimeout(() => {
        if (user.profileComplete) {
          setLocation("/dashboard");
        } else {
          setLocation("/profile-setup");
        }
      }, 100);
    } catch (error: any) {
      const errorMessage = error?.code === 'auth/popup-closed-by-user'
        ? 'Sign up was cancelled'
        : error?.code === 'auth/popup-blocked'
        ? 'Pop-up was blocked. Please allow pop-ups and try again'
        : error.message || "Failed to sign up with Google";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center container-mobile safe-area-top safe-area-bottom">
      <Card className="w-full max-w-sm sm:max-w-md card-mobile">
        <CardHeader className="text-center space-y-3 sm:space-y-4">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-full flex items-center justify-center mb-4 shadow-lg">
            <span className="text-primary-foreground text-xl sm:text-2xl font-bold">🏏</span>
          </div>
          <CardTitle className="text-mobile-h2">Join CricScore</CardTitle>
          <CardDescription className="text-mobile-caption">Create your account to track your cricket career</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 mb-4"
            onClick={handleGoogleSignUp}
            disabled={isLoading || isGoogleLoading}
            data-testid="button-google-signup"
          >
            {isGoogleLoading ? (
              "Signing up..."
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign up with Google
              </>
            )}
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or with email</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="form-mobile">
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
                        placeholder="Choose a strong password"
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
                className="w-full btn-mobile-lg"
                disabled={isLoading || isGoogleLoading}
                data-testid="button-register"
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </Form>

          <div className="text-center mt-4">
            <Button variant="link" asChild data-testid="link-login">
              <Link href="/login">Already have an account? Sign in</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
