/* ═══════════════════════════════════════════════════════════════════════
   RODEO — Cuenta (Google) + sync de DNA/progreso entre dispositivos
   ----------------------------------------------------------------------
   Mejora progresiva PURA: sin key configurada, sin window.supabase (CDN
   caído/offline) o sin sesión, la app funciona EXACTO igual que antes —
   todo vive en localStorage y este archivo es un no-op silencioso.

   Diseño del sync (2 dispositivos de UN usuario, uso secuencial):
   - PULL al arrancar con sesión viva (y al volver de login): trae la fila,
     hace MERGE con lo local (nunca pisa: unión de DNA por clave de
     contenido, máximos de contadores, racha más reciente) y re-pushea el
     resultado fusionado para que la nube converja.
   - PUSH con debounce 2.5s cada vez que el app escribe una clave sync-able
     (hook de UNA línea en store.set → window.sbOnLocalChange).
   - Sin realtime a propósito: pull-al-abrir + push-al-cambiar cubre el uso
     real (cel en la calle, PC en la casa) sin sockets ni complejidad.

   Carga ANTES del script principal de index.html (como js/story-*.js):
   aquí NO se toca `state`/`store` en tiempo de carga — solo dentro de
   funciones que corren después (sbInit se llama desde el INIT de la app).
   ═══════════════════════════════════════════════════════════════════════ */
'use strict';

/* ── Config ──────────────────────────────────────────────────────────────
   La URL es del proyecto de Supabase de Gus. La key "publishable/anon" es
   PÚBLICA por diseño (RLS protege los datos) — es seguro versionarla.
   ⚠ PEGAR AQUÍ: dashboard → Project Settings → API Keys → "anon public"
   (o la nueva "publishable"). Mientras esté vacía, la sección Cuenta del
   perfil muestra cómo activarla y todo lo demás sigue igual. */
const SB_URL = 'https://cablhejzsxqgwdvyzqei.supabase.co';
const SB_ANON_KEY = 'sb_publishable_jNRFSwU8ar-DZ0UY2_mQfg_Nz7LKXYI';

// Claves de localStorage que disparan push cuando el app las escribe.
const SB_SYNC_KEYS = new Set([
  'rodeo_dna', 'rodeo_intereses', 'rodeo_cost', 'rodeo_sessions',
  'rodeo_stories', 'rodeo_ladder_xp', 'rodeo_streak',
  'rodeo_seen_slang', 'rodeo_seen_ladder', 'rodeo_nombre', 'rodeo_nivel',
]);

let sbClient = null;
let sbUsuario = null;         // user de Supabase o null
let sbPushTimer = null;
let sbPushEnVuelo = false;
let sbPushPendiente = false;  // llegó otro cambio mientras volaba un push
let sbUltimoSync = 0;         // epoch ms del último pull/push OK
// Mapa de providers OAuth REALMENTE habilitados en el server (de /auth/v1/settings):
// { google: bool, email: bool, github: bool, … }. null = aún no llegó / falló el
// fetch → lo tratamos como "Google apagado" y NO pintamos su botón. Lo llena
// sbCargarProviders() desde sbInit. Es la clave del fix: signInWithOAuth no valida
// el provider en el cliente (redirige a /authorize de una), así que sin este dato
// Gus aterrizaba en el JSON crudo "provider is not enabled".
let sbExternal = null;

function sbConfigured() { return !!(SB_URL && SB_ANON_KEY); }
function sbListo() { return !!(sbClient && sbUsuario); }

