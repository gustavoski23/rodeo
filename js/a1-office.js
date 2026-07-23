// ============================================================
// OFICINA · A1 laboral offline — MOTOR (Capas 1–4: plomería · loop · SRS · rungs)
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
//   window.openA1Escena(u,s)  -> loop inmersivo de 6 pasos (Capa 2)
//   window.openA1Repaso()     -> sesión SRS: warm-up + nuevos + due con tope (Capa 3)
//   window.a1SrsGrade(id,g)   -> mueve la caja Leitner y recalcula el due (Capa 3)
//   window.a1SrsDue()         -> lista de vencidos ordenada por fragilidad (Capa 3)
//   window.a1UpdateStreak()   -> racha propia, NO punitiva (clon, nunca la de Gus)
//   window.a1Metrics()        -> métricas honestas (caja>=4 "ya te salen solas")
//   window.a1Guardar(item)    -> "Mis frases" (rodeo_a1_saved), JAMÁS saveDNA (Capa 4)
//   window.openA1Saved()      -> hoja "Mis frases" (Capa 4)
//   window.openA1ChunkDetail(id) -> sheet de detalle de un chunk (§5.6, Capa 4)
//   window.openA1Task(unit)   -> micro-tarea TBLT + logro de unidad (Capa 4)
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
  var K_SRS = 'rodeo_a1_srs';       // cerebro Leitner (Capa 3), AISLADO del DNA de Gus
  var K_STREAK = 'rodeo_a1_streak'; // racha propia, NO punitiva (nunca rodeo_streak)

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

  // ── Índice plano de chunks + lista de supervivencia (alimenta el 🆘) + mapas
  //    chunkId → escena/unidad de origen (para el repaso mezclado de la Capa 3). ─
  var A1_INDEX = {};
  var SURVIVAL = [];
  var A1_SCENE_OF = {};
  var A1_UNIT_OF = {};
  function buildIndex() {
    A1_INDEX = {}; SURVIVAL = []; A1_SCENE_OF = {}; A1_UNIT_OF = {};
    var A = data(); if (!A || !A.units) return;
    A.units.forEach(function (u) {
      (u.scenes || []).forEach(function (s) {
        (s.chunks || []).forEach(function (c) {
          if (c && c.id && !c.ref) {
            A1_INDEX[c.id] = c;
            A1_SCENE_OF[c.id] = s;
            A1_UNIT_OF[c.id] = u;
            if (c.survival) SURVIVAL.push(c);
          }
        });
      });
    });
    window.A1_INDEX = A1_INDEX;
  }
  function sceneOfChunk(c) { return (c && c.id) ? (A1_SCENE_OF[c.id] || null) : null; }

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

  /* ═══════════════════ PIEZAS DE UI (voz de Alfred) ═══════════════════ */
  function alfredAvatar(size) {
    var s = size || 34;
    var A = data();
    var ini = (A && A.companion && A.companion.avatarInitial) || 'A';
    return '<span class="npc-avatar rd-a1-avatar" style="width:' + s + 'px;height:' + s +
      'px;font-size:' + Math.round(s * 0.44) + 'px;background:var(--card-peach);" aria-hidden="true">' +
      esc(ini) + '</span>';
  }
  function bubbleOnly(text) {
    if (!text) return '';
    return '<div class="bubble-coach rd-a1-bubble">' + esc(text) + '</div>';
  }
  function alfredRow(text) {
    return '<div class="rd-a1-line">' + alfredAvatar(30) + bubbleOnly(text) + '</div>';
  }
  function dotsHTML(active, total) {
    var out = '';
    for (var i = 0; i < total; i++) {
      out += '<span class="rd-a1-dot' + (i === active ? ' rd-a1-dot--on' : '') + '"></span>';
    }
    return out;
  }

  /* ═══════════════════ ONBOARDING (gate rodeo_a1_onboarded) ═══════════════════
     Propio (NO reusa mostrarOnboarding, tematizado a Gus). 4 beats: (1) Alfred se
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
      body = bubbleOnly(intro[0] || '¡Ey! Vos sos el nuevo, ¿cierto? Yo soy Alfred.') +
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
        '<div class="rd-a1-onb-avatar">' + alfredAvatar(66) + '</div>' +
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
        '<p class="rd-eyebrow rd-eyebrow--accent"><span class="rd-eyebrow-rule"></span>Oficina · con Alfred</p>' +
        '<p class="font-display rd-hero-title">TU PRIMERA<br>SEMANA<span style="color:var(--accent);">.</span></p>' +
        '<p class="rd-hero-sub">Frase por frase. Sin miedo. Alfred te dice qué decir el lunes a las 8.</p>' +
      '</div>';
  }

  // Saludo DINÁMICO por estado (Capa 3): enmarca el "repaso de pasillo" con Alfred.
  function greetingHTML() {
    var dueCount = a1SrsDue().length;
    var newAvail = pickNewChunks(1).length > 0;
    var msg;
    if (dueCount > 0) {
      var n = Math.min(dueCount, A1_DUE_CAP);
      msg = 'Buenas, parce. Hoy toca repaso de pasillo: ' + n + (n === 1 ? ' frase' : ' frases') +
        ' pa\' refrescar' + (newAvail ? ' y algo nuevo.' : '.') + ' ¿Le entramos?';
    } else if (newAvail) {
      msg = 'Todo fresco, parce. Nada que repasar hoy — arranquemos algo nuevo, suave.';
    } else {
      msg = 'Vas al día. Cuando querás repasamos lo que ya tenés, sin afán.';
    }
    return alfredRow(msg);
  }

  // Métrica ESTRELLA del Home (honesta, §4.3): "ya te salen solas" = caja>=4. La
  // barra llena respecto al total del módulo. Cero XP, cero racha-en-rojo.
  function metricHTML() {
    var m = a1Metrics();
    var total = Object.keys(A1_INDEX).length || 1;
    var pct = Math.max(0, Math.min(100, Math.round(m.salen / total * 100)));
    var label = m.salen > 0
      ? ('Ya te salen solas: <strong>' + m.salen + '</strong>')
      : 'Apenas arrancás — pronto se te van saliendo solas.';
    return '<div class="rd-a1-metric">' +
        '<div class="meter-track"><div class="meter-fill" style="width:' + pct + '%;background:var(--accent);"></div></div>' +
        '<p class="rd-a1-metric-label">' + label + '</p>' +
      '</div>';
  }

  // CTA primaria (§5.2): REPASO si hay due; si no, "todo fresco" + arrancar algo
  // nuevo (nunca dead-end). Debajo, SEGUIR donde ibas si quedó una escena a medias.
  function ctaHTML(dueCount, newAvail, rt) {
    var html = '';
    if (dueCount > 0) {
      var n = Math.min(dueCount, A1_DUE_CAP);
      html += '<button type="button" class="rd-a1-repaso" data-a1-repaso aria-label="Empezar el repaso">' +
          '<span class="rd-a1-repaso-txt">' +
            '<span class="rd-a1-repaso-eyebrow">Repaso de pasillo</span>' +
            '<span class="rd-a1-repaso-main">' + n + (n === 1 ? ' frase lista' : ' frases listas') + ' pa\' refrescar</span>' +
          '</span>' +
          '<span class="rd-a1-repaso-go" aria-hidden="true">Repasar →</span>' +
        '</button>';
    } else if (newAvail) {
      html += '<button type="button" class="rd-a1-repaso rd-a1-repaso--fresh" data-a1-repaso aria-label="Arrancar algo nuevo">' +
          '<span class="rd-a1-repaso-txt">' +
            '<span class="rd-a1-repaso-eyebrow">Todo fresco</span>' +
            '<span class="rd-a1-repaso-main">Nada que repasar — arranquemos algo nuevo</span>' +
          '</span>' +
          '<span class="rd-a1-repaso-go" aria-hidden="true">Arrancar →</span>' +
        '</button>';
    }
    if (rt) {
      html += '<button type="button" class="mission-card rd-a1-seguir" data-a1-seguir aria-label="Seguir donde ibas">' +
          '<span class="rd-a1-seguir-eyebrow">Seguí donde ibas</span>' +
          '<span class="rd-a1-seguir-main">' + esc(rt.unit.title_es) + ' · escena ' + rt.sceneNum + '/' + rt.sceneTotal + '</span>' +
        '</button>';
    }
    return html;
  }

  // Punto de "seguir": la última escena tocada que NO quedó terminada (chunkIdx en
  // rango). Al completar una escena, chunkIdx queda fuera de rango → no reaparece.
  function resumeTarget() {
    var p = getProgress();
    if (!p || !p.unitId || !p.sceneId) return null;
    var A = data(); if (!A || !A.units) return null;
    var u = A.units.filter(function (x) { return x.id === p.unitId; })[0];
    if (!u || !u.scenes) return null;
    var s = u.scenes.filter(function (x) { return x.id === p.sceneId; })[0];
    if (!s) return null;
    var chunks = resolveChunks(s);
    if (typeof p.chunkIdx !== 'number' || p.chunkIdx < 0 || p.chunkIdx >= chunks.length) return null;
    var idx = u.scenes.indexOf(s);
    return { unit: u, scene: s, chunkIdx: p.chunkIdx, sceneNum: idx + 1, sceneTotal: u.scenes.length };
  }

  // Dominación de una unidad (§4.3): >=80% de sus chunks en caja>=3 → checkmark.
  function unitMastery(u) {
    var ids = [];
    (u.scenes || []).forEach(function (s) {
      resolveChunks(s).forEach(function (c) { if (ids.indexOf(c.id) === -1) ids.push(c.id); });
    });
    var srs = a1SrsGet(); var box3 = 0, touched = 0;
    ids.forEach(function (id) { var e = srs[id]; if (e) { touched++; if ((e.box || 1) >= 3) box3++; } });
    return { total: ids.length, box3: box3, touched: touched };
  }
  function unitDominated(m) { return m.total > 0 && m.box3 >= Math.ceil(m.total * 0.8); }

  function unitCardHTML(u) {
    var unlocked = isUnlocked(u.id);
    var m = unitMastery(u);
    var dominated = unlocked && unitDominated(m);
    var badge = u.survival ? '<span class="rd-a1-badge">🆘 supervivencia</span>' : '';

    var right;
    if (!unlocked) right = '<span class="rd-a1-unit-go rd-a1-unit-lock" aria-label="Se abre más adelante">🔒</span>';
    else if (dominated) right = '<span class="rd-a1-unit-go rd-a1-unit-done" aria-label="Situación dominada">✓</span>';
    else right = '<span class="rd-a1-unit-go" aria-hidden="true">→</span>';

    // Progreso honesto solo cuando la unidad está abierta y ya se tocó algo (no
    // dominada aún): barra de caja>=3 + "n/total ya tuyas".
    var prog = '';
    if (unlocked && m.total && m.touched > 0 && !dominated) {
      var pct = Math.round(m.box3 / m.total * 100);
      prog = '<span class="rd-a1-unit-prog">' +
          '<span class="meter-track"><span class="meter-fill" style="width:' + pct + '%;background:var(--accent);"></span></span>' +
          '<span class="rd-a1-unit-prog-txt">' + m.box3 + '/' + m.total + ' ya tuyas</span>' +
        '</span>';
    }

    return '<button type="button" class="rd-a1-unit' + (unlocked ? '' : ' rd-a1-unit--locked') + '" data-unit="' + escAttr(u.id) + '" style="--rd-a1-theme:' + themeVar(u.cardTheme) + ';">' +
        '<span class="rd-a1-unit-ico" aria-hidden="true">' + esc(u.icon || u.emoji || '•') + '</span>' +
        '<span class="rd-a1-unit-txt">' +
          '<span class="rd-a1-unit-title">' + esc(u.title_es) + '</span>' +
          '<span class="rd-a1-unit-sub">' + esc(u.subtitle_es) + '</span>' +
          badge + prog +
        '</span>' +
        right +
      '</button>';
  }

  // Gancho A1 (el "dibujo libre" de OFICINA, a nivel principiante): preguntas
  // cortas y tentadoras en la voz de Alfred que enrutan a la situación real. Es
  // el equivalente amable del rompehielos avanzado de TALK, pero sin API y a A1.
  function hookHTML() {
    var A = data();
    if (!A || !A.units) return '';
    var HOOKS = [
      { unit: 'u1-llegar',        q: '¿Saludar sin quedar mudo?' },
      { unit: 'u2-supervivencia', q: '¿Y si no entendés nada?' },
      { unit: 'u5-ayuda',         q: '¿Pedir un descanso o la hora?' },
      { unit: 'u3-presentarte',   q: '¿Presentarte al equipo?' },
      { unit: 'u4-smalltalk',     q: '¿Caer bien en el cafecito?' },
      { unit: 'u6-reunion',       q: '¿Sobrevivir la reunión?' },
      { unit: 'u7-tareas',        q: '¿Cerrar bien una tarea?' },
    ];
    var chips = HOOKS.filter(function (h) {
      return A.units.some(function (u) { return u.id === h.unit; });
    }).map(function (h) {
      var open = isUnlocked(h.unit);
      return '<button type="button" class="rd-a1-hook' + (open ? '' : ' rd-a1-hook--locked') +
        '" data-a1-hook="' + escAttr(h.unit) + '">' + esc(h.q) +
        (open ? '' : ' <span aria-hidden="true">🔒</span>') + '</button>';
    }).join('');
    if (!chips) return '';
    return '<div class="rd-a1-hooks-wrap">' +
        '<p class="rd-eyebrow rd-eyebrow--muted"><span class="rd-eyebrow-rule"></span>¿Sabés decir…?</p>' +
        '<div class="rd-a1-hooks">' + chips + '</div>' +
      '</div>';
  }

  function homeHTML() {
    var A = data();
    var units = (A && A.units) || [];
    var dueCount = a1SrsDue().length;
    var newAvail = pickNewChunks(1).length > 0;
    var rt = resumeTarget();
    var list = units.map(unitCardHTML).join('');
    var svCount = a1SavedGet().length;
    return heroHTML() +
      metricHTML() +
      greetingHTML() +
      ctaHTML(dueCount, newAvail, rt) +
      hookHTML() +
      '<p class="rd-eyebrow rd-eyebrow--muted"><span class="rd-eyebrow-rule"></span>Elegí por dónde arrancar</p>' +
      '<div class="rd-a1-units">' + list + '</div>' +
      // Capa 4: "Mis frases" (las guardadas con ★) + botón de pánico permanente.
      '<button type="button" class="rd-a1-saved-link" data-a1-saved aria-label="Mis frases guardadas">' +
        '<span aria-hidden="true">★</span> Mis frases' + (svCount ? ' · ' + svCount : '') +
      '</button>' +
      '<button type="button" class="rd-a1-panic" data-a1-panic aria-label="Frases de emergencia">' +
        '<span aria-hidden="true">🆘</span> No entiendo — las frases que me salvan' +
      '</button>';
  }

  function wireHome(home) {
    home.querySelectorAll('.rd-a1-unit').forEach(function (b) {
      b.addEventListener('click', function () { a1AbrirUnidad(b.getAttribute('data-unit')); });
    });
    home.querySelectorAll('[data-a1-hook]').forEach(function (b) {
      b.addEventListener('click', function () { a1AbrirUnidad(b.getAttribute('data-a1-hook')); });
    });
    var panic = home.querySelector('[data-a1-panic]');
    if (panic) panic.addEventListener('click', openA1Panic);
    var saved = home.querySelector('[data-a1-saved]');
    if (saved) saved.addEventListener('click', openA1Saved);
    var rep = home.querySelector('[data-a1-repaso]');
    if (rep) rep.addEventListener('click', function () { openA1Repaso(); });
    var seg = home.querySelector('[data-a1-seguir]');
    if (seg) seg.addEventListener('click', function () {
      var rt = resumeTarget();
      if (rt) openA1Escena(rt.unit.id, rt.scene.id);
    });
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
    if (!isUnlocked(unitId)) {
      if (window.toast) window.toast('Esa se abre cuando termines la de antes, parce. Sin afán.');
      return;
    }
    // Capa 4: si ya completó las escenas pero le falta la micro-tarea, va derecho a
    // ella (ruta de recuperación si en su momento salió antes de cerrarla).
    if (unitScenesDone(u) && u.task && !isTaskDone(u.task.id)) { openA1Task(u); return; }
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
     pasos: (1) ESCENA — Alfred monta la situación, cero inglés · (2) ANTICIPACIÓN —
     el silencio, intención en español · (3) REVEAL + AUDIO — la ÚNICA frase EN
     grande de la pantalla · (4) EL PORQUÉ — why_es + molde/swaps + a quién · (5)
     SHADOWING — la producís, replay lento opcional · (6) AUTOEVAL — Clavado/Casi/
     Todavía no (neutro, jamás coral). Progreso por-chunk en rodeo_a1_progress
     (sobrevive recargar). La autoeval SOLO avanza y persiste posición; llama a
     a1SrsGrade (stub) — el motor Leitner real llega en la Capa 3. */

  var K_PROGRESS = 'rodeo_a1_progress';

  // Reacciones genéricas de Alfred a la autoeval (voz de §1.2). "Todavía no" es
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
    if (!Array.isArray(p.doneTasks)) p.doneTasks = [];   // Capa 4: micro-tareas cerradas
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

  // Avatar de Alfred + una o varias burbujas apiladas del mismo turno (≤2 c/u).
  function alfredBlock(texts) {
    var arr = (Array.isArray(texts) ? texts : [texts]).filter(Boolean);
    var bubbles = arr.map(bubbleOnly).join('');
    return '<div class="rd-a1-line">' + alfredAvatar(30) + '<div class="rd-a1-bubbles">' + bubbles + '</div></div>';
  }

  var run = null;   // estado del recorrido en curso (escena o repaso)

  // Shell constante del loop: ← volver · dots (posición por chunk) · mini Alfred.
  // Compartido por la escena lineal (Capa 2) y el repaso mezclado (Capa 3).
  function paintEscenaShell() {
    var escena = el('a1-escena');
    if (!escena) return null;
    showEscenaPanel();
    escena.innerHTML =
      '<div class="rd-a1-escena-head shrink-0">' +
        '<button type="button" class="icon-btn rd-a1-esc-back" aria-label="Volver al inicio">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg>' +
        '</button>' +
        '<div class="rd-a1-dots" id="a1-esc-dots" role="presentation" aria-hidden="true"></div>' +
        // 🆘 dentro de la escena (§5.7): las 5 de supervivencia SIEMPRE a un tap.
        '<button type="button" class="icon-btn rd-a1-esc-panic" aria-label="Frases de emergencia"><span aria-hidden="true">🆘</span></button>' +
        alfredAvatar(34) +
      '</div>' +
      '<div class="scroll-area rd-a1-beat" id="a1-beat" style="flex:1; min-height:0;"></div>' +
      '<div class="rd-a1-beat-foot shrink-0" id="a1-foot"></div>';
    var back = escena.querySelector('.rd-a1-esc-back');
    if (back) back.addEventListener('click', function () { renderA1Home(); });
    var panic = escena.querySelector('.rd-a1-esc-panic');
    if (panic) panic.addEventListener('click', openA1Panic);
    return escena;
  }

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

    // Meta por-chunk: en modo escena todos son 'teach' y comparten la escena.
    var meta = chunks.map(function () { return { kind: 'teach', scene: scene, unit: unit }; });
    run = {
      mode: 'scene', unitId: unitId, sceneId: scene.id, unit: unit, scene: scene,
      chunks: chunks, meta: meta, i: start, step: 1, phase: 'beat', lastGrade: null,
      requeued: {}, shownSetup: {},
    };
    if (!paintEscenaShell()) return;
    enterChunk(start);
  }
  window.openA1Escena = openA1Escena;

  /* ═══════════════════ REPASO · sesión SRS mezclada (SPEC §4.3) ═══════════════
     "Repaso de pasillo": warm-up (1 due de la caja más alta) + nuevos (según carga)
     + resto de due (con tope de 8). Cola construida por buildRepasoQueue(). Los due
     entran con framing de repaso (kind:'due'); los nuevos con enseñanza completa. */
  function openA1Repaso() {
    buildIndex();
    var built = buildRepasoQueue();
    if (!built.queue.length) {
      // Nunca dead-end: sin due ni nuevos, no arranca sesión vacía (el home avisa).
      if (window.toast) window.toast('Hoy no tenés nada pendiente, parce. Vas al día.');
      return;
    }
    var chunks = built.queue.map(function (q) { return q.chunk; });
    var meta = built.queue.map(function (q) {
      return {
        kind: q.kind === 'due' ? 'due' : 'teach',
        scene: sceneOfChunk(q.chunk),
        unit: A1_UNIT_OF[q.chunk.id] || null,
      };
    });
    run = {
      mode: 'repaso', unitId: null, sceneId: null, unit: null, scene: null,
      chunks: chunks, meta: meta, i: 0, step: 1, phase: 'beat', lastGrade: null,
      requeued: {}, shownSetup: {},
    };
    if (!paintEscenaShell()) return;
    enterChunk(0);
  }
  window.openA1Repaso = openA1Repaso;

  // Entrar a un chunk = arrancar su beat en el PASO 1 y persistir la posición
  // por-chunk (esto es lo que hace que recargar reanude donde ibas).
  function enterChunk(i) {
    if (!run) return;
    run.i = i; run.step = 1; run.phase = 'beat'; run.lastGrade = null;
    // Capa 4: la caja Leitner decide el reto del PASO 2 (rung). Estado de la
    // interacción (MCQ/cloze) reseteado por chunk pa' no arrastrarlo entre beats.
    var c = run.chunks[i];
    var m = (run.meta && run.meta[i]) || {};
    run.rung = rungForChunk(c, m);
    run.answered = false; run.mcq = null; run.cloze = null;
    // Solo la escena lineal persiste posición (el "seguir" del home). El repaso es
    // efímero: no debe pisar ese puntero (sus chunks vienen de varias escenas).
    if (run.mode === 'scene') saveProgress({ unitId: run.unitId, sceneId: run.sceneId, chunkIdx: i });
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
      // ★ Guardar en "Mis frases" (Capa 4). Estrella llena/hueca según estado; el
      // guardado va a rodeo_a1_saved vía a1Guardar (JAMÁS saveDNA).
      var saved = a1IsSaved(c.id);
      var star = '<button type="button" class="icon-btn rd-a1-star' + (saved ? ' rd-a1-star--on' : '') +
        '" data-star="' + escAttr(c.id) + '" aria-pressed="' + (saved ? 'true' : 'false') +
        '" aria-label="' + (saved ? 'Quitar de mis frases' : 'Guardar en mis frases') +
        '"><span aria-hidden="true">' + (saved ? '★' : '☆') + '</span></button>';
      top = '<div class="rd-a1-reveal-top"><span class="label-mini">Así se dice</span>' +
        '<span class="rd-a1-reveal-actions">' + star + say + '</span></div>';
    }
    return '<div class="slang-card rd-a1-reveal" style="background:var(--card-paper);" aria-live="polite">' +
        top +
        '<p class="term">' + esc(c.en) + '</p>' +
        (withTop ? '<p class="ex-es">' + esc(c.es) + '</p>' : '') +
        '<p class="rd-a1-snd">suena: ' + esc(c.sounds_es) + '</p>' +
      '</div>';
  }

  // PASO 1 · ESCENA — Alfred monta la situación (cero inglés). Un due de repaso NO se
  // re-enseña: entra con el encuadre de "repaso de pasillo" y va derecho al recall.
  function step1HTML() {
    var m = (run.meta && run.meta[run.i]) || {};
    var scene = m.scene || run.scene || null;
    if (run.mode === 'repaso' && m.kind === 'due') {
      var lines = ['Ojo, esta ya nos la habíamos cruzado. Repaso de pasillo, pues.'];
      if (scene && scene.title_es) lines.push('La de «' + scene.title_es + '». A ver si todavía te sale, sin mirar.');
      else lines.push('A ver si todavía te sale, sin mirar.');
      return alfredBlock(lines);
    }
    // Enseñanza (nuevo): monta la escena una sola vez por escena en la sesión.
    var body = (scene && scene.scene_es) ? ('<p class="rd-a1-scene-lead">' + esc(scene.scene_es) + '</p>') : '';
    if (scene && !run.shownSetup[scene.id]) {
      run.shownSetup[scene.id] = true;
      var setup = (scene.setup_es || []).slice();
      if (scene.analogy_es) setup.push(scene.analogy_es);
      body += alfredBlock(setup);
    } else {
      body += alfredBlock(['Seguimos en la misma. Va otra que te sirve un montón.']);
    }
    return body;
  }

  function paintBeat() {
    if (!run) return;
    if (run.phase === 'react') { paintReaction(); return; }
    if (run.phase === 'done') { if (run.mode === 'repaso') paintDoneRepaso(); else paintDone(); return; }
    updateDots();
    var c = run.chunks[run.i];
    var tts = a1TtsDisponible();

    if (run.step === 1) {
      // PASO 1 · ESCENA — Alfred monta la situación (o el repaso de pasillo).
      setBeat(step1HTML());
      setFoot(primaryBtn('Dale ↓', 'btn-ghost'));
      wireNext(function () { goStep(2); });
      animateBeat();

    } else if (run.step === 2) {
      // PASO 2 · ANTICIPACIÓN — su forma la decide el RUNG (Capa 4): MCQ (caja 1),
      // cloze (caja 2 con frame), producir de memoria (caja 3) o swap (caja 4-5 con
      // frame). Nuevos y escena: "así se dice". El dispatcher vive en la Capa 4.
      paintStep2(c);

    } else if (run.step === 3) {
      // PASO 3 · REVEAL + AUDIO — la ÚNICA frase EN grande de la pantalla.
      var cover = tts ? '' : alfredBlock(['Acá tu celu no la dice en voz alta, pero léela como está en «suena». Igual funciona, tranquilo.']);
      setBeat(revealCardHTML(c, true, tts) + cover);
      setFoot(primaryBtn('Seguir ↓', 'btn-ghost'));
      wireSay();
      wireStar();          // ★ guardar en "Mis frases" (Capa 4)
      wireNext(function () { goStep(4); });
      animateBeat();
      // Suena 1 vez al revelar: el tap de "Ver la frase" ya desbloqueó el TTS móvil.
      if (tts) a1Speak(c.en);

    } else if (run.step === 4) {
      // PASO 4 · EL PORQUÉ — why_es (obligatorio) + molde/swaps + a quién. Sin
      // frase EN grande (los swaps van en chips chicos, es el molde).
      var body4 = alfredBlock([c.why_es]);
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
      setBeat(alfredBlock(['Ahora vos. Repetila en voz alta, como suena. Nadie te oye, dale sin pena.']) +
        revealCardHTML(c, false, tts) + replay);
      setFoot(primaryBtn('Listo, la dije', 'btn-accent'));
      wireSay();
      wireNext(function () { goStep(6); });
      animateBeat();

    } else if (run.step === 6) {
      // PASO 6 · AUTOEVAL — cero castigo. "Todavía no" NEUTRO (jamás coral).
      setBeat(
        alfredBlock(['¿Y qué tal? ¿Te salió?']) +
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
    // Autoeval → MOTOR LEITNER (Capa 3): mueve la caja del chunk y recalcula el due.
    try { a1SrsGrade(c.id, grade); } catch (e) { /* nunca romper el loop */ }
    // "Todavía no" → se re-encola UNA vez más en esta sesión (§4.3): no queda
    // callejón sin salida. Al crecer run.chunks, el chunk reaparece al final.
    if (grade === 'todavia' && run && !run.requeued[c.id]) {
      run.requeued[c.id] = true;
      run.chunks.push(c);
      if (run.meta) run.meta.push(run.meta[run.i]);
    }
    // Repaso: si con esta nota ya quedaron TODOS los chunks de su escena en el SRS,
    // marca la escena hecha → destraba la unidad aun para quien solo repasa.
    if (run && run.mode === 'repaso') {
      var m = run.meta && run.meta[run.i];
      if (m && m.scene) maybeMarkSceneDoneBySrs(m.scene);
    }
    run.phase = 'react';
    run.lastGrade = grade;
    paintReaction();
  }

  function paintReaction() {
    if (!run) return;
    var last = run.i >= run.chunks.length - 1;
    var repaso = run.mode === 'repaso';
    var msg = EVAL_REACT[run.lastGrade] || EVAL_REACT.clavado;
    var clavado = run.lastGrade === 'clavado';
    // Celebración ADULTA del Clavado (§5.8): una insignia lima discreta arriba de
    // la reacción; el micro-pop lo hace GSAP (abajo), siempre detrás de REDUCED.
    setBeat(
      (clavado ? '<div class="rd-a1-celebrate"><span class="rd-a1-celebrate-badge" id="a1-celebrate" aria-hidden="true">✓</span></div>' : '') +
      alfredBlock([msg])
    );
    var label = last
      ? (repaso ? 'Cerrar el repaso ✓' : 'Cerrar la escena ✓')
      : 'Siguiente frase →';
    setFoot(primaryBtn(label, 'btn-accent'));
    wireNext(function () {
      if (last) { finishRun(); }
      else { enterChunk(run.i + 1); }
    });
    animateBeat();
    // Micro-pop lima (escala 1→1.04→1), adulto, sin confeti. Solo si hay GSAP y NO
    // prefers-reduced-motion; si REDUCED, la insignia queda estática (cero motion).
    if (clavado && !A1_REDUCED && window.gsap) {
      try {
        var badge = el('a1-celebrate');
        if (badge) window.gsap.fromTo(badge, { scale: 0.9 }, { scale: 1.04, duration: 0.22, yoyo: true, repeat: 1, ease: 'power2.out' });
      } catch (e) { /* la celebración es cosmética: jamás romper el loop */ }
    }
  }

  // Cierre de la sesión según el modo. En ambos sube la racha (no punitiva, §4.3).
  function finishRun() {
    if (!run) return;
    if (run.mode === 'repaso') repasoComplete();
    else sceneComplete();
  }

  function sceneComplete() {
    if (!run) return;
    markSceneDone(run.sceneId);
    // Escena terminada: al reabrirla arranca de cero (chunkIdx fuera de rango).
    saveProgress({ unitId: run.unitId, sceneId: run.sceneId, chunkIdx: run.chunks.length });
    a1UpdateStreak();          // la racha sube al completar la sesión (clon propio)
    // Capa 4: si con esta escena la unidad quedó COMPLETA y su micro-tarea aún no
    // se hizo, cierra con la tarea TBLT (§4.1/§5.4) en vez del cierre simple.
    var unit = run.unit;
    if (unit && unitScenesDone(unit) && unit.task && !isTaskDone(unit.task.id)) {
      openA1Task(unit);
      return;
    }
    run.phase = 'done';
    paintDone();
  }

  function repasoComplete() {
    if (!run) return;
    a1UpdateStreak();
    run.phase = 'done';
    paintDoneRepaso();
  }

  // Marca la escena hecha cuando TODOS sus chunks (inline o {ref}) ya están en el
  // SRS. Salvaguarda para que el repaso también haga avanzar el desbloqueo.
  function maybeMarkSceneDoneBySrs(scene) {
    if (!scene || !scene.chunks || !scene.chunks.length) return;
    var srs = a1SrsGet();
    var all = scene.chunks.every(function (entry) {
      var id = entry && (entry.ref || entry.id);
      return id ? !!srs[id] : true;
    });
    if (all) markSceneDone(scene.id);
  }

  function paintDone() {
    if (!run) return;
    updateDots();
    // Cierre honesto y cálido (sin confeti de caricatura: la celebración adulta
    // y la micro-tarea TBLT completas llegan en la Capa 4).
    setBeat(alfredBlock([
      'Listo, esa escena la sacaste. Eso hace un rato no lo tenías.',
      'Volvé cuando querás y seguimos con la próxima, sin afán.',
    ]));
    setFoot(primaryBtn('Volver al inicio', 'btn-accent'));
    wireNext(function () { renderA1Home(); });
    animateBeat();
  }

  function paintDoneRepaso() {
    if (!run) return;
    updateDots();
    // Cierre del repaso: refuerza la CAPACIDAD (competencia, no puntos ni racha).
    var m = a1Metrics();
    var lines = ['Listo, ese repaso quedó. Cada vuelta se te pega más, parce.'];
    if (m.salen > 0) lines.push('Ya llevás ' + m.salen + (m.salen === 1 ? ' frase que te sale sola.' : ' frases que te salen solas.'));
    else lines.push('Volvé mañana y seguimos; así es como se pegan.');
    setBeat(alfredBlock(lines));
    setFoot(primaryBtn('Volver al inicio', 'btn-accent'));
    wireNext(function () { renderA1Home(); });
    animateBeat();
  }

  /* ═══════════════════ MOTOR LEITNER · SRS (SPEC §4.3) ═══════════════════
     Memoria espaciada 100% en localStorage (clave rodeo_a1_srs, AISLADA del DNA de
     Gus y FUERA del set de sync). 5 cajas, intervalos [1,3,7,14,30] días.
     Transiciones al autoevaluar:
       Clavado  → box = min(box+1, 5); due = hoy + intervalo[box_nuevo]
       Casi     → caja intacta;        due = hoy + 1
       Todavía  → box = 1;             due = hoy + 1   (+ se re-encola una vez)
     Chunk nuevo: entra en box=1, due=hoy al calificar su primer beat. */

  var A1_INTERVALS = [1, 3, 7, 14, 30];   // índice = box-1 (box 1..5)
  function intervalForBox(box) {
    var b = Math.max(1, Math.min((box | 0) || 1, 5));
    return A1_INTERVALS[b - 1];
  }

  // Fechas 'YYYY-MM-DD' en hora LOCAL: evita el corrimiento de día de
  // new Date('YYYY-MM-DD') (que parsea en UTC). Comparables lexicográficamente.
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function todayStr() { return ymd(new Date()); }
  function parseYmd(s) {
    var p = String(s || '').split('-');
    if (p.length !== 3) return new Date();
    return new Date(+p[0], (+p[1]) - 1, +p[2]);
  }
  function addDays(baseStr, n) { var d = parseYmd(baseStr); d.setDate(d.getDate() + n); return ymd(d); }

  function a1SrsGet() { var s = a1Store.get(K_SRS, {}); return (s && typeof s === 'object') ? s : {}; }
  function a1SrsSet(srs) { a1Store.set(K_SRS, srs); }

  // Califica un chunk → mueve su caja y recalcula el vencimiento (§4.3). Persiste
  // SOLO en rodeo_a1_srs. Devuelve el entry actualizado.
  function a1SrsGrade(chunkId, grade) {
    if (!chunkId) return null;
    var srs = a1SrsGet();
    var today = todayStr();
    var e = srs[chunkId];
    if (!e || typeof e !== 'object') {
      // Chunk nuevo: entra en caja 1, due=hoy, y sobre eso se aplica la nota.
      e = { box: 1, due: today, seen: 0, clavado: 0, casi: 0, no: 0, last: null, firstSeen: today };
    }
    if (!e.box) e.box = 1;
    if (!e.firstSeen) e.firstSeen = today;
    e.seen = (e.seen || 0) + 1;
    e.last = today;

    if (grade === 'clavado') {
      e.clavado = (e.clavado || 0) + 1;
      e.box = Math.min(e.box + 1, 5);
      e.due = addDays(today, intervalForBox(e.box));
    } else if (grade === 'casi') {
      e.casi = (e.casi || 0) + 1;
      // La caja NO cambia (ni sube ni baja); se la vuelve a cobrar mañana.
      e.due = addDays(today, 1);
    } else { // 'todavia'
      e.no = (e.no || 0) + 1;
      e.box = 1;                 // cae a caja 1 (no a "caja 0": ya la conocía)
      e.due = addDays(today, 1); // vuelve mañana suavecita (+ re-encola en la sesión)
    }

    srs[chunkId] = e;
    a1SrsSet(srs);
    return e;
  }
  window.a1SrsGrade = a1SrsGrade;

  // Vencidos: chunks con due <= hoy, ordenados por caja más baja y due más viejo
  // (lo más frágil primero). Solo chunks que aún existen en el contenido.
  function a1SrsDue() {
    var srs = a1SrsGet(); var today = todayStr(); var out = [];
    for (var id in srs) {
      if (!Object.prototype.hasOwnProperty.call(srs, id)) continue;
      var e = srs[id];
      if (!e || !A1_INDEX[id]) continue;
      if (String(e.due) <= today) out.push({ id: id, entry: e, chunk: A1_INDEX[id] });
    }
    out.sort(function (a, b) {
      var d = (a.entry.box || 1) - (b.entry.box || 1);
      if (d !== 0) return d;
      var ad = String(a.entry.due), bd = String(b.entry.due);
      return ad < bd ? -1 : (ad > bd ? 1 : 0);
    });
    return out;
  }
  window.a1SrsDue = a1SrsDue;

  // Métricas HONESTAS (§4.3): "ya te salen solas" = caja>=4 (estrella del Home);
  // "en tu repertorio" = caja>=3; "frescas" = caja 1–2. Solo chunks existentes.
  function a1Metrics() {
    var srs = a1SrsGet(); var salen = 0, repertorio = 0, frescas = 0, total = 0;
    for (var id in srs) {
      if (!Object.prototype.hasOwnProperty.call(srs, id)) continue;
      if (!A1_INDEX[id]) continue;
      var box = srs[id].box || 1; total++;
      if (box >= 4) salen++;
      if (box >= 3) repertorio++;
      if (box <= 2) frescas++;
    }
    return { salen: salen, repertorio: repertorio, frescas: frescas, total: total };
  }
  window.a1Metrics = a1Metrics;

  // Racha PROPIA, no punitiva (rodeo_a1_streak). Clon: JAMÁS la de Gus (esa escribe
  // rodeo_streak y SÍ sincroniza). Sube al completar una sesión; un día saltado no
  // rompe de una — hay un perdón (freezeUsed). Cero "perdiste N días" en rojo.
  function a1UpdateStreak() {
    var s = a1Store.get(K_STREAK, null);
    if (!s || typeof s !== 'object') s = { days: 0, last: null, freezeUsed: false };
    var today = todayStr();
    if (s.last === today) return s;         // ya contó hoy
    var yest = addDays(today, -1);
    if (s.last == null) {
      s.days = 1;                           // primer día
    } else if (s.last === yest) {
      s.days = (s.days || 0) + 1;           // día consecutivo
    } else if (!s.freezeUsed) {
      s.freezeUsed = true;                  // perdón: mantiene viva la racha
      s.days = (s.days || 0) + 1;
    } else {
      s.days = 1; s.freezeUsed = false;     // reinicio SUAVE (sin drama, sin rojo)
    }
    s.last = today;
    a1Store.set(K_STREAK, s);
    return s;
  }
  window.a1UpdateStreak = a1UpdateStreak;

  /* ═══════════════════ SELECCIÓN DE SESIÓN · "Repaso de pasillo" (§4.3) ══════════
     Cola: (1) calentamiento = 1 due de la caja más alta (arranque con victoria; se
     salta si no hay due) · (2) nuevos (según carga) · (3) resto de due con TOPE
     anti-avalancha de 8. Regla de nuevos: due <=4 → +3 · 5–6 → +2 · >=7 → +0. */

  var A1_DUE_CAP = 8;

  function sortedUnits() {
    var A = data(); if (!A || !A.units) return [];
    return A.units.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }
  function unitScenesDone(u) {
    if (!u || !u.scenes || !u.scenes.length) return false;
    var doneS = getProgress().doneScenes || [];
    return u.scenes.every(function (s) { return doneS.indexOf(s.id) !== -1; });
  }
  // Desbloqueo v1 (nota de simplicidad §4.3): la primera y el kit de supervivencia
  // abiertos desde el día 1; el resto se abre al completar las escenas de la unidad
  // anterior. Con survival siempre abierto, "aprendé lo que te salva primero".
  function isUnlocked(unitId) {
    var units = sortedUnits(); var idx = -1;
    for (var i = 0; i < units.length; i++) { if (units[i].id === unitId) { idx = i; break; } }
    if (idx < 0) return false;
    if (idx === 0) return true;
    if (units[idx].survival) return true;
    return unitScenesDone(units[idx - 1]);
  }

  // Nuevos: chunks que aún NO están en el SRS, de unidades desbloqueadas, en orden
  // de currículo (la unidad actual primero). Sin duplicar por refs entre escenas.
  function pickNewChunks(n) {
    if (n <= 0) return [];
    var srs = a1SrsGet(); var out = []; var seen = {};
    var units = sortedUnits();
    for (var ui = 0; ui < units.length && out.length < n; ui++) {
      var u = units[ui];
      if (!isUnlocked(u.id)) continue;
      var scenes = (u.scenes || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      for (var si = 0; si < scenes.length && out.length < n; si++) {
        var chunks = resolveChunks(scenes[si]);
        for (var ci = 0; ci < chunks.length && out.length < n; ci++) {
          var c = chunks[ci];
          if (!c || !c.id || seen[c.id] || srs[c.id]) continue;
          seen[c.id] = true; out.push(c);
        }
      }
    }
    return out;
  }

  function buildRepasoQueue() {
    if (!Object.keys(A1_INDEX).length) buildIndex();
    var due = a1SrsDue();                       // ya ordenado: más frágil primero
    var dueCount = due.length;                  // backlog real (para la regla de nuevos)
    var nNew = dueCount <= 4 ? 3 : (dueCount <= 6 ? 2 : 0);

    // Calentamiento: 1 due de la caja MÁS ALTA de todo el backlog (el más probable
    // de clavar → arranque con victoria). Se saca de la cola antes del tope.
    var rest = due.slice();
    var warm = null;
    if (rest.length) {
      var hi = 0;
      for (var k = 1; k < rest.length; k++) {
        if ((rest[k].entry.box || 1) > (rest[hi].entry.box || 1)) hi = k;
      }
      warm = rest.splice(hi, 1)[0];
    }
    // Tope anti-avalancha: warm + hasta 7 más de los más frágiles = 8 due máximo.
    rest = rest.slice(0, A1_DUE_CAP - (warm ? 1 : 0));

    var news = pickNewChunks(nNew);

    var queue = [];                             // orden §4.3: warm · nuevos · resto due
    if (warm) queue.push({ chunk: warm.chunk, kind: 'due' });
    news.forEach(function (c) { queue.push({ chunk: c, kind: 'new' }); });
    rest.forEach(function (d) { queue.push({ chunk: d.chunk, kind: 'due' }); });
    return { queue: queue, dueCount: dueCount, newCount: news.length };
  }

  /* ═══════════════════ CAPA 4 · RUNGS + MICRO-TAREAS + PULIDO (§4.3/§5) ═════════
     La caja Leitner decide QUÉ TAN DIFÍCIL es el repaso (misma máquina del SRS):
       caja 1          → Reconocer  · MCQ (distractors_es o hermanos)
       caja 2 (frame)  → Completar  · cloze con los swaps
       caja 3          → Producir   · anticipación pura, de memoria
       caja 4-5(frame) → Swap       · el molde con TU situación
     Chunks fijos (frame:null) SALTAN cloze y swap → Reconocer(1) → Producir(≥2).
     Solo aplica al REPASO (kind:'due'); nuevos y escena enseñan completo. Además:
     micro-tarea TBLT de cierre + logro de unidad, celebración adulta, "Mis frases"
     + sheet de detalle, y el 🆘 dentro de la escena. TODO offline, cero red, cero
     claves de Gus (solo rodeo_a1_*), cero saveDNA. */

  var K_SAVED = 'rodeo_a1_saved';   // "Mis frases" (mini-DNA propio, NUNCA rodeo_dna)

  // Normaliza EN pa' comparar (minúsculas, sin puntuación, espacios colapsados).
  function normEn(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[.,?!¡¿]/g, '').replace(/\s+/g, ' ').trim();
  }
  // Baraja (Fisher–Yates) sobre una COPIA — nunca muta el arreglo de datos.
  function a1Shuffle(arr) {
    var a = (arr || []).slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ── El RUNG de un chunk según su caja (§4.3). Solo los due varían; los nuevos y
  //    la escena enseñan completo ('teach'). Los fijos (frame:null) saltan cloze y
  //    swap → producir en su lugar (el motor nunca inventa un hueco que no existe).
  function rungForChunk(c, m) {
    if (!c || !m || m.kind !== 'due') return 'teach';
    var e = a1SrsGet()[c.id];
    var box = (e && e.box) || 1;
    var hasFrame = !!c.frame;
    if (box <= 1) return 'mcq';                            // Reconocer
    // Fijo salta cloze: como producir es "caja ≥3" (§4.3), en caja 2 el fijo sigue
    // en Reconocer (MCQ); el framed sí hace cloze.
    if (box === 2) return hasFrame ? 'cloze' : 'mcq';
    if (box === 3) return 'producir';                      // Producir de memoria
    return hasFrame ? 'swap' : 'producir';                 // caja 4-5; fijo salta swap
  }

  /* ── PASO 2 según el rung. El default ('teach'/'producir') es la anticipación de
     producción original; MCQ/cloze/swap son las variantes de repaso. ── */
  function paintStep2(c) {
    var rung = (run && run.rung) || 'teach';
    if (rung === 'mcq')   return paintStep2Mcq(c);
    if (rung === 'cloze') return paintStep2Cloze(c);
    if (rung === 'swap')  return paintStep2Swap(c);
    var lead = (rung === 'producir')
      ? ['Esta ya la conocés. ¿Cómo era pa\' decir «' + c.es + '»? De memoria, sin mirar.']
      : ['A ver… querés decir «' + c.es + '». ¿Cómo suena en inglés?'];
    lead.push('Probá en voz alta, como te salga. Nadie te oye — ese es el punto.');
    setBeat(alfredBlock(lead));
    setFoot(primaryBtn('👁 Ver la frase', 'btn-accent'));
    wireNext(function () { goStep(3); });
    animateBeat();
  }

  // Hermanos (misma escena, luego misma unidad) → respaldo de distractores del MCQ.
  function siblingEns(c) {
    var out = []; var seen = {};
    function add(list) {
      (list || []).forEach(function (x) {
        if (x && x.id && x.id !== c.id && x.en && !seen[x.id]) { seen[x.id] = true; out.push(x.en); }
      });
    }
    var scene = sceneOfChunk(c); if (scene) add(resolveChunks(scene));
    var unit = A1_UNIT_OF[c.id];
    if (out.length < 3 && unit) (unit.scenes || []).forEach(function (s) { add(resolveChunks(s)); });
    return out;
  }
  // Opciones del MCQ: 1 correcta (c.en) + distractores de distractors_es y, si
  // faltan, de hermanos. Máx 4, barajadas. La correcta SIEMPRE queda incluida.
  function mcqOptions(c) {
    var opts = [{ text: c.en, correct: true }];
    var used = {}; used[normEn(c.en)] = true;
    (c.distractors_es || []).forEach(function (d) {
      if (opts.length >= 4 || !d) return;
      var k = normEn(d); if (used[k]) return;
      used[k] = true; opts.push({ text: d, correct: false });
    });
    if (opts.length < 3) {
      var sibs = siblingEns(c);
      for (var i = 0; i < sibs.length && opts.length < 4; i++) {
        var k2 = normEn(sibs[i]); if (used[k2]) continue;
        used[k2] = true; opts.push({ text: sibs[i], correct: false });
      }
    }
    return a1Shuffle(opts);
  }
  function paintStep2Mcq(c) {
    if (!run.mcq) run.mcq = mcqOptions(c);   // fija las opciones del beat (no re-baraja al repintar)
    var html = alfredBlock(['Esta ya la viste. ¿Cuál era pa\' decir «' + c.es + '»? Sin mirar.']);
    html += '<div class="rd-a1-mcq">';
    run.mcq.forEach(function (o, i) {
      html += '<button type="button" class="rd-a1-mcq-opt" data-mcq="' + i + '" data-ok="' + (o.correct ? '1' : '0') + '">' +
        '<span class="rd-a1-mcq-en font-display">' + esc(o.text) + '</span></button>';
    });
    html += '</div>';
    setBeat(html);
    setFoot('');   // no hay "seguir" hasta que responda
    var beat = el('a1-beat');
    if (beat) beat.querySelectorAll('.rd-a1-mcq-opt').forEach(function (btn) {
      btn.addEventListener('click', function () { onMcqPick(c, btn, btn.getAttribute('data-ok') === '1'); });
    });
    animateBeat();
  }
  function onMcqPick(c, btn, ok) {
    if (run.answered) return; run.answered = true;
    var beat = el('a1-beat');
    if (beat) beat.querySelectorAll('.rd-a1-mcq-opt').forEach(function (b) {
      b.disabled = true;
      if (b.getAttribute('data-ok') === '1') b.classList.add('rd-a1-mcq-opt--ok');   // marca SIEMPRE la correcta
      else if (b === btn && !ok) b.classList.add('rd-a1-mcq-opt--miss');
    });
    finishStep2Feedback(ok,
      ok ? '¡Eso! Esa era. La tenés fresca.' : 'Casi. Era la que quedó marcada — tranquilo, ya te la refresco.',
      'Ver bien la frase ↓', btn);
  }

  // Pieza correcta del cloze: la que reconstruye c.en; si ninguna, swaps[0]
  // (convención de datos: la primera es la pieza propia del chunk).
  function correctSwap(c) {
    var swaps = c.swaps || []; if (!swaps.length) return null;
    var target = normEn(c.en);
    for (var i = 0; i < swaps.length; i++) {
      if (normEn(String(c.frame).replace('___', swaps[i])) === target) return swaps[i];
    }
    return swaps[0];
  }
  function paintStep2Cloze(c) {
    // Salvaguarda: sin hueco real ni fichas no hay cloze → cae a producir (jamás un
    // beat sin salida). El contenido garantiza swaps en toda frame≠null, pero por si.
    if (!c.frame || String(c.frame).indexOf('___') === -1 || !(c.swaps && c.swaps.length)) { run.rung = 'producir'; return paintStep2(c); }
    var correct = correctSwap(c);
    if (!run.cloze) run.cloze = a1Shuffle(c.swaps || []);
    var slot = '<span class="rd-a1-cloze-slot" id="a1-cloze-slot">•••</span>';
    var frameHTML = esc(c.frame).replace('___', slot);   // frame escapado; el slot es markup de confianza
    var html = alfredBlock(['Completá el hueco. ¿Cuál ficha va acá?']);
    html += '<div class="rd-a1-cloze"><span class="rd-a1-cloze-frame font-display">' + frameHTML + '</span></div>';
    html += '<div class="rd-a1-chips">';
    run.cloze.forEach(function (s) {
      html += '<button type="button" class="gloss-chip rd-a1-cloze-chip" data-swap="' + escAttr(s) + '">' + esc(s) + '</button>';
    });
    html += '</div>';
    setBeat(html);
    setFoot('');
    var beat = el('a1-beat');
    if (beat) beat.querySelectorAll('.rd-a1-cloze-chip').forEach(function (btn) {
      btn.addEventListener('click', function () { onClozePick(c, btn, correct); });
    });
    animateBeat();
  }
  function onClozePick(c, btn, correct) {
    if (run.answered) return; run.answered = true;
    var chosen = btn.getAttribute('data-swap');
    var ok = normEn(chosen) === normEn(correct);
    var slot = el('a1-cloze-slot');
    if (slot) { slot.textContent = chosen; slot.classList.add(ok ? 'rd-a1-cloze-slot--ok' : 'rd-a1-cloze-slot--miss'); }
    var beat = el('a1-beat');
    if (beat) beat.querySelectorAll('.rd-a1-cloze-chip').forEach(function (b) {
      b.disabled = true;
      if (b.getAttribute('data-swap') === correct) b.classList.add('rd-a1-cloze-chip--ok');
      else if (b === btn && !ok) b.classList.add('rd-a1-cloze-chip--miss');
    });
    finishStep2Feedback(ok,
      ok ? '¡Eso! Esa pieza va ahí. Así se arma el molde.' : 'Casi. La que iba es «' + correct + '». Fresco, pa\' eso repasamos.',
      'Ver la frase entera ↓', btn);
  }
  // Cierre común del PASO 2 interactivo (MCQ/cloze): reacción de Alfred + micro-pop
  // del acierto (detrás de REDUCED) + botón pa' seguir al reveal. "Miss" NEUTRO.
  function finishStep2Feedback(ok, msg, nextLabel, popEl) {
    var beat = el('a1-beat');
    if (beat) { var r = document.createElement('div'); r.innerHTML = alfredBlock([msg]); if (r.firstChild) beat.appendChild(r.firstChild); }
    setFoot(primaryBtn(nextLabel, 'btn-accent'));
    wireNext(function () { goStep(3); });
    if (ok && !A1_REDUCED && window.gsap && popEl) {
      try { window.gsap.fromTo(popEl, { scale: 1 }, { scale: 1.03, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out' }); } catch (e) {}
    }
  }
  // Rung swap (caja 4-5, con frame): producir con TU situación. Sin nota; el reveal
  // del PASO 3 muestra el ejemplo modelo.
  function paintStep2Swap(c) {
    if (!c.frame) { run.rung = 'producir'; return paintStep2(c); }
    var chips = (c.swaps || []).map(function (s) {
      return '<span class="gloss-chip rd-a1-swap">' + esc(s) + '</span>';
    }).join('');
    var html = alfredBlock([
      'Esta ya te sale. Ahora hacela tuya: cambiá la pieza por lo que sea TU caso.',
      'Mirá el molde, decilo en voz alta con lo tuyo. Después te muestro el ejemplo.',
    ]);
    html += '<div class="rd-a1-molde"><span class="label-mini">Tu molde</span>' +
      '<span class="rd-a1-frame">' + esc(c.frame) + '</span>' +
      (chips ? '<div class="rd-a1-chips">' + chips + '</div>' : '') + '</div>';
    setBeat(html);
    setFoot(primaryBtn('Ya lo dije, ver ejemplo ↓', 'btn-accent'));
    wireNext(function () { goStep(3); });
    animateBeat();
  }

  /* ── "Mis frases" — a1Guardar / store propio (rodeo_a1_saved). JAMÁS saveDNA
     ni rodeo_dna. Dedup por id/en. ── */
  function a1SavedGet() { var s = a1Store.get(K_SAVED, []); return Array.isArray(s) ? s : []; }
  function a1IsSaved(id) { return a1SavedGet().some(function (x) { return x && x.id === id; }); }
  function a1Guardar(item) {
    if (!item || (!item.id && !item.en)) return false;
    var list = a1SavedGet();
    var dup = list.some(function (x) {
      return x && (x.id === item.id || (x.en && item.en && normEn(x.en) === normEn(item.en)));
    });
    if (dup) return true;
    list.push({ id: item.id, en: item.en, es: item.es, why: item.why_es || item.why || '', ts: Date.now() });
    a1Store.set(K_SAVED, list);
    return true;
  }
  window.a1Guardar = a1Guardar;
  function a1Unsave(id) {
    a1Store.set(K_SAVED, a1SavedGet().filter(function (x) { return x && x.id !== id; }));
  }
  function a1ToggleSave(chunk) {
    if (!chunk || !chunk.id) return false;
    if (a1IsSaved(chunk.id)) { a1Unsave(chunk.id); return false; }
    a1Guardar(chunk); return true;
  }
  // Cablea las ★ del beat (guardar/quitar en caliente, sin salir del loop).
  function wireStar() {
    var b = el('a1-beat'); if (!b) return;
    b.querySelectorAll('[data-star]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-star');
        var now = a1ToggleSave(A1_INDEX[id]);
        btn.classList.toggle('rd-a1-star--on', now);
        btn.setAttribute('aria-pressed', now ? 'true' : 'false');
        btn.setAttribute('aria-label', now ? 'Quitar de mis frases' : 'Guardar en mis frases');
        var ic = btn.querySelector('span'); if (ic) ic.textContent = now ? '★' : '☆';
        if (window.toast) window.toast(now ? 'Guardada en tus frases ★' : 'La quité de tus frases');
      });
    });
  }

  // Hoja "Mis frases" (§5.6): lista lo guardado; cada una abre su detalle.
  function openA1Saved() {
    if (typeof window.openSheet !== 'function') {
      if (window.toast) window.toast('Abrí la app con internet una vez y ya queda offline.');
      return;
    }
    if (!Object.keys(A1_INDEX).length) buildIndex();
    var list = a1SavedGet();
    var body;
    if (!list.length) {
      body = '<p class="rd-a1-empty">Todavía no guardaste ninguna. Tocá la ★ en las frases que te gusten y acá te quedan a la mano.</p>';
    } else {
      body = '<div class="rd-a1-saved-list">' + list.slice().reverse().map(function (it) {
        return '<button type="button" class="rd-a1-saved-row" data-detail="' + escAttr(it.id) + '">' +
            '<span class="rd-a1-saved-en font-display">' + esc(it.en) + '</span>' +
            (it.es ? '<span class="rd-a1-saved-es">' + esc(it.es) + '</span>' : '') +
          '</button>';
      }).join('') + '</div>';
    }
    window.openSheet(
      '<p class="rd-eyebrow rd-eyebrow--accent"><span class="rd-eyebrow-rule"></span>★ Mis frases</p>' +
      '<p class="font-display rd-a1-sheet-title">LAS TUYAS<span style="color:var(--accent);">.</span></p>' +
      '<p class="rd-a1-sheet-sub">Las que marcaste pa\' tenerlas a la mano. Tocá una pa\' verla completa.</p>' +
      body +
      '<button type="button" class="btn-accent rd-a1-sheet-close" style="width:100%;margin-top:16px;">Listo</button>'
    );
    var sc = el('sheet-content');
    if (sc) {
      sc.querySelectorAll('.rd-a1-saved-row').forEach(function (b) {
        b.addEventListener('click', function () { openA1ChunkDetail(b.getAttribute('data-detail')); });
      });
      var cl = sc.querySelector('.rd-a1-sheet-close');
      if (cl) cl.addEventListener('click', function () { if (window.closeSheet) window.closeSheet(); });
    }
  }
  window.openA1Saved = openA1Saved;

  // Sheet de detalle de un chunk (§5.6): frase + 🔊 · es · suena · POR QUÉ · EL
  // MOLDE (swaps como gloss-chip) · ¿A QUIÉN? · ¿CUÁNDO? · [★ Guardada][🔁 Repetir].
  function openA1ChunkDetail(id) {
    if (typeof window.openSheet !== 'function') return;
    if (!Object.keys(A1_INDEX).length) buildIndex();
    var c = A1_INDEX[id];
    if (!c) {   // respaldo: si el contenido ya no lo tiene, usa lo guardado (mínimo)
      var sv = a1SavedGet().filter(function (x) { return x && x.id === id; })[0];
      if (sv) c = { id: sv.id, en: sv.en, es: sv.es, why_es: sv.why, sounds_es: '', frame: null, swaps: null, who_es: '', sayWhen_es: '' };
    }
    if (!c) { if (window.toast) window.toast('Esa frase ya no está, parce.'); return; }
    var canTts = a1TtsDisponible();
    var saved = a1IsSaved(c.id);
    var molde = '';
    if (c.frame) {
      var chips = (c.swaps || []).map(function (s) { return '<span class="gloss-chip rd-a1-swap">' + esc(s) + '</span>'; }).join('');
      molde = '<div class="rd-a1-detail-sect"><span class="label-mini">El molde</span>' +
        '<div class="rd-a1-frame" style="margin-top:6px;">' + esc(c.frame) + '</div>' +
        (chips ? '<div class="rd-a1-chips" style="margin-top:8px;">' + chips + '</div>' : '') + '</div>';
    }
    window.openSheet(
      '<div class="rd-a1-detail">' +
        '<div class="slang-card rd-a1-reveal" style="background:var(--card-paper);">' +
          '<div class="rd-a1-reveal-top"><span class="label-mini">La frase</span>' +
            (canTts ? '<button type="button" class="icon-btn rd-a1-say" data-say="' + escAttr(c.en) + '" aria-label="Escuchar la frase"><span aria-hidden="true">🔊</span></button>' : '') +
          '</div>' +
          '<p class="term">' + esc(c.en) + '</p>' +
          (c.es ? '<p class="ex-es">' + esc(c.es) + '</p>' : '') +
          (c.sounds_es ? '<p class="rd-a1-snd">suena: ' + esc(c.sounds_es) + '</p>' : '') +
        '</div>' +
        (c.why_es ? '<div class="rd-a1-detail-sect"><span class="label-mini">Por qué</span><p class="rd-a1-detail-why">' + esc(c.why_es) + '</p></div>' : '') +
        molde +
        (c.who_es ? '<div class="rd-a1-detail-sect"><span class="label-mini">¿A quién?</span><p class="rd-a1-detail-txt">' + esc(c.who_es) + '</p></div>' : '') +
        (c.sayWhen_es ? '<div class="rd-a1-detail-sect"><span class="label-mini">¿Cuándo?</span><p class="rd-a1-detail-txt">' + esc(c.sayWhen_es) + '</p></div>' : '') +
        '<div class="rd-a1-detail-actions">' +
          '<button type="button" class="btn-accent rd-a1-detail-save" data-star="' + escAttr(c.id) + '">' + (saved ? '★ Guardada' : '☆ Guardar') + '</button>' +
          (canTts ? '<button type="button" class="btn-ghost rd-a1-detail-repeat" data-say="' + escAttr(c.en) + '">🔁 Repetir</button>' : '') +
        '</div>' +
      '</div>'
    );
    var sc = el('sheet-content');
    if (sc) {
      sc.querySelectorAll('[data-say]').forEach(function (b) { b.addEventListener('click', function () { a1Speak(b.getAttribute('data-say')); }); });
      var star = sc.querySelector('.rd-a1-detail-save');
      if (star) star.addEventListener('click', function () {
        var now = a1ToggleSave(c);
        star.textContent = now ? '★ Guardada' : '☆ Guardar';
        if (window.toast) window.toast(now ? 'Guardada en tus frases ★' : 'La quité de tus frases');
      });
    }
  }
  window.openA1ChunkDetail = openA1ChunkDetail;

  /* ── Micro-tarea TBLT de cierre (§4.1/§5.4) + logro de unidad (§5.5) ──
     Alfred plantea la meta POR INTENCIÓN (nunca da la frase EN → fuerza recuperación);
     el usuario la dice de memoria y se auto-reporta; Alfred reacciona con la línea
     pre-escrita (reaction_es). Cero IA. Cierre = logro de CAPACIDAD, no puntos. */
  var taskRun = null;
  function isTaskDone(taskId) {
    var p = getProgress();
    return Array.isArray(p.doneTasks) && p.doneTasks.indexOf(taskId) !== -1;
  }
  function markTaskDone(taskId) {
    var p = getProgress();
    if (!Array.isArray(p.doneTasks)) p.doneTasks = [];
    if (taskId && p.doneTasks.indexOf(taskId) === -1) p.doneTasks.push(taskId);
    a1Store.set(K_PROGRESS, p);
  }
  function openA1Task(unit) {
    var task = unit && unit.task;
    var steps = ((task && task.steps) || []).filter(function (st) { return st && A1_INDEX[st.answerChunkId]; });
    if (!task || !steps.length) { unitAchievement(unit); return; }   // sin pasos válidos → directo al logro
    run = null;                       // salimos del loop de chunks; el shell es compartido
    taskRun = { unit: unit, task: task, steps: steps, i: 0, phase: 'intro' };
    if (!paintEscenaShell()) return;
    paintTaskBeat();
  }
  window.openA1Task = openA1Task;
  function taskDots() {
    var d = el('a1-esc-dots');
    if (d && taskRun) d.innerHTML = dotsHTML(Math.min(taskRun.i, taskRun.steps.length - 1), taskRun.steps.length);
  }
  function paintTaskBeat() {
    if (!taskRun) return;
    taskDots();
    var task = taskRun.task;
    if (taskRun.phase === 'intro') {
      setBeat(
        '<div class="mission-card rd-a1-mission"><span class="rd-a1-mission-eyebrow">Tu misión</span>' +
          '<p class="rd-a1-mission-lead">' + esc(task.intro_es) + '</p></div>' +
        alfredBlock(['Sin mirar nada. Yo te digo la situación y vos soltás la frase, de memoria.'])
      );
      setFoot(primaryBtn('Dale, la primera →', 'btn-accent'));
      wireNext(function () { taskRun.phase = 'goal'; taskRun.i = 0; paintTaskBeat(); });
      animateBeat();
      return;
    }
    var step = taskRun.steps[taskRun.i];
    var c = A1_INDEX[step.answerChunkId];
    var tts = a1TtsDisponible();
    if (taskRun.phase === 'goal') {
      // La meta va POR INTENCIÓN en español; JAMÁS la frase EN (fuerza recuperación).
      setBeat(
        '<div class="mission-card rd-a1-mission"><span class="rd-a1-mission-eyebrow">Situación ' + (taskRun.i + 1) + '/' + taskRun.steps.length + '</span>' +
          '<p class="rd-a1-mission-goal">' + esc(step.goal_es) + '</p></div>' +
        alfredBlock(['¿Cómo se lo decís? Dale, en voz alta — de memoria.'])
      );
      setFoot(primaryBtn('Ya lo dije, ver ↓', 'btn-accent'));
      wireNext(function () { taskRun.phase = 'reveal'; paintTaskBeat(); });
      animateBeat();
      return;
    }
    // phase 'reveal': muestra la frase modelo + la reacción pre-escrita de Alfred.
    var last = taskRun.i >= taskRun.steps.length - 1;
    setBeat(revealCardHTML(c, true, tts) + alfredBlock([step.reaction_es]));
    setFoot(primaryBtn(last ? 'Cerrar la misión ✓' : 'Siguiente situación →', 'btn-accent'));
    wireSay(); wireStar();
    wireNext(function () {
      if (last) { markTaskDone(task.id); unitAchievement(taskRun.unit); }
      else { taskRun.i++; taskRun.phase = 'goal'; paintTaskBeat(); }
    });
    if (tts) a1Speak(c.en);
    animateBeat();
  }
  // Cierre de unidad con LOGRO (§5.5): capacidad, no puntos. Sheet de celebración
  // ADULTA (micro-pop lima detrás de REDUCED, sin confeti) + respaldo INLINE en la
  // escena (robusto si cierran el sheet por el backdrop → nunca callejón sin salida).
  function unitAchievement(unit) {
    taskRun = null;
    var done = (unit && unit.task && unit.task.done_es) || 'Ya sabés más que ayer. ✓';
    var m = a1Metrics();
    setBeat(
      '<div class="rd-a1-achieve">' +
        '<div class="rd-a1-achieve-emoji" aria-hidden="true">🎉</div>' +
        '<p class="rd-a1-achieve-title font-display">' + esc(done) + '</p>' +
      '</div>' +
      alfredBlock(['Eso ayer no lo tenías, parce. Mañana seguimos y ya vas con ventaja.'])
    );
    setFoot(primaryBtn('Seguir mañana', 'btn-accent'));
    wireNext(function () { renderA1Home(); });
    animateBeat();
    if (typeof window.openSheet === 'function') {
      var total = Object.keys(A1_INDEX).length || 1;
      var pct = Math.max(0, Math.min(100, Math.round(m.salen / total * 100)));
      window.openSheet(
        '<div class="rd-a1-achieve-sheet">' +
          '<div class="rd-a1-achieve-emoji" id="a1-achieve-pop" aria-hidden="true">🎉</div>' +
          '<p class="rd-eyebrow rd-eyebrow--accent" style="justify-content:center;"><span class="rd-eyebrow-rule"></span>Misión cumplida</p>' +
          '<p class="font-display rd-a1-achieve-title">' + esc(done) + '</p>' +
          '<div class="meter-track" style="margin:14px 0 6px;"><div class="meter-fill" style="width:' + pct + '%;background:var(--accent);"></div></div>' +
          '<p class="rd-a1-achieve-sub">' + (m.salen > 0 ? ('Ya te salen solas <strong>' + m.salen + '</strong>.') : 'Cada vuelta se te van pegando más.') + ' Eso ayer no lo tenías.</p>' +
          '<button type="button" class="btn-accent rd-a1-achieve-close" style="width:100%;margin-top:16px;">Seguir mañana</button>' +
        '</div>'
      );
      var sc = el('sheet-content');
      if (sc) {
        var cl = sc.querySelector('.rd-a1-achieve-close');
        if (cl) cl.addEventListener('click', function () { if (window.closeSheet) window.closeSheet(); renderA1Home(); });
        if (!A1_REDUCED && window.gsap) {
          try { window.gsap.fromTo('#a1-achieve-pop', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' }); } catch (e) {}
        }
      }
    }
  }

  // Índice listo al cargar (el contenido carga ANTES que este archivo).
  buildIndex();
})();
