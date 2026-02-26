export const LoginPage = () => {
    return (
        <div className="text-center space-y-8 animate-fade-in">
            {/* Logo */}
            <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center">
                    <span className="text-primary text-2xl font-bold">C</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    Welcome to CricScore
                </h1>
                <p className="text-muted-foreground text-sm">
                    Score matches, track stats, compete with friends
                </p>
            </div>

            {/* Sign in card */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Sign in to continue</h2>

                <button className="w-full flex items-center justify-center gap-3 bg-foreground text-background font-medium px-4 py-3 rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98]">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign in with Google
                </button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="bg-card px-3 text-muted-foreground">or</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <input
                        type="tel"
                        placeholder="Enter phone number"
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                    <button className="w-full bg-primary text-primary-foreground font-medium px-4 py-3 rounded-xl hover:bg-primary/90 transition-colors active:scale-[0.98]">
                        Continue with Phone
                    </button>
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                By continuing, you agree to CricScore's Terms of Service
            </p>
        </div>
    );
};
