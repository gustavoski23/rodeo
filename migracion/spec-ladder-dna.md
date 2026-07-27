# SPEC · Vistas LADDER (SUBE) y DNA — port 1:1 desde `public/legacy.html`

> Cartografía completa. Todas las referencias `L####` son líneas de
> `/home/user/rodeo/public/legacy.html` (7.667 líneas).
> La lógica se porta **literal**: no se "mejora", no se reordena, no se
> renombran claves ni se retocan prompts. Solo se rediseña el chrome (tokens +
> componentes nuevos).
>
> **Ya portado — ÚSALO, no reimplementes:**
> `src/lib/api.ts` (`callAPI`, `callJSON`, `parseJSON`) ·
> `src/lib/storage.ts` (`store.get/set`) ·
> `src/lib/dna.ts` (`saveDNA`, `recordUpgrade`, `getDNA`, `onDnaChange`,
> `dnaTieneSlang`, tipos `DnaItem`/`DnaError`/`DnaSlang`/`DnaUpgrade`) ·
> `src/lib/speech.ts` (`crearReconocedor(ctx)`, `micLangCode`, `NOTA_STT_BILINGUE`,
> `useMicLang`, `speak`, `stopSpeak`) · `src/stores/toast.ts` (`toast`) ·
> `src/components/rodeo/{pill-button,mic-button,pencil-loader}.tsx` ·
> `src/components/magicui/text-animate.tsx` · `src/views/talk/sheet.tsx` (patrón
> de hoja modal — **no editar**, replicar el patrón dentro de `src/views/ladder/`
> si hace falta un sheet propio).
>
> **NO existe todavía (hay que crearlo en `src/stores/ladder.ts`):** el estado de
> racha (`rodeo_streak`), `rodeo_stories`, `rodeo_ladder_xp`, `rodeo_seen_ladder`,
> `updateStreak()` y el pool/índice del run.
>
> **Fuera de alcance:** RÉTAME (`#retame-btn-dna`, `js/cards-mode.js`) es isla
> externa; el botón existe en el markup de DNA pero su lógica vive en
> `public/js/*` (prohibido tocar). Ver §9.

---

## 0. Mapa de anclas

| Símbolo | Línea | Qué es |
|---|---|---|
| Markup `#view-ladder` | L2751-2796 | Vista SUBE completa |
| Markup `#view-dna` | L2798-2842 | Vista DNA completa |
| `state` (campos de ladder/dna) | L3006-3043 | `dna`, `stories`, `ladderXP`, `seenLadder`, `streak`, `ladderPool`, `ladderIdx`, `combo` |
| `NOTA_STT_BILINGUE` | L3004 | Se inyecta en el system del **juez** |
| `toast(msg, ms=2600)` | L3208 | Aviso efímero |
| `esc` / `escAttr` | L3246 / L3253 | Escapado (en React sobra: usar texto plano) |
| `anim(el, cls)` | L3454 | Relanza una animación CSS (`rd-in`, `rd-pop`) |
| `animateIn(els)` | L3461 | Cascada de entrada al cambiar de vista |
| `callJSON(mode, msgs, maxTokens)` | L3610 | Ya portado |
| `switchView` | L3641-3670 | `if (v==='dna') renderDNA(); if (v==='ladder') renderLadder();` |
| `CARD_THEMES` | L4721-4727 | 5 temas de tarjeta, ciclados por índice |
| `saveDNA(item)` | L4914-4921 | Ya portado |
| `recordUpgrade({...})` | L4925-4938 | Ya portado |
| `renderDNA()` | L4940-4998 | Stats + lista completa |
| Handler `#quiz-btn` | L5000-5029 | Genera el quiz (prompt VERBATIM en §6.2) |
| `runQuiz(quiz)` | L5031-5085 | Bucle de preguntas + autoevaluación |
| `openSheet/closeSheet` | L5087-5119 | Hoja modal (resumen de veta) |
| `openPerfil()` | L5124-5160 | Entradas a DNA y SUBE desde el perfil |
| `wireMic(btn, input, onFinal, ctx)` | L6328-6366 | Mic genérico; SUBE usa `ctx='ladder'` |
| `LADDER_EXAMPLE` | L6782 | Ejemplo relleno del prompt generador |
| `updateStreak()` | L6784-6792 | Racha diaria |
| `window.rodeoStoryProgress` | L6797-6801 | Sube `rodeo_stories` + racha (lo llama story-mode.js) |
| `window.rodeoCardsBridge` | L6841-6848 | Puente de RÉTAME (usa `saveDNA`, `updateStreak`, `getDNA`) |
| `updateBar()` | L6850-6853 | Pinta barra + racha |
| `renderLadder()` | L6855-6860 | Entrada a la vista |
| Listeners de vetas / frase propia | L6862-6866 | |
| `ladderOwnPhrase()` | L6868-6873 | |
| `startVeta(veta, ownPhrase)` | L6875-6928 | Generación del lote |
| `showRung()` | L6931-6949 | Cara frontal (B2) |
| `openRungInput(r, theme, rot)` | L6951-6972 | Zona de intento (mic + teclado) |
| `revealRung(r, theme, rot, attempt)` | L6974-6991 | Llamada al **juez** |
| `flipToBack(...)` | L6993-7029 | Cara trasera (C1 + swap + veredicto) |
| `selfJudge(r, nailed)` | L7031-7057 | Autoevaluación → XP/combo/DNA |
| `ladderSummary()` | L7059-7074 | Hoja "VETA HECHA" |
| CSS `.flip-card/.flip-inner/.flip-face/.flip-back` | L901-925 | Contrato 3D (ver trampa §9.4) |
| CSS `.swap-old/.swap-new` | L929-940 | Tintas del swap |
| CSS `.vchip` | L950-955 | Chip de veredicto |
| CSS `.stat-num` | L956-963 | Números grandes de stats |
| CSS `.dna-item` | L964-971 | Fila de la lista DNA |
| CSS `.skeleton` | L995-1000 | Loader del lote |
| CSS `.rd-ladder-*` / `.rd-streak` | L1176-1187 | Barra B2→C1 |
| CSS `.rd-stats` / `.rd-stat-label` | L1168-1174 | Stats DNA |
| CSS `.rd-ill--dna-hero` | L1166 | Slot de la hélice |
| CSS `.slang-card` + `.term` + `.label-mini` | L760-793 | Tarjeta pastel del peldaño |
| CSS `.chip` | L627-644 | Pills de veta |
| Keyframes `rd-in` / `rd-pop` | L1504-1514 | Animaciones de entrada |

