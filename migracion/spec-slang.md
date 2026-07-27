# spec-slang.md — cartografía de SLANG + DROP (lectura diaria)

Fuente de verdad: `/home/user/rodeo/public/legacy.html` (7667 líneas) + `/home/user/rodeo/api/_drop-prompt.js`,
`/home/user/rodeo/api/drop-today.js`, `/home/user/rodeo/api/cron-drop.js`.
Todas las referencias `L####` son líneas de `public/legacy.html` salvo que se diga otra cosa.

> **Aviso de alcance.** En el legacy, SLANG (`#view-slang`) y DROP (`#drop-pane`) son **dos vistas distintas**.
> DROP vive DENTRO de STORY (toggle HISTORIA/DROP, L2527-2532), no dentro de SLANG. Lo único que
> SLANG tiene con nombre "drop" es el botón `#drop-btn` (L2724) que genera **3 tarjetas de slang** —
> un falso amigo léxico. El "motor del drop" (edición diaria, `rodeo_drop_hoy`) es el de STORY.
> La vista nueva `src/views/slang/` debe portar SLANG; DROP se documenta aquí completo porque
> comparte DNA, glosas, TTS y tarjetas, y porque el orquestador pidió su mapa.

---

## 0. Índice de líneas

| Bloque | Líneas |
|---|---|
| CSS `.slang-card` (sticker) | L756-796 |
| CSS `.mode-tab` (pills de SLANG) | L608+ |
| CSS `.dp-*` (DROP) | L1201-1450 |
| Markup `#drop-pane` (portada + sesión) | L2598-2694 |
| Markup `#view-slang` | L2696-2749 |
| Mic bilingüe (`MIC_LANGS`, `micLang`, `wireMicToggle`) | L2946-3002 |
| `store` (localStorage) | L2930-2944 |
| `state` inicial (`slangMode`, `seenSlang`, `dna`) | L3011-3016 |
| `interesesLineaDrop()` / `interesesLineaSlang()` | L3062-3069 |
| `tipPrimeraVez()` | L3220-3236 |
| `glossSpans` / `glossHTML` | L3260-3312 |
| `dnaTieneSlang` | L3384-3388 |
| `animateIn` | L3461 |
| **SLANG (todo el JS)** | **L4719-4917** |
| `saveDNA` / `recordUpgrade` / `renderDNA` | L4914-4960 |
| **DROP · lectura diaria** | **L5226-6120+** |
| `DROP_SYSTEM` | L5236 |
| `dropUserPrompt` | L5269-5273 |
| `parsearEdicion` / `normalizarEdicion` | L5276-5325 |
| Semillas DNA doble-vía | L5333-5405 |
| Estado + toggle HISTORIA⇄DROP | L5407-5439 |
| `renderPortadaDrop` / chips de tema | L5441-5467 |
| Prefetch mañana + promoción | L5469-5528 |
| `generarDrop` / `pedirEdicion` | L5530-5607 |
| `abrirEdicionDrop` | L5609-5640 |
| TTS del passage por oraciones | L5655-5700 |
| `renderLexicoDrop` / `renderPreguntasDrop` / `cardAbiertaDrop` | L5702-5840 |
| `wireMicNota` (mic ctx `'drop'`) | L5878-5928 |
| `enviarAbiertaDrop` / `pedirPistaDrop` | L5810-5975 |
| `#drop-close` (cierre + prefetch) | L5983-5997 |
| Shadowing (IIFE autocontenida) | L5999-6120+ |
| `updateStreak` | L6784-6792 |

---

# PARTE A — VISTA SLANG (`#view-slang`)

## A1. Estructura y modos

Tres pills `.mode-tab` (L2700-2704): `calle` (activa por defecto), `trabajo`, `paisa` (label
`PAISA → GRINGO`). Estado: `state.slangMode = 'calle'` (L3011). **No se persiste** en localStorage:
al recargar vuelve a `calle`.

Handler (L4729-4738):

```js
$$('.mode-tab').forEach((tab) => tab.addEventListener('click', () => {
  state.slangMode = tab.dataset.mode;
  $$('.mode-tab').forEach((t) => t.classList.toggle('active', t === tab));
  const paisa = state.slangMode === 'paisa';
  $('#slang-drop-area').classList.toggle('hidden', paisa);
  $('#slang-paisa-area').classList.toggle('hidden', !paisa);
  $('#slang-paisa-area').classList.toggle('flex', paisa);
}));
```

`calle` y `trabajo` comparten **el mismo feed** `#slang-feed`: cambiar de pill NO limpia las
tarjetas ya generadas. Solo cambia la `category` del siguiente prompt. Es intencional (feed
acumulativo tipo timeline).

Sub-áreas:
- `#slang-drop-area` — visible en `calle`/`trabajo`. Contiene `#slang-empty` (héroe con mascota
  halftone SVG, L2711-2717), `#slang-feed` (L2720) y el dock del botón `#drop-btn` (L2723-2728).
- `#slang-paisa-area` — visible en `paisa` (`hidden flex-col gap-4 pt-2`). Héroe propio +
  `#paisa-input` + `#paisa-btn` + `#paisa-results` (L2732-2747).

Copys del héroe (verbatim):
- Eyebrow: `Slang · fresco de la calle` · Título: `SLANG QUE` / `SÍ SE USA.` (segunda línea en `--accent`)
- Sub: `Expresiones frescas: contexto, ejemplo y cómo NO usarlas.`
- Paisa eyebrow: `Paisa → gringo` · Título: `¿CÓMO DIGO` / `ESO EN INGLÉS?` · Sub: `Tu frase paisa, dicha como gringo de verdad.`
- Placeholder input: `"qué chimba", "está mamando gallo"...` · aria-label: `Expresión en español`

## A2. Temas de tarjeta — `CARD_THEMES` (L4721-4727, VERBATIM)

```js
const CARD_THEMES = [
  { bg: 'var(--card-blue)',   text: 'light-text' },
  { bg: 'var(--card-green)',  text: 'light-text' },
  { bg: 'var(--card-yellow)', text: 'dark-text'  },
  { bg: 'var(--card-coral)',  text: 'light-text' },
  { bg: 'var(--card-paper)',  text: 'dark-text'  },
];
```

**Trampa de contraste (documentada en L255-265 y L771-775):** el CSS fuerza `--card-ink` oscuro en
**ambas** clases (`.slang-card.dark-text, .slang-card.light-text { color: var(--card-ink); }`).
La clase `light-text`/`dark-text` que el JS emite es **decorativa/legacy**: no cambia el color.
En el port React: emitir la clase por fidelidad si se quiere, pero el token de texto es siempre
`text-card-ink` / `text-card-ink-soft`.

Rotaciones fijas por índice (L4811): `const rot = [(-1.2), 0.8, -0.6, 1.1, -0.9][i % 5];` → `rotate(${rot}deg)`.

Selección de tema en el feed (L4810): `CARD_THEMES[(state.seenSlang.length + i) % CARD_THEMES.length]`
— **OJO**: `state.seenSlang.push(c.term)` ocurre en la línea ANTERIOR (L4809), así que la longitud ya
está incrementada cuando se calcula el tema de esa misma tarjeta. Reproducir el orden exacto:
push primero, tema después.

En paisa (L4885): tema **aleatorio** `CARD_THEMES[Math.floor(Math.random() * CARD_THEMES.length)]`,
sin rotación.

## A3. Flujo `#drop-btn` → 3 tarjetas de slang (L4740-4855)

Paso a paso:

