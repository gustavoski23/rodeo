# MUNDO — el mapa de A1 como un sitio, no como una lista

Cómo se ve, cómo se hornea y cuánto pesa el mundo abierto que va **debajo** del
camino serpiente de `src/views/a1/mapa.tsx`. Los ocho tramos de
`src/content/a1/tramos.ts` dejan de ser cabeceras de capítulo y pasan a ser
**ocho regiones de un sitio**, la mayoría en niebla.

> **Blender es la panadería, no el motor.** Se modela y se renderiza en
> Blender; al teléfono llegan **imágenes horneadas**. El runtime sigue siendo
> DOM + CSS, sin canvas.
>
> No es pereza, es la restricción dura del proyecto: `src/lib/device.ts:1`
> define `MODO_LIGERO` como `(max-width: 767px), (pointer: coarse),
> (prefers-reduced-motion: reduce)` — **todo teléfono lo cumple** — y el repo lo
> respeta a rajatabla (`src/views/talk/orb-avatar.tsx:216` monta el canvas WebGL
> solo con `!MODO_LIGERO`). O sea que hoy, en el celular de Gus, **no corre
> WebGL en ninguna pantalla, a propósito**. El mapa es la pantalla más usada del
> módulo: no es el sitio para estrenar un canvas. Referencia de peso:
> `public/assets/3d/lens.glb` pesa 146 kB por **una lente**.

**Y lo más importante, que no es técnico: la sensación de mundo desconocido la
da la NIEBLA, no los polígonos.** Los tramos ya se llaman como resultados de
vida — «Salés del país», «Viaje de trabajo», «Tu trabajo», «Tu vida afuera» —
así que el trabajo es hacer eso **visible y apagado** desde el día uno.

| | |
|---|---|
| Estado | **HECHO Y MONTADO.** Ocho láminas en `public/assets/mundo/`, montadas en `src/views/a1/mapa.tsx` |
| Arte | tinta y aguada · `…/scratchpad/mundo/regiones-final/*.png` · generador `generar-regiones.mjs` |
| Horneado | `…/scratchpad/mundo/f6-hornear-tinta.mjs` → 8 WebP + `src/views/a1/mundo-laminas.ts` |
| Estilos | `src/views/a1/mundo.css` |
| Peso real | **231,0 kB** el mundo entero · **30,8 kB** la primera pantalla |
| Capturas | `…/scratchpad/qa/f6-*.png` |

---

## 0 · LO QUE CAMBIÓ AL EJECUTARLO (leer antes que nada)

Este documento se escribió ANTES de hacer el arte y planificaba una cosa; se
hizo otra. Lo de abajo manda sobre las secciones §A.1–A.4 y §C.1–C.4, que se
dejan porque explican **por qué** se descartó cada camino, no porque describan lo
que corre.

**1 · El arte NO salió de Blender, salió de un modelo de imagen, y no es una
plancha de luz: es TINTA Y AGUADA.** Una página de cuaderno de viaje de
arquitecto — línea negra de un solo grosor sobre aguadas de ocre y verdeazulado,
grano de papel prensado en frío, papel desnudo en media lámina. Se eligió
mirando cuatro direcciones dibujadas, no razonando.

Eso rompió el supuesto que sostenía §A.4: ahí la lámina era gris con alfa y el
COLOR lo ponía el token `--card-*` del tramo desde CSS, y por eso una sola lámina
servía en los dos temas. Con tinta no se puede: el fondo es papel blanco y la
losa **también** es papel blanco — mismo valor, nada que recortar. Así que la
lámina va **entera y opaca, con su papel incluido**, y el tema se resuelve con
dos reglas de CSS que no cuestan ni un byte ni una petición (§0.4).

**2 · SE FUE EL MOSAICO DE SUELO.** Era la segunda pieza de cada región: 304 px
que se repetían hacia abajo hasta acabarse los nodos del tramo. Se cayó por dos
razones y las dos se vieron en captura:

- **El empalme cortaba en seco.** El horizonte terminaba y empezaba el mosaico, y
  la costura no leía como "la maqueta sigue": leía como *la maqueta se acabó y
  abajo empieza otro piso*. Un mosaico anónimo debajo de un sitio con identidad
  compite con él en vez de prolongarlo.
- **Era el único número del presupuesto que no cerraba.** 55 de los 85 kB de la
  primera pantalla eran el mosaico, contra un techo de 60.

Ahora **cada región es su horizonte y nada más**: 240 px pegados al comienzo del
capítulo, y debajo el camino corre sobre el fondo de la app con la lámina
desvaneciéndose. El total bajó a 231 kB (techo 400) y la primera pantalla a
30,8 (techo 60). Y de paso desaparecieron dos restricciones que costaban caro: el
período de 30,4 m atado a `4 × PASO` (§A.2), y la regla de autoría de los
primeros y últimos 3,8 m vacíos (§A.6/C.2). Ya no hay nada que se repita.

**3 · dpr 2 y no dpr 3.** 780 px de ancho. A dpr 3 las láminas de tinta daban
477 kB contra un techo de 400: la textura de papel es ruido de alta frecuencia,
que es justo lo que peor comprime. Y una aguada no tiene bordes duros — la
densidad triple no le compra nitidez a algo que ya es difuso. WebP **q70**, la
rodilla de la curva medida para este material.

**4 · Un tema, dos reglas de CSS, una sola lámina** (`src/views/a1/mundo.css`):

| | Qué | Dónde | Por qué |
|---|---|---|---|
| Fundido | alfa vertical: opaco hasta el 62 %, nada desde el 96 % | **horneado en el WebP** | Sin él la lámina termina en un corte recto y parece una imagen rota. Va en el alfa y no en `mask-image` porque una máscara obliga a una capa de composición por región y son ocho en el mismo scroller. Cuesta +13,7 kB en total (+6,3 %) y quita ocho capas. |
| Penumbra | `brightness(.42) contrast(1.22) sepia(.18)` | CSS, **solo en oscuro** | Un papel blanco en tema oscuro es un foco. El filtro lo baja a papel viejo; el dibujo sobrevive porque la tinta ya era lo más oscuro que había. |

El tema de RODEO es el atributo `data-theme` en `<html>` y **oscuro es la
AUSENCIA del atributo**, no `[data-theme='dark']` (tokens.css). El selector es
`:root:not([data-theme='light'])`.

**5 · La niebla es por TRAMO y binaria.** Un capítulo va en niebla cuando
**ninguna** de sus paradas está hecha ni abierta — o sea, cuando es todo candado
o todo «pronto». Un velo de `--bg-void` encima de la lámina, dentro del mismo
fundido: 0,83 en oscuro, 0,74 en claro (valores del prototipo).

El prototipo tenía un degradado por progreso DENTRO de cada región, y se cayó con
el mosaico: con la lámina reducida a los primeros 240 px del capítulo, la
frontera interesante ya no está dentro de un tramo sino ENTRE dos, y ahí un
booleano dice lo mismo con una expresión.

**El nombre lo pone la cabecera pegajosa del tramo, no un topónimo sobre la
lámina.** El prototipo dibujaba el nombre encima de la región con un halo de
`text-shadow`; acá sobra, porque la cabecera va justo arriba, es opaca
(`--bg-surface`) y ya trae ícono + título + promesa. Un topónimo repetiría el
mismo texto dos veces con cuatro píxeles de separación. Verificado en captura:
en `f6-d-tour-t4-niebla.png` se lee «Viaje de trabajo · Inglés de oficina, pero
afuera · pronto» y debajo, apagado, el centro de convenciones a medio montar.

