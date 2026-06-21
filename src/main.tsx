import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and swallow benign development-only WebSocket or Vite connection rejections
if (typeof window !== 'undefined') {
  const suppressDevErrors = (event: ErrorEvent | PromiseRejectionEvent) => {
    const message = 'message' in event 
      ? event.message 
      : event.reason?.message || event.reason?.toString() || '';
    
    const isWebSocketOrVite = /websocket|vite|hmr|connection/i.test(message) || 
                             (event instanceof PromiseRejectionEvent && /closed without opened/i.test(message));
                             
    if (isWebSocketOrVite) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  };

  window.addEventListener('error', suppressDevErrors, true);
  window.addEventListener('unhandledrejection', suppressDevErrors, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
