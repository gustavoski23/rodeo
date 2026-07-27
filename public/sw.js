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
// ⚠ En especial: los js/*.js same-origin son CACHE-FIRST — cualquier edición
// a esos archivos NO llega a los usuarios hasta subir esta versión.
const VERSION = 'rodeo-v10';

// Nombres de cache derivados de VERSION → activate borra cualquier cosa que no
// empiece por el prefijo de esta versión.
const PREFIX = 'rodeo-';
const SHELL_CACHE  = `${VERSION}-shell`;   // app shell (index.html)
const STATIC_CACHE = `${VERSION}-static`;  // iconos, manifest same-origin
const CDN_CACHE    = `${VERSION}-cdn`;      // Google Fonts + supabase-js

// Shell mínimo a precachear en install. A propósito SOLO el documento raíz:
// si un recurso del precache diera 404, install fallaría y el SW viejo se
// quedaría (recuperable, pero el nuevo nunca instalaría). Menos superficie =
// menos riesgo. Los iconos/manifest se cachean en runtime (cache-first), no
// son críticos para arrancar.
const SHELL_URLS = ['/', '/index.html'];

// Assets de CDN que aún se precalientan en install. Ya NO está Tailwind: sus
// utilidades y su reset viven inline en el shell, así que el incidente que
// motivó este bloque (sin Tailwind, el #overlay con .hidden tapaba la app
// entera) es imposible por construcción — .hidden ya no depende de la red.
// Deben coincidir EXACTO con los <link>/<script> del <head> de index.html.
const CDN_WARM = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Familjen+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Archivo:wght@600;700;800;900&family=Space+Mono:wght@400;700&display=swap',
];

// Assets same-origin adicionales para que el EPISODIO ILUSTRADO funcione
// offline (js del engine + las 6 escenas de "La princesa y el azafrán"). Se
// precachean en install best-effort: si un archivo no existe o el hosting
// responde 404, el install sigue. Las fuentes del player son las de RODEO
// (Archivo/Familjen/Space Mono, ya en CDN_WARM) — Inter salió del retheme.
const APP_WARM = [
  '/js/story-episodes.js',
  '/js/story-mode.js',
  '/js/supabase-sync.js',
  '/js/premium.js',
  '/js/cards-pack-001.js',
  '/js/cards-mode.js',
  '/js/a1-office-content.js',
  '/js/a1-office.js',
  '/episodios/princess/1.jpg',
  '/episodios/princess/2.jpg',
  '/episodios/princess/3.jpg',
  '/episodios/princess/4.jpg',
  '/episodios/princess/5.jpg',
  '/episodios/princess/6.jpg',
];

// CDNs que la app necesita para VERSE bien offline (estilos y fuentes).
// Estrategia NETWORK-FIRST (no stale-while-revalidate): online SIEMPRE se
// sirve la respuesta fresca de la red, y el cache es solo el paracaídas
// offline. Con SWR, una respuesta opaque mala del CDN (un 500/challenge con
// cuerpo de error sobre TLS válido, indistinguible de un 200 porque opaque
// tiene status 0) quedaba cacheada y se servía PRIMERO a usuarios online en
// cada carga, envenenando el recurso hasta la siguiente navegación
// (revisión adversarial). Network-first elimina ese envenenamiento persistente.
const CDN_HOSTS = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',           // supabase-js (cuenta + sync)
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
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL_URLS);   // crítico: si falla, install falla (recuperable)
    await warmCDN();                   // best-effort: nunca lanza, ver abajo
    await warmApp();                   // best-effort: episodio ilustrado offline
    await self.skipWaiting();
  })());
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

  // 3) CDNs conocidas (supabase-js, Google Fonts) → NETWORK-FIRST.
  //    Online siempre trae la copia fresca del CDN (no se sirve una copia
  //    cacheada envenenada); el cache es solo el paracaídas offline.
  if (CDN_HOSTS.has(url.hostname)) {
    event.respondWith(networkFirstCDN(req, CDN_CACHE));
    return;
  }

  // 4) js/*.js same-origin → NETWORK-FIRST. Son los únicos estáticos que
  //    cambian de contenido bajo la misma URL entre releases; con cache-first
  //    una edición quedaba congelada hasta subir VERSION (footgun real: pasó
  //    con el episodio ilustrado). Online = siempre fresco, igual que el
  //    shell; offline = paracaídas del cache (precalentado en warmApp).
  if (url.origin === self.location.origin && url.pathname.startsWith('/js/')) {
    event.respondWith(networkFirstCDN(req, STATIC_CACHE));
    return;
  }

  // 5) Demás estáticos same-origin (iconos, manifest, imágenes, fuentes) →
  //    cache-first: no cambian bajo la misma URL.
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // 6) Cualquier otro cross-origin no listado (Supabase incluido) → red
  //    directa (sin tocar cache). Auth/REST jamás deben cachearse.
  // (no respondWith)
});

/* ── Precalentado de CDN (install) ───────────────────────────────────────
   Mete Tailwind/GSAP/CSS-de-fuentes en el cache ANTES de que la app los
   necesite offline. Best-effort: allSettled + try/catch para que un CDN caído
   JAMÁS haga fallar el install (el shell ya está a salvo). no-cors porque son
   cross-origin sin CORS → respuestas opaque, cacheables igual. */
async function warmCDN() {
  try {
    const cache = await caches.open(CDN_CACHE);
    await Promise.allSettled(CDN_WARM.map(async (u) => {
      const res = await fetch(u, { mode: 'no-cors' });
      if (res) await cache.put(u, res);   // opaque (status 0) o ok: guardar
    }));
  } catch (_e) { /* best-effort: nunca rompe el install */ }
}

// Assets same-origin (episodio ilustrado). Cache-first en runtime ya los
// atrapa la primera vez que se ven, pero eso obliga a Gus a abrir el
// episodio con red. Precalentar en install = jugable offline desde el vuelo.
async function warmApp() {
  try {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(APP_WARM.map(async (u) => {
      try {
        const res = await fetch(u);
        if (res && res.ok) await cache.put(u, res);
      } catch (_e) { /* recurso ausente o red caída: seguimos */ }
    }));
  } catch (_e) { /* best-effort */ }
}

/* ── Estrategias ─────────────────────────────────────────────────────── */

// Network-first para CDNs: online SIEMPRE devuelve la respuesta fresca de la
// red (y actualiza el cache); si la red falla (offline), cae a la copia
// cacheada. A diferencia de SWR, nunca sirve una copia vieja/envenenada primero.
async function networkFirstCDN(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);
    if (fresh && (fresh.ok || fresh.type === 'opaque')) {
      cache.put(req, fresh.clone());   // refresca el paracaídas offline
    }
    return fresh;   // lo que dé la red, igual que sin SW: cero envenenamiento
  } catch (_e) {
    const hit = await cache.match(req);
    return hit || Response.error();    // offline: la copia cacheada
  }
}

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