1. Guard: `if (state.busy) return;` → `state.busy = true`, `btn.disabled = true`.
2. `$('#slang-empty').classList.add('hidden')` — el héroe desaparece para siempre en esa sesión.
3. **Contador visible** (L4750-4761): un `<div>` inyectado en el feed con estilo inline
   `text-align:center;font-family:'Space Mono',monospace;font-size:0.75rem;color:var(--text-muted);padding:10px 0;`
   Texto inicial `'generando… 0s'`; `setInterval` de 1000 ms:
   - `s < 45` → `` `generando… ${s}s` ``
   - `s >= 45` → `` `generando… ${s}s · el modelo está lento hoy, sigue trabajando` ``
   Se mete en el array `skeletons` para que los `.remove()` de éxito y de error lo limpien igual.
4. **3 skeletons** `<div class="skeleton">` (L4763-4768) + `feed.parentElement.scrollTop = feed.parentElement.scrollHeight`.
5. `category` según modo (L4775-4777, VERBATIM):
   - `trabajo` → `professional/business English actually used in 2026: expressions, phrasal verbs and idioms from real meetings, negotiations, startup and tech culture`
   - resto (`calle`) → `street slang and informal expressions actually used by natives in 2026: internet culture, daily life, sports, going out`
6. **Anti-repetición**: `const avoid = state.seenSlang.slice(-60).join(', ') || 'none';` (L4780) —
   los **últimos 60** términos vistos entran al prompt.
7. `callJSON('creative', [...], 5000)` — el `5000` está comentado: *"el caso bueno usa ~2200 tokens;
   5000 deja margen y acota el peor caso (un finish 'length' a 8000 costaba ~4x mas)"*.
8. `skeletons.forEach((s) => s.remove())`.
9. **Validación** (L4783-4791):
   ```js
   const PLACEHOLDERS = ['the expression', 'no cap', 'the english expression'];
   const valid = (Array.isArray(cards) ? cards : []).filter((c) =>
     c && c.term && c.meaning_es && c.example_en &&
     !PLACEHOLDERS.includes(String(c.term).toLowerCase().trim()) &&
     !/significado en español/i.test(String(c.meaning_es))
   );
   if (!valid.length) throw new Error('Respuesta inválida, dale otra vez');
   ```
   (`'no cap'` está prohibido porque es el ejemplo del prompt: el modelo lo copiaba literal.)
10. Por cada válida: push a `seenSlang`, tema, rotación, DOM, listener del botón guardar.
11. `store.set('rodeo_seen_slang', state.seenSlang.slice(-200));` (L4838) — **tope 200**.
12. `animateIn(feed.querySelectorAll('.slang-card:nth-last-child(-n+5)'), { y: 40, duration: 1.1 })`
    y `feed.lastElementChild.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'nearest' })`.
13. `catch`: `skeletons.forEach(s => s.remove())` + `toast('Error: ' + err.message, 6000)`.
14. `finally`: `clearInterval(tick)`, `state.busy = false`, `btn.disabled = false`.

### A3.1 System prompt de SLANG (VERBATIM, L4782)

```
You create fresh English-learning content for a B2+ Venezuelan living in Medellín aiming for C1. Never textbook material. Respond with STRICT JSON only.
```

### A3.2 User prompt de SLANG (VERBATIM, L4783-4796 — template literal)

```js
`Generate exactly 3 REAL expressions of: ${category}.
Already seen (do NOT repeat any of these): ${avoid}.
${interesesLineaSlang()}Do NOT think out loud, do not explain your reasoning, do not write any preamble.
Emit the JSON array immediately as your very first character. Keep every field to one short sentence.
Return a STRICT JSON array of 3 objects. Keys per object:
- "term": the English expression itself
- "meaning_es": significado directo en español
- "example_en": one natural example sentence in English
- "example_es": traducción natural del ejemplo
- "wrong_use": en español — cuándo NO usarla o el error típico del hispanohablante al usarla
- "vibe": exactly one of "casual", "spicy", "pro", "internet"
Here is ONE example of a well-formed item — NEVER reuse its content, generate fresh real expressions:
{"term":"no cap","meaning_es":"sin mentiras, en serio","example_en":"That match was insane, no cap.","example_es":"Ese partido estuvo una locura, en serio.","wrong_use":"No la uses en emails de trabajo ni con gente mayor: es slang de internet.","vibe":"internet"}
Mix difficulty. Genuinely current and useful, zero textbook material.`
```

`interesesLineaSlang()` (L3066-3069, VERBATIM) — **termina en `\n`**, por eso se concatena pegado:

```js
function interesesLineaSlang() {
  const xs = interesesArr();
  return xs.length ? `Cuando sea natural, inclina los EJEMPLOS hacia su mundo (${xs.join(', ')}), pero las expresiones deben seguir siendo de uso general, no jerga de nicho.\n` : '';
}
```

### A3.3 Shape del JSON de SLANG

Respuesta = **array de 3 objetos**:

```jsonc
[
  {
    "term": "no cap",                  // string, obligatorio
    "meaning_es": "sin mentiras, en serio",  // string, obligatorio
    "example_en": "That match was insane, no cap.",  // string, obligatorio
    "example_es": "Ese partido estuvo una locura, en serio.",  // string, opcional de facto
    "wrong_use": "No la uses en emails de trabajo…",           // string, opcional de facto
    "vibe": "internet"                 // "casual"|"spicy"|"pro"|"internet"; fallback UI: 'slang'
  }
]
```

Solo `term`, `meaning_es`, `example_en` se validan. `example_es`, `wrong_use` y `vibe` pueden faltar:
el HTML los interpola igual (`esc(undefined)` → cadena vacía o `"undefined"` según `esc`; en el port
usar `?? ''`). `vibe` tiene fallback explícito: `esc(c.vibe || 'slang')`.

### A3.4 Inventario UI de la tarjeta de slang (L4814-4826)

`div.slang-card {theme.text}` · `style.background = theme.bg` · `style.transform = rotate(Xdeg)`

| Zona | Contenido | Clase |
|---|---|---|
| Fila superior (`flex items-start justify-between gap-3`) | `vibe` (o `'slang'`) | `.label-mini` |
| ↑ mismo | Botón guardar (icono bookmark 20×20, stroke 1.5) | `.save-slang`, `aria-label="Guardar en DNA"`, hit-area 44×44 (`min-width/min-height:44px`), `opacity:.8` |
| Término | `c.term` | `.term` (Archivo 800, clamp 2.4rem–3.4rem) |
| Significado | `c.meaning_es` | inline `font-weight:700; font-size:0.95rem; margin:6px 0 14px` |
| Ejemplo EN | `"${example_en}"` (con comillas rectas literales) | `.ex` |
| Ejemplo ES | `example_es` | `.ex-es` (itálica) |
| Cómo NO usarla | `⚠ ${wrong_use}` | `.wrong` (borde superior punteado) |

**Acción guardar** (L4829-4834):
```js
ev.currentTarget.style.opacity = '1';
ev.currentTarget.querySelector('path').setAttribute('fill', 'currentColor');   // bookmark se rellena
saveDNA({ type: 'slang', term: c.term, meaning: c.meaning_es, example: c.example_en });
toast('Guardado en tu DNA');
```
No hay des-guardar, no hay estado inicial "ya guardado" (una expresión ya en el DNA se pinta vacía).
El `saveDNA` deduplica por `type|term` **case-sensitive** (`src/lib/dna.ts`), así que un segundo clic
es no-op silencioso pero el icono se rellena igual.

**No hay TTS en la tarjeta de slang.** El TTS de ejemplos existe solo en DROP (`.dp-lex-audio` →
`speak(it.term)`) y en el passage. Si el rediseño quiere un botón de audio en la tarjeta de slang,
es **feature nueva**, no port.

