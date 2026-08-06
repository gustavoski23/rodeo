# PERF — el libro interactivo en el teléfono

Cuánto tarda pasar una página, medido y no razonado. Todo lo de aquí sale de
`tests/perf/`, con toque real por CDP (regla #2 del repo) y con la sonda de
`tests/perf/instrumentacion.mjs`, que engancha APIs del navegador y no código de
la app.

```
npx vite build --config tests/perf/vite.perf.config.mjs   # bundle instrumentado
RODEO_PUPPETEER=<ruta>/node_modules node tests/perf/medir.mjs --etiqueta base
RODEO_PUPPETEER=<ruta>/node_modules node tests/perf/fuentes.mjs --lenta
```

## Qué se mide, y por qué eso

| Número | Qué es |
|---|---|
| **curl ms** | Del evento de puntero confiable que arranca el volteo al **primer `gl.drawElements`**. Hasta ahí lo que se ve es el pliegue PLANO del DOM: es literalmente el "salto" que se siente. |
| **camino** | Rasterizaciones de snapdom que **solapan** ese hueco. Si es >0, el volteo está esperando a que se dibuje una cara. |
| **frame ms / fps** | Hueco real entre frames durante el volteo. |
| **gl ms** | Lo que tarda la llamada `drawElements` en sí. Separa la culpa: `gl` alto sería del rasterizador; `gl` bajo con `frame` alto es JS del hilo principal. |
| **png** | El PNG intermedio que snapdom genera por cara, en px y en bytes. |

### El banco de pruebas no es un teléfono, y cuánto

Contenedor sin GPU (Chromium headless + SwiftShader), 4 núcleos. Calibración:
`for (i<3e8) s+=i` tarda **3650 ms** aquí y ~400 ms en un portátil de trabajo,
o sea que **este banco a 1× ya va ~8-9× más lento** que una máquina de
desarrollo. Un teléfono de gama media está en torno a 3-5×. Conclusión práctica:

- **1× aquí ≈ un teléfono lento.** Es la columna que más se parece a la realidad.
- **4× y 6×** son escenarios de castigo, útiles para ver **qué se rompe primero**,
  no para leer milisegundos absolutos.
- **`gl` mide 0 ms en todas las corridas.** El curl no está limitado por el
  rasterizador ni aquí ni, con más razón, en un teléfono con GPU: el coste del
  frame es JS del hilo principal, y ese sí viaja.

---

## Baseline (rama `claude/rodeo-repo-info-nw2025`, antes de tocar nada)

Around the World in 80 Days, 390×844 @3, escala por defecto (130 %).
Mediana de N pasadas; `p95` sobre las mismas muestras.

Dos ritmos, y la diferencia entre ellos **es** el hallazgo:

- **asentado** — se espera a que la librería termine de rasterizar las caras
  vecinas antes de volver a pasar. El mejor caso posible.
- **seguido** — se pasa página 500 ms después de la anterior, que es como se
  hojea de verdad.

### CPU 1× (N = 5)

| Ritmo | Camino | curl ms | p95 | fps | captura/cara | camino |
|---|---|---:|---:|---:|---:|---:|
| asentado | botón › | 82 | 209 | 12,2 | 584 ms | 0 |
| asentado | botón ‹ | 103 | 148 | 11,5 | 561 ms | 0 |
| asentado | deslizar adelante | 150 | **4773** | 15,9 | 875 ms | 0 |
| asentado | deslizar atrás | 53 | 88 | 23,2 | 478 ms | 0 |
| seguido | botón › | 76 | 102 | 11,7 | 593 ms | 0 |
| seguido | botón ‹ | 146 | 222 | 9,8 | 525 ms | 0 |
| seguido | deslizar adelante | 49 | 53 | 17,9 | 600 ms | 0 |
| seguido | deslizar atrás | 70 | 119 | 23,2 | 571 ms | 0 |

- **Tap en la portada: 0 frames de curl.** El primer volteo del libro no
  enseña curl NUNCA: la textura de la tapa (una lámina 1400×1960) tarda 1,4-1,9 s
  en rasterizarse y el dedo llega antes.
- PNG intermedio: **688 × 964 px, 707-830 kB** por cara (dpr 2, página de 344 px).
- Heap: 11 MB al abrir → **54 MB** tras recorrer los 10 capítulos ida y vuelta.

### CPU 4× (N = 3)

| Ritmo | Camino | curl ms | fps | frame ms | captura/cara | camino |
|---|---|---:|---:|---:|---:|---:|
| asentado | botón › | 400 | 30,0 | 33 | — | 0 |
| asentado | botón ‹ | 670 | 4,9 | 205 | 5135 ms | 0 |
| asentado | deslizar adelante | 259 | 16,5 | 61 | 1555 ms | 0 |
| asentado | deslizar atrás | 229 | 18,9 | 53 | 1554 ms | 0 |
| seguido | botón › | **sin curl** | 15,6 | 64 | 1871 ms | **2** |
| seguido | botón ‹ | **sin curl** | 9,7 | 103 | 4056 ms | **1** |
| seguido | deslizar adelante | **sin curl** | 11,2 | 89 | 7472 ms | **2** |
| seguido | deslizar atrás | **sin curl** | 14,5 | 69 | 7171 ms | **3** |

**Aquí está el fallo, y es reproducible:** al ritmo real de lectura y con la CPU
apretada, **el curl no llega a dibujarse ni una vez** — el volteo entero se pinta
con el pliegue plano del DOM — y hay 1-3 rasterizaciones de snapdom solapando el
gesto.

### CPU 6× (N = 3)

| Ritmo | Camino | curl ms | fps | frame ms | captura/cara | camino |
|---|---|---:|---:|---:|---:|---:|
| — | tap portada | **sin curl** | 2,8 | 353 | — | 0 |
| asentado | botón › | **sin curl** | 3,3 | 303 | 8719 ms | 1 |
| asentado | botón ‹ | 603 | 6,5 | 153 | 3135 ms | 1 |
| asentado | deslizar adelante | **sin curl** | 8,6 | 117 | 7878 ms | 0 |
| asentado | deslizar atrás | 3513 | 8,8 | 114 | 9120 ms | 1 |
| seguido | botón › | **sin curl** | 4,2 | 236 | 6044 ms | 1 |
| seguido | botón ‹ | **sin curl** | 5,0 | 202 | 4258 ms | 2 |
| seguido | deslizar adelante | **sin curl** | 6,6 | 152 | 2858 ms | 3 |
| seguido | deslizar atrás | 3231 | 12,8 | 78 | 3329 ms | 4 |

---

## Lo que la medición dijo que NO era

Tres cosas que parecían la causa y no lo son. Van escritas porque volver a
sospecharlas cuesta una ronda entera.

### 1. «La captura ocurre en el camino crítico del gesto» — a medias

A 1× y con la página asentada, **`camino` es 0 en los 8 caminos y en las 40
pasadas**: cuando el dedo llega, la textura ya está. La librería ya precalienta
las dos hojas vecinas —`Book.mjs`, `warm: index === effectiveTurned || index ===
effectiveTurned - 1`, que en el mapeo del móvil es exactamente N+1 y N−1—, así
que **la precarga que pedía T2 ya existía**.

Lo que sí pasa, y es peor: la librería **vuelve a rasterizar cuatro caras cada
vez que una hoja aterriza**, y ese trabajo cae encima del gesto SIGUIENTE. A 4×
y pasando página cada 500 ms, el curl **no se dibuja ni una vez**. No es la
captura del volteo: es la del volteo anterior.

### 2. «El agarre del `pointerdown` calienta las texturas»

No existe tal cosa. `useDragController.onStart` solo fija el ancla del pliegue
(`flip/drag.mjs` → `handleStart` en `useCurlController.mjs`); no toca snapdom ni
el pool WebGL. El arrastre se siente mejor por otra razón: el pliegue sigue al
dedo desde el primer milímetro, así que no hay un hueco muerto que notar.

### 3. «La letra cambia porque la fuente todavía viene bajando»

Esa carrera existía y T1 la cierra, pero **no era lo que se veía**. Con la
fuente ya en caché y las tres caras cargadas, la cara que gira **sigue saliendo
con otra tipografía**, y por dos motivos que están dentro del snapshot:

- `embedFonts: false` en `snapshot.mjs`. El `<foreignObject>` rasteriza en un
  contexto aislado, sin las `@font-face` del documento. La misma cara con
  `false` y con `true` difiere en el **9,7 % de sus píxeles** y —lo que se ve—
  los saltos de línea **no caen en el mismo sitio**.
- La **capitular** es un `::first-letter`, y snapdom clona nodos: el snapshot
  sale sin ella, y sin el hueco de su `float` el párrafo se recompone entero.

Se ve **siempre**, en los dos libros, en todos los volteos. Lo de «solo se ve en
Verne» describía cuándo se nota, no de dónde viene.

---

## Qué se cambió

| | Dónde | Qué |
|---|---|---|
| **T1** | `index.html`, `libro.css`, `views/libro/index.tsx` | Preload de las tres woff2, `font-display: block`, y el libro no abre hasta que `document.fonts` confirma las tres caras. |
| **T1b** | `views/libro/index.tsx`, `libro.css` | La **capitular** pasa de `::first-letter` a un `<span>` real: los pseudo-elementos no existen para snapdom, y el snapshot salía sin ella. |
| **T2** | `src/vendor/mantine-book/` | Fork de la librería. `flipped` sale de la clave de captura (mitad del trabajo, gratis), caché LRU de 6 caras, la captura espera a que el hilo esté quieto, y `embedFonts: true`. Detalle en [FORK.md](src/vendor/mantine-book/FORK.md). |

---

## Cómo reproducir esto

```bash
# 1. puppeteer-core va en el scratchpad, NO en el repo (LIBRO-runbook §5.1)
mkdir -p /tmp/pptr && cd /tmp/pptr && npm init -y && npm i puppeteer-core

# 2. el bundle instrumentado (producción + un cronómetro sobre snapdom)
cd <repo> && npx vite build --config tests/perf/vite.perf.config.mjs

# 3. las corridas
export RODEO_PUPPETEER=/tmp/pptr/node_modules
node tests/perf/medir.mjs --etiqueta loquesea       # 1×, 4× y 6×
node tests/perf/fuentes.mjs --lenta                 # tipografía, caché fría y Slow 3G
node tests/perf/coste-rasterizado.mjs               # con fork y sin fork, lado a lado
node tests/perf/dpr-snapshot.mjs                    # T3: dpr 2 vs 1,5
node tests/perf/flipping-time.mjs                   # T4: tira de fotogramas por valor

# 4. y la regresión, que no necesita nada de lo anterior
npm run build && node --test tests/mobile-performance.test.mjs
```

Todo sale en `tests/perf/resultados/` (ignorado por git: son megas de PNG y se
regeneran corriendo lo de arriba).

> **Los scripts que PARCHEAN código** —`dpr-snapshot.mjs`, `flipping-time.mjs` y
> `coste-rasterizado.mjs`— tocan un archivo del repo, construyen, miden y lo
> dejan como estaba, también si revientan; al terminar comprueban que volvió
> byte a byte. Si alguno te deja el árbol sucio, es un fallo suyo: mirá
> `git diff` antes de seguir.

---

## El punto de decisión, y qué haríamos si no basta

El banco es headless y sin GPU: **no puede responder cuál es el p95 en el
iPhone de Gus**. Lo que sí dice es de qué está hecho el retardo que queda, y eso
sí viaja: con `camino` en 0 y `gl` en 0 ms, los ~50-100 ms que sobran a 1× **no
son rasterización ni GPU** — son el ida y vuelta de React (evento → `setCara` →
render → `queueStep` del `<Book>` → efecto del `flippedProp` → primer `rAF` del
animador → `active` → efecto de capa → `drawElements`), o sea dos o tres frames
de fontanería. En un teléfono con GPU y una CPU 3-5× más rápida que este banco,
eso son ~16-33 ms.

**Si al probarlo en el teléfono el p95 se queda por encima de ~120 ms**, la
siguiente palanca NO es seguir optimizando el snapshot: es cambiar de técnica.

### La alternativa: doblez con CSS 3D sobre el DOM real

`rotateY` + `backface-visibility` sobre las caras vivas, sin WebGL y sin
snapshot.

| Se gana | Se pierde |
|---|---|
| **Cero rasterización.** No hay snapdom, no hay PNG de 700 kB, no hay caché que acotar ni que invalidar. | **El curl suave se va.** Queda un pliegue rígido de cartulina, no una hoja que se enrolla. Es el efecto que Gus dijo que quería conservar. |
| **El problema de la tipografía desaparece de raíz**, con él la capitular y el `embedFonts`: la cara que gira ES el DOM. | Hay que rehacer la sombra y el brillo a mano; el shader hoy los calcula por normal de superficie. |
| **El texto sigue vivo mientras gira**: las glosas se pueden tocar sin hitboxes encima. | El compositor tiene que promover cada cara a su capa; con 22 hojas hay que vigilar la memoria de texturas del compositor, que no se mide con `performance.memory`. |
| Se acaba el pooling de contextos WebGL y su modo degradado. | Safari compone el 3D distinto: hay que volver a probar los tres casos táctiles desde cero. |

**No está implementada y no debería implementarse sin discutirlo**: cambia el
efecto que motivó elegir esta librería. La decisión es de Gus, no de la
medición.
