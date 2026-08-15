# LIBRO — runbook: cómo se hace un libro interactivo en Hablarte

Este documento es la receta para construir OTRO libro como *Alice in Wonderland*
(`src/views/libro`, `src/content/libro/alicia.ts`, `public/libro/`). Está escrito
después de hacer el primero, así que la mitad del valor está en las **trampas**:
cosas que se ven bien razonando y son falsas al probarlas. Cada trampa de aquí
costó una ronda de feedback de Gus — no las vuelvas a pagar.

> **Regla dura, antes que nada:** nada visual se declara listo sin haberlo
> ABIERTO en un navegador de verdad, capturado y MIRADO la captura. Y nada
> táctil se declara listo sin haberlo probado con inyección de toque real por
> CDP. Razonar sobre el CSS no es verificar. Ver §5.

---

## 1. Qué es un libro, en concreto

Tres piezas, y ninguna sabe de las otras:

| Pieza | Dónde | Qué es |
|---|---|---|
| **Contenido** | `src/content/libro/<obra>.ts` | El cuento en inglés con glosas `⟦en\|\|es⟧`, los phrasal verbs y las rutas de las láminas. Archivo GENERADO (ver §2). |
| **Láminas** | `public/libro/*.webp` | Ilustraciones pintadas, hechas en Canva. 1400×1960 (§3). |
| **Vista** | `src/views/libro/` | El `<Book>` de `@gfazioli/mantine-book`, el lector, el sonido, los gestos. Se REUSA tal cual: un libro nuevo solo cambia el contenido y las láminas. |

La regla del contenido, que es de Gus y no se negocia: **el cuento MISMO lleva
los phrasal verbs y las palabritas curiosas.** No hay lista de vocabulario
aparte. Se aprende leyendo.

---

## 2. El contenido

### 2.1 El formato de glosa

`⟦inglés||español⟧` — corchetes matemáticos dobles (U+27E6 / U+27E7), separador
de DOS barras. Lo parsea `lib/gloss.ts` y lo pinta `<GlossText>`, el mismo de
TALK y ESCENAS: tocar la palabra abre el significado y la guarda al DNA.

El lado izquierdo se lee corrido dentro de la frase. Si al quitar los marcadores
la oración queda mal escrita, el marcador está mal puesto.

### 2.2 Escribirlo con un workflow

Un agente por capítulo + **un corrector por capítulo**, en `pipeline` (no en
`parallel`: no hay barrera que justificar). El prompt del escritor lleva: el
formato de glosa con ejemplos, qué glosar (phrasal verbs primero, luego
sustantivos y adjetivos con sabor), el arco del capítulo, los largos por página,
y el tono — *«Alicia hablando, interactuando, pensando, describiendo texturas,
emociones»*, que fue el pedido literal.

> ### ⚠ TRAMPA 1 — el pase de continuidad corrompe
> En Alicia añadí un tercer pase que miraba los 7 capítulos JUNTOS y devolvía
> correcciones por coordenadas `(capítulo, página)`. **Duplicó páginas**: el
> capítulo 2 quedó con la página 0 y la 1 casi idénticas, y los resúmenes en
> español desalineados. Se descartó entero y se usaron las versiones del
> corrector por capítulo.
>
> Si querés un pase global, que **NO reescriba texto**: que devuelva un informe
> y aplicá vos los cambios. Deduplicar phrasal verbs entre capítulos se hace en
> código, no con un agente.

### 2.3 Validar SIEMPRE antes de usar

Nunca confíes en la salida del workflow. Corré un validador que revise:

- Corchetes balanceados, sin marcadores anidados, sin `|` simple.
- Palabras por página dentro del rango de su rol (§2.4).
- 7–11 glosas por página. Menos no enseña; más es un campo minado.
- Cada phrasal de la lista aparece DE VERDAD glosado en alguna página.
- **Páginas duplicadas**: comparar los primeros ~55 caracteres del texto limpio
  de cada página contra las demás del mismo capítulo. Así se cazó la trampa 1.

### 2.4 Largos, y por qué importan

Los rangos no son estéticos: están calibrados para que **a escala 1.0 no se
desborde NINGUNA cara de texto**. Se midió: a 1.0, 0 de 23 caras desbordan; a
1.3, desbordan 15. Si escribís páginas más largas, el móvil a 130 % se vuelve un
scroll permanente.

---

## 3. Las láminas (Canva)

### 3.1 El prompt que funciona

Tres bloques, en este orden:

1. **Anti-plantilla:** «A single full-bleed painted illustration filling the
   ENTIRE canvas edge to edge. This is a painting, NOT a graphic-design layout:
   no flat color blocks, no rectangles, no template shapes, no sans-serif
   captions.»
