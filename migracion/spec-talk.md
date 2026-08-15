# SPEC · Vista TALK (CHARLA + ESCENAS) — port 1:1 desde `public/legacy.html`

> Cartografía completa de la vista TALK del legacy. Todas las referencias `L####`
> son líneas de `/home/user/rodeo/public/legacy.html` (7.667 líneas).
> La lógica se porta **literal**: no se "mejora", no se reordena, no se renombran
> claves. Lo único que se rediseña es el chrome visual (tokens + componentes nuevos).
>
> **Fuera de alcance (no es TALK):** Rétame (`#retame-btn`, `js/cards-mode.js`) es
> isla futura — el botón vive dentro de `#talk-empty` pero su lógica es externa;
> se porta como placeholder inerte o se omite. Ver §8.
>
> **Ya portado, ÚSALO:** `src/lib/api.ts` (`callAPI`, `callStream`, `callJSON`,
> `parseJSON`, `extractPartialReply`, `onCostChange`) y `src/lib/storage.ts`
> (`store.get/set`). No reimplementar nada de eso.

---

## 0. Mapa de anclas (índice rápido)

| Símbolo | Línea | Qué es |
|---|---|---|
| Markup `#view-talk` | L2318-2522 | Sección completa (ambos panes) |
| `.talk-tab` (CHARLA/ESCENAS) | L2324-2327 | Toggle de panes |
| `#charla-pane` | L2329-2450 | Pane de charla |
| `#talk-empty` | L2332-2390 | Estado vacío (hero + libre + chips) |
| `#talk-session` | L2391-2449 | Sesión activa (session bar L2392-2410) |
| Dock de voz `#talk-dock` | L2426-2438 | mic hero + teclado + bombilla |
| `#talk-typebar` | L2441-2446 | Barra de texto (oculta por defecto) |
| `#escenas-pane` | L2452-2521 | Roleplay: home L2455-2482, sesión L2484-2520 |
| `MIC_LANGS` / `micLang` / `micLangCode` | L2953-2965 | Idioma de dictado por contexto |
| `wireMicToggle` | L2969-3001 | Chip ES/EN pegado al botón de mic |
| `NOTA_STT_BILINGUE` | L3004 | Nota inyectada en los system prompts |
| `state` | L3006-3043 | Estado global en memoria |
| `interesesBriefTalk` | L3056-3061 | Línea de intereses para prompts de TALK/RP |
| `toast` | L3208-3214 | Aviso efímero |
| `tipPrimeraVez` | L3220-3234 | Tip de primera vez (una vez por flujo) |
| `updateCostTicker` | L3238-3244 | Acumulador de coste |
| `glossSpans` / `spansToHTML` | L3266-3303 | Núcleo de glosado |
| `chunkRe` / `parseChunks` | L3316-3352 | Marcadores `⟦en\|\|es⟧` |
| `renderReply` | L3355-3370 | Fase 2 del pintado |
| `stripChunksLive` | L3373-3382 | Fase 1 del pintado (stream) |
| `dnaTieneSlang` | L3385-3388 | ¿ya está en DNA? |
| Tooltip `#gloss-tip` | L3391-3452 | Hover/pin + botón guardar a DNA |
| `callAPI` / `callStream` | L3473-3566 | Ya portados |
| `extractPartialReply` / `callJSON` / `parseJSON` | L3573-3637 | Ya portados |
| `switchView` | L3641-3670 | Al entrar a talk: `refrescarRompehielos()` |
| Handler `.talk-tab` | L3678-3699 | Cambio de pane + `renderRoleplayHome()` |
| `actualizarCromo` | L3702-3736 | `body.rd-sesion` (oculta tab bar en sesión) |
| `SCENARIOS` | L3751-3761 | 9 escenarios de chips |
| `SEED_MOOD/BEAT/AGENDA/TWIST` | L3767-3815 | Semilla de situación |
| `TALK_MAX_TOKENS` = 3200 / `_RETRY` = 6000 | L3817-3818 | Techos |
| `buildSituation` | L3822-3829 | Compone la situación |
| `dnaBrief` | L3835-3846 | Reinyección de DNA al prompt |
| `talkSystemPrompt` | L3848-3888 | **System prompt de CHARLA** |
| `startSession` | L3890-3908 | Arranque desde chip |
| `ROMPEHIELOS_BASE` / `_POR_INTERES` | L3917-3952 | Pool de rompehielos |
| `elegirRompehielos` / `refrescarRompehielos` | L3960-3970 | Selector anti-repetición |
| `startLibre` | L3975-4010 | Arranque de dibujo libre (sin API) |
| `addBubble` | L4012-4020 | Burbuja + autoscroll |
| `pencilHTML` / `addTyping` | L4025-4058 | Lápiz de espera |
| `escribirMaquina` | L4073-4107 | Entrada animada por carácter/palabra |
| `sendTurn` | L4109-4251 | **Turno completo de CHARLA** |
| Chips → `startSession` | L4253-4255 | |
| `#libre-go` / `#libre-shuffle` | L4257-4262 | |
| `submitInput` | L4267-4273 | |
| Debrief `#end-session` | L4276-4334 | **Debrief de CHARLA** |
| `#back-btn` | L4336-4340 | Salir SIN debrief |
| `closeSession` | L4342-4356 | |
| `closeSheetAndSession` (window) | L4358-4361 | |
| `initRecognition` / `#mic-btn` | L4368-4409 | STT de CHARLA |
| `#kbd-btn` / `#chat-input` input | L4411-4423 | Teclado y `has-text` |
| `#idea-btn` (bombilla) | L4425-4451 | Respuesta-ejemplo |
| `stopMic` | L4453 | |
| `pickVoice` / `speakSistema` | L4456-4506 | Fallback speechSynthesis |
| `VOCES` / `vozActual` | L4526-4531 | Helena / Draco |
| `pedirTTS` | L4534-4547 | `/api/tts` (Deepgram) |
| `speak` | L4549-4593 | Cadena completa de voz |
| `stopSpeaking` | L4595-4605 | |
| `pintarMorphTTS` / `syncTTSButton` | L4607-4617 | Morph volumen |
| `#tts-toggle` | L4619-4627 | |
| `syncReplayButton` / `#again-btn` / `#replay-btn` | L4629-4650 | |
| `saveDNA` / `recordUpgrade` | L4914-4938 | Persistencia de aprendizajes |
| `openSheet` / `closeSheet` | L5087-5103 | Hoja modal del debrief |
| `wireMic` (genérico, usado por `#rp-mic`) | L6328-6373 | |
| `updateStreak` | L6784-6792 | Racha (solo la llama el debrief de RP) |
| `RP_CANONICO` | L7081-7089 | Escena canónica |
| `RP_MAX_TOKENS` = 2200 / `_RETRY` = 5000 / `RP_OPENING` | L7091-7093 | |
| `rpErrMsg` | L7105-7115 | Traducción humana de errores |
| `rpSystemPrompt` | L7117-7140 | **System prompt de ESCENAS** |
| `renderRoleplayHome` / `renderRpCards` / `rpCardEl` | L7142-7189 | Portada |
| `renderRpBusyState` / `scheduleRpGenRetry` | L7191-7224 | Skeletons + poller |
| `generarEscenas` | L7226-7266 | 3 escenas por modelo creative |
| `rpSorprende` | L7268-7301 | 1 escena sorpresa |
| `startRoleplay` | L7303-7320 | |
| `rpAddMission` / `rpAddBubble` / `rpAddConsejo` | L7322-7359 | |
| `rpInputEnabled` / `rpSyncTTS` | L7361-7371 | |
| `rpTurn` | L7373-7468 | **Turno completo de ESCENA** |
| `closeRoleplay` | L7470-7479 | |
| `rpDebrief` | L7482-7558 | **Debrief de ESCENA** |
| `rpGuardarDebrief` / `rpCerrarDebrief` (window) | L7560-7568 | |
| Cableado de ESCENAS | L7570-7594 | |

---

## 1. Flujos

### 1.1 Entrada a la vista

1. `switchView('talk')` (L3641) → activa `#view-talk`, y **siempre** llama a
   `refrescarRompehielos()` (L3667) para dejar un rompehielos fresco en `#libre-ice`.
   Luego `animateIn(section.children)`.
2. En el arranque de la app (L7620-7643): `updateCostTicker()`, `syncTTSButton()`,
   `renderDNA()`, `refrescarRompehielos()`, `aplicarNivel()`, y si el nivel no es
   `'a1'` → `animateIn($('#view-talk').children)`.
3. El toggle `.talk-tab` (L3678-3699) cambia `state.talkMode` entre `'charla'` y
   `'escenas'`, togglea `hidden`/`flex` en `#charla-pane` y `#escenas-pane`,
   sincroniza `aria-selected`, y **al pasar a escenas llama `renderRoleplayHome()`**
   (primera generación de escenas ocurre ahí, no antes).
4. `actualizarCromo()` (L3702) mantiene `body.rd-sesion` cuando hay sesión viva
   (`#talk-session` visible, o `#escenas-pane` + `#roleplay-session` visibles).
   Con `rd-sesion` la tab bar desaparece: el ← de cada pantalla es la vuelta.
   En React esto se deriva del estado, no de un MutationObserver.

### 1.2 CHARLA — dibujo libre (`#libre-go` → `startLibre`, L3975)

1. Guard `if (state.busy) return`; luego `premiumGate('talk')` si existe (L3978).
2. Lee el texto visible de `#libre-ice`; si está vacío, `elegirRompehielos()`.
3. Si hay `nombreUsuario()`: prefija `Hey ${nom} — ` y baja la primera letra del
   rompehielos **solo si** casa `/^[A-Z][a-z]/` (no toca siglas tipo "AI ...").
4. `buildSituation()` + `store.get('rodeo_openers', [])`.
5. Crea `state.session` con **dos** mensajes:
   `system` = `talkSystemPrompt(SCENARIOS.free.prompt, sit, avoidOpeners)` y
   `assistant` = `JSON.stringify({reply: ice, corrections: [], glosses: []})`.
   **El rompehielos NO gasta llamada a la API**: es la apertura ya pintada.
6. Oculta `#talk-empty`, muestra `#talk-session` (`hidden` fuera, `flex` dentro),
   `#session-title` = `'Dibujo libre'`, vacía `#chat-scroll`.
7. `syncTTSButton()`; `tipPrimeraVez('talk', 'Toca el mic y habla — te corrijo')`.
8. `addBubble(esc(ice), 'bubble-coach')` — sin máquina de escribir, directo.
9. `ultimoHablado = parseChunks(ice).clean`; `syncReplayButton()`;
   `if (state.ttsOn) speak(ice)`.

`#libre-shuffle` → `refrescarRompehielos()` (L4261): solo repinta el texto.

### 1.3 CHARLA — escenario por chip (`startSession(key)`, L3890)

1. `premiumGate('talk')`.
2. `sc = SCENARIOS[key]`, `sit = buildSituation()`, `avoidOpeners = store.get('rodeo_openers', [])`.
3. `state.session = { scenario: key, title: sc.title, situation: sit, messages: [ {role:'system', content: talkSystemPrompt(sc.prompt, sit, avoidOpeners)} ] }`.
4. Mismo swap de panes que arriba; `#session-title` = `sc.title`; `#chat-scroll` vacío.
5. `syncTTSButton()`; `tipPrimeraVez('talk', …)`.
6. **`sendTurn(null)`** — el coach abre (esto SÍ gasta una llamada).

Cableado: `$$('#talk-empty .chip')` → `startSession(chip.dataset.scenario)` (L4253).

### 1.4 CHARLA — turno (`sendTurn(userText)`, L4109)

Paso a paso, literal:

1. Guard: `if (state.busy || !state.session) return`. `state.busy = true`;
   `#send-btn` disabled.
