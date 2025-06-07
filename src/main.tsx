import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import './i18n/i18n.ts';

// Import PWA registration
import { registerSW } from 'virtual:pwa-register';

// Import security initialization
import { initializeSecurity } from './lib/initialization/security-initialization';
import { logger } from './lib/logging-monitoring';

// Import offline demo for development
if (import.meta.env.DEV) {
  import('./demo/offline-demo').then(({ OfflineDemo }) => {
    (window as any).OfflineDemo = OfflineDemo;
    console.log('🔧 ClinicBoost Development Mode');
    console.log('💡 Offline Demo available: new OfflineDemo().runDemo()');
  });
}

// Initialize security features before app startup
async function initializeApp() {
  try {
    logger.info('Initializing ClinicBoost application', 'app-startup');

    // Initialize security features
    const securityResult = await initializeSecurity();

    if (!securityResult.success) {
      logger.error('Security initialization failed', 'app-startup', {
        errors: securityResult.errors,
        warnings: securityResult.warnings,
      });

      // In production, you might want to prevent app startup on critical security failures
      if (import.meta.env.VITE_APP_ENVIRONMENT === 'production' && securityResult.errors.length > 0) {
        throw new Error('Critical security initialization failed');
      }
    } else {
      logger.info('Security initialization completed successfully', 'app-startup', {
        features: securityResult.features,
        summary: securityResult.summary,
      });
    }

    // Register service worker
    const updateSW = registerSW({
      onNeedRefresh() {
        if (confirm('New content available. Reload?')) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        console.log('App ready to work offline');
      },
    });

    // Render the application
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>
    );

    logger.info('ClinicBoost application started successfully', 'app-startup');
  } catch (error) {
    logger.error('Application initialization failed', 'app-startup', { error });

    // Show error to user
    const errorContainer = document.createElement('div');
    errorContainer.innerHTML = `
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
          <h1 style="color: #dc2626; margin-bottom: 1rem;">Application Initialization Failed</h1>
          <p style="margin-bottom: 1rem;">
            ClinicBoost failed to initialize properly. This may be due to configuration issues.
          </p>
          <p style="font-size: 0.875rem; color: #6b7280;">
            Error: ${(error as Error).message}
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

    document.getElementById('root')!.appendChild(errorContainer);
  }
}

// Start the application
initializeApp();