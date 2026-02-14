import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginRequest } from "@shared/schema";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginRequest) {
    setIsLoading(true);
    form.clearErrors();

    try {
      const user = await login(values.email, values.password);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });

      setTimeout(() => {
        if (user.profileComplete) {
          setLocation("/dashboard");
        } else {
          setLocation("/profile-setup");
        }
      }, 100);
    } catch (error: any) {
      const errorMessage = error?.code === 'auth/invalid-credential'
        ? 'Invalid email or password'
        : error?.code === 'auth/user-not-found'
          ? 'No account found with this email'
          : error?.code === 'auth/wrong-password'
            ? 'Incorrect password'
            : error.message || "Failed to login";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      const user = await loginWithGoogle();
      toast({
        title: "Success",
        description: "Signed in with Google successfully",
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
        ? 'Sign in was cancelled'
        : error?.code === 'auth/popup-blocked'
          ? 'Pop-up was blocked. Please allow pop-ups and try again'
          : error.message || "Failed to sign in with Google";

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
    <div className="bg-blue-50 dark:bg-slate-900 min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative border-[8px] border-white dark:border-slate-800">

        {/* Status Bar Fake */}
        <div className="flex justify-between items-center px-8 pt-6 pb-2 w-full text-slate-600 dark:text-slate-400">
          <span className="text-sm font-semibold">9:41</span>
          <div className="flex gap-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg> {/* Simplified icons */}
          </div>
        </div>

        <div className="flex-1 px-8 pt-4 pb-12 flex flex-col items-center">
          {/* Logo */}
          <div className="mb-8 transform hover:scale-105 transition-transform duration-300">
            <img
              src="/logo-new.png"
              alt="CricScore"
              className="w-32 h-32 object-contain drop-shadow-xl"
            />
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 font-display">Welcome Back</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Sign in to continue your cricket journey</p>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
            className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/50 dark:border-slate-700/50 py-4 px-6 rounded-full flex items-center justify-center gap-3 transition-all active:scale-95 mb-8 hover:bg-white/80 dark:hover:bg-slate-800/80 disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <span className="text-primary font-semibold text-sm">Signing in...</span>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                </svg>
                <span className="text-primary font-semibold text-sm">Sign in with Google</span>
              </>
            )}
          </button>

          <div className="w-full flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-slate-300 dark:bg-slate-700"></div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase">Or with email</span>
            <div className="flex-1 h-px bg-slate-300 dark:bg-slate-700"></div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
            <div>
              <label className="block text-slate-800 dark:text-slate-200 text-sm font-semibold mb-2 ml-1">Email</label>
              <input
                {...form.register("email")}
                type="email"
                placeholder="kit61@gmail.com"
                className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
              />
              {form.formState.errors.email && (
                <p className="text-red-500 text-xs mt-1 ml-1">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <div className="flex justify-between items-center mb-2 ml-1">
                <label className="block text-slate-800 dark:text-slate-200 text-sm font-semibold">Password</label>
                {/* <a href="#" className="text-primary text-xs font-semibold hover:underline">Forgot Password?</a> */}
              </div>
              <input
                {...form.register("password")}
                type="password"
                placeholder="••••••••"
                className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
              />
              {form.formState.errors.password && (
                <p className="text-red-500 text-xs mt-1 ml-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-5 rounded-2xl mt-8 shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all hover:shadow-blue-500/30 disabled:opacity-70"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="flex-1"></div>

          <div className="mt-8 pb-4">
            <Link href="/register">
              <button className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm border border-white/40 dark:border-slate-700/40 py-3 px-8 rounded-2xl transition-all active:scale-95 hover:bg-white/60">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  New to CricScore? <span className="text-primary font-bold">Sign up</span>
                </p>
              </button>
            </Link>
          </div>
        </div>

        <div className="w-full flex justify-center pb-2">
          <div className="w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