**6 · Y sigue en pie el regalo: la niebla es también el estado de carga.** Una
región lejana cuya lámina todavía no se descargó se ve igual que una que sí está,
porque las dos están tapadas. Por eso las láminas **no entran en `APP_WARM`**
(§0.7).

**7 · Service worker: NO se precachean.** `sw.js` precachea `APP_WARM` en el
`install`, o sea que todo lo que entre ahí se baja **en datos móviles la primera
vez que se abre la app**. Meter las ocho serían 231 kB antes de la primera
lección, y un mundo que hay que descargar entero antes de empezar es peor que un
mundo que aparece región por región. Se quedan con la **ruta 5** del router
(`cache-first` para estáticos same-origin): cada región se cachea la primera vez
que se ve. Lo único que tiene que estar para que el mapa se sienta completo es la
región donde estás, y son 30,8 kB.

El corolario obligatorio de servir cache-first es que **el nombre lleva hash de
contenido**: bajo una URL fija, un WebP queda congelado en el teléfono hasta que
alguien suba `VERSION` del service worker. Con el hash, rehornear una región
estrena URL y no invalida el resto. Por eso `src/views/a1/mundo-laminas.ts` está
**generado** y dice que no se edite a mano: un hash mal tecleado da un 404 que en
el mapa se ve exactamente igual que una región que todavía no se bajó.

**8 · Cuadros por segundo: medidos, y el mundo sale gratis.** Era el riesgo
abierto del documento y nadie lo había medido. Scroll continuo de los 5.413 px
del mundo entero, 384 cuadros, a 390×844 dpr 3:

| | media | p95 | peor cuadro | cuadros > 20 ms |
|---|---:|---:|---:|---:|
| con las ocho láminas | **60,0 fps** | **55,9 fps** | 20,0 ms | 0 |
| sin ellas (`display:none`) | 60,0 fps | 55,9 fps | 18,4 ms | 0 |

**Coste del mundo: 0,0 fps de media y 0,0 en el p95.** Se mide con y sin, porque
un número suelto dice cómo va este headless y no lo que cuesta el mundo; la resta
sí lo dice. Que dé cero era esperable después de quitar las máscaras: lo que
queda por región es una imagen de fondo y, cuando hay niebla, un rectángulo de
color plano — las dos operaciones más baratas que sabe hacer un compositor.

> **La medición es de Chrome headless sin GPU en un escritorio, no de un Android
> de gama media.** Lo que prueba es que no hay un coste estructural (capas de
> composición de más, repintados por cuadro); no prueba el p95 en el teléfono de
> Gus. Eso sigue pendiente, ahora en `tests/perf/`.

**9 · Las dos manchas del arte, y qué se hizo con cada una.**

- **El t5 salió como una FACHADA dos veces seguidas** — un muro visto de frente
  llenando el encuadre — mientras sus siete hermanas son una rebanada de suelo
  con cosas encima. El defecto no era la palabra «pasillo»: era que **una pared
  quedaba PARALELA al plano de la imagen**, y con la cámara girada 20° esa es la
  única superficie que se ve de frente, así que el modelo la toma como el sujeto.
  Se arregló con geometría, no con énfasis: **un rellano con las cuatro puertas
  repartidas en dos muros sueltos en L**, con los extremos cortados a la vista.
  Costó tres tandas más (rondas 4, 5 y 6): la 4 devolvió la planta pero con fondo
  gris taupe —con las paredes blancas llenando el cuadro el modelo se inventó un
  tono que las recortara— y la 5 arregló el fondo pero perdió la tinta y volvió
  con aspecto de render CAD. La 6 cerró las tres cosas.
- **El t0 trajo SIETE tablillas con TAXI dos veces**, aunque el prompt lo prohíbe
  explícito dos veces («each of those words appears ONCE»). Se arregló
  **retocando, no regenerando**: volver a tirar el dado arriesgaba las otras seis
  palabras, que salieron bien escritas. `f6-quitar-taxi.mjs` borra la tablilla de
  arriba y su poste con **tres parches clonados**. El primer intento interpolaba
  cada fila entre sus vecinos y sobre el suelo dejó una banda pálida y **partió
  en dos la línea de contorno del montículo** — una línea de tinta cortada es
  peor que el poste sobrante. Se clona, y el parche del suelo se clona **en
  diagonal** (−20 px en x pide +10 en y) porque las bandas del terreno tienen
  pendiente −0,52 y un clon horizontal deja un escalón.

**10 · Lo que NO se hizo, a propósito.** El punto 4 de §A.7 —pasar el rótulo del
nodo actual a `--card-ink`— **no se ejecutó**, y no es un olvido: su premisa
murió con la plancha de luz. §A.7 lo pedía porque el rótulo caía sobre un plato
del color del tramo (amarillo, por ejemplo) y el durazno de `--accent` no leía
encima. Ahora detrás del rótulo hay papel, no color de tramo, y `--card-ink` (L21
en claro, L24 en oscuro) sería **invisible sobre la penumbra**. Verificado en
captura, en los dos temas: el título en `--text-primary` y el pie en `--accent`
se leen sobre el papel claro y sobre la penumbra. Se deja como está.

---

## A · DIRECCIÓN DE ARTE

> **§A.1–A.6 describen la dirección que NO se hizo** (maqueta 3D en Blender,
> plancha de luz gris teñida por CSS, horizonte + mosaico). Se dejan porque
> explican qué se probó y por qué se descartó cada cosa — la geometría de §A.2,
> la lista de §A.5 y el encuadre de §A.6 siguen siendo el criterio con el que se
> juzga una lámina nueva. Lo que corre está en **§0**. **§A.7 sí está al día.**

### A.1 · La idea en una línea

**Cada región es una LOSA de maqueta flotando sobre el fondo de la app**, con su
canto a la vista, vista desde arriba en ortográfica. No es un paisaje: es un
objeto sobre una mesa. El camino serpiente corre por encima.

Esto no salió de una referencia, salió de la geometría: **en proyección
ortográfica no hay línea de horizonte** (las paralelas no convergen), así que un
plano de suelo infinito llena el encuadre entero y no queda cielo. El cielo solo
existe si el suelo **termina**. Se descubrió dibujándolo — la primera tanda de
láminas salió como un rectángulo de color de borde a borde, sin figura ni fondo.

Que sea una maqueta también resuelve la escala: los edificios no están a escala
arquitectónica, están a **escala de prop**, y la regla del mundo es la figura
humana de 1,70 m.

### A.2 · Cámara y proyección — los números

| | Valor | Por qué ESE |
|---|---|---|
| Tipo | **Ortográfica** | Es lo único que permite que el mosaico de suelo se repita sin costura: con perspectiva, la convergencia del borde de arriba no empalma con la del borde de abajo. |
| `ortho_scale` | **19,5** | 1170 px de render ÷ 60 px/m. Da un ancho de mundo de 19,5 m por región. |
| Rotación (Euler XYZ) | **(60°, 0°, −20°)** | El pitch de 60° comprime la profundidad a `cos 60° = 0,50` y deja la altura en `sin 60° = 0,866`. El yaw de −20° saca un costado a los objetos para que se lean sólidos. **No 45°:** 45° es el ángulo de todo el 3D isométrico de stock del planeta, y además convierte la región en un rombo cuyo eje de scroll es diagonal. Con yaw arbitrario y **sin roll**, las verticales del mundo siguen siendo verticales en pantalla — la condición que hace que el camino vertical funcione encima. |
| Escala | **60 px/m a dpr 3** (40 a dpr 2, 20 a dpr 1) | Una persona de 1,70 m mide 88 px de alto a dpr 3, o sea ~29 px en CSS: se lee como figura, no compite con un nodo de 68 px. |
| Proyección resultante | `x = u·s` · `y = −(v·cos60 + z·sin60)·s` | Profundidad y altura suben las dos en pantalla. Con el signo al revés (primer intento) los edificios lejanos quedaban **debajo** del suelo. |
| Período del mosaico | **30,4 m de fondo** (8 celdas de 3,8 m) | 30,4 × 0,5 × 60 = 912 px = 304 CSS = **4 × PASO**. El desfase de la serpiente es senoidal con período 4 (`desfase(k)` en `mapa.tsx`), así que un mosaico de exactamente 4 nodos cae siempre en la misma fase del camino. Con cualquier otro alto el mosaico **late** contra los nodos y el repetido se hace visible. |

