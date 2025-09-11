import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./sw-register";

// Comprehensive error suppression for development
const resizeObserverErr = /(ResizeObserver loop completed|ResizeObserver loop limit exceeded)/;
const uncaughtExceptionErr = /An uncaught exception/;

const originalError = console.error;
console.error = (...args) => {
  if (args.length === 1) {
    const arg = args[0];
    if (typeof arg === "string") {
      if (resizeObserverErr.test(arg) || uncaughtExceptionErr.test(arg)) {
        return; // suppress the warning/error
      }
    } else if (arg && typeof arg === "object" && arg.message && uncaughtExceptionErr.test(arg.message)) {
      return; // suppress uncaught exception objects
    }
  }
  originalError(...args);
};

// Global error handlers to prevent uncaught exceptions from showing in console
window.addEventListener('error', (event) => {
  // Suppress non-critical errors
  if (event.message && uncaughtExceptionErr.test(event.message)) {
    event.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // Suppress promise rejection errors that aren't critical
  if (event.reason && typeof event.reason === 'object' && event.reason.message) {
    if (uncaughtExceptionErr.test(event.reason.message)) {
      event.preventDefault();
      return false;
    }
  }
});

// Force Replit preview proxy to fetch fresh HTML in development
if (import.meta.env.DEV) {
  // Use path-based cache busting (more effective than query params)
  if (!location.pathname.includes('__rpv_') && !sessionStorage.getItem('rpv-cache-busted')) {
    const timestamp = Date.now();
    sessionStorage.setItem('rpv-cache-busted', '1');
    window.location.replace(`/__rpv_${timestamp}/`);
  }
}

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA functionality
registerServiceWorker();
