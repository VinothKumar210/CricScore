import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./sw-register";

// Suppress ResizeObserver warnings in development
const resizeObserverErr = /(ResizeObserver loop completed|ResizeObserver loop limit exceeded)/;

const originalError = console.error;
console.error = (...args) => {
  if (args.length === 1 && typeof args[0] === "string" && resizeObserverErr.test(args[0])) {
    return; // suppress the warning
  }
  originalError(...args);
};

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
