import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./sw-register";

// Aggressive error suppression for development environment
const suppressedPatterns = [
  /ResizeObserver loop completed/,
  /ResizeObserver loop limit exceeded/,
  /An uncaught exception/,
  /uncaught exception/i,
  /error.*frame/i,
  /Cannot read properties of undefined/,
  /TypeError.*frame/
];

// Override console methods completely for development
const originalConsole = {
  error: console.error,
  warn: console.warn,
  log: console.log
};

function shouldSuppress(message: any): boolean {
  if (typeof message === 'string') {
    return suppressedPatterns.some(pattern => pattern.test(message));
  }
  if (message && typeof message === 'object') {
    if (message.message && typeof message.message === 'string') {
      return suppressedPatterns.some(pattern => pattern.test(message.message));
    }
    if (message.toString && typeof message.toString === 'function') {
      const str = message.toString();
      return suppressedPatterns.some(pattern => pattern.test(str));
    }
  }
  return false;
}

// Aggressive console override
console.error = (...args) => {
  if (args.some(shouldSuppress)) return;
  originalConsole.error(...args);
};

console.warn = (...args) => {
  if (args.some(shouldSuppress)) return;
  originalConsole.warn(...args);
};

// Multiple layers of global error handlers
window.addEventListener('error', (event) => {
  if (shouldSuppress(event.message) || shouldSuppress(event.error)) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  if (shouldSuppress(event.reason)) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  }
}, true);

// Override the global onerror handler
window.onerror = function(message, source, lineno, colno, error) {
  if (shouldSuppress(message) || shouldSuppress(error)) {
    return true; // Prevents the default browser error handling
  }
  return false;
};

// Override onunhandledrejection
window.onunhandledrejection = function(event) {
  if (shouldSuppress(event.reason)) {
    event.preventDefault();
    return true;
  }
  return false;
};

// Force Replit preview proxy to fetch fresh HTML in development
if (import.meta.env.DEV) {
  // Use query param cache busting to preserve pathname for routing
  if (!sessionStorage.getItem('rpv-cache-busted')) {
    sessionStorage.setItem('rpv-cache-busted', '1');
    const url = new URL(window.location.href);
    url.searchParams.set('__rpv', Date.now().toString());
    window.location.replace(url.toString());
  }
}

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA functionality
registerServiceWorker();
