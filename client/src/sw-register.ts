// Service Worker Registration - Only in Production
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Only register service worker in production
      if (import.meta.env.PROD) {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        if (registration.installing) {
          console.log('Service worker installing');
        } else if (registration.waiting) {
          console.log('Service worker installed');
        } else if (registration.active) {
          console.log('Service worker active');
        }
        
        // Update service worker if available
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, prompt user to refresh
                if (confirm('New version available! Refresh to update?')) {
                  window.location.reload();
                }
              }
            });
          }
        });
      } else {
        // Development mode: Unregister any existing service workers and clear caches
        console.log('Development mode: Cleaning up service workers and caches...');
        
        // Unregister all service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('Unregistered service worker:', registration.scope);
        }
        
        // Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            console.log('Deleted cache:', cacheName);
          }
        }
        
        console.log('Service workers and caches cleared for development');
      }
      
    } catch (error) {
      console.error('Service Worker operation failed:', error);
    }
  }
};

// PWA Install Prompt
export const handlePWAInstall = () => {
  let deferredPrompt: any;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show install button or prompt
    console.log('PWA can be installed');
  });
  
  // Function to trigger install prompt
  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User ${outcome} the install prompt`);
      deferredPrompt = null;
    }
  };
  
  return { promptInstall };
};