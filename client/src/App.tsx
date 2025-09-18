import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/components/auth/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ProfileSetup from "@/pages/profile-setup";
import Profile from "@/pages/profile";
import Dashboard from "@/pages/dashboard";
import Statistics from "@/pages/statistics";
import AddMatch from "@/pages/add-match";
import Teams from "@/pages/teams";
import TeamDetail from "@/pages/team-detail";
import Invitations from "@/pages/invitations";
import SearchPlayers from "@/pages/search";
import LocalMatch from "@/pages/local-match";
import { CoinToss } from "@/pages/coin-toss";
import MatchScoring from "@/pages/match-scoring";
import Scoreboard from "@/pages/scoreboard";
import LiveScoreboard from "@/pages/live-scoreboard";
import MatchView from "@/pages/match-view";
import MatchSummaryPage from "@/pages/match-summary";
import MyMatchesPage from "@/pages/my-matches";
import TeamSearch from "@/pages/team-search";
import BowlerSelection from "@/pages/bowler-selection";
import { useEffect, useState } from "react";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch pending invitations to show notification badge
  const { data: invitations } = useQuery<any[]>({
    queryKey: ["/api/invitations"],
    enabled: !!user?.id,
  });

  const hasPendingInvitations = invitations && invitations.length > 0;

  return (
    <div className="flex h-screen h-dvh bg-background safe-area-top safe-area-bottom">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar onNavigate={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden touch-feedback"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto scroll-mobile">
        <MobileHeader
          isMenuOpen={isMobileMenuOpen}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          hasPendingInvitations={hasPendingInvitations}
        />
        <div className="min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && !user.profileComplete) {
      setLocation("/profile-setup");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !user.profileComplete) {
    return null;
  }

  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Handle redirects in useEffect to avoid state updates during render
  useEffect(() => {
    if (isLoading) return;

    // Only handle root path redirects automatically
    if (location === "/") {
      if (user?.profileComplete) {
        setLocation("/dashboard");
      } else if (user && !user.profileComplete) {
        setLocation("/profile-setup");
      } else if (!user) {
        setLocation("/login");
      }
    }
  }, [user, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Profile setup route */}
      <Route path="/profile-setup">
        {user && !user.profileComplete ? <ProfileSetup /> : <Login />}
      </Route>

      {/* Protected routes */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/statistics">
        <ProtectedRoute>
          <Statistics />
        </ProtectedRoute>
      </Route>
      
      <Route path="/add-match">
        <ProtectedRoute>
          <AddMatch />
        </ProtectedRoute>
      </Route>
      
      <Route path="/teams">
        <ProtectedRoute>
          <Teams />
        </ProtectedRoute>
      </Route>
      
      <Route path="/teams/:id">
        <ProtectedRoute>
          <TeamDetail />
        </ProtectedRoute>
      </Route>
      
      <Route path="/invitations">
        <ProtectedRoute>
          <Invitations />
        </ProtectedRoute>
      </Route>
      
      <Route path="/search">
        <ProtectedRoute>
          <SearchPlayers />
        </ProtectedRoute>
      </Route>
      
      <Route path="/team-search">
        <ProtectedRoute>
          <TeamSearch />
        </ProtectedRoute>
      </Route>
      
      <Route path="/local-match">
        <ProtectedRoute>
          <LocalMatch />
        </ProtectedRoute>
      </Route>
      
      
      <Route path="/coin-toss">
        <ProtectedRoute>
          <CoinToss />
        </ProtectedRoute>
      </Route>
      
      <Route path="/match-scoring">
        <ProtectedRoute>
          <MatchScoring />
        </ProtectedRoute>
      </Route>
      
      <Route path="/scoreboard">
        <ProtectedRoute>
          <Scoreboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/live-scoreboard">
        <ProtectedRoute>
          <LiveScoreboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/match-view/:id">
        <ProtectedRoute>
          <MatchView />
        </ProtectedRoute>
      </Route>
      
      <Route path="/match-summary/:id">
        <ProtectedRoute>
          <MatchSummaryPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/my-matches">
        <ProtectedRoute>
          <MyMatchesPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/bowler-selection">
        <ProtectedRoute>
          <BowlerSelection />
        </ProtectedRoute>
      </Route>

      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>
      
      <Route path="/player/:id">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>

      {/* Default redirect */}
      <Route path="/">
        {user?.profileComplete ? (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ) : user ? (
          <ProfileSetup />
        ) : (
          <Login />
        )}
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
