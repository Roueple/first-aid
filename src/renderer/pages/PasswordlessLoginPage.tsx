import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function PasswordlessLoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  const { sendSignInLink, completeSignInWithEmailLink, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if this is a sign-in link callback using React Router's searchParams
    const apiKey = searchParams.get('apiKey');
    const oobCode = searchParams.get('oobCode');
    
    // Also check sessionStorage for pending auth link (from Electron deep link)
    const pendingAuthLink = sessionStorage.getItem('pendingAuthLink');
    
    console.log('📍 Search params - apiKey:', !!apiKey, 'oobCode:', !!oobCode);
    console.log('📍 Pending auth link:', !!pendingAuthLink);
    console.log('📍 Full URL:', window.location.href);
    console.log('📍 Hash:', window.location.hash);
    
    if (apiKey && oobCode) {
      console.log('✅ Auth link detected via searchParams, starting sign-in...');
      // Clear pending auth link if exists
      sessionStorage.removeItem('pendingAuthLink');
      handleEmailLinkSignIn();
    } else if (pendingAuthLink && pendingAuthLink.includes('apiKey') && pendingAuthLink.includes('oobCode')) {
      console.log('✅ Auth link detected via sessionStorage, starting sign-in...');
      // Clear it so we don't retry on refresh
      sessionStorage.removeItem('pendingAuthLink');
      handleEmailLinkSignIn();
    } else {
      console.log('ℹ️ Not an auth link, showing login form');
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleEmailLinkSignIn = async () => {
    setVerifying(true);
    setError('');

    try {
      console.log('🔐 Starting email link sign-in...');
      await completeSignInWithEmailLink();
      console.log('✅ Sign-in successful!');
      // User will be redirected by the isAuthenticated effect
    } catch (err: any) {
      console.error('❌ Sign-in failed:', err);
      setError(err.message || 'Failed to verify sign-in link');
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await sendSignInLink(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send sign-in link');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Verifying your sign-in link...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we verify your email
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to FIRST-AID
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Passwordless authentication via email
          </p>
        </div>

        {success ? (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Check your email!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    We've sent a sign-in link to <strong>{email}</strong>.
                    Click the link in your email to sign in.
                  </p>
                  <p className="mt-2">
                    The link will expire in 1 hour. Once signed in, your session will last 90 days on this device.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    </span>
                    Sending...
                  </>
                ) : (
                  'Send sign-in link'
                )}
              </button>
            </div>

            <div className="text-sm text-center text-gray-600">
              <p>Only authorized emails can access this application.</p>
              <p className="mt-1">Contact your administrator if you need access.</p>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2 text-center">
                Having trouble? Paste the auth link from your email here:
              </p>
              <input
                type="text"
                placeholder="Paste authentication link..."
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onPaste={(e) => {
                  const link = e.clipboardData.getData('text');
                  if (link.includes('apiKey') && link.includes('oobCode')) {
                    // Extract query params and navigate using React Router
                    try {
                      const url = new URL(link);
                      const queryString = url.search;
                      navigate('/auth/verify' + queryString);
                    } catch {
                      // If URL parsing fails, try extracting params directly
                      const queryStart = link.indexOf('?');
                      if (queryStart !== -1) {
                        navigate('/auth/verify' + link.substring(queryStart));
                      }
                    }
                  }
                }}
              />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