---

## 1. Estado y claves de `localStorage` (contrato EXACTO)

Extracto de `state` (L3016-3029):

```js
dna:        store.get('rodeo_dna', []),                                  // [{type:'error'|'slang'|'upgrade', ..., ts}]
stories:    store.get('rodeo_stories', 0),                               // number
ladderXP:   store.get('rodeo_ladder_xp', { pct: 0, clavados: 0, bestCombo: 0 }),
seenLadder: store.get('rodeo_seen_ladder', []),                          // string[] de b2 vistos
streak:     store.get('rodeo_streak', { days: 0, last: '' }),            // last = 'YYYY-MM-DD'
ladderPool: [],   // NO persiste — lote en memoria
ladderIdx:  0,    // NO persiste
combo:      0,    // NO persiste
```

Y en memoria (no declarado en `state`, se crea al vuelo en `startVeta` L6879):
`state.ladderRunClavados` — clavados **de este run**, se resetea a 0 en cada veta.

### 1.1 Shapes con ejemplo

**`rodeo_ladder_xp`**
```json
{ "pct": 42, "clavados": 17, "bestCombo": 5 }
```
- `pct`: 0-97 (**tope duro 97**, nunca 100 — L7039 `Math.min(97, pct + 3)`).
- `clavados`: acumulado histórico, +1 por cada "LA CLAVÉ ✓".
- `bestCombo`: máximo histórico de racha de clavados dentro de un run.

**`rodeo_seen_ladder`** — array plano de las frases `b2` ya generadas:
```json
["I think it's good.", "The meeting was very long.", "..."]
```
- Se **empuja** cada `b2` válido del lote nuevo (L6918).
- Se **persiste truncado a los últimos 200** (`slice(-200)`, L6919) — pero
  `state.seenLadder` en memoria NO se trunca (crece toda la sesión). Portar tal cual.
- Al construir el prompt se usan los **últimos 60** unidos por `' | '`, o el
  literal `'ninguna'` si está vacío (L6903).

**`rodeo_streak`**
```json
{ "days": 7, "last": "2026-07-27" }
```

**`rodeo_dna`** (array newest-first, tope 300). Los tres tipos:
```json
{"type":"error","quote":"I don't have nothing","fix":"I have nothing","why":"doble negación","ts":1750000000000}
{"type":"slang","term":"cover your tracks","meaning":"borrar pruebas","example":"He knew how to cover his tracks.","ts":1750000000000}
{"type":"upgrade","b2":"I think it's good.","fix":"I'm sold on it — it's got real legs.","swap":"it's good→it's got real legs","why":"'has real legs' = tiene futuro real","register":"pro","dominado":true,"ts":1750000000000}
```
> Ojo: en el upgrade el C1 vive en **`fix`** (no en `c1`) y la nota en **`why`**
> (no en `note_es`). El renombre ocurre dentro de `recordUpgrade`.

**`rodeo_stories`** — entero. Lo escribe story-mode, DNA solo lo **lee** para
`#stat-stories`.

### 1.2 `updateStreak()` — L6784-6792 (VERBATIM de lógica)

```js
const today = new Date().toISOString().slice(0, 10);
const s = state.streak;
if (s.last === today) return;                        // ya contada hoy
const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
s.days = (s.last === yest) ? (s.days + 1) : 1;       // consecutivo o reinicio a 1
s.last = today;
store.set('rodeo_streak', s);
```
- Fechas en **UTC** (`toISOString`), no local. No cambiar: cambiaría el día de corte.
- Se llama desde: `renderLadder()` (L6856 — **entrar a SUBE ya cuenta racha**),
  `window.rodeoStoryProgress` (L6800) y `rodeoCardsBridge.updateStreak` (L6845).
  TALK **no** la llama en charla normal (solo el debrief de ESCENA).

---

## 2. Markup de LADDER (`#view-ladder`, L2751-2796)

```
#view-ladder .view
└─ #ladder-home .scroll-area.flex.flex-col.gap-5  (flex:1)
   ├─ .rd-hero.rd-hero--ladder
   │   ├─ p.rd-eyebrow.rd-eyebrow--accent  → <span.rd-eyebrow-rule/>“Sube · B2 → C1”
   │   ├─ p.font-display.rd-hero-title      → “SUBE TU⏎INGLÉS” + “.” en var(--accent)
   │   └─ p.rd-hero-sub                     → “Di lo mismo, pero como un C1.”
   ├─ .rd-ladder-progress
   │   ├─ .rd-ladder-ends.flex.justify-between.items-center
   │   │   ├─ span.rd-ladder-end  [svg olla fría 15×15] “B2”
   │   │   ├─ span#ladder-streak.rd-streak  → “racha 0”
   │   │   └─ span.rd-ladder-end  [svg llama 15×15] “C1”
   │   └─ .meter-track.rd-ladder-track > #ladder-bar.meter-fill (width:0%, bg var(--accent))
   ├─ .rd-veta-row.flex.flex-wrap.gap-2.5.mt-1
   │   ├─ button.chip[data-veta="trabajo"] → 💼 TRABAJO
   │   ├─ button.chip[data-veta="calle"]   → 🛹 CALLE
   │   └─ button.chip[data-veta="fallos"]  → 🎯 MIS FALLOS
   ├─ .rd-input-dock.flex.gap-2
   │   ├─ input#ladder-own[type=text] placeholder “o sube esta frase tuya...”
   │   │    aria-label “Frase propia para subir de nivel”, autocomplete off
   │   └─ button#ladder-own-btn.icon-btn aria-label “Subir esta frase”
   │        (fondo var(--accent), color var(--accent-ink), borde transparente, flecha ↑ 18px)
   └─ #ladder-runarea.pb-6      ← toda la zona del peldaño, la llena JS
```

Los emojis van en `<span class="rd-chip-emoji" aria-hidden="true">`.
Los dos SVG de anclas son `aria-hidden`, stroke 1.6, viewBox 24.

## 3. Markup de DNA (`#view-dna`, L2798-2842)

