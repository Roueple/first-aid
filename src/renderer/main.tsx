import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { connectionMonitor } from '../utils/connectionMonitor';

// Import seed utilities (they auto-expose to window)
import '../utils/seedDataNew';
import '../utils/clearAndReseed';

// Expose connectionMonitor to window for DevTools testing
declare global {
  interface Window {
    connectionMonitor: typeof connectionMonitor;
    seedNewFindings: () => Promise<void>;
    clearAllFindings: () => Promise<void>;
    clearAndReseed: () => Promise<void>;
  }
}

window.connectionMonitor = connectionMonitor;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