2. **Anti-texto, en mayúsculas:** «CRITICAL: absolutely NO TEXT, NO WORDS, NO
   LETTERS, NO SIGNS, NO SIGNPOSTS, NO BANNERS, NO WRITING of any kind
   anywhere.»
3. **La escena**, y al final el **ancla de estilo** — esto es lo que mantiene
   las 16 láminas pareciendo del mismo libro:

   > lush oil-painted Victorian fairytale illustration, deep emerald and teal
   > jewel tones, warm gold highlights, painterly texture

   Para las de PÁGINA COMPLETA, además: «Ornate gold filigree border frame
   around the edges with small playing-card suit symbols in the corners.»
   Para las EMBEBIDAS en una página de texto: **sin marco** — se recortan a 4:3
   y el marco quedaría cortado.

> ### ⚠ TRAMPA 2 — Canva devuelve pósters disfrazados
> Aunque el prompt diga «painting, not a layout», a veces materializa una
> PLANTILLA de póster: bloques de color planos con tipografía sans encima, o
> peor, texto generado ilegible ("KING OF THE THE HUNT" salió literal).
>
> **Detección barata:** mirá el `title` que devuelve `create-design-from-candidate`.
> - `"Afiche - Discover the Magic…"` → es plantilla. Descartá, probá otro candidato.
> - `"Victorian Hallway with Flickering Candlelight"` → es pintura. Sirve.
>
> **Y aun así: exportá y LEÉ el PNG antes de aceptarlo.** El título es un filtro,
> no una garantía. De 16 láminas, 3 hubo que rehacerlas.

### 3.2 Exportar y comprimir

- Exportar a **1400×1960** (la página se ve a ~430 px en móvil; a DPR 3 son
  1290 px, así que 1400 es el mínimo honesto para "alta resolución").
- Convertir a **WebP calidad 80** con `sharp`. Las embebidas, además, recortadas
  a 4:3 (`fit:'cover', position:'centre'`).
- Resultado real en Alicia: 16 láminas, PNG 8.9 MB → **WebP 1.76 MB**.
- `sharp` se instala **temporalmente** y se desinstala al terminar: son ~50 MB
  de devDependency para una conversión de una sola vez.

El service worker ya cachea `/libro/*` cache-first (regla 5 de `sw.js`) sin
tocar nada. La segunda visita abre instantánea y offline.

---

## 4. La estructura del libro

**Son dos libros distintos**, y esto no es un detalle de estilo.

### Escritorio — el libro entero

Dos caras por hoja. Por capítulo: lámina de apertura + las páginas de texto,
con las láminas intermedias embebidas. Se hojea todo.

### Teléfono — solo capítulos

Portada, y por capítulo **lámina de apertura + abrebocas** (con sus phrasal
verbs y el botón LEER). El capítulo completo vive detrás de LEER, en el lector,
y ahí se baja con scroll. Encadenar diez páginas de texto a puros swipes cansa.

> ### ⚠ TRAMPA 3 — una cara por hoja en el móvil, o el gesto se rompe
> El componente **solo deja arrastrar la hoja de arriba de cada mitad**: la
> derecha avanza, la izquierda retrocede. Con dos caras por hoja, la cara
> visible ALTERNA de mitad (los frentes descansan a la derecha, los dorsos ya
> volteados quedan a la izquierda). Como en móvil el marco solo enseña una
> mitad, en la mitad de las páginas el gesto de avanzar habría que hacerlo
> sobre una mitad que ni se ve. Ese era el «deslizo y se mueve al lado
> contrario» de Gus.
>
> **Solución:** en móvil, UNA cara por hoja (frente con contenido, dorso en
> blanco). Así el contenido está siempre en la mitad derecha, el riel se fija en
> `translateX(-pw)` y arrastrar SIEMPRE avanza, con el curl nativo siguiendo el
> dedo.
>
> El puente de índices: `bookPage = k === 0 ? 0 : 2k − 1`, y de vuelta
> `k = floor((page + 1) / 2)`.

---

## 5. Cómo se verifica (la parte que más ahorra)

### 5.1 Los eventos sintéticos de JS MIENTEN

`element.dispatchEvent(new PointerEvent(...))` no pasa por el pipeline de
entrada del navegador: no es *trusted*, no activa la captura de puntero, ignora
`touch-action` y no genera la cadena touch→pointer→mouse. **Dio falsos positivos
y falsos negativos en las dos direcciones.**

Lo que sirve: **`puppeteer-core` + `page.touchscreen`** (que por dentro es
`Input.dispatchTouchEvent` de CDP), con `isMobile: true, hasTouch: true` y UA de
Android. Se instala en el scratchpad, no en el repo.

