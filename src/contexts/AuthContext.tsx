import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService, { User } from '../services/AuthService';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean = false): Promise<User> => {
    const user = await authService.signIn(email, password, rememberMe);
    setCurrentUser(user);
    return user;
  };

  const signOut = async (): Promise<void> => {
    await authService.signOut();
    setCurrentUser(null);
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    signIn,
    signOut,
    isAuthenticated: currentUser !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
