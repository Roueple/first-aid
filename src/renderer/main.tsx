import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { connectionMonitor } from '../utils/connectionMonitor';

// Expose connectionMonitor to window for DevTools testing
declare global {
  interface Window {
    connectionMonitor: typeof connectionMonitor;
  }
}

window.connectionMonitor = connectionMonitor;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