/* ── Init (lo llama el INIT de index.html) ─────────────────────────────── */
function sbInit() {
  if (!sbConfigured() || !window.supabase || sbClient) return;
  try {
    sbClient = window.supabase.createClient(SB_URL, SB_ANON_KEY);
  } catch (_e) { sbClient = null; return; }

  // Pregunta al server qué providers OAuth están REALMENTE habilitados, para no
  // pintar el botón de Google a ciegas (ver comentario de sbExternal arriba y
  // sbCargarProviders abajo). Es async pero NO bloquea el init: si tarda, el
  // botón simplemente no aparece hasta la próxima apertura del perfil.
  sbCargarProviders();

  // Estado inicial + cambios de sesión. INITIAL_SESSION llega al restaurar
  // sesión guardada; SIGNED_IN al volver del redirect de Google — en ambos:
  // pull. El setTimeout es OBLIGATORIO: el dispatcher de onAuthStateChange
  // retiene el lock de auth, y llamar otros métodos del cliente dentro del
  // callback puede deadlockear (gotcha documentado de supabase-js v2).
  sbClient.auth.onAuthStateChange((evento, sesion) => {
    const antes = !!sbUsuario;
    sbUsuario = (sesion && sesion.user) || null;
    if (sbUsuario && !antes) {
      setTimeout(() => {
        sbPull();
        if (evento === 'SIGNED_IN' && typeof toast === 'function') {
          toast('Cuenta conectada — sincronizando tu DNA');
        }
      }, 0);
    }
  });

  // Al volver a la app (cambio de pestaña/desbloqueo del cel): pull si el
  // último sync tiene más de 5 min — así el PC recoge lo que hizo el cel.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && sbListo()
        && Date.now() - sbUltimoSync > 5 * 60 * 1000) sbPull();
  });
}

/* ── Providers habilitados en el server ─────────────────────────────────────
   GET /auth/v1/settings es público (solo pide el apikey anon) y devuelve
   { external: { google, email, github, … : bool }, … }. Cacheamos ese mapa en
   sbExternal para decidir si pintar el botón de Google SIN redirigir a ciegas.
   Falla suave: offline / 403 / JSON raro → sbExternal se queda null → no se pinta
   Google (el correo, que no depende de esto, sigue siendo el camino principal).
   A propósito NO forzamos re-render en vivo: sbZonaLoginHTML lee sbExternal en
   CADA render, así que la próxima apertura del perfil ya pinta el botón si Google
   quedó activo — y evitamos borrar la pantalla de "revisa tu correo" que comparte
   el contenedor #sb-zona. */
async function sbCargarProviders() {
  try {
    const r = await fetch(SB_URL + '/auth/v1/settings', {
      headers: { apikey: SB_ANON_KEY },
    });
    if (!r.ok) return;                    // 403 / 5xx → sbExternal se queda null
    const j = await r.json();
    sbExternal = (j && j.external) || null;
  } catch (_e) {
    // Sin red / CORS / JSON inválido: sin datos → null → no se pinta Google.
    sbExternal = null;
  }
}

/* ── Login / logout ────────────────────────────────────────────────────── */
async function sbLogin() {
  if (!sbClient) return;
  // Doble cinturón. El botón de Google solo se pinta si sbExternal.google===true,
  // pero el provider podría apagarse entre el render y el clic — así que lo
  // re-verificamos aquí. Si no está habilitado, avisamos y NO salimos: nunca
  // mandamos el navegador a /authorize a ciegas (ahí es donde Gus caía en el
  // JSON crudo "provider is not enabled").
  if (!(sbExternal && sbExternal.google === true)) {
    if (typeof toast === 'function') {
      toast('Google aún no está activado en Supabase — usa el correo, o mira SUPABASE-runbook.md §4', 5000);
    }
    const b0 = document.getElementById('sb-login'); if (b0) b0.disabled = false;
    return;
  }
  try {
    // skipBrowserRedirect: por defecto signInWithOAuth arma la URL y redirige
    // SOLA, sin validar el provider en el cliente. Con esto nos devuelve la URL
    // en data.url y navegamos NOSOTROS con location.assign — controlando el salto
    // y habiendo confirmado antes (arriba) que Google sí está habilitado.
    const { data, error } = await sbClient.auth.signInWithOAuth({
      provider: 'google',
      // Vuelve exactamente a esta página (prod o localhost). Ambas URLs
      // deben estar en la allowlist de Supabase (ver SUPABASE-runbook.md).
      options: { redirectTo: location.origin + location.pathname, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (data && data.url) location.assign(data.url);
  } catch (e) {
    const msg = String((e && e.message) || e);
    if (typeof toast === 'function') {
      toast(/not enabled|unsupported provider/i.test(msg)
        ? 'Google aún no está activado en Supabase — usa el correo, o mira SUPABASE-runbook.md §4'
        : 'No pude abrir el login de Google: ' + msg, 5000);
    }
    const b = document.getElementById('sb-login'); if (b) b.disabled = false;
  }
}

/* ── Login por correo (enlace mágico / código) ──────────────────────────
   Funciona SIN Google Cloud: signInWithOtp manda un correo con un enlace
   (template default) y, si el template incluye {{ .Token }}, también un
   código de 6 dígitos que se pega aquí mismo (verifyOtp) sin redirects —
   ideal dentro del TWA. El enlace requiere tener la Site URL / allowlist
   configuradas (paso de 2 min en el dashboard, ver runbook §3). */
async function sbLoginEmail() {
  if (!sbClient) return;
  const inp = document.getElementById('sb-email');
  const email = String((inp && inp.value) || '').trim().toLowerCase();
  if (!email || email.indexOf('@') < 1) {
    if (typeof toast === 'function') toast('Escribe tu correo primero');
    return;
  }
  const btn = document.getElementById('sb-email-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'ENVIANDO…'; }
  try {
    const { error } = await sbClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true },
    });
    if (error) throw error;
    try { localStorage.setItem('rodeo_sb_email', email); } catch (_e) {}
    sbPintarEsperaCorreo(email);
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'MÁNDAME EL ENLACE'; }
    if (typeof toast === 'function') toast('No pude enviar el correo: ' + ((e && e.message) || e), 5000);
  }
}