## A4. Flujo PAISA → GRINGO (`translatePaisa`, L4858-4917)

Disparo: clic en `#paisa-btn` o `Enter` en `#paisa-input` (L4859-4860).

1. `phrase = inp.value.trim()`; si vacío o `state.busy` → return.
2. `state.busy = true`, `$('#paisa-btn').disabled = true`.
3. Skeleton `<div class="skeleton" style="height:140px">` con **`results.prepend(sk)`** (arriba, no abajo).
4. `callJSON('creative', [...], 2600)`.
5. `sk.remove()`; si `!d || !Array.isArray(d.equivalents)` → `throw new Error('No pude traducir eso, intenta de nuevo')`.
6. Tarjeta con tema aleatorio, `results.prepend(el)` (los resultados nuevos van **arriba**, feed inverso).
7. `animateIn(el, { y: 30, duration: 1 })`; `inp.value = ''` (se limpia SOLO en éxito).
8. `catch`: `sk.remove()` + `toast('Error: ' + err.message)` (2600 ms por defecto).
9. `finally`: `state.busy = false`, botón habilitado.

### A4.1 System prompt PAISA (VERBATIM, L4870)

```
You are a bilingual slang expert: Colombian/Venezuelan Spanish ↔ real native English. Respond with STRICT JSON only.
```

### A4.2 User prompt PAISA (VERBATIM, L4871-4880)

```js
`Gus (Venezuelan in Medellín) wants to say this in English: "${phrase}"
Give REAL equivalents natives actually use — never literal translations.
Return STRICT JSON: an object with "phrase" (the original) and "equivalents" (array of 2-4 objects, most common first). Keys per equivalent:
- "en": the actual English expression
- "register": exactly one of "casual", "neutral", "vulgar", "pro"
- "example": one natural example sentence using it
- "note_es": matiz o contexto en español, una línea
Example of ONE well-formed equivalent (never reuse its content):
{"en":"that's sick","register":"casual","example":"Bro, that goal was sick!","note_es":"Positivo entre jóvenes; no confundir con 'estar enfermo'."}`
```

Nota: PAISA **no** inyecta `interesesLineaSlang()` ni anti-repetición.

### A4.3 Shape JSON PAISA

```jsonc
{
  "phrase": "qué chimba",
  "equivalents": [
    { "en": "that's sick", "register": "casual", "example": "Bro, that goal was sick!", "note_es": "Positivo entre jóvenes; no confundir con 'estar enfermo'." }
  ]
}
```
Solo se valida `Array.isArray(d.equivalents)`. `d.phrase` **se ignora**: la UI pinta `phrase`
(el input del usuario), no el del modelo. `register` tiene fallback `|| ''`.

### A4.4 Inventario UI de la tarjeta PAISA (L4888-4900)

`div.slang-card {theme.text}` (sin rotación):
- `.label-mini` → texto literal `paisa → gringo`
- `.term` con override inline `font-size: clamp(1.8rem, 8vw, 2.6rem)` → `"${phrase}"` entre comillas
- Contenedor `display:flex; flex-direction:column; gap:12px; margin-top:14px`
- Por equivalente, un bloque con `border-top: 1px dashed currentColor; padding-top: 10px`:
  - línea 1: `<b 800 / 1.15rem>{eq.en}</b>` + `<span class="label-mini" style="font-weight:700;">· {eq.register}</span>`
  - línea 2: `.ex` con `margin-top:3px` → `"{eq.example}"`
  - línea 3: `.ex-es` con `margin-top:2px` → `{eq.note_es}`
- **Sin botón de guardar a DNA. Sin TTS.**

## A5. Persistencia de SLANG

| Clave | Forma | Escritura | Lectura |
|---|---|---|---|
| `rodeo_seen_slang` | `string[]` de términos, **máx. 200** (`slice(-200)`) | L4838, tras cada generación exitosa | L3015 al arrancar (`state.seenSlang`), L4780 (`slice(-60)` para el prompt) |
| `rodeo_dna` | `DnaItem[]`, tope 300, newest-first | vía `saveDNA` desde `.save-slang` | `getDNA()` |

Ejemplo real de `rodeo_seen_slang`:
```json
["no cap","touch grass","ate that","the ick","cook","mid","glazing","lock in"]
```

Ejemplo del item de DNA que produce una tarjeta de slang:
```json
{ "type": "slang", "term": "touch grass", "meaning": "salir a la calle, desconectarte de internet", "example": "You've been online for nine hours — go touch grass.", "ts": 1769472000000 }
```

`state.seenSlang` es la copia en memoria; **solo se persiste truncada a 200 pero en memoria crece
sin tope durante la sesión** (L4809 hace push sin recorte). Al recargar se relee ya recortada.
Reproducir tal cual o recortar en memoria también — no cambia el comportamiento observable salvo
en sesiones larguísimas.

---

# PARTE B — MOTOR DEL DROP (lectura diaria)

## B1. Ubicación y toggle

DROP vive en `#drop-pane` dentro de `#view-story`. El toggle son `.story-tab` (clase **propia**,
NO `.mode-tab` — L2527-2529 documenta que compartir clase haría que el handler de SLANG disparara
sobre estos botones).

```js
state.storyMode = 'historia';   // L5408
function mostrarPaneDrop(drop) {                                   // L5414
  const sp = $('#story-pane'), dp = $('#drop-pane');
  sp.classList.toggle('hidden', drop);  sp.classList.toggle('flex', !drop);
  dp.classList.toggle('hidden', !drop); dp.classList.toggle('flex', drop);
}
```
Al entrar a `drop` → `renderPortadaDrop()`. Al salir → `stopSpeaking()` y, si `#shadow-area` tiene
hijos, `cerrarShadow()` (L5431-5437).

## B2. `DROP_SYSTEM` (VERBATIM)

Está en **dos copias deliberadamente duplicadas**:
- `public/legacy.html` L5236 (la que usa el frontend en vivo, con semillas del DNA)
- `api/_drop-prompt.js` L26 (la que usa el cron, siempre genérica)

`api/_drop-prompt.js` L1-21 explica por qué el duplicado existe (sin build step no se puede compartir)
y lo marca con `// ── SYNC:`. **Al portar a React con Vite ya HAY build step**: la copia canónica
debería vivir en un módulo TS importable, pero `api/` es zona prohibida en esta entrega, así que la
copia del frontend se porta tal cual y el comentario SYNC sigue vigente.

El texto íntegro (~4.5 KB, un solo template literal sin interpolaciones) está en
`public/legacy.html:5236`. **Copiar por lectura de archivo, jamás de memoria.** Puntos que NO se
pueden alterar sin romper la calidad medida (3/3 corridas válidas contra kimi-k2.7):
- La cláusula `OUTPUT RULE — ABSOLUTE` con el presupuesto de `~1800 tokens`.
- El bloque `VOICE` (columnista de opinión, cero hechos verificables, prohibido nombrar a Gus).
- El bloque `SCHEMA — obey exactly` (ver §B4).
- El bloque `SEEDS`.
- El `EXAMPLE` completo (edición de ejemplo "Your Startup Doesn't Have a Growth Problem…" con seed
  `pull through`). Sin él el modelo divaga.

## B3. `dropUserPrompt` (VERBATIM, L5269-5273)

```js
const dropUserPrompt = (tema, semillas) => `Generate today's edition.
TOPIC: ${tema}
SEEDS (weave each one verbatim into the passage): ${JSON.stringify(semillas)}${interesesLineaDrop()}
Remember: your very first character must be the JSON (a fence is tolerada, nothing else is), compact on one line, zero deliberation before it.`;
```