2. Si hay `userText`: push `{role:'user', content:userText}` + `addBubble(esc(userText),'bubble-user')`.
   Si NO (apertura): `state.session.isOpening = true` y push del **mensaje de
   apertura** (verbatim en §2.2).
3. `typing = addTyping()` → burbuja `bubble-coach` con el `pencilHTML()`.
4. `typingTick` = `setInterval` 1000 ms: a partir de los 3 s inyecta un
   `<span class="rd-wait">` dentro de la burbuja del lápiz con
   `` `${s}s` `` y, pasados 25 s, `` `${s}s · pensando` ``.
   Estilo inline original: `margin-left:10px;font-family:'Space Mono',monospace;font-size:0.7rem;opacity:.55;`.
5. **Stream**: `callStream('chat', state.session.messages, TALK_MAX_TOKENS, onDelta)`.
   En cada delta (acumulado): si `!state.session` → return (volvió atrás);
   `partial = extractPartialReply(acc)`; si vacío → return (los puntitos/lápiz
   siguen mientras el modelo razona); la primera vez que hay texto:
   `typing.remove()` y `liveBubble = addBubble('', 'bubble-coach')`;
   luego `liveBubble.textContent = stripChunksLive(partial)` + autoscroll.
6. Si `callStream` lanza → se descarta `liveBubble` y se cae a
   `callAPI('chat', messages, TALK_MAX_TOKENS)` (sin romper la sesión).
7. `if (!state.session) return` — respuesta huérfana, se descarta en silencio.
8. Red de seguridad: si `(!content || !content.trim()) && finish === 'length'` →
   quita `liveBubble` y reintenta con `callAPI(..., TALK_MAX_TOKENS_RETRY /*6000*/)`.
9. `parsed = parseJSON(content)`:
   - `parsed && parsed.reply` → `reply = parsed.reply`,
     `corrections = Array.isArray(parsed.corrections) ? parsed.corrections : []`,
     push `{role:'assistant', content: JSON.stringify(parsed)}`.
   - si no, y `finish === 'stop' && content && !content.trim().startsWith('{')` →
     texto plano legítimo: `reply = content`, `corrections = []`, push del content crudo.
   - si no → `throw new Error('El coach se enredó — repite el mensaje')`.
10. `typing.remove()`; `glosses = parsed?.glosses ?? []`;
    si no hay `liveBubble` se crea vacía.
11. **Fase 1→2** (§3): `escribirMaquina(burbuja, parseChunks(reply).clean, cb)`;
    en el callback: `burbuja.innerHTML = renderReply(reply, glosses)` y **recién
    entonces** caen las correcciones (una `correction-card` por cada `c.fix`
    truthy) + `saveDNA({type:'error', quote, fix, why})` por cada una.
12. Anti-repetición de aperturas: si `state.session.isOpening` → `isOpening=false`,
    `prev = store.get('rodeo_openers', [])`, `prev.push(String(reply).slice(0,140))`,
    `store.set('rodeo_openers', prev.slice(-8))`.
13. `ultimoHablado = parseChunks(reply).clean`; `syncReplayButton()`;
    `if (state.ttsOn) speak(reply)`.
    **La voz arranca en paralelo al tecleo** (leer y oír a la vez es la gracia).
14. `catch`: `typing.remove()`, `liveBubble?.remove()`, y si la sesión sigue viva:
    `toast('Error: ' + err.message, 5000)` + `state.session.messages.pop()`
    (no dejar el turno colgado).
15. `finally`: `clearInterval(typingTick)`, `state.busy = false`, `#send-btn` enabled.

Entradas al turno: `submitInput()` (L4267, click en `#send-btn` o Enter en
`#chat-input`, trim + limpia el input) y el `onend` del reconocimiento (§4.2).

### 1.5 CHARLA — bombilla (`#idea-btn`, L4426)

- Guard propio `ideaBusy` (**no** usa `state.busy`: puedes pedir idea mientras el
  coach responde). Añade clase `on` al botón mientras vuela.
- Contexto: último mensaje `assistant` de `state.session.messages`, se le extrae
  `.reply` del JSON (con `catch` a string crudo), `.slice(0, 500)`; si no hay,
  `'(conversation start)'`.
- `callJSON('chat', [...], 400)` con el prompt de §2.5.
- Si no hay `parsed.idea` → `throw new Error('no salió — dale otra vez')`.
- Si la sesión murió mientras volaba → return sin pintar.
- Pinta `addBubble('<span class="idea-tag">💡 podrías decir</span>' + esc(idea), 'bubble-idea')`.
- **No** entra a `state.session.messages` (es meta-ayuda, no turno).
- Error → `toast('Idea: ' + err.message)`.

### 1.6 CHARLA — cierre

**Volver (`#back-btn`, L4336)** — NO dispara debrief (es una llamada cara):
`state.busy = false`; `#send-btn` enabled; `closeSession()`. Funciona aun con un
turno en vuelo (el turno se descarta solo por el guard `!state.session`).

**Terminar (`#end-session`, L4276)** — debrief:
1. Guard: `if (!state.session || state.busy) return`.
2. `userTurns = messages.filter(m => m.role === 'user').length`;
   **si `< 3` → `closeSession()` y fuera, sin debrief.**
   (Ojo: el mensaje de apertura cuenta como `user`, así que en una sesión abierta
   por chip hacen falta 2 réplicas reales; en dibujo libre, 3.)
3. `state.busy = true`; `toast('Preparando tu debrief...', 4000)`.
4. Transcript: todos los mensajes `role !== 'system'`, mapeados a
   `('GUS: '|'COACH: ') + m.content.slice(0, 600)`, unidos por `\n`. **Sin tope global.**
5. `callJSON('creative', [...], 3200)` con el prompt de §2.6.
6. Si `!d` → `throw new Error('No pude analizar la sesión')`.
7. `state.sessions += 1`; `store.set('rodeo_sessions', state.sessions)`.
   **NO llama a `updateStreak()`** (asimetría real con roleplay; portar tal cual).
8. `d.top_errors[]` → `saveDNA({type:'error', quote, fix, why})` (si `e.fix`).
   `d.upgrades[]` → `recordUpgrade({b2: u.b2, c1: u.c1, note: u.note||'', dominado:false})`
   (si `u.c1 && u.b2`).
9. `openSheet(html)` con el bloque DEBRIEF (título `DEBRIEF.`, sección
   "Errores que más te cuestan", sección "Dilo como un C1", `closing` en cursiva,
   botón `LISTO` → `closeSheetAndSession()`).
10. `catch` → `toast('Error en el debrief: ' + err.message)` + **`closeSession()`**
    (la sesión se pierde; en roleplay NO — ver §8).
11. `finally` → `state.busy = false`.

**`closeSession()` (L4342):** `state.session = null`; `stopSpeaking()`; `stopMic()`;
vacía `#chat-scroll`; oculta `#talk-session`; muestra `#talk-empty`; recoge
`#talk-typebar` (quita `flex`/`has-text`, pone `hidden`) y limpia `#chat-input`;
`refrescarRompehielos()`.

### 1.7 ESCENAS — portada (`renderRoleplayHome`, L7142)

1. `if (state.roleplay) return` (hay sesión viva: no repintar debajo).
2. `#rp-canonico` ← `rpCardEl(RP_CANONICO, true)`.
3. Si `rpCards.length` → `renderRpCards()`; si no → `generarEscenas()`.

`generarEscenas(fromTap)` (L7226):
- Si `rpGenBusy` → (si `fromTap`) `toast('Ya estoy armando tus escenas…', 1800)` y return.
- Si `state.busy` (otro módulo tiene el modelo) → `renderRpBusyState()` (3 `.rp-skel`
  + nota con botón `#rp-loadnow` "cargar ya") + `scheduleRpGenRetry()` + (si `fromTap`)
  `toast('Estoy terminando otra cosa — cargan solas en cuanto acabe', 2800)`.
- `rpGenBusy = true`; `#rp-refresh` disabled; 3 skeletons en `#rp-cards`.
- `avoid` = títulos ya en `rpCards` + `RP_CANONICO.title`, unidos por `', '`,
  o `'none'`.
- `callJSON('creative', [...], 2600)` con el prompt de §2.8.
- Filtro: array, con `title && role_es && goal_es && obstacle_es`, `.slice(0,3)`.
  Si vacío → `throw new Error('No pude armar las escenas, dale otra vez')`.
- `rpCards = valid`; `renderRpCards()`.
- `catch` → pinta en `#rp-cards`: `<p>${esc(rpErrMsg(err))} · <button id="rp-retry" class="rp-refresh">reintentar</button></p>`.
- `finally` → `rpGenBusy = false`; `#rp-refresh` enabled.

`scheduleRpGenRetry()` (L7204): poller `setInterval` 700 ms; aborta si
`state.view !== 'talk'`, hay `state.roleplay`, no existe `#rp-cards`, ya hay
`rpCards`, o `tries > 40`; cuando `!state.busy && !rpGenBusy` → `generarEscenas()`.

`rpSorprende()` (L7268): si `rpGenBusy || state.busy` →
`toast('Espera a que termine lo que está corriendo', 2200)`.
`toast('Inventando una escena...', 3000)`; `callJSON('creative', [...], 1800)`
(prompt §2.9); acepta objeto o `parsed[0]`; valida los 4 campos.
**Si mientras tanto se abrió una escena (`state.roleplay`)**: no la pisa —
`rpCards = [sc, ...rpCards].slice(0,3)`, `renderRpCards()`,
`toast('Tu escena sorpresa te espera en la portada', 3000)`. Si no → `startRoleplay(sc)`.
Error → `toast('Error: ' + rpErrMsg(err), 5000)`.

`rpCardEl(sc, canon)` (L7161): botón `.rp-card` (+`.rp-card--canon`). Al click:
**si `canon` y existe `window.openStoryImmersion` → `openStoryImmersion('princess_001')`**
(episodio ilustrado, módulo externo `js/story-mode.js`); si no → `startRoleplay(sc)`.

### 1.8 ESCENAS — sesión (`startRoleplay(sc)`, L7303)

1. Guard `if (state.busy || state.roleplay) return`; `premiumGate('roleplay')`.
2. `stopSpeaking()`.
3. `state.roleplay = { scenario: sc, messages: [{role:'system', content: rpSystemPrompt(sc)}] }`.
4. Oculta `#roleplay-home`, muestra `#roleplay-session`; `#rp-title` = `sc.title`;
   `#rp-scroll` vacío; `#rp-replay` disabled; `rpSyncTTS()`.
5. `tipPrimeraVez('roleplay', 'Actúa tu rol — yo narro el resto')`.
6. `rpAddMission(sc)` → tarjeta `.rp-mission` con Rol / Objetivo / Obstáculo.
7. `rpTurn(null, true)` — el narrador abre la escena.

**`rpTurn(userText, isOpening)` (L7373)** — diferencias reales contra `sendTurn`:

- Guard: `if (rpBusy || !state.roleplay)`. **Si había `userText` y la sesión vive,
  lo devuelve al input** (`if (i && !i.value) i.value = userText`) en vez de tragarlo.
- **Captura de identidad**: `const ses = state.roleplay` y **todos** los guards del
  turno comparan `state.roleplay === ses` (no truthiness). Esto evita que un turno
  huérfano pinte en la sesión nueva y corrompa su historial. **Portar así.**
- `rpBusy = true`; `state.busy = true` (bloquea generación de escenas);
  `rpInputEnabled(false)` (deshabilita `#rp-send`, `#rp-input`, `#rp-mic` +
  `opacity 0.4` en el mic — deshabilitar de verdad, no solo atenuar).
- Apertura: push `{role:'user', content: RP_OPENING}` (§2.7).
- `typing = rpAddBubble(pencilHTML(), 'bubble-coach rp-narr')` — **sin** contador
  de segundos (eso es exclusivo de CHARLA).
