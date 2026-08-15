# VERIFICACIÓN ADVERSARIAL · Vista TALK (CHARLA + ESCENAS) — ronda 1

> Verificador: no confía en lo reportado por los implementadores. Todo lo de abajo
> se comprobó ejecutando: `npm run typecheck`, `npm run build`, comparación
> programática de prompts contra `public/legacy.html` y 8 suites de Playwright
> (390 px y 320 px, tema oscuro y claro, red mockeada).
> Fecha: 2026-07-27 · rama `claude/rodeo-repo-info-nw2025`.

**Veredicto: CON DEFECTOS.** 1 mayor + 5 menores. Ningún bloqueante.
El port funcional es sólido: los flujos completos de CHARLA y ESCENAS, las formas
de `localStorage`, los reintentos y las rutas de error se comportan como el legacy.
Lo que falla es de capa visual (un desbordamiento horizontal dentro del chat, una
ilustración encima del titular, un contraste marginal en claro, una colisión de
avisos) más una desviación literal de un byte en un system prompt.

---

## 0. Cómo se verificó

| Suite | Qué cubre | Resultado |
|---|---|---|
| `typecheck` / `build` | `tsc -b` + `vite build` | ✅ 0 errores, build verde (458 kB / 147 kB gzip) |
| Diff de prompts | 15 prompts renderizados y comparados byte a byte contra el legacy evaluado | 14 ✅ · 1 ❌ (D-2) |
| `t1-charla` × 4 | turno completo → lápiz → stream → glosas → tooltip → guardar a DNA → correcciones → mute/play/repetir → Terminar → debrief. 390/320 × oscuro/claro | ✅ 0 fallos |
| `t2-escenas` × 4 | grid → obstáculo → sesión → misión → consejo → debrief → guardar. 390/320 × oscuro/claro | ✅ 0 fallos |
| `t3-errores` | 500, SSE cortado, gen fallida, debrief RP fallido, sesión corta, dibujo libre, ← con turno en vuelo | ✅ 0 fallos |
| `t4-motion` | fase 1 del stream, lápiz animando, morph 16/28 px, chip ES/EN, bombilla, reduced-motion | ✅ 0 fallos |
| `t5-trampas` | reintentos §8.1/8.2, texto plano §8.4, 401/PIN §8.8, glosas duplicadas §8.21, ⟦⟧ huérfanos §8.22 | ✅ 0 fallos reales |
| `t6-stress` | tokens de 110 caracteres en reply, glosa, corrección, título de escena y misión | ✅ sin overflow de página |
| `t7-visual` | recorte de texto, solapes geométricos | ❌ 3 hallazgos (D-1, D-3, D-5) |
| `t8-aa` | barrido AA sobre **todo** el texto visible de 7 pantallas × 2 temas | ❌ 1 hallazgo (D-4) |

Consola limpia (0 errores JS, 0 `pageerror`) en **todas** las corridas.
Sin desbordamiento horizontal de la **página** en ningún caso, ni a 320 px.

---

## 1. Defectos

### D-1 · MAYOR — Un token largo dentro de una glosa desborda el scroll del chat

**Archivo:** `src/components/rodeo/gloss-text.tsx:177-198`
(secundariamente `src/views/talk/bubbles.tsx:100`).

El chunk glosado se pinta como `<button class="inline …">`. Chrome **fuerza
`display: inline-block`** en `button` (medido: `display: "inline-block"` aunque la
clase pida `inline`), así que la glosa es una caja atómica que se dimensiona a su
`max-content`: `overflow-wrap: break-word` —que sí está heredado— no la parte.

Medición real a 320 px con un token de 110 caracteres dentro de un `⟦…||…⟧`:

```
glosa:  { display: "inline-block", overflowWrap: "break-word", width: 494 }
scroll: { overflowX: "auto", scrollWidth: 929, clientWidth: 280 }
burbuja del coach (texto plano, con break-words): right = 258  ✅
glosa:                                            right = 943  ❌
```

El `<html>` no gana scroll (el contenedor `overflow-y-auto` computa `overflow-x: auto`
y absorbe el desborde), pero **el área de chat sí scrollea en horizontal**, 3,3× su
ancho, y el texto queda fuera de pantalla. Es exactamente el síntoma que el brief
marca como defecto mayor a 320 px, solo que confinado al contenedor.

