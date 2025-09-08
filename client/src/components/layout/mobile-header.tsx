import { Menu, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/components/auth/auth-context";
import { InstallPWAButton } from "@/components/install-pwa-button";

interface MobileHeaderProps {
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  hasPendingInvitations?: boolean;
}

export function MobileHeader({ isMenuOpen, onMenuToggle, hasPendingInvitations }: MobileHeaderProps) {
  const { user } = useAuth();

  // Get first alphabetic letter from profile name
  const getProfileInitial = (profileName?: string) => {
    if (!profileName) return 'P';
    const firstAlphabetic = profileName.match(/[a-zA-Z]/);
    return firstAlphabetic ? firstAlphabetic[0].toUpperCase() : 'P';
  };

  return (
    <header className="glassmorphism border-0 border-b border-white/10 p-3 sm:p-4 lg:hidden backdrop-blur-xl shadow-modern safe-area-top">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            data-testid="button-mobile-menu"
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-background/50 to-background/30 border border-white/10 hover:border-primary/30 hover:bg-gradient-to-br hover:from-primary/10 hover:to-sky-500/10 transition-all duration-300 shadow-sm"
          >
            {isMenuOpen ? <X className="h-5 w-5 text-foreground" /> : <Menu className="h-5 w-5 text-foreground" />}
          </Button>
          {hasPendingInvitations && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg animate-bounce">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-sky-500 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">
              CricScore
            </h1>
          </div>
          <InstallPWAButton />
        </div>
        <Link href="/profile">
          <div className="relative group">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-sky-500 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden shadow-lg group-hover:scale-110 transition-transform duration-300">
              {(user as any)?.profilePictureUrl ? (
                <img 
                  src={(user as any).profilePictureUrl} 
                  alt="Profile picture" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-lg">
                  {getProfileInitial(user?.profileName)}
                </span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
          </div>
        </Link>
      </div>
    </header>
  );
}