### A.3 · Luz y sombra

- **Una sola Sun**, energía ~3, desde **arriba-a-la-izquierda** (elevación 35°,
  azimut −35° respecto de la cámara). La izquierda no es capricho: `ladoLibre()`
  en `mapa.tsx` pone el rótulo del nodo actual **a la izquierda** cuando el nodo
  se corrió a la derecha, así que las sombras tienen que caer hacia la derecha y
  dejar ese lado limpio.
- **Ambiente del mundo a 0,15** para que la oclusión no se cierre a negro.
- **Ninguna luz de color.** La lámina es monocroma; una luz de color pelearía
  con el token del tramo.
- **Un solo material de arcilla mate** en todo: Principled BSDF, base blanca,
  roughness 0,9, specular 0.
- **Sin denoise a medias: denoise a fondo.** El grano NO se hornea (§C.4).

### A.4 · Color, y cómo la MISMA lámina sirve en tema claro y en oscuro

Este era el problema más difícil del encargo, porque una imagen horneada no se
adapta sola. La solución es que **la lámina no lleva color**:

> **La lámina es una PLANCHA DE LUZ: gris con alfa. El color lo pone el token
> `--card-*` del tramo, desde CSS, y ese token ya cambia con el tema.**

Tres capas por región, ninguna de ellas duplicada por tema:

1. **El plato** — `background: var(--card-<tema>)`, **recortado por el alfa de
   la propia lámina** (`mask-image`). El color existe solo donde hay losa; sobre
   la losa queda `--bg-void`, que ya es negro de noche y papel de día.
2. **La luz** — la lámina en `mix-blend-mode: multiply`.
3. **La niebla** — `--bg-void` con una máscara de degradado (§A.6).

**Por qué el multiply funciona igual en los dos temas:** todos los `--card-*`
son pasteles **claros en ambos** — oscuro L76–95, claro L84–97
(`src/styles/tokens.css:62-68` y `:155-161`). El tema claro no invierte las
cards: solo las apaga un punto y les da borde. Así que multiply siempre oscurece
hacia el mismo lado y con el mismo carácter. **Verificado con captura**, no
razonado: `qa/09-claro-frontera.png` y `qa/10-claro-niebla.png`.

El corolario bonito es que **la niebla también es gratis en los dos temas**:
en oscuro es la noche comiéndose la región, en claro es una neblina blanca. Es
el mismo `--bg-void` y el mismo único archivo.

**Paleta por región** — atada al `cardTheme` que cada tramo ya declara en
`tramos.ts`. **Nada de coral en ninguna:** en RODEO el coral significa error, y
una región del mundo no es un castigo.

| Tramo | `cardTheme` | Token |
|---|---|---|
| t0 · Antes de hablar | `green` | `--card-green` |
| t1 · El primer día | `blue` | `--card-blue` |
| t2 · La oficina de todos los días | `lavender` | `--card-lavender` |
| t3 · Salés del país | `yellow` | `--card-yellow` |
| t4 · Viaje de trabajo | `peach` | `--card-peach` |
| t5 · Tu trabajo | `blue` | `--card-blue` |
| t6 · Tu vida afuera | `green` | `--card-green` |
| t7 · Ayer y mañana | `lavender` | `--card-lavender` |

> El azul y el verde se repiten (t1/t5, t0/t6) y **está bien**: no son vecinas,
> y el par repetido rima con el contenido — t0 y t6 son los dos «tu vida», t1 y
> t5 los dos «tu trabajo». Lo que diferencia a las regiones del mismo color es
> la SILUETA, no el tono.

**La rampa de grises de la plancha** (255 = no toca el plato, 0 = negro). Salió
de mirar capturas, no de razonarla:

| Elemento | Gris | Multiplica |
|---|---:|---:|
| Cielo (alfa 0) | — | 1,00 |
| Cara superior de un prop | 220 | 0,86 |
| **Suelo** | **186** | **0,73** |
| Retícula del suelo | 176 | 0,69 |
| Cara iluminada | 174 | 0,68 |
| Cara en sombra | 118 | 0,46 |
| Canto de la losa | 106 | 0,42 |
| Hueco (puerta, ventana, entrada) | 74 | 0,29 |

Dos reglas que salen de ahí:

- **El suelo va MÁS OSCURO que los techos de los props.** El primer intento
  tenía el suelo en 0,89 y los bultos eran fantasmas: todo el encuadre vivía en
  el 10 % superior del rango. Con el suelo en penumbra y los techos claros, los
  props se recortan como tejados al sol, y funciona con los siete pasteles.
- **Nada baja de 0,26.** Por debajo la lámina deja de ser luz y empieza a ser
  tinta: el pastel se pierde y las siete regiones se ven iguales.

### A.5 · Qué hace que NO parezca 3D genérico de AI (regla #4)

Prohibido, y es una lista de cosas concretas que se pueden buscar en el `.blend`:

- **El Principled BSDF por defecto** (blanco, roughness 0,5, con specular). Es
  literalmente la firma del render de stock. Todo va a un único material de
  arcilla mate.
- **Bevel de 2 mm en cada canto + subsurf.** La lectura «render de producto» es
  la mitad de lo que hace que algo se vea comprado.
- **Reflejos, cristal, profundidad de campo, SSR, bloom.** Nada de eso sobrevive
  a un multiply monocromo, así que si aparece es porque alguien está
  renderizando «bonito» en vez de renderizando una plancha.
- **Gradientes púrpura y cielos violeta-naranja.** Explícito en el DESIGN-BRIEF.
- **Low-poly de paleta arcoíris.** El color no vive en el render.
- **Figuras humanas con cara.** Las siluetas son bultos. El único que tiene cara
  en RODEO es Alfred.
- **Iconos flotando en el aire** (el set de «3D icons» de Figma).
- **Simetría perfecta.** La ciudad va alineada al eje y **los objetos sueltos
  van girados** ±8–25°: es lo que les saca un costado y lo que impide que la
  región se lea como una plantilla. El camino ya se mueve; el mundo no puede
  estar centrado.
- **Nada de texto en el render**, con UNA excepción: el t0, que va de leer
  letreros (§B.1).

Obligatorio, en cambio:

- **Grano** — pero el de la app, no el del render. El overlay de `fractalNoise`
  con `mix-blend-mode: overlay` ya existe (DESIGN-BRIEF, «Efectos ambientales»),
  ya está encima de todo, **no repite contra el mosaico** y sale gratis. Ver
  §C.4: hornearlo cuesta +98 % de bytes y encima se ve peor.
- **Sombra de contacto en todo prop.** Sin ella los objetos flotan.
- **El canto de la losa a la vista.** Es lo que declara la maqueta.

