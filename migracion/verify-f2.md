# verify-f2.md — verificación independiente de SLANG

Fecha: 2026-07-27 · Rama: `claude/rodeo-repo-info-nw2025`
Contra: `undefined/spec-slang.md` (idéntico byte a byte a `spec-slang.md` de la raíz) y
`public/legacy.html` (fuente de verdad, leído directamente — no me fié de la spec sola).

Veredicto: **con-defectos** — ninguno bloqueante. El port es fiel; lo que hay son
2 desviaciones de alcance que necesitan decisión del orquestador y 4 detalles menores.

---

## 1. Typecheck

```
$ npm run typecheck     →  tsc -b, salida vacía, exit 0
```
Limpio. `tsconfig.app.json` tiene `strict`, `noUnusedLocals`, `noUnusedParameters`,
`verbatimModuleSyntax` — todo pasa.

## 2. Prompts — diff byte a byte contra el legacy

Comparé los literales extraídos de `public/legacy.html` con los de
`src/views/slang/prompts.ts` mediante extracción por marcadores y comparación exacta
de cadenas (no visual):

| Literal | Origen legacy | Resultado |
|---|---|---|
| `SLANG_SYSTEM` | L4782 | **MATCH** |
| `slangUserPrompt` (cuerpo completo) | L4783-4796 | **MATCH** |
| `PAISA_SYSTEM` | L4870 | **MATCH** |
| `paisaUserPrompt` (cuerpo completo) | L4871-4880 | **MATCH** |
| `CATEGORIA_TRABAJO` | L4776 | **MATCH** |
| `CATEGORIA_CALLE` | L4777 | **MATCH** |
| `interesesLineaSlang()` | L3066-3069 | **MATCH** (conserva el `\n` final y la concatenación pegada) |

Incluye el ejemplo `no cap`, los guiones largos, la tilde de `Medellín`, el `↔` del
system de PAISA y el `'estar enfermo'` con comillas simples internas. Cero drift.

`interesesArr()` se reimplementa leyendo `rodeo_intereses` en vez de `state.intereses`;
en el legacy `state.intereses` se hidrata de esa misma clave, así que es equivalente.
La duplicación está justificada en comentario (no acoplarse a `views/talk/prompts.ts`,
que edita el otro equipo). Correcto.

## 3. localStorage — claves y formas

| Clave | Legacy | Implementado | Veredicto |
|---|---|---|---|
| `rodeo_seen_slang` | `string[]`, `slice(-200)` al persistir | `store.set('rodeo_seen_slang', seen.slice(-200))` (slang.ts:199) | **exacto** |
| `rodeo_seen_slang` → prompt | `slice(-60)` | `st.seenSlang.slice(-60)` (slang.ts:158) | **exacto** (los dos topes distintos, ambos bien) |
| memoria vs disco | en memoria crece sin recorte (L4809) | `set({ seenSlang: seen })` sin recorte | **exacto** (§A5) |
| `rodeo_dna` | `saveDNA({type:'slang',term,meaning,example})` | idéntico (slang.ts:263) | **exacto** |
| `rodeo_intereses` | lectura | lectura | **exacto** |
| `slangMode` | NO se persiste | no se persiste | **exacto** |

No escribe ninguna clave que el legacy no escriba.

## 4. Orden de tema y rotación (la trampa de §A2/§C3)

Legacy L4808-4811:
```js
valid.forEach((c, i) => {
  state.seenSlang.push(c.term);
  const theme = CARD_THEMES[(state.seenSlang.length + i) % CARD_THEMES.length];
  const rot = [(-1.2), 0.8, -0.6, 1.1, -0.9][i % 5];
```
Implementación (slang.ts:182-193): `seen.push(...)` **antes** de
`CARD_THEMES[(seen.length + i) % 5]`. Verificado numéricamente en el harness:
con `seenSlang` vacío → índices `[1,3,0]`; con 7 previos → `[3,0,2]`. Coincide con el
legacy. Rotaciones `[-1.2, 0.8, -0.6, 1.1, -0.9]` idénticas.