- Stream idéntico a CHARLA con `RP_MAX_TOKENS` (2200) y clase `bubble-coach rp-narr`.
- Reintento: aquí **primero se parsea** y solo se reintenta
  `if (!parsed && finish === 'length')` con `RP_MAX_TOKENS_RETRY` (5000)
  (cubre a la vez vacío y JSON truncado).
- Shape: `reply`, `glosses` (array o `[]`), `consejo` (string o `''`).
  Fallback de texto plano igual que CHARLA. Error:
  `'No pude abrir la escena — reintenta'` si `isOpening`, si no
  `'El narrador se enredó — repite tu línea'`.
- **NO hay máquina de escribir**: `liveBubble.innerHTML = renderReply(reply, glosses)`
  de una. Luego, si `consejo.trim()` → `rpAddConsejo(consejo)`.
- `ultimoHablado = parseChunks(reply).clean`; `#rp-replay` enabled;
  `if (state.ttsOn) speak(reply)`.
- `catch`: quita typing y liveBubble; si `state.roleplay === ses` →
  `toast('Error: ' + rpErrMsg(err), 5000)`, `ses.messages.pop()`, y
  **si había `userText` lo devuelve a `#rp-input`**.
- `finally`: **solo si `state.roleplay === ses`** → `rpBusy=false`,
  `state.busy=false`, `rpInputEnabled(true)`.

Envío: `#rp-send` click o Enter en `#rp-input` → trim, limpia, `rpTurn(t, false)`.
Mic: `wireMic($('#rp-mic'), $('#rp-input'), (t) => rpTurn(t, false), 'rp')`.

### 1.9 ESCENAS — cierre

**`#rp-back` (L7583):** `closeRoleplay()` y **después** `rpBusy=false; state.busy=false; rpInputEnabled(true)`
(en ese orden: el `finally` del turno huérfano ya no tocará el estado global).

**`closeRoleplay()` (L7470):** `state.roleplay = null`; `stopSpeaking()`; limpia
`#rp-input`; vacía `#rp-scroll`; oculta `#roleplay-session`; muestra `#roleplay-home`.

**`#rp-end` → `rpDebrief()` (L7482):**
1. Guard `if (!state.roleplay || rpDebriefBusy || state.busy) return`.
2. `turns = messages.filter(m => m.role === 'user').length`; **si `< 2` →
   `closeRoleplay()`** (la apertura cuenta, así que exige ≥1 réplica real).
3. `rpDebriefBusy = true`; `rpInputEnabled(false)`; `#rp-end` disabled.
4. Indicador persistente (no un toast): burbuja `bubble-coach rp-narr` con
   `pencilHTML()` + `<div style="font-size:0.78rem; color:var(--text-secondary); margin-top:6px;">cerrando la escena…</div>`.
5. Transcript: no-system → **`.slice(-14)`** → `('GUS: '|'ESCENA: ') + content.slice(0,600)`
   → join `\n`; si `length > 7000` → `'…\n' + clean.slice(-7000)`.
6. `callJSON('creative', [...], 2600)` (prompt §2.10).
7. Si `state.roleplay !== ses` → quita el indicador y return.
   Si `!d` → `throw new Error('no pude analizar la escena')`.
8. `items = d.aprendizajes.filter(x => x && x.en)`; `rpLastDebrief = items`.
9. `state.sessions += 1`; `store.set('rodeo_sessions', …)`; **`updateStreak()`** (sí, aquí sí).
10. `openSheet(...)` con "CÓMO TE FUE.", lista de aprendizajes, `closing`, y botones
    `GUARDAR N A MI DNA` → `rpGuardarDebrief()` y `Ahora no`/`LISTO` → `rpCerrarDebrief()`.
11. `catch`: quita el indicador y, si la sesión sigue viva, **NO la destruye**:
    abre una hoja "NO SALIÓ EL CIERRE." con `REINTENTAR CIERRE`
    (`closeSheet(); setTimeout(rpDebrief, 100)`) y `Salir sin análisis`
    (`closeSheet(); closeRoleplay()`).
12. `finally`: `rpDebriefBusy = false`; `#rp-end` enabled; si sigue siendo la
    sesión activa → `rpInputEnabled(true)`.

`window.rpGuardarDebrief` (L7560): por cada item
`saveDNA({type:'slang', term: it.en, meaning: it.es || '', example: ''})`;
vacía `rpLastDebrief`; `closeSheet()`; `closeRoleplay()`;
``toast(`${n} ${n === 1 ? 'frase guardada' : 'frases guardadas'} en tu DNA`)``.
`window.rpCerrarDebrief` (L7568): `rpLastDebrief = []`, `closeSheet()`, `closeRoleplay()`.

---

## 2. Prompts del sistema (VERBATIM)

### 2.1 `talkSystemPrompt(scenarioPrompt, sit, avoidOpeners)` — L3848-3888

Precondiciones dentro de la función:

```js
const avoid = avoidOpeners && avoidOpeners.length
  ? `\nDO NOT open anything like these — you have already used them:\n${avoidOpeners.map((o) => `- "${o}"`).join('\n')}`
  : '';
const nom = nombreUsuario() || 'Gus';
```

Template literal exacto (los `${…}` son las interpolaciones reales):

```text
You are ${nom}'s conversation partner inside RODEO, a personal English trainer. ${nom} is Venezuelan, lives in Medellín, Colombia, level B2+ working toward C1 for work (crypto/tech startup) and daily life. Greet him by name ("${nom}") once at the start, then use his name sparingly, like a friend would.

SCENARIO: Role-play ${scenarioPrompt}

YOUR STATE RIGHT NOW — this is what makes you a person instead of a chatbot. Let it colour everything:
- Mood: ${sit.mood}
- What just happened to you: ${sit.beat}
- What you want out of this conversation: ${sit.agenda}
- Somewhere in this conversation: ${sit.twist}

HOW TO TALK:
- Stay in character. Contemporary, natural English. 2-4 sentences.
- CRITICAL: do NOT end every turn with a question. Vary it — react, tell a piece of your own story, disagree, make a remark and let it sit. Ask a real question maybe one turn in three. You are having a conversation, not conducting an interview.
- Be specific. Names, places, numbers, small concrete details. Vague friendliness is exactly what makes you sound like a bot.
- Let the conversation drift the way real ones do. Do not keep steering back to the same two topics.
- Use vocabulary slightly above his level on purpose (C1 collocations, phrasal verbs, natural idioms).
- ${NOTA_STT_BILINGUE}${avoid}${dnaBrief()}${interesesBriefTalk()}

CÓMO-DIGO & UNDERLINED CHUNKS — a signature feature, get this right:
- ${nom} sometimes switches to Spanish or Spanglish to ask how to say something, e.g. "oye cómo digo que hice tres veces seguidas el ensayo y no salió". Detect it yourself, no flag needed. When he does, your "reply" hands him the exact natural English a gringo would really use, dropped in like a friend ("Ah, you'd just say...") — not a lesson, and not a list of options unless he asks for alternatives.
- To underline the tricky part, wrap it INSIDE "reply" with these EXACT markers: ⟦english chunk||explicación corta y cercana, en español⟧. The explanation is contextual and buddy-style, the way a bilingual friend riffs — NEVER a grammar book. GOOD: ⟦three times in a row||así dicen los gringos eso de "X veces seguidas" — sirve para intentos, días, victorias, lo que sea⟧. BAD: "estructura adverbial de frecuencia".
- Use the SAME ⟦english||español⟧ markers when you fold a correction into your reply, or when you drop an idiom / phrasal verb he probably won't fully catch. AT MOST 1-2 marked chunks per reply, and ONLY when it truly helps — most casual turns have zero.
- The markers are the ONLY place Spanish may appear inside "reply"; everything else stays natural English. NEVER leave a ⟦ or a ⟧ unmatched, and never mark the same phrase both inline with ⟦||⟧ and again in the glosses array.

SPEED: do NOT deliberate or plan before answering. No preamble, no reasoning.
Emit the JSON as your very first character — you are role-playing a person, not
solving a problem. (Medido: sin esto Kimi gasta ~1400 tokens razonando y el turno
pasa de ~8s a 10-19s, con la misma calidad de respuesta.)

OUTPUT — STRICT JSON only, nothing outside it, exactly this shape:
{"reply":"your in-character reply","corrections":[{"quote":"the exact incorrect words he wrote","fix":"how a native would say it","why":"por qué, en español, una sola línea"}],"glosses":[{"term":"the exact phrase as it appears in your reply","es":"qué significa y por qué se dice así, natural"}]}
- "corrections": only REAL errors or clearly unnatural phrasing from HIS LAST message. Maximum 3, the most valuable. If his message was clean, return []. Typos don't count.
- "glosses": pick 2-4 phrases FROM YOUR OWN reply that a B2 learner likely won't fully get — phrasal verbs, slang, idioms, natural collocations (e.g. "wound up", "blowout", "shoot the breeze"). For each, "term" must be the EXACT substring as written in reply (same case, same words), and "es" explains in Spanish what it MEANS and why a native uses it there — conversational, like a friend explaining, NEVER grammar-speak (no "subjuntivo", no "phrasal verb", no tense names). One or two lines. If the reply has no such phrases, or you already underlined them inline with ⟦||⟧, return [].
- Never correct him inside "reply" — that must flow as pure conversation (the only exception is a correction you fold in and underline with ⟦english||español⟧).
```

**`NOTA_STT_BILINGUE` (L3004) — verbatim, se inyecta como el último bullet de
"HOW TO TALK" en CHARLA y en "HOW YOU PLAY" en ESCENAS:**

```text
Note: his message may come from voice dictation, and Gus is bilingual (Spanish/English) — he often mixes both languages mid-sentence, so words from either language can arrive mis-transcribed or garbled. Read his intent charitably: infer what he meant instead of taking an odd transcription literally, and never flag a likely mis-hearing as a mistake.
```

**`dnaBrief()` (L3835) — se concatena justo detrás de `avoid`:**

```js
const debil = state.dna.filter((d) => !d.dominado);
const errs  = debil.filter((d) => d.type === 'error'   && d.fix).slice(0, 6).map((d) => d.fix);
const ups   = debil.filter((d) => d.type === 'upgrade' && d.fix).slice(0, 4)
                   .map((d) => (d.b2 ? `"${d.b2}" → "${d.fix}"` : `"${d.fix}"`));
const slang = state.dna.filter((d) => d.type === 'slang' && d.term).slice(0, 6).map((d) => d.term);
```

Partes (verbatim), unidas por `'\n- '` y prefijadas por
`` `\nWHAT YOU KNOW ABOUT HIM (never say this out loud):\n- ` `` (o `''` si no hay ninguna):

```text
He has recently struggled with: ${errs.join(' · ')}. Steer the conversation so he naturally NEEDS one or two of these — set up the moment, let him try, and only fold in a ⟦english||español⟧ correction if he misses again. NEVER mention this list.
```
```text
C1 upgrades he is training (his flat version → the native one): ${ups.join(' · ')}. If he uses a flat version, reply naturally USING the native one yourself so he hears it live — never point it out.
```
```text
He has recently learned: ${slang.join(' · ')}. Use one or two in passing if they fit naturally.
```

**`interesesBriefTalk()` (L3056)** — `''` si no hay intereses; si los hay:

```text
\nHIS WORLD — weave topics, examples and the flavour of the scenario around these when it fits naturally, never force them and never list them out loud: ${xs.join(', ')}.
```

### 2.2 Mensaje de apertura de CHARLA (user, L4118-4123) — VERBATIM

```text
(Start the conversation. Open from where your head actually is right now — your mood and what just happened to you — not with a generic greeting. Do NOT open by asking if I'm new here or what brings me here.

If you ask something, make it ONE concrete personal question with an obvious first answer — the kind of "Can you describe a gadget you own and why it's useful?" — never abstract ("what do you think about life").

LENGTH — hard limit, this matters more than anything else here: AT MOST TWO short sentences, and under 150 characters total. Never three sentences. ONE vivid detail, not three. Do not explain or wrap up the story — drop me in mid-thought and stop. Leave me room to answer.)
```

