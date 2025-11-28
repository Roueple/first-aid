import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { FindingsPage } from './pages/FindingsPage';
import { ChatPage } from './pages/ChatPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import SettingsPage from './pages/SettingsPage';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { AuthGuard } from '../components/AuthGuard';
import { NotificationSystem } from '../components/NotificationSystem';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { initializeGemini } from '../services/GeminiService';
import { AuthProvider } from '../contexts/AuthContext';

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
  // Initialize error handler
  useErrorHandler();

  // Initialize Gemini on app startup
  useEffect(() => {
    initializeGemini();
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <div className="min-h-screen bg-gray-50">
            <ConnectionStatus />
            <NotificationSystem />
            <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route 
              path="/home" 
              element={
                <AuthGuard>
                  <HomePage />
                </AuthGuard>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <AuthGuard>
                  <DashboardPage />
                </AuthGuard>
              } 
            />
            <Route 
              path="/findings" 
              element={
                <AuthGuard>
                  <FindingsPage />
                </AuthGuard>
              } 
            />
            <Route 
              path="/chat" 
              element={
                <AuthGuard>
                  <ChatPage />
                </AuthGuard>
              } 
            />
            <Route 
              path="/audit-logs" 
              element={
                <AuthGuard>
                  <AuditLogsPage />
                </AuthGuard>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <AuthGuard>
                  <SettingsPage />
                </AuthGuard>
              } 
            />
            </Routes>
          </div>
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