PAISA usa tema **aleatorio** y sin rotación (slang.ts:243) — correcto.

## 5. Validación de la respuesta

`PLACEHOLDERS = ['the expression', 'no cap', 'the english expression']` ✓
`!/significado en español/i.test(...)` ✓
`if (!valid.length) throw new Error('Respuesta inválida, dale otra vez')` ✓ (mensaje verbatim)

Diferencia irrelevante: el legacy comprueba truthiness (`c.term && …`), la versión TS
exige `typeof === 'string'`. Solo divergiría si el modelo devolviera un número como
`term`; en ese caso el legacy lo pintaría y el port lo descarta. Aceptable.

## 6. Los puntos del brief que NO aplican aquí

El brief de verificación pedía comprobar **silent-prefetch sin PIN**, **promoción de
fechas** y **cambio de día**. Nada de eso existe en `src/views/slang/**` ni en
`src/stores/slang.ts` — y **es correcto que no exista**: la propia spec lo dice en el
"Aviso de alcance" (líneas 7-12) y en §B1: el motor del DROP diario
(`rodeo_drop_hoy` / `rodeo_drop_manana`, `pedirEdicion`, `prefetchDropManana`,
`promoverPrefetchSiToca`) vive en `#drop-pane` **dentro de STORY**, no en SLANG. El
`#drop-btn` de SLANG es un falso amigo léxico: genera 3 tarjetas de jerga y no toca
ninguna de esas claves.

El implementador documentó esa decisión explícitamente en `src/stores/slang.ts:37-43`
y en `src/views/slang/index.tsx:17-19`. **La decisión es la correcta.**

**Pero**: `grep -rn "rodeo_drop_hoy\|prefetchDropManana\|DROP_SYSTEM" src/` solo devuelve
esos dos comentarios. El motor del DROP **no lo está portando nadie** en todo el repo.
Ver defecto 2.

## 7. Montaje headless

Harness aislado (fuera del repo, en scratchpad) con `react-dom/server` + build SSR de
Vite usando la config real (alias `@`). Nota metodológica: zustand v5 usa
`getInitialState()` como *server snapshot*, así que `renderToString` ignora `setState`;
hubo que aliasar `zustand` a un shim de verificación para poder renderizar variantes de
estado. Eso es un artefacto del harness, **no** un problema del código.

21 aserciones, 21 correctas:

- Monta en `calle` con el héroe: eyebrow `Slang · fresco de la calle`, titular
  `SLANG QUE` / `SÍ SE USA.`, sub `Expresiones frescas: contexto, ejemplo y cómo NO usarlas.` ✓
- Monta en `paisa`: `¿CÓMO DIGO` / `ESO EN INGLÉS?`, sub y placeholder
  `"qué chimba", "está mamando gallo"...` ✓
- Feed con tarjetas: término, significado, ejemplo EN entre comillas rectas,
  ejemplo ES en itálica, `⚠ {wrong_use}` ✓
- Héroe oculto tras generar y no vuelve ✓
- Contador: `generando… 3s` y `generando… 50s · el modelo está lento hoy, sigue trabajando`
  — **verbatim**, y con el mismo `Math.round((Date.now()-t0)/1000)` del legacy (L4760-4764) ✓
- Estado de error en sitio + toast ✓
- Tarjeta PAISA con `paisa → gringo`, la frase del **usuario** entre comillas y los
  equivalentes ✓
- Bookmark relleno cuando `guardada` ✓

Cero excepciones, cero warnings de React.

## 8. Higiene del repo (no pisar al otro equipo)

```
$ git status --porcelain
?? spec-ladder-dna.md
?? spec-slang.md
?? src/stores/ladder.ts
?? src/stores/slang.ts
?? src/views/dna/
?? src/views/ladder/
?? src/views/slang/
?? undefined/
```
**Cero archivos rastreados modificados.** `git diff HEAD` vacío. Nada de `App.tsx`,
`tokens.css`, `tab-bar`, `src/lib/**` ni `src/components/**` fue tocado. Los `??` de
`ladder`/`dna` son del otro equipo, no de este.