### 2.3 Shape EXACTO de la respuesta de CHARLA

```jsonc
{
  "reply": "string — inglés natural; ÚNICO lugar donde puede aparecer español, y solo dentro de marcadores ⟦english chunk||explicación en español⟧",
  "corrections": [
    { "quote": "las palabras incorrectas exactas que él escribió",
      "fix": "cómo lo diría un nativo",
      "why": "por qué, en español, una sola línea" }
  ],
  "glosses": [
    { "term": "substring EXACTO de reply (mismo case, mismas palabras)",
      "es": "qué significa y por qué se dice así, en español coloquial" }
  ]
}
```

Reglas del contrato: `corrections` máx. 3 (o `[]`), `glosses` 2-4 (o `[]`),
como mucho 1-2 chunks `⟦||⟧` inline por reply, nunca la misma frase inline **y**
en `glosses`.

### 2.4 Shape EXACTO de la respuesta de ESCENAS

```jsonc
{
  "reply": "escena + línea hablada del personaje, en inglés natural, con ⟦en||es⟧ opcionales",
  "glosses": [ { "term": "…", "es": "…" } ],   // hasta 3, o []
  "consejo": "acotación teatral EN ESPAÑOL, o cadena vacía"   // string, casi siempre ''
}
```

### 2.5 Prompt de la bombilla (`#idea-btn`, L4441-4443) — VERBATIM

system:
```text
You coach a B2+ English learner. Respond STRICT JSON only, first character = JSON.
```
user:
```text
The coach just said: ${contexto}
Give ONE short example answer the LEARNER could say next — natural, first person, max 15 words. JSON: {"idea":"..."}
```
`callJSON('chat', …, 400)`. Shape: `{"idea":"…"}`.

### 2.6 Prompt del debrief de CHARLA (L4288-4293) — VERBATIM

system:
```text
You are an expert English coach analyzing a conversation practice session. Respond with STRICT JSON only.
```
user:
```text
Analyze GUS's English in this transcript (he is B2+ aiming for C1). Return JSON:
{"top_errors":[{"quote":"","fix":"","why":"en español, una línea"}],"upgrades":[{"b2":"something he said that was correct but basic","c1":"how a C1 speaker would phrase it","note":"en español, una línea"}],"closing":"2 honest sentences of coach feedback in English"}
Max 3 top_errors (the most costly ones) and max 3 upgrades. TRANSCRIPT:\n${transcript}
```
`callJSON('creative', …, 3200)`.

### 2.7 `RP_OPENING` (L7093) — VERBATIM

```text
(Open the scene now. In 2-4 vivid sentences set the place, the mood, and drop me into my role, then have the character speak their FIRST line straight to me — pointed enough that I have to answer. Do NOT act or speak for me. Keep it tight, and remember the exact JSON shape.)
```

### 2.8 `rpSystemPrompt(sc)` (L7117-7140) — VERBATIM

```text
You are the NARRATOR and EVERY CHARACTER of an interactive theatre game inside RODEO, a personal English trainer. The player is Gus: Venezuelan, lives in Medellín, level B2+ working toward C1, works in crypto/tech. This is playable narrative theatre — you run the world and everyone in it EXCEPT Gus, who acts out a role IN ENGLISH.

THE SCENE
- Title: ${sc.title}
- Gus's role: ${sc.role_es}
- Gus's goal: ${sc.goal_es}
- The obstacle / the tension: ${sc.obstacle_es}${interesesBriefTalk()}

HOW YOU PLAY
- Paint vivid, sensory scenes in 2-4 sentences, then let a character speak. Voice each character as a real person with self-interest, mood and pushback — never make the goal easy, never fold at the first polite request.
- React to what Gus actually says and let it move the story. If he plays it well, the character softens or the plot opens; if he fumbles, the tension rises — but never break the fiction to lecture him.
- Contemporary, natural English (C1 collocations, phrasal verbs, real idioms). Put spoken lines in quotes. NEVER narrate Gus's own words or actions for him — leave him room to act.
- ${NOTA_STT_BILINGUE}

OUTPUT — STRICT JSON, your very first character must be '{':
{
  "reply": "the scene + the character's spoken line, in natural English. To underline a genuinely useful phrase, wrap it INLINE with these EXACT markers: ⟦english chunk||explicación corta y cercana en español⟧ — only phrases that help Gus negotiate, persuade or sound natural, AT MOST 1-2 per turn, often zero.",
  "glosses": [ up to 3 items {"term","es"} chosen FROM your own reply — phrasal verbs, idioms or collocations a B2 won't fully catch. "term" MUST be an exact substring of reply (same case, same words). "es" explains like a bilingual friend, never grammar-speak (no 'subjuntivo', no tense names). [] if none, or if you already underlined them inline. ],
  "consejo": "OPTIONAL theatrical aside in SPANISH — a director whispering from the wings. When it helps, hand Gus 1-2 concrete English phrases he could USE right now to negotiate, stand his ground or apply strategic courtesy, e.g. Para no ceder de una: \"That's a bit steep — what's your best price?\". Empty string on most turns; include it ONLY when it truly helps him take the next move."
}
The ⟦||⟧ markers are the ONLY place Spanish may appear inside "reply". NEVER leave a ⟦ or a ⟧ unmatched, and never repeat a phrase both inline with ⟦||⟧ and again in the glosses array.
```

### 2.9 Prompt de generación de 3 escenas (L7248-7256) — VERBATIM

system:
```text
You design vivid, playable roleplay THEATRE scenarios for an English learner. Respond with STRICT JSON only.
```
user:
```text
Design exactly 3 fresh, dramatic roleplay scenes for Gus (B2+ heading to C1, works in crypto/tech, lives in Medellín). In each, he plays a ROLE with a clear GOAL and a real OBSTACLE — someone or something pushing back, with genuine stakes and friction. Like the canonical example: a princess at the market haggling for scarce saffron against a vendor who smells her money.
Not everyday small talk — negotiation, persuasion, standing your ground, charm or nerve under pressure. Make them varied and a little surprising.${interesesLineaDrop()}
Avoid repeating these titles: ${avoid}.
Return a STRICT JSON array of exactly 3 objects, each with keys:
{"title":"título corto y evocador en español (máx 5 palabras)","emoji":"un emoji que encaje","role_es":"quién es Gus en la escena, 1 frase","goal_es":"qué quiere lograr, 1 frase","obstacle_es":"el obstáculo o la tensión: quién se le opone y por qué, 1 frase"}
Emit the JSON array as your very first character, nothing before it.
```
`callJSON('creative', …, 2600)`.

`interesesLineaDrop()` (L3062) — `''` sin intereses, si no:
```text
\nIntereses del lector (elige el ángulo y los ejemplos que le hablen, sin nombrarlo nunca en el texto): ${xs.join(', ')}.
```

### 2.10 Prompt de "sorpréndeme" (L7277-7282) — VERBATIM

system:
```text
You invent one vivid, surprising roleplay THEATRE scenario for an English learner. Respond with STRICT JSON only.
```
user:
```text
Invent ONE unexpected, dramatic roleplay scene for Gus (B2+ heading to C1, crypto/tech, Medellín) where he plays a role with a clear goal and a real obstacle pushing back — stakes and friction, not small talk. Surprise him; go somewhere unusual.${interesesLineaDrop()}
Avoid these titles: ${avoid}.
Return a STRICT JSON object: {"title":"título corto en español","emoji":"un emoji","role_es":"quién es Gus, 1 frase","goal_es":"qué quiere, 1 frase","obstacle_es":"el obstáculo, 1 frase"}
Emit the JSON object as your very first character.
```
`callJSON('creative', …, 1800)`.

### 2.11 Prompt del debrief de ESCENA (L7517-7521) — VERBATIM

system:
```text
You are an English coach reviewing a roleplay theatre session. Respond with STRICT JSON only.
```
user:
```text
Gus (B2+ heading to C1) just acted out this scene in English. Pull out 2-3 things genuinely worth keeping — natural English phrases he could have used, or used well, to negotiate / persuade / stand firm / sound native in THIS situation. Return JSON:
{"aprendizajes":[{"en":"the English phrase or chunk","es":"para qué sirve y cuándo usarla, en español, una línea"}],"closing":"2 honest sentences in Spanish about how he handled the scene"}
Max 3 aprendizajes. TRANSCRIPT:\n${transcript}
```
`callJSON('creative', …, 2600)`.

---

## 3. Fase 1 / Fase 2 del pintado

### 3.1 Fase 1 — mientras streamea (texto plano)

- El modelo emite un JSON; a mitad de stream `JSON.parse` falla, así que
  `extractPartialReply(acc)` (L3573, ya portado) saca a mano el string de
  `"reply"` respetando escapes partidos entre chunks (`\n`, `\t`, `\r` ignorado,
  `\uXXXX` incompleto → corta).
- Mientras `extractPartialReply` devuelva `''` **no se pinta nada**: el lápiz sigue
  girando (el modelo está razonando).
- Al primer texto: se quita la burbuja del lápiz y se crea `liveBubble`
  (`bubble-coach`, o `bubble-coach rp-narr` en escenas).
- Se escribe con **`textContent`** (nunca innerHTML) el resultado de
  `stripChunksLive(partial)` (L3373):
  - reemplaza los marcadores completos por su inglés: `.replace(chunkRe(), '$1')`;
  - si queda un `⟦` abierto al final, corta desde ahí: si ya hay `||` deja lo
    anterior al separador, si no deja el resto tal cual;
  - `.replace(/[⟦⟧]/g, '')` final para barrer corchetes residuales.
- Autoscroll tras cada delta (`c.scrollTop = c.scrollHeight`).

### 3.2 Máquina de escribir (solo CHARLA, `escribirMaquina`, L4073)

- Cancela un tecleo previo (`el._tw`).
- `REDUCED` o texto vacío → `el.textContent = texto` + callback inmediato.
- `TW_MAX_CHARS = 120`: si `texto.length <= 120` → piezas por **carácter**
  (`[...texto]`, respeta emojis/acentos); si no → por **palabra** conservando
  espacios (`texto.split(/(\s+)/)`).
- Cada pieza es un `<span>` con `--i` = índice de pieza **no-espacio** (los espacios
  reciben el índice actual sin incrementarlo).
- Contenedor recibe la clase `rd-tw`. CSS original (L1632-1642):
  `animation: rd-char .4s cubic-bezier(.2,1.4,.4,1) backwards; animation-delay: calc(var(--i,0) * 0.018s)`,
  con `@keyframes rd-char { from { opacity:0; transform: translateY(30px) rotate(45deg) scale(0.5) } to { opacity:1; transform:none } }`.
- Duración total: `400 + visibles * 18` ms; al vencer, quita `rd-tw` y llama al callback.
- **Se teclea el texto YA limpio** (`parseChunks(reply).clean`): nunca se ve un `⟦`.
- En **ESCENAS no hay tecleo**: `innerHTML = renderReply(...)` directo.

### 3.3 Fase 2 — swap final con glosas (`renderReply`, L3355)

1. `const { clean, marks } = parseChunks(reply)` (L3320):
   - regex por llamada: `/⟦([\s\S]*?)\|\|([\s\S]*?)⟧/g` (`chunkRe()`, L3316) —
     nueva instancia cada vez para no arrastrar `lastIndex`;
   - construye `clean` (solo el inglés) y `marks = [{start, end, es}]` en coords
     del texto limpio (solo si `en && es`, ambos `.trim()`);
   - **saneo final**: si sobrevive algún `⟦`/`⟧` suelto, se barren y se **remapean**
     las coords de `marks` con una tabla `viejo índice → nuevo índice`.
