import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { AuthGuard } from '../components/AuthGuard';
import '../utils/testFirebase'; // Test Firebase initialization on app load

function App() {
  return (
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
