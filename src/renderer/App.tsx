import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import ErrorBoundary from '../components/ErrorBoundary';
import { UpdateNotification } from '../components/UpdateNotification';
import FelixPage from './pages/FelixPage';
import PasswordlessLoginPage from './pages/PasswordlessLoginPage';
import ProtectedRoute from '../components/ProtectedRoute';
import { initializeGemini } from '../services/GeminiService';
import './styles/felix.css';
import './styles/felix-theme-additions.css';

// Create a client with optimized caching options
// Implements Requirements 11.1, 11.3 - Performance and caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale-while-revalidate strategy
      staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes (formerly cacheTime)
      
      // Refetch behavior
      refetchOnWindowFocus: true, // Refetch when window regains focus
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch when component mounts
      
      // Retry configuration with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Network mode
      networkMode: 'online', // Only fetch when online
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      retryDelay: 1000,
    },
  },
});

function App() {
  console.log('🚀 App component mounting...');

  // Lazy initialize Gemini (only when needed, not on startup)
  useEffect(() => {
    // Defer Gemini initialization to not block UI
    const timer = setTimeout(() => {
      console.log('🔧 Initializing Gemini...');
      try {
        initializeGemini();
        console.log('✅ Gemini initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Gemini:', error);
      }
    }, 1000); // Initialize after 1 second
    
    return () => clearTimeout(timer);
  }, []);

  // Handle deep links from Electron
  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron?.ipc?.on) {
      console.log('⚠️ Electron IPC not available');
      return;
    }

    console.log('✅ Setting up deep link listener');

    const unsubscribe = electron.ipc.on('deep-link', (url: string) => {
      console.log('📱 Deep link received:', url);
      
      try {
        // Extract query parameters from the deep link
        // Format: firstaid://auth/verify?apiKey=...&oobCode=...
        const queryIndex = url.indexOf('?');
        if (queryIndex !== -1) {
          const queryString = url.substring(queryIndex);
          // Store the auth link for the login page to pick up
          sessionStorage.setItem('pendingAuthLink', url);
          // Navigate using hash - must include the # for HashRouter
          const newHash = '#/auth/verify' + queryString;
          console.log('🔄 Setting hash to:', newHash);
          window.location.hash = newHash;
          // Force a reload to ensure React Router picks up the new hash
          window.location.reload();
        } else {
          console.error('❌ No query parameters in deep link');
        }
      } catch (error) {
        console.error('❌ Error handling deep link:', error);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  console.log('📦 Rendering App component...');

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <Router
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <div className="min-h-screen">
                <Routes>
                  <Route path="/login" element={<PasswordlessLoginPage />} />
                  <Route path="/auth/verify" element={<PasswordlessLoginPage />} />
                  <Route 
                    path="/felix" 
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <FelixPage />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="*" element={<Navigate to="/felix" replace />} />
                </Routes>
                <UpdateNotification />
              </div>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