El CSS propio está donde tocaba: `src/views/slang/slang.css`, importado desde
`index.tsx`, con prefijo `rd-slang-` para no colisionar con el `.slang-card` del legacy.

Imports: solo `motion/react`, `react`, `zustand`, `@/lib/{api,dna,storage,speech,utils}`,
`@/components/rodeo/pencil-loader`, `@/stores/{toast,talk}` y ficheros propios. Todo
dentro de lo permitido (ver defecto 3 sobre `@/stores/talk`).

Tokens verificados contra `src/styles/tokens.css`: `--card-ink`, `--card-ink-soft`,
`--card-blue/green/yellow/coral/paper`, `--card-borde`, `--sticker-shadow`, `--accent`,
`--accent-ink`, `--chip-bg`, `--borde-sutil`, `--text-muted`, `--text-secondary`,
`--text-primary`, `--danger`, `--danger-dim`, `--font-display`, `--font-mono` — todos
existen en los dos temas. Comprobé además con un build aislado (`dist-f2v`, ya borrado)
que `--font-display` y `--font-mono` sí se emiten en `:root` pese a estar en
`@theme inline`, así que `var(--font-display)` de `slang.css` resuelve.

Limpieza: `dist-f2v` borrado, no quedan `dist-f2*` ni procesos en el 4272. No usé
`npm run build` ni toqué `dist/`.

---

## Defectos

### 1 · mayor — TTS añadido a la tarjeta de slang (feature no pedida)
`src/views/slang/slang-card.tsx:28-72`

