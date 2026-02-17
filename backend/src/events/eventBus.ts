import { EventEmitter } from 'events';

// Global Event Bus for domain events
// Decouples Services from Socket.IO / Push Notification Logic
export const eventBus = new EventEmitter();
