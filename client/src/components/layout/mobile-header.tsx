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
    <header className="glassmorphism border-0 border-b border-border/30 p-4 lg:hidden backdrop-blur-xl shadow-xl safe-area-top bg-gradient-to-r from-white/95 to-blue-50/95">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            data-testid="button-mobile-menu"
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-blue-500/10 backdrop-blur-sm border border-primary/30 hover:border-primary/50 hover:bg-primary/15 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105"
          >
            {isMenuOpen ? <X className="h-5 w-5 text-primary" /> : <Menu className="h-5 w-5 text-primary" />}
          </Button>
          {hasPendingInvitations && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg animate-bounce">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-500 rounded-xl flex items-center justify-center shadow-xl">
              <Sparkles className="w-5 h-5 text-white drop-shadow-md" />
            </div>
            <h1 className="text-xl font-black bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent tracking-tight">
              CricScore
            </h1>
          </div>
          <InstallPWAButton />
        </div>
        <Link href="/profile">
          <div className="relative group">
            <div className="w-11 h-11 bg-gradient-to-br from-primary to-sky-500 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden shadow-lg group-hover:scale-110 transition-transform duration-300">
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
