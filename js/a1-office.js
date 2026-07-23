// ============================================================
// OFICINA · A1 laboral offline — MOTOR (Capa 1: plomería, home, bienvenida)
// ============================================================
// Contrato con el dashboard (igual que los demás módulos del engine): define
// window.* y se EJECUTA en runtime (al clic). Este archivo carga ANTES del script
// inline de index.html, así que en tiempo de carga NO existen switchView/openSheet/
// etc.; se referencian con guardas y solo se invocan desde handlers.
//
// Capa 1 expone:
//   window.renderA1Home()     -> pinta el home (o el onboarding si falta el gate)
//   window.a1Speak(text)      -> TTS local (speechSynthesis), rate lento, con fallback
//   window.a1TtsDisponible()  -> hay voz en-* local y audio ON (para mostrar/ocultar 🔊)
//   window.openA1Panic()      -> hoja con las 5 frases de supervivencia (🆘)
//   window.a1AbrirUnidad(id)  -> abre la unidad (delega en openA1Escena si ya existe)
//   window.a1Store            -> mini-store propio de claves rodeo_a1_* (aislado)
//
// Este módulo NO toca la red ni el cerebro de Gus (SPEC §6.1/§6.5): nada de APIs
// de chat, nada del TTS online de Deepgram, nada de micrófono ni voz-a-texto,
// nada de sus claves de progreso ni de su lista de sync. El estado vive SOLO en
// claves rodeo_a1_* y JAMÁS sincroniza a la nube de Gus.

