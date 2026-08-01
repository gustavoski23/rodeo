/* ═══════════════════════════════════════════════════════════════════════
   RODEO — Premium (gates + paywall + activación de licencia)
   ----------------------------------------------------------------------
   Mejora progresiva PURA, igual que js/supabase-sync.js: mientras el
   KILL-SWITCH esté apagado, este archivo es INVISIBLE — la app queda
   EXACTO como hoy. Se carga ANTES del script principal de index.html, así
   que aquí NO se toca la app en tiempo de carga: todo vive dentro de
   funciones que corren después (los gates se llaman desde startSession,
   startRoleplay, openStory…; premiumInit desde el INIT de la app).

   Guarda su propio estado en localStorage (no depende de `store`/`state`
   del index para funcionar), y solo usa funciones del index de forma
   OPCIONAL y con guardas (`toast`, `openSheet`, `closeSheet`, `esc`).
   ═══════════════════════════════════════════════════════════════════════ */
'use strict';

/* ╔═══════════════════════════════════════════════════════════════════════╗
   ║                        ⚑  KILL-SWITCH  ⚑                               ║
   ║                                                                       ║
   ║   const PREMIUM_ENFORCE = false;                                      ║
   ║                                                                       ║
   ║   EN false (como está AHORA): TODOS los gates dejan pasar. No hay     ║
   ║   límites, no aparece el paywall, no cambia NADA en la app. Es como   ║
   ║   si Premium no existiera. Déjalo así hasta tener el producto listo.  ║
   ║                                                                       ║
   ║   Ponlo en true SOLO cuando: (1) creaste el producto en Lemon         ║
   ║   Squeezy, (2) pegaste LEMON_CHECKOUT_URL aquí abajo, y (3) quieres    ║
   ║   empezar a cobrar. A partir de ahí, los flujos con límite (charlas,   ║
   ║   roleplay, thriller) piden Premium al pasarse. Pasos completos en     ║
   ║   PREMIUM-runbook.md.                                                  ║
   ╚═══════════════════════════════════════════════════════════════════════╝ */
const PREMIUM_ENFORCE = false;

/* ── Config de cobro (pégalo cuando lo tengas — ver PREMIUM-runbook.md) ───────
   Mientras estén vacías, el paywall muestra "pronto" en cada botón y sigue
   funcionando el campo de activar clave. */
const LEMON_CHECKOUT_URL = ''; // link de checkout de Lemon Squeezy (tu producto de USD 6/mes)
const SOLANA_ADDRESS = '';     // tu dirección de wallet Solana para cobrar USDC directo
const PRECIO_USD = 6;          // precio mensual, solo para mostrar

/* ── Gates configurables — TODO en un solo lugar ─────────────────────────────
   { limite, periodo } = cuántos usos GRATIS por periodo antes de pedir Premium.
   null = ese flujo es SIEMPRE gratis (nunca se topa, nunca abre paywall).
   Hoy solo se usa periodo 'dia' (rollover por fecha local de Gus). */
const GATES = {
  talk: { limite: 5, periodo: 'dia' }, // charlas de TALK (escenarios + dibujo libre)
  roleplay: { limite: 2, periodo: 'dia' }, // escenas de ROLEPLAY (menos el episodio ilustrado canónico)
  story: { limite: 1, periodo: 'dia' }, // episodios nuevos del thriller
  drop: null,  // lectura diaria — gratis (gancho)
  slang: null, // slang — gratis
  sube: null,  // SUBE / LEVEL UP — gratis
  dna: null,   // DNA y repaso — gratis
  sync: null,  // cuenta y sync — gratis
};

// Nombres humanos por flujo, para el copy del paywall.
const GATE_NOMBRES = { talk: 'charlas', roleplay: 'roleplay', story: 'el thriller' };

/* ── Claves de localStorage propias de Premium ───────────────────────────────
   Independientes de las de la app: Premium no necesita `store`/`state`. */