// Tras enviar: instrucciones + campo de código (por si el template lo trae).
function sbPintarEsperaCorreo(email) {
  const zona = document.getElementById('sb-zona');
  if (!zona) return;
  const E = (s) => (typeof esc === 'function' ? esc(s) : String(s).replace(/[<>&"]/g, ''));
  zona.innerHTML = `
    <p style="color:var(--text-secondary);font-size:0.88rem;line-height:1.55;margin-bottom:12px;">
      📬 Te mandé un correo a <b style="color:var(--text-primary);">${E(email)}</b>.<br>
      Toca el enlace y vuelves aquí con la sesión abierta.</p>
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <input type="text" id="sb-otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6"
        placeholder="——————"
        style="flex:1;min-width:0;padding:12px 14px;background:var(--bg-surface);border:1px solid oklch(32% 0.012 265);border-radius:12px;color:var(--text-primary);font-family:'Space Mono',monospace;font-size:1.05rem;letter-spacing:0.35em;text-align:center;">
      <button id="sb-otp-btn" class="btn-accent" style="min-height:48px;padding:0 18px;">ENTRAR</button>
    </div>
    <p class="rd-eyebrow rd-eyebrow--muted" style="text-transform:none;letter-spacing:normal;margin-bottom:12px;">
      ¿El correo trae un código de 6 dígitos? Pégalo arriba — sin salir de la app.</p>
    <button id="sb-email-again" class="btn-ghost" style="width:100%;min-height:40px;font-size:0.8rem;">enviar de nuevo</button>`;
  const ok = document.getElementById('sb-otp-btn');
  if (ok) ok.addEventListener('click', sbVerifyCode);
  const otp = document.getElementById('sb-otp');
  if (otp) otp.addEventListener('keydown', (e) => { if (e.key === 'Enter') sbVerifyCode(); });
  const again = document.getElementById('sb-email-again');
  if (again) again.addEventListener('click', () => { sbPintarZonaLogin(); });
}

async function sbVerifyCode() {
  if (!sbClient) return;
  const code = String(((document.getElementById('sb-otp') || {}).value) || '').trim();
  let email = '';
  try { email = String(localStorage.getItem('rodeo_sb_email') || '').trim(); } catch (_e) {}
  if (!/^\d{6}$/.test(code)) {
    if (typeof toast === 'function') toast('El código son los 6 dígitos del correo');
    return;
  }
  const btn = document.getElementById('sb-otp-btn');
  if (btn) btn.disabled = true;
  try {
    const { error } = await sbClient.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) throw error;
    // SIGNED_IN dispara sbPull + toast vía onAuthStateChange. Cerramos la
    // hoja: al reabrir el perfil ya pinta el estado conectado.
    if (typeof closeSheet === 'function') closeSheet();
  } catch (e) {
    if (btn) btn.disabled = false;
    if (typeof toast === 'function') toast('Código no válido o vencido — pide otro', 4000);
  }
}

// Re-render de la zona de login (estado inicial sin sesión).
function sbPintarZonaLogin() {
  const zona = document.getElementById('sb-zona');
  if (zona) { zona.outerHTML = sbZonaLoginHTML(); sbWireCuenta(); }
}

async function sbLogout() {
  if (!sbClient) return;
  try {
    await sbFlush();                    // no perder cambios de último segundo
    await sbClient.auth.signOut();
    sbUsuario = null;
    if (typeof toast === 'function') toast('Saliste — tu progreso sigue guardado en este aparato');
    if (typeof closeSheet === 'function') closeSheet();
  } catch (_e) { /* la sesión local igual quedó cerrada o expirará */ }
}

/* ── Merge local ↔ nube ──────────────────────────────────────────────────
   Clave de contenido del DNA: misma que usa saveDNA para dedup, más b2
   (recordUpgrade distingue upgrades por fix+b2). "dominado" es pegajoso
   (true gana), ts se queda con el más viejo (primera vez que apareció). */
function sbDnaKey(d) {
  return [d.type || '', d.fix || d.term || '', d.b2 || ''].join('|');
}
function sbMergeDna(local, remoto) {
  const mapa = new Map();
  // remoto primero, local después → en campos en conflicto gana lo local
  for (const it of [...remoto, ...local]) {
    if (!it || typeof it !== 'object' || !it.type) continue;
    const k = sbDnaKey(it);
    const prev = mapa.get(k);
    if (!prev) { mapa.set(k, { ...it }); continue; }
    const fusion = { ...prev, ...it };
    fusion.dominado = !!(prev.dominado || it.dominado);
    fusion.ts = Math.min(prev.ts || Date.now(), it.ts || Date.now());
    mapa.set(k, fusion);
  }
  // Mismo orden que la app: más nuevo primero, mismo cap que saveDNA.
  return [...mapa.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 300);
}

function sbProgresoLocal() {
  return {
    cost: state.cost || 0,
    sessions: state.sessions || 0,
    stories: state.stories || 0,
    ladderXP: state.ladderXP || { pct: 0, clavados: 0, bestCombo: 0 },
    streak: state.streak || { days: 0, last: '' },
    seenSlang: Array.isArray(state.seenSlang) ? state.seenSlang : [],
    seenLadder: Array.isArray(state.seenLadder) ? state.seenLadder : [],
    // Nombre y nivel viajan dentro del blob progress: cero migración de tabla.
    nombre: (typeof nombreUsuario === 'function' ? nombreUsuario() : ''),
    nivel: (state && state.nivel) || null,
  };
}

function sbMergeProgreso(p) {
  if (!p || typeof p !== 'object') return;
  const num = (x) => (typeof x === 'number' && isFinite(x) ? x : 0);
  state.cost = Math.max(num(state.cost), num(p.cost));
  state.sessions = Math.max(num(state.sessions), num(p.sessions));
  state.stories = Math.max(num(state.stories), num(p.stories));

  const rl = p.ladderXP || {};
  state.ladderXP = {
    pct: Math.max(num(state.ladderXP && state.ladderXP.pct), num(rl.pct)),
    clavados: Math.max(num(state.ladderXP && state.ladderXP.clavados), num(rl.clavados)),
    bestCombo: Math.max(num(state.ladderXP && state.ladderXP.bestCombo), num(rl.bestCombo)),
  };

  // Racha: gana la del día MÁS reciente ('last' es 'YYYY-MM-DD', compara
  // como string); mismo día → más días acumulados.
  const rs = p.streak || {};
  const ls = state.streak || { days: 0, last: '' };
  if ((rs.last || '') > (ls.last || '') ||
      ((rs.last || '') === (ls.last || '') && num(rs.days) > num(ls.days))) {
    state.streak = { days: num(rs.days), last: rs.last || '' };
  }

  const union = (a, b) => [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])];
  state.seenSlang = union(state.seenSlang, p.seenSlang);
  state.seenLadder = union(state.seenLadder, p.seenLadder);

  // Nombre: la nube solo llena un aparato VACÍO (nunca pisa lo escrito aquí).
  const nomLocal = String(store.get('rodeo_nombre', '') || '').trim();
  if (!nomLocal && typeof p.nombre === 'string' && p.nombre.trim()) {
    store.set('rodeo_nombre', p.nombre.trim().slice(0, 24));
  }
  // Nivel: igual — solo llena el aparato que todavía no eligió. Sin esto,
  // entrar con la cuenta en un teléfono nuevo te volvía a preguntar el nivel.
  if (store.get('rodeo_nivel', null) === null && (p.nivel === 'a1' || p.nivel === 'avanzado')) {
    state.nivel = p.nivel;
    store.set('rodeo_nivel', p.nivel);
    if (typeof aplicarNivel === 'function') aplicarNivel();
  }

  store.set('rodeo_cost', state.cost);
  store.set('rodeo_sessions', state.sessions);
  store.set('rodeo_stories', state.stories);
  store.set('rodeo_ladder_xp', state.ladderXP);
  store.set('rodeo_streak', state.streak);
  store.set('rodeo_seen_slang', state.seenSlang);
  store.set('rodeo_seen_ladder', state.seenLadder);
}