- `tema`: `"CRYPTO"|"STARTUP"|"MEDELLIN"|"TECH"|"WILDCARD"` o el literal **`'sorpréndeme'`** (con tilde).
- `semillas`: array de **strings** (los `term`), 0-3. `JSON.stringify` → `["pull through","take it up"]`.
- `interesesLineaDrop()` (L3062-3065) **empieza con `\n`**, por eso se pega sin espacio:
  ```js
  return xs.length ? `\nIntereses del lector (elige el ángulo y los ejemplos que le hablen, sin nombrarlo nunca en el texto): ${xs.join(', ')}.` : '';
  ```
- **Divergencia real entre copias**: la copia de `api/_drop-prompt.js` L64-67 **omite**
  `interesesLineaDrop()` (el server no ve los intereses). Es intencional.

## B4. Shape EXACTO de la edición (`ed`)

```jsonc
{
  "headline": "Your Startup Doesn't Have a Growth Problem. It Has a Truth Problem.",
  "topic": "STARTUP",                     // "CRYPTO"|"STARTUP"|"MEDELLIN"|"TECH"|"WILDCARD"
  "passage": "Every founder swears…\n\nHere's the uncomfortable part:…",  // 160-260 palabras, párrafos con \n\n
  "glosses": [                            // 3-5; term DEBE ser substring exacto del passage
    { "term": "papering over the same cracks", "es": "tapar los mismos problemas…" }
  ],
  "lexicon": [                            // EXACTAMENTE 5
    { "term": "scratch the surface", "frase": "Scratch the surface, though, and you'll…", "es": "rascar apenas la superficie…" }
  ],
  "questions": {
    "mc": [                               // EXACTAMENTE 2
      { "q": "What does the author suggest…", "options": ["a","b","c"], "correct": 0, "why_es": "Dice que…" }
    ],
    "open": ["Think of a moment when…", "Where is the line between…"]   // EXACTAMENTE 2 strings
  },
  "seeded": [                             // 1 por semilla; [] si no hubo
    { "term": "pull through", "meaning_es": "salir adelante, sobrevivir una etapa muy difícil",
      "distractors": ["tirar de algo con mucha fuerza", "atravesar un lugar sin detenerse"] }
  ],
  "produccion": "Your team just found out a metric on the last board deck was 'dressed up'. In two sentences, what do you say at the next all-hands?"
}
```

Los "exactamente N" son lo que **pide** el prompt; `normalizarEdicion` **no los impone** — filtra y
deja pasar lo que haya (0 glosas, 3 lexicon, 1 mc…). La UI renderiza lo que llegue.

## B5. Parseo y normalización

### `parsearEdicion(raw)` (L5276-5282, VERBATIM)
```js
function parsearEdicion(raw) {
  const sinFences = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  for (const c of [sinFences, raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)]) {
    try { return JSON.parse(c); } catch { /* siguiente */ }
  }
  return null; // → reintentar la llamada completa
}
```
Dos pasadas: sin fences y rescate primer-`{` … último-`}`.

### `normalizarEdicion(ed)` (L5290-5325)
Se ejecuta **antes** de cachear y **también** al releer desde cache (L5539). Reglas:
- `null` si `!ed` o `headline` no es string o `passage` no es string no vacío.
- `glosses`: filtra items con `term` y `es` string no vacíos.
- `lexicon`: filtra por `term`; normaliza `{term, frase: str, es: str}`.
- `questions`: si no es objeto plano → `{}`. `mc` requiere `q` string + `options` array con **≥2**
  strings; `correct` pasa por `parseInt(m.correct, 10)` y cae a `0` si no es finito o fuera de rango
  (el modelo lo manda como `"1"` a veces → sin esto el acierto se pintaba rojo). `open`: strings no vacíos.
- `seeded`: exige `term`, `meaning_es` y **≥2 distractors** string no vacíos; los recorta a 2.
  *Motivo documentado*: un `seeded` con 1 señuelo daría un micro-chequeo de una sola opción =
  acierto regalado que marca la semilla como dominada sin prueba.
- `produccion`: coaccionado a string.
- **`normalizarEdicion` MUTA el objeto de entrada y lo devuelve** (no clona). Al portar, mantener la
  semántica de devolver el mismo shape, pero preferir retorno inmutable en TS.

## B6. `pedirEdicion(tema, terms, silent)` (L5588-5607, VERBATIM en lógica)

```js
async function pedirEdicion(tema, terms, silent) {
  let motivo = 'sin respuesta';
  for (let i = 0; i < 3; i++) {
    if (i) await new Promise((r) => setTimeout(r, 4000));
    try {
      const { content } = await callAPI('creative', [
        { role: 'system', content: DROP_SYSTEM },
        { role: 'user', content: dropUserPrompt(tema, terms) },
      ], 5000, { silent: !!silent });
      if (!content || !content.trim()) { motivo = 'respuesta vacía'; continue; }
      const ed = normalizarEdicion(parsearEdicion(content));
      if (ed) return ed;
      motivo = 'JSON inválido';
    } catch (e) {
      motivo = String(e && e.message || e).slice(0, 90);
      if (motivo === 'pin_required') throw e;   // silencioso: no reintentar, abortar
    }
  }
  throw new Error(motivo);
}
```
- **3 intentos, backoff fijo 4 s**, `max_tokens: 5000`.
- `opts.silent` viaja a `callAPI` → en `src/lib/api.ts` L57: un 401 con `silent` lanza
  `new Error('pin_required')` **sin abrir el `prompt()` bloqueante**. `pedirEdicion` reconoce ese
  mensaje exacto y **aborta sin reintentar**.
- Comentario a conservar: *"NO usar prefill de assistant `{`: probado — Fireworks corrompe los tokens
  en la frontera."*
- ⚠️ `callJSON` de `src/lib/api.ts` **no** acepta `opts` — el DROP usa `callAPI` directo, correcto.

## B7. Cache diaria, promoción y prefetch

### Fechas — convención UTC
```js
function fechaDropHoy()    { return new Date().toISOString().slice(0, 10); }              // L5467
function fechaDropManana() { return new Date(Date.now() + 86400000).toISOString().slice(0, 10); } // L5474
function diaDeDrop(ts)     { return ts ? new Date(ts).toISOString().slice(0, 10) : ''; }  // L5363
```
Misma convención que `updateStreak` (L6785). *"consistencia > precisión"* — en Medellín (UTC-5) el
día del drop cambia a las 19:00 hora local. **No arreglarlo.**

### Claves de localStorage

| Clave | Forma exacta | Notas |
|---|---|---|
| `rodeo_drop_hoy` | `{ fecha: 'YYYY-MM-DD', edicion: <ed>, semillas: [{term, es}] }` o `null` | L5567 |
| `rodeo_drop_manana` | idem, con `fecha` = mañana | L5501; se pone a `null` tras promover |

Ejemplo:
```json
{
  "fecha": "2026-07-27",
  "edicion": { "headline": "…", "topic": "CRYPTO", "passage": "…", "glosses": [], "lexicon": [], "questions": { "mc": [], "open": [] }, "seeded": [], "produccion": "…" },
  "semillas": [{ "term": "pull through", "es": "salir adelante" }]
}
```
**OJO**: `semillas` guarda objetos `{term, es}` (salida de `elegirSemillasDrop`), pero al prompt se
manda `semillas.map(s => s.term)` (solo strings). No confundir.

