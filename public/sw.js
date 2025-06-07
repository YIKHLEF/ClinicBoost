/**
 * Service Worker for ClinicBoost PWA
 * 
 * Provides offline functionality, push notifications, and background sync
 */

const CACHE_NAME = 'clinicboost-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/pwa-192x192.png',
  '/icons/pwa-512x512.png',
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Ensure the new service worker takes control immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Try to fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache the response for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If both cache and network fail, show offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            // For other requests, return a generic offline response
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain',
              }),
            });
          });
      })
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received');

  let notificationData = {
    title: 'ClinicBoost',
    body: 'You have a new notification',
    icon: '/icons/pwa-192x192.png',
    badge: '/icons/notification-badge.png',
    tag: 'default',
    data: {},
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error('Error parsing push data:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction || false,
      actions: notificationData.actions || [],
      vibrate: [200, 100, 200],
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked');

  event.notification.close();

  // Handle notification actions
  if (event.action) {
    console.log('Notification action clicked:', event.action);
    
    // Handle different actions
    switch (event.action) {
      case 'view':
        event.waitUntil(
          clients.openWindow(event.notification.data.url || '/')
        );
        break;
      case 'dismiss':
        // Just close the notification
        break;
      default:
        console.log('Unknown action:', event.action);
    }
  } else {
    // Default click behavior - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // If app is already open, focus it
          for (const client of clientList) {
            if (client.url === self.location.origin && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Otherwise, open a new window
          if (clients.openWindow) {
            const url = event.notification.data.url || '/';
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform background sync operations
      performBackgroundSync()
    );
  } else if (event.tag === 'data-sync') {
    event.waitUntil(
      // Sync data when connection is restored
      syncOfflineData()
    );
  }
});

// Background sync functions
async function performBackgroundSync() {
  try {
    console.log('Performing background sync...');
    
    // Send any queued data to the server
    const queuedData = await getQueuedData();
    
    for (const data of queuedData) {
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        // Remove from queue after successful sync
        await removeFromQueue(data.id);
      } catch (error) {
        console.error('Failed to sync data:', error);
      }
    }
    
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function syncOfflineData() {
  try {
    console.log('Syncing offline data...');
    
    // Notify the main app that sync is starting
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_START',
      });
    });
    
    // Perform data synchronization
    // This would typically involve syncing appointments, patient data, etc.
    
    // Notify the main app that sync is complete
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
      });
    });
    
    console.log('Offline data sync completed');
  } catch (error) {
    console.error('Offline data sync failed:', error);
    
    // Notify the main app of sync failure
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_ERROR',
        error: error.message,
      });
    });
  }
}

// Helper functions for queue management
async function getQueuedData() {
  // In a real implementation, this would read from IndexedDB
  return [];
}

async function removeFromQueue(id) {
  // In a real implementation, this would remove from IndexedDB
  console.log('Removing from queue:', id);
}

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Service Worker loaded');