2. `ocupado = new Array(clean.length).fill(false)`; `spans = []`.
3. Los `marks` inline tienen **prioridad**: se insertan primero si su rango está libre.
4. `glossSpans(clean, glosses, ocupado, spans)` (L3266): por cada `{term, es}`
   válido, busca con `indexOf` **case-insensitive** sobre el texto en minúsculas,
   toma la **primera aparición libre** (si está ocupada prueba la siguiente),
   marca ocupado y hace `break` (una sola aparición por glosa).
5. `spansToHTML(clean, spans, /* savable */ true)` (L3290): ordena por `start`,
   escapa cada tramo con `esc()` y emite por cada span:

```html
<span class="gloss" data-es="ESCAPADO" data-term="ESCAPADO" tabindex="0" role="button" aria-label="Ver significado">CHUNK</span>
```

   - `data-term` **solo** existe cuando `savable` (TALK/ESCENAS). En DROP/SLANG
     (`glossHTML`, L3305) `savable = false` y no hay `data-term`.
   - `data-es` y `data-term` se escapan con `escAttr` (escapa `& < > "`),
     el contenido visible con `esc`.
6. El resultado se asigna con `innerHTML` a la burbuja **después** del tecleo.

### 3.4 Tooltip de glosa (`#gloss-tip`, L3391-3452)

- Un único div `#gloss-tip` creado una vez y colgado de `document.body`
  (posicionado con JS para no recortarse dentro del scroll del chat).
- `posicionarTip(el)`: `w = Math.min(300, window.innerWidth - 24)`;
  `left = r.left + r.width/2 - w/2` clampeado a `[12, innerWidth - w - 12]`;
  `top = r.top - th - 8`, y si `< 8` → `r.bottom + 8`.
- **Hover** (`mouseover`/`mouseout` sobre `.gloss`, si no hay pin):
  `glossTip.textContent = data-es`, `pointerEvents = 'none'`.
- **Click** (táctil): fija/desfija. Fijado sobre un chunk con `data-term` pinta
  HTML interactivo y `pointerEvents = 'auto'`:

```html
<div class="gloss-tip-es">${esc(es)}</div>
<button type="button" class="gloss-save" data-term="…" data-es="…"[ disabled]>＋ guardar a DNA</button>
```

  con el texto `'✓ en tu DNA'` y `disabled` si `dnaTieneSlang(term)` (L3385:
  busca en `state.dna` un `type === 'slang'` con `term` igual, trim + lowercase).
- Click **dentro** del tooltip no lo cierra (`e.target.closest('#gloss-tip')` → return).
- Click en `.gloss-save`:
  `saveDNA({ type:'slang', term: btn.dataset.term, meaning: btn.dataset.es || '', example: '' })`,
  el botón pasa a `'✓ en tu DNA'` + `disabled`, y
  ``toast(`"${term}" · guardado en tu DNA`)``. **El tooltip NO se cierra.**
- Click fuera de cualquier `.gloss` con pin activo → `cerrarTip()`.

### 3.5 Correcciones → DOM y → `rodeo_dna`

Se pintan **después** del tecleo, dentro del callback (L4210-4218), una por cada
`c` con `c.fix` truthy:

```html
<div class="correction-card">
  <div><span class="quote">${esc(c.quote||'')}</span> → <span class="fix">${esc(c.fix)}</span></div>
  <div class="why">${esc(c.why||'')}</div>
</div>
```

y en el mismo bucle `saveDNA({ type:'error', quote: c.quote||'', fix: c.fix, why: c.why||'' })`.

**`saveDNA(item)` (L4914) — forma exacta del item persistido:**

```js
const key = item.type + '|' + (item.fix || item.term || '');
// dedupe exacto: si ya existe un item con esa key, NO hace nada
state.dna.unshift({ ...item, ts: Date.now() });   // newest-first
state.dna = state.dna.slice(0, 300);              // tope duro
store.set('rodeo_dna', state.dna);
```

Items que TALK escribe en `rodeo_dna`:

| Origen | Objeto exacto guardado |
|---|---|
| Corrección de turno (§1.4) | `{ type:'error', quote, fix, why, ts }` |
| Tooltip "guardar a DNA" | `{ type:'slang', term, meaning, example:'', ts }` |
| Debrief CHARLA · `top_errors` | `{ type:'error', quote, fix, why, ts }` |
| Debrief CHARLA · `upgrades` (via `recordUpgrade`) | `{ type:'upgrade', b2, fix:c1, swap:'', why:note, register:'', dominado:false, ts }` |
| Debrief ESCENA · `aprendizajes` | `{ type:'slang', term:it.en, meaning:it.es\|\|'', example:'', ts }` |

**`recordUpgrade({b2, c1, swap, note, register, dominado})` (L4925):** si ya existe
un `type==='upgrade'` con el mismo `fix` (=c1) y el mismo `b2`, **actualiza** en
sitio (`dominado` es pegajoso: `existing.dominado || dominado`; los demás campos
solo si estaban vacíos). Si no existe, hace `unshift` del objeto de la tabla.
Siempre `store.set('rodeo_dna', state.dna)`.

---

## 4. Voz

### 4.1 TTS — `speak(text, modelOverride, opts)` (L4549)

Cadena completa:

1. **`text = parseChunks(text).clean`** — la voz habla solo el inglés; nunca dice
   "||" ni la traducción. Idempotente sobre texto ya limpio. Si queda vacío → return.
2. Si `!opts || opts.trackReplay !== false` → `ultimoHablado = String(text)` +
   `syncReplayButton()`. (TALK/ESCENAS **sí** registran; el episodio ilustrado pasa
   `trackReplay:false` para no contaminar el botón repetir del coach.)
3. `stopSpeaking()` → `speakToken++` (invalida cualquier reproducción en vuelo),
   `pararAudio()`, `window.pararAudioShadow?.()`, `speechSynthesis.cancel()`.
   `const token = speakToken` se captura después.
4. `pedirTTS(text, modelOverride)` (L4534): `POST /api/tts`, headers
   `Content-Type: application/json` + `x-rodeo-pass` si hay `rodeo_pass`,
   body `{ text: String(text).slice(0, 2000), model: modelOverride || vozActual }`.
   Respuesta → `arrayBuffer()` (MP3). Si `!r.ok` → `Error(d.detail || d.error || 'HTTP '+status)`.
5. Si falla y `token === speakToken` → `caerASistema(text, 'falló la voz Deepgram', e)`.
6. Reproducción por **Web Audio API** (no `<audio>`: Brave bloquea el autoplay de
   HTMLMediaElement, pero un `AudioContext` se desbloquea con cualquier clic):
   `ctxAudio()` singleton; si `state === 'suspended'` → `resume()`;
   `decodeAudioData(ab)` → `createBufferSource()` → `connect(destination)`;
   `audioActual = src`; `window.__vozMotor = 'deepgram'`;
   `await new Promise(res => { src.onended = res; src.start(); })`.
   Tras cada await se revalida `token !== speakToken` → return silencioso.
7. Fallo de reproducción → `caerASistema(text, 'no pude reproducir el audio', e)`.

**Fallback `caerASistema` (L4512):** `window.__vozMotor = 'sistema'`,
`console.warn`, y **una sola vez por carga** (`avisoTTSDado`)
`toast('Voz del sistema — ' + motivo + (detalle ? ': ' + detalle.slice(0,120) : ''), 6000)`;
luego `speakSistema(text)` (L4498): `speechSynthesis.cancel()`,
`new SpeechSynthesisUtterance(text)` con `voice = voiceEN`, `lang='en-US'`, `rate=1.0`.

**Selección de voz del sistema `pickVoice` (L4456):** primera de
`lang==='en-US' && /natural|google|premium/i.test(name)`, si no `lang==='en-US'`,
si no `lang.startsWith('en')`, si no `null`. Se recalcula en `onvoiceschanged`.

**"Cola":** no hay cola real — hay **invalidación por token**. Cada `speak` corta
lo anterior. Un `speak` viejo que despierta con `token !== speakToken` se descarta.

**Voces Deepgram (`VOCES`, L4526):**

```js
const VOCES = {
  'aura-2-helena-en': 'Helena',   // US, femenina, cálida
  'aura-2-draco-en':  'Draco',    // UK, masculino, barítono
};
let vozActual = 'aura-2-helena-en';   // Helena SIEMPRE al cargar
```

**No se persiste**: Draco es un cambio de sesión; en cada visita vuelve Helena.
El botón `#voice-btn` (vive en el perfil, no en TALK) alterna y re-lee
`ultimoHablado`. **No hay clave localStorage de voz** — si algún agente cree
recordar una, no existe.

**Mute (`rodeo_tts`):** `state.ttsOn = store.get('rodeo_tts', true)` (L3013).
`#tts-toggle` (L4619) y `#rp-tts` (L7588) hacen exactamente lo mismo:
`state.ttsOn = !state.ttsOn`; `store.set('rodeo_tts', state.ttsOn)`;
si queda apagado → `stopSpeaking()`; repintan **ambos** botones
(`syncTTSButton()` pinta `#tts-toggle` y `#rp-tts`; el de RP además llama a
`rpSyncTTS()`); `toast('Voz del coach: ON'|'OFF', 1500)` en TALK y
`toast('Voz: ON'|'OFF', 1500)` en ESCENAS.

**Morph del icono (`pintarMorphTTS`, L4607):** togglea `is-on`/`is-off` en los dos
SVG hijos (`.tts-on`, `.tts-off`) y la clase `on` en el botón. CSS original:
`.rd-morph > svg.is-off { opacity:0; transform: scale(0.5) }` / `.is-on { opacity:1; scale(1) }`
(L1527-1533). **Este es el morph que la app nueva reimplementa con el snippet 1
(AnimatePresence popLayout + spring 600/25).**

**Replay / Repetir:** `syncReplayButton()` (L4629) deshabilita `#replay-btn` y
`#again-btn` si `!ultimoHablado`. `#replay-btn` → `speak(ultimoHablado)`.
`#again-btn` → añade la clase `girando` 460 ms y `speak(ultimoHablado)`;
CSS `.pill-btn:active .rd-spin, .pill-btn.girando .rd-spin { transform: rotate(180deg) }`
(L1568-1569) — **este es el snippet 3 (RefreshCw, spring 400/25, alterna 0↔180)**.
Si no hay nada: `toast('Aún no hay nada que repetir', 1500)`.
En ESCENAS `#rp-replay` se habilita/deshabilita a mano (`disabled = true` al abrir,
`false` tras el primer turno) y su handler es `if (ultimoHablado) speak(ultimoHablado)`.

### 4.2 STT — micrófono

**Idioma bilingüe (L2953-2999):**

```js
const MIC_LANGS = { es: 'es-419', en: 'en-US' };
const MIC_LANG_DEFAULTS = { talk: 'es', rp: 'es', story: 'en', ladder: 'en', drop: 'en' };
micLang(ctx)     // store.get('rodeo_miclang_' + ctx, null), válido solo 'es'|'en'
micLangCode(ctx) // MIC_LANGS[micLang(ctx)]
```

`wireMicToggle(btn, ctx, onChange)` inserta un `<button class="mic-lang-chip">`
**justo antes** del botón de mic (idempotente: si ya hay uno, lo devuelve).
El chip muestra `ES`/`EN` en mayúsculas, lleva `data-ctx`, `data-lang`,
`aria-label` = `'Idioma del micrófono: español|inglés. Tocar para cambiar'` y
`title` = `'Dictado en español|inglés — tocar para cambiar'`.
Al click: `preventDefault` + `stopPropagation`, alterna, `store.set('rodeo_miclang_'+ctx, next)`,
**repinta todos los chips de ese ctx** (`.mic-lang-chip[data-ctx="…"]`) y llama
`onChange(MIC_LANGS[next])` para actualizar la instancia viva.

