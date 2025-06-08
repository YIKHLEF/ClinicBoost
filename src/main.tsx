import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Initialize mock API server for development
import './lib/api/mock-server';

// Simplified initialization for development
console.log('🔧 ClinicBoost Development Mode');

// Simple app initialization
try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
  console.log('✅ ClinicBoost application started successfully');
} catch (error) {
  console.error('❌ Application initialization failed:', error);

  // Show simple error message
  document.getElementById('root')!.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      text-align: center;
      padding: 2rem;
    ">
      <div style="
        background: white;
        border-radius: 8px;
        padding: 2rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        max-width: 500px;
      ">
        <h1 style="color: #dc2626; margin-bottom: 1rem;">Application Error</h1>
        <p style="margin-bottom: 1rem;">
          ClinicBoost failed to start. Check the console for details.
        </p>
        <button
          onclick="window.location.reload()"
          style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 1rem;
          "
        >
          Retry
        </button>
      </div>
    </div>
  `;
}