/**
 * AuthService Usage Examples
 * 
 * This file demonstrates how to use the AuthService in React components
 * DO NOT import this file in production code - it's for reference only
 */

import { useEffect, useState } from 'react';
import authService, { User } from './AuthService';

/**
 * Example 1: Basic Login Component
 */
export function LoginExample() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await authService.signIn(email, password, rememberMe);
      console.log('Logged in successfully:', user);
      // Redirect to dashboard or home page
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <label>
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        Remember Me
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}

/**
 * Example 2: Auth State Listener Hook
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return { user, loading, isAuthenticated: user !== null };
}

/**
 * Example 3: Protected Route Component
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    // Redirect to login page
    window.location.href = '/login';
    return null;
  }

  return <>{children}</>;
}

/**
 * Example 4: Logout Button Component
 */
export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      console.log('Logged out successfully');
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleLogout} disabled={loading}>
      {loading ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}

/**
 * Example 5: Get Current User
 */
export function UserProfile() {
  const user = authService.getCurrentUser();

  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <h2>User Profile</h2>
      <p>Email: {user.email}</p>
      <p>Display Name: {user.displayName || 'Not set'}</p>
      <p>Email Verified: {user.emailVerified ? 'Yes' : 'No'}</p>
    </div>
  );
}

/**
 * Example 6: Token Management
 */
export async function makeAuthenticatedRequest(url: string) {
  // Get the current ID token
  const token = await authService.getIdToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  // Use token in API request
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return response.json();
}

/**
 * Example 7: Force Token Refresh
 */
export async function refreshAuthToken() {
  try {
    const newToken = await authService.refreshToken();
    if (newToken) {
      console.log('Token refreshed successfully');
      return newToken;
    } else {
      console.log('No user authenticated');
      return null;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

/**
 * Example 8: Session Expiry Handler
 */
export function SessionExpiryHandler() {
  useEffect(() => {
    const checkSession = async () => {
      const user = authService.getCurrentUser();
      
      if (user) {
        // Try to get token - will fail if session expired
        const token = await authService.getIdToken();
        
        if (!token) {
          console.log('Session expired, redirecting to login');
          await authService.signOut();
          window.location.href = '/login';
        }
      }
    };

    // Check session every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}

/**
 * Example 9: Multiple Auth State Listeners
 */
export function AuthLogger() {
  useEffect(() => {
    // First listener - logs to console
    const unsubscribe1 = authService.onAuthStateChange((user) => {
      console.log('Auth state changed:', user ? `User ${user.email} logged in` : 'User logged out');
    });

    // Second listener - updates analytics
    const unsubscribe2 = authService.onAuthStateChange((user) => {
      if (user) {
        // Track login event
        console.log('Analytics: User login', user.uid);
      } else {
        // Track logout event
        console.log('Analytics: User logout');
      }
    });

    // Cleanup both listeners
    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, []);

  return null;
}

/**
 * Example 10: Check Authentication Status
 */
export function AuthStatus() {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  return (
    <div>
      <p>Authentication Status: {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</p>
      {user && <p>Logged in as: {user.email}</p>}
    </div>
  );
}
