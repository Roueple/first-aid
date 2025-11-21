import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../../components/LoginForm';
import { useEffect, useState } from 'react';
import authService from '../../services/AuthService';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showSessionExpiredMessage, setShowSessionExpiredMessage] = useState(false);

  // Check if user was redirected due to session expiry
  useEffect(() => {
    const state = location.state as { sessionExpired?: boolean; from?: any } | null;
    if (state?.sessionExpired) {
      setShowSessionExpiredMessage(true);
      // Clear the message after 5 seconds
      const timer = setTimeout(() => {
        setShowSessionExpiredMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  // Redirect if already authenticated
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user) => {
      if (user) {
        // Redirect to intended destination or default to /home
        const state = location.state as { from?: any } | null;
        const from = state?.from?.pathname || '/home';
        navigate(from, { replace: true });
      }
    });

    return unsubscribe;
  }, [navigate, location]);

  const handleLoginSuccess = () => {
    console.log('✅ Login successful');
    // Redirect to intended destination or default to /home
    const state = location.state as { from?: any } | null;
    const from = state?.from?.pathname || '/home';
    navigate(from, { replace: true });
  };

  const handleLoginError = (error: string) => {
    console.error('❌ Login error:', error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">
            FIRST-AID
          </h1>
          <p className="text-gray-600">
            Intelligent Audit Findings Management System
          </p>
        </div>

        {/* Session Expired Message */}
        {showSessionExpiredMessage && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <p className="text-yellow-800 font-medium">
              ⚠️ Your session has expired
            </p>
            <p className="text-yellow-700 text-sm mt-1">
              Please log in again to continue
            </p>
          </div>
        )}

        {/* Login Form */}
        <LoginForm 
          onLoginSuccess={handleLoginSuccess}
          onLoginError={handleLoginError}
        />

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Phase 1 - Desktop Application</p>
          <p className="text-xs mt-1">Electron + React + TypeScript + Firebase</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