### A.6 · Escala, encuadre y empalme

**Una región en un teléfono de 390 px.** El ancho útil a sangre dentro de la
`<Card>` del mapa es **364 px**, no 390 — se van 12 px de margen de página y 1
de borde de la Card por lado (medido en el prototipo). La lámina se autora a 390
y se estira a 364: **6,7 % de compresión horizontal**.

> Se eligió comprimir antes que dejar el alto libre. Con `background-size: 100%
> auto` el mosaico pasaría a medir 284 px y dejaría de caer cada 4 nodos, y **un
> mosaico que late contra el camino sí se ve**; un 7 % de compresión en un
> diorama, no. Los dos altos van en px fijos y el ancho en 100 %.

**Zona segura: 24 px a cada lado.** Nada que importe puede vivir ahí.

**Dos piezas por región, no una:**

```
┌─────────────────┐  HORIZONTE  390 × 240 CSS  (1170 × 720 @3)
│   la identidad  │  la lámina que dice QUÉ SITIO ES. Lleva el cielo
│   del sitio     │  (alfa 0) y los tres primeros nodos encima.
├─────────────────┤
│                 │  MOSAICO    390 × 304 CSS  (1170 × 912 @3)
│   se repite     │  se repite hasta que se acaben los nodos del tramo.
│   hasta abajo   │  304 = 4 × PASO.
└─────────────────┘
```

**El horizonte NO añade scroll**: ocupa los primeros 240 px del propio camino
del tramo. Un tramo de N nodos mide `N × 76` px y punto.

**Cuánto scroll es el mundo entero** (nodos = escenas reales del contenido):

| Tramo | Nodos | px | Origen del conteo |
|---|---:|---:|---|
| t0 | 17 | 1292 | `t0-antes-de-hablar.ts`, 6 unidades |
| t1 | 7 | 532 | `core.ts`, u1+u2+u3 |
| t2 | 14 | 1064 | `core.ts` u4–u7 (12) + 2 `PENDIENTES` |
| t3 | 17 | 1292 | `t3-viaje.ts`, 8 unidades |
| t4 | 5 | 380 | 5 `PENDIENTES` |
| t5 | 3 | 228 | el pack de trabajo activo |
| t6 | 4 | 304 | 4 `PENDIENTES` |
| t7 | 4 | 304 | 4 `PENDIENTES` |
| **Total** | **71** | **5396** | + cabeceras y bloque de arriba = **6237 px medidos** = **7,4 pantallas** |

**Cómo empalma con la vecina, sin costura:**

- **Dentro de la región**, el mosaico repite en `v` (la profundidad del marco
  del `EJE_MUNDO`) con período 30,4 m. Regla de autoría dura: **los primeros y
  últimos 3,8 m del mosaico van vacíos de props** — suelo pelado. Así el
  repetido no tiene ningún hito que lo delate.
- **Entre regiones** NO hay lámina de transición. El borde es la cabecera
  pegajosa del tramo siguiente (opaca, `--bg-surface`) más el corredor de
  `--bg-void` que deja el cielo del horizonte. Siete transiciones horneadas
  serían siete láminas más para resolver algo que el fondo de la app ya resuelve.

### A.7 · Lo que se cambió en `mapa.tsx` — HECHO (ver §0.10 para el que no)

Con una región dibujada debajo, tres cosas del camino dejaban de verse. Las tres
están aplicadas; la cuarta se descartó con motivo (§0.10).

1. ✅ **La carretera va ENTINTADA, no en `cap.color` pleno.**
   `color-mix(in oklab, ${cap.color} 55%, oklch(38% 0 0))` en lo hecho, 30 % en
   lo abierto, `--borde-sutil` en lo cerrado.
   **El valor cambió respecto de lo planeado.** §A.7 pedía tinta pura
   (`var(--card-ink)` al 62/26/14 %) porque la carretera caía sobre un plato del
   MISMO color del tramo. Con la lámina de tinta hay tres fondos distintos, no
   uno: el papel en tema claro (L≈98), la penumbra de esa misma lámina en oscuro
   (L≈40), y `--bg-surface` **debajo de los 240 px de región** (L17 en oscuro,
   L100 en claro), que ahora es donde vive la mayor parte del camino. Un pastel
   pleno se pierde sobre el papel; la tinta pura se perdía sobre `--bg-surface`
   en oscuro. Entintar el color del tramo contra un gris neutro lo deja a media
   luz: se ve sobre los tres y sigue diciendo de qué tramo es.
2. ✅ **El nodo `hecho` va con el color del tramo ENTINTADO**, no pleno:
   `color-mix(in oklab, var(--tema) 70%, oklch(38% 0 0))`. Se mezcla en **oklab
   contra un gris neutro y NO contra `--card-ink`** — `--card-ink` es azulado
   (hue 265) y mezclarlo con el verde del t0 daba un nodo turquesa, o sea otro
   color de tramo. El **único** nodo con el color pleno es el actual.
3. ✅ **Todo nodo lleva un anillo de tinta** de 1 px
   (`box-shadow: 0 0 0 1px color-mix(in oklch, var(--card-ink) 30%, transparent)`).
   Sin él, el nodo `abierto` (fondo `--bg-surface`) **desaparece en tema
   claro**: blanco sobre papel da ~1,05:1. Va junto con la sombra de elevación
   del nodo actual **en la misma declaración**, porque `box-shadow` no se acumula
   entre reglas: o van las dos juntas o gana la última.
4. ❌ **El rótulo del nodo actual NO pasó a `--card-ink`.** Ver §0.10.

**Y lo que se agregó, que no estaba en la lista:** `<LaminaRegion>`, primer hijo
del contenedor posicionado de cada capítulo. Va primero en el DOM y por eso pinta
debajo del camino **sin un solo `z-index`** (los positioned con z auto pintan en
orden de documento), con `pointer-events: none`. Tres detalles que se pagaron:

- **`height: min(240, nodos × 76)`.** El tramo 5 tiene 3 paradas = 228 px, menos
  que la lámina: sin el `min` la región se derrama sobre la cabecera del tramo
  siguiente.
- **Sangra a `-0.75rem` / `-1rem` en `sm`**, igual que la cabecera pegajosa, para
  llegar al filo de la Card. Medido con `desbordeHorizontal()`: `scrollWidth 390`
  en los dos temas — el borde derecho cae justo en el *padding edge* y no suma
  scroll.
- **El canto recto de arriba no se ve nunca, y no es suerte:** la lámina arranca
  justo debajo de la cabecera del tramo, que es `sticky` y opaca, así que al
  scrollear el borde se mete por debajo de ella. Por eso el fundido es solo por
  abajo.

**Un hueco conocido, y es del mapa, no del mundo:** la región del **t5 solo
existe si hay pack de trabajo elegido**. `t5.unitIds` está vacío y el mapa no
pinta capítulos sin nodos, así que sin pack no hay capítulo y por lo tanto no hay
lámina. §B.6 quería justo lo contrario —que la región exista con las cuatro
puertas cerradas para decir «todavía no elegiste»— y eso pide tocar cómo el mapa
arma los capítulos, que es otro encargo. Con `rodeo_a1_job` puesto aparecen las
ocho (verificado: `f6-e-t5-puertas.png`).

---

## B · LAS OCHO REGIONES

Un brief por tramo, sacado del contenido **real**. La regla: si un prop está en
la región, es porque una frase lo nombra. Nada está ahí porque quede lindo.