La tarjeta añade un botón "Oír el ejemplo" que llama `speak(card.example_en)`. El legacy
**no tiene TTS en la tarjeta de slang** y la spec lo dice por su nombre en §A3.4
("**No hay TTS en la tarjeta de slang**… Si el rediseño quiere un botón de audio en la
tarjeta de slang, es **feature nueva**, no port") y otra vez en §C11. El mandato del
equipo era "lógica 1:1".

No es un descuido — está documentado en el comentario del archivo ("a petición del
rediseño") — pero es una decisión que le toca al orquestador, no al implementador.
Impacto real: `speak()` hace una llamada de pago a Deepgram (`pedirTTS`, `src/lib/speech.ts:160`)
por cada toque, y arrastra los 18 KB de `speech.ts` al bundle de SLANG.

**Acción**: aprobarlo explícitamente o borrar el botón (borrarlo es aislado: el `<button>`,
`oir()`, el `useState` y el import de `speak`; nada más depende de ello).

### 2 · mayor — el motor del DROP diario no lo está portando nadie
`src/stores/slang.ts:37-43` (alcance)

La decisión de dejar el DROP fuera de SLANG **es correcta** según la spec (§"Aviso de
alcance", §B1). El problema es de cobertura, no de código: `rodeo_drop_hoy`,
`rodeo_drop_manana`, `promoverPrefetchSiToca()`, `prefetchDropManana()` con `silent:true`,
`pedirEdicion()` con sus 3 intentos y su `pin_required`, `DROP_SYSTEM`, la promoción por
cambio de día y las semillas doble-vía **no aparecen en ningún archivo de `src/`**. El
brief de verificación de este equipo daba por hecho que SLANG los tenía.

Con la nota del legacy de que el día rota a las 19:00 en Medellín (UTC), y con
`rodeo_drop_manana` sin promotor, el primer usuario que abra la app tras la migración
regenera y paga cada día.

**Acción**: asignar la Parte B de `spec-slang.md` a quien porte STORY, o abrir una
entrega propia. No es trabajo de este equipo.

### 3 · menor — acoplamiento a `src/stores/talk.ts`, que se edita en paralelo
`src/stores/slang.ts:7,151-152,215,254`

`generar()` y `traducir()` leen y escriben `useTalk.getState().busy` / `.setBusy()`. La
elección es la correcta según §C1 (el `state.busy` del legacy es global y compartido) y
no viola la regla de oro (importa, no edita). Pero `talk.ts` lo está reescribiendo el
otro equipo ahora mismo: si renombran `busy`/`setBusy` o mueven el flag a otro store,
SLANG deja de compilar y el fallo aparecerá en la integración, no aquí.

**Acción**: el orquestador debería revalidar `npm run typecheck` tras fusionar TALK, o
mover el flag `busy` a un store neutro (`stores/app.ts`) en la integración.

### 4 · menor — patrón ARIA de tabs incompleto
`src/views/slang/index.tsx:33-61`

Hay `role="tablist"` y `role="tab"` con `aria-selected`, pero no hay `role="tabpanel"`,
ni `aria-controls`/`id` que emparejen pestaña y panel, ni navegación por flechas con
tabindex móvil. Un lector de pantalla anuncia "pestaña 1 de 3" y luego no encuentra el
panel asociado; el teclado recorre las tres con Tab en vez de con flechas.

**Acción**: o completar el patrón (envolver `DropPane`/`PaisaPane` en un
`role="tabpanel"` con `aria-labelledby`) o quitar los roles y dejarlos como botones —
las dos opciones son mejores que la mitad.

### 5 · menor — no se hace scroll al aparecer la espera
`src/views/slang/drop-pane.tsx:31-34`

El legacy hace `feed.parentElement.scrollTop = feed.parentElement.scrollHeight` **antes**
de la llamada (L4769), para que el contador y los skeletons queden a la vista al pulsar
DROP. El port solo hace `scrollIntoView` cuando cambia `feed.length`, es decir cuando
llegan las tarjetas. Con un feed largo, el usuario pulsa DROP y no ve el contador
`generando… Ns` hasta que baja a mano — justo el síntoma ("parece que se colgó") que ese
contador existía para evitar.

**Acción**: disparar el scroll también cuando `generando` pasa a `true`.

### 6 · menor — `limpiarError` es código muerto
`src/stores/slang.ts:125,146`

Declarada en `SlangState` e implementada, no la llama nadie (`generar` y `traducir` ya
limpian su error al arrancar). Sobrevive a `noUnusedLocals` por estar en la interfaz
pública del store. Borrarla o usarla al cambiar de pill.

---

## Lo que verifiqué y está bien (para que no se re-audite)

- Prompts VERBATIM (los 7 literales), diff exacto contra `legacy.html`.
- `rodeo_seen_slang`: tope 200 al persistir, 60 al prompt, sin recorte en memoria.
- Orden `push` → tema, y la fórmula `(seenSlang.length + i) % 5`.
- Rotaciones `[-1.2, 0.8, -0.6, 1.1, -0.9]` y tema aleatorio sin rotación en PAISA.
- `PLACEHOLDERS` + regex `significado en español`; mensaje `Respuesta inválida, dale otra vez`.
- Feed acumulativo: cambiar CALLE↔TRABAJO no lo limpia; PAISA solo cambia de pane.
- SLANG hace `append` + `scrollIntoView`; PAISA hace `prepend`. Direcciones opuestas, correctas.
- El input de PAISA se limpia **solo** en éxito (`traducir` devuelve `boolean`).
- `d.phrase` del modelo se ignora; se pinta la frase del usuario.
- `vibe` con fallback `'slang'`; `register` con fallback `''`.
- El héroe se oculta al primer DROP y no vuelve.
- `slangMode` no se persiste.
- Toasts: `'Error: ' + msg` a 6000 ms en SLANG, por defecto (2600) en PAISA; `'Guardado en tu DNA'`.
- `saveDNA` con el shape exacto `{type:'slang', term, meaning, example}`.
- `light-text`/`dark-text` emitidos pero igualados a `--card-ink` en CSS — no "arreglado". ✓
- Contador `generando… Ns` con el mismo `Math.round` y el mismo corte en 45 s.
- Cero ediciones fuera de `src/views/slang/**` y `src/stores/slang.ts`.
- Typecheck limpio; montaje headless sin excepciones.