### `promoverPrefetchSiToca()` (L5509-5528)
```js
const hoy = fechaDropHoy();
const cacheHoy = store.get('rodeo_drop_hoy', null);
if (cacheHoy && cacheHoy.fecha === hoy && cacheHoy.edicion) return false;   // ya hay drop de hoy
const man = store.get('rodeo_drop_manana', null);
if (man && man.fecha === hoy && man.edicion) {
  store.set('rodeo_drop_hoy', { fecha: hoy, edicion: man.edicion, semillas: man.semillas || [] });
  const confirm = store.get('rodeo_drop_hoy', null);              // ← relectura de verificación
  if (confirm && confirm.fecha === hoy && confirm.edicion) store.set('rodeo_drop_manana', null);
  return true;
}
return false;
```
La **relectura de verificación** es crítica: `store.set` traga `QuotaExceeded` en silencio (con toast),
y borrar `rodeo_drop_manana` sin confirmar perdería la edición pre-cocinada. Conservar.

Se llama desde `renderPortadaDrop()` (L5455) y desde `generarDrop()` (L5532).

### `prefetchDropManana()` (L5477-5507)
- Guard: `if (dropBusy || prefetchEnVuelo) return;`
- Si `rodeo_drop_manana` ya tiene `fecha === mañana` y `edicion` → return (no rehacer).
- `elegirSemillasDrop(3)`; `pedirEdicion('sorpréndeme', semillas.map(s => s.term), true)` ← **silent**.
- Guarda; `catch` → solo `console.warn('[drop] prefetch de mañana falló (se regenerará en vivo):', …)`,
  **sin toast** (es background).
- **Disparo ÚNICO**: `setTimeout(prefetchDropManana, 800)` desde `#drop-close` (L5996).
  **NO** desde `renderPortadaDrop` — L5452-5455 documenta la carrera: cocinar al entrar a la portada
  competía con el clic de "DROP DEL DÍA". Conservar el punto de disparo exacto.

## B8. `generarDrop(fuerza)` (L5530-5583) — paso a paso

1. `if (dropBusy) return;`
2. `promoverPrefetchSiToca()` — para que el cache-hit de abajo vea lo ya cocinado.
3. **Cache-hit**: si `!fuerza && !dropTema && cache.fecha === fechaDropHoy() && cache.edicion`:
   - `normalizarEdicion(cache.edicion)`; si sale bien → `abrirEdicionDrop(edCache, cache.semillas || [])`
     dentro de `try/catch` y `return`.
   - Si la cache es inservible (normalización `null` o el render lanza): `console.warn`,
     `store.set('rodeo_drop_hoy', null)`, se restaura la portada (`#drop-session` hidden,
     `#drop-home` visible) y **sigue** a generar. *Motivo: una edición envenenada rompía el botón del
     día hasta mañana.*
4. `dropBusy = true`, `#drop-go` disabled, `#drop-status` visible con `'cocinando tu drop…'`.
5. Tick 1 s (L5559-5562):
   - `s < 30` → `'cocinando tu drop… ' + s + ' s'`
   - `s >= 30` → `'cocinando tu drop… ' + s + ' s · el horno está lento, aguanta'`
6. `const semillas = elegirSemillasDrop(3);`
7. `pedirEdicion(dropTema || 'sorpréndeme', semillas.map(s => s.term))` (sin silent → el PIN sí se pide).
8. `store.set('rodeo_drop_hoy', { fecha: fechaDropHoy(), edicion: ed, semillas })`.
9. **Consumir el tema**: `dropTema = null` + quitar `.selected` de todos los `.dp-tema`.
   *Motivo: un chip pegado hacía que el próximo "DROP DEL DÍA" saltara la cache y pisara la edición del día.*
10. `abrirEdicionDrop(ed, semillas)`.
11. `catch`: `toast('El drop se enredó: ' + (e.message || e), 5000)`.
12. `finally`: `clearInterval`, status hidden, botón habilitado, `dropBusy = false`.

Chips de tema (L5459-5466): clic sobre un chip ya `.selected` lo **deselecciona** (`dropTema = null`).
`#drop-sorpresa` limpia selección, pone `dropTema = null` y llama **`generarDrop(true)`** (`fuerza`,
salta la cache).

## B9. DNA doble-vía (semillas)

Campos **aditivos** sobre items del DNA (L5327-5331) — `renderDNA` nunca los lee:
- `d.dropVisto` → `Date.now()` de la última vez que salió sembrada
- `d.dropAciertos` → micro-chequeos acertados; con **2** se pone `d.dominado = true`

### `elegirSemillasDrop(max = 3)` (L5340-5358)
- Recorre `state.dna`, salta `d.dominado`.
- `error` → `term = d.fix`, `es = d.why`. `slang` → `term = d.term`, `es = d.meaning`. Cualquier otro
  tipo (incl. `upgrade`) → `continue`.
- Descarta términos de **más de 5 palabras** (`_drop_palabras`, L5333): *"no se puede tejer natural sin que cante"*.
- Dedupe por `term.trim().toLowerCase()`.
- Orden: `(a._visto - b._visto) || (a._ts - b._ts)` → lo **menos visto** primero; a igual visto, el más viejo.
- Devuelve `{term, es}[]`, máx. `max`.

### `registrarSemillaDrop(term, acierto)` (L5365-5389)
- Busca por `fix` (error) o `term` (slang), **case-insensitive**, `trim`. Nunca `upgrade`
  (los upgrades también tienen `.fix`).
- **Máximo UN acierto por día**: `const yaHoy = diaDeDrop(d.dropVisto) === fechaDropHoy();`
  Siempre se actualiza `d.dropVisto = Date.now()`, pero `dropAciertos` solo sube si `acierto && !yaHoy`.
  *Motivo: reabrir la edición desde cache re-renderizaba el micro-chequeo con la respuesta fresca.*
- Con `dropAciertos >= 2` → `dominado = true`. **El diseño es 2 aciertos en DÍAS distintos.**
- Persiste `rodeo_dna` completo.

### `guardarLexicoDrop(items)` (L5391-5405)
Al cerrar el drop, el `lexicon` entra al DNA como `type:'slang'`:
```js
saveDNA({ type: 'slang', term: it.term, meaning: it.es || '', example: it.frase || '' });
```
Pre-filtra en **minúsculas** porque `saveDNA` deduplica case-**sensitive** y el LLM capitaliza a su
antojo. Devuelve el número de nuevos.

## B10. Portada del DROP — `renderPortadaDrop()` (L5441-5457)

Badge `#drop-badge-semillas` (`textContent`, no innerHTML):
- 1 semilla → `🔥 hoy vuelve 1 palabra tuya`
- N > 1 → `🔥 hoy vuelven N palabras tuyas`
- 0 → `.hidden`

Luego `promoverPrefetchSiToca()`.

Chips: `CRYPTO 🪙`, `STARTUP 🚀`, `MEDELLÍN 🚡` (`data-tema="MEDELLIN"` sin tilde), `TECH 🤖`,
`Sorpréndeme 🎲` (`#drop-sorpresa`, sin `.dp-tema`).

## B11. `abrirEdicionDrop(ed, semillas)` (L5609-5640)

1. `cerrarShadow()`; `state.dropEdicion = ed`; `state.dropSemillas = semillas`.
2. `#drop-home` hidden; `#drop-session` visible (`remove hidden`, `add flex`).
3. `tipPrimeraVez('drop', 'Toca lo subrayado — te lo explico')` — clave `drop` en `rodeo_tips`
   (`{drop: 1}`), se muestra **una sola vez de por vida**, se auto-cierra a los 8 s.