### B.1 · t0 · «Antes de hablar» — el descampado de las señales
**verde · 🌱 · «De cero a decir treinta cosas sin traducir.» · 17 paradas**

- **Qué se ve.** Un descampado al amanecer, antes de la ciudad. Es la única
  región del mundo **con texto**, y por una razón: la primera parada del tramo
  se llama «En el aeropuerto ya sabés leer» y va de que los letreros ya se
  entienden. Seis postes de señalética con palabras que ya se saben —
  `HOSPITAL`, `INFORMATION`, `EXIT`, `TAXI`, `HOTEL`, `POLICE`.
- **Props, uno por unidad.** Los seis postes (`t0-cognados`); una boca abierta
  tallada en un mojón, absurda y grande, para la TH (`t0-sonidos`, escena «La
  TH: sacá la lengua»); un banco con dos figuras (`t0-cortesia`); un reloj de
  estación con números enormes (`t0-numeros`); **una pila de tres ladrillos**
  (`t0-ser-estar`, cuyo ícono ya es 🧱 y cuya promesa es «tres piecitas»); y
  seis flechas clavadas en el piso apuntando a lados distintos
  (`t0-preguntas`: dónde, cuánto, qué hora, cuál, quién, cuánto tiempo).
- **Con la vecina.** El descampado termina en una acera que sube tres escalones
  a la puerta del t1.
- **Al desbloquear.** Se **encienden** las señales: los carteles pasan de gris a
  su hueco iluminado. Premio literal: las palabras se leen.

### B.2 · t1 · «El primer día» — la entrada
**azul · 🚶 · «Entrar, saludar y pedir ayuda sin quedar mudo.» · 7 paradas**

- **Qué se ve.** La entrada de un edificio de oficinas y **nada del interior**.
  Puertas de vidrio, torniquete, mostrador de recepción, y la torre del ascensor
  saliéndose del encuadre hacia arriba. El pasillo se pierde en negro.