**Instancia de CHARLA (`initRecognition`, L4368):**
`SR = window.SpeechRecognition || window.webkitSpeechRecognition`; si no existe →
`toast('Tu navegador no soporta voz — usa Chrome')`.
`r.lang = micLangCode('talk')`, **`r.interimResults = true`**, **`r.continuous = false`**
(autostop: el navegador corta solo al detectar silencio).

- `onresult`: acumula `final` e `interim` recorriendo `e.results`;
  `#chat-input.value = (final || interim).trim()`; si hay final → `r._finalText = final.trim()`.
- `onend`: `recognizing = false`; quita `.recording` de `#mic-btn`;
  toma `r._finalText`, lo limpia, y **si hay texto: vacía `#chat-input` y llama
  `sendTurn(text)`** (el envío es automático al soltar la toma).
- `onerror`: `recognizing=false`, quita `.recording`, y por tipo:
  - `not-allowed` → `toast('Permite el micrófono en el navegador')`
  - `network` → `toast('El dictado usa el servicio de voz de Google y este navegador lo bloquea (típico de Brave). Escribe o usa Chrome.', 5000)`
  - **`aborted` y `no-speech` se ignoran en silencio**; cualquier otro →
    `toast('Error de micrófono: ' + e.error)`.

**Click en `#mic-btn` (L4398):** crea la instancia perezosamente; si ya está
grabando → `recognition.stop()`; si no: `stopSpeaking()`, `_finalText=''`,
**`recognition.lang = micLangCode('talk')` justo antes de arrancar** (el toggle
aplica en la siguiente toma sin recrear nada), `start()` dentro de try/catch
(protege el doble `start()`), `recognizing = true`, añade `.recording` al botón.
Después: `wireMicToggle($('#mic-btn'), 'talk', (code) => { if (recognition) recognition.lang = code; })`.

`stopMic()` (L4453): `if (recognition && recognizing) recognition.abort()` — lo
llama `closeSession()`.

**Estado `.recording`:** la clase vive en el botón y el CSS hace el morph
(L1538-1544: `.recording .mic-morph .mic-idle {opacity:0; scale(.5)}` /
`.mic-rec {opacity:1; scale(1)}`) y cambia la etiqueta
(L543-544: `.rd-mic-hero-wrap:has(#mic-btn.recording) .mh-idle {display:none}` /
`.mh-rec {display:inline; color: oklch(74% 0.20 27)}`).
**Ese morph es el snippet 1.** El estado real es `.recording`, no `:hover`
(esto es móvil, ahí no hay hover).

**Mic de ESCENAS:** `wireMic($('#rp-mic'), $('#rp-input'), (t) => rpTurn(t,false), 'rp')`
(genérico, L6328). Idéntico en comportamiento: instancia perezosa por llamada,
`interimResults=true`, `continuous=false`, `lang = micLangCode('rp')` antes de cada
toma, `stopSpeaking()` al arrancar, `.recording` en el botón, en `onend` limpia el
input y llama `onFinal(t)`. Devuelve un handle `{ abort() }` que además **desarma
los callbacks** (`onresult = onend = onerror = null`) para que un `onend` tardío no
dispare sobre un input muerto.

---

## 5. Estado y claves de localStorage

`store.get/set` (L2933-2944, ya portado en `src/lib/storage.ts`): JSON, `try/catch`,
fallback en lectura, `toast('No pude guardar — almacenamiento lleno o bloqueado')`
en escritura fallida, y **`window.sbOnLocalChange(key)`** tras cada `set`
(sync a Supabase, no-op sin sesión).

### 5.1 Claves que TALK **escribe**

| Clave | Forma | Ejemplo | Quién la toca |
|---|---|---|---|
| `rodeo_tts` | `boolean` (default `true`) | `true` | `#tts-toggle` L4621, `#rp-tts` L7590 |
| `rodeo_cost` | `number` (float acumulado) | `0.0473` | `callAPI`/`callStream` (ya portado) |
| `rodeo_dna` | `Array<DnaItem>` máx. 300, **newest-first** | ver abajo | `saveDNA` L4921, `recordUpgrade` L4936 |
| `rodeo_sessions` | `number` | `12` | debrief CHARLA L4300, debrief ESCENA L7525 |
| `rodeo_openers` | `string[]` últimos **8**, cada uno ≤140 chars | `["Rough morning — my flight got bumped…"]` | `sendTurn` L4226 |
| `rodeo_tips` | `Record<string, 1>` | `{"talk":1,"roleplay":1}` | `tipPrimeraVez` L3223 |
| `rodeo_miclang_talk` | `'es' \| 'en'` (default `'es'`) | `"en"` | `wireMicToggle` L2988 |
| `rodeo_miclang_rp` | `'es' \| 'en'` (default `'es'`) | `"es"` | `wireMicToggle` (ctx `'rp'`) |
| `rodeo_pass` | `string` (PIN) | `"1234"` | `callAPI`/`callStream` en 401 |
| `rodeo_streak` | `{ days:number, last:'YYYY-MM-DD' }` | `{"days":4,"last":"2026-07-27"}` | **solo** debrief de ESCENA (`updateStreak` L6784) |
| `rodeo_premium_uso` | `{ fecha:'YYYY-MM-DD', talk?:n, roleplay?:n, story?:n }` | `{"fecha":"2026-07-27","talk":2}` | `premiumGate` (js/premium.js L156) |

`DnaItem` (unión real, todos con `ts: number`):

```jsonc
{ "type":"error",   "quote":"I have 30 years", "fix":"I'm 30", "why":"la edad va con to be", "ts":1753600000000 }
{ "type":"slang",   "term":"shoot the breeze", "meaning":"charlar de nada en particular", "example":"", "ts":1753600000000 }
{ "type":"upgrade", "b2":"It's good", "fix":"It's got real legs", "swap":"", "why":"suena a alguien que decide", "register":"", "dominado":false, "ts":1753600000000 }
```

### 5.2 Claves que TALK **lee** (no escribe)

| Clave | Forma | Uso en TALK |
|---|---|---|
| `rodeo_nombre` | `string` (`''` si nunca lo dio) | `nombreUsuario()` → nombre en el system prompt y prefijo `Hey ${nom} — ` del rompehielos |
| `rodeo_intereses` | `string[]` (`[]` = saltó) | `interesesBriefTalk()` / `interesesLineaDrop()` + pool de rompehielos |
| `rodeo_nivel` | `'a1' \| 'avanzado' \| null` | ruteo de vistas (`VISTAS_POR_NIVEL`) |
| `rodeo_premium` | `{activo, licencia, instanceId, via, activadoEn, validadoEn}` | `esPremium()` dentro del gate |
| `rodeo_tema` | `'claro' \| 'oscuro'` | tema global (fuera de TALK, ya portado) |

### 5.3 Estado en memoria relevante (`state`, L3006)

```js
talkMode: 'charla' | 'escenas'
session:  null | { scenario, title, situation, messages: [{role,content}], isOpening? }
roleplay: null | { scenario, messages: [{role,content}] }
ttsOn:    store.get('rodeo_tts', true)
busy:     false        // compartido entre TALK, ESCENAS, STORY, DROP…
cost:     store.get('rodeo_cost', 0)
dna:      store.get('rodeo_dna', [])
sessions: store.get('rodeo_sessions', 0)
streak:   store.get('rodeo_streak', { days:0, last:'' })
intereses:store.get('rodeo_intereses', [])
```

Módulo-scope, no en `state`: `ultimoHablado` (L4508), `speakToken`, `audioActual`,
`vozActual`, `avisoTTSDado`, `recognition`/`recognizing`, `ideaBusy`,
`ultimoRompe`, `rpCards`, `rpGenBusy`, `rpBusy`, `rpGenRetryTimer`,
`rpLastDebrief`, `rpDebriefBusy`, `glossFijado`.

> Nota de campo: `state.session.displayLog` aparece en el comentario del `state`
> (L3009) pero **nunca se usa** en el código. No portarlo.

---

## 6. Inventario de UI

### 6.1 Toggle de panes (L2324-2327)

| Elemento | Clases/atrib. | Función |
|---|---|---|
| Contenedor | `.dp-modebar.flex.gap-2.pb-4.shrink-0`, `role="tablist"`, `aria-label="Modo de Talk"` | fila de píldoras |
| CHARLA | `button.talk-tab.active`, `data-tmode="charla"`, `role="tab"`, `aria-selected="true"` | muestra `#charla-pane` |
| ESCENAS | `button.talk-tab`, `data-tmode="escenas"`, `aria-selected="false"` | muestra `#escenas-pane` + `renderRoleplayHome()` |

Clase propia `.talk-tab` a propósito: `.mode-tab` (SLANG) y `.story-tab` (STORY)
tienen sus propios handlers y engancharían estos botones.

### 6.2 `#charla-pane` → `#talk-empty` (estado vacío, L2332-2390)

| ID / clase | Qué es | Comportamiento |
|---|---|---|
| `.rd-hero.rd-hero--talk` | Héroe | eyebrow `Talk · coach en vivo`, titular `¿DE QUÉ HABLAMOS HOY?` (`HOY?` en `var(--accent)`), sub `Elige tema, habla — te corrijo sin cortarte el flow.` |
| `.rd-ill.rd-ill--talk-hero` | Ilustración line-art (SVG inline, `aria-hidden`) | decorativa |
| `#libre-card` `.rd-libre` | Tarjeta "Dibujo libre" | contenedor |
| `.rd-libre-tag` + `.rd-dot` | `Dibujo libre · el coach arranca` | etiqueta |
| `#libre-ice` `.rd-libre-ice` | Texto del rompehielos | arranca con `&nbsp;`; lo llena `refrescarRompehielos()` |
| `#libre-go` `.btn-accent.rd-libre-go` | `Sígueme el hilo →` | `startLibre()` |
| `#libre-shuffle` `.rd-libre-shuffle` | `otro tema` | `refrescarRompehielos()` |
| `#retame-btn` `.cm-launch` | Rétame · 10 tarjetas | **FUERA DE ALCANCE** (js/cards-mode.js) |
| `.rd-sect` × 2 | Secciones `Trabajo` y `Calle y vida` | eyebrows `.rd-eyebrow.rd-eyebrow--accent` con `.rd-eyebrow-rule` |
| `button.chip[data-scenario]` × 9 | Chips de escenario, cada uno con `.rd-chip-emoji` | `startSession(dataset.scenario)` |

Chips y emojis exactos: `work-meeting` 🧑‍💻 "Reunión con el equipo gringo",
`work-negotiation` 🤝 "Negociar con un inversionista", `work-interview` 💼
"Entrevista de trabajo", `work-pitch` 🚀 "Pitch de tu producto",
`street-bar` 🍺 "Small talk en un bar", `street-travel` ✈️ "Aeropuerto y viaje",
`street-futbol` ⚽ "Hablando de fútbol", `street-date` ☕ "Una cita",
`free` 💬 "Free talk — de lo que sea".

### 6.3 `#talk-session` (sesión activa, L2391-2449)

**Session bar** (`.rd-session-bar.flex.items-center.justify-between.pb-3.shrink-0`):

| ID | Clase | Icono | Función |
|---|---|---|---|
| `#back-btn` | `.icon-btn` 36×36, `aria-label="Volver a los escenarios"` | flecha ← | salir **sin** debrief |
| `#session-title` | `.rd-eyebrow.rd-eyebrow--accent.rd-session-title` | — | título del escenario |
| `#tts-toggle` | `.pill-btn`, `aria-label="Activar o desactivar voz del coach"` | `.rd-morph` con `.tts-on.is-on` + `.tts-off.is-off` | mute/unmute (morph, snippet 1) |
| `#replay-btn` | `.pill-btn`, `aria-label="Escuchar la última respuesta"` | triángulo play (fill) | `speak(ultimoHablado)` |
| `#again-btn` | `.pill-btn`, `aria-label="Repetir la última respuesta"` | `svg.rd-spin` (RefreshCw) | repetir + giro 180° (snippet 3) |
| `#end-session` | `.btn-ghost` (`min-height:36px; padding:8px 13px; font-size:.75rem`) | — | **Terminar** → debrief |

