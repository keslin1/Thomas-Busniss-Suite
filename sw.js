/**
 * THOMAS BUSINESS - Service Worker
 * Version: 1.1
 */

const CACHE_NAME = 'thomas-business-v1';

// Liste des fichiers à mettre en cache pour le mode hors-ligne
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './shared.css',
  './lcd-customers.css',
  './kalkimatris.css',
  './microcredit.css',
  './achiv-nimewo.css',
  './lcd-customers.js',
  './kalkimatris.js',
  './microcredit.js',
  './achiv-nimewo.js',
  './Thomas.png',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;600;700;900&family=Dancing+Script:wght@700&family=Space+Mono:wght@400;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// 1. Installation : Mise en cache des fichiers statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Mise en cache des fichiers système');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Force le SW à devenir actif immédiatement
  self.skipWaiting();
});

// 2. Activation : Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('SW: Nettoyage ancien cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  // Prend le contrôle des pages immédiatement
  return self.clients.claim();
});

// 3. Stratégie Fetch : Network First (Priorité Réseau, sinon Cache)
// Idéal pour votre application qui peut avoir des mises à jour de données
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si le réseau répond, on renvoie la réponse
        return response;
      })
      .catch(() => {
        // Si le réseau échoue (hors-ligne), on cherche dans le cache
        return caches.match(event.request);
      })
  );
});
