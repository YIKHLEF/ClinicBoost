import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import './i18n/i18n.ts';

// Import PWA registration
import { registerSW } from 'virtual:pwa-register';

// Import offline demo for development
if (import.meta.env.DEV) {
  import('./demo/offline-demo').then(({ OfflineDemo }) => {
    (window as any).OfflineDemo = OfflineDemo;
    console.log('🔧 ClinicBoost Development Mode');
    console.log('💡 Offline Demo available: new OfflineDemo().runDemo()');
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);