```
#view-dna .view
└─ #dna-scroll .scroll-area.flex.flex-col.gap-6 (flex:1; min-height:0)
   ├─ .rd-hero.rd-hero--dna
   │   ├─ p.rd-eyebrow.rd-eyebrow--accent → “DNA · tu cerebro de errores”
   │   ├─ .rd-ill.rd-ill--dna-hero  [SVG hélice line-art, aria-hidden]
   │   └─ .rd-stats.flex.flex-wrap.items-end.gap-x-7.gap-y-4.pt-1
   │       ├─ .rd-stat  #stat-errors  .stat-num   + “Errores cazados”
   │       ├─ .rd-stat  #stat-slang   (color var(--accent))     + “Slang guardado”
   │       ├─ .rd-stat  #stat-upgrades(color var(--card-yellow))+ “Upgrades clavados”
   │       └─ .rd-stat  #stat-stories .stat-num   + “Episodios”
   ├─ p.rd-hero-sub (max-width 320px) → “Lo que fallas vuelve aquí hasta que lo domines.”
   ├─ .flex.gap-3
   │   ├─ button#quiz-btn.btn-accent  → “REPASO RÁPIDO”
   │   └─ button#retame-btn-dna.btn-ghost → “RÉTAME 🃏”   (isla externa, §9)
   ├─ #quiz-area.hidden.flex-col.gap-3       ← lo llena runQuiz
   ├─ p.rd-eyebrow.rd-eyebrow--muted → “Todo lo que tocaste”
   └─ #dna-list.flex.flex-col.gap-2.5.pb-6   ← lo llena renderDNA
```

Los labels usan `.rd-stat-label` (mono, 0.58rem, tracking 0.14em, uppercase).

---

## 4. Flujo LADDER

### 4.0 Entrada a la vista — `renderLadder()` L6855-6860
```js
updateStreak();                       // ⚠ abrir SUBE cuenta racha del día
updateBar();
$('#ladder-runarea').innerHTML = '';  // el run se descarta al reentrar
state.combo = 0;
```
`updateBar()` (L6850): barra `width = ladderXP.pct + '%'`; texto de racha
`'racha ' + streak.days + (streak.days ? ' 🔥' : '')` — el emoji SOLO si days > 0.

### 4.1 Disparadores
- Chips de veta (L6862-6864): `startVeta(chip.dataset.veta)`.
- `#ladder-own-btn` click y `#ladder-own` Enter (L6865-6866) → `ladderOwnPhrase()`:
  trim del valor; si vacío **no hace nada**; limpia el input; `startVeta('own', v)`.

### 4.2 `startVeta(veta, ownPhrase)` — L6875-6928
1. `if (state.busy) return;` (guard global de la app).
2. `state.combo = 0; state.ladderRunClavados = 0;`
3. **Rama `fallos`** (sin API):
   ```js
   const pool = state.dna.filter((d) => d.type === 'upgrade' && !d.dominado)
     .map((d) => ({ b2: d.b2 || '', context_en: 'de tu conversación en TALK',
                    c1: d.fix, swap: d.swap || '', register: d.register || '',
                    note_es: d.why || '' }))
     .filter((r) => r.b2 && r.c1);
   ```
   - Si `pool` vacío → pinta en `#ladder-runarea` una `.dna-item` (borde
     `oklch(87% 0.21 128 / 0.3)`) con:
     - título: **“Aquí caen las frases que TÚ dijiste en TALK, subidas a C1.”**
     - sub: **“Ve a hablar y termina con debrief para llenar esta veta.”**
     - botón `.btn-accent` **“IR A TALK”** → navega a TALK (en el viejo,
       `document.querySelector('.tab-item[data-view="talk"]').click()`; en React:
       `useApp.getState().setView('talk')`).
     y **retorna** (no toca `state.busy`).
   - Si hay pool: `sort(() => Math.random() - 0.5)` (baraja sucia — conservar),
     `ladderIdx = 0`, `showRung()`.
4. **Ramas `trabajo` / `calle` / `own`** (con API):
   - `state.busy = true`; `#ladder-runarea.innerHTML = '<div class="skeleton"></div>'`
     (en React: `PencilLoader` o un bloque con la geometría de `.skeleton`:
     radio 26px, alto 210px, shimmer 1.4s).
   - `avoid = state.seenLadder.slice(-60).join(' | ') || 'ninguna'`.
   - `target` según veta (§5.1).
   - `callJSON('creative', [...], 3800)`.
   - **Filtro de validez** (L6913-6916):
     ```js
     const EX_B2 = ["i think it's good.", 'the meeting was very long.', "that's a big problem."];
     const valid = (Array.isArray(rungs) ? rungs : []).filter((r) =>
       r && r.b2 && r.c1 && String(r.b2).trim() !== String(r.c1).trim() &&
       !EX_B2.includes(String(r.b2).toLowerCase().trim()));
     if (!valid.length) throw new Error('Respuesta inválida, dale otra vez');
     ```
     (rechaza el eco literal del ejemplo del prompt y los peldaños que no suben).
   - `valid.forEach((r) => state.seenLadder.push(r.b2));`
     `store.set('rodeo_seen_ladder', state.seenLadder.slice(-200));`
   - `ladderPool = valid; ladderIdx = 0; showRung();`
   - `catch`: `#ladder-runarea` se vacía + `toast('Error: ' + err.message)`.
   - `finally`: `state.busy = false`.

### 4.3 `showRung()` — L6931-6949 (cara frontal)
- Si `ladderIdx >= ladderPool.length` → `ladderSummary()` y sale.
- `rots = [-1.2, 0.8, -0.6, 1.1, -0.9]`; `rot = rots[idx % 5]`.
- `theme = CARD_THEMES[idx % 5]` (§8.1).
- Encabezado (mono, 0.62rem, tracking 0.16em, uppercase, `--text-muted`):
  **`Peldaño ${idx+1} / ${pool.length}`** + si `combo > 1`, sufijo
  **` · combo x${combo}`**.
- Tarjeta: `.flip-card > #rung-card.slang-card.${theme.text}` con
  `background:${theme.bg}; transform: rotate(${rot}deg)`.
  - `<span class="label-mini">B2 · ${context_en}</span>`
  - `<div class="term">${b2}</div>`
  - `<button id="rung-up" class="btn-accent" style="margin-top:18px">SÚBELA ↑</button>`
