import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Users, BarChart3, Plus, Mail, LogOut, Gauge, Search, UserPlus, Eye, Play, Sparkles, ArrowRight, Trophy } from "lucide-react";

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
    enabled: !!user,
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
    { name: "My Matches", href: "/my-matches", icon: Trophy },
    { name: "Create Match", href: "/local-match", icon: UserPlus },
    { name: "My Teams", href: "/teams", icon: Users },
    { name: "Search Players", href: "/search", icon: Search },
    { name: "Search Teams", href: "/team-search", icon: Users },
    { name: "Invitations", href: "/invitations", icon: Mail },
  ];

  return (
    <aside className={cn("w-80 sm:w-72 bg-gradient-to-b from-white to-blue-50/30 backdrop-blur-xl border-0 border-r border-border/50 shadow-2xl safe-area-left", className)}>
      <div className="p-5 sm:p-6 border-b border-border/50 bg-gradient-to-br from-primary/8 to-blue-500/8">
        <Link href="/profile" onClick={onNavigate}>
          <div className="flex items-center space-x-3 sm:space-x-4 cursor-pointer hover:bg-gradient-to-r hover:from-primary/15 hover:to-blue-500/15 rounded-2xl p-4 transition-all duration-300 group touch-feedback-subtle border border-transparent hover:border-primary/40 hover:shadow-xl" data-testid="nav-profile">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-sky-500 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg group-hover:scale-110 transition-transform duration-300">
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
              <h1 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">{user?.profileName || 'Player'}</h1>
              <p className="text-sm text-muted-foreground font-medium">@{user?.username || 'user'}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 opacity-0 group-hover:opacity-100" />
          </div>
        </Link>
      </div>

      <nav className="p-4 sm:p-5 space-y-2 safe-area-bottom pb-20 sm:pb-4">
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
                "flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative group border font-medium",
                isActive
                  ? "bg-gradient-to-r from-primary to-blue-500 text-white shadow-xl border-primary/40 transform scale-[1.02]"
                  : "text-foreground/80 hover:bg-gradient-to-r hover:from-primary/12 hover:to-blue-500/12 hover:text-foreground border-transparent hover:border-primary/40 hover:shadow-lg hover:scale-[1.01]"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                isActive 
                  ? "bg-white/20 text-white" 
                  : "bg-muted group-hover:bg-primary/20 group-hover:text-primary"
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
        
        <div className="pt-4 mt-4 border-t border-border/50">
          <button
            onClick={logout}
            data-testid="button-logout"
            className="w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl text-foreground/80 hover:bg-gradient-to-r hover:from-red-500/15 hover:to-rose-600/15 hover:text-red-600 transition-all duration-300 group border border-transparent hover:border-red-500/30 hover:shadow-md hover:scale-[1.01]"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted group-hover:bg-red-500/20 transition-all duration-300">
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
