import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against third-party browser extension injection errors (e.g. chrome-extension trying to overwrite read-only window.fetch)
window.addEventListener(
  'error',
  (event) => {
    const src = `${event.filename || ''} ${event.error?.stack || ''}`;
    const msg = event.message || '';
    if (
      src.includes('chrome-extension://') ||
      src.includes('moz-extension://') ||
      (msg.includes('Cannot set property fetch') && msg.includes('getter'))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },
  true,
);

// Tier 1 Google Maps Demo Key Quota Defense (module root before React render)
(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
};

const origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  origConsoleError.apply(console, args);
  const msg = args.map((a) => String(a)).join(' ');
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
};

createRoot(document.getElementById('root')!).render(<App />);