- `anim(card, 'rd-in')` (entrada 0.9s, translateY 24px).
- Click en `#rung-up` → `openRungInput(r, theme, rot)`.

### 4.4 `openRungInput` — L6951-6972 (intento del usuario)
Reemplaza el botón `#rung-up` (`replaceWith`) por una zona `margin-top:16px`:
- Fila `.flex.gap-2`:
  - `#rung-mic.icon-btn` 44×44, aria-label **“Dictar tu versión”**, SVG de micro.
  - `#rung-input[type=text]` placeholder **“tu versión C1...”**,
    aria-label **“Tu versión C1”**, `border-radius:100px`, autocomplete off.
  - `#rung-send.icon-btn` 44×44, aria-label **“Enviar”**, fondo `var(--accent)`,
    color `var(--accent-ink)`, icono avión de papel.
- Debajo: `#rung-skip.btn-ghost` ancho completo, 0.78rem, borde `--borde-medio`,
  texto **“muéstrame la respuesta”**.
- `$('#rung-input').focus()` inmediato.
- Handlers: `#rung-send` click y `Enter` en el input → `revealRung(r, theme, rot, value.trim())`.
  `#rung-skip` → `revealRung(r, theme, rot, '')` (**cadena vacía = sin juez**).
- Mic: `wireMic($('#rung-mic'), $('#rung-input'), (t) => revealRung(r, theme, rot, t), 'ladder')`.
  - Contexto `'ladder'` → idioma por defecto **`'en'`** (L2958 `ladder: 'en'`), chip ES/EN
    disponible. En React: `crearReconocedor('ladder', onResult, onEnd)` +
    `MicLangChip ctx="ladder"`. El final del dictado **envía solo** (autostop por silencio):
    el `onEnd` limpia el input y dispara `revealRung` con el texto.

### 4.5 `revealRung(r, theme, rot, attempt)` — L6974-6991 (el juez)
```js
if (state.busy) return;
let judge = null;
if (attempt) {                      // sin intento NO se llama al modelo
  state.busy = true;
  card.style.opacity = '0.6';       // única señal de espera
  try { judge = (await callJSON('chat', [...], 1500)).parsed; }
  catch { /* si el juez falla, seguimos sin él */ }
  state.busy = false;
}
flipToBack(r, theme, rot, attempt, judge);
```
> El fallo del juez es **silencioso**: se voltea la carta igual, sin vchip ni
> one-liner. No mostrar toast de error aquí.

### 4.6 `flipToBack` — L6993-7029 (cara trasera)
- **Parseo del swap**:
  ```js
  const [oldW, newW] = String(r.swap || '').split(/\s*(?:→|->|=>|➔|»)\s*/).map((x) => (x||'').trim());
  ```
  Solo se pinta si **ambos** existen:
  `<span class="swap-old">old</span> → <span class="swap-new">new</span>`
  (contenedor `font-size:1rem; margin:10px 0`). Tokens: `text-swap-old` /
  `text-swap-new` (`.swap-old` lleva line-through 1.5px + weight 600;
  `.swap-new` weight 700).
- **vchip por veredicto** (mapa exacto, L6998-7002):

  | verdict | texto | background | color |
  |---|---|---|---|
  | `nailed` | **CLAVADO** | `oklch(87% 0.21 128 / 0.3)` | `var(--swap-new)` |
  | `close` | **CASI** | `oklch(85% 0.16 95 / 0.4)` | `oklch(38% 0.11 92)` |
  | `off` | **BÁSICO** | `oklch(66% 0.20 27 / 0.28)` | `oklch(34% 0.20 27)` |

  Cualquier otro valor → cadena vacía (sin chip).
- Cara trasera: `#rung-card.slang-card.${theme.text}` con
  `transform: rotate(${-rot}deg)` (**rotación invertida** — es lo que vende el giro).
  - `label-mini`: `C1` + (si hay `register`) ` · ${register}`.
  - `.term` con `font-size: clamp(2rem, 8.5vw, 3rem)` (más chica que la frontal).
  - swap → nota `note_es` en `font-size:0.9rem; color:var(--card-ink-soft)`.
  - Si hubo `attempt`: bloque con `border-top:1px dashed currentColor; margin-top:12px; padding-top:10px`:
    - `tú escribiste: "${attempt}"` (0.78rem, `--card-ink-soft`)
    - vchip (si hay)
    - `judge.one_liner_es` (0.82rem)
- Debajo de la tarjeta, `.flex.gap-2` con `margin-top:14px`:
  - `#rung-nailed.btn-accent` flex:1, min-height 48, 0.85rem → **“LA CLAVÉ ✓”**
  - `#rung-casi.btn-ghost` min-height 48, borde y color `var(--texto-mal)` → **“CASI”**
- `anim(card, 'rd-pop')` (0.45s, scale 0.88 → 1, easing back).
- **Nota del autor (L7021-7023)**: se pinta la cara trasera de INMEDIATO,
  nunca desde un `onComplete`; en pestañas de fondo el rAF se estrangula. En React
  con motion: la respuesta debe estar en el DOM aunque la animación no corra.

### 4.7 `selfJudge(r, nailed)` — L7031-7057 (autoevaluación · el corazón del XP)
```js
const nb = $('#rung-nailed');
if (!nb || nb.disabled) return;               // guard anti doble-tap
nb.disabled = true; $('#rung-casi').disabled = true;
recordUpgrade({ b2: r.b2, c1: r.c1, swap: r.swap, note: r.note_es,
                register: r.register, dominado: nailed });
if (nailed) {
  state.combo += 1;
  state.ladderRunClavados = (state.ladderRunClavados || 0) + 1;
  state.ladderXP.pct = Math.min(97, state.ladderXP.pct + 3);   // +3 %, tope 97
  state.ladderXP.clavados += 1;
  if (state.combo > state.ladderXP.bestCombo) state.ladderXP.bestCombo = state.combo;
  store.set('rodeo_ladder_xp', state.ladderXP);
  updateBar();
  if (state.combo >= 2) toast('combo x' + state.combo + ' 🔥', 1500);
} else {
  state.combo = 0;
}
```
Luego añade a `#ladder-runarea` un bloque `margin-top:14px` con
`#rung-next.btn-accent` ancho completo cuyo texto es
**`TERMINAR`** si `ladderIdx + 1 >= ladderPool.length`, si no **`SIGUIENTE ↑`**.
Click → `state.ladderIdx += 1; showRung();`
Opacidades tras elegir: el elegido a `1`, el otro a `0.4`.