/* ── Pull (merge + re-push para converger) ─────────────────────────────── */
async function sbPull() {
  if (!sbListo()) return;
  try {
    const { data, error } = await sbClient
      .from('rodeo_state').select('dna,intereses,progress').maybeSingle();
    if (error) throw error;

    if (data) {
      state.dna = sbMergeDna(Array.isArray(state.dna) ? state.dna : [],
                             Array.isArray(data.dna) ? data.dna : []);
      store.set('rodeo_dna', state.dna);

      // Intereses: la nube solo llena un aparato VACÍO (nunca resucita
      // chips que Gus apagó a propósito en este aparato).
      if (!interesesArr().length && Array.isArray(data.intereses) && data.intereses.length) {
        guardarIntereses(data.intereses.filter((x) => typeof x === 'string'));
      }
      sbMergeProgreso(data.progress);

      // Repinta lo que muestra datos sincronizados.
      if (typeof renderDNA === 'function') renderDNA();
      if (typeof updateCostTicker === 'function') updateCostTicker();
    }
    sbUltimoSync = Date.now();
    sbPush(true);   // converger la nube con el resultado del merge, ya
  } catch (_e) {
    // Sin red o tabla aún no creada: la app sigue local, sin drama.
  }
}

/* ── Push (debounced) ──────────────────────────────────────────────────── */
function sbOnLocalChange(key) {
  if (!SB_SYNC_KEYS.has(key) || !sbListo()) return;
  clearTimeout(sbPushTimer);
  sbPushTimer = setTimeout(() => sbPush(true), 2500);
}

