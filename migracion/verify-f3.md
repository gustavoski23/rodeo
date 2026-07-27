# VERIFICACIÓN F3 — SUBE (ladder) + DNA

Contra `undefined/spec-ladder-dna.md` y `public/legacy.html`.
Rama `claude/rodeo-repo-info-nw2025`. Fecha: 2026-07-27.

**Veredicto: con-defectos** — 3 defectos, todos **menores**. Ninguno bloqueante,
ninguno mayor. La lógica portada es 1:1 con el legado en todo lo que se pudo
ejercitar: prompts byte-idénticos, claves y formas de `localStorage` exactas,
XP/racha/combo/dominado correctos, filtros correctos, flip 3D real.

---

## 1. `npm run typecheck`

```
> rodeo@2.0.0 typecheck
> tsc -b
```
Sin salida, sin errores. ✔

## 2. Aislamiento (regla de oro)

`git status` → **cero archivos existentes modificados**. Solo archivos nuevos y
todos dentro de las rutas permitidas:

```
src/stores/ladder.ts
src/views/ladder/{index,rung,summary,sheet,prompts}.tsx · ladder.css
src/views/dna/{index,quiz,number-ticker}.tsx · dna.css
```

Imports: todos dentro de la lista blanca de §10 (`@/lib/{api,dna,speech,storage,utils}`,
`@/stores/{app,ladder,toast}`, `@/components/rodeo/{mic-button,pencil-loader}`,
`react`, `react-dom`, `motion/react`, `lucide-react`, `zustand`). No se importa
ni se toca `src/views/talk/sheet.tsx` (se replica el patrón en
`src/views/ladder/sheet.tsx`, como pedía la spec). ✔

Exports esperados por el orquestador: `export default LadderView` en
`src/views/ladder/index.tsx` y `export default DnaView` en
`src/views/dna/index.tsx`. ✔

No se creó `dist-f3` ni se tocó `dist/`. ✔

## 3. Montaje headless

Tres arneses con jsdom + React 19 (`react-dom/client`, eventos reales,
`localStorage` sembrado antes de importar la app para que el caché de módulo de
`dna.ts` arranque con los datos). Instalados **fuera del repo**
(`scratchpad/jsdomenv`), sin tocar `package.json`.

Semilla: DNA con los 3 tipos (`error`, `slang`, `upgrade` × 2 — uno
`dominado:false` y otro `dominado:true`), `rodeo_ladder_xp` a mitad de rampa
(`pct:48`), `rodeo_streak` con hueco, `rodeo_seen_ladder` con 250 entradas,
`rodeo_stories:12`.

| Arnés | Qué cubre | Resultado |
|---|---|---|
| 1 | montaje de ambas vistas, racha, MIS FALLOS, flip, selfJudge, borrado, prompts | **58/59** |
| 2 | API stubbeada: juez, EX_B2, quiz completo, tope 97, avoid=60/persist=200 | **38/40** |
| 3 | guard de `busy` con eventos discretos reales | ver defecto 2 |
| 4 | momento en que aparece el sufijo `· combo xN` | ver defecto 3 |

Las 2 "fallas" del arnés 2 son: el defecto 2 (real) y un falso positivo mío
(jsdom serializa `oklch(85% …)` como `oklch(0.85 …)`; el string del código es
byte-idéntico al legado).

### Lo que quedó verificado en verde