> ⚠ `recordUpgrade` se llama **siempre**, clavado o no. Un "CASI" mete el
> upgrade en el DNA con `dominado:false` → vuelve en MIS FALLOS. Un "LA CLAVÉ"
> lo mete con `dominado:true` → **sale** de MIS FALLOS y suma a
> `#stat-upgrades`. `dominado` es pegajoso (nunca vuelve a false).
> ⚠ La veta `fallos` también llama a `recordUpgrade`: como el par (fix, b2) ya
> existe, solo actualiza `dominado` — no duplica.

### 4.8 `ladderSummary()` — L7059-7074 (celebración)
`openSheet(...)` con:
- Titular `.font-display` 2.4rem, line-height 0.95: **“VETA HECHA”** + `.` en `var(--accent)`.
- Fila `.flex.items-end.gap-8` (margin 16px 0) con tres `.stat-num` + label
  (0.6rem, tracking 0.14em, uppercase, `--text-muted`):
  | valor | label | color del número |
  |---|---|---|
  | `state.ladderRunClavados \|\| 0` | Clavados | `var(--accent)` |
  | `state.ladderXP.bestCombo` | Mejor combo | por defecto |
  | `` `${state.ladderXP.pct}%` `` | Hacia C1 | `var(--card-yellow)` |
- Párrafo 0.9rem, `--text-secondary`, line-height 1.6:
  **“Lo que fallaste ya está en tu DNA y vuelve en el REPASO. Lo que clavaste sale de "Mis fallos".”**
- Botón centrado `.btn-accent` min-height 48, padding 13px 32px: **“LISTO”** →
  cierra la hoja **y vacía `#ladder-runarea`**.

---

## 5. Prompts de LADDER (VERBATIM)

### 5.1 Generador de peldaños — `startVeta` L6905-6910

`system` (una sola línea):
```
You upgrade B2 English to precise, natural, idiomatic C1 for Gus (Venezuelan in Medellín, aiming C1 for crypto/tech and daily life). Never thesaurus-dumping, never textbook. The C1 must be genuinely more precise/idiomatic, NOT just longer. STRICT JSON only.
```

`target` según la veta:
- `own`:
  ```
  Genera 3 versiones-peldaño C1 de ESTA frase de Gus: "${ownPhrase}".
  ```
- `trabajo`:
  ```
  Genera exactamente 5 peldaños de registro para la veta TRABAJO (reuniones, negociación, cripto/tech).
  ```
- `calle`:
  ```
  Genera exactamente 5 peldaños de registro para la veta CALLE (vida diaria, casual, social).
  ```
  (una sola plantilla: `` `Genera exactamente 5 peldaños de registro para la veta ${veta === 'trabajo' ? 'TRABAJO (reuniones, negociación, cripto/tech)' : 'CALLE (vida diaria, casual, social)'}.` ``)

`user` (plantilla exacta, `\n` reales):
```
${target}
Ya vistos, NO repitas: ${avoid}.
Return a STRICT JSON array. Each object keys: b2, context_en, c1, swap ("old→new"), register ("casual"|"neutral"|"pro"), note_es (español, una línea).
Include this FILLED EXAMPLE — NEVER reuse its content, generate fresh:
${LADDER_EXAMPLE}
```

`LADDER_EXAMPLE` (L6782) es un **string JSON** ya serializado (se interpola crudo):
```json
[{"b2":"I think it's good.","context_en":"giving your take on a proposal in a meeting","c1":"I'm sold on it — it's got real legs.","swap":"it's good→it's got real legs","register":"pro","note_es":"'has real legs' = tiene futuro real; suena a alguien que decide, no que opina."},{"b2":"The meeting was very long.","context_en":"venting to a coworker afterward","c1":"That meeting really dragged on.","swap":"was very long→dragged on","register":"casual","note_es":"'drag on' es el phrasal natural para algo que se hace eterno."},{"b2":"That's a big problem.","context_en":"flagging a risk to your team","c1":"That's a real sticking point.","swap":"big problem→sticking point","register":"neutral","note_es":"'sticking point' = el punto donde todo se traba."}]
```
Llamada: `callJSON('creative', msgs, 3800)`.

**Shape de respuesta esperado** (`Rung`):
```ts
type Rung = { b2: string; context_en: string; c1: string; swap: string;
              register: 'casual'|'neutral'|'pro'|string; note_es: string };
```

### 5.2 Juez del intento — `revealRung` L6980-6983

`system` (concatenación literal, con la nota bilingüe pegada al final tras un espacio):
```
You judge whether a B2 learner reached C1 with their upgrade attempt. Accept valid synonyms — there is no single right answer. STRICT JSON only. ${NOTA_STT_BILINGUE}
```
`NOTA_STT_BILINGUE` (L3004) ya está exportada en `src/lib/speech.ts`.

`user` (todo en una línea):
```
B2: "${r.b2}". Ideal C1: "${r.c1}". Gus wrote: "${attempt}". Return STRICT JSON {"verdict":"nailed|close|off","one_liner_es":"","better":""}. Example: {"verdict":"close","one_liner_es":"Subiste el registro, pero 'has potential' suena a informe; 'has real legs' es más natural.","better":"I'm sold on it — it's got real legs."}
```
Llamada: `callJSON('chat', msgs, 1500)`.

**Shape**: `{ verdict: 'nailed'|'close'|'off'; one_liner_es: string; better: string }`.
> `better` se pide pero **NUNCA se usa en la UI**. Portar el prompt igual
> (cambiarlo cambia la respuesta), pero no inventar un render para ese campo.

---

## 6. Flujo DNA

### 6.1 `renderDNA()` — L4940-4998
**Stats** (conteos sobre `state.dna` completo):
- `#stat-errors` = `dna.filter(d => d.type === 'error').length`
- `#stat-slang` = `dna.filter(d => d.type === 'slang').length`
- `#stat-upgrades` = `dna.filter(d => d.type === 'upgrade' && d.dominado).length`
  (**solo los dominados**)
- `#stat-stories` = `state.stories` (`rodeo_stories`)

**Lista** (`#dna-list`):
- Vacío → `<p>` con `--text-muted`, 0.88rem, padding-top 8px:
  **“Todavía no hay nada aquí. Habla en TALK o guarda slang — tus errores y hallazgos van cayendo solos.”**
