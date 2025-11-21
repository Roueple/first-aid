import { useEffect, useState, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService, { User } from '../services/AuthService';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * AuthGuard component protects routes from unauthenticated access
 * 
 * Features:
 * - Redirects unauthenticated users to login page
 * - Handles session expiry with user notification
 * - Preserves intended destination for post-login redirect
 * - Shows loading state while checking authentication
 * 
 * Requirements: 1.2, 1.4
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange((currentUser) => {
      // Check if session expired (user was logged in, now logged out)
      if (user !== null && currentUser === null && !sessionExpired) {
        setSessionExpired(true);
        // Show notification to user
        showSessionExpiredNotification();
      }

      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, sessionExpired]);

  /**
   * Show session expiry notification to user
   * Uses browser notification API if available, otherwise console log
   */
  const showSessionExpiredNotification = () => {
    // Log to console for debugging
    console.warn('⚠️ Session expired. Please log in again.');

    // Try to show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Session Expired', {
        body: 'Your session has expired. Please log in again.',
        icon: '/icon.png', // Optional: add app icon
      });
    }

    // Also show an alert as fallback
    // In production, this should be replaced with a toast notification
    setTimeout(() => {
      alert('Your session has expired. Please log in again.');
    }, 100);
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    // Save the intended destination to redirect after login
    return <Navigate to="/" state={{ from: location, sessionExpired }} replace />;
  }

  // User is authenticated, render protected content
  return <>{children}</>;
}
