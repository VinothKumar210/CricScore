import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/components/auth/auth-context";

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
    <header className="bg-card border-b border-border p-4 lg:hidden">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            data-testid="button-mobile-menu"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          {hasPendingInvitations && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-card" />
          )}
        </div>
        <h1 className="text-lg font-semibold text-foreground">CricScore</h1>
        <Link href="/profile">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer overflow-hidden">
            {(user as any)?.profilePictureUrl ? (
              <img 
                src={(user as any).profilePictureUrl} 
                alt="Profile picture" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-primary-foreground font-bold text-sm">
                {getProfileInitial(user?.profileName)}
              </span>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}
