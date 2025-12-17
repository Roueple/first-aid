import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { connectionMonitor } from '../utils/connectionMonitor';

console.log('🎬 main.tsx loading...');

// Import seed utilities (they auto-expose to window) - load async to not block
Promise.all([
  import('../utils/seedDataNew'),
  import('../utils/clearAndReseed')
]).then(() => {
  console.log('✅ Seed utilities loaded');
}).catch((error) => {
  console.error('⚠️ Failed to load seed utilities:', error);
});

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

console.log('🎯 Creating React root...');
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
  throw new Error('Root element not found');
}

console.log('✅ Root element found, rendering app...');
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('✅ React app rendered');
