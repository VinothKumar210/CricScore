import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface MobileHeaderProps {
  isMenuOpen: boolean;
  onMenuToggle: () => void;
}

export function MobileHeader({ isMenuOpen, onMenuToggle }: MobileHeaderProps) {
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
          <Button
            variant="ghost"
            size="sm"
            data-testid="button-mobile-profile"
          >
            <User className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </header>
  );
}