- **NO hay agrupación por tipo ni reordenación**: se itera `state.dna` en su
  orden natural (**newest-first**, por el `unshift` de `saveDNA`). Los tres
  tipos se intercalan. Esto contradice una lectura ingenua de "agrupación por
  tipo": la agrupación existe SOLO en los contadores del héroe.
- Cada fila: `div.dna-item.flex.items-start.justify-between.gap-3`, con el
  contenido en un `div[min-width:0]` y a la derecha el botón de borrar.

| tipo | render |
|---|---|
| `error` | `quote` en `var(--texto-mal)` + line-through → ` → ` → `fix` en `var(--accent)` weight 600 (0.88rem). Debajo `why` (0.78rem, `--text-secondary`, margin-top 3px). |
| `upgrade` | `b2` en `var(--text-muted)` + line-through → ` → ` → `fix` en `var(--accent)` weight 600. Debajo: si `dominado`, prefijo `<span style="color:var(--warn);font-weight:700">clavado ✓</span> · ` y luego `why`. |
| `slang` (else) | `term` 0.92rem weight 700; si hay `meaning`, ` — ${meaning}` en weight 400 `--text-secondary`. Si hay `example`, línea 0.78rem itálica entre comillas. |

**Borrar** (`.dna-del`, 44×44, aria-label “Borrar”, ✕ 15px, color `--text-muted`):
```js
const i = state.dna.indexOf(d);      // ⚠ por IDENTIDAD del objeto, no por data-idx
if (i > -1) { state.dna.splice(i, 1); store.set('rodeo_dna', state.dna); renderDNA(); }
```
El atributo `data-idx` existe en el markup pero **no se usa** — inmune a
re-renders y doble-tap. En React: borrar por referencia/`ts`, no por índice
del map. (`src/lib/dna.ts` **no expone un `deleteDNA`**: hace falta añadirlo —
pero eso sería editar un archivo existente ⇒ implementarlo dentro de
`src/stores/ladder.ts` leyendo/escribiendo `rodeo_dna` con `store`, y notificar
al resto con el mismo patrón de suscripción.)

### 6.2 Quiz — handler `#quiz-btn` L5000-5029

Guardas, en orden:
```js
if (state.busy) return;
if (state.dna.length < 3) { toast('Necesitas al menos 3 cosas en tu DNA — ve a hablar primero'); return; }
state.busy = true; $('#quiz-btn').disabled = true;
toast('Armando tu repaso...', 3500);
```
Material: `pool = [...state.dna].sort(() => Math.random() - 0.5).slice(0, 8)`
(baraja sucia, máx 8 items). Cada item se serializa según su tipo:
```
ERROR: decía "${d.quote}" → correcto: "${d.fix}" (${d.why})
UPGRADE: básico "${d.b2}" → C1 "${d.fix}" (${d.why})
SLANG: "${d.term}" = ${d.meaning}. Ej: "${d.example}"
```
unidos con `'\n'`.

`system` (VERBATIM):
```
You create quick quiz questions to drill English mistakes and vocabulary. Respond with STRICT JSON only.
```
`user` (VERBATIM, multilínea tal cual — ojo el `\n` literal antes de `${material}`):
```
From this material of Gus's past errors and saved slang, create exactly 5 quiz questions in Spanish that force him to PRODUCE the correct English. STRICT JSON array:
[{"q":"pregunta en español pidiendo producir el inglés","a":"respuesta correcta en inglés","hint":"pista corta en español"}]
MATERIAL:
${material}
```
Llamada: `callJSON('creative', msgs, 2600)`.
Validación: `if (!Array.isArray(quiz) || !quiz.length) throw new Error('No pude armar el quiz');`
`catch` → `toast('Error: ' + err.message)`. `finally` → `busy=false`, botón habilitado.

**Tipo de pregunta: UNO SOLO** — producción libre. No hay opción múltiple, no
hay corrección automática: el usuario se autoevalúa. Shape:
```ts
type QuizQ = { q: string; a: string; hint: string };
```

### 6.3 `runQuiz(quiz)` — L5031-5085
Estado local: `let i = 0, score = 0`. `#quiz-area` pierde `hidden` y gana `flex`.

**Pregunta** (`.dna-item` con borde `oklch(87% 0.21 128 / 0.3)`):
- contador `${i+1} / ${quiz.length}` (0.68rem, tracking 0.16em, uppercase, `--text-muted`)
- `q.q` (0.95rem, weight 600, line-height 1.5)
- `#quiz-answer.hidden` — caja `padding 12px`, `background var(--accent-dim)`,
  `border-radius 12px`, color `var(--accent)`, weight 700 → contiene `q.a`
- botonera: `#quiz-reveal.btn-ghost` **“Ver respuesta”** · `#quiz-hint.btn-ghost` **“Pista”**
- `#quiz-judge.hidden` (display:none) con `#quiz-good.btn-accent` **“LA TENÍA ✓”**
  y `#quiz-bad.btn-ghost` (borde/color `var(--texto-mal)`) **“Fallé”**

Interacción:
- `#quiz-reveal` → muestra la respuesta **y** revela la botonera de juicio
  (`classList.remove('hidden')` + `style.display='flex'`). Los botones de
  autoevaluación **no existen hasta revelar**.
- `#quiz-hint` → `toast('Pista: ' + (typeof q.hint === 'string' ? q.hint : 'sin pista'), 3500)`
  (la guarda de tipo es real: el modelo a veces manda objeto).
- Juicio por **delegación con `area.onclick = ...` (asignación, no
  `addEventListener`)** — deliberado, L5077-5079: un solo handler vivo aunque el
  usuario abandone un quiz a mitad y arranque otro. `quiz-good` → `score++`,
  `i++`; `quiz-bad` → `i++`; ambos `area.onclick = null; renderQ();`

**Cierre** (`i >= quiz.length`), `.dna-item` con borde `oklch(87% 0.21 128 / 0.4)`:
- `${score}/${quiz.length}` en `.font-display` 2rem
- mensaje (0.85rem, `--text-secondary`), tres casos EXACTOS:
  - `score === quiz.length` → **“Impecable. Eso ya no se te olvida.”**
  - `score >= quiz.length / 2` → **“Bien — lo que fallaste se queda en el DNA para la próxima.”**
  - resto → **“Tranquilo, para eso existe el repaso. Otra ronda mañana.”**
