import { apiRequest } from "./queryClient";

export interface User {
  id: string;
  email: string;
  username?: string;
  profileName?: string;
  description?: string;
  role?: string;
  battingHand?: string;
  bowlingStyle?: string;
  profileComplete: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        this.user = JSON.parse(userData);
      } catch {
        this.user = null;
      }
    }
  }

  async login(email: string, password: string): Promise<User> {
    const response = await apiRequest('POST', '/api/auth/login', { email, password });
    const data: AuthResponse = await response.json();
    
    this.setAuthData(data.token, data.user);
    return data.user;
  }

  async register(email: string, password: string): Promise<User> {
    const response = await apiRequest('POST', '/api/auth/register', { email, password });
    const data: AuthResponse = await response.json();
    
    this.setAuthData(data.token, data.user);
    return data.user;
  }

  async me(): Promise<User | null> {
    if (!this.token) return null;
    
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
      
      if (!response.ok) {
        this.logout();
        return null;
      }
      
      const user: User = await response.json();
      this.user = user;
      localStorage.setItem('user_data', JSON.stringify(user));
      return user;
    } catch {
      this.logout();
      return null;
    }
  }

  logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  private setAuthData(token: string, user: User): void {
    this.token = token;
    this.user = user;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
  }
}

export const authService = new AuthService();