- **Props.** Torniquete y tarjeta de acceso colgando (`u1-llegar`); un
  directorio en la pared con las líneas ilegibles (`u2-supervivencia` — el tramo
  de «I don't understand»); dos figuras dándose la mano junto a la planta del
  lobby (`u3-presentarte`).
- **Con la vecina.** La acera del t0 llega a los escalones; la torre del
  ascensor apunta al piso del t2.
- **Al desbloquear.** **Se abre la puerta de vidrio**: el hueco negro de la
  entrada pasa a mostrar el lobby.

### B.3 · t2 · «La oficina de todos los días» — la planta
**lavanda · ☕ · «El cafecito, la reunión y cerrar una tarea.» · 12 + 2 paradas**

- **Qué se ve.** Una planta abierta vista desde arriba: filas de escritorios, una
  sala de reuniones acristalada, la cocinita. Y **dos escritorios tapados con
  una lona**.
- **Props.** Cafetera y dos tazas (`u4-smalltalk`); un carrito de soporte con
  cables (`u5-ayuda`); mesa larga con proyector (`u6-reunion`); un tablero
  kanban con post-its (`u7-tareas`).
- **La lona es diegética y es importante.** `t2-embarrarla` y `t2-chat-trabajo`
  están en `PENDIENTES`: existen en el plan y no tienen contenido. El mapa ya
  las pinta con candado y «pronto» porque *ver el camino completo motiva*. En el
  mundo, eso es **obra en curso**, no niebla. Hay que distinguirlas: **niebla =
  no llegaste; embalaje = todavía no existe.**
- **Con la vecina.** El ascensor del t1 desemboca acá; un ventanal al fondo deja
  ver la pista del t3.
- **Al desbloquear.** Se prende la luz de la sala de reuniones y sale un hilo de
  vapor de la cafetera (un fotograma, no un bucle).

### B.4 · t3 · «Salés del país» — el viaje entero
**amarillo · ✈️ · «Del avión al hotel sin pedirle a nadie que traduzca.» · 17 paradas**

La región más larga y la más literal, porque su contenido es literal. Es una
tira de ocho escenarios **en el orden real del viaje** — que es el orden en que
`t3-viaje.ts` los pone, y ese archivo dice por qué: «el orden de las paradas no
se reordena por dificultad: se reordena por reloj».

| Parada | Qué se ve | La frase que lo pone ahí |
|---|---|---|
| `t3-aeropuerto` | Mostrador con báscula y una maleta; bandejas de seguridad con un portátil dentro; tablero de vuelos con una fila en `DELAYED` | `Just this one bag.` · `Laptop out?` · `Is the flight on time?` |
| `t3-migracion` | **Cuatro** cabinas y la línea amarilla en el piso | «te van a hacer CUATRO preguntas, siempre las mismas» |
| `t3-avion` | El morro del avión con la manga pegada | `I'm in group two.` · `gate twelve` |
| `t3-moverte` | Fila de taxis con el letrero de tarifa; una boca de metro | `How much to downtown?` · `Which stop for the museum?` |
| `t3-hotel` | Toldo, carro de maletas, mostrador | `Can I leave my bags here?` |
| `t3-comer` | Mesa puesta con la cuenta en un platito | `The check, please.` — y en EE. UU. la cuenta no llega sola |
| `t3-comprar` | Maniquí, perchero, un cajero en la pared | `Do you have a bigger size?` · `Where is the ATM?` |
| `t3-se-dana` | **La cinta de equipaje, girando vacía** | `My bag didn't arrive.` |

- **La cinta vacía es el remate.** La última parada del tramo es «cuando se daña
  el viaje», y una cinta sin maletas lo dice sin una palabra.
- **Con la vecina.** Entra por el ventanal del t2; sale por la puerta giratoria
  del hotel al t4.
- **Al desbloquear.** El **tablero de vuelos pasa de `DELAYED` a `ON TIME`**.

### B.5 · t4 · «Viaje de trabajo» — el centro de convenciones a medio montar
**durazno · 💼 · «Inglés de oficina, pero afuera.» · 5 paradas, TODAS pendientes**

- **Qué se ve.** El t2 y el t3 mezclados, que es exactamente lo que el tramo es.
  Un centro de convenciones: sofás de recepción de cliente, una mesa de cena
  larga, un stand de feria con roll-up, un reloj de pared marcando tarde, y una
  bandeja de facturas.
- **Y está a medio montar**, porque sus cinco paradas están en `PENDIENTES`: el
  roll-up enrollado, las sillas apiladas, el mantel doblado sobre la mesa. Igual
  que las lonas del t2: **embalaje, no niebla**.
- **Al desbloquear** (cuando el contenido exista): se despliega el roll-up y se
  pone la mesa.

### B.6 · t5 · «Tu trabajo» — las cuatro puertas
**azul · 🛠️ · «Lo que se dice en TU puesto.» · `branch: 'job'`, con atajo**

- **Qué se ve.** Un pasillo corto con **cuatro puertas rotuladas por oficio**
  (con el emoji del pack, no con texto): 💻 tech, 📈 ventas, 🎧 soporte,
  🛎️ recepción. Tres cerradas, una abierta.
- **Esto resuelve el problema de que `t5.unitIds` esté vacío.** La región existe
  aunque no haya contenido, y su estado vacío es diegético: **todavía no
  elegiste**. La lámina base son las cuatro puertas cerradas; hay **cuatro
  variantes del cuarto abierto**, una por pack, de 210×150 cada una.
- **Props del cuarto, por pack.** tech: dos monitores y un diagrama en la pared.
  ventas: un embudo dibujado y un teléfono. soporte: auriculares y una cola de
  tickets. recepción: mostrador, campana y libro de firmas (`Sign in here`,
  `take a message`).
- **Al desbloquear.** Se abre TU puerta. Es el único desbloqueo del mundo que el
  usuario **elige** en vez de ganárselo, y por eso la puerta se abre de golpe en
  vez de retirarse la niebla.

### B.7 · t6 · «Tu vida afuera» — la manzana
**verde · 🏡 · «Casa, salud, banco y amigos.» · 4 paradas, todas pendientes**

- **Qué se ve.** Una manzana de barrio: una casa con letrero de `FOR RENT`
  (`t6-casa`), una farmacia con la cruz (`t6-salud`), un cajero en la pared de
  un banco (`t6-banco`), y una mesa de bar en la acera con tres sillas
  (`t6-amigos`).
- **El enganche con el t3 es lo mejor de esta región y hay que verlo.** La
  farmacia y el cajero **ya aparecieron** en el t3 — pero ahí eran emergencia
  (`Is there a pharmacy near here?` está en la parada «cuando se daña el
  viaje»; `Where is the ATM?` en «comprar y plata»). Acá son rutina. **Mismo
  prop, otro contexto: ese es el arco del módulo y el mundo puede decirlo sin
  una palabra.**
- **Al desbloquear.** Se apaga el `FOR RENT` y se prende la luz de la casa.

### B.8 · t7 · «Ayer y mañana» — el mirador
**lavanda · 🎓 · «Contar lo que pasó y lo que viene. Cierra A1.» · 4 paradas**

- **Qué se ve.** Una loma con un banco. Un poste de flechas que apuntan **hacia
  atrás** (`t7-el-finde`, `t7-reporte-ayer`) y **hacia adelante** (`t7-planes`,
  `t7-excusas`). Y abajo, en miniatura y en silueta sobre el canto de la losa,
  **el aeropuerto, la oficina y el barrio**.
- **Es la única región desde la que se ve el resto del mundo**, y no es un
  capricho: el tramo se llama «Ayer y mañana» y cierra A1. La región que trata
  de mirar atrás y adelante es la única que mira al resto.
- **Al desbloquear.** Se levanta la niebla de **todo el mapa a la vez**. Es el
  cierre de A1 y el único momento en que el mundo entero se ve a color.

---

## C · EL PIPELINE

> **§C.1–C.4 son el pipeline de Blender, que NO se usó.** El arte salió de un
> modelo de imagen y se hornea con `f6-hornear-tinta.mjs`; los números buenos
> están en §0.2/§0.3. Lo que de acá sigue valiendo es el **método**: los topes de
> bytes declarados antes de medir, el hash en el nombre y por qué el grano no se
> hornea. Blender sigue instalado y conectado (§C.1) por si alguna vez hace falta.

### C.1 · El entorno YA está montado

Esta sección decía que faltaba todo. Se montó el 8 de agosto de 2026, después de
escribirla — lo que sigue es el estado real, verificado leyendo el sistema y no
de memoria:

| Pieza | Estado | Cómo se comprobó |
|---|---|---|
| Blender | **5.2.0 LTS** en `C:\Program Files\Blender Foundation\Blender 5.2\` | `blender.exe --version`; MSI oficial de `download.blender.org`, hash verificado por winget |
| Repositorio del add-on | **Blender Lab** (`https://lab.blender.org/`) agregado y sincronizado | `blender --command extension repo-list` |
| Add-on MCP | **instalado y habilitado** (`bl_ext.blender_lab.mcp`, v1.0.0) | leído de `bpy.context.preferences.addons`, no supuesto |
| Servidor MCP | `blender` en la config de **usuario** de Claude Code, `✓ Connected` | `claude mcp list` |

El servidor se lanza con `uv run blender-mcp` desde el directorio de la
extensión; el paquete es `blender-mcp` del proyecto oficial
`projects.blender.org/lab/blender_mcp`, y el add-on salió del repositorio de
Blender Lab, no del repositorio general de extensiones (ahí no está).

**Dos cosas que siguen en pie y hay que tener presentes:**

1. **Blender tiene que estar ABIERTO.** El servidor MCP no lanza Blender: habla
   con una sesión viva a través del add-on. Con Blender cerrado, las
   herramientas no tienen con quién hablar.
2. **La advertencia de seguridad es de Blender, y es real.** Su propia
   documentación dice que el servidor ejecuta el código que genera el modelo
   *sin ninguna barrera* que impida borrar datos o mandarlos afuera, y
   recomienda una máquina virtual o un equipo sin información sensible. Acá se
   va a correr en la máquina de trabajo con el repo al lado: no es motivo para
   no hacerlo, sí para que las sesiones de Blender sean acotadas.

Mientras tanto, **el pipeline entero es probable sin Blender**:
`gen-relleno.mjs` escribe en `render/` los mismos PNG que va a escribir Blender
—grises con alfa, misma proyección, misma escala, mismas dimensiones— y
`hornear.mjs` los procesa igual. Todos los números de §C.4 salen de ahí.

### C.2 · Convenciones del `.blend`

Para que **rehornear una región sea reproducible y no una obra de artesanía
irrepetible**:

```
Escena     · unidades Métricas, Unit Scale 1.0, Length = Meters, grid 1 m
Origen     · (0,0,0) en el centro del borde CERCANO de la losa, sobre el suelo

Colecciones
  CAM/                  una sola cámara, `CAM_MUNDO`
                        Orthographic · ortho_scale 19.5 · Euler (60°, 0°, −20°)
                        clip_start 0.1 · clip_end 200
  LUZ/                  `SUN_CLAVE` (energía 3, elev 35°, azim −35°)
  EJE_MUNDO             un Empty girado −20° en Z. TODO cuelga de acá.
                        Se autora en su marco local: X = horizontal de pantalla,
                        Y = profundidad, Z = alto. El mosaico repite en SU Y.
  MUNDO/
    t0/ HORIZONTE/  MOSAICO/  PREMIO/
    t1/ …                              (una por tramo, t0…t7)

Render     · Cycles · Film > Transparent ACTIVADO · denoise a fondo (§C.4)
             Color Management: View Transform = Standard (NO Filmic, NO AgX:
             cualquier tone-mapping curva los grises y rompe la rampa de §A.4)
             resolution_x 1170 siempre
             resolution_y 720 (horizonte) · 912 (mosaico) · 450 (premio, x630)
```

**Nombres de salida** — `hornear.mjs` los valida con una expresión regular y
**falla ruidosamente** si no encajan, porque un archivo mal nombrado se hornea
igual y aparece en el mundo equivocado:

```
render/<tramo>-<pieza>[-<variante>].png
        t3-horizonte.png · t3-mosaico… no: la pieza se llama `suelo`
        t3-suelo.png · t3-premio.png · t5-premio-tech.png
```

**Regla de autoría del mosaico:** los primeros y últimos 3,8 m van **vacíos de
props**. Es lo que hace invisible el repetido.

### C.3 · De PNG a WebP: `hornear.mjs`

```bash
cd …/scratchpad/mundo
node gen-relleno.mjs        # (mientras no haya Blender)
node hornear.mjs --limpiar  # render/ -> dist/
node hornear.mjs --calidades   # rebarrer la curva de calidad sobre el render real
```

Qué hace, y por qué cada cosa:

- **Valida las dimensiones** contra la geometría (§A.2/A.6) y **falla** si no
  coinciden. Un render con otro `ortho_scale` entra sin avisar y sale con la
  escala del mundo cambiada a mitad del mapa.
- **Exige canal alfa.** Sin `Film > Transparent` no hay cielo y la región se
  vuelve un rectángulo de color.
- **Baja el croma a cero** (`.grayscale().ensureAlpha()`). No es cosmética: los
  dos planos de croma quedan constantes y el WebP los codifica en casi nada
  — **21 % menos bytes** medido (§C.4). *`ensureAlpha` después de `grayscale`
  no es opcional: sharp pasa a `b-w` (1 banda) y se lleva el alfa con él.*
- **Lanczos3 al bajar de @3 a @2.** El kernel por defecto deja un halo en el
  borde de la silueta que el multiply convierte en una línea clara alrededor de
  cada edificio.
- **Solo @3 y @2.** El iPhone de referencia del repo (`qa.mjs`: 390×844 dpr 3) y
  los Android de gama media (dpr 2,6–3) caen todos ahí. Un dpr 1 a 390 px es un
  escritorio encogido y downscalea solo desde @2.
- **Hash de contenido en el NOMBRE.** Esto es obligatorio, no higiene:
  `sw.js` sirve los estáticos same-origin **cache-first** (regla 5), así que un
  WebP bajo una URL fija queda **congelado para siempre** hasta subir `VERSION`.
  Con el hash en el nombre, rehornear una región no obliga a invalidar el resto
  ni a tocar el service worker.
- **Topes de bytes por pieza**, y fallan la compilación (§C.4).
- **Emite `dist/mundo.manifest.json`**, que es lo único que la app lee.

**Salida real** (relleno, 20 PNG de entrada):

```
  t0-horizonte.png           @3    3.7 kB   @2    2.8 kB
  t0-suelo.png               @3    3.4 kB   @2    1.9 kB
  t2-suelo.png               @3    6.7 kB   @2    4.2 kB
  t3-horizonte.png           @3    3.0 kB   @2    1.9 kB
  t3-premio.png              @3    0.8 kB   @2    0.6 kB
  t3-suelo.png               @3    5.1 kB   @2    3.1 kB
  …
  TOTAL @3 ......... 59.6 kB   (lo que baja un iPhone)
  TOTAL @2 ......... 38.3 kB   (lo que baja un Android dpr2)
  manifiesto ....... 7.4 kB
  archivos ......... 40 webp + 1 json
```

> Estos 59,6 kB **no son el presupuesto**: son polígonos planos y comprimen como
> un logotipo. El número que hay que presupuestar sale de §C.4.

Y el tope, probado a propósito con un mosaico grabado con grano de Cycles:

```
Error: t3-suelo.png: 198.4 kB a dpr3, el tope es 27.0 kB. Casi siempre es grano
horneado — el grano lo pone el overlay de la app, no la lámina. Subí el denoise
en Blender y volvé a renderizar (MUNDO-runbook §C, presupuesto).
```

**Forma del manifiesto:**

```json
{
  "version": 1,
  "geometria": { "ancho_css": 390, "horizonte_css": 240, "suelo_css": 304,
                 "paso_camino": 76, "px_por_metro": { "x3": 60, "x2": 40 } },
  "total_bytes": { "x3": 60982, "x2": 33500 },
  "regiones": {
    "t3": {
      "tema": "yellow",
      "horizonte": { "css": {"w":390,"h":240},
                     "x3": {"src":"/mundo/t3-horizonte.17148fdf@3x.webp","w":1170,"bytes":2804},
                     "x2": {"src":"/mundo/t3-horizonte.ba500125@2x.webp","w":780,"bytes":1584} },
      "suelo":  { … }, "premio": { … }
    }
  }
}
```

> El manifiesto pesa ~10 kB con las 27 piezas. **Va inlineado en el bundle**, no
> se pide por `fetch`: un round-trip más antes de poder pintar el mapa, para 10
> kB, no se paga.

### C.4 · EL PRESUPUESTO DE PESO — y sí, cierra

El techo, declarado antes de medir:

| | Tope | Por qué |
|---|---:|---|
| Mundo entero, dpr 3 | **≤ 400 kB** | 2,7 × `lens.glb` (146 kB, **una** lente) para las ocho regiones. |
| Primera pantalla | **≤ 60 kB** | Hoy el mapa cuesta **0 bytes de imagen**. Lo que se agregue se paga en el primer render de la pantalla más usada del módulo. |
| En `APP_WARM` de `sw.js` | **0** | Ver más abajo. |

Y lo medido (`medir-presupuesto.mjs`, WebP q72, gris + alfa, sobre el lienzo
real de 1170×912):

| Complejidad de la lámina | Una pieza @3 | Mundo @3 |
|---|---:|---:|
| relleno plano (lo que dibuja `gen-relleno`) | 5,7 kB | — *miente por lo bajo* |
| **+ oclusión ambiental suave** (render limpio, denoise a tope) | **18,6 kB** | **337,5 kB** |
| + grano de Cycles | 38,9 kB | 669,3 kB |
| una FOTO (techo absoluto, imposible con arcilla mate) | 101,6 kB | — |

**El desglose que cierra** (8 horizontes + 8 mosaicos + 11 premios):

| | @3 | @2 |
|---|---:|---:|
| horizonte ×8 | 14,8 kB c/u → 118 kB | 10,1 → 81 kB |
| mosaico ×8 | 18,6 kB c/u → 149 kB | 12,4 → 99 kB |
| premio ×11 | 6,4 kB c/u → 70 kB | 4,1 → 45 kB |
| **TOTAL** | **337,5 kB** ✅ | **225,0 kB** |
| **Primera pantalla** (1 horizonte + 1 mosaico) | **33,4 kB** ✅ | 22,5 kB |

**Con el grano horneado NO cierra: 669,3 kB y 68,5 kB de primera pantalla.** El
recorte, entonces, es el grano — y no es un recorte de calidad:

> **El grano no va en la lámina. Va en el overlay que la app ya tiene.**
> Es −50 % de bytes, cuesta 0 (el `fractalNoise` con `mix-blend-mode: overlay`
> ya está encima de todo) y **se ve mejor**: un grano horneado en el mosaico
> repetiría cada 304 px, que es justo el defecto que el mosaico intenta
> esconder.

Otras tres cosas medidas, para no volver a sospecharlas:

- **La rodilla de la curva está en q72.** q78 cuesta +67 % y q85 otro +108 %, sin
  que el plato multiplicado cambie a la vista. Por debajo, q62 ahorra un 33 % más
  y es la palanca de emergencia si algún día hace falta.
- **AVIF no vale la pena acá.** q50 da 17,8 kB (mejor que WebP) pero q60 salta a
  57,7 kB: la curva es ingobernable en imágenes de gradiente suave, y encima
  **decodifica más lento**, en el hilo del scroll de la pantalla más usada.
- **Hornear en color costaría +21 %** además de duplicar archivos por tema. La
  plancha de luz gana por los dos lados.

**Qué pasa con el service worker.** `sw.js:54` precachea `APP_WARM` en el
`install`: todo lo que entre ahí **se descarga en datos móviles la primera vez
que se abre la app**. Las láminas del mundo **NO van a `APP_WARM`**. Se quedan
con la ruta 5 del router (`cache-first` para estáticos same-origin), o sea que
cada región se cachea la primera vez que se ve, y solo en el dpr del teléfono.

Y hay un regalo en eso: **la niebla también es el estado de carga.** Una región
lejana cuya lámina todavía no se bajó se ve exactamente como una región lejana
cuya lámina sí está — porque está tapada por la niebla igual. La degradación
*es* el diseño. La única lámina que tiene que estar para que el mapa se sienta
completo es la de la región donde estás, y son 33 kB.

---

## D · EL PROTOTIPO DE LA NIEBLA

> Corrió con arte de relleno y con el mosaico todavía puesto. De sus cinco
> hallazgos sobreviven **el 1** (las opacidades 0,83 / 0,74, que son las que
> están en producción) y **el 5** (mutar en el sitio en vez de repintar). Los
> hallazgos **2, 3 y 4** eran del topónimo y del degradado por progreso, y los
> dos se fueron: ver §0.5.

`…/scratchpad/mundo/mundo.html` — HTML suelto, 390×844, arte de relleno, tokens
reales. `node capturas.mjs` lo abre en Chrome con `puppeteer-core` a dpr 3 (el
iPhone de `qa.mjs`) y deja las capturas en `qa/`.

**Verificado**: `scrollWidth 390`, sin desbordes horizontales, sin errores de
consola (el único 404 es el `favicon.ico` del servidor de pruebas).

Cinco cosas que el prototipo decidió y que no se habrían decidido razonando:

1. **La niebla al 0,83 en oscuro y 0,74 en claro.** A 0,75 la región lejana
   compite con la actual y el mapa se vuelve un mosaico de colores; a 0,90 la
   silueta desaparece y la niebla deja de ser un sitio para ser un hueco.
2. **El topónimo se apoya en un HALO, no en una cartela.** La primera versión
   llevaba un `radial-gradient` de `--bg-void` detrás del nombre y en tema claro
   salía una franja blanca cruzando la región, comiéndose justo lo que tenía que
   insinuarse. `text-shadow` en tres capas del color del fondo resuelve lo mismo
   sin tapar nada.
3. **La niebla arranca 1,6 nodos DESPUÉS de donde estás**, no en el nodo actual.
   Con `avance = hechos/nodos`, el nodo actual y su rótulo caían dentro del
   degradado y el «estás acá» no se leía. Y contarlo así es lo correcto: desde
   donde estás parado se ve un pedazo del camino que sigue.
4. **Al abrirse una región, la niebla se retira AL MENOS hasta descubrir su
   lámina de identidad** (`max((240+76)/alto, …)`). Sin ese piso, abrir «Salés
   del país» con una parada hecha descubría 198 px de una región de 1292 y el
   momento no valía nada: se veía una franja, no un sitio.
5. **El desbloqueo hay que MUTARLO en el sitio, no repintarlo.** La primera
   versión llamaba a `pintar()` y la transición no corría: la capa de niebla
   nacía de cero y su primer valor calculado ya era el final, así que no había
   de dónde interpolar. `sonda.mjs` lo dejó en evidencia — `--frente` marcaba
   0,245 en el cuadro 0 y en los 85 siguientes. Un cuadro más tarde y la tira de
   capturas lo habría dado por bueno.

**Las capturas, y qué se ve en cada una:**

| Captura | Qué se ve |
|---|---|
| `01-mundo-arriba.png` | La cabecera del t0 pegada arriba y, debajo, la **losa verde** con su canto y sus postes de señal recortándose contra el negro de la app. Los seis primeros nodos con su check. |
| `03-frontera.png` | **El momento clave.** La planta de oficina lavanda iluminada arriba, los escritorios perdiéndose en la oscuridad abajo, y en la línea justa el nodo actual a color pleno con «Pedir ayuda · ESTÁS ACÁ · 6/12». Se ve el mismo sitio a los dos lados de la niebla. |
| `04-niebla-t3.png` | «SALÉS DEL PAÍS» legible y apagado sobre una región casi negra donde todavía se adivinan la terminal y las cabinas. |
| `05-niebla-t5-t6.png` | Tres regiones futuras seguidas, cada una con su nombre y su tinte apenas presente: azul «TU TRABAJO», verde «TU VIDA AFUERA», lavanda «AYER Y MAÑANA». Es la respuesta literal al pedido: existen ocho regiones y las de más allá tienen nombre. |
| `07-tira-desbloqueo.png` | Siete cuadros: ANTES + 2/169/326/522/832/1410 ms. La niebla se retira de arriba hacia abajo, el topónimo se desvanece y se levanta, y al final la terminal amarilla entera con «El mostrador · ESTÁS ACÁ · 2/17». |
| `09-claro-frontera.png` · `10-claro-niebla.png` | Lo mismo en **tema claro**, con **las mismas láminas**: la niebla pasa a ser neblina blanca y las siluetas siguen leyéndose. |
| `12-tira-reducido.png` | Antes/después con `prefers-reduced-motion: reduce`, más el mirador del t7 al fondo del mundo. |

**Archivos del prototipo** (todos en `…/scratchpad/mundo/`):

| | |
|---|---|
| `mundo.html` | el prototipo |
| `gen-relleno.mjs` | hace de Blender: escribe `render/*.png` |
| `hornear.mjs` | el pipeline: `render/` → `dist/*.webp` + manifiesto |
| `medir-presupuesto.mjs` | el presupuesto de §C.4 |
| `capturas.mjs` | Chrome + `puppeteer-core` a 390×844 dpr 3 |
| `sonda.mjs` | instrumenta `--frente` cuadro a cuadro (así se cazó el fallo 5) |

**El caso degradado se diseñó primero.** En el teléfono real `MODO_LIGERO` está
siempre activo y muchos usuarios además tienen `prefers-reduced-motion`. El
desbloqueo no depende de la animación: lo que cambia es el **color** y el
**contenido**, y con cero movimiento el antes/después sigue contando la historia
(`qa/11-reducido-*.png`). Cero `blur`, cero `backdrop-filter`, cero canvas: ocho
capas desenfocadas en un scroller es exactamente el patrón que tira los cuadros
en un Android de gama media.

---

## Lo que NO está resuelto

- **El p95 del scroll en un teléfono de verdad.** En headless el mundo cuesta
  0,0 fps (§0.8), o sea que no hay coste estructural — pero eso no es el p95 de
  un Android de gama media decodificando ocho WebP. Falta `tests/perf/`.
- **La región del t5 sin pack elegido.** Ver el final de §A.7: la lámina existe y
  se ve, pero solo cuando hay trabajo elegido. §B.6 quería lo contrario.
- **Los `premio` no existen.** Toda §B dice «al desbloquear: se encienden las
  señales / se abre la puerta de vidrio / el tablero pasa de DELAYED a ON TIME».
  Nada de eso está: hoy el desbloqueo es que **la niebla se levanta**, y con eso
  alcanza — el momento es la región apareciendo, no el detalle que cambia. Cada
  premio son dos láminas por región en vez de una. Antes de hacerlos, comprobar
  que se echan de menos.
- **El desbloqueo no se anima**, y es a propósito, no una deuda. En el teléfono
  `MODO_LIGERO` está SIEMPRE activo (`src/lib/device.ts`) y muchos usuarios
  además piden movimiento reducido: si el momento dependiera de una transición,
  en el dispositivo objetivo no existiría. Lo que cambia es el **color** de la
  región, y eso se cuenta con cero movimiento. La transición de 900 ms del velo
  está declarada dentro de `@media (prefers-reduced-motion: no-preference)`:
  borrala entera y el antes/después sigue diciendo lo mismo.
- **Queda un `hornear.mjs` que ya no corre.** Es el pipeline de la plancha de luz
  (§C.3): valida canal alfa y dos piezas por región, así que con láminas de tinta
  falla en la primera comprobación. Se deja porque documenta cómo se llegó acá;
  lo que corre es `f6-hornear-tinta.mjs`. Si estorba, se borra.