Segundo síntoma del mismo origen: la **tarjeta de corrección** (`bubbles.tsx:100`)
no lleva `break-words` (`overflowWrap: "normal"` medido), así que un `quote`/`fix`
largo —y `quote` es literalmente lo que Gus dictó o pegó— se sale de la tarjeta y
se recorta. Ver `shot-stress-charla-320.png`.

Repro: `reply` con `⟦Supercalifragilistico…https://ejemplo.com/una/ruta/larga?x=1||g⟧`
o una corrección cuyo `quote` sea una URL.

Nota: las burbujas de coach/narrador y las tarjetas de escena sí llevan
`break-words` y aguantan bien; el problema es solo la glosa y la corrección.

---

### D-2 · MENOR — `rpSystemPrompt` no es VERBATIM (escapes dobles)

**Archivo:** `src/views/talk/escenas-prompts.ts:90`

Único prompt de los 15 que no coincide byte a byte con el legacy. Comparación
programática (legacy evaluado vs módulo nuevo evaluado, mismos placeholders):

```
--- legacy (L7136)
  … e.g. Para no ceder de una: "That's a bit steep — what's your best price?". Empty string…
+++ nuevo (escenas-prompts.ts:90)
  … e.g. Para no ceder de una: \"That's a bit steep — what's your best price?\". Empty string…
```

El fichero contiene `\\"` donde el legacy contiene `\"`; dentro de un template
literal eso produce una barra invertida de más en el prompt que ve el modelo.
Los otros 14 (`talkSystemPrompt` con y sin `avoid`, apertura de CHARLA, bombilla,
debrief de CHARLA, `RP_OPENING`, generación de 3 escenas, sorpréndeme, debrief de
escena y los 5 `system` sueltos) salieron **idénticos**.

---

### D-3 · MENOR — La ilustración del héroe de ESCENAS se come el final del titular

**Archivo:** `src/views/talk/escenas.tsx:103-125`

La máscara/telón (`absolute -top-1 -right-0.5 -z-10`, 104 px) se solapa
geométricamente con el `<span>` de acento `HABLES.`:

```
ilustración [268,149,372,253]   ·   "HABLES." [182,209,327,248]   → solapa: true
```

Va detrás (`z-index: -10`), pero es lima sobre lima: en el recorte
`crop-hero-oscuro.png` la "S" final y el punto quedan fundidos con el contorno de
la máscara y el titular se lee como `HABLES` + un borrón. Pasa en **ambos temas** a
partir de 360 px (por debajo se oculta con `max-[359px]:hidden`).

El comentario del propio componente dice que se movió detrás "porque el trazo es
grueso y cruzaba la palabra" — el remedio no bastó: sigue cruzándola.
El héroe de CHARLA (`charla-empty.tsx:63-80`) también solapa `HOY?` pero solo roza
el ascendente y se lee perfecto: ahí no hay defecto.

---

### D-4 · MENOR — Contraste AA por debajo del umbral en tema CLARO: el `fix` de la corrección

**Archivos:** `src/views/talk/bubbles.tsx:108-110` · `src/styles/tokens.css:107,131`

Barrido AA sobre 7 pantallas × 2 temas. **Un solo** elemento falla, y solo en claro:

| Elemento | fg | bg | ratio | mínimo | dónde |
|---|---|---|---|---|---|
| `fix` de la corrección | `var(--accent)` → `rgb(59,117,0)` | `var(--danger-dim)` sobre el shell → `rgb(244,223,222)` | **4.41** | 4.5 | tarjeta de corrección en la sesión de CHARLA |

13,6 px con `font-weight: 700` **no** cuenta como texto grande (AA exige ≥ 18,66 px
en negrita), así que el umbral es 4.5. Falta un pelo: 4.41.

Todo lo demás pasa: burbujas 16.57 (oscuro) / 14.93 (claro), `why` 6.23 / 6.04,
título de sesión 14.73 / 5.40, tarjetas pastel peor caso 4.50 (oscuro) / 5.07 (claro),
tooltip, hojas de debrief y sesión de escena, limpios en ambos temas.

---

### D-5 · MENOR — El tip de primera vez choca con los toasts fuera de sesión

**Archivos:** `src/views/talk/first-tip.tsx:51` · `src/components/rodeo/toaster.tsx:59`

El tip vive en `bottom: calc(120px + safe-area)` con `z-990`; el toaster **fuera de
sesión** vive en `bottom: calc(96px + safe-area)` con `z-200`. Se solapan.

