import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, type User } from '@/lib/auth';
import { refreshUserStatistics } from '@/lib/queryClient';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await authService.me();
        setUser(currentUser);
        
        // Invalidate statistics cache to ensure fresh data on app initialization
        if (currentUser) {
          try {
            await refreshUserStatistics();
          } catch (error) {
            console.warn('Failed to refresh user statistics on init:', error);
            // Don't block app initialization if statistics refresh fails
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const user = await authService.login(email, password);
    setUser(user);
    
    // Invalidate and refetch statistics after successful login
    await refreshUserStatistics();
    
    return user;
  };

  const register = async (email: string, password: string): Promise<User> => {
    const user = await authService.register(email, password);
    setUser(user);
    
    // Invalidate and refetch statistics after successful registration
    await refreshUserStatistics();
    
    return user;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const currentUser = await authService.me();
    setUser(currentUser);
    
    // Refresh statistics data when user data is refreshed
    if (currentUser) {
      await refreshUserStatistics();
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
