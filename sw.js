/* ══════════════════════════════════════════════════════════════════════
   RODEO — Service Worker  (PWA + modo offline)
   ----------------------------------------------------------------------
   POR QUÉ este SW es "conservador y a prueba de SW-hell":

   El peligro real de un SW en un sitio VIVO es cachear una versión rota del
   shell y servirla para siempre (el usuario queda atrapado sin forma fácil de
   recuperarse). La defensa PRINCIPAL aquí es que la navegación es NETWORK-FIRST:
   mientras haya red, SIEMPRE se pide el index.html fresco al servidor y el cache
   es solo el paracaídas para cuando NO hay red. Así, un deploy nuevo se ve al
   instante en la siguiente carga online — nunca se queda pegado en lo viejo.

   Segunda defensa: el cache está VERSIONADO (VERSION). Al activar una versión
   nueva se borran TODAS las caches de versiones viejas. Subir el número de
   VERSION = invalidar todo lo cacheado.

   Kill-switch (si algo sale MAL en producción): ver notas al final del archivo.
   ══════════════════════════════════════════════════════════════════════ */

// Sube este número en cada release donde quieras invalidar cache viejo.
const VERSION = 'rodeo-v1';

// Nombres de cache derivados de VERSION → activate borra cualquier cosa que no
// empiece por el prefijo de esta versión.
const PREFIX = 'rodeo-';
const SHELL_CACHE  = `${VERSION}-shell`;   // app shell (index.html)
const STATIC_CACHE = `${VERSION}-static`;  // iconos, manifest same-origin
const CDN_CACHE    = `${VERSION}-cdn`;      // Tailwind + Google Fonts (SWR)

// Shell mínimo a precachear en install. A propósito SOLO el documento raíz:
// si un recurso del precache diera 404, install fallaría y el SW viejo se
// quedaría (recuperable, pero el nuevo nunca instalaría). Menos superficie =
// menos riesgo. Los iconos/manifest se cachean en runtime (cache-first), no
// son críticos para arrancar.
const SHELL_URLS = ['/', '/index.html'];

// CDNs que la app necesita para VERSE bien offline (estilos y fuentes).
// Estrategia stale-while-revalidate: sirve del cache al instante y refresca
// en segundo plano.
const CDN_HOSTS = new Set([
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com', // por si se añade GSAP u otra lib desde cdnjs
]);

// Clave de cache para el último drop leído (lectura offline opcional, ver
// mensaje 'CACHE_DROP' más abajo). OJO: el frontend YA persiste el drop en
// localStorage (store 'rodeo_drop_hoy'), así que la lectura offline del último
// drop funciona sin este SW. Esto es solo un mecanismo extra por si se quiere
// cachear la RESPUESTA cruda de un endpoint concreto.
const DROP_CACHE = `${VERSION}-drop`;

/* ── INSTALL ─────────────────────────────────────────────────────────────
   Precachea el shell. skipWaiting() para no quedar atrapados esperando que se
   cierren todas las pestañas (ver trade-off en NOTAS). El addAll es la única
   operación que puede hacer fallar el install a propósito: si no hay red, el
   install falla y se reintenta luego — el SW viejo (o ninguno) sigue sirviendo.
*/
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE ────────────────────────────────────────────────────────────
   Borra TODAS las caches que no sean de esta VERSION (limpieza de versiones
   viejas). clientsClaim() para tomar control de las pestañas ya abiertas de
   inmediato (ver trade-off en NOTAS).
*/
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        // Solo tocamos nuestras caches (prefijo rodeo-) que NO son de esta versión.
        .filter((key) => key.startsWith(PREFIX) && !key.startsWith(VERSION))
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

/* ── FETCH ───────────────────────────────────────────────────────────────
   Router por tipo de request. Orden importa.
*/
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo interceptamos GET. POST/otros (p.ej. /api/chat es POST) pasan directo
  // a la red sin que el SW se meta.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) /api/* → NUNCA cachear (contenido de IA fresco/caro). Network-only.
  //    Si falla offline, dejamos que el fetch falle limpio: el frontend ya tiene
  //    sus fallbacks/toasts. No respondemos con nada del cache.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    return; // no llamamos respondWith → el navegador hace su fetch normal
  }

  // 2) Navegación (cargar/recargar la página) → NETWORK-FIRST.
  //    Esta es la defensa clave anti SW-hell: online siempre trae el index
  //    fresco; el cache es solo paracaídas offline.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstShell(req));
    return;
  }

  // 3) CDNs conocidas (Tailwind, Google Fonts) → stale-while-revalidate.
  if (CDN_HOSTS.has(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req, CDN_CACHE));
    return;
  }

  // 4) Estáticos same-origin (iconos, manifest, etc.) → cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // 5) Cualquier otro cross-origin no listado → red directa (sin tocar cache).
  // (no respondWith)
});

/* ── Estrategias ─────────────────────────────────────────────────────── */