Reproducido de punta a punta: entras a una escena (dispara
`tipPrimeraVez('roleplay', …)`, el toast está arriba porque hay sesión), cierras con
Terminar y guardas a DNA → vuelves a la portada, el toaster salta abajo y el tip de
8 s sigue vivo:

```
tip [661,724]  ·  choques: [ "Voz del sistema — falló la voz Dee" → solapa,
                             "2 frases guardadas en tu DNA"       → solapa ]
```

El toast de confirmación queda medio tapado por el tip lavanda
(`shot-colision.png`, `shot-escenas-claro-390.png`). En el legacy no podía pasar:
el toast vivía siempre en `top: 18px`.

---

### D-6 · MENOR — `startRoleplay` no llama a `stopSpeaking()`

**Archivo:** `src/views/talk/rp-turn.ts:186-195`

La spec §1.8 paso 2 lo lista explícitamente (`legacy.html:7307`), y el port lo omite:
`abrirSesion()` (`src/stores/escenas.ts:130-143`) no corta la voz — solo lo hace
`cerrarSesion()`. Hoy es difícil de disparar (con sesión viva la tab bar se esconde,
así que rara vez hay audio sonando al abrir una escena), pero es una desviación real
de la spec y el día que STORY o la portada hablen, se oirá el solapamiento.

---

## 2. Lo que se verificó y está CORRECTO

### 2.1 Prompts (§2) — verbatim salvo D-2

Comparación programática, no visual: se evaluó el código del legacy con stubs y el
módulo nuevo con `jiti`, con los mismos placeholders, y se diffearon las cadenas
resultantes. `talkSystemPrompt` (4607 chars con `avoid`, 4529 sin), apertura de
CHARLA (695), bombilla (145), debrief de CHARLA (426), `RP_OPENING` (275),
generación (950), sorpréndeme (512), debrief de escena (478) e `IDEA_SYSTEM`,
`DEBRIEF_SYSTEM`, `GEN_SYSTEM`, `SORPRESA_SYSTEM`, `RP_DEBRIEF_SYSTEM`: **idénticos**.
`NOTA_STT_BILINGUE`, `dnaBrief()`, `interesesBriefTalk()` e `interesesLineaDrop()`
producen el mismo texto.

`SCENARIOS`, `SEED_*`, `ROMPEHIELOS_*`, `RP_CANONICO`, techos (3200/6000 y
2200/5000) y modos (`chat` para turnos y bombilla, `creative` para debriefs y
generación) verificados contra los `messages` que salen por la red.

### 2.2 localStorage (§5) — formas idénticas, sin claves inventadas

Claves escritas tras los recorridos completos:
`rodeo_cost, rodeo_dna, rodeo_nivel, rodeo_openers, rodeo_sessions, rodeo_streak,
rodeo_tema, rodeo_tips, rodeo_tts, rodeo_miclang_talk`. Ninguna nueva.

Forma campo a campo contra la spec §3.5 / §5.1 (verificado con `Object.keys().sort()`):

```jsonc
{"type":"error","quote":"I have 30 years","fix":"I'm 30","why":"…","ts":1785…}
{"type":"slang","term":"get up to","meaning":"…","example":"","ts":1785…}
{"type":"upgrade","b2":"It's good","fix":"It's got real legs","swap":"","why":"…","register":"","dominado":false,"ts":1785…}
```

- `rodeo_dna` newest-first, dedupe por `type|fix||term`, tope 300.
- `rodeo_openers`: `["…"]`, ≤140 chars, solo el turno de apertura, `slice(-8)`.
- `rodeo_tips`: `{"talk":1}` (y `roleplay` al entrar a escena).
- `rodeo_sessions`: +1 en **ambos** debriefs; `rodeo_streak` `{days,last}`
  **solo** en el de ESCENA — la asimetría de §8.18 se porta bien (comprobado que
  CHARLA deja `rodeo_streak` en `null`).
- `rodeo_tts` alterna `true/false` con el mute; `rodeo_miclang_talk` pasa a `"en"`
  con el chip.
- Debrief fallido **no** incrementa `rodeo_sessions`.

### 2.3 Flujos (§1)

- **CHARLA por chip:** system + apertura verbatim, lápiz mientras el modelo razona,
  fase 1 por `textContent` sin corchetes, fase 2 con glosas inline + array,
  correcciones después, guardado en DNA en el mismo bucle.
- **Dibujo libre:** **0 llamadas a la API**, `Hey Gus — ` con la minúscula aplicada
  según `/^[A-Z][a-z]/`, `assistant` sembrado, título "Dibujo libre".