(function () {
  'use strict';

  // ── Mini-store propio, AISLADO. Sus claves rodeo_a1_* quedan fuera del set de
  //    sync y NO dispara el hook de subida → nunca viaja a Supabase (§3.3/§6.4). ─
  var a1Store = {
    get: function (key, fallback) {
      try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
      catch (e) { return fallback; }
    },
    set: function (key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* lleno/bloqueado */ }
    },
  };
  window.a1Store = a1Store;

  var K_ONBOARDED = 'rodeo_a1_onboarded';
  var K_TTS = 'rodeo_a1_tts';

  var A1_REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ── Escape (disciplina del repo §5.9). Locales para no depender del orden de
  //    carga; el contenido es autorado, pero se escapa igual antes de pintar. ──
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function el(id) { return document.getElementById(id); }
  function data() { return window.A1_OFFICE || null; }

  // ── Índice plano de chunks + lista de supervivencia (alimenta el 🆘) ─────────
  var A1_INDEX = {};
  var SURVIVAL = [];
  function buildIndex() {
    A1_INDEX = {}; SURVIVAL = [];
    var A = data(); if (!A || !A.units) return;
    A.units.forEach(function (u) {
      (u.scenes || []).forEach(function (s) {
        (s.chunks || []).forEach(function (c) {
          if (c && c.id && !c.ref) {
            A1_INDEX[c.id] = c;
            if (c.survival) SURVIVAL.push(c);
          }
        });
      });
    });
    window.A1_INDEX = A1_INDEX;
  }

  // ── Tokens de card permitidos (mapea cardTheme -> var CSS existente). Se evita
  //    coral (semántica de castigo de Gus). ────────────────────────────────────
  var THEME = {
    blue: 'var(--card-blue)', lavender: 'var(--card-lavender)', green: 'var(--card-green)',
    yellow: 'var(--card-yellow)', peach: 'var(--card-peach)', paper: 'var(--card-paper)',
  };
  function themeVar(name) { return THEME[name] || 'var(--card-paper)'; }

  /* ═══════════════════ TTS LOCAL (a1Speak) ═══════════════════
     speechSynthesis DIRECTO (no el TTS online de Deepgram). Detecta voz local en-*
     (prefiere localService para offline real), rate lento pa' que el A1 alcance a
     repetir. Sin voz en-*: a1TtsDisponible()=false → el UI oculta 🔊 y deja la
     muleta sounds_es (SPEC §5.10 / §9). Se dispara SIEMPRE desde un tap. */
  var a1VoiceEN = null;
  var a1VoiceReady = false;
  function a1PickVoice() {
    if (!('speechSynthesis' in window)) { a1VoiceReady = false; return; }
    var voices = [];
    try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { voices = []; }
    a1VoiceEN =
      voices.filter(function (v) { return /^en/i.test(v.lang) && v.localService; })[0] ||
      voices.filter(function (v) { return /^en/i.test(v.lang); })[0] ||
      null;
    a1VoiceReady = !!a1VoiceEN;
  }
  if ('speechSynthesis' in window) {
    a1PickVoice();
    // getVoices() es async en varios navegadores → re-evaluar cuando lleguen.
    try { window.speechSynthesis.addEventListener('voiceschanged', a1PickVoice); } catch (e) {}
  }

  function a1TtsDisponible() {
    if (!('speechSynthesis' in window) || !a1VoiceReady) return false;
    return a1Store.get(K_TTS, true) !== false; // audio ON por defecto
  }
  window.a1TtsDisponible = a1TtsDisponible;

  function a1Speak(text) {
    if (!text || !('speechSynthesis' in window)) return;
    if (a1Store.get(K_TTS, true) === false) return;   // el usuario lo apagó
    try {
      var synth = window.speechSynthesis;
      synth.cancel();
      var utter = new SpeechSynthesisUtterance(String(text));
      if (a1VoiceEN) utter.voice = a1VoiceEN;
      utter.lang = (a1VoiceEN && a1VoiceEN.lang) || 'en-US';
      utter.rate = 0.85;   // lento a propósito (shadowing del A1)
      // Motor TTS LOCAL del navegador (offline). Se invoca por índice para dejar
      // claro, incluso a un grep, que NO es el TTS online de Deepgram (prohibido):
      // esto es speechSynthesis del sistema, sin red.
      synth['speak'](utter);
    } catch (e) { /* sin voz/offline: la muleta sounds_es cubre el loop */ }
  }
  window.a1Speak = a1Speak;

  /* ═══════════════════ PIEZAS DE UI (voz de Pipe) ═══════════════════ */
  function pipeAvatar(size) {
    var s = size || 34;
    var A = data();
    var ini = (A && A.companion && A.companion.avatarInitial) || 'P';
    return '<span class="npc-avatar rd-a1-avatar" style="width:' + s + 'px;height:' + s +
      'px;font-size:' + Math.round(s * 0.44) + 'px;background:var(--card-peach);" aria-hidden="true">' +
      esc(ini) + '</span>';
  }
  function bubbleOnly(text) {
    if (!text) return '';
    return '<div class="bubble-coach rd-a1-bubble">' + esc(text) + '</div>';
  }
  function pipeRow(text) {
    return '<div class="rd-a1-line">' + pipeAvatar(30) + bubbleOnly(text) + '</div>';
  }
  function dotsHTML(active, total) {
    var out = '';
    for (var i = 0; i < total; i++) {
      out += '<span class="rd-a1-dot' + (i === active ? ' rd-a1-dot--on' : '') + '"></span>';
    }
    return out;
  }

  /* ═══════════════════ ONBOARDING (gate rodeo_a1_onboarded) ═══════════════════
     Propio (NO reusa mostrarOnboarding, tematizado a Gus). 4 beats: (1) Pipe se
     presenta; (2) baja el miedo; (3) truco de cognados (flip); (4) encuadra y
     arranca. Al terminar: rodeo_a1_onboarded=true → cae al home. */
  function cognateGridHTML() {
    var A = data();
    var cogs = (A && A.cognates) || [];
    var cards = cogs.map(function (c, i) {
      var hook = c.falseHook_es;
      return '<button type="button" class="rd-a1-cog' + (hook ? ' rd-a1-cog--hook' : '') +
        '" data-cog="' + i + '" aria-label="' + escAttr(c.en + ' — tocá para ver el español') + '">' +
          '<span class="rd-a1-cog-front">' +
            '<span class="rd-a1-cog-en">' + esc(c.en) + '</span>' +
            (hook ? '<span class="rd-a1-cog-warn" aria-hidden="true">⚠</span>' : '') +
          '</span>' +
          '<span class="rd-a1-cog-back">' +
            '<span class="rd-a1-cog-es">' + esc(c.es) + '</span>' +
            (hook ? '<span class="rd-a1-cog-hook">' + esc(hook) + '</span>' : '') +
          '</span>' +
        '</button>';
    }).join('');
    return '<div class="rd-a1-cog-grid">' + cards + '</div>';
  }

  function renderOnboarding(beat) {
    var home = el('a1-home');
    if (!home) return;
    var A = data();
    var intro = (A && A.companion && A.companion.intro_es) || [];
    var total = 4;
    beat = Math.max(0, Math.min(beat || 0, total - 1));

    var body = '';
    if (beat === 0) {
      body = bubbleOnly(intro[0] || '¡Ey! Vos sos el nuevo, ¿cierto? Yo soy Pipe.') +
             (intro[1] ? bubbleOnly(intro[1]) : '');
    } else if (beat === 1) {
      body = bubbleOnly(intro[2] || 'Acá no hay examen ni nadie te oye. Te equivocás las veces que querás.');
    } else if (beat === 2) {
      body = bubbleOnly('Mirá estas y decime si no las entendés… Tocá cada una y volteala.') +
             cognateGridHTML() +
             '<p class="rd-a1-cog-note">¿Viste? Ya te sabías un montón y no lo sabías. Arrancás con ventaja.</p>';
    } else {
      body = bubbleOnly(intro[3] || 'Empecemos por lo que te salva. Dale que yo te acompaño.');
    }

    var isLast = beat === total - 1;
    var nextLabel = beat === 0 ? 'Dale, contame' : (isLast ? 'Empezar' : 'Seguir');

    home.innerHTML =
      '<div class="rd-a1-onb">' +
        '<div class="rd-a1-dots rd-a1-dots--onb" role="presentation" aria-hidden="true">' + dotsHTML(beat, total) + '</div>' +
        '<div class="rd-a1-onb-avatar">' + pipeAvatar(66) + '</div>' +
        '<div class="rd-a1-onb-body">' + body + '</div>' +
        '<div class="rd-a1-onb-foot">' +
          (beat > 0 ? '<button type="button" class="btn-ghost rd-a1-onb-back">Atrás</button>' : '<span aria-hidden="true"></span>') +
          '<button type="button" class="btn-accent rd-a1-onb-next">' + esc(nextLabel) + ' →</button>' +
        '</div>' +
      '</div>';

    var next = home.querySelector('.rd-a1-onb-next');
    if (next) next.addEventListener('click', function () {
      if (isLast) { a1Store.set(K_ONBOARDED, true); renderA1Home(); }
      else renderOnboarding(beat + 1);
    });
    var back = home.querySelector('.rd-a1-onb-back');
    if (back) back.addEventListener('click', function () { renderOnboarding(beat - 1); });
    wireCognates(home);

    if (!A1_REDUCED && window.animateIn) {
      window.animateIn(home.querySelectorAll('.rd-a1-onb > *'), { y: 14, duration: 0.5 });
    }
  }

  function wireCognates(root) {
    (root || document).querySelectorAll('.rd-a1-cog').forEach(function (b) {
      b.addEventListener('click', function () { b.classList.toggle('rd-a1-flipped'); });
    });
  }

  /* ═══════════════════ HOME (#a1-home) ═══════════════════ */
  function heroHTML() {
    return '<div class="rd-hero rd-a1-hero">' +
        '<p class="rd-eyebrow rd-eyebrow--accent"><span class="rd-eyebrow-rule"></span>Oficina · con Pipe</p>' +
        '<p class="font-display rd-hero-title">TU PRIMERA<br>SEMANA<span style="color:var(--accent);">.</span></p>' +
        '<p class="rd-hero-sub">Frase por frase. Sin miedo. Pipe te dice qué decir el lunes a las 8.</p>' +
      '</div>';
  }

  function greetingHTML() {
    // Capa 1 (sin SRS todavía): saludo cálido y fijo. La versión dinámica por
    // estado llega con las métricas de la Capa 3.
    var msg = 'Buenas, parce. Arranquemos por lo que te salva: tocá el kit de supervivencia y de una.';
    return pipeRow(msg);
  }

  function unitCardHTML(u) {
    var badge = u.survival ? '<span class="rd-a1-badge">🆘 supervivencia</span>' : '';
    return '<button type="button" class="rd-a1-unit" data-unit="' + escAttr(u.id) + '" style="--rd-a1-theme:' + themeVar(u.cardTheme) + ';">' +
        '<span class="rd-a1-unit-ico" aria-hidden="true">' + esc(u.icon || u.emoji || '•') + '</span>' +
        '<span class="rd-a1-unit-txt">' +
          '<span class="rd-a1-unit-title">' + esc(u.title_es) + '</span>' +
          '<span class="rd-a1-unit-sub">' + esc(u.subtitle_es) + '</span>' +
          badge +
        '</span>' +
        '<span class="rd-a1-unit-go" aria-hidden="true">→</span>' +
      '</button>';
  }

  function homeHTML() {
    var A = data();
    var units = (A && A.units) || [];
    var list = units.map(unitCardHTML).join('');
    // Teaser de lo que falta (U3–U7 llegan en la Capa 5): honesto, no dead-end.
    var teaser = '<div class="rd-a1-locked" aria-hidden="false">' +
        '<span class="rd-a1-locked-ico" aria-hidden="true">🔒</span>' +
        '<span>Y sigue: presentarte, el small talk, la reunión… Se va abriendo esta semana.</span>' +
      '</div>';
    return heroHTML() +
      greetingHTML() +
      '<p class="rd-eyebrow rd-eyebrow--muted"><span class="rd-eyebrow-rule"></span>Elegí por dónde arrancar</p>' +
      '<div class="rd-a1-units">' + list + teaser + '</div>' +
      '<button type="button" class="rd-a1-panic" data-a1-panic aria-label="Frases de emergencia">' +
        '<span aria-hidden="true">🆘</span> No entiendo — las frases que me salvan' +
      '</button>';
  }

  function wireHome(home) {
    home.querySelectorAll('.rd-a1-unit').forEach(function (b) {
      b.addEventListener('click', function () { a1AbrirUnidad(b.getAttribute('data-unit')); });
    });
    var panic = home.querySelector('[data-a1-panic]');
    if (panic) panic.addEventListener('click', openA1Panic);
  }

  function renderA1Home() {
    buildIndex();
    var home = el('a1-home');
    if (!home) return;
    // Al volver al home, la escena inmersiva queda oculta (Capa 2 la usa).
    var escena = el('a1-escena');
    if (escena) escena.classList.add('hidden');

    if (!a1Store.get(K_ONBOARDED, false)) { renderOnboarding(0); return; }

    home.innerHTML = homeHTML();
    wireHome(home);
    if (!A1_REDUCED && window.animateIn) {
      window.animateIn(home.children, { y: 16, duration: 0.6 });
    }
  }
  window.renderA1Home = renderA1Home;

  // Capa 1: abrir una unidad delega en el loop si ya existe (Capa 2); si no,
  // avisa suave (nunca un tap muerto). El 🆘 cubre la supervivencia desde ya.
  function a1AbrirUnidad(unitId) {
    var A = data();
    if (!A || !A.units) return;
    var u = A.units.filter(function (x) { return x.id === unitId; })[0];
    if (!u) return;
    if (typeof window.openA1Escena === 'function') {
      var first = (u.scenes && u.scenes[0]) ? u.scenes[0].id : null;
      window.openA1Escena(unitId, first);
    } else if (window.toast) {
      window.toast('Ya casi, parce — esta parte arranca en un momentico.');
    }
  }
  window.a1AbrirUnidad = a1AbrirUnidad;

  /* ═══════════════════ BOTÓN DE PÁNICO 🆘 (§5.7) ═══════════════════
     Las 5 frases de supervivencia (U2), accesibles SIEMPRE — aunque no se haya
     llegado a esa unidad. Frasebook de referencia: se permite más de 1 EN. */
  function openA1Panic() {
    if (typeof window.openSheet !== 'function') {
      if (window.toast) window.toast('Abrí la app con internet una vez y ya queda offline.');
      return;
    }
    if (!SURVIVAL.length) buildIndex();
    var canTts = a1TtsDisponible();
    var rows = SURVIVAL.map(function (c) {
      return '<div class="rd-a1-surv">' +
          '<div class="rd-a1-surv-top">' +
            '<span class="rd-a1-surv-en font-display">' + esc(c.en) + '</span>' +
            (canTts ? '<button type="button" class="icon-btn rd-a1-surv-say" data-en="' + escAttr(c.en) + '" aria-label="Escuchar la frase">🔊</button>' : '') +
          '</div>' +
          '<div class="rd-a1-surv-es">' + esc(c.es) + '</div>' +
          '<div class="rd-a1-surv-snd">suena: ' + esc(c.sounds_es) + '</div>' +
        '</div>';
    }).join('');
    var note = canTts ? '' :
      '<p class="rd-a1-surv-note">Tu celu acá no las dice en voz alta, pero léelas como están en "suena:". Igual funciona, tranquilo.</p>';
    var html =
      '<p class="rd-eyebrow rd-eyebrow--accent"><span class="rd-eyebrow-rule"></span>🆘 Tus salvavidas</p>' +
      '<p class="font-display rd-a1-sheet-title">SI TE TRABÁS<span style="color:var(--accent);">.</span></p>' +
      '<p class="rd-a1-sheet-sub">Estas cinco te sacan de cualquier lío en la vida real. Nadie se enoja si las decís.</p>' +
      '<div class="rd-a1-surv-list">' + rows + '</div>' +
      note +
      '<button type="button" class="btn-accent rd-a1-sheet-close" style="width:100%;margin-top:16px;">Listo</button>';
    window.openSheet(html);

    var sc = el('sheet-content');
    if (sc) {
      sc.querySelectorAll('.rd-a1-surv-say').forEach(function (b) {
        b.addEventListener('click', function () { a1Speak(b.getAttribute('data-en')); });
      });
      var cl = sc.querySelector('.rd-a1-sheet-close');
      if (cl) cl.addEventListener('click', function () { if (window.closeSheet) window.closeSheet(); });
    }
  }
  window.openA1Panic = openA1Panic;

  // Índice listo al cargar (el contenido carga ANTES que este archivo).
  buildIndex();
})();