const PREMIUM_KEY = 'rodeo_premium';      // { activo, licencia, instanceId, via, activadoEn, validadoEn }
const USO_KEY = 'rodeo_premium_uso';      // { fecha:'YYYY-MM-DD', talk, roleplay, story }

const DIA_MS = 86400000;
const REVALIDA_DIAS = 7; // cada cuántos días se revalida en background contra Lemon

/* ── Almacenamiento propio (localStorage con try/catch, como store del index) ── */
function leer(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function guardar(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (_e) { /* lleno/bloqueado: ni modo */ }
}

// Escapado defensivo (usa el esc() del index si existe, si no un fallback).
function E(s) {
  if (typeof esc === 'function') return esc(s);
  return String(s == null ? '' : s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}
// Toast opcional (el index lo define; en tiempo de carga puede no existir aún).
function decir(msg, ms) { if (typeof toast === 'function') toast(msg, ms); }

/* ── Estado Premium ──────────────────────────────────────────────────────── */
function estadoPremium() {
  const p = leer(PREMIUM_KEY, null);
  return (p && typeof p === 'object') ? p : null;
}
function guardarPremium(p) { guardar(PREMIUM_KEY, p); }

// Helper público: ¿este aparato tiene Premium activo?
function esPremium() {
  const p = estadoPremium();
  return !!(p && p.activo === true);
}

function activarPremium(datos) {
  const ahora = Date.now();
  guardarPremium({
    activo: true,
    licencia: datos.licencia || '',
    instanceId: datos.instanceId || null,
    via: datos.via || 'lemon',
    activadoEn: ahora,
    validadoEn: ahora,
  });
}
function desactivarPremium() {
  const p = estadoPremium() || {};
  guardarPremium({ ...p, activo: false });
}

/* ── Contadores diarios (rollover por fecha local) ───────────────────────────
   La fecha es LOCAL (la de Gus en Medellín), no UTC: su "día" empieza a
   medianoche donde está, no en Londres. */
function hoyStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function usoHoy() {
  const u = leer(USO_KEY, null);
  // Otro día (o vacío/corrupto) ⇒ contadores a cero.
  if (!u || typeof u !== 'object' || u.fecha !== hoyStr()) return { fecha: hoyStr() };
  return u;
}

/* ── EL GATE (lo llaman los flujos de index.html) ────────────────────────────
   Devuelve true (déjalo pasar, ya incrementé el contador) o false (se topó:
   abrí el paywall). Con el kill-switch apagado o Premium activo: siempre true. */
function premiumGate(flujo) {
  // Kill-switch apagado o ya es Premium ⇒ barra libre.
  if (!PREMIUM_ENFORCE || esPremium()) return true;

  const gate = GATES[flujo];
  if (!gate) return true; // flujo siempre gratis

  const uso = usoHoy();
  const usados = Number(uso[flujo]) || 0;
  if (usados < gate.limite) {
    // Aún le quedan usos gratis hoy: cuenta este y déjalo pasar.
    uso[flujo] = usados + 1;
    guardar(USO_KEY, uso);
    return true;
  }
  // Se acabó la cuota del día: a vender.
  abrirPaywall(flujo);
  return false;
}

/* ═══════════════════ PAYWALL (design system de RODEO) ═══════════════════════
   Usa openSheet() del index (misma hoja que el perfil/debrief) y las clases ya
   existentes: font-display (Archivo), rd-eyebrow (Space Mono), btn-accent /
   btn-ghost, y las CSS vars --accent, --bg-surface, etc. */
function abrirPaywall(flujo) {
  if (typeof openSheet !== 'function') {
    // Sin la hoja del index no hay dónde pintar: al menos avisa.
    decir(`Premium — USD ${PRECIO_USD}/mes. Configúralo en js/premium.js`, 4000);
    return;
  }

  // Línea contextual: si se topó con un límite concreto, nómbralo.
  const nombre = GATE_NOMBRES[flujo];
  const sub = nombre
    ? `Le diste al tope de ${E(nombre)} por hoy. Con Premium no hay contador — dale sin que la app te frene.`
    : `El plan gratis te da pa’ calentar. Premium te suelta RODEO completo: sin topes, sin cortes, sin ansias.`;

  // Botón LEMON (tarjeta): activo si hay URL; si no, "pronto".
  const lemonBtn = LEMON_CHECKOUT_URL
    ? `<button id="pw-lemon" class="btn-accent" style="width:100%;min-height:54px;">Pagar con tarjeta &rarr;</button>
       <p class="rd-eyebrow rd-eyebrow--muted" style="text-transform:none;letter-spacing:normal;margin:8px 0 0;line-height:1.5;">
         Al pagar te sale tu clave (y te llega al correo). Vuelve y pégala aquí abajo.</p>`
    : `<button class="btn-accent" disabled style="width:100%;min-height:54px;">Tarjeta &middot; pronto</button>`;

  // Botón USDC: activo si hay dirección; si no, "pronto". Al tocar revela la zona.
  const usdcBtn = SOLANA_ADDRESS
    ? `<button id="pw-usdc" class="btn-ghost" style="width:100%;min-height:50px;">Pagar con USDC &middot; fee 0</button>`
    : `<button class="btn-ghost" disabled style="width:100%;min-height:50px;opacity:.5;">USDC &middot; pronto</button>`;

  const perk = (t) => `
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:9px;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><path d="M20 6 9 17l-5-5"/></svg>
      <span style="color:var(--text-primary);font-size:0.92rem;line-height:1.4;">${t}</span>
    </div>`;

  openSheet(`
    <p class="rd-eyebrow rd-eyebrow--accent"><span class="rd-eyebrow-rule"></span>RODEO Premium</p>
    <p class="font-display" style="font-size:clamp(2.4rem,11vw,3.2rem);line-height:0.9;margin:10px 0 12px;">
      SUELTA<br>EL FRENO<span style="color:var(--accent);">.</span></p>
    <p style="color:var(--text-secondary);font-size:0.95rem;line-height:1.55;margin-bottom:20px;">${sub}</p>

    <div style="background:var(--bg-surface);border-radius:16px;padding:16px 16px 6px;margin-bottom:18px;">
      ${perk('Charlas <b>ilimitadas</b> en TALK')}
      ${perk('Roleplay sin tope')}
      ${perk('El thriller entero, episodio tras episodio')}
      ${perk('Y todo lo nuevo que caiga, incluido')}
    </div>

    <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:18px;">
      <span class="font-display" style="font-size:2.6rem;line-height:1;color:var(--accent);">USD ${PRECIO_USD}</span>
      <span style="color:var(--text-secondary);font-size:0.95rem;">/ mes &middot; cancela cuando quieras</span>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px;">
      ${lemonBtn}
      ${usdcBtn}
    </div>

    <div id="pw-usdc-zona" class="hidden" style="margin-top:14px;background:var(--bg-surface);border:1px solid var(--accent-dim);border-radius:14px;padding:14px;">
      <p class="rd-eyebrow rd-eyebrow--accent" style="margin-bottom:10px;">Pago directo en Solana</p>
      <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.55;margin-bottom:10px;">
        Manda <b style="color:var(--text-primary);">${PRECIO_USD} USDC</b> por la red <b style="color:var(--text-primary);">Solana</b>
        a esta dirección. Escríbeme con el comprobante y te paso tu clave al toque — la pegas abajo.
        Cero comisión, directo a mi wallet.</p>
      <div style="display:flex;gap:8px;align-items:stretch;">
        <code id="pw-sol-addr" style="flex:1;min-width:0;overflow-wrap:anywhere;background:var(--bg-void);border-radius:10px;padding:10px 12px;font-family:'Space Mono',monospace;font-size:0.78rem;color:var(--text-primary);">${E(SOLANA_ADDRESS)}</code>
        <button id="pw-copy" class="btn-ghost" style="min-height:auto;padding:0 14px;flex-shrink:0;">copiar</button>
      </div>
    </div>

    <div style="margin-top:22px;">
      <p class="rd-eyebrow rd-eyebrow--muted" style="margin-bottom:10px;">¿Ya tienes tu clave? Actívala</p>
      <div style="display:flex;gap:8px;">
        <input type="text" id="pw-lic" placeholder="pega tu clave aquí" autocomplete="off" spellcheck="false"
          style="flex:1;min-width:0;padding:12px 14px;background:var(--bg-surface);border:1px solid oklch(32% 0.012 265);border-radius:12px;color:var(--text-primary);font-family:'Space Mono',monospace;font-size:0.82rem;">
        <button id="pw-lic-btn" class="btn-accent" style="min-height:48px;padding:0 20px;flex-shrink:0;">Activar</button>
      </div>
    </div>

    <button id="pw-cerrar" class="btn-ghost" style="width:100%;min-height:44px;margin-top:18px;">seguir gratis por ahora</button>
  `);

  wirePaywall();
}

// Conecta los botones de la hoja (se llama justo tras openSheet).
function wirePaywall() {
  const cont = document.getElementById('sheet-content');
  if (!cont) return;
  const $q = (id) => cont.querySelector('#' + id);

  const lemon = $q('pw-lemon');
  if (lemon) lemon.addEventListener('click', () => {
    if (LEMON_CHECKOUT_URL) window.open(LEMON_CHECKOUT_URL, '_blank', 'noopener');
  });

  const usdc = $q('pw-usdc');
  const zona = $q('pw-usdc-zona');
  if (usdc && zona) usdc.addEventListener('click', () => {
    zona.classList.toggle('hidden');
    if (!zona.classList.contains('hidden')) zona.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  const copy = $q('pw-copy');
  if (copy) copy.addEventListener('click', () => {
    const ok = () => { copy.textContent = 'copiado'; setTimeout(() => { copy.textContent = 'copiar'; }, 1500); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(SOLANA_ADDRESS).then(ok, () => decir('Copia la dirección a mano', 2500));
      else { const a = document.getElementById('pw-sol-addr'); if (a) { const r = document.createRange(); r.selectNode(a); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } ok(); }
    } catch (_e) { decir('Copia la dirección a mano', 2500); }
  });

  const licBtn = $q('pw-lic-btn');
  const licInp = $q('pw-lic');
  if (licBtn && licInp) {
    const go = () => activarDesdeInput(licInp, licBtn);
    licBtn.addEventListener('click', go);
    licInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  }

  const cerrar = $q('pw-cerrar');
  if (cerrar) cerrar.addEventListener('click', () => { if (typeof closeSheet === 'function') closeSheet(); });
}

/* ── Activar una clave que el usuario pegó ───────────────────────────────── */
async function activarDesdeInput(inp, btn) {
  const clave = String((inp && inp.value) || '').trim();
  if (!clave) { decir('Pega tu clave primero'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Activando…'; }
  try {
    const r = await fetch('/api/premium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: clave, action: 'activate' }),
    });
    const data = await r.json().catch(() => ({}));
    if (data && data.ok) {
      activarPremium({ licencia: clave, instanceId: data.instance_id, via: 'lemon' });
      if (typeof closeSheet === 'function') closeSheet();
      decir('¡Bienvenido a Premium! ✦ Sin límites desde ya.', 3500);
    } else {
      if (btn) { btn.disabled = false; btn.textContent = 'Activar'; }
      decir((data && data.error) || 'No pude activar esa clave. Intenta de nuevo.', 4500);
    }
  } catch (_e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Activar'; }
    decir('No pude conectar. Revisa tu internet e intenta de nuevo.', 4000);
  }
}

/* ── Revalidación de fondo (al arrancar la app) ──────────────────────────────
   Si hay licencia y pasaron >7 días desde la última validación, le pregunta a
   Lemon si la suscripción sigue viva. Si murió → desactiva con un toast amable.
   Sin red / error transitorio → beneficio de la duda: sigue Premium. */
function premiumInit() {
  const p = estadoPremium();
  if (!p || !p.activo || !p.licencia) return;
  const desde = Number(p.validadoEn) || 0;
  if (Date.now() - desde < REVALIDA_DIAS * DIA_MS) return; // aún fresca

  revalidar(p); // en background, sin await — nunca bloquea el arranque
}

async function revalidar(p) {
  try {
    const r = await fetch('/api/premium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: p.licencia, action: 'validate', instance_id: p.instanceId || '' }),
    });
    const data = await r.json().catch(() => ({}));
    if (data && data.ok) {
      // Sigue viva: sella la fecha de validación.
      guardarPremium({ ...p, validadoEn: Date.now() });
    } else if (data && data.dead === true) {
      // Lemon confirmó que ya NO vale (vencida/deshabilitada/borrada): desactiva.
      desactivarPremium();
      decir(data.error || 'Tu Premium venció — renuévalo cuando quieras.', 5000);
    }
    // Cualquier otro caso (error de red, 429, 5xx, sin flag dead): no tocamos
    // nada. Beneficio de la duda: Gus sigue Premium hasta que Lemon confirme.
  } catch (_e) { /* offline: sigue Premium, se reintenta el próximo arranque */ }
}

/* ── HTML del estado Premium para el perfil (minimiza el diff en index.html) ──
   activo → "PREMIUM ✦ activo"; inactivo con enforce ON → botón al paywall;
   enforce OFF → nada (Premium invisible mientras el kill-switch esté apagado). */
function premiumPerfilHTML() {
  if (esPremium()) {
    const p = estadoPremium() || {};
    const viaTxt = p.via === 'usdc' ? 'USDC' : (p.via === 'manual' ? 'manual' : 'tarjeta');
    return `
      <div style="margin-top:24px;">
        <div style="display:flex;align-items:center;gap:10px;background:var(--accent-dim);border:1px solid var(--accent-dim);border-radius:14px;padding:14px 16px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M12 2 15 9l7 .5-5.5 4.5L18.5 21 12 17l-6.5 4 2-7L2 9.5 9 9z"/></svg>
          <div>
            <div class="font-display" style="font-size:1.3rem;line-height:1;color:var(--accent);">PREMIUM ✦ activo</div>
            <div class="rd-eyebrow rd-eyebrow--muted" style="margin:5px 0 0;">vía ${E(viaTxt)} · sin límites</div>
          </div>
        </div>
      </div>`;
  }
  // Sin Premium: solo mostramos algo si el cobro está encendido.
  if (!PREMIUM_ENFORCE) return '';
  return `
    <div style="margin-top:24px;">
      <p class="rd-eyebrow rd-eyebrow--accent"><span class="rd-eyebrow-rule"></span>RODEO Premium</p>
      <p style="color:var(--text-secondary);font-size:0.88rem;line-height:1.5;margin:8px 0 12px;">
        Sin topes en charlas, roleplay y el thriller. USD ${PRECIO_USD}/mes.</p>
      <button onclick="abrirPaywall('perfil')" class="btn-accent" style="width:100%;min-height:50px;">Hazte Premium ✦</button>
    </div>`;
}

/* ── API pública (index.html / paywall llaman estas) ─────────────────────── */
window.esPremium = esPremium;
window.premiumGate = premiumGate;
window.abrirPaywall = abrirPaywall;
window.premiumPerfilHTML = premiumPerfilHTML;
window.premiumInit = premiumInit;
