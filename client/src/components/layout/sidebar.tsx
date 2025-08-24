import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-context";
import { Users, BarChart3, Plus, Mail, LogOut, Gauge } from "lucide-react";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Gauge },
    { name: "My Statistics", href: "/statistics", icon: BarChart3 },
    { name: "Add Match", href: "/add-match", icon: Plus },
    { name: "My Teams", href: "/teams", icon: Users },
    { name: "Invitations", href: "/invitations", icon: Mail },
  ];

  return (
    <aside className={cn("w-64 bg-card border-r border-border", className)}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-bold">C</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">CricketScore Pro</h1>
            <p className="text-xs text-muted-foreground">@{user?.username || 'user'}</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <button
          onClick={logout}
          data-testid="button-logout"
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
