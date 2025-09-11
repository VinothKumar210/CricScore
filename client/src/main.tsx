import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./sw-register";

// Force Replit preview proxy to fetch fresh HTML in development
if (import.meta.env.DEV) {
  const u = new URL(window.location.href);
  
  // Add cache-busting query parameter if not already present
  if (!u.searchParams.has('__rpv') && !sessionStorage.getItem('rpv-cache-busted')) {
    u.searchParams.set('__rpv', Date.now().toString());
    sessionStorage.setItem('rpv-cache-busted', '1');
    window.location.replace(u.toString());
  }
}

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA functionality
registerServiceWorker();
