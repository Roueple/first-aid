import { useState, useEffect } from 'react';
import authService, { User } from '../../services/AuthService';

/**
 * Manual Testing Page for AuthService
 * This page allows you to test all authentication functionality
 */
export default function AuthTestPage() {
    const [email, setEmail] = useState('test@example.com');
    const [password, setPassword] = useState('password123');
    const [rememberMe, setRememberMe] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [authStateLog, setAuthStateLog] = useState<string[]>([]);

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = authService.onAuthStateChange((user) => {
            setCurrentUser(user);
            const timestamp = new Date().toLocaleTimeString();
            const logMessage = user
                ? `[${timestamp}] Auth state changed: User logged in (${user.email})`
                : `[${timestamp}] Auth state changed: User logged out`;
            setAuthStateLog(prev => [...prev, logMessage]);
        });

        return unsubscribe;
    }, []);

    const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleSignIn = async () => {
        setLoading(true);
        try {
            const user = await authService.signIn(email, password, rememberMe);
            showMessage('success', `✅ Signed in successfully as ${user.email}`);
        } catch (error: any) {
            showMessage('error', `❌ Sign in failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        setLoading(true);
        try {
            await authService.signOut();
            setToken(null);
            showMessage('success', '✅ Signed out successfully');
        } catch (error: any) {
            showMessage('error', `❌ Sign out failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleGetToken = async () => {
        const idToken = await authService.getIdToken();
        if (idToken) {
            setToken(idToken);
            showMessage('info', '✅ Token retrieved successfully');
        } else {
            showMessage('error', '❌ No token available (not authenticated)');
        }
    };

    const handleRefreshToken = async () => {
        setLoading(true);
        try {
            const newToken = await authService.refreshToken();
            if (newToken) {
                setToken(newToken);
                showMessage('success', '✅ Token refreshed successfully');
            } else {
                showMessage('error', '❌ Token refresh failed (not authenticated)');
            }
        } catch (error: any) {
            showMessage('error', `❌ Token refresh failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckAuth = () => {
        const isAuth = authService.isAuthenticated();
        const user = authService.getCurrentUser();
        showMessage('info', `Authentication status: ${isAuth ? '✅ Authenticated' : '❌ Not authenticated'}`);
        console.log('Current user:', user);
    };

    const clearLog = () => {
        setAuthStateLog([]);
    };

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        🔐 AuthService Manual Test Page
                    </h1>
                    <p className="text-gray-600 mb-4">
                        Test all authentication functionality manually
                    </p>

                    {/* Message Display */}
                    {message && (
                        <div className={`p-4 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-800' :
                            message.type === 'error' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {/* Current User Status */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h2 className="text-xl font-semibold mb-3">Current Status</h2>
                        {currentUser ? (
                            <div className="space-y-2">
                                <p className="text-green-600 font-semibold">✅ Authenticated</p>
                                <div className="text-sm space-y-1">
                                    <p><strong>UID:</strong> {currentUser.uid}</p>
                                    <p><strong>Email:</strong> {currentUser.email}</p>
                                    <p><strong>Display Name:</strong> {currentUser.displayName || 'Not set'}</p>
                                    <p><strong>Email Verified:</strong> {currentUser.emailVerified ? 'Yes' : 'No'}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-red-600 font-semibold">❌ Not authenticated</p>
                        )}
                    </div>

                    {/* Sign In Section */}
                    <div className="border-t pt-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4">1. Sign In Test</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="test@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="password123"
                                />
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="rememberMe"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700">
                                    Remember Me (persist session)
                                </label>
                            </div>
                            <button
                                onClick={handleSignIn}
                                disabled={loading || currentUser !== null}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </div>
                    </div>

                    {/* Sign Out Section */}
                    <div className="border-t pt-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4">2. Sign Out Test</h2>
                        <button
                            onClick={handleSignOut}
                            disabled={loading || currentUser === null}
                            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                        >
                            {loading ? 'Signing out...' : 'Sign Out'}
                        </button>
                    </div>

                    {/* Token Management Section */}
                    <div className="border-t pt-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4">3. Token Management Test</h2>
                        <div className="space-y-3">
                            <button
                                onClick={handleGetToken}
                                disabled={currentUser === null}
                                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                            >
                                Get ID Token
                            </button>
                            <button
                                onClick={handleRefreshToken}
                                disabled={loading || currentUser === null}
                                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                            >
                                {loading ? 'Refreshing...' : 'Refresh Token'}
                            </button>
                            {token && (
                                <div className="bg-gray-50 p-3 rounded-md">
                                    <p className="text-xs font-semibold text-gray-700 mb-1">Current Token:</p>
                                    <p className="text-xs text-gray-600 break-all font-mono">
                                        {token.substring(0, 100)}...
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Check Auth Status Section */}
                    <div className="border-t pt-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4">4. Check Authentication Status</h2>
                        <button
                            onClick={handleCheckAuth}
                            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition"
                        >
                            Check Auth Status (see console)
                        </button>
                    </div>

                    {/* Auth State Change Log */}
                    <div className="border-t pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">5. Auth State Change Log</h2>
                            <button
                                onClick={clearLog}
                                className="text-sm bg-gray-200 text-gray-700 py-1 px-3 rounded hover:bg-gray-300 transition"
                            >
                                Clear Log
                            </button>
                        </div>
                        <div className="bg-gray-900 text-green-400 p-4 rounded-md h-48 overflow-y-auto font-mono text-xs">
                            {authStateLog.length === 0 ? (
                                <p className="text-gray-500">No auth state changes yet...</p>
                            ) : (
                                authStateLog.map((log, index) => (
                                    <div key={index} className="mb-1">{log}</div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Testing Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 Testing Instructions</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                        <li>
                            <strong>Create a test user in Firebase:</strong>
                            <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                                <li>Go to Firebase Console → Authentication → Users</li>
                                <li>Click "Add user" and create: test@example.com / password123</li>
                                <li>Or use Firebase Emulator (npm run dev:emulators)</li>
                            </ul>
                        </li>
                        <li><strong>Test Sign In:</strong> Enter credentials and click "Sign In"</li>
                        <li><strong>Verify Auth State:</strong> Check the status box updates automatically</li>
                        <li><strong>Test Token:</strong> Click "Get ID Token" to retrieve the JWT token</li>
                        <li><strong>Test Refresh:</strong> Click "Refresh Token" to force token refresh</li>
                        <li><strong>Test Sign Out:</strong> Click "Sign Out" and verify state clears</li>
                        <li><strong>Test Remember Me:</strong> Enable checkbox, sign in, close tab, reopen</li>
                        <li><strong>Monitor Log:</strong> Watch the auth state change log for real-time updates</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
