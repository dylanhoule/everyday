import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App.jsx';
import './index.css';

// PWA autoUpdate skipWaiting+clientsClaim so a new SW takes control after a deploy,
// but the open page keeps the old bundle until reloaded. Reload once when that
// happens so a freshly pushed plan seeds without the user force-closing the app.
// Guard on an existing controller so the first-ever visit (SW claiming for the
// first time) doesn't reload.
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* motion animates via inline styles, so the CSS reduced-motion block can't reach it */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>
);