- botón `.btn-ghost` **“Cerrar”** → oculta `#quiz-area`.

Al final de `renderQ()` inicial: `area.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' })`.

> ⚠ El quiz **no escribe nada**: ni XP, ni racha, ni `dominado`, ni DNA. El
> "marcado dominado" NO ocurre en el quiz — ocurre **solo** en `selfJudge` de
> LADDER vía `recordUpgrade`. No inventarlo.

---

## 7. Navegación y entradas

- Ni DNA ni LADDER están en el tab bar (L2862-2863): se abren desde el menú de
  perfil. `openPerfil()` L5146-5153 pinta dos `.btn-ghost` a ancho completo
  (min-height 56, padding 0 18px, gap 12):
  - **“Mis fallos — DNA”** / sub `tus errores y repaso espaciado` → `irA('dna')`
  - **“Sube tu inglés”** → `irA('ladder')`
- `switchView` (L3646) exceptúa explícitamente `'dna'` y `'ladder'` del gate por
  nivel: son transversales y se abren desde el perfil en cualquier nivel.
- Al entrar: `renderDNA()` / `renderLadder()`, y luego
  `animateIn(section.children, { y: 18, duration: 0.7 })` — cascada `rd-in` con
  `--i` por hijo.
- El perfil también muestra `state.dna.length` como stat “en tu DNA” y
  `ladderXP.pct` (L5126-5135).

---

## 8. Inventario UI y mapeo a tokens/componentes nuevos

### 8.1 `CARD_THEMES` (L4721-4727) — ciclo de 5, indexado por `ladderIdx % 5`
| # | bg | clase de texto | token nuevo |
|---|---|---|---|
| 0 | `var(--card-blue)` | `light-text` | `bg-card-blue` |
| 1 | `var(--card-green)` | `light-text` | `bg-card-green` |
| 2 | `var(--card-yellow)` | `dark-text` | `bg-card-yellow` |
| 3 | `var(--card-coral)` | `light-text` | `bg-card-coral` |
| 4 | `var(--card-paper)` | `dark-text` | `bg-card-paper` |

> Las clases `dark-text`/`light-text` son **legado inerte**: ambas resuelven a
> `--card-ink` (L773-774, comentario de contraste en L264). El texto sobre card
> es siempre `text-card-ink` / `text-card-ink-soft`.

### 8.2 Clases legacy → tokens/utilidades nuevas
| legacy | nuevo |
|---|---|
| `.slang-card` (radio 26px, padding, `--card-borde`, sombra sticker) | contenedor propio con `shadow-sticker`, `border-[var(--card-borde)]`, `rounded-[26px]` |
| `.slang-card .term` | `font-display` + `text-card-ink`, `clamp(2.35rem, 11vw, 3.4rem)` frontal / `clamp(2rem, 8.5vw, 3rem)` trasera |
| `.slang-card .label-mini` | `font-mono text-[0.62rem] tracking-[0.14em] uppercase text-card-ink-soft` (sin opacity) |
| `.swap-old` / `.swap-new` | `text-swap-old line-through` / `text-swap-new font-bold` |
| `.vchip` | píldora mono 0.74rem, weight 700, uppercase, padding 6px 14px, radio 100px |
| `.stat-num` | `font-display font-extrabold clamp(2.6rem,11vw,3.6rem) tracking-[-0.03em]` |
| `.dna-item` | `bg-[var(--bg-surface)] border border-[var(--superficie-t)] rounded-2xl px-4 py-3.5` |
| `.chip` | pill de veta (usar `PillButton` si encaja, si no clonar geometría) |
| `.icon-btn` 44×44 | `MicButton` (mic) / botón propio (enviar, subir) |
| `.skeleton` | `PencilLoader` o bloque shimmer 210px/radio 26px |
| `.meter-track` + `.meter-fill` | barra 8px con `bg-accent`, `width: pct%` animable con motion |
| `.rd-streak` | `font-mono text-[0.66rem] font-bold text-warn` |
| `.rd-ladder-end` | `font-mono text-[0.62rem] font-bold tracking-[0.12em] uppercase text-[var(--text-secondary)]` |
| `anim(el,'rd-in')` | motion: `initial {opacity:0, y:24}` → `animate`, 0.9s `cubic-bezier(.16,1,.3,1)` |
| `anim(el,'rd-pop')` | motion: `initial {opacity:0, scale:0.88}` → `animate`, 0.45s `cubic-bezier(.34,1.56,.64,1)` |
| `openSheet(html)` | patrón de `src/views/talk/sheet.tsx` (no editarlo; replicar) |

### 8.3 Textos de UI (español, VERBATIM)
LADDER: `Sube · B2 → C1` · `SUBE TU INGLÉS.` · `Di lo mismo, pero como un C1.` ·
`racha N 🔥` · `B2` · `C1` · `💼 TRABAJO` · `🛹 CALLE` · `🎯 MIS FALLOS` ·
`o sube esta frase tuya...` · `Peldaño N / M` · `· combo xN` · `B2 · {context_en}` ·
`SÚBELA ↑` · `tu versión C1...` · `muéstrame la respuesta` · `C1 · {register}` ·
`tú escribiste: "…"` · `CLAVADO`/`CASI`/`BÁSICO` · `LA CLAVÉ ✓` · `CASI` ·
`SIGUIENTE ↑`/`TERMINAR` · `combo xN 🔥` · `VETA HECHA.` · `Clavados` ·
`Mejor combo` · `Hacia C1` · `LISTO` · `IR A TALK` · `Error: {msg}` ·
`Respuesta inválida, dale otra vez`.

DNA: `DNA · tu cerebro de errores` · `Errores cazados` · `Slang guardado` ·
`Upgrades clavados` · `Episodios` · `Lo que fallas vuelve aquí hasta que lo domines.` ·
`REPASO RÁPIDO` · `RÉTAME 🃏` · `Todo lo que tocaste` · `clavado ✓` · `Borrar` ·
`Necesitas al menos 3 cosas en tu DNA — ve a hablar primero` · `Armando tu repaso...` ·
`No pude armar el quiz` · `Ver respuesta` · `Pista` · `Pista: {hint}` · `sin pista` ·
`LA TENÍA ✓` · `Fallé` · `Cerrar`.

