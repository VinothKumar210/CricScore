import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Users, BarChart3, Mail, LogOut, Gauge, Search, UserPlus, Eye, ArrowRight, Trophy, User } from "lucide-react";

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

  // Grouped navigation sections
  const navigationSections = [
    {
      title: "My Cricket",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: Gauge },
        { name: "My Stats", href: "/statistics", icon: BarChart3 },
        { name: "My Matches", href: "/my-matches", icon: Trophy },
        { name: "Profile", href: "/profile", icon: User },
      ]
    },
    {
      title: "Matches",
      items: [
        { name: "Create Match", href: "/local-match", icon: UserPlus },
        { name: "Live Rooms", href: "/live-scoreboard", icon: Eye },
      ]
    },
    {
      title: "Teams",
      items: [
        { name: "My Teams", href: "/teams", icon: Users },
        { name: "Find Teams", href: "/team-search", icon: Search },
        { name: "Invitations", href: "/invitations", icon: Mail, hasBadge: true },
      ]
    },
    {
      title: "Community",
      items: [
        { name: "Find Players", href: "/search", icon: Search },
      ]
    },
  ];

  return (
    <aside className={cn("w-80 sm:w-72 bg-gradient-to-b from-white to-blue-50/30 backdrop-blur-xl border-0 border-r border-border/50 shadow-2xl safe-area-left", className)}>
      {/* Profile Section */}
      <div className="p-5 sm:p-6 border-b border-border/50 bg-gradient-to-br from-primary/8 to-blue-500/8">
        <Link href="/profile" onClick={onNavigate}>
          <div className="flex items-center space-x-3 cursor-pointer hover:bg-gradient-to-r hover:from-primary/15 hover:to-blue-500/15 rounded-2xl p-3 transition-all duration-300 group border border-transparent hover:border-primary/40 hover:shadow-xl" data-testid="nav-profile">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-sky-500 rounded-xl flex items-center justify-center overflow-hidden shadow-lg group-hover:scale-110 transition-transform duration-300">
                {(user as any)?.profilePictureUrl ? (
                  <img 
                    src={(user as any).profilePictureUrl} 
                    alt="Profile picture" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-base">{getProfileInitial(user?.profileName)}</span>
                )}
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-foreground group-hover:text-primary transition-colors tracking-tight truncate">
                {user?.profileName || 'Player'}
              </h1>
              <p className="text-xs text-muted-foreground font-medium truncate">@{user?.username || 'user'}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 opacity-0 group-hover:opacity-100 flex-shrink-0" />
          </div>
        </Link>
      </div>

      {/* Navigation with Grouped Sections */}
      <nav className="p-3 sm:p-4 space-y-4 safe-area-bottom pb-20 sm:pb-4 overflow-y-auto max-h-[calc(100vh-180px)]">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              {section.title}
            </h3>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              const showBadge = item.hasBadge && hasPendingInvitations;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onNavigate}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-300 relative group border font-medium min-h-[48px]",
                    isActive
                      ? "bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg border-primary/40 scale-[1.01]"
                      : "text-foreground/80 hover:bg-gradient-to-r hover:from-primary/10 hover:to-blue-500/10 hover:text-foreground border-transparent hover:border-primary/30 hover:shadow-md"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 flex-shrink-0",
                    isActive 
                      ? "bg-white/20 text-white" 
                      : "bg-muted group-hover:bg-primary/20 group-hover:text-primary"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold flex-1">{item.name}</span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  )}
                  {showBadge && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-red-500 to-rose-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                      <span className="text-xs text-white font-bold">{invitations?.length}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
        
        {/* Sign Out */}
        <div className="pt-3 mt-3 border-t border-border/50">
          <button
            onClick={logout}
            data-testid="button-logout"
            className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-foreground/80 hover:bg-gradient-to-r hover:from-red-500/10 hover:to-rose-600/10 hover:text-red-600 transition-all duration-300 group border border-transparent hover:border-red-500/30 hover:shadow-md min-h-[48px]"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted group-hover:bg-red-500/20 transition-all duration-300 flex-shrink-0">
              <LogOut className="w-4 h-4 group-hover:text-red-500" />
            </div>
            <span className="text-sm font-semibold flex-1 text-left">Sign Out</span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
          </button>
        </div>
      </nav>
    </aside>
  );
}