4. `#drop-headline`.textContent = `ed.headline || ''`.
5. `#drop-meta`.textContent = `` `${ed.topic || 'DROP'} · B2+ → C1 · ~2 min` `` (VERBATIM).
6. Passage: `String(ed.passage).split(/\n{2,}/)` → un `<p>` por párrafo, cada uno con
   `glossHTML(p, ed.glosses || [])`. **La glosa se aplica por párrafo**, no sobre el passage entero:
   un `term` que cruce párrafos no se glosa. En React usar `replySpans(p, ed.glosses)` de `src/lib/gloss.ts`.
7. `renderLexicoDrop(ed.lexicon || [])`, `renderPreguntasDrop(ed)`, `renderProduccionDrop(ed.produccion || '')`.
8. **Etapa 1**: `#drop-practicar` visible, `#drop-practica` hidden.
9. `animateIn(ses.querySelectorAll('.dp-head, .dp-audiobar, .dp-passage, .dp-sect'), { y: 18, duration: 0.7 })`.
   Comentario a respetar: `#drop-practicar` **NO** entra en `animateIn` — su entrada es por keyframes CSS;
   si gsap le pusiera `opacity:0` y el tween no corriera, el CTA desaparecería.

Etapa 2 (L5643-5651): clic en `#drop-practicar` → se oculta, `#drop-practica` `remove hidden`+`add flex`,
`animateIn('.dp-sect, .dp-shadow-dock', { y: 26, duration: 0.85 })`, `scrollIntoView({block:'start'})`.

## B12. TTS

### Passage por oraciones — `reproducirPassageDrop()` (L5655-5697)
Motivo documentado: una sola llamada TTS con el texto entero tardaba ~90 s y el botón parecía muerto.
- `stopSpeaking()` + captura de `speakToken` (invalidación por token, no cola).
- Troceo: `String(ed.passage).replace(/\n+/g, ' ').split(/(?<=[.!?…])\s+/)` → trim, filter(Boolean).
  **Incluye `…` (U+2026)** en el lookbehind.
- **Pipeline de 1 adelanto**: se pide la oración `i+1` mientras suena la `i`.
- Estados del botón `#drop-play`: `.cargando` → sub `cargando la voz…`; `.playing` → sub
  `sonando · toca para parar`; en `finally` vuelve a `voz nativa · sigue el texto abajo`.
- Clic con `.playing` o `.cargando` → `stopSpeaking()` (toca para parar).
- `catch` (solo si el token sigue vigente): `toast('No pude leer el passage: ' + msg, 3500)`.

### Léxico — `renderLexicoDrop(items)` (L5702-5726)
Por item, `div.dp-lex-card`:
- `.dp-lex-head` → `.dp-lex-term` (el `term`) + `button.icon-btn.dp-lex-audio` (38×38, icono altavoz 16×16,
  `aria-label="Escuchar {term}"`) → **`speak(it.term)`** (solo el término, no la frase).
- `.dp-lex-frase` → la `frase` entre comillas tipográficas `“…”` con el `term` resaltado en `<b>`
  mediante búsqueda **case-insensitive** (`f.toLowerCase().indexOf(term.toLowerCase())`), preservando
  el casing original del texto (`f.slice(idx, idx + it.term.length)`). Si no aparece, se pinta sin `<b>`.
- `.dp-lex-es` → `it.es`.

## B13. Preguntas — `renderPreguntasDrop(ed)` (L5738-5808)

**Tres bloques en este orden** dentro de `#drop-questions`:

### 1) MC (`qs.mc`)
`div.dp-q-card` → `.dp-q-text` (la pregunta) + fila de `button.dp-opt` + `.dp-q-why.hidden` con
prefijo `💡 `. Al clicar cualquier opción:
- todas `disabled`; la de índice `q.correct` recibe `.correct`;
- si la clicada no es la correcta, recibe `.wrong`;
- `.dp-q-why` se revela.
Sin puntaje, sin persistencia.

### 2) Abiertas (`qs.open`) → `cardAbiertaDrop(preg, 'open')`

### 3) Micro-chequeo de semillas — DNA doble-vía
Por cada `sem` de `state.dropSemillas`:
- **Guarda 1**: si algún item del DNA con ese término tiene `diaDeDrop(d.dropVisto) === fechaDropHoy()`
  → **no se renderiza** (segunda capa contra la reapertura desde cache).
- Busca en `ed.seeded` con match laxo (igualdad / `includes` en **ambas direcciones**, lowercase),
  porque el LLM puede devolver la semilla conjugada.
- Si no hay `seeded` o le falta `meaning_es` → se omite.
- Card: `🔥 Volvió de tu DNA: “{term}” — ¿qué significaba aquí?` (comillas tipográficas).
- Opciones = `mezclarDrop([{txt: meaning_es, ok:true}, ...distractors.slice(0,2).map(d => ({txt:d, ok:false}))])`
  — Fisher-Yates (L5729-5736).
- Al clicar: todas disabled, se marca `.correct` la que tiene `ok`, `.wrong` la clicada si falló,
  `registrarSemillaDrop(sem.term, op.ok)` **con el term ORIGINAL de `elegirSemillasDrop`, no el del LLM**,
  y si acertó `toast('Clavada — un acierto más y queda dominada 🔥', 2200)`.

## B14. Tarjeta abierta — `cardAbiertaDrop(pregunta, tipo)` (L5810-5845)

`tipo` ∈ `'open' | 'prod'`. Estructura `div.dp-q-card.dp-q-open`:
- `.dp-q-text` → la pregunta.
- `.dp-open-dock`: `button.icon-btn.dp-open-mic` (aria `Responder por voz`) ·
  `textarea.dp-open-input` (rows=2, placeholder `Your take, in English...`, aria `Tu respuesta en inglés`,
  `padding:12px 14px`) · `button.icon-btn.dp-open-send` (aria `Enviar respuesta`, fondo `--accent`).
- **Botón de pista** insertado **antes** de `.dp-open-fb`: `button.btn-ghost.dp-open-pista`,
  texto `💡 ¿Va bien? ¿Cómo lo mejorarías?`, estilo inline
  `align-self:flex-start; font-size:0.75rem; min-height:36px; padding:6px 14px; margin-top:8px`.
- `.dp-open-fb` → contenedor de feedback (innerHTML).
- `wireMicNota(mic, textarea)` — mic contexto **`'drop'`** por defecto.

### Mic ctx `'drop'` — `wireMicNota(btn, ta, ctx = 'drop')` (L5878-5928)
Mic **tipo nota de voz** (distinto del `wireMic` clásico de Story/Ladder que corta al primer silencio
y reinicia de cero):
- `wireMicToggle(btn, 'drop', code => { if (rec) rec.lang = code; })` inserta el chip ES/EN.
  Clave de persistencia: **`rodeo_miclang_drop`** (valores `'es'|'en'`). Default de `drop` = **`'en'`**
  (`MIC_LANG_DEFAULTS`, L2959: *"DROP: responde la lectura en inglés"*). Códigos: `{es:'es-419', en:'en-US'}`.
- `rec.interimResults = true; rec.continuous = true;`
- `base` acumula lo ya escrito; `onresult` reconstruye `ta.value = (base + fin + inter).replace(/\s+/g,' ').trimStart()`.
- `onend` con `activo` aún true → **re-arranca** conservando lo dicho (las pausas para pensar no cortan).
- Iconos: `MIC_ICON_NOTA` (mic) ↔ `STOP_ICON_NOTA` (cuadrado relleno rx=2.5). Clase `.recording`.
  aria-label alterna `Parar la grabación` / `Responder por voz`.
