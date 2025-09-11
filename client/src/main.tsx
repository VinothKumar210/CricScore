import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./sw-register";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA functionality
registerServiceWorker();

// Force hard refresh in development if preview is stuck
if (import.meta.env.DEV) {
  // Clear all possible caches and force refresh if needed
  if (sessionStorage.getItem('dev-cache-cleared') !== 'true') {
    sessionStorage.setItem('dev-cache-cleared', 'true');
    
    // Clear all storage
    localStorage.clear();
    
    // Force reload to ensure fresh content
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }
}
