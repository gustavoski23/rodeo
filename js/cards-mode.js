/* ═══════════════════════════════════════════════════════════════════════════
   RODEO — RÉTAME (mazo de micro-tarjetas)
   Autocontenido, mismo patrón que js/story-mode.js: inyecta su CSS, expone
   window.openRetame() y habla con la app SOLO por window.rodeoCardsBridge
   ({ speak, toast, saveDNA, updateStreak, getDNA }) que define index.html.

   4 formatos de tarjeta (datos en window.CARDS_PACKS, js/cards-pack-*.js):
   · lex   — contraste léxico (rust → rusty): el sufijo cambia el trabajo
   · fix   — incorrecto→correcto: calcos del español (rojo = SOLO error)
   · chunk — expresión hecha + fonética española (tap = la voz la dice)
   · quiz  — 3 opciones, un poquito retador; fallo → entra al DNA

   El mazo mezcla el pack curado (menos vistas primero) con tarjetas armadas
   al vuelo desde el DNA del usuario (sus errores → tarjetas fix personales).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var USO_KEY = 'rodeo_cards_uso';   // { [id]: { v: veces vista, ok: veces clavada } }

  var CM = {
    open: false,
    deck: [],
    idx: 0,
    ok: 0,
    again: 0,
    runId: 0,        // invalida timers en vuelo tras cerrar (patrón de story-mode)
    timers: [],
    resolved: false, // la tarjeta actual ya se resolvió (quiz contestado / swipe hecho)
    pushed: false    // hicimos pushState (botón atrás de Android cierra el mazo)
  };

  function schedule(fn, ms) { var t = setTimeout(fn, ms); CM.timers.push(t); return t; }
  function clearTimers() { CM.timers.forEach(clearTimeout); CM.timers = []; }

  function bridge() { return window.rodeoCardsBridge || {}; }
  function decir(txt) { var b = bridge(); if (b.speak && txt) b.speak(txt); }
  function vibrar(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function leerUso() {
    try { return JSON.parse(localStorage.getItem(USO_KEY)) || {}; } catch (e) { return {}; }
  }
  function marcarUso(id, clavada) {
    if (!id) return;
    var uso = leerUso();
    var u = uso[id] || { v: 0, ok: 0 };
    u.v += 1; if (clavada) u.ok += 1;
    uso[id] = u;
    try { localStorage.setItem(USO_KEY, JSON.stringify(uso)); } catch (e) {}
  }

  // ---------------------------------------------------------
  // CSS (scoped bajo #retameOverlay + .cm-launch del home)
  // Solo tokens de RODEO. Animaciones: transform/opacity, nunca layout.
  // ---------------------------------------------------------
  function injectCSS() {
    if (document.getElementById('cards-mode-css')) return;
    var css = [
      // Botón de lanzamiento (vive en el home de TALK, estilo sticker-CTA)
      '.cm-launch{display:flex;flex-direction:column;gap:6px;text-align:left;width:100%;',
      '  background:var(--bg-surface);border:1px solid var(--glass-border);border-radius:22px;',
      '  padding:18px 84px 18px 20px;cursor:pointer;color:var(--text-primary);',
      '  transition:transform 140ms ease;position:relative;overflow:hidden}',
      '.cm-launch:active{transform:scale(0.97)}',
      ".cm-launch-eyebrow{font-family:'Space Mono',monospace;font-size:0.62rem;font-weight:700;",
      '  letter-spacing:0.16em;text-transform:uppercase;color:var(--accent)}',
      '.cm-launch-title{font-size:1.7rem;line-height:0.94}',
      '.cm-launch-sub{font-size:0.85rem;color:var(--text-secondary)}',
      '.cm-launch-cartas{position:absolute;right:14px;top:50%;transform:translateY(-50%) rotate(8deg);',
      '  width:44px;height:58px;border-radius:9px;background:var(--card-yellow);opacity:0.92;',
      '  box-shadow:-10px 4px 0 -2px var(--card-blue),-20px 8px 0 -4px var(--card-coral)}',

      // Overlay
      '#retameOverlay{position:fixed;inset:0;z-index:880;display:none;background:var(--bg-void)}',
      // Sin retardo/zoom por doble-tap en los controles táctiles (touch-action
      // no se hereda: hay que declararlo en cada blanco de tap — auditoría UX)
      '#retameOverlay button,#retameOverlay .cm-tap-en{touch-action:manipulation}',
      '#retameOverlay.show{display:flex;flex-direction:column}',
      '.cm-top{display:flex;align-items:center;justify-content:space-between;',
      '  padding:calc(14px + env(safe-area-inset-top)) 18px 10px}',
      ".cm-progress{font-family:'Space Mono',monospace;font-size:0.68rem;font-weight:700;",
      '  letter-spacing:0.12em;color:var(--text-muted)}',
      '.cm-close{width:38px;height:38px;border-radius:50%;border:1px solid var(--glass-border);',
      '  background:var(--bg-surface);color:var(--text-secondary);font-size:1.05rem;line-height:1;',
      '  display:flex;align-items:center;justify-content:center;cursor:pointer}',
      '.cm-close:active{transform:scale(0.94)}',

      // Zona del mazo: la tarjeta actual + la siguiente asomando debajo
      '.cm-stage{position:relative;flex:1;min-height:0;display:flex;align-items:center;',
      '  justify-content:center;padding:6px 20px 14px}',
      '.cm-card{position:absolute;width:min(92vw,400px);max-height:78vh;overflow-y:auto;',
      '  border-radius:26px;padding:26px 24px 24px;color:var(--card-ink);',
      '  box-shadow:var(--sticker-shadow);touch-action:pan-y;',
      '  display:flex;flex-direction:column;gap:14px;will-change:transform;',
      '  transition:transform 340ms cubic-bezier(.2,.9,.3,1.1),opacity 300ms ease}',
      '.cm-card.cm-under{transform:scale(0.94) translateY(14px);opacity:0.75;pointer-events:none}',
      '.cm-card.cm-dragging{transition:none;cursor:grabbing}',
      '.cm-card.cm-fly-r{transform:translateX(120vw) rotate(16deg)!important;opacity:0}',
      '.cm-card.cm-fly-l{transform:translateX(-120vw) rotate(-16deg)!important;opacity:0}',
      '.cm-card.cm-pop{animation:cmPop 380ms cubic-bezier(.2,.9,.3,1.15) both}',
      '@keyframes cmPop{from{transform:scale(0.92) translateY(22px);opacity:0}',
      '  to{transform:scale(1) translateY(0);opacity:1}}',
      // Colores pastel (texto SIEMPRE --card-ink: fondos claros)
      '.cm-c-blue{background:var(--card-blue)}.cm-c-lavender{background:var(--card-lavender)}',
      '.cm-c-green{background:var(--card-green)}.cm-c-yellow{background:var(--card-yellow)}',
      '.cm-c-coral{background:var(--card-coral)}.cm-c-peach{background:var(--card-peach)}',
      '.cm-c-paper{background:var(--card-paper)}',

      // Piezas internas de tarjeta
      ".cm-eyebrow{font-family:'Space Mono',monospace;font-size:0.6rem;font-weight:700;",
      '  letter-spacing:0.16em;text-transform:uppercase;color:var(--card-ink-soft)}',
      ".cm-fon{font-family:'Space Mono',monospace;font-size:0.82rem;color:var(--card-ink-soft)}",
      '.cm-why{font-size:0.86rem;line-height:1.45;color:var(--card-ink-soft)}',
      '.cm-tap-en{cursor:pointer}',
      // lex — dos columnas con divisor
      '.cm-lex-cols{display:flex;align-items:stretch;gap:14px}',
      '.cm-lex-col{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}',
      '.cm-lex-div{width:2px;border-radius:2px;background:var(--card-ink);opacity:0.16}',
      ".cm-lex-word{font-family:'Archivo',sans-serif;font-weight:800;font-size:1.9rem;",
      '  letter-spacing:-0.03em;line-height:0.96;overflow-wrap:anywhere}',
      '.cm-suf{color:var(--swap-new)}',
      '.cm-lex-es{font-size:0.85rem;color:var(--card-ink-soft)}',
      '.cm-frase-box{border-top:1.5px dashed var(--card-ink);border-top-color:color-mix(in oklch,var(--card-ink) 25%,transparent);',
      '  padding-top:12px;display:flex;flex-direction:column;gap:3px}',
      '.cm-frase{font-size:1.02rem;font-weight:600}',
      '.cm-frase-es{font-size:0.85rem;font-style:italic;color:var(--card-ink-soft)}',
      // fix — fila mala / fila buena
      '.cm-fix-row{display:flex;gap:10px;align-items:flex-start;border-radius:14px;padding:11px 13px}',
      '.cm-fix-row p{font-size:1.02rem;font-weight:600;line-height:1.3;margin:0}',
      '.cm-fix-mal{background:oklch(100% 0 0 / 0.4)}',
      '.cm-fix-mal p{color:var(--swap-old);text-decoration:line-through;text-decoration-thickness:1.5px}',
      '.cm-fix-bien{background:oklch(100% 0 0 / 0.55)}',
      '.cm-fix-bien p{color:var(--swap-new)}',
      ".cm-fix-badge{font-family:'Space Mono',monospace;font-weight:700;font-size:0.8rem;flex-shrink:0;padding-top:2px}",
      '.cm-fix-mal .cm-fix-badge{color:var(--swap-old)}',
      '.cm-fix-bien .cm-fix-badge{color:var(--swap-new)}',
      // chunk — frase grande
      ".cm-chunk{font-family:'Archivo',sans-serif;font-weight:800;font-size:1.75rem;",
      '  letter-spacing:-0.03em;line-height:1.02;overflow-wrap:anywhere}',
      '.cm-chunk-es{font-size:1rem;font-weight:600}',
      '.cm-ctx{font-size:0.85rem;font-style:italic;color:var(--card-ink-soft)}',
      // quiz — opciones
      '.cm-quiz-q{font-size:1.12rem;font-weight:700;line-height:1.3}',
      '.cm-opt{display:block;width:100%;text-align:left;border-radius:14px;padding:12px 14px;',
      '  background:oklch(100% 0 0 / 0.45);border:2px solid transparent;color:var(--card-ink);',
      '  font-size:0.98rem;font-weight:600;cursor:pointer;transition:transform 120ms ease}',
      '.cm-opt:active{transform:scale(0.98)}',
      '.cm-opt.ok{border-color:var(--swap-new);color:var(--swap-new);background:oklch(100% 0 0 / 0.6)}',
      '.cm-opt.bad{border-color:var(--swap-old);color:var(--swap-old);animation:cmShake 320ms ease}',
      '.cm-opt:disabled{cursor:default;opacity:1}',
      '@keyframes cmShake{20%{transform:translateX(-6px)}45%{transform:translateX(5px)}',
      '  70%{transform:translateX(-3px)}100%{transform:translateX(0)}}',
      // etiquetas de arrastre (aparecen con el gesto)
      ".cm-drag-tag{position:absolute;top:18px;font-family:'Space Mono',monospace;font-weight:700;",
      '  font-size:0.72rem;letter-spacing:0.12em;padding:7px 12px;border-radius:100px;opacity:0;',
      '  pointer-events:none;transform:rotate(-4deg)}',
      '.cm-tag-se{right:16px;background:var(--accent);color:var(--accent-ink)}',
      '.cm-tag-rep{left:16px;background:var(--warn);color:oklch(24% 0.05 92);transform:rotate(4deg)}',
      // chip de audio
      '.cm-audio{align-self:flex-start;display:inline-flex;align-items:center;gap:7px;',
      "  font-family:'Space Mono',monospace;font-size:0.66rem;font-weight:700;letter-spacing:0.1em;",
      '  border:1.5px solid var(--card-ink);border-radius:100px;padding:6px 12px;cursor:pointer;',
      '  background:transparent;color:var(--card-ink)}',
      '.cm-audio:active{transform:scale(0.95)}',
      // dock de acciones inferiores
      '.cm-dock{display:flex;gap:10px;justify-content:center;align-items:center;',
      '  padding:6px 20px calc(18px + env(safe-area-inset-bottom))}',
      '.cm-act{flex:1;max-width:170px;min-height:50px;border-radius:100px;font-weight:700;',
      "  font-size:0.82rem;font-family:'Space Mono',monospace;letter-spacing:0.06em;cursor:pointer;",
      '  transition:transform 130ms ease}',
      '.cm-act:active{transform:scale(0.95)}',
      '.cm-act-rep{background:transparent;border:1.5px solid var(--glass-border);color:var(--text-secondary)}',
      '.cm-act-se{background:var(--accent);border:none;color:var(--accent-ink)}',
      '.cm-dock.cm-quizmode .cm-act{visibility:hidden}',
      // cierre del mazo
      '.cm-end{display:flex;flex-direction:column;align-items:center;justify-content:center;',
      '  gap:14px;flex:1;padding:24px;text-align:center}',
      ".cm-end-num{font-family:'Archivo',sans-serif;font-weight:800;font-size:4rem;",
      '  line-height:1;color:var(--accent)}',
      '.cm-end-label{font-size:1rem;color:var(--text-secondary);max-width:280px;line-height:1.5}',
      ".cm-end-racha{font-family:'Space Mono',monospace;font-size:0.72rem;font-weight:700;",
      '  letter-spacing:0.14em;text-transform:uppercase;color:var(--warn)}',
      '@media (prefers-reduced-motion: reduce){.cm-card,.cm-card.cm-pop,.cm-opt.bad{animation:none!important;transition:opacity 200ms ease}}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'cards-mode-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ---------------------------------------------------------
  // Mazo: pack curado (menos vistas primero) + tarjetas del DNA
  // ---------------------------------------------------------
  function cartasDelPack(n) {
    var packs = window.CARDS_PACKS || [];
    var todas = [];
    packs.forEach(function (p) { (p.cards || []).forEach(function (c) { todas.push(c); }); });
    var uso = leerUso();
    // Menos vistas primero; a igual vistas, azar. Las ya clavadas 2+ veces al final.
    todas.sort(function (a, b) {
      var ua = uso[a.id] || { v: 0, ok: 0 }, ub = uso[b.id] || { v: 0, ok: 0 };
      var da = (ua.ok >= 2 ? 100 : 0) + ua.v, db = (ub.ok >= 2 ? 100 : 0) + ub.v;
      return (da - db) || (Math.random() - 0.5);
    });
    return todas.slice(0, n);
  }

  function cartasDelDNA(max) {
    var b = bridge();
    var dna = (b.getDNA && b.getDNA()) || [];
    var out = [];
    // Errores recientes → tarjetas fix personales (lo más valioso del mazo)
    dna.filter(function (d) { return d.type === 'error' && d.quote && d.fix; })
      .slice(0, 2)
      .forEach(function (d) {
        out.push({ id: null, fmt: 'fix', color: 'paper', dna: true, mal: d.quote, bien: d.fix, why_es: d.why || '' });
      });
    // Un slang guardado → tarjeta chunk (sin fonética: no la tenemos)
    dna.filter(function (d) { return d.type === 'slang' && d.term; })
      .slice(0, 1)
      .forEach(function (d) {
        out.push({ id: null, fmt: 'chunk', color: 'peach', dna: true, chunk: d.term, es: d.meaning || '', ctx_es: d.example || '' });
      });
    return out.slice(0, max);
  }

  function armarMazo() {
    var TAM = 10;
    var delDNA = cartasDelDNA(3);
    var delPack = cartasDelPack(TAM - delDNA.length);
    // CLONAR cada carta: el mazo escribe estado efímero (_reenc) y las cartas
    // del pack son objetos compartidos de window.CARDS_PACKS — mutarlos
    // quemaría el re-encolado de esa carta para toda la sesión (auditoría).
    var mazo = delPack.concat(delDNA).map(function (c) { return Object.assign({}, c); });
    // Barajar (Fisher-Yates)
    for (var i = mazo.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = mazo[i]; mazo[i] = mazo[j]; mazo[j] = t;
    }
    // Que la primera no sea quiz: el mazo abre con dopamina, no con examen
    if (mazo.length > 1 && mazo[0].fmt === 'quiz') {
      for (var k = 1; k < mazo.length; k++) {
        if (mazo[k].fmt !== 'quiz') { var s = mazo[0]; mazo[0] = mazo[k]; mazo[k] = s; break; }
      }
    }
    return mazo;
  }

  // ---------------------------------------------------------
  // Render de tarjetas (4 formatos)
  // ---------------------------------------------------------
  function textoTTS(c) {
    if (c.fmt === 'lex') return c.frase || ((c.d_pre || '') + (c.d_suf || ''));
    if (c.fmt === 'fix') return c.bien;
    if (c.fmt === 'chunk') return c.chunk;
    if (c.fmt === 'quiz') return c.opts && c.opts[c.correct];
    return '';
  }

  function htmlTarjeta(c) {
    var color = 'cm-c-' + (c.color || 'paper');
    var origen = c.dna ? 'DE TU DNA · ' : '';
    var inner = '';
    if (c.fmt === 'lex') {
      inner =
        '<p class="cm-eyebrow">' + origen + 'contraste · la palabrita cambia de trabajo</p>' +
        '<div class="cm-lex-cols">' +
          '<div class="cm-lex-col">' +
            '<p class="cm-lex-word">' + esc(c.base) + '</p>' +
            '<p class="cm-lex-es">' + esc(c.base_es) + '</p>' +
            (c.fon_base ? '<p class="cm-fon">/' + esc(c.fon_base) + '/</p>' : '') +
          '</div>' +
          '<div class="cm-lex-div"></div>' +
          '<div class="cm-lex-col">' +
            '<p class="cm-lex-word">' + esc(c.d_pre) + '<span class="cm-suf">' + esc(c.d_suf) + '</span></p>' +
            '<p class="cm-lex-es">' + esc(c.derived_es) + '</p>' +
            (c.fon_derived ? '<p class="cm-fon">/' + esc(c.fon_derived) + '/</p>' : '') +
          '</div>' +
        '</div>' +
        '<div class="cm-frase-box cm-tap-en" data-tts="frase">' +
          '<p class="cm-frase">' + esc(c.frase) + '</p>' +
          '<p class="cm-frase-es">' + esc(c.frase_es) + '</p>' +
        '</div>' +
        '<button class="cm-audio" type="button" data-tts="frase">&#9654; escúchala</button>';
    } else if (c.fmt === 'fix') {
      inner =
        '<p class="cm-eyebrow">' + origen + 'así no · así sí</p>' +
        '<div class="cm-fix-row cm-fix-mal"><span class="cm-fix-badge">✗</span><p>' + esc(c.mal) + '</p></div>' +
        '<div class="cm-fix-row cm-fix-bien cm-tap-en" data-tts="bien"><span class="cm-fix-badge">✓</span><p>' + esc(c.bien) + '</p></div>' +
        (c.fon_bien ? '<p class="cm-fon">/' + esc(c.fon_bien) + '/</p>' : '') +
        (c.why_es ? '<p class="cm-why">' + esc(c.why_es) + '</p>' : '') +
        '<button class="cm-audio" type="button" data-tts="bien">&#9654; dila bien</button>';
    } else if (c.fmt === 'chunk') {
      inner =
        '<p class="cm-eyebrow">' + origen + 'dilo así</p>' +
        '<p class="cm-chunk cm-tap-en" data-tts="chunk">' + esc(c.chunk) + '</p>' +
        (c.fon_es ? '<p class="cm-fon">/' + esc(c.fon_es) + '/</p>' : '') +
        '<p class="cm-chunk-es">= ' + esc(c.es) + '</p>' +
        (c.ctx_es ? '<p class="cm-ctx">' + esc(c.ctx_es) + '</p>' : '') +
        '<button class="cm-audio" type="button" data-tts="chunk">&#9654; escúchala</button>';
    } else if (c.fmt === 'quiz') {
      var opts = (c.opts || []).map(function (o, i) {
        return '<button class="cm-opt" type="button" data-i="' + i + '">' + esc(o) + '</button>';
      }).join('');
      inner =
        '<p class="cm-eyebrow">reto · piénsala</p>' +
        '<p class="cm-quiz-q">' + esc(c.q) + '</p>' +
        opts +
        '<p class="cm-why hidden">' + esc(c.why_es || '') + '</p>';
    }
    return '<div class="cm-card ' + color + '">' +
      '<span class="cm-drag-tag cm-tag-se">ME LA SÉ</span>' +
      '<span class="cm-drag-tag cm-tag-rep">REPASAR</span>' +
      inner + '</div>';
  }

  // ---------------------------------------------------------
  // Overlay + ciclo del mazo
  // ---------------------------------------------------------
  function ensureOverlay() {
    var ov = document.getElementById('retameOverlay');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'retameOverlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Rétame — mazo de tarjetas');
    ov.innerHTML =
      '<div class="cm-top">' +
        '<span class="cm-progress" id="cm-progress"></span>' +
        '<button class="cm-close" id="cm-close" type="button" aria-label="Cerrar el mazo">✕</button>' +
      '</div>' +
      '<div class="cm-stage" id="cm-stage"></div>' +
      '<div class="cm-dock" id="cm-dock">' +
        '<button class="cm-act cm-act-rep" id="cm-rep" type="button">REPASAR</button>' +
        '<button class="cm-act cm-act-se" id="cm-se" type="button">ME LA SÉ</button>' +
      '</div>';
    document.body.appendChild(ov);
    ov.querySelector('#cm-close').addEventListener('click', function () { cerrarRetame(); });
    ov.querySelector('#cm-rep').addEventListener('click', function () { resolver(false, 'btn'); });
    ov.querySelector('#cm-se').addEventListener('click', function () { resolver(true, 'btn'); });
    return ov;
  }

  function pintarProgreso() {
    var el = document.getElementById('cm-progress');
    if (el) el.textContent = Math.min(CM.idx + 1, CM.deck.length) + ' / ' + CM.deck.length;
  }

  function cartaActual() { return CM.deck[CM.idx]; }

  function pintarCarta() {
    var stage = document.getElementById('cm-stage');
    var dock = document.getElementById('cm-dock');
    if (!stage) return;
    var c = cartaActual();
    if (!c) { pintarCierre(); return; }
    CM.resolved = false;
    pintarProgreso();

    var next = CM.deck[CM.idx + 1];
    stage.innerHTML = (next ? htmlTarjeta(next) : '') + htmlTarjeta(c);
    var cards = stage.querySelectorAll('.cm-card');
    var top = cards[cards.length - 1];
    if (next) cards[0].classList.add('cm-under');
    if (!REDUCED) top.classList.add('cm-pop');

    // Quiz: se resuelve tocando una opción; sin swipe ni botones del dock
    var esQuiz = c.fmt === 'quiz';
    dock.classList.toggle('cm-quizmode', esQuiz);
    if (esQuiz) wireQuiz(top, c);
    else wireSwipe(top);

    // TTS: chip de audio + tap sobre el texto EN. Si el "tap" fue en realidad
    // el final de un arrastre (drag empieza sobre el texto), no debe sonar.
    top.querySelectorAll('[data-tts]').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (CM.dragEndTs && Date.now() - CM.dragEndTs < 400) return;
        decir(textoTTS(c));
      });
    });
  }

  function wireQuiz(cardEl, c) {
    var opts = cardEl.querySelectorAll('.cm-opt');
    opts.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (CM.resolved) return;
        CM.resolved = true;
        var i = parseInt(btn.dataset.i, 10);
        var acierto = i === c.correct;
        opts.forEach(function (b) { b.disabled = true; });
        var why = cardEl.querySelector('.cm-why');
        if (why && why.textContent.trim()) why.classList.remove('hidden');
        if (acierto) {
          btn.classList.add('ok');
          vibrar(18);
          decir(c.opts[c.correct]);
        } else {
          btn.classList.add('bad');
          if (opts[c.correct]) opts[c.correct].classList.add('ok');
          vibrar([12, 60, 12]);
          // El fallo entra al DNA: el repaso se lo cobra después (igual que TALK)
          var b = bridge();
          if (b.saveDNA) b.saveDNA({ type: 'error', quote: c.opts[i], fix: c.opts[c.correct], why: c.why_es || '' });
        }
        marcarUso(c.id, acierto);
        if (acierto) CM.ok += 1; else CM.again += 1;
        var run = CM.runId;
        schedule(function () { if (run === CM.runId) avanzar(); }, acierto ? 1500 : 2600);
      });
    });
  }

  function resolver(clavada, origen) {
    var c = cartaActual();
    if (!c || CM.resolved || c.fmt === 'quiz') return;
    CM.resolved = true;
    marcarUso(c.id, clavada);
    if (clavada) { CM.ok += 1; vibrar(14); }
    else {
      CM.again += 1;
      // "Repasar" re-encola la tarjeta al final UNA vez: la vuelves a ver ya mismo
      if (!c._reenc) { c._reenc = true; CM.deck.push(c); }
    }
    var stage = document.getElementById('cm-stage');
    var cards = stage ? stage.querySelectorAll('.cm-card') : [];
    var top = cards[cards.length - 1];
    if (top && !REDUCED && origen !== 'swipe-done') top.classList.add(clavada ? 'cm-fly-r' : 'cm-fly-l');
    var run = CM.runId;
    schedule(function () { if (run === CM.runId) avanzar(); }, REDUCED ? 40 : 300);
  }

  function avanzar() {
    CM.idx += 1;
    if (CM.idx >= CM.deck.length) pintarCierre();
    else pintarCarta();
  }

  function pintarCierre() {
    var stage = document.getElementById('cm-stage');
    var dock = document.getElementById('cm-dock');
    if (!stage) return;
    var b = bridge();
    if (b.updateStreak) b.updateStreak();   // el mazo completo cuenta para la racha
    var el = document.getElementById('cm-progress');
    if (el) el.textContent = 'mazo completo';
    dock.classList.add('cm-quizmode');      // esconde REPASAR / ME LA SÉ
    stage.innerHTML =
      '<div class="cm-end">' +
        '<p class="cm-end-racha">racha alimentada 🔥</p>' +
        '<p class="cm-end-num">' + CM.ok + '</p>' +
        '<p class="cm-end-label">' + CM.ok + ' clavada' + (CM.ok === 1 ? '' : 's') +
          (CM.again ? ' · ' + CM.again + ' para repasar (ya viven en tu DNA)' : ' · mazo limpio') + '</p>' +
        '<button class="btn-accent" id="cm-otra" style="padding:14px 30px;min-height:50px;">OTRO MAZO</button>' +
        '<button class="btn-ghost" id="cm-listo" style="min-height:44px;padding:10px 22px;">listo por hoy</button>' +
      '</div>';
    var otra = document.getElementById('cm-otra');
    var listo = document.getElementById('cm-listo');
    if (otra) otra.addEventListener('click', function () { arrancarMazo(); });
    if (listo) listo.addEventListener('click', function () { cerrarRetame(); });
  }

  // ---------------------------------------------------------
  // Swipe (pointer events; solo transform, sin layout)
  // ---------------------------------------------------------
  function wireSwipe(el) {
    var startX = 0, startY = 0, dx = 0, activo = false, capturado = false;
    var tagSe = el.querySelector('.cm-tag-se');
    var tagRep = el.querySelector('.cm-tag-rep');

    el.addEventListener('pointerdown', function (e) {
      if (CM.resolved) return;
      // Solo los BOTONES quedan fuera del gesto. El texto EN (data-tts) sí deja
      // arrancar el arrastre — es donde el dedo agarra la carta por instinto —
      // y su tap se distingue del drag por el umbral de 12px (auditoría UX).
      if (e.target.closest('.cm-audio,button')) return;
      activo = true; capturado = false;
      startX = e.clientX; startY = e.clientY; dx = 0;
    });
    el.addEventListener('pointermove', function (e) {
      if (!activo || CM.resolved) return;
      dx = e.clientX - startX;
      var dy = e.clientY - startY;
      // El gesto es horizontal; el scroll vertical de la tarjeta sigue vivo
      if (!capturado) {
        if (Math.abs(dx) < 12 || Math.abs(dy) > Math.abs(dx)) return;
        capturado = true;
        el.classList.add('cm-dragging');
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
      }
      el.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 22) + 'deg)';
      var f = Math.min(Math.abs(dx) / 110, 1);
      if (tagSe) tagSe.style.opacity = dx > 0 ? f : 0;
      if (tagRep) tagRep.style.opacity = dx < 0 ? f : 0;
    });
    function soltar() {
      if (!activo) return;
      activo = false;
      el.classList.remove('cm-dragging');
      if (!capturado) return;
      // Hubo arrastre real: silenciar el click que el navegador dispara tras el
      // pointerup, para que soltar la carta sobre el texto EN no lance el TTS.
      CM.dragEndTs = Date.now();
      if (Math.abs(dx) > 90) {
        el.classList.add(dx > 0 ? 'cm-fly-r' : 'cm-fly-l');
        resolver(dx > 0, 'swipe-done');
      } else {
        el.style.transform = '';
        if (tagSe) tagSe.style.opacity = 0;
        if (tagRep) tagRep.style.opacity = 0;
      }
    }
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
  }

  // ---------------------------------------------------------
  // Abrir / cerrar
  // ---------------------------------------------------------
  function arrancarMazo() {
    CM.deck = armarMazo();
    CM.idx = 0; CM.ok = 0; CM.again = 0;
    if (!CM.deck.length) {
      var b = bridge();
      if (b.toast) b.toast('Aún no hay tarjetas — habla en TALK y vuelve');
      cerrarRetame();
      return;
    }
    pintarCarta();
  }

  function openRetame() {
    if (CM.open) return;
    injectCSS();
    var ov = ensureOverlay();
    CM.open = true;
    CM.runId += 1;
    ov.classList.add('show');
    // Botón atrás de Android: cierra el mazo, no la PWA (patrón de story-mode)
    if (!history.state || !history.state.retame) {
      try { history.pushState({ retame: true }, ''); CM.pushed = true; } catch (e) { CM.pushed = false; }
    }
    arrancarMazo();
  }

  function cerrarRetame(desdePop) {
    if (!CM.open) return;
    CM.open = false;
    CM.runId += 1;
    clearTimers();
    var ov = document.getElementById('retameOverlay');
    if (ov) ov.classList.remove('show');
    if (CM.pushed && !desdePop) {
      CM.pushed = false;
      try { history.back(); } catch (e) {}
    } else {
      CM.pushed = false;
    }
  }

  window.addEventListener('popstate', function () {
    if (CM.open) { CM.pushed = false; cerrarRetame(true); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && CM.open) cerrarRetame();
  });

  // Lanzadores (delegación: los botones viven en el HTML de index)
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('#retame-btn, #retame-btn-dna');
    if (btn) openRetame();
  });

  // CSS al cargar: el botón .cm-launch del home necesita sus estilos ya
  injectCSS();

  window.openRetame = openRetame;
  window.closeRetame = cerrarRetame;
})();
