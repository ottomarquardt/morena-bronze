const CACHE_NAME = 'morena-bronze-v1';

// Recursos para cachear na instalação
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

// Instalação: pré-cacheia os arquivos essenciais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cacheia arquivos locais de forma obrigatória
      return cache.addAll(['/', '/index.html', '/manifest.json'])
        .then(() => {
          // Tenta cachear externos (falha silenciosa)
          return Promise.allSettled(
            PRECACHE_URLS.slice(3).map(url => cache.add(url).catch(() => {}))
          );
        });
    }).then(() => self.skipWaiting())
  );
});

// Ativação: remove caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: estratégia Cache First para assets, Network First para navegação
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET
  if (request.method !== 'GET') return;

  // Estratégia: Network First para a página principal
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Estratégia: Cache First para assets (fontes, ícones, libs JS/CSS)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback para imagens
        if (request.destination === 'image') {
          return caches.match('/icon-192x192.png');
        }
      });
    })
  );
});

// Mensagem para forçar atualização
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