**Chat:** `#chat-scroll.scroll-area.flex.flex-col.gap-3` (`flex:1; min-height:0; padding-bottom:8px`).
Burbujas: `.bubble-coach` (izquierda, esquina sup-izq cuadrada), `.bubble-user`
(derecha, tinte lima), `.correction-card` (derecha, coral, con `.quote`/`.fix`/`.why`),
`.bubble-idea` (con `.idea-tag`), y la burbuja de espera `.bubble-coach` con
`.rd-pensando > svg.rd-pencil` (+ `span.rd-wait` con los segundos).

**Dock de voz** `#talk-dock.rd-voice-dock.shrink-0.pt-3`:

| ID | Función |
|---|---|
| `#kbd-btn` `.icon-btn` | despliega/recoge `#talk-typebar` y enfoca `#chat-input` |
| `.rd-mic-hero-wrap` | wrap del mic; **el chip ES/EN se inserta aquí, antes del botón** |
| `#mic-btn` `.icon-btn.mic-hero` | mic protagonista; `.recording` = grabando; contiene `span.mic-morph` (28px) con `svg.mic-idle` + `svg.mic-rec` |
| `.mic-hero-label` | `span.mh-idle` "Presiona y habla" / `span.mh-rec` "Escuchando… toca para enviar" (conmutan por `.recording`) |
| `#idea-btn` `.icon-btn.idea-btn` | bombilla; clase `on` mientras vuela la petición |

**Barra de texto** `#talk-typebar.rd-input-dock.hidden.items-center.gap-2.pt-2.shrink-0`:
`#chat-input` (placeholder `Escribe en inglés...`, `aria-label="Mensaje en inglés"`)
y `#send-btn` (`.icon-btn`, fondo `var(--accent)`).
**`#send-btn` solo se ve con `#talk-typebar.has-text`** (L547), clase que togglea
el `input` listener según `chat-input.value.trim()`.

### 6.4 `#escenas-pane` → `#roleplay-home` (L2455-2482)

| ID / clase | Función |
|---|---|
| `.rd-hero.rd-hero--roleplay` | eyebrow `Roleplay · teatro jugable`, titular `ACTÚA. NO SOLO HABLES.`, sub `Una escena, un objetivo, alguien que se te opone.` |
| `.rd-ill.rd-ill--rp-hero` | telón + máscara (SVG) |
| eyebrow `.rd-eyebrow--muted` | `El clásico de la casa` |
| `#rp-canonico` | contenedor de la carta canónica (`rpCardEl(RP_CANONICO, true)`) |
| eyebrow + `#rp-refresh.rp-refresh` | `Escenas frescas para ti` + botón `otras escenas` → `generarEscenas(true)` |
| `#rp-cards.flex.flex-col.gap-4` | las 3 cartas generadas / 3 `.rp-skel` / mensaje de error con `#rp-retry` |
| `#rp-sorprende.btn-accent` | `SORPRÉNDEME` (icono de dado) → `rpSorprende()` |

Estructura de `.rp-card` (`rpCardEl`, L7164-7172): `.rp-card-top` (`.rp-card-emoji` +
`.rp-card-tag` = `'El clásico · siempre disponible'` o `'Escena'`), `.rp-card-title`,
tres `.rp-line` con `.rp-line-k`/`.rp-line-v` (`Tu rol`, `Objetivo`, y
`La tensión` con `.rp-line--obst`), y `.rp-card-go` = `Entrar a escena →`.

### 6.5 `#roleplay-session` (L2484-2520)

| ID | Función |
|---|---|
| `#rp-back` `.icon-btn` | volver a la portada (sin debrief) |
| `#rp-title` `.rd-eyebrow--accent.rd-session-title` | título de la escena |
| `#rp-tts` `.pill-btn` | mute (mismo morph) |
| `#rp-replay` `.pill-btn` | play de la última línea (arranca `disabled`) |
| `#rp-again` `.pill-btn` | **presente en el HTML pero SIN handler en el legacy** (ver §8) |
| `#rp-end` `.btn-ghost` (min-height 44px) | **Terminar** → `rpDebrief()` |
| `#rp-scroll.scroll-area` | burbujas: `.rp-mission`, `.bubble-coach.rp-narr` (borde lima izq.), `.bubble-user`, `.rp-consejo` |
| `.rd-input-dock` | dock **siempre visible** (aquí no hay voz-primero) |
| `#rp-mic` `.icon-btn` | mic (chip ES/EN insertado antes por `wireMic`) |
| `#rp-input` | placeholder `Tu línea en inglés o toca el mic...` |
| `#rp-send` `.icon-btn` | enviar (fondo `var(--accent)`) |

### 6.6 Elementos globales que TALK usa

- `#toast.toast[role=status]` (L2885) — `toast(msg, ms=2600)`.
- `#overlay[role=dialog][aria-modal]` + `#sheet-content.sheet` (L2888-2889) —
  `openSheet(html)`/`closeSheet()`: guarda y restaura el foco, `Escape` cierra,
  `Tab` atrapado, click en el backdrop cierra.
- `#gloss-tip` — creado por JS al vuelo (L3392-3394).
- `#rd-tip.rd-tip` — creado por `tipPrimeraVez`; píldora lavanda fija abajo
  (`bottom: calc(120px + env(safe-area-inset-bottom))`, `z-index:990`), con `✕`
  y autocierre a **8 s**. Textos exactos: `'Toca el mic y habla — te corrijo'`
  (key `talk`) y `'Actúa tu rol — yo narro el resto'` (key `roleplay`).
- `#cost-ticker` — **ya no existe en el DOM**; `updateCostTicker` (L3238) tiene
  guarda `if (el)`. El coste se sigue acumulando en `rodeo_cost` y hoy se muestra
  en el perfil. En la app nueva: `onCostChange` de `src/lib/api.ts`.
- Tab bar: se oculta sola con `body.rd-sesion` mientras hay sesión.

---

## 7. Escenarios (data VERBATIM)

### 7.1 `SCENARIOS` (L3751-3761)

```js
const SCENARIOS = {
  'work-meeting':     { title: 'Reunión de equipo',    prompt: 'a weekly team sync at a tech startup. You are Alex, his American teammate — you have your own workload, opinions and frustrations.' },
  'work-negotiation': { title: 'Negociación',          prompt: 'a negotiation with a US investor interested in his crypto startup. You are Jordan, a sharp but fair VC with your own thesis and constraints.' },
  'work-interview':   { title: 'Entrevista',           prompt: 'a job interview for a senior role at an international company. You are Sam, the hiring manager — you have a role to fill and doubts to resolve.' },
  'work-pitch':       { title: 'Pitch',                prompt: 'a meeting where he presents his product to you. You are Casey, a potential client with a budget, a boss and existing vendors.' },
  'street-bar':       { title: 'Bar',                  prompt: 'a bar in Austin, Texas. You are Tyler, a local with a full life of your own. Very informal, natural slang.' },
  'street-travel':    { title: 'Viaje',                prompt: 'travel situations: airport check-in, immigration, directions, hotel problems. You play whoever he runs into — each with their own job, pressure and patience.' },
  'street-futbol':    { title: 'Fútbol',               prompt: 'football/soccer talk. You are Danny, a British fan with strong takes, a team you suffer for, and real banter.' },
  'street-date':      { title: 'Cita',                 prompt: 'a first date at a coffee shop. You are Riley — a whole person with a job, a history and your own read on how this is going.' },
  'free':             { title: 'Free talk',            prompt: 'open conversation. You are Coach — you have opinions and stories of your own, not just questions.' },
};
```

### 7.2 Semilla de situación (L3767-3815) — `buildSituation()` toma un `pickOne` de cada array

```js
const SEED_MOOD = [
  'in a great mood, expansive and talkative',
  'a bit distracted — your mind keeps drifting elsewhere',
  'tired after a long day, but glad for the company',
  'mildly irritated about something that happened earlier',
  'buzzing with news you are dying to tell someone',
  'skeptical and hard to impress today',
  'nostalgic, in the mood to reminisce',
  'pressed for time and a little abrupt',
  'relaxed and in no rush at all',
];

const SEED_BEAT = [
  'you just got unexpected good news',
  'something went badly wrong for you today',
  'you got back from a trip a couple of days ago',
  'you are stuck in an annoying bureaucratic mess',
  'you just finished something you are genuinely proud of',
  'a plan you were counting on just fell apart',
  'you have a decision to make and keep flip-flopping',
  'you had an argument with someone close this week',
  'you recently picked up a new obsession or hobby',
];

const SEED_AGENDA = [
  'you want a second opinion on something',
  'you mostly want to vent a little',
  'you are quietly sizing him up, deciding if you trust him',
  'you want to talk him into something',
  'you are killing time and genuinely enjoy the company',
  'you are working up to asking him for a favour',
  'you are curious about his life and where he came from',
  'you are testing whether he actually knows his stuff',
];

const SEED_TWIST = [
  'at some point, disagree with something he says',
  'at some point, change the subject abruptly',
  'at some point, mildly misunderstand something he said',
  'at some point, voice a strong opinion he may not share',
  'at some point, get briefly distracted by something around you',
  'at some point, tell him a short story from your own life',
  'no particular twist — just be present and real',
];
```

### 7.3 Rompehielos (L3917-3952)

```js
const ROMPEHIELOS_BASE = [
  "Okay, quickfire — what's the last thing that genuinely made you laugh?",
  "Give me a hot take. Something most people would push back on.",
  "If money weren't a thing, what would you be doing with this year?",
  "What's something you changed your mind about recently?",
  "Be honest: are you a morning person or is that a lie people tell?",
  "What's a small win you had this week? Doesn't have to be big.",
  "Pitch me your city like I'm about to move there tomorrow.",
  "What's the most overrated thing everyone seems to love?",
  "If you had a free afternoon and zero guilt, where would you go?",
  "What's a skill you wish you'd picked up ten years ago?",
  "What's one app on your phone you'd never delete — and why?",
  "Describe the last photo you took. What's the story?",
  "What did you have for breakfast — and was it any good?",
  "What's one thing on your desk right now that says something about you?",
  "Tell me about the last thing you bought that was worth every peso.",
  "What's a place in your city you always take visitors to?",
];

const ROMPEHIELOS_POR_INTERES = {
  'Cripto/Web3':      ["Be real — are we still early, or is the hype fully cooked?", "What would actually get your mom to use crypto?", "Walk me through the last trade or mint you actually made."],
  'Developer':        ["What's the one bug that still haunts you?", "AI pair-programming: game changer or overhyped autocomplete?", "Describe your dev setup — what would you upgrade first?"],
  'Founder/Startup':  ["What's the hardest 'no' you've had to give this year?", "If you had to kill one feature today, which one goes?", "Describe your very first customer — how did you land them?"],
  'Marketing & Ads':  ["What's an ad that actually stuck with you lately?", "Sell me a pen. No, seriously — go.", "Describe the last thing an ad actually got you to buy."],
  'Ventas':           ["What's your move when a deal goes quiet on you?", "Best cold opener you've ever gotten hit with?", "Walk me through the last deal you closed, step by step."],
  'Diseño':           ["What's a piece of design you can't stop thinking about?", "Ugly-but-works or gorgeous-but-clunky — pick one.", "Describe the app icon on your phone you'd redesign first."],
  'Oficina/Corporate':["What meeting could've been an email this week?", "What's the office snack you'd riot over if they cut it?", "Describe your desk right now — what's on it?"],
  'Deportes':         ["Give me your take: who's the GOAT, and don't hedge.", "What game had you screaming at the screen recently?", "Describe the last match you watched — best moment?"],
  'Cine & Series':    ["What's the last thing you binged in one sitting?", "A movie everyone loves that you just don't get?", "Describe the last scene that actually made you pause the show."],
  'Música':           ["What's on repeat for you right now?", "Concert you'd fly across the world to catch?", "Describe the last concert you went to — smells and all."],
  'Gaming':           ["What's the game that ate way too much of your life?", "Controller or keyboard — and defend it.", "Describe your gaming setup — what's the weakest link?"],
  'Viajes':           ["Best meal you ever had abroad — where was it?", "One place that totally wasn't what you expected?", "Describe what's in your backpack when you travel light."],
  'Fitness':          ["What's your workout you'd never skip?", "Early gym or late gym — and why are you wrong?", "Walk me through your last workout, set by set."],
  'Comida':           ["What's the dish you'd cook to impress someone?", "Pineapple on pizza — defend or destroy.", "Describe the best thing you cooked this month."],
};
```