Con eso aparecieron TRES fallos que ninguna otra herramienta mostró:

> ### ⚠ TRAMPA 4 — `touch-action` en los contenedores con scroll
> `.libro-cuerpo` tiene `overflow-y: auto` y estaba en `touch-action: auto`, así
> que el navegador se quedaba con **cualquier** gesto que empezara ahí —también
> los horizontales— para hacer scroll, y disparaba `pointercancel`: el arrastre
> del libro moría al primer `pointermove`. Medido: `pointerdown 1, pointermove 1,
> pointercancel 1`.
> **Arreglo:** `touch-action: pan-y`. Lo vertical sigue siendo del navegador, lo
> horizontal queda para el libro.

> ### ⚠ TRAMPA 5 — `flipThreshold` mide hasta el LOMO
> Por defecto vale 50: la hoja se voltea si el dedo cruza la mitad del recorrido
> entre el borde libre y el lomo. En la plana de escritorio el lomo está a la
> vista, en el centro. **En el móvil el lomo cae justo en el borde izquierdo de
> la pantalla**, así que llegar al 50 % obliga a salirse del teléfono. Medido:
> agarrar al 90 % del ancho y deslizar dos tercios no volteaba nada.
> **Arreglo:** en móvil `flipThreshold={20}` y `swipeTimeThreshold={420}` (los
> 250 ms por defecto son poco para un pulgar en una pantalla de 6").

> ### ⚠ TRAMPA 6 — el `<Book>` corta la propagación, y se traga `page`
> Dos cosas distintas, las dos dolorosas:
> 1. Llama `stopPropagation()` en sus handlers **de React Y nativos**. Un
>    `onPointerUp={...}` en un ancestro no se ejecuta nunca. Los listeners
>    propios tienen que ir **nativos y en fase de CAPTURA**.
> 2. Mientras está en su arrastre **ignora los cambios del prop `page`**. Medido:
>    la rama corría con `dx=+216` y la página no se movía. Para navegar contra su
>    gesto hay que **mandarle un `pointercancel`** en cuanto se decide, o diferir
>    el cambio.

### 5.2 El panel del navegador embebido puede mentir también

Si el Browser pane no está visible **no compone frames**, y `getComputedStyle`
devuelve valores obsoletos (me reportó `transform: none` sobre un elemento que
sí tenía transform inline). Para medir layout: `chrome-devtools` con `emulate`
(`390x844x3,mobile,touch`) o Puppeteer headless.

### 5.3 Medir, no teorizar

Cuando algo "se siente raro", muestrealo cuadro a cuadro con `requestAnimationFrame`
en vez de adivinar. Así se encontró que el volteo por BOTÓN no arranca el curl
hasta 180–360 ms después: el componente pinta cada cara como una TEXTURA (un
screenshot del DOM hecho por snapdom) y mientras no la tiene enseña el pliegue
plano.

> ### ⚠ TRAMPA 7 — la explicación del "agarre" era falsa
> De esa misma medición salió una conclusión razonable y equivocada: que el
> arrastre se siente mejor «porque el agarre del `pointerdown` calienta las
> texturas». **No existe tal cosa.** `useDragController.onStart` solo fija el
> ancla del pliegue; no toca snapdom ni el pool WebGL (se leyó el código de la
> librería, no se dedujo). El arrastre se siente mejor por otra razón: el
> pliegue sigue al dedo desde el primer milímetro, así que no hay hueco muerto
> que notar.
>
> Y el hueco tampoco lo abre la captura DE ESE volteo: la librería ya
> precalienta las dos hojas vecinas. Lo que lo abre es que **rehace cuatro caras
> cada vez que una hoja aterriza**, y ese trabajo cae encima del gesto
> SIGUIENTE. Medido a 4× de CPU y pasando página cada 500 ms, el curl no llegaba
> a dibujarse ni una vez.
>
> Todo esto está con números en [PERF-libro.md](PERF-libro.md), y el arnés que
> los saca (con toque real por CDP) vive en `tests/perf/`. **Antes de tocar el
> rendimiento del libro, corré `tests/perf/medir.mjs` y comparalo con esa
> tabla.** El curl y las texturas los sirve un fork vendorizado de la librería:
> `src/vendor/mantine-book/FORK.md`.

---

## 6. Integrarlo en la app

Checklist, todo pequeño:

1. `src/stores/app.ts` → agregar la vista al tipo `View` y a `VISTAS`.
2. `src/App.tsx` → `lazy()` + rama en el switch. Y **la excepción del `pb`**: el
   libro se mide contra el alto disponible, así que los 84 px de la tab bar le
   recortan página (`view === 'libro'` ya está en esa lista).
3. `src/components/rodeo/carrusel-features.tsx` → la carta.
4. **Fuentes self-hosted** en `public/fonts/`. Un `@import` a Google Fonts muere
   bajo el CSP del artifact y la fuente cae a Georgia sin avisar. Ojo: Google
   sirve el MISMO woff2 para 400 y 700 de Libre Baskerville — los pesos reales
   se bajan de Fontsource.
5. Mantine en su variante `.layer.css`, para que Tailwind (sin capa) siga
   ganando.

---

## 7. Entregarlo

- **Artifact tocable:** `DEMO_VIEW=libro DEMO_TITLE="…" node scripts/hacer-demo.mjs`
  → un solo HTML con todo embebido. Aterriza directo en la vista.
- **Rama:** trabajar sobre la punta de `claude/rodeo-repo-info-nw2025` y empujar
  como fast-forward. Vercel despliega solo.
- El `#/<vista>` en la URL abre directo en una sección (`stores/app.ts` lo lee al
  crear el store).

---

## 8. El próximo libro: la especificación que pidió Gus

Más capítulos y MÁS ILUSTRACIONES, pero los capítulos **igual de cortos que los
de Alicia** — «muy resumidos», dijo Gus. Lo que crece es el número de capítulos
y de láminas, no el largo de cada capítulo:

| | Alicia (hecho) | El próximo |
|---|---|---|
| Capítulos | 7 | **10** |
| Páginas por capítulo | 5 (~430 palabras) | **5 (~430 palabras)** ← igual |
| Láminas por capítulo | 2 (apertura + mitad) | **4 (apertura + 3 dentro)** |
| Láminas totales | 16 | **42** (40 + tapa + contra) |
| Palabras | ~3.000 | **~4.300** |

**No inventes páginas más largas.** Los rangos de §2.4 están calibrados para que
a escala 1.0 no se desborde ninguna cara; duplicarlos rompería eso.

Estructura por capítulo: 6 caras = 3 hojas, exactamente como Alicia —

    cara 0  lámina de apertura
    cara 1  abrebocas + phrasal verbs + LEER
    cara 2  texto
    cara 3  texto + lámina 1
    cara 4  texto + lámina 2
    cara 5  texto + lámina 3

Es el mismo esqueleto que ya funciona: solo cambia que las caras 3, 4 y 5 llevan
lámina embebida en vez de una sola en la 3. Total: 32 hojas / 64 caras.

**Las tres láminas se reparten por el SCROLL del lector.** El pedido de Gus es
que «se vean distribuidas mientras uno va haciendo scroll down»: en el lector a
pantalla completa, cada lámina va intercalada en el punto del cuento que le
toca, no todas juntas. Hoy el lector ya inserta la lámina de la mitad antes de
la página 2 (`src/views/libro/index.tsx`, el bloque `{i === 2 && <img …>}`);
para tres, insertar antes de las páginas 2, 3 y 4.

En el móvil no cambia nada: sigue siendo lámina de apertura + abrebocas por
capítulo, y el capítulo entero por LEER.

> **Ojo con el peso.** 42 láminas en WebP son ~4,6 MB. El artifact single-file
> pasaría de 7,5 MB a ~12 MB, que en datos móviles es mucha primera carga. Para
> este libro, **la URL de Vercel es el vehículo de revisión**, no el artifact.
> Gus ya dijo que una pantalla de carga de 5–7 s le parece bien si después se
> siente liviano: precargá todo ahí con el `PencilLoader`, como ya hace Alicia.

### Candidatos, y por qué

1. **Around the World in Eighty Days** (Verne, dominio público). *La que
   recomiendo.* Cada capítulo es un país distinto — la variedad visual sale
   sola y las 40 láminas no se repiten. El vocabulario es de viaje, transporte,
   dinero y apuros: útil de verdad. Y 10 capítulos = 10 escalas, el mapa cuadra
   sin forzar.
2. **Sherlock Holmes** (los relatos ya en dominio público). Es el más
   DIALOGADO, y el diálogo es donde viven los phrasal verbs naturales — que es
   exactamente lo que enseña Hablarte. Cada relato es autoconclusivo, así que los
   10 capítulos pueden ser 10 casos.
3. **Treasure Island** (Stevenson). Empuje narrativo puro: engancha y hace
   querer pasar la página. Inglés náutico e idiomático, muy visual.

Cuidado con *The Jungle Book* y con textos coloniales de la época: el encuadre
envejeció mal y habría que reescribir más de lo que conviene.
