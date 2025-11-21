import { useState, FormEvent } from 'react';
import authService from '../services/AuthService';

interface LoginFormProps {
  onLoginSuccess?: () => void;
  onLoginError?: (error: string) => void;
}

export const LoginForm = ({ onLoginSuccess, onLoginError }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  /**
   * Validate email format
   */
  const validateEmail = (email: string): boolean => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    
    setEmailError('');
    return true;
  };

  /**
   * Validate password
   */
  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    
    setPasswordError('');
    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    setEmailError('');
    setPasswordError('');

    // Validate inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);

    try {
      await authService.signIn(email, password, rememberMe);
      
      // Clear form on success
      setEmail('');
      setPassword('');
      setError('');
      
      // Call success callback if provided
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Authentication failed. Please try again.';
      setError(errorMessage);
      
      // Call error callback if provided
      if (onLoginError) {
        onLoginError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle email blur for validation
   */
  const handleEmailBlur = () => {
    if (email) {
      validateEmail(email);
    }
  };

  /**
   * Handle password blur for validation
   */
  const handlePasswordBlur = () => {
    if (password) {
      validatePassword(password);
    }
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sign In</h2>
          <p className="text-sm text-gray-600">
            Enter your credentials to access FIRST-AID
          </p>
        </div>

        {/* Global error message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Email field */}
        <div className="mb-4">
          <label 
            htmlFor="email" 
            className="block text-gray-700 text-sm font-semibold mb-2"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            disabled={isLoading}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
              emailError ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {emailError && (
            <p className="text-red-500 text-xs mt-1">{emailError}</p>
          )}
        </div>

        {/* Password field */}
        <div className="mb-4">
          <label 
            htmlFor="password" 
            className="block text-gray-700 text-sm font-semibold mb-2"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={handlePasswordBlur}
            disabled={isLoading}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
              passwordError ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your password"
            autoComplete="current-password"
          />
          {passwordError && (
            <p className="text-red-500 text-xs mt-1">{passwordError}</p>
          )}
        </div>

        {/* Remember Me checkbox */}
        <div className="mb-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
            />
            <span className="ml-2 text-sm text-gray-700">
              Remember me
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Keep me signed in on this device
          </p>
        </div>

        {/* Submit button */}
        <div className="mb-4">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg 
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </div>

        {/* Additional info */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Protected by Firebase Authentication
          </p>
        </div>
      </form>
    </div>
  );
};
