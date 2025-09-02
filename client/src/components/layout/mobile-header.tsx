import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/components/auth/auth-context";

interface MobileHeaderProps {
  isMenuOpen: boolean;
  onMenuToggle: () => void;
}

export function MobileHeader({ isMenuOpen, onMenuToggle }: MobileHeaderProps) {
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
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuToggle}
          data-testid="button-mobile-menu"
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <h1 className="text-lg font-semibold text-foreground">CricketScore Pro</h1>
        <Link href="/profile">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer">
            <span className="text-primary-foreground font-bold text-sm">
              {getProfileInitial(user?.profileName)}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