**Prompts VERBATIM** (comparación byte a byte contra el legado, no a ojo):
- `LADDER_EXAMPLE` idéntico a L6782.
- Generador: system idéntico; user idéntico en las tres ramas (`own` → "Genera 3
  versiones-peldaño C1…", `trabajo`/`calle` → plantilla única), con los `\n`
  reales en los sitios correctos. `callJSON('creative', …, 3800)`.
- Juez: system con `NOTA_STT_BILINGUE` pegada tras un espacio; user idéntico
  incluido el ejemplo. `callJSON('chat', …, 1500)`. `better` se pide y **no** se
  pinta (comprobado: el texto no aparece en el DOM).
- Quiz: system idéntico; user con el `MATERIAL:\n` literal; las tres plantillas
  de serialización (`ERROR:` / `UPGRADE:` / `SLANG:`) idénticas.
  `callJSON('creative', …, 2600)`.

**Claves y formas de `localStorage`:**
- `rodeo_ladder_xp` → `{pct, clavados, bestCombo}`, exactamente esas 3 claves.
  `pct` sube +3 y hace **tope duro en 97** (probado desde 95 → 97).
- `rodeo_streak` → `{days, last}` en **UTC**; con hueco reinicia a 1; se acredita
  al **entrar** a SUBE (trampa §9.1, respetada).
- `rodeo_seen_ladder` → el prompt usa los **últimos 60**, se persiste truncado a
  **200**, la copia en memoria no se trunca. Los tres números distintos, bien.
- `rodeo_dna` → upgrades con `dominado`; `recordUpgrade` se llama también en
  "CASI"; `dominado` pegajoso; no duplica.
- `rodeo_stories` → solo lectura.

**Reglas de negocio:**
- MIS FALLOS filtra `type==='upgrade' && !dominado`, mapea `fix→c1`, `why→note_es`,
  `context_en` fijo, y **no toca `busy`** (no hay API). El clavado queda fuera.
- Empty state de MIS FALLOS con los dos textos y el CTA "IR A TALK".
- `EX_B2`: filtra el eco literal del ejemplo (incluido con otro casing/espacios) y
  los peldaños con `b2 === c1`. Lote todo-inválido → `toast('Error: Respuesta
  inválida, dale otra vez')` y zona vacía.
- El juez **falla en silencio**: sin toast, la carta se voltea igual, sin vchip,
  y `busy` se libera.
- `attempt === ''` ("muéstrame la respuesta") **no** llama al modelo y no pinta el
  bloque "tú escribiste".
- vchip: mapa exacto de los 3 veredictos con los colores del legado; veredicto
  desconocido → sin chip.
- Guard anti doble-tap de `selfJudge`: dos clics extra en "LA CLAVÉ ✓" no vuelven
  a sumar XP.
- `TERMINAR` vs `SIGUIENTE ↑` según el índice; el resumen lo dispara el desborde
  del índice (§9.22), no el botón. `LISTO` cierra y vacía la zona.
- Quiz: exige `dna.length >= 3` (comprobado: con 2 no arranca ni pinta nada),
  baraja y corta a 8, respeta `quiz.length` **real** en contador y score, los
  botones de autoevaluación **no existen hasta revelar**, la guarda de tipo de
  `hint` funciona (objeto → "sin pista"), los 3 mensajes de cierre son exactos, y
  **no escribe nada** (ni XP, ni DNA, ni `dominado`).
- Borrado del DNA por **identidad**: quita el item de `rodeo_dna` y deja
  sincronizado el caché de módulo de `dna.ts` (muta el mismo array que devuelve
  `getDNA()`).

**Flip:** es un flip 3D de verdad, no un fade disfrazado. `.lad-flip-inner` con
`transform-style: preserve-3d`, `.lad-face` con `backface-visibility: hidden`,
cara trasera a `rotateY(180deg)`, y motion animando `rotateY` con
`type:'spring'` (comprobado en el DOM: el estilo inline contiene `rotateY(…)`).
Las **dos caras están montadas desde el primer frame** — la razón de L7021 (en
pestañas de fondo el rAF se estrangula) queda cubierta. Hay override de
`prefers-reduced-motion` que apila por opacidad con `!important` (gana a la
inline de motion). ✔

---

## 4. Defectos

### D1 · menor — falta el botón `RÉTAME 🃏` en DNA
`src/views/dna/index.tsx`

La spec §3 lo lista en el markup de `#view-dna`
(`button#retame-btn-dna.btn-ghost → "RÉTAME 🃏"`) y §8.3 lo incluye entre los
textos VERBATIM. En la vista no existe: `Repaso` renderiza un
`<div className="flex gap-3">` con un solo hijo (`REPASO RÁPIDO`), y en todo
`src/views/dna/` no hay ninguna aparición de "RÉTAME".

§9.25 admitía "renderizar el botón como inerte/oculto y dejar el cableado al
orquestador" — omitirlo del todo se pasa un paso de eso: el orquestador no puede
cablear un botón que no está en el árbol, y el `flex gap-3` queda con un solo
hijo. `src/stores/ladder.ts` sí publica su mitad del puente
(`window.rodeoCardsBridge.updateStreak/getDNA`), así que la isla está a medio
conectar.

Verificado: el arnés 1 busca "RÉTAME" en el `textContent` de `DnaView` montado y
no lo encuentra.

### D2 · menor — el guard de `busy` lee la copia del render, no el store
`src/views/ladder/index.tsx:65` · también `src/views/ladder/rung.tsx:99` y
`src/views/dna/quiz.tsx:47`

```ts
const busy = useLadder((s) => s.busy);
async function startVeta(veta: Veta, ownPhrase?: string) {
  if (busy) return;
```

El legado leía `state.busy` **vivo** (`if (state.busy) return;`), así que era
inmune a cualquier reentrada. Aquí `busy` es la copia capturada en el render, y
`setBusy(true)` no la actualiza dentro del mismo lote de React.

Medido (arnés 3):
- dos clics en el **mismo tick** → **2 llamadas a `/api/chat`** (guard saltado);
- dos clics en **ticks distintos** → 1 llamada (guard OK);
- el store sí queda en `busy:true` inmediatamente tras el primer clic.

Impacto real bajo: dos toques físicos de un humano siempre caen en tareas
distintas, y React hace flush síncrono entre eventos discretos, así que el
camino de usuario está cubierto. Queda como divergencia de robustez frente al
legado. Arreglo de una línea: `if (useLadder.getState().busy) return;` en los
tres sitios.

### D3 · menor — el sufijo `· combo xN` aparece un peldaño antes que en el legado
`src/views/ladder/rung.tsx:161`

`RungCard` recibe `combo` por props y `LadderView` está suscrito a él, así que al
pulsar "LA CLAVÉ ✓" la cabecera del peldaño **actual** se repinta con el combo ya
incrementado. El legado solo reemplazaba el `innerHTML` de `.flip-card` en
`selfJudge`: la cabecera la escribía `showRung`, y por eso el sufijo solo salía
en el peldaño **siguiente**.

Medido (arnés 4), lote de 3 clavando los tres:

| momento | RODEO 2.0 | legado |
|---|---|---|
| peldaño 2, antes de clavar | `Peldaño 2 / 3` | `Peldaño 2 / 3` |
| peldaño 2, **después** de clavar | `Peldaño 2 / 3 · combo x2` | `Peldaño 2 / 3` |
| peldaño 3, antes de clavar | `Peldaño 3 / 3 · combo x2` | `Peldaño 3 / 3 · combo x2` |

Cosmético y discutiblemente mejor (el premio se ve al ganarlo), pero es una
divergencia visible respecto al 1:1. Si se quiere el comportamiento exacto,
congelar el combo en el montaje de la tarjeta (`useState(combo)` o pasarlo por
la `key`).

---

## 5. Notas sin rango de defecto

- `useLadder.refrescarDna` está definido y nunca se usa (código muerto).
- `borrarDna` escribe `rodeo_dna` y actualiza su propio store, pero no dispara los
  suscriptores de `onDnaChange`. Hoy es inocuo: `useLadder` es el **único**
  suscriptor en todo `src/`. Si mañana otra vista se suscribe, no verá el borrado.
- Los `#stat-*` de DNA usan `NumberTicker`, que pinta `0` hasta que el
  `IntersectionObserver` reporta visibilidad. Es el comportamiento propio del
  componente, no un fallo — pero conviene que el orquestador confirme el
  ticker en el smoke visual si monta las vistas ocultas.
- `type Judge` declara `verdict: 'nailed' | 'close' | 'off' | string`, unión que
  colapsa a `string`. No afecta al runtime.

## 6. Cómo reproducir

```
# arneses en scratchpad/f3verify (fuera del repo)
npx vite build --config <scratchpad>/f3verify/vite.config.ts
node <scratchpad>/f3verify/out/harness{1,2,3,4}.mjs
```
