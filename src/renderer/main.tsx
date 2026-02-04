import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { connectionMonitor } from '../utils/connectionMonitor';

console.log('🎬 main.tsx loading...');

// Lazy load seed utilities only when needed (not on startup)
// Access via: window.loadSeedUtils()
if (typeof window !== 'undefined') {
  (window as any).loadSeedUtils = async () => {
    console.log('📦 Loading seed utilities...');
    await Promise.all([
      import('../utils/seedDataNew'),
      import('../utils/clearAndReseed')
    ]);
    console.log('✅ Seed utilities loaded');
  };
}

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
