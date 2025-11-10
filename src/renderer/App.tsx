import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import { ConnectionStatus } from '../components/ConnectionStatus';
import '../utils/testFirebase'; // Test Firebase initialization on app load

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <ConnectionStatus />
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