---

## 9. Trampas (leer antes de escribir código)

1. **`renderLadder()` llama a `updateStreak()`**: abrir SUBE acredita la racha
   del día, sin hacer nada. Es intencional. No moverlo al primer clavado.
2. **`pct` tope 97, paso +3** — nunca llega a 100 %. Es una decisión de producto
   (C1 no se "termina"). `Math.min(97, pct + 3)`.
3. **`combo` NO persiste** y se resetea en `renderLadder`, en `startVeta` y en
   cada "CASI". Solo `bestCombo` sobrevive.
4. **`.flip-card` no flipa**: el CSS define un contrato 3D (`.flip-inner`,
   `.flip-face`, `.flip-back`, `.flipped`) que el JS **no usa** — re-renderiza el
   HTML. La única "vuelta" real es el cambio de signo de `rotate()` + `rd-pop`.
   Si en React se hace un flip 3D de verdad, la cara trasera debe estar en el DOM
   desde el primer frame (razón: L7021, pestañas de fondo).
5. **`state.seenLadder` en memoria crece sin límite**; solo el `store.set` se
   trunca a 200. El prompt usa `slice(-60)`. Tres números distintos: 60 / 200 / ∞.
6. **`EX_B2` guard**: el modelo devuelve a veces el ejemplo del prompt. El filtro
   compara `toLowerCase().trim()` contra las tres frases del ejemplo. Sin él el
   usuario ve "I think it's good." una y otra vez.
7. **El juez falla en silencio** (`catch {}` vacío). Nada de toasts ahí.
8. **`revealRung` con `attempt === ''`** (botón "muéstrame la respuesta" o mic
   sin texto) **no llama al modelo** y no pinta el bloque de intento.
9. **Doble-tap en `selfJudge`**: guard `if (!nb || nb.disabled) return`. Sin él,
   dos taps rápidos suman XP dos veces. En React: flag por peldaño.
10. **`recordUpgrade` se llama también en "CASI"** — el DNA guarda el fallo.
11. **`dominado` es pegajoso**: `existing.dominado || dominado`. Un clavado no se
    puede des-clavar repitiéndolo mal.
12. **La veta `fallos` no llama a la API** y no toca `state.busy`; si el pool
    está vacío hay un empty state con CTA a TALK.
13. **`renderDNA` no agrupa ni ordena**: itera `state.dna` newest-first, con los
    tres tipos intercalados. La "agrupación" son solo los 4 contadores.
14. **Borrado del DNA por identidad**, no por índice (`data-idx` es decorativo).
15. **`#stat-upgrades` cuenta solo `dominado`**, `#stat-errors`/`#stat-slang` cuentan todo.
16. **El quiz exige `dna.length >= 3`** (longitud total, sin filtrar por tipo) y
    usa como máximo 8 items barajados; pide **exactamente 5** preguntas pero
    `runQuiz` respeta `quiz.length` real en contador y score.
17. **El quiz no persiste nada.** Ni score, ni `dominado`, ni racha.
18. **`area.onclick = ...` en vez de `addEventListener`** en el quiz es
    deliberado (un solo handler vivo). En React el equivalente natural
    (onClick por botón) ya cumple, pero hay que resetear el estado al arrancar
    un quiz nuevo.
19. **Fechas de racha en UTC** (`toISOString().slice(0,10)`), no locales.
20. **Mic contexto `'ladder'` arranca en inglés** (`MIC_LANGS.ladder = 'en'`,
    L2958) — al revés que TALK. Y `continuous:false`: el envío ocurre en `onend`.
21. **`state.busy` es un guard global compartido** con TALK/STORY/DROP. En React
    hay que decidir si se replica global (recomendado: un flag en
    `src/stores/ladder.ts` más el respeto al busy del store de app si existe).
22. **`ladderSummary` se dispara desde `showRung`** cuando el índice desborda, no
    desde el botón TERMINAR: TERMINAR solo incrementa el índice.
23. **`swap` puede venir con separadores raros**: el split acepta `→ -> => ➔ »`.
    Si falta uno de los dos lados, no se pinta el swap (no se inventa).
24. **`rodeo_stories` es de solo lectura para DNA**; lo escribe story-mode.
    Si el módulo de historias no está portado, `#stat-stories` leerá 0 desde
    `store.get('rodeo_stories', 0)` — correcto, no hardcodear.
25. **`window.rodeoCardsBridge`** (L6841) expone `saveDNA`, `updateStreak`,
    `getDNA`, `speak`, `toast`, `tipPrimeraVez` a `js/cards-mode.js` (RÉTAME).
    Si RÉTAME sigue vivo como script legacy, `src/stores/ladder.ts` debe seguir
    publicando `updateStreak`/`getDNA` en ese bridge o el botón `#retame-btn-dna`
    romperá. Alternativa acordada: renderizar el botón como inerte/oculto y
    dejar el cableado al orquestador.

---

## 10. Plan de archivos (regla de oro: solo CREAR en estas rutas)

```
src/stores/ladder.ts        → rodeo_ladder_xp, rodeo_streak (updateStreak),
                              rodeo_seen_ladder, rodeo_stories (lectura),
                              pool/idx/combo/runClavados en memoria, borrado de DNA,
                              busy local. Suscripción para que DNA repinte.
src/views/ladder/index.tsx  → export default LadderView (hero, barra, vetas,
                              input propio, runarea)
src/views/ladder/prompts.ts → LADDER_EXAMPLE, system/user del generador y del juez
src/views/ladder/rung.tsx   → tarjeta del peldaño (frontal/intento/trasera)
src/views/ladder/summary.tsx→ hoja VETA HECHA
src/views/ladder/ladder.css → geometría de .slang-card/.vchip/.skeleton si hace falta
src/views/dna/index.tsx     → export default DnaView (hero+stats, botones, lista)
src/views/dna/quiz.tsx      → REPASO RÁPIDO (prompt + runQuiz)
src/views/dna/dna.css       → si hace falta
```
Importar (nunca editar): `@/lib/api`, `@/lib/storage`, `@/lib/dna`,
`@/lib/speech`, `@/stores/toast`, `@/stores/app`, `@/components/rodeo/*`,
`@/components/magicui/text-animate`, `@/lib/utils` (`cn`).
La integración en `App.tsx` la hace el orquestador.
