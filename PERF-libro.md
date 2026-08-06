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
