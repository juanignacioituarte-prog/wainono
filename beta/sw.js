const CACHE_NAME = 'rt-farm-v1.0.18';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './icon-512.png',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.log('Cache addAll failed for some assets:', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Always fetch live data from Google Sheets and GCS (never cache)
    if (url.hostname.includes('google') || url.hostname.includes('googleapis') || url.hostname.includes('storage.googleapis')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Network First strategy (ensures latest version is loaded if online)
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // If valid response, update cache
                if (networkResponse && networkResponse.ok) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return networkResponse;
            })
            .catch(() => {
                // If offline, check cache
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) return cachedResponse;
                    
                    // Offline fallback for index.html
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
