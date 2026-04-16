import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../config/firebase';
import authService, { User } from '../services/AuthService';
import { connectionMonitor } from '../utils/connectionMonitor';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  authReady: boolean; // True when Firestore auth token is synchronized
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
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    console.log('🔐 Setting up auth state listener...');
    try {
      // Subscribe to auth state changes
      const unsubscribe = authService.onAuthStateChange(async (user) => {
        console.log('🔐 Auth state changed:', user ? 'User logged in' : 'No user');

        // IMPORTANT: Reset authReady when user is detected to prevent race conditions
        // This ensures BernardPage waits for token sync before querying Firestore
        if (user) {
          setAuthReady(false);
        }

        setCurrentUser(user);
        setLoading(false);

        // Ensure Firestore auth token is synchronized before marking as ready
        if (user && auth.currentUser) {
          try {
            // Force token refresh to ensure Firestore has the auth token
            await auth.currentUser.getIdToken(true);
            console.log('✅ Auth token synchronized with Firestore');

            // Notify connection monitor that auth is ready
            // This will trigger a connection check with proper auth
            connectionMonitor.setAuthReady(true);

            // Force connection check now that auth is ready
            // (initial check may have failed due to no auth)
            await connectionMonitor.checkConnection();
            console.log('✅ Connection status verified:', connectionMonitor.getStatus());

            setAuthReady(true);
          } catch (tokenError) {
            console.error('❌ Failed to sync auth token:', tokenError);
            setAuthReady(true); // Still set ready to avoid blocking UI
          }
        } else {
          setAuthReady(true); // No user, mark as ready (for login page)
        }
      });

      console.log('✅ Auth state listener set up');
      return unsubscribe;
    } catch (error) {
      console.error('❌ Failed to set up auth listener:', error);
      setLoading(false);
      setAuthReady(true);
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
    authReady,
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
