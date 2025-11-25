import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/AuthService';
import { seedSampleFindings } from '../../utils/seedData';

function HomePage() {
  const [testResult, setTestResult] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Expose authService globally for console testing
    (window as any).authService = authService;
    console.log('✅ authService is now available globally as window.authService');
    console.log('Try: await window.authService.signIn("test@example.com", "password123")');
    
    // Listen to auth changes to update UI
    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
    });
    
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await authService.signOut();
      navigate('/');
    } catch (error: any) {
      console.error('Logout error:', error);
    }
  };

  const runQuickTest = async () => {
    setTestResult('Running tests...\n');
    
    try {
      // Test 1: Get current user
      setTestResult(prev => prev + '\n1. Testing getCurrentUser...');
      const currentUser = authService.getCurrentUser();
      setTestResult(prev => prev + `\n✅ Current user: ${currentUser?.email}`);
      
      // Test 2: Check authentication
      setTestResult(prev => prev + '\n\n2. Testing isAuthenticated...');
      const isAuth = authService.isAuthenticated();
      setTestResult(prev => prev + `\n✅ Is authenticated: ${isAuth}`);
      
      // Test 3: Get token
      setTestResult(prev => prev + '\n\n3. Testing getIdToken...');
      const token = await authService.getIdToken();
      setTestResult(prev => prev + `\n✅ Token received: ${token?.substring(0, 50)}...`);
      
      // Test 4: Refresh token
      setTestResult(prev => prev + '\n\n4. Testing refreshToken...');
      const newToken = await authService.refreshToken();
      setTestResult(prev => prev + `\n✅ Token refreshed: ${newToken?.substring(0, 50)}...`);
      
      setTestResult(prev => prev + '\n\n🎉 All tests passed!');
    } catch (error: any) {
      setTestResult(prev => prev + `\n\n❌ Error: ${error.message}`);
    }
  };

  const handleSeedData = async () => {
    setTestResult('🌱 Seeding sample findings data...\n');
    
    try {
      await seedSampleFindings();
      setTestResult(prev => prev + '\n✅ Successfully added 10 sample findings to Firestore!');
      setTestResult(prev => prev + '\n\n📊 You can now view them in the dashboard.');
      setTestResult(prev => prev + '\n\n💡 Tip: Click "Go to Dashboard" to see the data.');
    } catch (error: any) {
      setTestResult(prev => prev + `\n\n❌ Error seeding data: ${error.message}`);
      console.error('Seed error:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="text-center max-w-2xl">
        {/* Header with logout button */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1"></div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-primary-600">
              FIRST-AID
            </h1>
          </div>
          <div className="flex-1 flex justify-end">
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
            >
              Logout
            </button>
          </div>
        </div>
        
        <p className="text-xl text-gray-600 mb-2">
          Intelligent Audit Findings Management System
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Electron + React + TypeScript + Firebase
        </p>

        {/* Current Auth Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-2 text-green-900">Current Auth Status:</h3>
          {currentUser ? (
            <div>
              <p className="text-green-700">✅ Logged in as: <strong>{currentUser.email}</strong></p>
              <p className="text-xs text-green-600 mt-1">User ID: {currentUser.uid}</p>
            </div>
          ) : (
            <p className="text-gray-600">❌ Not logged in</p>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mb-6 flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition font-semibold"
          >
            📊 Go to Dashboard
          </button>
          <button
            onClick={() => navigate('/findings')}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-semibold"
          >
            📋 View Findings Table
          </button>
          <button
            onClick={handleSeedData}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
          >
            🌱 Add Sample Data
          </button>
          <button
            onClick={runQuickTest}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            🧪 Run Auth Tests
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-6">
          Add sample data first, then view it in the dashboard
        </p>

        {/* Test Results */}
        {testResult && (
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-left font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
            {testResult}
          </div>
        )}

        {/* Console Testing Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Console Testing Available</h3>
          <p className="text-sm text-blue-800 mb-2">
            Open DevTools (F12) and try these commands:
          </p>
          <code className="block bg-blue-100 p-2 rounded text-xs">
            await window.authService.signIn('test@example.com', 'password123')<br/>
            window.authService.getCurrentUser()<br/>
            await window.authService.signOut()
          </code>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