`rompehielosPool()` = base + los arrays de cada interés elegido (claves = items
EXACTOS de `INTERESES_GRUPOS`, L3038-3041). `elegirRompehielos()` sortea y
**reintenta hasta 8 veces** si sale el mismo que `ultimoRompe` (y el pool tiene >1).

### 7.4 `RP_CANONICO` (L7081-7089)

```js
const RP_CANONICO = {
  id: 'princesa',
  title: 'La princesa y el azafrán',
  emoji: '👑',
  role_es: 'Eres una princesa que llega sola al mercado de tu ciudad.',
  goal_es: 'Comprar azafrán a un precio justo, sin que te tomen el pelo.',
  obstacle_es: 'El vendedor sabe que tienes plata de sobra y, como el azafrán escasea, quiere inflarte el precio.',
  canonico: true,
};
```

Las otras 3 escenas **no son data**: las genera el modelo (`generarEscenas`, §2.9)
y viven solo en `rpCards` (memoria, no persisten). Shape de cada una:
`{ title, emoji, role_es, goal_es, obstacle_es }`.

---

## 8. Trampas (todo lo no obvio)

**Reintentos y truncamientos**
1. `callJSON` reintenta **una sola vez** y **solo** si `!parsed && finish === 'length' && maxTokens < 8000`,
   con `maxTokens = 8000`. Un JSON sucio con `finish === 'stop'` **no** se reintenta
   (más tokens no curan un JSON sucio; cada llamada cuesta minutos y dinero).
2. `sendTurn` (CHARLA): reintenta si `(!content || !content.trim()) && finish === 'length'`
   con 6000. `rpTurn` (ESCENAS): parsea **primero** y reintenta `if (!parsed && finish === 'length')`
   con 5000 — cubre vacío **y** JSON truncado. **Son distintos a propósito; portar tal cual.**
3. Si el stream falla (proxy que bufferea, red rara) se cae a `callAPI` con el mismo
   `maxTokens` sin romper la sesión. Se borra la `liveBubble` a medias antes.
4. Texto plano legítimo: `finish === 'stop' && content && !content.trim().startsWith('{')`
   → se acepta como `reply` con `corrections/glosses` vacíos, y se pushea el content
   **crudo** (no `JSON.stringify`) al historial.
5. Si nada de eso aplica → `throw` con el mensaje de coach/narrador correspondiente.

**Backend (`api/chat.js`, solo lectura)**
6. Modos: `chat` → `MODEL_CHAT` (default `claude-haiku-4-5`), `creative` →
   `MODEL_CREATIVE` (default `kimi-k2.7-code`). TALK usa `chat` para turnos y la
   bombilla; `creative` para debriefs y generación de escenas.
7. El backend recorta **cada mensaje a 8000 chars** y conserva system + los últimos
   ~40 mensajes. `max_tokens` se clampa a 8000. Por eso el debrief de ESCENA manda
   solo los últimos 14 mensajes y 7000 chars.

**Errores visibles**
8. `401` → `prompt('PIN de acceso a RODEO:')`; si escribe algo se guarda en
   `rodeo_pass` y **se reintenta la misma llamada**; si cancela →
   `Error('Sin PIN no hay rodeo.')`. Con `opts.silent` (prefetch, no usado en TALK)
   lanza `'pin_required'` sin abrir el prompt.
9. `rpErrMsg(err)` (L7105) traduce: `navigator.onLine === false` →
   `'Sin conexión — tu escena sigue aquí, reintenta cuando vuelva el internet'`;
   `/failed to fetch|networkerror|load failed/i` →
   `'Se cayó la conexión — reintenta en un momento'`;
   `/rate.?limit/i` → `'El modelo creativo está saturado ahora mismo — dale a reintentar en un momento'`;
   si no, el mensaje crudo o `'Algo salió mal'`. **CHARLA no usa `rpErrMsg`**:
   muestra `'Error: ' + err.message` tal cual (5 s).
10. `file://` → `callAPI`/`callStream` lanzan un error explicativo y en el arranque
    se pinta una pantalla completa "ÁBREME DESDE EL SERVIDOR" (L7595-7618).
11. Fallo de TTS → toast **una sola vez por carga** (`avisoTTSDado`), luego voz del
    sistema en silencio.

**Casos borde de sesión**
12. **CHARLA usa truthiness** (`if (!state.session) return`) y **ESCENAS usa
    identidad** (`state.roleplay !== ses`). La identidad es la correcta (evita que
    un turno huérfano pinte en la sesión nueva); la asimetría es real en el legacy.
    Portar ambas tal cual, o —si se unifica— **documentarlo**: no es refactor gratis.
13. `#back-btn` resetea `state.busy` y habilita `#send-btn` a mano (si no, quedarías
    atrapado los segundos del stream). `#rp-back` hace el reset **después** de
    `closeRoleplay()` para que el `finally` del turno huérfano ya no toque el global.
14. Un `onend` de mic puede entregar texto **después** de deshabilitar el input:
    `rpTurn` lo devuelve al `#rp-input` en vez de tragarlo. `rpInputEnabled(false)`
    pone `disabled` de verdad en el mic (bajar la opacidad no impide el clic).
15. `state.busy` es **global compartido**: un episodio de STORY o un DROP en vuelo
    bloquea `generarEscenas` → skeletons + poller de 700 ms (máx 40 intentos) +
    botón "cargar ya". La bombilla (`ideaBusy`) y el debrief de RP (`rpDebriefBusy`)
    tienen flags propios a propósito.
16. Debrief de CHARLA con `< 3` mensajes `user` → cierra sin analizar; el de ESCENA
    con `< 2`. La instrucción de apertura cuenta como mensaje `user` en ambos.
17. **Fallo del debrief de CHARLA destruye la sesión** (`closeSession()` en el catch);
    el de ESCENA **no**: ofrece "REINTENTAR CIERRE" / "Salir sin análisis".
18. El debrief de CHARLA **no** llama a `updateStreak()`; el de ESCENA **sí**.
    Ambos incrementan `rodeo_sessions`. Salir por ← no incrementa nada.
19. `rpSorprende` que termina cuando ya hay sesión abierta **no la pisa**: mete la
    carta en la portada y avisa por toast.
20. `renderRoleplayHome()` hace `return` inmediato si `state.roleplay` (no repintar
    la portada debajo de una sesión viva).

**Glosado**
21. `glossSpans` usa `indexOf` case-insensitive y toma **una sola** aparición por
    glosa (la primera libre). Rangos solapados se descartan. Los `⟦||⟧` inline
    tienen prioridad sobre el array `glosses`.
22. `parseChunks` sanea corchetes huérfanos **remapeando** las coordenadas de las
    marcas; sin eso, un `⟧` suelto desplazaría todos los subrayados.
23. `chunkRe()` devuelve una **regex nueva** en cada llamada: la misma instancia
    global arrastraría `lastIndex` entre `exec()` y `replace()`.
24. En fase 1 se usa `textContent`, **nunca** `innerHTML` (el reply parcial es texto
    del modelo sin escapar). En fase 2 todo pasa por `esc()`/`escAttr()`.
25. `rpAddConsejo` pasa el consejo por `parseChunks` (el modelo cuela `⟦||⟧` ahí
    a veces) y luego realza las frases entre comillas:
    `esc(limpio).replace(/[“"]([^”"]+)[”"]/g, '<b>“$1”</b>')`.
    **No** usa `animateIn` — la entrada es solo el keyframe CSS `.rp-consejo`
    (`gsap.from` capturaba el `opacity:0` del keyframe como destino y lo dejaba
    invisible; la regla de oro del codebase).

**Voz / mic**
26. `speechSynthesis` es fallback, no primario. El audio va por Web Audio API
    porque Brave bloquea el autoplay de `<audio>`; un click cualquiera desbloquea
    el `AudioContext` (listener global en fase de captura, L4489-4492).
27. `speak` corta lo anterior **siempre** (`speakToken++`). No hay cola.
28. `micLangCode(ctx)` se relee **justo antes de cada `start()`**: el chip aplica en
    la siguiente toma sin recrear la instancia.
29. Errores de mic `aborted` y `no-speech` se ignoran en silencio.
30. `continuous = false` ⇒ autostop del navegador; el envío ocurre en `onend`, no en
    `onresult`. En headless **no hay micrófono**: verificar los estados de UI
    forzando la clase `.recording` a mano.

**Premium (`js/premium.js`, solo lectura)**
31. `premiumGate('talk')` en `startSession` **y** en `startLibre`;
    `premiumGate('roleplay')` en `startRoleplay`. Límites: talk 5/día,
    roleplay 2/día (fecha **local**, no UTC). Hoy `PREMIUM_ENFORCE` está en `false`
    ⇒ todos los gates dejan pasar. El gate **incrementa el contador** cuando deja
    pasar (`rodeo_premium_uso`). La llamada es siempre guardada
    (`if (window.premiumGate && !premiumGate(...)) return`): si el módulo no existe,
    pasa.

**Piezas que NO son de TALK aunque estén en su markup/flujo**
32. **Rétame** (`#retame-btn`, `.cm-launch`, `js/cards-mode.js`): isla futura,
    excluida del port. El botón puede quedar visualmente pero sin lógica.
33. **La carta canónica "La princesa y el azafrán"** abre `window.openStoryImmersion('princess_001')`
    (episodio ilustrado, `js/story-mode.js`) **si esa función existe**; solo cae a
    `startRoleplay(sc)` si no existe. Como el episodio ilustrado no está portado,
    la app nueva debe decidir explícitamente: (a) ir siempre por `startRoleplay`
    con `RP_CANONICO` —comportamiento del fallback, ya soportado por el prompt— o
    (b) dejar la carta deshabilitada. **Documentarlo, no improvisarlo.**
34. `#rp-again` existe en el HTML (L2504-2506) pero **el legacy nunca le cableó un
    handler**: es un botón muerto. Decidir: cablearlo a `speak(ultimoHablado)` con
    el giro (coherente con `#again-btn`) o no pintarlo. No es una regresión del port.
35. `#voice-btn` (Helena/Draco) no vive en TALK sino en el perfil; `#cost-ticker`
    ya no existe en el DOM.
36. `state.session.displayLog` está en el comentario del `state` pero no se usa.
37. `js/supabase-sync.js` sincroniza `rodeo_dna`, `rodeo_cost`, `rodeo_sessions`,
    `rodeo_streak`, `rodeo_intereses`, `rodeo_nombre`, `rodeo_nivel`, `rodeo_tema`
    (entre otras). **No** sincroniza `rodeo_openers`, `rodeo_tips`, `rodeo_tts`,
    `rodeo_miclang_*` ni `rodeo_pass`: son locales del aparato. Mantener los nombres
    exactos o el sync se rompe.
