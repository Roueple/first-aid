import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService, { User } from '../services/AuthService';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  sendSignInLink: (email: string) => Promise<void>;
  completeSignInWithEmailLink: (emailLink?: string) => Promise<User>;
  isEmailWhitelisted: (email: string) => Promise<boolean>;
  hasValidDeviceSession: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  console.log('🔐 AuthProvider initializing...');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 Setting up auth state listener...');
    try {
      // Subscribe to auth state changes
      const unsubscribe = authService.onAuthStateChange((user) => {
        console.log('🔐 Auth state changed:', user ? 'User logged in' : 'No user');
        setCurrentUser(user);
        setLoading(false);
      });

      console.log('✅ Auth state listener set up');
      return unsubscribe;
    } catch (error) {
      console.error('❌ Failed to set up auth listener:', error);
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean = false): Promise<User> => {
    const user = await authService.signIn(email, password, rememberMe);
    setCurrentUser(user);
    return user;
  };

  const sendSignInLink = async (email: string): Promise<void> => {
    await authService.sendSignInLink(email);
  };

  const completeSignInWithEmailLink = async (emailLink?: string): Promise<User> => {
    const user = await authService.completeSignInWithEmailLink(emailLink);
    setCurrentUser(user);
    return user;
  };

  const isEmailWhitelisted = async (email: string): Promise<boolean> => {
    return await authService.isEmailWhitelisted(email);
  };

  const hasValidDeviceSession = async (email: string): Promise<boolean> => {
    return await authService.hasValidDeviceSession(email);
  };

  const signOut = async (): Promise<void> => {
    await authService.signOut();
    setCurrentUser(null);
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    signIn,
    sendSignInLink,
    completeSignInWithEmailLink,
    isEmailWhitelisted,
    hasValidDeviceSession,
    signOut,
    isAuthenticated: currentUser !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
