import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, type User } from '@/lib/auth';
import { refreshUserStatistics } from '@/lib/queryClient';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const currentUser = await authService.me();
      setUser(currentUser);
      
      if (currentUser) {
        await refreshUserStatistics(currentUser.id);
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const user = await authService.login(email, password);
    setUser(user);
    
    await refreshUserStatistics(user.id);
    
    return user;
  };

  const register = async (email: string, password: string): Promise<User> => {
    const user = await authService.register(email, password);
    setUser(user);
    
    await refreshUserStatistics(user.id);
    
    return user;
  };

  const loginWithGoogle = async (): Promise<User> => {
    const user = await authService.loginWithGoogle();
    setUser(user);
    
    await refreshUserStatistics(user.id);
    
    return user;
  };

  const logout = async () => {
    authService.logout();
    setUser(null);
    await refreshUserStatistics();
  };

  const refreshUser = async () => {
    const currentUser = await authService.me();
    setUser(currentUser);
    
    if (currentUser) {
      await refreshUserStatistics(currentUser.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithGoogle, logout, refreshUser, isLoading }}>
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
