import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Users, BarChart3, Plus, Mail, LogOut, Gauge, Search, UserPlus } from "lucide-react";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  // Fetch pending invitations to show notification badge
  const { data: invitations } = useQuery<any[]>({
    queryKey: ["/api/invitations"],
  });

  const hasPendingInvitations = invitations && invitations.length > 0;

  // Get first alphabetic letter from profile name
  const getProfileInitial = (profileName?: string) => {
    if (!profileName) return 'P';
    const firstAlphabetic = profileName.match(/[a-zA-Z]/);
    return firstAlphabetic ? firstAlphabetic[0].toUpperCase() : 'P';
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Gauge },
    { name: "My Statistics", href: "/statistics", icon: BarChart3 },
    { name: "Create Match", href: "/local-match", icon: UserPlus },
    { name: "My Teams", href: "/teams", icon: Users },
    { name: "Search Players", href: "/search", icon: Search },
    { name: "Invitations", href: "/invitations", icon: Mail },
  ];

  return (
    <aside className={cn("w-64 bg-card border-r border-border", className)}>
      <div className="p-6 border-b border-border">
        <Link href="/profile" onClick={onNavigate}>
          <div className="flex items-center space-x-3 cursor-pointer hover:bg-accent rounded-md p-2 transition-colors" data-testid="nav-profile">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center overflow-hidden">
              {(user as any)?.profilePictureUrl ? (
                <img 
                  src={(user as any).profilePictureUrl} 
                  alt="Profile picture" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-primary-foreground font-bold">{getProfileInitial(user?.profileName)}</span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{user?.profileName || 'Player'}</h1>
              <p className="text-xs text-muted-foreground">@{user?.username || 'user'}</p>
            </div>
          </div>
        </Link>
      </div>

      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          const isInvitations = item.name === "Invitations";
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors relative",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
              {isInvitations && hasPendingInvitations && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-card" />
              )}
            </Link>
          );
        })}
        
        <div>
          <button
            onClick={logout}
            data-testid="button-logout"
            className="flex items-center space-x-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors h-10"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