// Network-first para el shell: intenta red, si sirve (y es ok) actualiza cache
// y responde; si la red falla (offline), cae al index cacheado.
async function networkFirstShell(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(req);
    // Solo cacheamos respuestas buenas (evita cachear 500/errores del server).
    if (fresh && fresh.ok) {
      cache.put('/', fresh.clone()); // normalizamos la clave del shell a '/'
    }
    return fresh;
  } catch (_e) {
    // Offline: devolvemos el shell cacheado. Probamos la URL pedida y, si no,
    // las claves canónicas del shell.
    const cached =
      (await cache.match(req)) ||
      (await cache.match('/')) ||
      (await cache.match('/index.html'));
    if (cached) return cached;
    // Último recurso: respuesta offline mínima (no debería pasar si install ok).
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>RODEO offline</title>' +
      '<body style="background:#0a0a0e;color:#fff;font-family:sans-serif;padding:2rem">' +
      'Sin conexión y sin copia local. Vuelve a abrir con internet una vez.</body>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

// Cache-first: para recursos estáticos que no cambian de contenido bajo la misma
// URL (iconos, manifest). Si no está, va a red y cachea la copia buena.
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) {
      cache.put(req, res.clone());
    }
    return res;
  } catch (_e) {
    // Si es opaque/no hay red y no había copia, devolvemos error de red normal.
    return hit || Response.error();
  }
}

// Stale-while-revalidate: responde del cache al instante (si hay) y en paralelo
// pide a la red para refrescar la copia. Ideal para CSS/fuentes de CDN.
// OJO opaque: las fuentes de fonts.gstatic.com llegan con CORS (el <link> usa
// crossorigin) → respuesta legible y cacheable. Pero por robustez cacheamos
// también respuestas 'opaque' (status 0): sirven para pintar offline aunque no
// podamos inspeccionarlas. Cuentan doble en la cuota de almacenamiento, es el
// precio conocido de cachear cross-origin sin CORS.
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const networkPromise = fetch(req)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        cache.put(req, res.clone());
      }
      return res;
    })
    .catch(() => null); // offline: no rompemos, dependemos del hit
  // Si hay copia, la devolvemos ya y refrescamos en segundo plano.
  return hit || (await networkPromise) || Response.error();
}

/* ── MENSAJES (control desde el frontend) ────────────────────────────────
   Canal opcional para que el frontend hable con el SW.

   - 'CACHE_DROP': el frontend puede mandar { type:'CACHE_DROP', url, body }
     para guardar una copia de la respuesta del último drop y leerla offline.
     Uso previsto (a pegar en index.html cuando se quiera):

       navigator.serviceWorker.controller?.postMessage({
         type: 'CACHE_DROP',
         url: '/api/last-drop',              // clave lógica, no se pide a la red
         body: JSON.stringify(edicionDelDia) // string ya serializado
       });

     Y para leerlo offline: fetch('/api/last-drop') NO sirve (api/* es
     network-only); en su lugar el frontend lee de localStorage 'rodeo_drop_hoy'.
     Este cache es solo un respaldo extra; NO es la vía principal.

   - 'SKIP_WAITING': permite forzar la activación de un SW en espera si en el
     futuro se decide NO usar skipWaiting en install (ver NOTAS).
*/
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'CACHE_DROP' && data.url && typeof data.body === 'string') {
    event.waitUntil(
      caches.open(DROP_CACHE).then((cache) => cache.put(
        new Request(data.url),
        new Response(data.body, {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        })
      ))
    );
  }
});

/* ══════════════════════════════════════════════════════════════════════
   NOTAS — trade-off de skipWaiting + clientsClaim, y KILL-SWITCH
   ----------------------------------------------------------------------
   ¿Por qué skipWaiting() + clients.claim()?
   El mayor riesgo de "SW-hell" no es solo cachear algo roto, sino que el SW
   NUEVO quede en estado "waiting" indefinidamente porque hay pestañas viejas
   abiertas, y el usuario siga con la versión vieja sin saberlo. Con
   skipWaiting el SW nuevo activa en cuanto instala, y con clients.claim toma
   las pestañas abiertas de inmediato. Combinado con navegación NETWORK-FIRST,
   el resultado es: los updates se propagan rápido y nadie queda atrapado en una
   versión vieja.

   Coste asumido: en el instante del cambio de versión, una pestaña ya cargada
   podría pedir un sub-recurso y recibirlo del SW nuevo (posible "skew" de
   versión a media sesión). En RODEO el riesgo es mínimo porque TODA la lógica
   de la app vive inline dentro de index.html (no hay chunks JS versionados que
   se pidan por separado), y el shell es network-first. Un simple reload deja
   todo coherente.

   Alternativa más conservadora (si algún día molesta el skew): quitar
   skipWaiting del install y activar el SW nuevo solo cuando el usuario acepte
   (patrón "hay una versión nueva, recargar"): el frontend detecta
   registration.waiting y, al confirmar el usuario, hace
   waiting.postMessage({type:'SKIP_WAITING'}) y recarga en el evento
   'controllerchange'. El handler de mensajes de arriba ya lo soporta.

   ── KILL-SWITCH (si un SW roto llega a producción) ──
   Opción A (recomendada, servidor): desplegar un sw.js "vacío" que se
   auto-desregistra. Contenido completo:

       self.addEventListener('install', () => self.skipWaiting());
       self.addEventListener('activate', (e) => e.waitUntil((async () => {
         const keys = await caches.keys();
         await Promise.all(keys.map((k) => caches.delete(k)));
         await self.registration.unregister();
         const clients = await self.clients.matchAll();
         clients.forEach((c) => c.navigate(c.url));
       })()));

   Como la navegación es network-first, los clientes online piden el index
   fresco, y como registramos el SW en cada carga, tomarán este sw.js
   neutralizador, borrarán caches y se desregistrarán solos.

   Opción B (manual, DevTools): Application → Service Workers → Unregister, y
   Application → Storage → Clear site data.

   Opción C (desde el frontend, para forzar reset en todos):
       navigator.serviceWorker.getRegistrations()
         .then((rs) => rs.forEach((r) => r.unregister()));
   ══════════════════════════════════════════════════════════════════════ */
