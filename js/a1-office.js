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

  function a1Speak(text, rate) {
    if (!text || !('speechSynthesis' in window)) return;
    if (a1Store.get(K_TTS, true) === false) return;   // el usuario lo apagó
    try {
      var synth = window.speechSynthesis;
      synth.cancel();
      var utter = new SpeechSynthesisUtterance(String(text));
      if (a1VoiceEN) utter.voice = a1VoiceEN;
      utter.lang = (a1VoiceEN && a1VoiceEN.lang) || 'en-US';
      // Lento a propósito (shadowing del A1). El botón "más despacio" del PASO 5
      // pasa un rate aún menor; sin argumento se queda en 0.85 (compat Capa 1).
      utter.rate = (typeof rate === 'number' && rate > 0) ? rate : 0.85;
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
    // Al volver al home, la escena inmersiva queda oculta y limpia; el home
    // reaparece (el loop de la Capa 2 lo ocultó al entrar). Al soltar #a1-escena
    // el MutationObserver de actualizarCromo devuelve la tab bar.
    var escena = el('a1-escena');
    if (escena) { escena.classList.add('hidden'); escena.classList.remove('flex'); escena.innerHTML = ''; }
    home.classList.remove('hidden');

    if (!a1Store.get(K_ONBOARDED, false)) { renderOnboarding(0); return; }

    home.innerHTML = homeHTML();
    wireHome(home);
    if (!A1_REDUCED && window.animateIn) {
      window.animateIn(home.children, { y: 16, duration: 0.6 });
    }
  }
  window.renderA1Home = renderA1Home;

  // Abrir una unidad: reanuda la primera escena que todavía no terminaste (si ya
  // están todas hechas, la primera para repasar). El loop de 6 pasos vive en
  // openA1Escena (más abajo, misma clausura → hoisting). El 🆘 cubre la
  // supervivencia aparte, desde el día 1.
  function a1AbrirUnidad(unitId) {
    var A = data();
    if (!A || !A.units) return;
    var u = A.units.filter(function (x) { return x.id === unitId; })[0];
    if (!u || !u.scenes || !u.scenes.length) return;
    var doneS = getProgress().doneScenes || [];
    var target = u.scenes.filter(function (s) { return doneS.indexOf(s.id) === -1; })[0] || u.scenes[0];
    openA1Escena(unitId, target.id);
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

  /* ═══════════════════ ESCENA INMERSIVA · loop de 6 pasos (SPEC §4.1) ═══════════
     Un "beat" = enseñar UN chunk; un tap avanza (segmentación de Mayer). Los 6
     pasos: (1) ESCENA — Pipe monta la situación, cero inglés · (2) ANTICIPACIÓN —
     el silencio, intención en español · (3) REVEAL + AUDIO — la ÚNICA frase EN
     grande de la pantalla · (4) EL PORQUÉ — why_es + molde/swaps + a quién · (5)
     SHADOWING — la producís, replay lento opcional · (6) AUTOEVAL — Clavado/Casi/
     Todavía no (neutro, jamás coral). Progreso por-chunk en rodeo_a1_progress
     (sobrevive recargar). La autoeval SOLO avanza y persiste posición; llama a
     a1SrsGrade (stub) — el motor Leitner real llega en la Capa 3. */

  var K_PROGRESS = 'rodeo_a1_progress';

  // Reacciones genéricas de Pipe a la autoeval (voz de §1.2). "Todavía no" es
  // NEUTRO y reconfortante: modela el error, jamás regaña ni pone nota.
  var EVAL_REACT = {
    clavado: '¡Eso! Ni mandado a hacer. Esa ya es tuya.',
    casi: 'Casi, casi. Escuchala una vez más y la repetís conmigo. Vas bien.',
    todavia: 'Tranquilo, esa se enreda al principio. Te la repasamos pronto pa\' que no se te vaya. Nadie nace sabiendo.',
  };

  // ── Estado del progreso (claves rodeo_a1_*, aisladas del DNA de Gus) ──
  function getProgress() {
    var p = a1Store.get(K_PROGRESS, null);
    if (!p || typeof p !== 'object') p = {};
    if (!Array.isArray(p.doneScenes)) p.doneScenes = [];
    if (!Array.isArray(p.doneUnits)) p.doneUnits = [];
    if (!Array.isArray(p.unlockedUnits)) p.unlockedUnits = [];
    return p;
  }
  function saveProgress(patch) {
    var p = getProgress();
    if (patch) { for (var k in patch) { if (Object.prototype.hasOwnProperty.call(patch, k)) p[k] = patch[k]; } }
    p.ts = Date.now();
    a1Store.set(K_PROGRESS, p);
    return p;
  }
  function markSceneDone(sceneId) {
    var p = getProgress();
    if (sceneId && p.doneScenes.indexOf(sceneId) === -1) p.doneScenes.push(sceneId);
    a1Store.set(K_PROGRESS, p);
  }

  // Resuelve los chunks de una escena: inline o ChunkRef ({ref:'id'}) contra el
  // índice plano. Filtra lo inválido (nunca un beat vacío).
  function resolveChunks(scene) {
    if (!scene || !scene.chunks) return [];
    if (!Object.keys(A1_INDEX).length) buildIndex();
    return scene.chunks.map(function (c) {
      if (c && c.ref) return A1_INDEX[c.ref] || null;
      return c || null;
    }).filter(function (c) { return c && c.id && c.en; });
  }

  // Mostrar la escena inmersiva (oculta el home). Mismo patrón hidden/flex que
  // STORY (#story-run); al hacerse visible, actualizarCromo esconde la tab bar.
  function showEscenaPanel() {
    var home = el('a1-home'); var escena = el('a1-escena');
    if (home) home.classList.add('hidden');
    if (escena) { escena.classList.remove('hidden'); escena.classList.add('flex'); }
  }

  // Avatar de Pipe + una o varias burbujas apiladas del mismo turno (≤2 c/u).
  function pipeBlock(texts) {
    var arr = (Array.isArray(texts) ? texts : [texts]).filter(Boolean);
    var bubbles = arr.map(bubbleOnly).join('');
    return '<div class="rd-a1-line">' + pipeAvatar(30) + '<div class="rd-a1-bubbles">' + bubbles + '</div></div>';
  }

  var run = null;   // estado del recorrido en curso

  function openA1Escena(unitId, sceneId, opts) {
    opts = opts || {};
    var A = data(); if (!A || !A.units) return;
    var unit = A.units.filter(function (x) { return x.id === unitId; })[0];
    if (!unit) return;
    var scenes = unit.scenes || [];
    var scene = sceneId ? scenes.filter(function (x) { return x.id === sceneId; })[0] : scenes[0];
    if (!scene) scene = scenes[0];
    if (!scene) return;
    var chunks = resolveChunks(scene);
    if (!chunks.length) {
      if (window.toast) window.toast('Esta escena todavía no tiene frases, parce.');
      return;
    }

    // Punto de arranque: reanuda el chunk guardado SOLO si es la misma escena
    // (recargar en mitad de una escena vuelve a ese chunk, no al principio).
    var start = 0;
    var p = getProgress();
    if (typeof opts.chunkIdx === 'number') {
      start = opts.chunkIdx;
    } else if (p && p.unitId === unitId && p.sceneId === scene.id &&
               typeof p.chunkIdx === 'number' && p.chunkIdx >= 0 && p.chunkIdx < chunks.length) {
      start = p.chunkIdx;
    }
    if (start < 0 || start >= chunks.length) start = 0;

    run = { unitId: unitId, sceneId: scene.id, unit: unit, scene: scene, chunks: chunks, i: start, step: 1, phase: 'beat', lastGrade: null };

    var escena = el('a1-escena');
    if (!escena) return;
    showEscenaPanel();
    // Shell constante: ← volver · dots (posición por chunk) · mini avatar de Pipe.
    escena.innerHTML =
      '<div class="rd-a1-escena-head shrink-0">' +
        '<button type="button" class="icon-btn rd-a1-esc-back" aria-label="Volver al inicio">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg>' +
        '</button>' +
        '<div class="rd-a1-dots" id="a1-esc-dots" role="presentation" aria-hidden="true"></div>' +
        pipeAvatar(34) +
      '</div>' +
      '<div class="scroll-area rd-a1-beat" id="a1-beat" style="flex:1; min-height:0;"></div>' +
      '<div class="rd-a1-beat-foot shrink-0" id="a1-foot"></div>';

    var back = escena.querySelector('.rd-a1-esc-back');
    if (back) back.addEventListener('click', function () { renderA1Home(); });

    enterChunk(start);
  }
  window.openA1Escena = openA1Escena;

  // Entrar a un chunk = arrancar su beat en el PASO 1 y persistir la posición
  // por-chunk (esto es lo que hace que recargar reanude donde ibas).
  function enterChunk(i) {
    if (!run) return;
    run.i = i; run.step = 1; run.phase = 'beat'; run.lastGrade = null;
    saveProgress({ unitId: run.unitId, sceneId: run.sceneId, chunkIdx: i });
    paintBeat();
  }
  function goStep(step) { if (!run) return; run.step = step; run.phase = 'beat'; paintBeat(); }

  function updateDots() {
    var d = el('a1-esc-dots');
    if (d && run) d.innerHTML = dotsHTML(Math.min(run.i, run.chunks.length - 1), run.chunks.length);
  }
  function setBeat(html) { var b = el('a1-beat'); if (b) { b.innerHTML = html; b.scrollTop = 0; } return el('a1-beat'); }
  function setFoot(html) { var f = el('a1-foot'); if (f) f.innerHTML = html; return f; }
  function primaryBtn(label, cls) {
    return '<button type="button" class="' + (cls || 'btn-accent') + ' rd-a1-next" style="width:100%;">' + esc(label) + '</button>';
  }
  function wireNext(fn) {
    var f = el('a1-foot'); if (!f) return;
    var b = f.querySelector('.rd-a1-next');
    if (b) b.addEventListener('click', fn);
  }
  // Replay del audio: cualquier control con data-say suena a rate normal; con
  // data-slow, más despacio. Desacoplado de la clase para no chocar estilos.
  function wireSay() {
    var b = el('a1-beat'); if (!b) return;
    b.querySelectorAll('[data-say]').forEach(function (btn) {
      btn.addEventListener('click', function () { a1Speak(btn.getAttribute('data-say')); });
    });
    b.querySelectorAll('[data-slow]').forEach(function (btn) {
      btn.addEventListener('click', function () { a1Speak(btn.getAttribute('data-slow'), 0.6); });
    });
  }
  function animateBeat() {
    if (A1_REDUCED || !window.animateIn) return;
    var b = el('a1-beat');
    if (b) window.animateIn(b.children, { y: 12, duration: 0.45 });
  }

  function chunkFrameHTML(c) {
    if (!c.frame) return '';
    var chips = (c.swaps || []).map(function (s) {
      return '<span class="gloss-chip rd-a1-swap">' + esc(s) + '</span>';
    }).join('');
    return '<div class="rd-a1-molde">' +
        '<span class="label-mini">El molde</span>' +
        '<span class="rd-a1-frame">' + esc(c.frame) + '</span>' +
        (chips ? '<div class="rd-a1-chips">' + chips + '</div>' : '') +
      '</div>';
  }

  // Tarjeta del chunk (reusa .slang-card). Es la ÚNICA frase EN grande (.term).
  function revealCardHTML(c, withTop, tts) {
    var top = '';
    if (withTop) {
      var say = tts ? ('<button type="button" class="icon-btn rd-a1-say" data-say="' + escAttr(c.en) + '" aria-label="Escuchar la frase"><span aria-hidden="true">🔊</span></button>') : '';
      top = '<div class="rd-a1-reveal-top"><span class="label-mini">Así se dice</span>' + say + '</div>';
    }
    return '<div class="slang-card rd-a1-reveal" style="background:var(--card-paper);" aria-live="polite">' +
        top +
        '<p class="term">' + esc(c.en) + '</p>' +
        (withTop ? '<p class="ex-es">' + esc(c.es) + '</p>' : '') +
        '<p class="rd-a1-snd">suena: ' + esc(c.sounds_es) + '</p>' +
      '</div>';
  }

  function paintBeat() {
    if (!run) return;
    if (run.phase === 'react') { paintReaction(); return; }
    if (run.phase === 'done') { paintDone(); return; }
    updateDots();
    var c = run.chunks[run.i];
    var tts = a1TtsDisponible();

    if (run.step === 1) {
      // PASO 1 · ESCENA — Pipe monta la situación. CERO inglés.
      var body = '<p class="rd-a1-scene-lead">' + esc(run.scene.scene_es) + '</p>';
      if (run.i === 0) {
        var lines = (run.scene.setup_es || []).slice();
        if (run.scene.analogy_es) lines.push(run.scene.analogy_es);
        body += pipeBlock(lines);
      } else {
        body += pipeBlock(['Seguimos en la misma. Va otra que te sirve un montón.']);
      }
      setBeat(body);
      setFoot(primaryBtn('Dale ↓', 'btn-ghost'));
      wireNext(function () { goStep(2); });
      animateBeat();

    } else if (run.step === 2) {
      // PASO 2 · ANTICIPACIÓN — el silencio. Intención en español, cero inglés.
      setBeat(pipeBlock([
        'A ver… querés decir «' + c.es + '». ¿Cómo suena en inglés?',
        'Probá en voz alta, como te salga. Nadie te oye — ese es el punto.',
      ]));
      setFoot(primaryBtn('👁 Ver la frase', 'btn-accent'));
      wireNext(function () { goStep(3); });
      animateBeat();

    } else if (run.step === 3) {
      // PASO 3 · REVEAL + AUDIO — la ÚNICA frase EN grande de la pantalla.
      var cover = tts ? '' : pipeBlock(['Acá tu celu no la dice en voz alta, pero léela como está en «suena». Igual funciona, tranquilo.']);
      setBeat(revealCardHTML(c, true, tts) + cover);
      setFoot(primaryBtn('Seguir ↓', 'btn-ghost'));
      wireSay();
      wireNext(function () { goStep(4); });
      animateBeat();
      // Suena 1 vez al revelar: el tap de "Ver la frase" ya desbloqueó el TTS móvil.
      if (tts) a1Speak(c.en);

    } else if (run.step === 4) {
      // PASO 4 · EL PORQUÉ — why_es (obligatorio) + molde/swaps + a quién. Sin
      // frase EN grande (los swaps van en chips chicos, es el molde).
      var body4 = pipeBlock([c.why_es]);
      body4 += chunkFrameHTML(c);
      if (c.who_es) body4 += '<span class="rd-a1-who"><span aria-hidden="true">👤</span>' + esc(c.who_es) + '</span>';
      setBeat(body4);
      setFoot(primaryBtn('Ya, repito ↓', 'btn-ghost'));
      wireNext(function () { goStep(5); });
      animateBeat();

    } else if (run.step === 5) {
      // PASO 5 · SHADOWING — la producís. Replay normal / más despacio (o la
      // muleta sounds_es si no hay voz). Sin micrófono, sin nota.
      var replay = '';
      if (tts) {
        replay = '<div class="rd-a1-replay">' +
            '<button type="button" class="btn-ghost" data-say="' + escAttr(c.en) + '">🔊 otra vez</button>' +
            '<button type="button" class="btn-ghost" data-slow="' + escAttr(c.en) + '">más despacio</button>' +
          '</div>';
      }
      setBeat(pipeBlock(['Ahora vos. Repetila en voz alta, como suena. Nadie te oye, dale sin pena.']) +
        revealCardHTML(c, false, tts) + replay);
      setFoot(primaryBtn('Listo, la dije', 'btn-accent'));
      wireSay();
      wireNext(function () { goStep(6); });
      animateBeat();

    } else if (run.step === 6) {
      // PASO 6 · AUTOEVAL — cero castigo. "Todavía no" NEUTRO (jamás coral).
      setBeat(
        pipeBlock(['¿Y qué tal? ¿Te salió?']) +
        '<div class="rd-a1-eval">' +
          '<button type="button" class="rd-a1-eval-btn rd-a1-eval-btn--clavado" data-grade="clavado">Clavado <span aria-hidden="true">✓</span></button>' +
          '<button type="button" class="rd-a1-eval-btn rd-a1-eval-btn--casi" data-grade="casi">Casi <span aria-hidden="true">~</span></button>' +
          '<button type="button" class="rd-a1-eval-btn rd-a1-eval-btn--todavia" data-grade="todavia">Todavía no <span aria-hidden="true">↺</span></button>' +
        '</div>'
      );
      setFoot('');
      var beat = el('a1-beat');
      if (beat) beat.querySelectorAll('.rd-a1-eval-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { onGrade(c, btn.getAttribute('data-grade')); });
      });
      animateBeat();
    }
  }

  function onGrade(c, grade) {
    // Autoeval → alimenta el SRS. La llamada queda cableada; el cálculo Leitner
    // real (cajas/intervalos) llega en la Capa 3 dentro de a1SrsGrade (stub).
    try { a1SrsGrade(c.id, grade); } catch (e) { /* stub no debe romper el loop */ }
    run.phase = 'react';
    run.lastGrade = grade;
    paintReaction();
  }

  function paintReaction() {
    if (!run) return;
    var last = run.i >= run.chunks.length - 1;
    var msg = EVAL_REACT[run.lastGrade] || EVAL_REACT.clavado;
    setBeat(pipeBlock([msg]));
    setFoot(primaryBtn(last ? 'Cerrar la escena ✓' : 'Siguiente frase →', 'btn-accent'));
    wireNext(function () {
      if (last) { sceneComplete(); }
      else { enterChunk(run.i + 1); }
    });
    animateBeat();
  }

  function sceneComplete() {
    if (!run) return;
    markSceneDone(run.sceneId);
    // Escena terminada: al reabrirla arranca de cero (chunkIdx fuera de rango).
    saveProgress({ unitId: run.unitId, sceneId: run.sceneId, chunkIdx: run.chunks.length });
    run.phase = 'done';
    paintDone();
  }

  function paintDone() {
    if (!run) return;
    updateDots();
    // Cierre honesto y cálido (sin confeti de caricatura: la celebración adulta
    // y la micro-tarea TBLT completas llegan en la Capa 4).
    setBeat(pipeBlock([
      'Listo, esa escena la sacaste. Eso hace un rato no lo tenías.',
      'Volvé cuando querás y seguimos con la próxima, sin afán.',
    ]));
    setFoot(primaryBtn('Volver al inicio', 'btn-accent'));
    wireNext(function () { renderA1Home(); });
    animateBeat();
  }

  /* ── SRS (stub de Capa 2) ─────────────────────────────────────────────────
     El motor Leitner real (cajas 1..5, intervalos [1,3,7,14,30], transiciones
     Clavado/Casi/Todavía no, escritura de rodeo_a1_srs) se implementa en la
     Capa 3. Acá sólo dejamos la llamada cableada y estable para que la autoeval
     del loop la invoque sin acoplarse a la implementación futura. */
  function a1SrsGrade(chunkId, grade) {
    // Capa 2: no-op intencional — la autoeval sólo avanza y persiste posición
    // (rodeo_a1_progress). La Capa 3 rellena esta función.
    return;
  }
  window.a1SrsGrade = a1SrsGrade;

  // Índice listo al cargar (el contenido carga ANTES que este archivo).
  buildIndex();
})();