- Errores: `network` → toast largo (5000) sobre Brave/Google;  `not-allowed` → `'Permite el micrófono en el navegador'`;
  `no-speech`/`aborted` se dejan pasar (decide `onend`).
- Sin `SpeechRecognition` → `toast('Tu navegador no soporta dictado — usa Chrome')`.
- En el port usar `crearReconocedor` / `useMicLang('drop')` de `src/lib/speech.ts`.

### `pedirPistaDrop(pregunta, ta, fb, btn)` (L5850-5875)
`fb.textContent = 'el coach está pensando…'`. `callJSON('chat', […], 900)`.

**System (VERBATIM, L5855)** — concatenado con `' ' + NOTA_STT_BILINGUE`:
```
You are a supportive English coach. The learner is DRAFTING an answer and wants guidance BEFORE submitting — do NOT grade. STRICT JSON only: {"veredicto_es":"1 línea en español: si el borrador va bien o qué le falta (si está vacío, anímalo y oriéntalo)","opciones":["two different natural English ways to say it or to start"]}. No grammar jargon.
```
**User**: `'QUESTION: ' + pregunta + '\n\nDRAFT (may be empty): ' + ta.value.trim()`

Render: `'💡 ' + veredicto_es`, luego hasta 2 `opciones` como `<br>· <b style="color: var(--accent);">{o}</b>`.
**No toca el DNA.** Error → `fb.textContent=''` + `toast('Error: ' + msg, 3000)`.

### `enviarAbiertaDrop(tipo, pregunta, ta, fb, btn)` (L5930-5975)
Vacío → `toast('Escribe (o dicta) tu respuesta primero', 1800)`.
`fb.textContent = 'el coach está leyendo…'`. `callJSON('chat', […], 1400)`.

**System si `tipo === 'prod'` (VERBATIM, L5937)**:
```
You are an English coach for a B2+ learner pushing C1. Evaluate his short production. STRICT JSON only: {"feedback_es":"1-2 líneas en español, directas y amables","correccion":{"quote":"exact wrong words","fix":"native phrasing","why":"por qué, en español, 1 línea"}|null,"upgrade":{"b2":"something he wrote that was fine but basic","c1":"the C1 phrasing","note":"en español, 1 línea"}|null}. No grammar jargon anywhere.
```
**System si `tipo === 'open'` (VERBATIM, L5938)**:
```
You are an English coach checking reading comprehension for a B2+ learner. STRICT JSON only: {"ok":true|false,"feedback_es":"1-2 líneas en español: si entendió y qué se le escapó","correccion":{"quote":"exact wrong words","fix":"native phrasing","why":"por qué, en español, 1 línea"}|null}. "ok" judges COMPREHENSION, not grammar. Correct only the single most valuable English error, null if clean. No grammar jargon.
```
Ambos se envían como `sys + ' ' + NOTA_STT_BILINGUE`.

**User (VERBATIM)**:
```js
'PASSAGE:\n' + ((state.dropEdicion && state.dropEdicion.passage) || '') + '\n\nQUESTION: ' + pregunta + '\n\nHIS ANSWER: ' + texto
```

Render del feedback:
- prefijo: `prod` → `💬 ` · `open` → `parsed.ok ? '✅ ' : '🤔 '`
- si `correccion.fix`: `<br><span style="color: var(--texto-mal); text-decoration: line-through;">{quote}</span> → <b style="color: var(--accent);">{fix}</b> · {why}`
  **y `saveDNA({ type:'error', quote, fix, why })`**
- si `esProd && upgrade.c1`: `<br>⬆️ “{b2}” → <b style="color: var(--accent);">“{c1}”</b> · {note}`
  **y `recordUpgrade({ b2, c1, note, dominado: false })`**

`renderProduccionDrop(prompt)` (L5977-5981): si hay prompt, una sola `cardAbiertaDrop(prompt, 'prod')` en `#drop-prod`.

## B15. Shadowing (`#drop-shadow-btn`, L5983 y IIFE L5999+)

Selección de frases (L5984-5991):
```js
const frases = String(ed.passage).replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/)
  .map(s => s.trim()).filter(s => s.split(/\s+/).length >= 6).slice(0, 3);
iniciarShadow(frases.length ? frases : [String(ed.passage).slice(0, 140)]);
```
(nótese: aquí el split **no** incluye `…`, a diferencia del TTS del passage).

Módulo autocontenido: TTS con voz **fijada a `aura-2-helena-en`** (`pedirTTSHelena` restaura la voz
previa solo si nadie la tocó), `AudioBuffer` cacheado por frase, `MediaRecorder` para la toma del
usuario, A/B modelo↔toma. Reglas críticas conservadas:
- `window.pararAudioShadow` se expone para que `stopSpeaking()` global también alcance estas fuentes.
- **Brave**: cero `await` antes de `play()` en `playToma` (gesto de usuario válido).
- Re-silenciar tras el await en `playModelo` (durante la carga del TTS pudo arrancar otra fuente).
- El indicador de mic del navegador debe apagarse SIEMPRE al cerrar.

## B16. Cierre — `#drop-close` (L5983-5997)

```js
cerrarShadow();
const ed = state.dropEdicion;
if (ed) {
  const n = guardarLexicoDrop(ed.lexicon || []);
  updateStreak();
  if (n) toast(n === 1 ? '1 expresión nueva en tu DNA' : n + ' expresiones nuevas en tu DNA', 2500);
}
// ocultar sesión, mostrar portada
renderPortadaDrop();
setTimeout(prefetchDropManana, 800);
```
`updateStreak()` (L6784) actualiza `rodeo_streak = { days, last: 'YYYY-MM-DD' }`, no-op si ya se
acreditó hoy.

## B17. Servidor: `/api/drop-today` + cron + KV

- **`api/cron-drop.js`** — Vercel Cron (1×/día, según `crons` en `vercel.json`).
  Auth: `authorization: Bearer ${CRON_SECRET}`. Sin `CRON_SECRET` → 200 `{skipped:'no CRON_SECRET'}`
  (degradación limpia, nunca 500). Sin `OPENCODE_API_KEY` → 200 `{skipped:'no OPENCODE_API_KEY'}`.
  Sin `KV_REST_API_URL`/`KV_REST_API_TOKEN` → 200 `{skipped:'no KV'}`.
  Genera con `generarEdicionGenerica(apiKey, { tema:'sorpréndeme', semillas: [] })` (mismo bucle de
  3 intentos / backoff 4 s / `max_tokens:5000` / `temperature:0.85` / modelo
  `process.env.MODEL_CREATIVE || 'kimi-k2.7-code'`, endpoint `https://opencode.ai/zen/v1/chat/completions`).
  Persiste en Upstash REST `POST {KV}/set/rodeo:drop:generic` con body
  `{ edicion, fecha, generatedAt, source:'cron' }`, **sin TTL**. Fallo de KV → 502 `kv_set_failed`;
  fallo de generación → 502 `generation_failed`.

- **`api/drop-today.js`** — `GET`. Lee `{KV}/get/rodeo:drop:generic` (Upstash devuelve `{result: <string|null>}`),
  parsea y responde `200 { edicion, fecha }` con `Cache-Control: public, max-age=300`.
  **Cualquier** problema (sin KV, `!ok`, sin `result`, JSON malo, red) → **`204` sin cuerpo**.
  Método distinto de GET → 405 `{error:'method_not_allowed'}`.

