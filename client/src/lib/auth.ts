import { apiRequest } from "./queryClient";
import { auth, googleProvider } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";

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
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();

    const response = await apiRequest('POST', '/api/auth/firebase-login', { idToken });
    const data: AuthResponse = await response.json();

    this.setAuthData(data.token, data.user);
    return data.user;
  }

  async register(email: string, password: string): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();

    const response = await apiRequest('POST', '/api/auth/firebase-register', { idToken });
    const data: AuthResponse = await response.json();

    this.setAuthData(data.token, data.user);
    return data.user;
  }

  async loginWithGoogle(): Promise<User> {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();

    const response = await apiRequest('POST', '/api/auth/firebase-google', { idToken });
    const data: AuthResponse = await response.json();

    this.setAuthData(data.token, data.user);
    return data.user;
  }

  async me(): Promise<User | null> {
    if (!this.token) return null;

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
      const response = await fetch(baseUrl + '/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
        credentials: "include",
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
    signOut(auth).catch(console.error);
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
