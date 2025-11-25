import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { FindingsPage } from './pages/FindingsPage';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { AuthGuard } from '../components/AuthGuard';

// Create a client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <ConnectionStatus />
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
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