- **Bombilla:** `chat`/400, prompt verbatim, burbuja `💡 podrías decir`, y
  **no entra a `session.messages`** (verificado en el historial del turno siguiente).
- **Terminar con < 3 turnos `user`:** cierra sin llamar al modelo (0 llamadas extra).
- **← con turno en vuelo:** la respuesta huérfana no se pinta, `busy` se libera y se
  puede abrir otra sesión.
- **ESCENAS:** portada con la canónica + 3 generadas, obstáculo visible en tarjeta y
  en la ficha de misión, consejo con las frases entre comillas en negrita,
  `#rp-replay` arranca deshabilitado, debrief con `GUARDAR 2 A MI DNA` →
  `type:'slang'` y vuelta a la portada.

### 2.4 Trampas (§8)

| Trampa | Comprobado |
|---|---|
| §8.2 CHARLA reintenta solo con vacío+`length` | 2 llamadas, la 2.ª con **6000** ✅ |
| §8.1/8.2 JSON sucio con `stop` NO se reintenta | **1** sola llamada ✅ |
| §8.2 ESCENAS parsea primero y reintenta con JSON truncado+`length` | 2 llamadas, la 2.ª con **5000** ✅ |
| §8.4 texto plano legítimo | se acepta como `reply` y entra al historial **crudo** ✅ |
| §8.8 401 → `prompt()` del PIN; cancelar → `Sin PIN no hay rodeo.` | ✅, y `rodeo_pass` no se escribe |
| §8.9 CHARLA muestra `err.message` crudo, ESCENAS pasa por `rpErrMsg` | ✅ (`Error: modelo caído` vs `…saturado…`) |
| §8.17 fallo del debrief: CHARLA se lleva la sesión, ESCENA **no** | ✅ hoja `NO SALIÓ EL CIERRE.` con REINTENTAR CIERRE / Salir sin análisis |
| §8.21 una aparición por glosa, solapes descartados, término inexistente ignorado | ✅ (2 spans exactos de 4 glosas) |
| §8.22 `⟦`/`⟧` huérfanos con remapeo de coords | ✅ — salida idéntica a la del `parseChunks` del legacy ejecutado sobre el mismo caso |
| SSE cortado a mitad | error del coach, burbuja a medias retirada, lápiz retirado, app viva ✅ |
| Generación bloqueada / fallida | skeletons + "cargar ya" + poller, y mensaje con "reintentar" que recupera ✅ |

### 2.5 Motion (§ snippets del dueño)

- **Snippet 1 (morph):** `AnimatePresence mode="popLayout" initial={false}`,
  `initial/animate/exit` con `scale 0.5→1→0.5` y **`spring(600, 25)`** literal en
  `pill-button.tsx:36-47`. Contenedor `relative` de **16 px** en la píldora y
  **28 px** en el mic héroe (medido en el DOM). El icono cambia de verdad al
  alternar el estado (`lucide-volume2` → `lucide-volume-x`).
- **Snippet 2 (píldora):** `height: 36px`, `border-radius: 40px` medidos; tokens
  `--pill-bg` / `--pill-bg-hover` / `--pill-border`; iconos `size-4`;
  `whileHover 1.02` / `whileTap 0.96`.
- **Snippet 3 (repetir):** `RefreshCw` en `motion.span` con
  `animate={{rotate: girado?180:0}}` y **`spring(400, 25)`**; comprobado el paso de
  `none` → `matrix(-1, 0, 0, -1, 0, 0)` al tocar.
- **Snippet 4 (lápiz):** `PencilLoader` con su `pencil.css`; animación viva
  (`animationName: rdPencilStroke`) durante la espera; `clipPath` con id único por
  instancia.
- **Snippet 5 (TextAnimate):** en el subtítulo del héroe de CHARLA, verbatim del
  registry.
- **Reduced motion:** `MotionConfig reducedMotion="user"` en `App.tsx:54` +
  `@media (prefers-reduced-motion: reduce)` en `pencil.css:164`. Con
  `reducedMotion: 'reduce'` la app monta, el flujo funciona y las burbujas quedan
  con `transform: none`.
- **Mic:** en headless no hay micrófono, así que **no** se pudo verificar una toma
  real. Sí se verificó: instancia perezosa, `soportaSTT()`, el chip ES/EN
  (`aria-label`/`title` con los textos exactos de la spec, escritura de
  `rodeo_miclang_talk`), tamaño 72 px, `aria-pressed`, y que el mismo `IconMorph`
  que usa el mic cambia de icono al cambiar su `on` (probado en la píldora de voz,
  que es el mismo componente).