- ⚠️ **TRAMPA GORDA**: `drop-today` está documentado como fallback instantáneo del primer arranque,
  pero **`public/legacy.html` NUNCA lo llama** (`grep 'drop-today' public/legacy.html` → 0 hits).
  El endpoint existe, el cron lo llena, y el frontend lo ignora: siempre genera en vivo o usa la
  cache local. Portar **el comportamiento observado** (sin llamada), y si el orquestador quiere
  cablearlo, es feature nueva y debe decidirse explícitamente.

---

# PARTE C — TRAMPAS Y CASOS BORDE (checklist del port)

## SLANG
1. **`state.busy` es global compartido** con TALK/STORY/LADDER. En el port, `src/stores/slang.ts`
   debe respetar el mismo gate o convivir con el store global — dos generaciones simultáneas nunca
   deben poder arrancar.
2. `light-text`/`dark-text` **no cambian el color** (CSS los iguala a `--card-ink`). No "arreglar".
3. El tema se calcula **después** del `push` a `seenSlang` → `(seenSlang.length + i) % 5`.
4. `'no cap'` está en `PLACEHOLDERS` porque es el ejemplo del prompt. Y `/significado en español/i`
   caza el placeholder del schema.
5. `seenSlang` se persiste a **200**, se manda al prompt **60**. Dos números distintos, ambos exactos.
6. Cambiar de pill `calle`↔`trabajo` **no limpia el feed**. `paisa` solo oculta el área.
7. `#slang-empty` se oculta al primer DROP y **nunca vuelve** (no hay estado "feed vacío" tras generar).
8. Resultados de PAISA van con `prepend` (nuevos arriba); las de slang con `append` (nuevas abajo)
   + `scrollIntoView`. Direcciones opuestas, intencional.
9. El contador `generando… Ns` vive **dentro del array de skeletons** para que un solo `.remove()`
   lo limpie en éxito y en error. No duplicar la limpieza.
10. `translatePaisa` limpia el input **solo en éxito**.
11. Ninguna tarjeta de slang tiene TTS. Añadirlo sería feature nueva.
12. `state.slangMode` no se persiste.

## DROP
13. **Fecha UTC** en todo (`fechaDropHoy`, `fechaDropManana`, `diaDeDrop`, `updateStreak`). El día
    rota a las 19:00 en Medellín. Documentado y aceptado.
14. `promoverPrefetchSiToca` **relee** `rodeo_drop_hoy` antes de borrar `rodeo_drop_manana`
    (`store.set` traga `QuotaExceeded`).
15. El prefetch **solo** se dispara desde `#drop-close` + `setTimeout(…, 800)`. Nunca desde la portada.
16. El prefetch usa **`silent: true`** → un 401 lanza `'pin_required'`, que `pedirEdicion` re-lanza
    **sin reintentar**, y el `catch` del prefetch solo hace `console.warn`. Cero modales en background.
17. `dropTema` se **consume** tras generar (chip deseleccionado). Si no, el próximo "DROP DEL DÍA"
    saltaría la cache y pisaría la edición del día.
18. `#drop-sorpresa` llama `generarDrop(true)` → **fuerza**, ignora la cache. Regenera y cobra.
19. La cache se **re-normaliza** al releerla y el render va en `try/catch`: una edición envenenada
    (de una versión vieja del código) se descarta en vez de romper el botón del día.
20. `normalizarEdicion` coacciona `correct` desde `"1"` y lo clampa a `0` fuera de rango.
21. `seeded` necesita **≥2 distractors** o se descarta: si no, sería un acierto regalado.
22. **Doble guarda contra el acierto repetido el mismo día**: (a) `renderPreguntasDrop` no pinta el
    micro-chequeo si `dropVisto` es de hoy; (b) `registrarSemillaDrop` no incrementa `dropAciertos`
    si `yaHoy`. Ambas necesarias.
23. `registrarSemillaDrop` usa el `term` **original** de `elegirSemillasDrop`, no el de `ed.seeded`
    (el LLM lo conjuga). El match a `ed.seeded` sí es laxo (`includes` bidireccional).
24. `registrarSemillaDrop` ignora `type:'upgrade'` aunque tenga `.fix`.
25. Las glosas se aplican **por párrafo**; un término que cruce `\n\n` no se glosa.
26. TTS del passage: split con lookbehind `(?<=[.!?…])` (incluye `…`); shadowing: `(?<=[.!?])`
    (no incluye `…`) **y** filtro de ≥6 palabras. Son dos criterios distintos, a propósito.
27. `#drop-practicar` **fuera** de `animateIn` (entra por keyframes CSS).
28. `tipPrimeraVez('drop', …)` escribe en `rodeo_tips` y no vuelve nunca.
29. `guardarLexicoDrop` pre-filtra en minúsculas porque `saveDNA` deduplica case-sensitive.
30. `/api/drop-today` existe pero **el frontend no lo usa** (ver B17).
31. El duplicado de `DROP_SYSTEM` entre `legacy.html` y `api/_drop-prompt.js` es **deliberado**;
    la copia del server omite `interesesLineaDrop()`.
32. `speak()` en el léxico habla **el término**, no la frase.
33. Shadowing fija la voz a `aura-2-helena-en` aunque el usuario tenga otra voz en TALK, y la restaura.

## Módulos ya existentes que hay que importar (no reescribir)
- `src/lib/api.ts` → `callAPI(mode, messages, maxTokens, {silent})`, `callJSON(mode, messages, maxTokens)`,
  `parseJSON`. **`callJSON` no acepta `silent`** — el DROP necesita `callAPI`.
- `src/lib/storage.ts` → `store.get/set` (claves idénticas).
- `src/lib/dna.ts` → `saveDNA`, `recordUpgrade`, `getDNA`, `onDnaChange`, `dnaTieneSlang`. Tope 300,
  dedupe `type|fix||term` case-sensitive.
- `src/lib/gloss.ts` → `replySpans(texto, glosses)` sustituye a `glossHTML` (devuelve datos, no HTML).
- `src/lib/speech.ts` → `speak`, `stopSpeak`, `MIC_LANGS`, `micLang('drop')`, `useMicLang('drop')`,
  `crearReconocedor`, `NOTA_STT_BILINGUE`, `VOCES`.
- `src/stores/toast.ts` → `toast(msg, ms = 2600)`.
- `src/components/rodeo/` → `pill-button`, `mic-button`, `pencil-loader`, `gloss-text`.
- Tokens: `bg-card-blue/lavender/green/yellow/coral/peach/paper`, `text-card-ink`,
  `text-card-ink-soft`, `shadow-sticker`, `var(--card-borde)`, `font-display`, `font-mono`.

## Tabla resumen de localStorage tocado por SLANG/DROP

| Clave | Tipo | Tope | Escrito por |
|---|---|---|---|
| `rodeo_seen_slang` | `string[]` | 200 | `#drop-btn` (SLANG) |
| `rodeo_dna` | `DnaItem[]` | 300 | `.save-slang`, `guardarLexicoDrop`, `registrarSemillaDrop`, `enviarAbiertaDrop` |
| `rodeo_drop_hoy` | `{fecha, edicion, semillas}` \| `null` | — | `generarDrop`, `promoverPrefetchSiToca` |
| `rodeo_drop_manana` | `{fecha, edicion, semillas}` \| `null` | — | `prefetchDropManana`, `promoverPrefetchSiToca` |
| `rodeo_miclang_drop` | `'es'\|'en'` (default `'en'`) | — | chip ES/EN de `wireMicToggle` |
| `rodeo_tips` | `{ [key]: 1 }` | — | `tipPrimeraVez('drop', …)` |
| `rodeo_streak` | `{days, last}` | — | `updateStreak()` en `#drop-close` |
| `rodeo_cost` | `number` | — | `callAPI` (acumulador) |
