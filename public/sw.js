// Prep & Play with Wes — offline app shell cache
// Bump CACHE_VERSION to force a refresh of the precached shell.
const CACHE_VERSION = 'v1';
const SHELL_CACHE = `ppw-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `ppw-runtime-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/play/word_wizard',
  '/play/word_wizard/riddles',
  '/play/word_wizard/story_finish',
  '/play/word_wizard/word_categories',
  '/play/pattern_detective',
  '/play/pattern_detective/shape_sequences',
  '/play/pattern_detective/size_color_sorting',
  '/play/pattern_detective/odd_one_out',
  '/play/memory_master',
  '/play/memory_master/remember_list',
  '/play/memory_master/order_recall',
  '/play/memory_master/story_details',
  '/play/math_explorer',
  '/play/math_explorer/counting_adventures',
  '/play/math_explorer/more_or_less',
  '/play/math_explorer/algebra_puzzles',
  '/play/math_explorer/addition_tables',
  '/play/math_explorer/subtraction_tables',
  '/play/confidence_coach',
  '/play/confidence_coach/meet_greet',
  '/play/confidence_coach/what_would_you_do',
  '/play/confidence_coach/i_dont_know',
  '/play/story_builder',
  '/animals',
  '/battle',
  '/trophies',
  '/dashboard',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // Use individual put() so a single 404 doesn't abort the whole install.
      .then((cache) => Promise.all(
        APP_SHELL.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((res) => (res.ok ? cache.put(url, res) : null))
            .catch(() => null)
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Never intercept third-party API traffic — app handles those at the call site.
  if (url.hostname.includes('anthropic.com') || url.hostname.includes('supabase.co')) {
    return;
  }

  // Never cache our own API routes — they're dynamic and have their own fallback path.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: try cache first, fall back to network, fall back to '/'.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          // Refresh the cached page in the background when online.
          event.waitUntil(
            fetch(req)
              .then((res) => res && res.ok && caches.open(SHELL_CACHE).then((c) => c.put(req, res.clone())))
              .catch(() => {})
          );
          return cached;
        }
        return fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => caches.match('/'));
      })
    );
    return;
  }

  // Static assets (Next chunks, images, fonts): cache-first into runtime cache.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (!res || res.status !== 200 || res.type === 'opaque') return res;
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => cached);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