### 2.6 Otros

- **Overflow horizontal de página:** 0 en las 8 combinaciones tema × ancho, incluido
  el test de estrés con títulos de escena, misión, reply, glosa y corrección de 110
  caracteres. El tooltip se mantiene dentro del viewport a 320 px
  (`x: 16.4, width: 287`).
- **Tooltip de glosa (§3.4):** hover sin pin, clic fija, botón `＋ guardar a DNA` →
  `✓ en tu DNA` + `disabled` + toast, y **no se cierra al guardar** (verificado).
- **Consola:** 0 errores en todas las corridas (se ignoran los de `fonts.googleapis`,
  bloqueado en el sandbox).

---

## 3. Desviaciones documentadas — decisión del dueño, no defectos de ejecución

Las anoto porque un verificador no debería dejarlas pasar en silencio, pero todas
están explicadas por escrito en el código y son coherentes con el brief.

1. **No hay máquina de escribir en CHARLA** (`use-coach-turn.ts:49-54`). La spec §3.2
   la describe con valores exactos (`TW_MAX_CHARS = 120`, `rd-char .4s
   cubic-bezier(.2,1.4,.4,1)`, `--i * 0.018s`, duración `400 + visibles*18`) y §1.4
   paso 11 hace caer las correcciones **en su callback**. El port sustituye ambas por
   "stream = fase 1, swap atómico = fase 2". El efecto buscado (revelado progresivo)
   se conserva **mientras haya stream**; en la ruta de respaldo (`callStream` falla →
   `callAPI`) la respuesta aparece de golpe, cosa que en el legacy no pasaba.
2. **Ticker de coste en la barra de sesión** (`charla-session.tsx:154`,
   `escenas-session.tsx:165`). El legacy ya no pintaba `#cost-ticker` (§6.6). Es UI
   nueva.
3. **Subtítulo del héroe personalizado** (`charla-empty.tsx:55-57`): el legacy tenía
   la línea fija `Elige tema, habla — te corrijo sin cortarte el flow.`
4. **`#rp-again` cableado a repetir** (§8.34, decisión (a) documentada) y
   **carta canónica → `startRoleplay`** (§8.33, decisión (a) documentada).
   **Rétame no se pinta** (§8.32).
5. **`ses.messages` se muta sobre la sesión capturada**, no sobre `state.session`
   releído (`use-coach-turn.ts:41-47`): corrige una corrupción invisible del legacy.
   Lo visible es idéntico.
6. **`sendTurn` libera `busy` en el `finally` sin comprobar identidad** — es el
   comportamiento **literal** del legacy (`state.busy = false` incondicional), con su
   misma condición de carrera si sales y entras a otra charla mientras vuela un
   turno. ESCENAS sí usa identidad, como manda §8.12. Port fiel: no lo cuento como
   defecto.

---

## 4. Lo que NO se pudo verificar

- **Micrófono real:** headless no expone `SpeechRecognition` con audio. No se
  probaron `onresult`/`onend`/`onerror` reales, ni el autostop por silencio, ni el
  envío automático al soltar la toma. Solo la UI y el cableado.
- **TTS real:** `/api/tts` no existe en `vite preview`; todas las corridas cayeron a
  la voz del sistema con su toast "una vez por carga", que sí se observó. No se
  verificó Deepgram, `decodeAudioData`, ni la invalidación por `speakToken` con audio
  de verdad.
- **`premiumGate`:** `js/premium.js` no está portado; la llamada guardada deja pasar
  siempre. No se probó el límite diario ni `rodeo_premium_uso`.
- **Sincronización Supabase** (`sbOnLocalChange`) — fuera de alcance de esta ronda.
- **Backend real:** todo con `page.route` mockeado; no se validó contra `api/chat.js`.

---

## 5. Artefactos

Suites y capturas en
`/tmp/claude-0/-home-user-rodeo/d08433b5-f027-560a-bfef-45bdcf385510/scratchpad/`:
`harness.mjs`, `t1-charla.mjs` … `t8-aa.mjs`, `legacy-probe.mjs`, `probe.mjs`,
`legacy-gloss.mjs`, y las capturas `shot-*.png`, `crop-hero-*.png`, `shot-colision.png`.
