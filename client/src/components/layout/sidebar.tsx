import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Users, BarChart3, Plus, Mail, LogOut, Gauge, Search, UserPlus, Eye, Play, Sparkles, ArrowRight } from "lucide-react";

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
    { name: "Live Scoreboard", href: "/live-scoreboard", icon: Eye },
    { name: "My Statistics", href: "/statistics", icon: BarChart3 },
    { name: "Create Live Match", href: "/create-live-match", icon: Play },
    { name: "Local Match", href: "/local-match", icon: UserPlus },
    { name: "My Teams", href: "/teams", icon: Users },
    { name: "Search Players", href: "/search", icon: Search },
    { name: "Invitations", href: "/invitations", icon: Mail },
  ];

  return (
    <aside className={cn("w-72 sm:w-64 bg-background/95 border-0 border-r border-border/20 backdrop-blur-md shadow-xl safe-area-left", className)}>
      <div className="p-4 sm:p-6 border-b border-border/20 bg-muted/20">
        <Link href="/profile" onClick={onNavigate}>
          <div className="flex items-center space-x-3 sm:space-x-4 cursor-pointer hover:bg-gradient-to-r hover:from-primary/10 hover:to-sky-500/10 rounded-2xl p-3 transition-all duration-300 group touch-feedback-subtle" data-testid="nav-profile">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-sky-500 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg group-hover:scale-110 transition-transform duration-300">
                {(user as any)?.profilePictureUrl ? (
                  <img 
                    src={(user as any).profilePictureUrl} 
                    alt="Profile picture" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-lg">{getProfileInitial(user?.profileName)}</span>
                )}
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{user?.profileName || 'Player'}</h1>
              <p className="text-sm text-muted-foreground font-medium">@{user?.username || 'user'}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 opacity-0 group-hover:opacity-100" />
          </div>
        </Link>
      </div>

      <nav className="p-3 sm:p-4 space-y-2 sm:space-y-3 safe-area-bottom pb-20 sm:pb-4">
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
                "flex items-center space-x-4 px-4 py-3 rounded-2xl transition-all duration-300 relative group border",
                isActive
                  ? "bg-gradient-to-r from-primary to-sky-500 text-white shadow-lg border-primary/30 transform scale-105"
                  : "text-muted-foreground hover:bg-gradient-to-r hover:from-primary/20 hover:to-sky-500/20 hover:text-foreground border-transparent hover:border-primary/30 hover:shadow-md"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                isActive 
                  ? "bg-white/20 text-white" 
                  : "bg-muted/50 group-hover:bg-primary/10 group-hover:text-primary"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="font-medium flex-1">{item.name}</span>
              {isActive && (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
              {isInvitations && hasPendingInvitations && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg animate-bounce">
                  <span className="text-xs text-white font-bold">{invitations?.length}</span>
                </div>
              )}
            </Link>
          );
        })}
        
        <div className="pt-4 mt-4 border-t border-border/20">
          <button
            onClick={logout}
            data-testid="button-logout"
            className="w-full flex items-center space-x-4 px-4 py-3 rounded-2xl text-muted-foreground hover:bg-gradient-to-r hover:from-red-500/20 hover:to-rose-600/20 hover:text-red-600 transition-all duration-300 group border border-transparent hover:border-red-500/30"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted/50 group-hover:bg-red-500/10 transition-all duration-300">
              <LogOut className="w-5 h-5 group-hover:text-red-500" />
            </div>
            <span className="font-medium flex-1 text-left">Sign Out</span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
          </button>
        </div>
      </nav>
    </aside>
  );
}
