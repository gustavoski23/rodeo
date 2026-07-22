// ============================================================
// STORY MODE — Reproductor de novela visual (Immersion)
// ============================================================
// Player cinemático para episodios del Story Mode de LinguaAI.
// - Carga un episodio estático desde window.STORY_EPISODES (ver story-episodes.js)
// - Reproduce diálogo secuencial con burbujas animadas
// - Muestra popups flotantes de vocabulario (tips nativos)
// - En escenas user_input: evalúa la respuesta con IA (Puter.js claude-sonnet-4-5,
//   con fallback a la IA on-device local-ai.js) y ramifica la historia según
//   la "strength" devuelta por la IA
// - Pantalla de resumen al final
//
// Contrato con el dashboard (igual que los demás módulos del engine):
//   window.openStoryImmersion()   -> abre el overlay y arranca el episodio
//   window.closeStoryImmersion()  -> cierra el overlay
//   overlay: #storyImmersionOverlay  (creado on-demand si no existe en el HTML)

(function () {
  'use strict';

  var DEFAULT_EPISODE_ID = 'princess_001';
  var AI_MODEL = 'claude-sonnet-4-5';
  var SCENE_VISUAL_CONFIG = {
    s1_arrival: { kenBurns: 'kb-center', effects: [] },
    s2_first_interaction: { kenBurns: 'kb-center', effects: [], continuesPreviousZoom: true },
    s3_merchant_backing_down: { kenBurns: 'kb-face-zoom', effects: ['vignette-dark'] },
    s3_merchant_pushes_back: { kenBurns: 'kb-face-zoom', effects: ['vignette-dark'] },
    s3_merchant_walks_away_threat: { kenBurns: 'kb-face-zoom', effects: ['vignette-dark'] },
    s4_second_interaction: { kenBurns: 'kb-pan-thought', effects: [] },
    s5_deal_closed: { kenBurns: 'kb-relax', effects: [] },
    s5_deal_closed_smaller_win: { kenBurns: 'kb-relax', effects: [] },
    s5_merchant_offended: { kenBurns: 'kb-face-zoom', effects: ['shake-impact'] },
    s6_choice_point: { kenBurns: 'kb-pullback', effects: ['vignette-warm'] }
  };
  var SCENE_BUBBLE_DELAY_MS = 200;

  // Estado del player
  var SM = {
    episode: null,
    scenesById: {},
    sceneId: null,
    lines: [],        // líneas de diálogo activas (narrative o setup_dialogue)
    lineIndex: 0,
    awaitingInput: false,
    busy: false,
    lastUserText: '',
    results: [],      // [{strength, naturalness_score}] por interacción
    vocab: [],        // [{word, ...tip}] recolectado de popups
    popupTimer: null,
    history: [],      // [{sceneId, lineIndex}] para el botón "Atrás"
    currentLine: null, // última línea hablada (para "repetir audio")
    prevBg: '',       // ruta de la imagen de fondo anterior (para el cross-fade)
    prevSceneId: '',
    bubbleDelay: 0,
    bubbleStack: [],
    transitioning: false,
    timers: [],       // timeouts de la orquestación de transición (cancelables)
    // runId: token de sesión. Sube en cada open/close para que evaluaciones
    // en vuelo (storyEvaluate → Puter/local, 10-30s) que llegan DESPUÉS de
    // cerrar el episodio no pinten un panel obsoleto ni dejen SM.busy=true.
    runId: 0,
    dnaSaved: false
  };

  // Timers de transición cancelables (para no dejar callbacks colgando al cerrar)
  function schedule(fn, ms) { var t = setTimeout(fn, ms); SM.timers.push(t); return t; }
  function clearTimers() { SM.timers.forEach(clearTimeout); SM.timers = []; }

  // ---------------------------------------------------------
  // CSS (scoped bajo .story-imm) — inyectado una sola vez
  // ---------------------------------------------------------
  function injectCSS() {
    if (document.getElementById('story-imm-css')) return;
    var css = [
      // Inter (variable font) — sirve todo el peso 100..900 desde un archivo
      "@font-face{font-family:'InterStory';font-style:normal;font-weight:100 900;font-display:swap;" +
        "src:url('fonts/Inter-Variable.ttf') format('truetype-variations'),url('fonts/Inter-Variable.ttf') format('truetype')}",
      "@font-face{font-family:'InterStory';font-style:italic;font-weight:100 900;font-display:swap;" +
        "src:url('fonts/Inter-Italic-Variable.ttf') format('truetype-variations'),url('fonts/Inter-Italic-Variable.ttf') format('truetype')}",
      '#storyImmersionOverlay{position:fixed;inset:0;z-index:900;display:none}',
      '#storyImmersionOverlay.show{display:block}',
      '.story-imm{position:absolute;inset:0;overflow:hidden;',
      "  font-family:'InterStory',system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif;color:#f4ece0;",
      '  letter-spacing:-0.01em;background:#0d0b14}',
      // Fondo de escena (gradiente placeholder segun ilustracion)
      '.si-bg{position:absolute;inset:0;transition:background 900ms ease;z-index:0}',
      '.si-bg.bg-market{background:radial-gradient(120% 90% at 70% 20%,#caa66a 0%,#7a5a32 38%,#3a2a18 78%,#1c1410 100%)}',
      '.si-bg.bg-tense{background:radial-gradient(120% 90% at 50% 30%,#5c4a52 0%,#3a2c38 42%,#211826 80%,#120d16 100%)}',
      '.si-bg.bg-deal{background:radial-gradient(120% 90% at 60% 25%,#e6c878 0%,#a8842f 38%,#5a3f17 78%,#2a1d0d 100%)}',
      '.si-bg.bg-neutral{background:radial-gradient(120% 90% at 50% 20%,#2a2536 0%,#1a1626 55%,#0d0b14 100%)}',
      // Imagen de fondo real (object-fit cover, centrada). Cross-fade al entrar.
      '.si-bgimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:1}',
      '.si-bgimg.in{animation:siBgIn 700ms ease both}',
      // Overlay oscuro UNIFORME sobre la imagen (legibilidad del texto)
      '.si-img-overlay{position:absolute;inset:0;z-index:2;pointer-events:none;background:rgba(0,0,0,0.22)}',
      // Textura/vineta suave encima del fondo
      '.si-vignette{position:absolute;inset:0;z-index:2;pointer-events:none;',
      '  background:radial-gradient(80% 70% at 50% 35%,transparent 40%,rgba(0,0,0,0.55) 100%);',
      '  box-shadow:inset 0 -120px 160px rgba(0,0,0,0.65)}',
      // Personajes (siluetas placeholder)
      '.si-actors{position:absolute;left:0;right:0;bottom:160px;top:64px;z-index:3;display:flex;',
      '  align-items:flex-end;justify-content:center;gap:8vw;pointer-events:none}',
      '.si-actor{width:170px;height:62%;border-radius:90px 90px 24px 24px;opacity:0.92;',
      '  filter:drop-shadow(0 18px 30px rgba(0,0,0,0.5));animation:siActorIn 700ms cubic-bezier(.2,.7,.2,1) both}',
      '.si-actor.princess{background:linear-gradient(180deg,#f1d9e6 0%,#caa0c4 45%,#7d5a86 100%)}',
      '.si-actor.merchant{background:linear-gradient(180deg,#d8c39a 0%,#a07a44 45%,#5a3f22 100%)}',
      '.si-actor .si-actor-head{width:78px;height:78px;border-radius:50%;margin:18px auto 0;',
      '  background:rgba(255,255,255,0.22)}',
      '.si-actor.speaking{animation:siActorSpeak 1.6s ease-in-out infinite;opacity:1}',
      '.si-actor.dim{opacity:0.45;filter:drop-shadow(0 18px 30px rgba(0,0,0,0.5)) brightness(0.7)}',
      // Topbar
      '.si-topbar{position:absolute;top:0;left:0;right:0;z-index:6;display:flex;align-items:center;',
      '  gap:14px;padding:14px 18px;background:linear-gradient(180deg,rgba(0,0,0,0.55),transparent)}',
      '.si-eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#d9b97e;font-weight:700}',
      '.si-title{font-size:15px;font-weight:600;color:#f4ece0;line-height:1.2}',
      '.si-title small{display:block;font-size:11px;font-weight:400;color:#b9ad9b}',
      '.si-progress{flex:1;height:5px;border-radius:99px;background:rgba(255,255,255,0.14);overflow:hidden;max-width:340px}',
      '.si-progress-fill{height:100%;background:linear-gradient(90deg,#d9b97e,#e8d3a0);width:0;transition:width 500ms ease}',
      '.si-close{margin-left:auto;width:38px;height:38px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.25);',
      '  background:rgba(0,0,0,0.35);color:#f4ece0;font-size:18px;cursor:pointer;display:grid;place-items:center;',
      '  transition:background .2s,transform .2s}',
      '.si-close:hover{background:rgba(255,255,255,0.16);transform:scale(1.06)}',
      // Boton de icono (mute/unmute)
      '.si-iconbtn{width:38px;height:38px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.25);',
      '  background:rgba(0,0,0,0.35);color:#f4ece0;cursor:pointer;display:grid;place-items:center;',
      '  transition:background .2s,transform .2s}',
      '.si-iconbtn:hover{background:rgba(255,255,255,0.16);transform:scale(1.06)}',
      '.si-iconbtn[aria-pressed="true"]{color:#e88296;border-color:rgba(232,130,150,0.5)}',
      '.si-iconbtn .material-symbols-rounded{font-size:21px}',
      // Indicador de "hablando" (onda de sonido junto al nombre del personaje)
      '.si-wave{display:none;align-items:flex-end;gap:2px;height:13px;margin-left:9px;vertical-align:middle}',
      '.si-inner.speaking .si-wave{display:inline-flex}',
      '.si-wave i{width:3px;height:5px;background:#e8c982;border-radius:2px;display:inline-block;',
      '  animation:siWave 0.9s ease-in-out infinite}',
      '.si-wave i:nth-child(2){animation-delay:0.15s}',
      '.si-wave i:nth-child(3){animation-delay:0.3s}',
      // Zona inferior de dialogo
      '.si-dialogue{position:absolute;left:0;right:0;bottom:0;z-index:5;padding:0 0 52px;',
      '  background:linear-gradient(180deg,transparent,rgba(8,6,12,0.78) 38%,rgba(8,6,12,0.94))}',
      '.si-inner{max-width:880px;margin:0 auto;padding:0 24px}',
      '.si-speaker{font-size:13px;letter-spacing:.04em;font-weight:700;color:#e8c982;margin:0 0 8px;text-transform:uppercase}',
      '.si-bubble{font-family:"InterStory",system-ui,sans-serif;font-size:25px;line-height:1.42;',
      '  color:#fbf6ec;margin:0;text-shadow:0 2px 14px rgba(0,0,0,0.6);min-height:1.4em;',
      '  animation:siFade 520ms ease both}',
      '.si-k-word{display:inline-block;position:relative;transition:color 140ms ease,opacity 140ms ease,transform 140ms ease,text-shadow 140ms ease}',
      '.si-k-word.done{color:#e8c982;opacity:.92}',
      '.si-k-word.active{color:#fff4bf;opacity:1;transform:translateY(-2px) scale(1.035);',
      '  text-shadow:0 0 18px rgba(232,201,130,.55),0 2px 14px rgba(0,0,0,.65)}',
      '.si-bubble.karaoke-on .si-k-word:not(.done):not(.active){opacity:.72}',
      // Boton de ojito para revelar la traduccion
      '.si-eye{margin-top:14px;display:inline-flex;align-items:center;gap:7px;cursor:pointer;font:inherit;',
      '  font-size:13px;font-weight:600;color:#e8c982;background:rgba(255,255,255,0.06);',
      '  border:1px solid rgba(217,185,126,0.35);border-radius:99px;padding:6px 14px;',
      '  transition:background .2s,transform .15s,color .2s}',
      '.si-eye:hover{background:rgba(217,185,126,0.18);transform:translateY(-1px)}',
      '.si-eye .material-symbols-rounded{font-size:18px;line-height:1}',
      '.si-eye.open{color:#fbf6ec;background:rgba(217,185,126,0.22)}',
      '.si-sub{font-size:16.5px;line-height:1.5;color:#bcb1a0;margin:12px 0 0;font-style:italic}',
      '.si-sub.reveal{animation:siFade 320ms ease both}',
      '.si-sub[hidden]{display:none}',
      '.si-narration .si-bubble{font-style:italic;color:#e7ddcb;font-size:22px;text-align:center}',
      '.si-narration .si-speaker{text-align:center;color:#bca97e}',
      '.si-thought .si-bubble{font-style:italic;color:#cfc6f0}',
      '.si-thought .si-speaker{color:#b3a6e6}',
      // Boton siguiente
      '.si-next{margin-top:20px;display:flex;align-items:center;gap:10px;justify-content:flex-end}',
      '.si-hint-line{margin-right:auto;font-size:12px;color:#8d8473}',
      '.si-btn{font:inherit;font-size:15px;font-weight:600;cursor:pointer;border-radius:99px;padding:11px 24px;',
      '  border:1.5px solid transparent;transition:transform .15s,box-shadow .2s,background .2s}',
      '.si-btn.primary{background:linear-gradient(180deg,#ecd6a4,#d9b97e);color:#33260f;box-shadow:0 6px 18px rgba(0,0,0,0.4)}',
      '.si-btn.primary:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(0,0,0,0.5)}',
      '.si-btn.ghost{background:rgba(255,255,255,0.06);color:#f4ece0;border-color:rgba(255,255,255,0.2)}',
      '.si-btn.ghost:hover{background:rgba(255,255,255,0.14)}',
      '.si-btn:disabled{opacity:.5;cursor:default;transform:none}',
      // Zona de input del usuario
      '.si-input-card{margin-top:6px;background:rgba(18,14,26,0.78);border:1px solid rgba(217,185,126,0.28);',
      '  border-radius:18px;padding:18px 20px;backdrop-filter:blur(6px);animation:siRise 520ms ease both}',
      '.si-prompt{font-size:16px;color:#f4ece0;margin:0 0 6px;font-weight:600}',
      '.si-hint{font-size:13px;color:#cdbf9a;margin:0 0 12px;display:flex;gap:7px;align-items:flex-start}',
      '.si-hint b{color:#e8c982;font-weight:700}',
      '.si-vocab-tags{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 12px}',
      '.si-tag{font-size:12px;padding:4px 11px;border-radius:99px;background:rgba(217,185,126,0.16);',
      '  color:#e8c982;border:1px solid rgba(217,185,126,0.3)}',
      '.si-textarea{width:100%;box-sizing:border-box;min-height:70px;resize:vertical;font:inherit;font-size:16px;',
      '  color:#fbf6ec;background:rgba(0,0,0,0.35);border:1.5px solid rgba(255,255,255,0.18);border-radius:12px;',
      '  padding:12px 14px;line-height:1.45}',
      '.si-textarea:focus{outline:none;border-color:#d9b97e;box-shadow:0 0 0 3px rgba(217,185,126,0.18)}',
      '.si-input-row{display:flex;align-items:center;gap:12px;margin-top:12px}',
      '.si-input-row .si-spacer{flex:1}',
      '.si-mode{font-size:11px;color:#8d8473}',
      // Spinner
      '.si-spinner{width:18px;height:18px;border-radius:50%;border:2.5px solid rgba(255,255,255,0.25);',
      '  border-top-color:#e8c982;animation:siSpin .8s linear infinite;display:inline-block;vertical-align:-3px}',
      // Popup de vocabulario flotante
      '.si-vocab-popup{position:absolute;top:84px;right:26px;z-index:8;width:330px;max-width:calc(100vw - 52px);',
      '  background:linear-gradient(180deg,rgba(36,28,18,0.97),rgba(24,18,12,0.97));',
      '  border:1px solid rgba(217,185,126,0.5);border-radius:16px;padding:16px 18px;',
      '  box-shadow:0 22px 50px rgba(0,0,0,0.55);animation:siPopIn 420ms cubic-bezier(.2,.8,.25,1) both}',
      '.si-vocab-popup.out{animation:siPopOut 320ms ease both}',
      '.si-vp-label{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#d9b97e;font-weight:700;margin:0 0 4px}',
      '.si-vp-word{font-family:"InterStory",system-ui,sans-serif;font-size:23px;color:#fbf6ec;margin:0 0 2px;font-weight:700}',
      '.si-vp-meaning{font-size:14px;color:#e6c98a;margin:0 0 10px}',
      '.si-vp-block{font-size:13.5px;line-height:1.5;color:#ded3c0;margin:0 0 9px}',
      '.si-vp-block b{color:#f1e6cf}',
      '.si-vp-close{position:absolute;top:9px;right:11px;background:none;border:none;color:#b9ad9b;font-size:16px;cursor:pointer}',
      // Panel de correccion
      '.si-correction{margin-top:14px;border-radius:18px;padding:18px 20px;animation:siRise 520ms ease both;',
      '  background:rgba(18,14,26,0.86);border:1px solid rgba(255,255,255,0.12)}',
      '.si-corr-head{display:flex;align-items:center;gap:10px;margin:0 0 12px}',
      '.si-badge{font-size:12px;font-weight:700;letter-spacing:.04em;padding:5px 13px;border-radius:99px;text-transform:uppercase}',
      '.si-badge.strong{background:rgba(106,191,105,0.2);color:#9ee59a;border:1px solid rgba(106,191,105,0.45)}',
      '.si-badge.weak{background:rgba(232,201,130,0.18);color:#ecd6a4;border:1px solid rgba(232,201,130,0.45)}',
      '.si-badge.incorrect{background:rgba(232,130,150,0.18);color:#f0a7b6;border:1px solid rgba(232,130,150,0.45)}',
      '.si-stars{font-size:14px;color:#e8c982;letter-spacing:2px}',
      '.si-corr-source{margin-left:auto;font-size:11px;color:#7c7464}',
      '.si-corr-sec{margin:0 0 12px}',
      '.si-corr-sec h4{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#cdbf9a;margin:0 0 5px;font-weight:700}',
      '.si-corr-sec p{margin:0;font-size:14.5px;line-height:1.5;color:#e9dfcd}',
      '.si-native{font-family:"InterStory",system-ui,sans-serif;font-size:17px;color:#fbf6ec;font-style:italic}',
      '.si-gerr{background:rgba(0,0,0,0.28);border-left:3px solid #e88296;border-radius:8px;padding:8px 12px;margin:0 0 8px}',
      '.si-gerr .o{color:#f0a7b6;text-decoration:line-through}',
      '.si-gerr .c{color:#9ee59a;font-weight:600}',
      '.si-gerr .x{display:block;font-size:13px;color:#cabda9;margin-top:3px}',
      '.si-encourage{font-size:14px;color:#e6c98a;margin:0;font-style:italic}',
      // Error de IA
      '.si-aierr{margin-top:14px;background:rgba(40,20,26,0.9);border:1px solid rgba(232,130,150,0.4);',
      '  border-radius:16px;padding:18px 20px;animation:siRise 420ms ease both}',
      '.si-aierr h4{margin:0 0 6px;font-size:15px;color:#f0a7b6}',
      '.si-aierr p{margin:0 0 14px;font-size:13.5px;color:#d6c3c8;line-height:1.5}',
      // Resumen final
      '.si-summary{position:absolute;inset:0;z-index:7;overflow:auto;display:flex;align-items:center;justify-content:center;',
      '  padding:40px 20px;background:radial-gradient(100% 90% at 50% 0%,#241a2e,#0d0b14 70%)}',
      '.si-sum-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0;animation:siBgIn 700ms ease both}',
      '.si-sum-ovl{position:absolute;inset:0;z-index:1;background:rgba(13,11,20,0.62)}',
      '.si-sum-card{position:relative;z-index:2;width:100%;max-width:620px;text-align:center;animation:siRise 600ms ease both}',
      '.si-sum-eyebrow{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#d9b97e;font-weight:700}',
      '.si-sum-title{font-family:"InterStory",system-ui,sans-serif;font-size:34px;color:#fbf6ec;margin:6px 0 18px}',
      '.si-sum-stats{display:flex;gap:14px;justify-content:center;margin:0 0 26px;flex-wrap:wrap}',
      '.si-stat{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:14px;',
      '  padding:14px 22px;min-width:96px}',
      '.si-stat b{display:block;font-size:30px;color:#e8c982;font-family:"InterStory",system-ui,sans-serif}',
      '.si-stat span{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#a99e8d}',
      '.si-words{text-align:left;margin:0 0 26px}',
      '.si-words h3{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#cdbf9a;margin:0 0 12px}',
      '.si-word{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;',
      '  padding:13px 16px;margin:0 0 10px}',
      '.si-word b{font-family:"InterStory",system-ui,sans-serif;font-size:18px;color:#fbf6ec}',
      '.si-word .ctx{display:block;font-size:13px;color:#9a9486;font-style:italic;margin:2px 0 6px}',
      '.si-word .tip{display:block;font-size:14px;color:#e9dfcd;line-height:1.45}',
      '.si-sum-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}',
      // Keyframes (fill-mode both para que el contenido NUNCA quede oculto)
      '@keyframes siFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
      '@keyframes siRise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}',
      '@keyframes siPopIn{from{opacity:0;transform:translateY(-10px) scale(.96)}to{opacity:1;transform:none}}',
      '@keyframes siPopOut{to{opacity:0;transform:translateY(-10px) scale(.96)}}',
      '@keyframes siActorIn{from{opacity:0;transform:translateY(40px)}to{opacity:.92;transform:none}}',
      '@keyframes siActorSpeak{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}',
      '@keyframes siSpin{to{transform:rotate(360deg)}}',
      '@keyframes siWave{0%,100%{height:4px}50%{height:13px}}',
      '@keyframes siBgIn{from{opacity:0}to{opacity:1}}',
      // Responsive
      // Stack de burbujas: los bloques anteriores se atenúan y se apagan los
      // botones internos (siguiente / traducción). Sin estas reglas, hasta 4
      // burbujas quedaban apiladas OPACAS con sus botones vivos, y el usuario
      // podía disparar acciones sobre una línea que ya no es la actual.
      '.si-bubble-block{transition:opacity .3s ease}',
      '.si-bubble-block.dimmed{opacity:.35;pointer-events:none}',
      '.si-bubble-block.dimmed .si-next,.si-bubble-block.dimmed .si-eye{display:none}',
      '.si-bubble-block.leaving{opacity:0;transition:opacity .4s ease;pointer-events:none}',
      // Móvil: el popup de vocabulario tenía top:auto+bottom:auto → caía sobre
      // la topbar (X, mute, progreso). Ahora ancla arriba bajo la topbar (~68px)
      // o abajo sobre la zona de diálogo, según qué media query aplique.
      '@media(max-width:680px){.si-bubble{font-size:21px}.si-actors{gap:14vw;bottom:200px}',
      '  .si-actor{width:120px}.si-vocab-popup{top:72px;right:12px;left:12px;width:auto;max-width:none}}',
      // Reduced motion
      '@media(prefers-reduced-motion:reduce){.story-imm .si-bgimg[class*="story-anim--kb-"],.story-imm .si-bg-layer.story-anim--shake,.story-imm .si-wave i{animation:none!important;transform:none!important}.story-imm .si-bgimg.in{animation-duration:200ms!important}.story-imm .si-bubble,.story-imm .si-sub.reveal{animation:siBgIn 200ms ease both!important}}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'story-imm-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ---------------------------------------------------------
  // Overlay lifecycle
  // ---------------------------------------------------------
  function ensureOverlay() {
    var ov = document.getElementById('storyImmersionOverlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'storyImmersionOverlay';
      document.body.appendChild(ov);
    }
    return ov;
  }

  // episodeId es opcional; sin argumento usa el episodio por defecto (la card
  // antigua que llama openStoryImmersion() sin args sigue funcionando igual).
  function openStoryImmersion(episodeId) {
    if (typeof closeAllOverlays === 'function') {
      try { closeAllOverlays(); } catch (e) {}
    }
    injectCSS();
    var id = (typeof episodeId === 'string' && episodeId) ? episodeId : DEFAULT_EPISODE_ID;
    var ep = (window.STORY_EPISODES || {})[id];
    if (!ep) {
      if (typeof showToast === 'function') showToast('No se pudo cargar el episodio.', 'error');
      return;
    }
    SM.episode = ep;
    SM.scenesById = {};
    (ep.scenes || []).forEach(function (s) { SM.scenesById[s.scene_id] = s; });
    SM.results = [];
    SM.vocab = [];
    SM.dnaSaved = false;
    SM.history = [];
    SM.currentLine = null;
    SM.prevBg = '';
    SM.prevSceneId = '';
    SM.bubbleDelay = 0;
    SM.bubbleStack = [];
    SM.transitioning = false;
    SM.busy = false;              // reset por si un run anterior murió con evaluación en vuelo
    SM.lastUserText = '';         // sin esto el textarea aparece prellenado con la respuesta del run anterior
    SM.runId++;                   // cualquier callback pendiente del run viejo se descarta al chequear runId
    clearTimers();
    var ov = ensureOverlay();
    ov.classList.add('show');
    document.body.style.overflow = 'hidden';
    // Precarga best-effort: el cross-fade entre escenas puede terminar antes
    // de que el JPG (180-310 KB) exista, dejando un flash en blanco. Sin
    // await ni onerror: si falla, el <img> normal reintenta al pintar.
    (ep.scenes || []).forEach(function (s) {
      var p = s && s.background_illustration;
      if (typeof p === 'string' && p.indexOf('/') >= 0) { var im = new Image(); im.src = p; }
    });
    // Android back = cerrar episodio, no cerrar la PWA entera. Marcamos la
    // entrada con un flag para saber que fue empujada por nosotros y no
    // recursar al llamar history.back() en el close manual.
    try { history.pushState({ storyImm: true }, ''); } catch (e) {}
    gotoScene(ep.start_scene || (ep.scenes[0] && ep.scenes[0].scene_id));
  }

  function closeStoryImmersion() {
    var ov = document.getElementById('storyImmersionOverlay');
    var estaba = !!(ov && ov.classList.contains('show'));
    if (ov) ov.classList.remove('show');
    document.body.style.overflow = '';
    clearPopupTimer();
    clearTimers();
    stopSpeaking();
    SM.runId++;                   // invalida callbacks pendientes de este run
    SM.busy = false;
    SM.lastUserText = '';
    // Consumimos la entrada del history que empujamos al abrir, SOLO si el
    // cierre no vino del popstate (allí el navegador ya se la comió).
    if (estaba && history.state && history.state.storyImm) {
      try { history.back(); } catch (e) {}
    }
  }

  // Botón "atrás" de Android: pop de la entrada storyImm → cerrar el
  // episodio en vez de tumbar la PWA entera.
  window.addEventListener('popstate', function () {
    var ov = document.getElementById('storyImmersionOverlay');
    if (ov && ov.classList.contains('show')) {
      // El navegador ya consumió la entrada; cerramos sin re-hacer history.back
      SM.runId++;
      ov.classList.remove('show');
      document.body.style.overflow = '';
      clearPopupTimer();
      clearTimers();
      stopSpeaking();
      SM.busy = false;
      SM.lastUserText = '';
    }
  });

  // ---------------------------------------------------------
  // Navegacion de escenas
  // ---------------------------------------------------------
  function loadSceneLines(scene) {
    if (!scene) return [];
    return scene.type === 'user_input' ? (scene.setup_dialogue || []) : (scene.dialogue || []);
  }

  function sceneImagePath(scene) {
    return isImagePath(scene && scene.background_illustration) ? scene.background_illustration : '';
  }

  // resetHistory=true se usa al tomar una rama tras una interacción, para que
  // "Atrás" no pueda volver a meterse en una respuesta ya contestada.
  function gotoScene(id, resetHistory) {
    if (SM.transitioning) return;
    var scene = SM.scenesById[id];
    if (!scene) {
      console.warn('[story-mode] escena no encontrada:', id);
      renderSummary(); // failsafe: terminar limpio
      return;
    }
    stopSpeaking();
    clearTimers();
    clearPopupTimer();
    if (resetHistory) SM.history = [];

    var oldSceneId = SM.sceneId;
    var oldBg = SM.prevBg;
    var newBg = sceneImagePath(scene);
    var hasLiveStage = !!document.querySelector('#storyImmersionOverlay .story-imm');
    var sameImage = !!(hasLiveStage && oldBg && newBg && oldBg === newBg);

    if (!hasLiveStage || !oldSceneId) {
      enterScene(scene, sameImage);
      return;
    }

    SM.transitioning = true;
    fadeOutBubbles(400);
    schedule(function () {
      enterScene(scene, sameImage);
      SM.transitioning = false;
    }, 400);
  }

  function enterScene(scene, sameImage) {
    SM.sceneId = scene.scene_id;
    SM.lineIndex = 0;
    SM.awaitingInput = false;
    SM.bubbleStack = [];
    SM.bubbleDelay = sameImage ? 0 : SCENE_BUBBLE_DELAY_MS;

    if (scene.type === 'narrative' || scene.type === 'user_input') {
      SM.lines = loadSceneLines(scene);
      renderStage(scene, sameImage);
    } else if (scene.type === 'extension_offer') {
      renderSummary();
    } else {
      renderSummary();
    }
  }

  // Retrocede a la línea de diálogo anterior (si hay historial).
  function goBack() {
    if (!SM.history.length) return;
    var snap = SM.history.pop();
    var scene = SM.scenesById[snap.sceneId];
    if (!scene) return;
    stopSpeaking();
    clearPopupTimer();
    SM.sceneId = snap.sceneId;
    SM.lines = loadSceneLines(scene);
    SM.lineIndex = snap.lineIndex;
    SM.awaitingInput = false;
    renderStage(scene); // repinta escenario completo y la línea restaurada
  }

  function sceneIndex() {
    var ids = (SM.episode.scenes || []).map(function (s) { return s.scene_id; });
    return ids.indexOf(SM.sceneId);
  }
  function progressPct() {
    var total = (SM.episode.scenes || []).length || 1;
    return Math.min(100, Math.round(((sceneIndex() + 1) / total) * 100));
  }

  function bgClassFor(name) {
    name = (name || '').toLowerCase();
    if (name.indexOf('market') >= 0) return 'bg-market';
    if (name.indexOf('handshake') >= 0 || name.indexOf('deal') >= 0) return 'bg-deal';
    if (name.indexOf('sweat') >= 0 || name.indexOf('tense') >= 0) return 'bg-tense';
    return 'bg-neutral';
  }

  function speakerLabel(speaker) {
    var m = {
      narrator: 'Narrador',
      merchant: 'Maestro Aldric',
      suspect: 'Sospechoso',
      detective: 'Detective Morgan',
      princess: (SM.episode.meta && SM.episode.meta.character_name) || 'Princesa Eleanor',
      princess_inner_thought: ((SM.episode.meta && SM.episode.meta.character_name) || 'Princesa') + ' — pensamiento'
    };
    return m[speaker] || speaker || '';
  }

  function getSpeakerStyle(speakerKey) {
    var key = (speakerKey || '').toLowerCase();
    var map = {
      narrator: { side: 'center', color: '', type: 'narrator' },
      princess: { side: 'left', color: '#C8A96E', type: 'protagonist' },
      princess_inner_thought: { side: 'center', color: '', type: 'thought' },
      merchant: { side: 'right', color: '#8B3A3A', type: 'antagonist' },
      suspect: { side: 'right', color: '#8B3A3A', type: 'antagonist' },
      detective: { side: 'left', color: '#2C3E50', type: 'authority' }
    };
    return map[key] || { side: 'left', color: '#C8A96E', type: 'speaker' };
  }

  function speakerClassFor(style) {
    if (!style) return 'story-speaker--left';
    if (style.type === 'narrator') return 'story-speaker--narrator';
    if (style.type === 'thought') return 'story-speaker--thought';
    return style.side === 'right' ? 'story-speaker--right' : 'story-speaker--left';
  }

  function sceneVisualConfig(scene) {
    return SCENE_VISUAL_CONFIG[scene && scene.scene_id] || { kenBurns: 'kb-center', effects: [] };
  }

  function visualEffectClasses(scene) {
    var cfg = sceneVisualConfig(scene);
    return (cfg.effects || []).filter(function (e) { return e !== 'shake-impact'; })
      .map(function (e) { return 'story-anim--' + e; }).join(' ');
  }

  function hasSceneEffect(scene, effect) {
    var cfg = sceneVisualConfig(scene);
    return (cfg.effects || []).indexOf(effect) >= 0;
  }

  // ---------------------------------------------------------
  // Render del escenario (fondo + actores + topbar + diálogo)
  // ---------------------------------------------------------
  // ¿El campo background_illustration es una ruta de imagen real (contiene "/")
  // o un nombre placeholder heredado (p.ej. "merchant_sweating.png")?
  function isImagePath(s) { return typeof s === 'string' && s.indexOf('/') >= 0; }

  function renderStage(scene, sameImage) {
    var ov = ensureOverlay();
    var meta = SM.episode.meta || {};
    var imgPath = sceneImagePath(scene);
    var hasImage = !!imgPath;
    // Con imagen real, el gradiente queda solo como fallback (dorado). Sin imagen,
    // se usa el gradiente que corresponda al nombre placeholder.
    var bg = hasImage ? 'bg-market' : bgClassFor(scene.background_illustration);
    var actors = scene.characters_on_screen || [];
    var prev = SM.prevBg;
    var cfg = sceneVisualConfig(scene);
    var kbClass = cfg.kenBurns ? ' story-anim--' + cfg.kenBurns : '';
    var fxClass = visualEffectClasses(scene);
    var shakeClass = hasSceneEffect(scene, 'shake-impact') ? ' story-anim--shake' : '';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var bgLayers =
      '<div class="si-bg-layer' + shakeClass + '">' +
      '<div class="si-bg ' + bg + '"></div>' +
      (hasImage
        ? ((!sameImage && prev && prev !== imgPath)
            ? '<img class="si-bgimg si-bgimg--old" src="' + esc(prev) + '" alt="" aria-hidden="true" draggable="false">'
            : '') +
          '<img class="si-bgimg' + (sameImage ? '' : ' in') + kbClass + '" id="siBgImg" src="' + esc(imgPath) + '" alt="" aria-hidden="true" draggable="false">' +
          '<div class="si-img-overlay"></div>'
        : '') +
      '<div class="si-fx ' + fxClass + '"></div>' +
      '<div class="si-edge"></div>' +
      '</div>';

    ov.innerHTML =
      '<div class="story-imm">' +
        bgLayers +
        '<div class="si-vignette"></div>' +
        (hasImage ? '' : actorsHTML(actors)) +
        '<div class="si-topbar">' +
          '<div>' +
            '<div class="si-eyebrow">Immersion · Story Mode</div>' +
            '<div class="si-title">' + esc(meta.title_es || meta.title || '') +
              '<small>' + esc(meta.character_name || '') + ' · Nivel ' + esc(meta.level || '') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="si-progress"><div class="si-progress-fill" id="siProgressFill" style="width:0%"></div></div>' +
          (ttsAvailable()
            ? '<button class="si-iconbtn" id="siMute" aria-label="Silenciar voces" aria-pressed="false" title="Silenciar voces">' +
                '<span class="material-symbols-rounded" aria-hidden="true">volume_up</span>' +
              '</button>'
            : '') +
          '<button class="si-close" aria-label="Cerrar" title="Cerrar" id="siClose">&#x2715;</button>' +
        '</div>' +
        '<div class="si-dialogue"><div class="si-inner" id="siDialogueInner"><div class="si-stack" id="siBubbleStack"></div></div></div>' +
      '</div>';

    document.getElementById('siClose').onclick = closeStoryImmersion;
    var muteBtn = document.getElementById('siMute');
    if (muteBtn) { muteBtn.onclick = toggleMute; updateMuteButton(); }
    var progress = document.getElementById('siProgressFill');
    schedule(function () { if (progress) progress.style.width = progressPct() + '%'; }, 0);

    // Fallback: si la imagen no carga, la ocultamos y queda el gradiente dorado.
    var bgImg = document.getElementById('siBgImg');
    if (bgImg) {
      if (sameImage && cfg.continuesPreviousZoom) {
        var elapsed = SM.prevSceneId ? Math.max(0, Date.now() - (SM.bgAnimStartedAt || Date.now())) : 0;
        bgImg.style.animationDelay = '-' + Math.min(elapsed, 20000) + 'ms';
      } else {
        SM.bgAnimStartedAt = Date.now();
      }
      bgImg.onerror = function () {
        this.style.display = 'none';
        var out = ov.querySelector('.si-bgimg--old');
        if (out) out.style.display = 'none';
        var ovl = ov.querySelector('.si-img-overlay');
        if (ovl) ovl.style.display = 'none';
      };
      runWithWillChange(bgImg, reduce ? 200 : (cfg.kenBurns === 'kb-pullback' ? 12000 : 20000));
    }
    var oldImg = ov.querySelector('.si-bgimg--old');
    if (oldImg) schedule(function () { if (oldImg.parentNode) oldImg.remove(); }, reduce ? 220 : 720);
    var bgLayer = ov.querySelector('.si-bg-layer');
    if (bgLayer && hasSceneEffect(scene, 'shake-impact')) runWithWillChange(bgLayer, reduce ? 0 : 260);
    SM.prevBg = hasImage ? imgPath : '';
    SM.prevSceneId = scene.scene_id;

    schedule(renderCurrentLine, sameImage ? 0 : SM.bubbleDelay);
  }

  function runWithWillChange(el, ms) {
    if (!el || !ms) return;
    el.style.willChange = 'transform, opacity';
    schedule(function () { if (el) el.style.willChange = ''; }, ms);
  }

  function fadeOutBubbles(ms) {
    var blocks = document.querySelectorAll('#storyImmersionOverlay .si-bubble-block');
    blocks.forEach(function (b) {
      b.classList.remove('entering', 'active');
      b.classList.add('leaving');
      runWithWillChange(b, ms || 400);
    });
  }

  function actorsHTML(actors) {
    if (!actors || !actors.length) return '';
    var current = currentSpeaker();
    var html = '<div class="si-actors">';
    actors.forEach(function (a) {
      var cls = 'si-actor ' + (a === 'princess' ? 'princess' : 'merchant');
      if (current && (a === current || (current === 'princess_inner_thought' && a === 'princess'))) cls += ' speaking';
      else if (current) cls += ' dim';
      html += '<div class="' + cls + '"><div class="si-actor-head"></div></div>';
    });
    return html + '</div>';
  }

  function currentSpeaker() {
    var line = SM.lines[SM.lineIndex];
    return line ? line.speaker : null;
  }

  // Re-pinta solo el estado "speaking/dim" de los actores
  function refreshActors() {
    var scene = SM.scenesById[SM.sceneId];
    var wrap = document.querySelector('#storyImmersionOverlay .si-actors');
    if (!wrap || !scene) return;
    wrap.outerHTML = actorsHTML(scene.characters_on_screen || []);
  }

  function ensureBubbleStack() {
    var inner = document.getElementById('siDialogueInner');
    if (!inner) return null;
    var stack = document.getElementById('siBubbleStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'si-stack';
      stack.id = 'siBubbleStack';
      inner.innerHTML = '';
      inner.appendChild(stack);
    }
    return stack;
  }

  function trimBubbleStack(stack) {
    var blocks = stack.querySelectorAll('.si-bubble-block');
    if (blocks.length <= 4) return;
    var oldest = blocks[0];
    oldest.classList.remove('active', 'entering', 'dimmed');
    oldest.classList.add('leaving');
    runWithWillChange(oldest, 300);
    schedule(function () { if (oldest.parentNode) oldest.remove(); }, 300);
  }

  function stripInteractiveIds(root) {
    ['siNext', 'siBack', 'siRepeat', 'siEye', 'siSub'].forEach(function (id) {
      var el = root.querySelector('#' + id);
      if (el) el.removeAttribute('id');
    });
  }

  function applySpeakerVisual(style, cls) {
    var stage = document.querySelector('#storyImmersionOverlay .story-imm');
    if (!stage) return;
    stage.classList.remove('story-speaker--left', 'story-speaker--right', 'story-speaker--narrator', 'story-speaker--thought');
    stage.classList.add(cls);
    if (style && style.color) stage.style.setProperty('--speaker-color', style.color);
    else stage.style.removeProperty('--speaker-color');
  }

  function clearSpeakerVisual() {
    var stage = document.querySelector('#storyImmersionOverlay .story-imm');
    if (!stage) return;
    stage.classList.remove('story-speaker--left', 'story-speaker--right', 'story-speaker--narrator', 'story-speaker--thought');
    stage.style.removeProperty('--speaker-color');
  }

  // ---------------------------------------------------------
  // Reproductor de líneas de diálogo
  // ---------------------------------------------------------
  function renderCurrentLine() {
    var inner = document.getElementById('siDialogueInner');
    if (!inner) return;
    var scene = SM.scenesById[SM.sceneId];
    var line = SM.lines[SM.lineIndex];

    if (!line) {
      // No quedan líneas en este bloque
      if (scene.type === 'user_input') return renderInputZone(scene);
      // narrative -> avanzar a la siguiente escena
      var nxt = scene.next_scene;
      if (nxt) return gotoScene(nxt);
      return renderSummary();
    }

    refreshActors();

    var isNarr = line.speaker === 'narrator';
    var isThought = line.speaker === 'princess_inner_thought' || line.is_thought_bubble;
    var wrapCls = isNarr ? 'si-narration' : (isThought ? 'si-thought' : '');
    var style = getSpeakerStyle(line.speaker);
    if (isThought) style = getSpeakerStyle('princess_inner_thought');
    var speakerCls = speakerClassFor(style);
    applySpeakerVisual(style, speakerCls);

    var hasMore = SM.lineIndex < SM.lines.length - 1;
    var lastOfBlock = !hasMore;
    var nextLabel;
    if (scene.type === 'user_input' && lastOfBlock) nextLabel = 'Responder';
    else if (scene.type === 'narrative' && lastOfBlock) nextLabel = scene.next_scene ? 'Continuar' : 'Finalizar';
    else nextLabel = 'Siguiente';

    inner.className = 'si-inner ' + wrapCls;
    ensureBubbleStack();
    var stack = document.getElementById('siBubbleStack');
    if (!stack) return;

    Array.prototype.forEach.call(stack.querySelectorAll('.si-bubble-block.active'), function (b) {
      stripInteractiveIds(b);
      b.classList.remove('active', 'entering');
      b.classList.add('dimmed');
      runWithWillChange(b, 300);
    });

    var block = document.createElement('div');
    block.className = 'si-bubble-block active entering ' + speakerCls + (wrapCls ? ' ' + wrapCls : '');
    block.innerHTML =
      '<p class="si-speaker">' + esc(speakerLabel(line.speaker)) +
        '<span class="si-wave" aria-hidden="true"><i></i><i></i><i></i></span></p>' +
      '<p class="si-bubble">' + karaokeHTML(line.text || '') + '</p>' +
      (line.text_es
        ? '<button class="si-eye" id="siEye" type="button" aria-expanded="false" ' +
            'aria-controls="siSub" title="Mostrar traducción">' +
            '<span class="material-symbols-rounded" aria-hidden="true">visibility</span>' +
            '<span class="si-eye-txt">Ver traducción</span>' +
          '</button>' +
          '<p class="si-sub" id="siSub" hidden>' + esc(line.text_es) + '</p>'
        : '') +
      '<div class="si-next">' +
        (SM.history.length
          ? '<button class="si-btn ghost" id="siBack">&lsaquo; Atrás</button>'
          : '') +
        (ttsAvailable()
          ? '<button class="si-iconbtn si-repeat" id="siRepeat" aria-label="Repetir audio" title="Repetir audio">' +
              '<span class="material-symbols-rounded" aria-hidden="true">replay</span>' +
            '</button>'
          : '') +
        '<span class="si-hint-line">Toca para escuchar</span>' +
        '<button class="si-btn primary" id="siNext">' + nextLabel + ' &rsaquo;</button>' +
      '</div>';
    stack.appendChild(block);
    runWithWillChange(block, 520);
    trimBubbleStack(stack);

    block.querySelector('#siNext').onclick = advanceLine;
    var backBtn = block.querySelector('#siBack');
    if (backBtn) backBtn.onclick = goBack;
    var repeatBtn = block.querySelector('#siRepeat');
    if (repeatBtn) repeatBtn.onclick = repeatAudio;
    var eye = block.querySelector('#siEye');
    if (eye) eye.onclick = function () { toggleTranslation(eye); };

    // Voz del personaje (solo la línea visible; enhancement opcional)
    speakLine(line);

    // Disparar popup de vocabulario si esta línea contiene la palabra/frase trigger
    maybeShowVocabPopup(scene, line);
  }

  function advanceLine() {
    // Guardamos la posición actual para poder volver con "Atrás".
    SM.history.push({ sceneId: SM.sceneId, lineIndex: SM.lineIndex });
    SM.lineIndex++;
    renderCurrentLine();
  }

  // Mostrar/ocultar la traducción al español (cerrada por defecto)
  function karaokeHTML(text) {
    var parts = String(text || '').match(/(\s+|[^\s]+)/g) || [];
    var wordIndex = 0;
    return parts.map(function (part) {
      if (/^\s+$/.test(part)) return esc(part);
      var html = '<span class="si-k-word" data-k-word="' + wordIndex + '">' + esc(part) + '</span>';
      wordIndex++;
      return html;
    }).join('');
  }

  function toggleTranslation(btn) {
    var sub = document.getElementById('siSub');
    if (!sub) return;
    var icon = btn.querySelector('.material-symbols-rounded');
    var label = btn.querySelector('.si-eye-txt');
    var hidden = sub.hasAttribute('hidden');
    if (hidden) {
      sub.removeAttribute('hidden');
      sub.classList.add('reveal');
      btn.setAttribute('aria-expanded', 'true');
      btn.classList.add('open');
      btn.title = 'Ocultar traducción';
      if (icon) icon.textContent = 'visibility_off';
      if (label) label.textContent = 'Ocultar traducción';
    } else {
      sub.setAttribute('hidden', '');
      sub.classList.remove('reveal');
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('open');
      btn.title = 'Mostrar traducción';
      if (icon) icon.textContent = 'visibility';
      if (label) label.textContent = 'Ver traducción';
    }
  }

  // ---------------------------------------------------------
  // Popup de vocabulario (tip nativo) — aparece N segundos
  // ---------------------------------------------------------
  function maybeShowVocabPopup(scene, line) {
    var vp = scene.vocabulary_popup;
    if (!vp || !vp.popup_content) return;
    var trigger = (vp.trigger_word || vp.trigger_phrase || '').toLowerCase();
    var txt = (line.text || '').toLowerCase();
    // Mostrar cuando aparezca la línea que contiene el trigger; si no hay match,
    // mostrar en la última línea del bloque.
    var lastLine = SM.lineIndex === SM.lines.length - 1;
    var match = trigger && txt.indexOf(trigger) >= 0;
    if (!(match || (!trigger && lastLine) || (trigger && lastLine && !blockHasTrigger(scene, trigger)))) return;
    showVocabPopup(vp);
  }

  function blockHasTrigger(scene, trigger) {
    return (SM.lines || []).some(function (l) {
      return (l.text || '').toLowerCase().indexOf(trigger) >= 0;
    });
  }

  function showVocabPopup(vp) {
    clearPopupTimer();
    var existing = document.querySelector('#storyImmersionOverlay .si-vocab-popup');
    if (existing) existing.remove();

    var c = vp.popup_content;
    var headword = c.word || c.phrase || '';
    // recolectar para el resumen
    if (headword && !SM.vocab.some(function (v) { return v.word === headword; })) {
      SM.vocab.push({
        word: headword,
        meaning_es: c.meaning_es || '',
        tip: c.real_usage || c.native_mental_image || ''
      });
    }

    var el = document.createElement('div');
    el.className = 'si-vocab-popup';
    el.innerHTML =
      '<button class="si-vp-close" aria-label="Cerrar" id="siVpClose">&#x2715;</button>' +
      '<p class="si-vp-label">Tip nativo</p>' +
      '<p class="si-vp-word">' + esc(headword) + '</p>' +
      (c.meaning_es ? '<p class="si-vp-meaning">' + esc(c.meaning_es) + '</p>' : '') +
      (c.native_mental_image ? '<p class="si-vp-block"><b>Imagen mental:</b> ' + esc(c.native_mental_image) + '</p>' : '') +
      (c.real_usage ? '<p class="si-vp-block"><b>Uso real:</b> ' + esc(c.real_usage) + '</p>' : '');
    var stage = document.querySelector('#storyImmersionOverlay .story-imm');
    if (!stage) return;
    stage.appendChild(el);
    document.getElementById('siVpClose').onclick = function () { dismissPopup(el); };

    var secs = vp.popup_duration_seconds || 4;
    armPopupTimer(el, secs * 1000);
    el.onmouseenter = function () { pausePopupTimer(el); };
    el.onmouseleave = function () { armPopupTimer(el, el._remainingMs || secs * 1000); };
  }

  function armPopupTimer(el, ms) {
    clearPopupTimer();
    if (!el || !el.parentNode) return;
    el._remainingMs = ms;
    el._timerStartedAt = Date.now();
    SM.popupTimer = setTimeout(function () { dismissPopup(el); }, ms);
  }

  function pausePopupTimer(el) {
    if (!SM.popupTimer || !el) return;
    clearTimeout(SM.popupTimer);
    SM.popupTimer = null;
    el._remainingMs = Math.max(300, (el._remainingMs || 0) - (Date.now() - (el._timerStartedAt || Date.now())));
  }

  function dismissPopup(el) {
    clearPopupTimer();
    if (!el || !el.parentNode) return;
    el.classList.add('out');
    setTimeout(function () { if (el.parentNode) el.remove(); }, 420);
  }
  function clearPopupTimer() {
    if (SM.popupTimer) { clearTimeout(SM.popupTimer); SM.popupTimer = null; }
  }

  // ---------------------------------------------------------
  // TTS — voces de los personajes (Puter.js puter.ai.txt2speech)
  // ---------------------------------------------------------
  // Enhancement OPCIONAL: solo se activa si Puter está disponible (servido por
  // http). En file:// o si Puter falla, NO se intenta y NO se muestra error —
  // el diálogo sigue en modo texto como siempre.
  //
  // Voces (AWS Polly vía Puter). Todas FEMENINAS y con engine 'generative' —
  // el motor más humano/expresivo de Polly (mucho más natural que 'neural').
  // Fallback inteligente en ttsSynthesize: si el equipo no soporta 'generative',
  // baja a 'neural' de la MISMA voz antes de rendirse, y por último voz por
  // defecto; si todo falla, silencio (el TTS es opcional, nunca rompe).
  // Voces generativas femeninas (en-US): Ruth (cálida, de cuentacuentos) y
  // Danielle. Ajusta aquí si alguna no está en tu cuenta:
  //   narrator / princess / pensamiento -> Ruth     (generative)
  //   detective / merchant / suspect    -> Danielle (generative)
  // El volumen va al máximo + boost; el ritmo es natural (PLAYBACK_RATE ~1).
  var VOICE_MAP = {
    narrator: { voice: 'Ruth', engine: 'generative' },
    detective: { voice: 'Danielle', engine: 'generative' },
    merchant: { voice: 'Danielle', engine: 'generative' },
    suspect: { voice: 'Danielle', engine: 'generative' },
    princess: { voice: 'Ruth', engine: 'generative' },
    princess_inner_thought: { voice: 'Ruth', engine: 'generative' }
  };
  var DEFAULT_VOICE = { voice: 'Ruth', engine: 'generative' };
  var PLAYBACK_RATE = 1.0;  // ritmo natural (la voz generativa ya entona sola)
  var GAIN_BOOST = 1.7;     // amplificación extra (solo si el audio lo permite)

  var TTS = { audio: null, token: 0, ctx: null, karaokeRaf: null };

  // En RODEO la voz la pone Deepgram Aura-2 vía el puente window.rodeoStorySpeak
  // (definido en index.html, reusa la función speak() de la app). El TTS está
  // disponible si ese puente existe.
  function ttsAvailable() {
    return typeof window.rodeoStorySpeak === 'function';
  }
  // Mapea el hablante a una de las dos voces de RODEO: el mercader/sospechoso
  // hablan con Draco (barítono UK); narrador, princesa y pensamientos con Helena.
  function voiceKindFor(speaker) {
    return (speaker === 'merchant' || speaker === 'suspect') ? 'draco' : 'helena';
  }
  function isMuted() {
    try { return sessionStorage.getItem('storyMuted') === '1'; } catch (e) { return false; }
  }
  function setMuted(v) {
    try { sessionStorage.setItem('storyMuted', v ? '1' : '0'); } catch (e) {}
  }

  // Detiene el audio en curso y limpia el indicador visual. Además le pide a
  // RODEO que corte su reproducción Deepgram (puente window.rodeoStoryStopSpeak).
  function stopSpeaking() {
    stopKaraoke();
    TTS.token++; // invalida cualquier audio que esté por resolver
    if (TTS.audio) {
      try { TTS.audio.pause(); } catch (e) {}
      try { TTS.audio.currentTime = 0; } catch (e) {}
      TTS.audio = null;
    }
    if (typeof window.rodeoStoryStopSpeak === 'function') {
      try { window.rodeoStoryStopSpeak(); } catch (e) {}
    }
    setSpeakingIndicator(false);
  }

  // Habla la línea visible. Una línea en pantalla = como máximo una llamada TTS.
  // Nunca adelanta audio de escenas futuras. force=true ignora el mute (lo usa
  // el botón "repetir audio" cuando hay que re-sintetizar).
  function speakLine(line, force) {
    if (!line || !line.text) return;
    SM.currentLine = line; // recordada para el botón de repetir
    if (!force && isMuted()) return;
    if (!ttsAvailable()) return;

    stopSpeaking();
    var myToken = TTS.token;
    var kind = voiceKindFor(line.speaker);

    // RODEO/Deepgram no expone la duración del audio antes de reproducir, así que
    // el karaoke pasa a ser un revelado TEMPORIZADO (estimado por nº de palabras).
    // El audio NUNCA bloquea lo visual: si la voz falla, el texto ya está pintado.
    setSpeakingIndicator(true);
    startKaraokeTimed(line.text, myToken);

    Promise.resolve(window.rodeoStorySpeak(line.text, kind)).then(function () {
      if (myToken === TTS.token) { setSpeakingIndicator(false); stopKaraoke(true); }
    }).catch(function () {
      if (myToken === TTS.token) { setSpeakingIndicator(false); stopKaraoke(true); }
    });
  }

  // Karaoke sin audio: revela las palabras a un ritmo estimado por el texto.
  // Sustituye al karaoke atado a audio.duration (que Deepgram no da por anticipado).
  function startKaraokeTimed(text, token) {
    stopKaraoke();
    var bubble = activeKaraokeBubble();
    if (!bubble) return;
    var words = Array.prototype.slice.call(bubble.querySelectorAll('.si-k-word'));
    if (!words.length) return;
    bubble.classList.add('karaoke-on');

    var duration = fallbackSpeechDuration(text);
    var startedAt = performance.now();

    function tick(now) {
      if (token !== TTS.token || !bubble.isConnected) return;
      var elapsed = (now - startedAt) / 1000;
      var progress = Math.min(1, elapsed / duration);
      var activeIndex = Math.min(words.length - 1, Math.floor(progress * words.length));
      words.forEach(function (word, i) {
        word.classList.toggle('done', i < activeIndex);
        word.classList.toggle('active', i === activeIndex && progress < 1);
      });
      if (progress < 1) TTS.karaokeRaf = requestAnimationFrame(tick);
      else stopKaraoke(true);
    }
    TTS.karaokeRaf = requestAnimationFrame(tick);
  }

  // Reproduce con volumen al máximo, ritmo de cuento, y boost de ganancia
  // (solo si el audio es local blob:/data: — evita silencio por CORS).
  function startPlayback(audio) {
    try { audio.volume = 1.0; } catch (e) {}
    try {
      audio.preservesPitch = true;
      audio.mozPreservesPitch = true;
      audio.webkitPreservesPitch = true;
      audio.playbackRate = PLAYBACK_RATE;
    } catch (e) {}
    var src = (audio.currentSrc || audio.src || '') + '';
    if (/^(blob:|data:)/.test(src) && !audio._boosted) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          if (!TTS.ctx) TTS.ctx = new AC();
          if (TTS.ctx.state === 'suspended' && TTS.ctx.resume) TTS.ctx.resume();
          var srcNode = TTS.ctx.createMediaElementSource(audio);
          var gain = TTS.ctx.createGain();
          gain.gain.value = GAIN_BOOST;
          srcNode.connect(gain).connect(TTS.ctx.destination);
          audio._boosted = true;
        }
      } catch (e) { /* sin boost: queda a volumen 1.0 normal */ }
    }
    var pr = audio.play();
    if (pr && typeof pr.catch === 'function') pr.catch(function () {});
  }

  // Repite el audio de la línea actual. Si el audio sigue cargado, lo re-reproduce
  // sin gastar otra llamada TTS; si no, lo re-sintetiza (ignorando el mute).
  function activeKaraokeBubble() {
    return document.querySelector('#storyImmersionOverlay .si-bubble-block.active .si-bubble');
  }

  function fallbackSpeechDuration(text) {
    var words = (String(text || '').match(/[^\s]+/g) || []).length;
    return Math.max(1.2, Math.min(18, 0.38 * words + 0.65));
  }

  function startKaraoke(audio, text, token) {
    stopKaraoke();
    var bubble = activeKaraokeBubble();
    if (!bubble) return;
    var words = Array.prototype.slice.call(bubble.querySelectorAll('.si-k-word'));
    if (!words.length) return;
    bubble.classList.add('karaoke-on');

    var duration = Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration / (audio.playbackRate || 1)
      : fallbackSpeechDuration(text);
    var startedAt = performance.now();

    function tick(now) {
      if (token !== TTS.token || !bubble.isConnected) return;
      var elapsed = (now - startedAt) / 1000;
      var progress = Math.min(1, elapsed / duration);
      var activeIndex = Math.min(words.length - 1, Math.floor(progress * words.length));

      words.forEach(function (word, i) {
        word.classList.toggle('done', i < activeIndex);
        word.classList.toggle('active', i === activeIndex && progress < 1);
      });

      if (progress < 1) {
        TTS.karaokeRaf = requestAnimationFrame(tick);
      } else {
        stopKaraoke(true);
      }
    }

    TTS.karaokeRaf = requestAnimationFrame(tick);
  }

  function stopKaraoke(complete) {
    if (TTS.karaokeRaf) {
      cancelAnimationFrame(TTS.karaokeRaf);
      TTS.karaokeRaf = null;
    }
    var bubble = activeKaraokeBubble();
    if (!bubble) return;
    var words = bubble.querySelectorAll('.si-k-word');
    bubble.classList.remove('karaoke-on');
    words.forEach(function (word) {
      word.classList.remove('active');
      if (complete) word.classList.add('done');
      else word.classList.remove('done');
    });
  }

  function repeatAudio() {
    if (!ttsAvailable()) return;
    // RODEO/Deepgram no cachea el elemento de audio; re-sintetizamos la línea
    // (force=true ignora el mute, igual que el botón de repetir original).
    if (SM.currentLine) speakLine(SM.currentLine, true);
  }

  // Escalera robusta de síntesis. Intenta, en orden:
  //   1) {voice, engine:'generative'}  — la mejor calidad
  //   2) {voice, engine:'neural'}      — misma voz, por si no hay generative
  //   3) puter.ai.txt2speech(text)     — voz por defecto (firmas viejas)
  // Si todo falla, resuelve null (silencio). Nunca lanza error hacia afuera.
  function ttsSynthesize(text, role) {
    var attempts = [
      { voice: role.voice, engine: 'generative', language: 'en-US' },
      { voice: role.voice, engine: 'neural', language: 'en-US' },
      null // sin opciones
    ];
    return new Promise(function (resolve) {
      (function tryNext(i) {
        if (i >= attempts.length) return resolve(null);
        Promise.resolve()
          .then(function () {
            return attempts[i] ? puter.ai.txt2speech(text, attempts[i]) : puter.ai.txt2speech(text);
          })
          .then(function (audio) { audio ? resolve(audio) : tryNext(i + 1); })
          .catch(function () { tryNext(i + 1); });
      })(0);
    });
  }

  function setSpeakingIndicator(on) {
    var inner = document.getElementById('siDialogueInner');
    if (!inner) return;
    if (on) inner.classList.add('speaking');
    else inner.classList.remove('speaking');
  }

  // Botón de mute/unmute en el topbar (solo si el TTS está disponible).
  function updateMuteButton() {
    var btn = document.getElementById('siMute');
    if (!btn) return;
    var muted = isMuted();
    var icon = btn.querySelector('.material-symbols-rounded');
    if (icon) icon.textContent = muted ? 'volume_off' : 'volume_up';
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    btn.title = muted ? 'Activar voces' : 'Silenciar voces';
  }
  function toggleMute() {
    var nowMuted = !isMuted();
    setMuted(nowMuted);
    if (nowMuted) stopSpeaking();
    updateMuteButton();
  }

  // ---------------------------------------------------------
  // Zona de input del usuario + evaluación con IA
  // ---------------------------------------------------------
  function renderInputZone(scene) {
    SM.awaitingInput = true;
    stopSpeaking();    // el turno del jugador no lleva voz
    clearSpeakerVisual();
    SM.history = [];   // no se puede volver "antes" del turno del jugador
    var inner = document.getElementById('siDialogueInner');
    if (!inner) return;
    var it = scene.interaction || {};
    var tags = (it.target_vocabulary || []).map(function (w) {
      return '<span class="si-tag">' + esc(w) + '</span>';
    }).join('');

    inner.className = 'si-inner';
    inner.innerHTML =
      '<div class="si-input-card">' +
        '<p class="si-prompt">' + esc(it.prompt_es || 'Tu turno. ¿Qué dices?') + '</p>' +
        (it.context_hint ? '<p class="si-hint"><b>Tip</b><span>' + esc(it.context_hint) + '</span></p>' : '') +
        (tags ? '<div class="si-vocab-tags">' + tags + '</div>' : '') +
        '<textarea class="si-textarea" id="siInput" placeholder="Escribe tu respuesta en inglés..." ' +
          'aria-label="Tu respuesta"></textarea>' +
        '<div class="si-input-row">' +
          '<span class="si-mode">La IA evaluará tu inglés y la historia se ramificará según tu respuesta.</span>' +
          '<span class="si-spacer"></span>' +
          '<button class="si-btn primary" id="siSend">Enviar &rsaquo;</button>' +
        '</div>' +
      '</div>';

    var ta = document.getElementById('siInput');
    var send = document.getElementById('siSend');
    if (ta) {
      ta.focus();
      ta.value = SM.lastUserText || '';
      ta.onkeydown = function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitResponse(); }
      };
    }
    if (send) send.onclick = submitResponse;
  }

  function submitResponse() {
    if (SM.busy) return;
    var ta = document.getElementById('siInput');
    var text = ta ? ta.value.trim() : '';
    if (!text) {
      if (typeof showToast === 'function') showToast('Escribe una respuesta primero.', 'warning');
      if (ta) ta.focus();
      return;
    }
    SM.lastUserText = text;
    SM.busy = true;

    var send = document.getElementById('siSend');
    if (send) { send.disabled = true; send.innerHTML = '<span class="si-spinner"></span> Evaluando...'; }
    if (ta) ta.disabled = true;

    var scene = SM.scenesById[SM.sceneId];
    var run = SM.runId;
    storyEvaluate(scene, text).then(function (out) {
      if (run !== SM.runId) return;  // cerrado o reabierto mientras evaluaba
      SM.busy = false;
      renderCorrection(scene, out.json, out.source);
    }).catch(function (err) {
      if (run !== SM.runId) return;
      SM.busy = false;
      renderAIError(scene, err);
    });
  }

  // ---------------------------------------------------------
  // Cliente de IA: Puter.js (primario) -> local-ai (fallback)
  // ---------------------------------------------------------
  function buildEvalPrompt(scene) {
    var it = scene.interaction || {};
    var base = it.ai_evaluation_prompt ||
      ('You are evaluating a B2 English learner\'s response in a roleplay. ' +
       'Target vocabulary: ' + ((it.target_vocabulary || []).join(', ') || 'n/a') + '. ' +
       'Judge whether the response is natural, polite and grammatically correct, ' +
       'and rate its STRENGTH as strong, weak or incorrect.');
    var schema =
      '\n\nReturn ONLY valid JSON — no markdown fences, no extra text:\n' +
      '{\n' +
      '  "strength": "strong" | "weak" | "incorrect",\n' +
      '  "is_correct": true,\n' +
      '  "naturalness_score": 4,\n' +
      '  "grammar_errors": [{"original": "", "corrected": "", "explanation_in_spanish": ""}],\n' +
      '  "native_alternative": "how a native would phrase it",\n' +
      '  "why_native_better_in_spanish": "short explanation in Spanish",\n' +
      '  "encouragement_in_spanish": "one short warm line of feedback in Spanish"\n' +
      '}';
    return base + schema;
  }

  function storyEvaluate(scene, userText) {
    var sys = buildEvalPrompt(scene);
    var user = 'The learner wrote:\n"""' + userText + '"""';
    return puterChat(sys, user)
      .then(function (raw) { return { raw: raw, source: 'RODEO · IA' }; })
      .catch(function (e1) {
        console.warn('[story-mode] Puter falló, intentando IA on-device:', e1 && e1.message);
        return localChat(sys, user).then(function (raw) {
          return { raw: raw, source: 'IA on-device' };
        });
      })
      .then(function (r) {
        var json = (typeof localAIExtractJSON === 'function')
          ? localAIExtractJSON(r.raw) : naiveExtractJSON(r.raw);
        if (!json || !json.strength) {
          // Reintento de parseo: a veces strength viene en otra clave
          if (json && (json.is_correct != null)) {
            json.strength = json.is_correct ? 'weak' : 'incorrect';
          } else {
            var e = new Error('La IA no devolvió un JSON válido.');
            e.code = 'BAD_JSON';
            e.raw = r.raw;
            throw e;
          }
        }
        return { json: json, source: r.source };
      });
  }

  function puterChat(system, user) {
    // En RODEO el transporte de IA es el puente window.rodeoStoryEval, que llama
    // a callAPI('chat', ...) y devuelve el texto crudo del modelo (el JSON de
    // veredicto). El parseo posterior (storyEvaluate) lo interpreta igual que
    // antes. El bloque Puter de abajo queda como fallback histórico inerte.
    if (typeof window.rodeoStoryEval === 'function') {
      return Promise.resolve(window.rodeoStoryEval(system, user));
    }
    return new Promise(function (resolve, reject) {
      if (typeof puter === 'undefined' || !puter || !puter.ai || typeof puter.ai.chat !== 'function') {
        var e = new Error('Puter.js no está disponible en esta página.');
        e.code = 'NO_PUTER';
        return reject(e);
      }
      try {
        var p = puter.ai.chat(
          [{ role: 'system', content: system }, { role: 'user', content: user }],
          { model: AI_MODEL }
        );
        Promise.resolve(p).then(function (res) {
          var txt = extractPuterText(res);
          if (!txt) return reject(new Error('Respuesta vacía de Puter.'));
          resolve(txt);
        }).catch(reject);
      } catch (err) { reject(err); }
    });
  }

  function extractPuterText(res) {
    if (res == null) return '';
    if (typeof res === 'string') return res;
    // { message: { content: "..." } } o content como array de bloques
    if (res.message && res.message.content != null) {
      var c = res.message.content;
      if (typeof c === 'string') return c;
      if (Array.isArray(c)) {
        return c.map(function (b) { return (b && (b.text || b.content)) || ''; }).join('');
      }
    }
    if (typeof res.text === 'string') return res.text;
    if (res.content != null) {
      if (typeof res.content === 'string') return res.content;
      if (Array.isArray(res.content)) return res.content.map(function (b) { return (b && b.text) || ''; }).join('');
    }
    try { return String(res); } catch (e) { return ''; }
  }

  function localChat(system, user) {
    if (typeof localAIPresent !== 'function' || !localAIPresent()) {
      return Promise.reject(new Error('No hay IA on-device disponible.'));
    }
    return localAIStatus().then(function (status) {
      if (status !== 'available') throw new Error('IA on-device no lista (' + status + ').');
      return createLocalAISession({ system: system, language: 'en', temperature: 0.2, topK: 3 });
    }).then(function (session) {
      if (!session) throw new Error('No se pudo crear la sesión on-device.');
      return localAIPrompt(session, user).then(function (out) {
        localAIDestroy(session);
        if (!out) throw new Error('La IA on-device no respondió.');
        return out;
      });
    });
  }

  // Parser de respaldo si local-ai.js no estuviera cargado
  function naiveExtractJSON(text) {
    if (!text) return null;
    var t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    var a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a < 0 || b <= a) return null;
    try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {}
    try { return JSON.parse(t.slice(a, b + 1).replace(/,\s*([}\]])/g, '$1')); } catch (e) {}
    return null;
  }

  // ---------------------------------------------------------
  // Panel de corrección + ramificación
  // ---------------------------------------------------------
  function renderCorrection(scene, json, source) {
    var strength = (json.strength || 'weak').toLowerCase();
    if (['strong', 'weak', 'incorrect'].indexOf(strength) < 0) strength = 'weak';
    var nat = clampNat(json.naturalness_score);
    SM.results.push({ strength: strength, naturalness_score: nat });

    var inner = document.getElementById('siDialogueInner');
    if (!inner) return;
    clearSpeakerVisual();

    var strengthLabel = { strong: 'Respuesta fuerte', weak: 'Vas bien', incorrect: 'A mejorar' }[strength];

    var gerrs = (json.grammar_errors || []).filter(function (g) {
      return g && (g.original || g.corrected || g.explanation_in_spanish);
    });
    var gerrHTML = gerrs.length
      ? '<div class="si-corr-sec"><h4>Correcciones</h4>' + gerrs.map(function (g) {
          return '<div class="si-gerr">' +
            (g.original ? '<span class="o">' + esc(g.original) + '</span> ' : '') +
            (g.corrected ? '<span class="c">' + esc(g.corrected) + '</span>' : '') +
            (g.explanation_in_spanish ? '<span class="x">' + esc(g.explanation_in_spanish) + '</span>' : '') +
          '</div>';
        }).join('') + '</div>'
      : '';

    var nativeHTML = json.native_alternative
      ? '<div class="si-corr-sec"><h4>Como lo diría un nativo</h4>' +
          '<p class="si-native">"' + esc(json.native_alternative) + '"</p>' +
          (json.why_native_better_in_spanish ? '<p style="margin-top:8px">' + esc(json.why_native_better_in_spanish) + '</p>' : '') +
        '</div>'
      : '';

    inner.className = 'si-inner';
    inner.innerHTML =
      '<div class="si-correction">' +
        '<div class="si-corr-head">' +
          '<span class="si-badge ' + strength + '">' + esc(strengthLabel) + '</span>' +
          '<span class="si-stars" title="Naturalidad ' + nat + '/5">' + stars(nat) + '</span>' +
          '<span class="si-corr-source">' + esc(source || '') + '</span>' +
        '</div>' +
        gerrHTML +
        nativeHTML +
        (json.encouragement_in_spanish ? '<p class="si-encourage">' + esc(json.encouragement_in_spanish) + '</p>' : '') +
        '<div class="si-next" style="margin-top:16px">' +
          '<span class="si-hint-line">La historia continúa según tu respuesta</span>' +
          '<button class="si-btn primary" id="siContinue">Continuar la historia &rsaquo;</button>' +
        '</div>' +
      '</div>';

    var next = branchFor(scene, strength);
    document.getElementById('siContinue').onclick = function () {
      SM.lastUserText = '';
      gotoScene(next, true); // nueva rama: reinicia el historial de "Atrás"
    };
  }

  function branchFor(scene, strength) {
    var b = scene.branches || {};
    if (strength === 'strong') return b.correct_strong || b.correct_weak || b.incorrect;
    if (strength === 'weak') return b.correct_weak || b.correct_strong || b.incorrect;
    return b.incorrect || b.correct_weak;
  }

  function renderAIError(scene, err) {
    var inner = document.getElementById('siDialogueInner');
    if (!inner) return;
    clearSpeakerVisual();
    var msg = (err && err.message) || 'Error desconocido.';
    inner.className = 'si-inner';
    inner.innerHTML =
      '<div class="si-aierr">' +
        '<h4>No se pudo evaluar tu respuesta</h4>' +
        '<p>' + esc(msg) + ' Tu texto se conservó — puedes reintentar.</p>' +
        '<div class="si-next" style="margin-top:0">' +
          '<span class="si-hint-line"></span>' +
          '<button class="si-btn ghost" id="siBackToInput">Editar respuesta</button>' +
          '<button class="si-btn primary" id="siRetry">Reintentar</button>' +
        '</div>' +
      '</div>';
    document.getElementById('siRetry').onclick = function () {
      renderInputZone(scene);
      // re-enviar directamente con el texto guardado
      setTimeout(submitResponse, 30);
    };
    document.getElementById('siBackToInput').onclick = function () { renderInputZone(scene); };
  }

  // ---------------------------------------------------------
  // Resumen final / extension offer
  // ---------------------------------------------------------
  function computeScore() {
    if (!SM.results.length) return null;
    var map = { strong: 95, weak: 78, incorrect: 58 };
    var sum = SM.results.reduce(function (a, r) { return a + (map[r.strength] || 70); }, 0);
    return Math.round(sum / SM.results.length);
  }
  function computeNatAvg() {
    var nats = SM.results.map(function (r) { return r.naturalness_score; }).filter(function (n) { return n != null; });
    if (!nats.length) return null;
    return Math.round((nats.reduce(function (a, b) { return a + b; }, 0) / nats.length) * 10) / 10;
  }

  // Riega el repaso espaciado: al terminar el episodio, el vocabulario objetivo
  // (meta.target_words + palabras del review + las capturadas en popups) entra al
  // DNA de RODEO con el MISMO patrón que DROP (guardarLexicoDrop -> saveDNA slang).
  function saveVocabToDNA() {
    if (SM.dnaSaved) return;               // una sola vez por episodio
    if (typeof window.guardarLexicoDrop !== 'function') return;
    var meta = SM.episode.meta || {};
    var review = (SM.episode.post_episode_review && SM.episode.post_episode_review.words_to_remember) || [];
    var items = [];
    // 1) Review: la fuente más rica (palabra + tip + contexto de la historia).
    review.forEach(function (w) {
      if (w && w.word) items.push({ term: w.word, es: w.tip || '', frase: w.context_in_story || '' });
    });
    // 2) Popups capturados durante la partida (palabra + significado/tip).
    (SM.vocab || []).forEach(function (v) {
      if (v && v.word) items.push({ term: v.word, es: v.meaning_es || v.tip || '', frase: '' });
    });
    // 3) Vocabulario objetivo del episodio (aunque no haya aparecido en popup).
    (meta.target_words || []).forEach(function (w) {
      if (w) items.push({ term: w, es: '', frase: '' });
    });
    try { window.guardarLexicoDrop(items); SM.dnaSaved = true; } catch (e) {}
  }

  function renderSummary() {
    clearPopupTimer();
    saveVocabToDNA();
    var ov = ensureOverlay();
    var meta = SM.episode.meta || {};
    var s6 = SM.scenesById['s6_choice_point'] || {};
    var offerOptions = (s6.next_options) || [];

    var score = computeScore();
    var natAvg = computeNatAvg();

    // Palabras: las del review + las recolectadas en popups
    var review = (SM.episode.post_episode_review && SM.episode.post_episode_review.words_to_remember) || [];
    var wordsHTML = '';
    if (review.length) {
      wordsHTML = review.map(function (w) {
        return '<div class="si-word"><b>' + esc(w.word) + '</b>' +
          (w.context_in_story ? '<span class="ctx">"' + esc(w.context_in_story) + '"</span>' : '') +
          (w.tip ? '<span class="tip">' + esc(w.tip) + '</span>' : '') + '</div>';
      }).join('');
    } else if (SM.vocab.length) {
      wordsHTML = SM.vocab.map(function (w) {
        return '<div class="si-word"><b>' + esc(w.word) + '</b>' +
          (w.tip ? '<span class="tip">' + esc(w.tip) + '</span>' : '') + '</div>';
      }).join('');
    }

    var actionsHTML = offerOptions.map(function (opt, i) {
      var cls = i === 0 ? 'si-btn primary' : 'si-btn ghost';
      return '<button class="' + cls + '" data-opt="' + i + '">' + esc(opt.label_es) + '</button>';
    }).join('');

    // Imagen de cierre del episodio (s6 -> p.ej. 6.png). Solo si es ruta real.
    var sumImg = isImagePath(s6.background_illustration) ? s6.background_illustration : '';
    var sumBgHTML = sumImg
      ? '<img class="si-sum-bg story-anim--kb-pullback" id="siSumBg" src="' + esc(sumImg) + '" alt="" aria-hidden="true" draggable="false">' +
        '<div class="si-sum-ovl"></div><div class="si-fx story-anim--vignette-warm"></div>'
      : '';

    ov.innerHTML =
      '<div class="story-imm"><div class="si-summary">' + sumBgHTML + '<div class="si-sum-card">' +
        '<div class="si-sum-eyebrow">Episodio completado</div>' +
        '<h1 class="si-sum-title">' + esc(meta.title_es || meta.title || 'Resumen') + '</h1>' +
        '<div class="si-sum-stats">' +
          (score != null ? stat(score, 'Puntaje') : '') +
          stat(SM.results.length, 'Interacciones') +
          (natAvg != null ? stat(natAvg, 'Naturalidad') : '') +
        '</div>' +
        (wordsHTML ? '<div class="si-words"><h3>Palabras para recordar</h3>' + wordsHTML + '</div>' : '') +
        '<div class="si-sum-actions">' + actionsHTML + '</div>' +
      '</div></div></div>';

    var sumBg = document.getElementById('siSumBg');
    if (sumBg) {
      sumBg.onerror = function () {
        this.style.display = 'none';
        var ovl = ov.querySelector('.si-sum-ovl');
        if (ovl) ovl.style.display = 'none';
      };
    }

    var btns = ov.querySelectorAll('.si-sum-actions [data-opt]');
    btns.forEach(function (b) {
      b.onclick = function () { handleOffer(offerOptions[+b.getAttribute('data-opt')]); };
    });
  }

  function handleOffer(opt) {
    if (!opt) return;
    // 'replay_last_scene' es el alias usado por detective_001; aquí reinicia el
    // episodio completo igual que 'replay_episode'.
    if (opt.action === 'replay_episode' || opt.action === 'replay_last_scene') {
      SM.results = []; SM.vocab = [];
      SM.lastUserText = '';   // sin reset, el próximo submit-vacío no lo detecta
      gotoScene(SM.episode.start_scene || (SM.episode.scenes[0] && SM.episode.scenes[0].scene_id), true);
      return;
    }
    if (opt.action === 'save_and_exit') {
      // srsOnCorrectAnswer no existe en el codebase (mote muerto). Puente al
      // sistema real de RODEO: contar la sesión de STORY y actualizar la
      // racha, igual que hace un debrief de TALK/ROLEPLAY.
      if (typeof window.rodeoStoryProgress === 'function') {
        try { window.rodeoStoryProgress(); } catch (e) {}
      }
      if (typeof showToast === 'function') showToast('Progreso guardado. ¡Buen trabajo!', 'success');
      closeStoryImmersion();
      return;
    }
    if (opt.next_episode_branch) {
      // El capítulo extendido aún no existe en este MVP
      if (typeof showToast === 'function') {
        showToast('El capítulo extendido llega pronto. ' + (opt.preview ? opt.preview : ''), 'info', 5000);
      }
      return;
    }
    closeStoryImmersion();
  }

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------
  function stat(value, label) {
    return '<div class="si-stat"><b>' + esc(String(value)) + '</b><span>' + esc(label) + '</span></div>';
  }
  function stars(n) {
    n = clampNat(n);
    var full = '★', empty = '☆', out = '';
    for (var i = 1; i <= 5; i++) out += (i <= n ? full : empty);
    return out;
  }
  function clampNat(n) {
    n = parseInt(n, 10);
    if (isNaN(n)) return 3;
    return Math.max(1, Math.min(5, n));
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Cerrar con Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var ov = document.getElementById('storyImmersionOverlay');
      if (ov && ov.classList.contains('show')) closeStoryImmersion();
    }
  });

  // Exponer al scope global (contrato del engine)
  window.openStoryImmersion = openStoryImmersion;
  window.closeStoryImmersion = closeStoryImmersion;

  console.log('🎬 Story Mode (Immersion) loaded');
})();