async function sbPush(inmediato) {
  if (!sbListo()) return;
  if (!inmediato) return sbOnLocalChange('rodeo_dna');
  if (sbPushEnVuelo) { sbPushPendiente = true; return; }  // serializa
  sbPushEnVuelo = true;
  try {
    const { error } = await sbClient.from('rodeo_state').upsert({
      user_id: sbUsuario.id,
      dna: Array.isArray(state.dna) ? state.dna : [],
      intereses: interesesArr(),
      progress: sbProgresoLocal(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    sbUltimoSync = Date.now();
  } catch (_e) {
    // Falló (offline, etc.): el próximo cambio o pull lo reintenta.
  } finally {
    sbPushEnVuelo = false;
    if (sbPushPendiente) { sbPushPendiente = false; sbPush(true); }
  }
}

// Flush síncrono-ish para logout / cierre: cancela el debounce y pushea ya.
async function sbFlush() {
  clearTimeout(sbPushTimer);
  if (sbListo()) await sbPush(true);
}

/* ── UI: bloque "Cuenta & sync" del perfil ─────────────────────────────── */
// Zona de login (sin sesión): correo primero — funciona sin Google Cloud.
function sbZonaLoginHTML() {
  let prefill = '';
  try { prefill = String(localStorage.getItem('rodeo_sb_email') || ''); } catch (_e) {}
  const E = (s) => (typeof esc === 'function' ? esc(s) : String(s).replace(/[<>&"]/g, ''));
  // El botón "o con Google" SOLO si el server confirma que el provider está
  // habilitado (sbExternal.google===true). Mientras sbExternal sea null (no llegó
  // el fetch, offline o 403) o google=false → no se pinta, y así nadie aterriza en
  // el JSON crudo "provider is not enabled". El correo es el camino principal y no
  // depende de esto. Se re-evalúa en cada render: la próxima apertura del perfil
  // recoge el estado más nuevo (por eso no hace falta re-render en vivo). El botón
  // aparecerá solo cuando Gus haga el Paso 4 (Google OAuth) del SUPABASE-runbook.
  const googleBtn = (sbExternal && sbExternal.google === true) ? `
      <button id="sb-login" class="btn-ghost" style="width:100%;min-height:44px;display:flex;align-items:center;justify-content:center;gap:10px;">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.5 2.5-2.6 3.9-5.35 3.9a6 6 0 1 1 0-12c1.5 0 2.9.55 3.95 1.45l2.2-2.2A9 9 0 1 0 12 21c5.2 0 8.65-3.65 8.65-8.8 0-.37-.03-.74-.1-1.1z"/></svg>
        o con Google
      </button>` : '';
  return `
    <div id="sb-zona">
      <p style="color:var(--text-secondary);font-size:0.88rem;line-height:1.5;margin-bottom:14px;">
        Tu DNA vive solo en este aparato. Entra y tu progreso te sigue —
        mismo DNA en el cel y en el PC.</p>
      <input type="email" id="sb-email" placeholder="tu@gmail.com" autocomplete="email" value="${E(prefill)}"
        style="width:100%;padding:13px 14px;background:var(--bg-surface);border:1px solid oklch(32% 0.012 265);border-radius:12px;color:var(--text-primary);font-size:0.95rem;margin-bottom:8px;">
      <button id="sb-email-btn" class="btn-accent" style="width:100%;min-height:50px;">MÁNDAME EL ENLACE</button>
      <p class="rd-eyebrow rd-eyebrow--muted" style="text-transform:none;letter-spacing:normal;margin:8px 0 14px;">
        Te llega un correo: tocas el enlace (o pegas el código) y listo — sin claves.</p>${googleBtn}
    </div>`;
}

function sbCuentaHTML() {
  const E = (s) => (typeof esc === 'function' ? esc(s) : String(s));
  let cuerpo;
  if (!sbConfigured()) {
    cuerpo = `<p class="rd-eyebrow rd-eyebrow--muted" style="text-transform:none;letter-spacing:normal;">
      Sync entre dispositivos: casi listo — falta pegar la key del proyecto de Supabase
      en <span style="font-family:'Space Mono',monospace;">js/supabase-sync.js</span>
      (pasos en SUPABASE-runbook.md).</p>`;
  } else if (!window.supabase || !sbClient) {
    cuerpo = `<p class="rd-eyebrow rd-eyebrow--muted" style="text-transform:none;letter-spacing:normal;">
      Sync no disponible ahora (sin conexión con Supabase). Tu progreso sigue guardado aquí.</p>`;
  } else if (!sbUsuario) {
    cuerpo = sbZonaLoginHTML();
  } else {
    const hace = sbUltimoSync
      ? (Math.round((Date.now() - sbUltimoSync) / 60000) < 1 ? 'hace un momento'
         : 'hace ' + Math.round((Date.now() - sbUltimoSync) / 60000) + ' min')
      : 'pendiente…';
    cuerpo = `
      <p style="color:var(--text-secondary);font-size:0.88rem;line-height:1.5;margin-bottom:4px;">
        <span style="color:var(--accent);">●</span> ${E(sbUsuario.email || 'conectado')}</p>
      <p class="rd-eyebrow rd-eyebrow--muted" style="margin-bottom:14px;">sync: ${E(hace)}</p>
      <button id="sb-logout" class="btn-ghost" style="width:100%;min-height:44px;">Salir de la cuenta</button>`;
  }
  return `
    <div style="margin-top:28px;">
      <p class="rd-eyebrow rd-eyebrow--accent"><span class="rd-eyebrow-rule"></span>Cuenta &amp; sync</p>
      <div style="margin-top:12px;">${cuerpo}</div>
    </div>`;
}

function sbWireCuenta() {
  const login = document.getElementById('sb-login');
  if (login) login.addEventListener('click', () => { login.disabled = true; sbLogin(); });
  const logout = document.getElementById('sb-logout');
  if (logout) logout.addEventListener('click', () => { logout.disabled = true; sbLogout(); });
  const mail = document.getElementById('sb-email-btn');
  if (mail) mail.addEventListener('click', sbLoginEmail);
  const inp = document.getElementById('sb-email');
  if (inp) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') sbLoginEmail(); });
}

/* ── API pública (index.html llama estas) ──────────────────────────────── */
window.sbInit = sbInit;
window.sbOnLocalChange = sbOnLocalChange;
window.sbCuentaHTML = sbCuentaHTML;
window.sbWireCuenta = sbWireCuenta;
