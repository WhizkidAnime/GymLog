
const CACHE_NAME = 'gymlog-pwa-cache-v62';
const urlsToCache = [
  './',
  './index.html',
  './index.css',
  './manifest.webmanifest',
  // Примечание: Vite генерирует хэширующиеся бандлы, их можно кэшировать стратегией cache-first через runtime, либо добавить здесь при необходимости.
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Для Supabase API всегда идём в сеть.
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Для навигации (index.html) — network-first, чтобы получать свежий HTML с новыми хешами.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return cache.match('./index.html');
        })
    );
    return;
  }

  // Остальные ресурсы — cache-first с догрузкой в кэш.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Обработка push-уведомлений
self.addEventListener('push', event => {
  let data = {
    title: 'Таймер отдыха',
    body: 'Время отдыха закончилось!',
    data: {}
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: './icons/favicon-32.png',
    badge: './icons/favicon-16.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'rest-timer',
    renotify: true,
    requireInteraction: true,
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Открываем приложение или фокусируемся на существующем окне
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Если есть открытое окно, фокусируемся на нём
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        // Иначе открываем новое окно
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
  );
});
