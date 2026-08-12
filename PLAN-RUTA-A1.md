# PLAN — Integrar la RUTA A1 en Hablarte

Rama: `claude/rodeo-repo-info-nw2025` · Revisada el 8 de agosto de 2026.

Cinco fases, en orden. Cada una es empujable sola y deja la app funcionando.
Los prompts van listos para pegar en Claude Code, uno por fase, en orden.

---

## 0 · Lo que hay hoy (verificado en la rama)

**El nivel ya se pregunta y no se usa.**

`src/stores/onboarding.ts` define `Nivel = 'A1' | 'B1' | 'B2-C1'` y
`src/views/onboarding/index.tsx` lo pide en el paso 3. `completar()` guarda
`rodeo_nivel` y hace `useApp.setState({ nivel })`.

Y ahí muere. `App.tsx` suelta `HomeView` sin mirar el nivel. Alguien que dijo
"soy principiante absoluto" cae en el mismo carrusel aurora que un C1, con siete
cartas —DNA, LIBRO, SLANG, STORY, CONVERSACIÓN, OFICINA— y ninguna que diga
"empezá por acá". **Ese es el hueco número uno y no cuesta contenido: cuesta un
`if`.**

**El módulo A1 está completo por dentro, pero escondido.**

- Motor: `src/stores/a1.ts` — Leitner de 5 cajas (`INTERVALOS = [1,3,7,14,30]`),
  rungs por caja, racha no punitiva, Mis frases, cola de repaso. Sólido.
- Pantallas: `src/views/a1/` — mapa, portada, sesión (loop de 7 pasos), tarea,
  hojas, onboarding propio.
- Router del módulo: `src/views/a1/index.tsx`, con dos puntos de extensión ya
  pensados (`packsExtra`, `PasoVoz`).
- Entrada: **solo** por la carta OFICINA del carrusel del Home
  (`carrusel-features.tsx` → `abrirFeature('a1')` → `view === 'a1'` →
  `OficinaView`).
- Contenido: 11 unidades, 31 escenas, **105 frases**. Meta A1 completa ≈ 660.

**Tres problemas de forma que el plan corrige:**

1. `src/views/a1/mapa.tsx` es una **lista vertical de tarjetas**, no un camino.
2. `OficinaView` pide **elegir trabajo ANTES del mapa**. A alguien que no sabe
   decir "hello" se le pregunta a qué se dedica. Eso es del Tramo 5.
3. El curso arranca en `u1-llegar` → `"Good morning, everyone."` Tres palabras
   que alguien en pre‑A1 no puede ni separar ni pronunciar. Ve eso, confirma que
   el inglés no es para él, y cierra.

---

## 1 · Las cinco fases

| Fase | Qué | Contenido nuevo | Riesgo |
|---|---|---|---|
| **F0** | Cablear el nivel: A1 → RUTA | 0 | Bajo |
| **F1** | Mapa serpiente (sobre las 11 unidades que ya hay) | 0 | Medio (visual) |
| **F2** | Tramo 0 + nodos `palabras` / `sonido` | 95 frases | Medio |
| **F3** | Tramo 3 (viajes) + atajo de viaje | 68 frases | Bajo |
| **F4** | El coach | 0 | Alto |

**Por qué F0 va primero y sola.** Es el único cambio que arregla un problema real
sin tocar una sola línea de contenido ni de diseño. Si mañana se cae todo lo
demás, esto ya vale la pena: hoy la gente que más ayuda necesita es la que peor
entra.

**Por qué F1 va antes que el contenido.** El mapa serpiente sobre 11 unidades es
un cambio puramente visual y verificable con captura. Meterlo después del
contenido nuevo mezcla dos causas de fallo: si algo se rompe, no se sabe si fue
el camino o las 163 frases.

**Por qué F4 va al final y no antes.** El coach solo puede hablar de lo que ya se
enseñó. Sin Tramo 0 y Tramo 3 adentro, el coach tiene 105 frases de oficina y
nada más — y la conversación que la gente quiere tener es la del aeropuerto.

---

## 2 · Trampas detectadas (los prompts ya las llevan resueltas)

Estas son las que costarían una ronda cada una si nadie las nombra.

**T1 · `order` colisiona y el orden del curso queda indeterminado.**
`stores/a1.ts:186` arma el catálogo con `A1_CURSO.units.sort(porOrden)`. Las
unidades del Tramo 0 traen `order: 1..6` y `u1-llegar…u7-tareas` traen `1..7`.
Empate → `Array.sort` no garantiza estabilidad de criterio y el curso queda en
orden aleatorio. **El catálogo tiene que armarse desde `TRAMOS.unitIds`, no desde
`order`.** Y esto no es cosmético: `nuevos()` (línea 501) recorre `unidades` en
orden y de ahí salen las frases nuevas del repaso. El orden del array **es** el
currículo.

**T2 · `estaDesbloqueada` solo sabe de dos bloques.**
Línea 428: `if (idx === 0 || idx === tronco) return true`. Asume tronco + pack.
Con ocho tramos hay ocho primeras unidades, y una de ellas (Tramo 3) tiene que
abrirse por atajo sin haber hecho la anterior. Hay que reescribirla sobre tramos.

**T3 · Las 15 unidades sin contenido.**
`tramos.ts` exporta `PENDIENTES`. Si entran al catálogo sin filtro,
`proximaEscena()` devuelve `null` y el usuario recibe *"Esta escena todavía no
tiene frases"* — un callejón sin salida. Se pintan con candado y **no** se
pueden abrir. Esconderlas es peor: ver el camino completo motiva; descubrir que
el camino se acaba, no.

**T4 · Mover 4 chunks NO rompe la tarea de `u1`.** Verificado.
`views/a1/tarea.tsx:34` resuelve por el índice **global** y filtra los pasos cuyo
chunk no exista (`.filter((st) => !!indice.chunk[st.answerChunkId])`). Mover
`c-im-new-here` al Tramo 0 lo deja en el índice, así que `u1-task` sigue
funcionando. Lo que sí cambia son los distractores hermanos del MCQ
(`indice.escenaDe`), y eso es exactamente lo que se busca.

**T5 · La métrica honesta se vuelve deshonesta al crecer el catálogo.**
`metricas()` cuenta sobre `totalChunks()` — hoy 105, después 268. "Ya te salen
solas: 12" pasa de sonar a algo a sonar a nada. **La métrica debe contar sobre el
tramo activo, no sobre el curso entero.** Es la regla del propio archivo: cero
XP, cero racha en rojo, solo capacidad real — y 12/268 no es capacidad real, es
desánimo con formato de dato.

**T6 · `sesion.tsx` tiene un solo loop.**
Los nodos `palabras` y `sonido` del Tramo 0 no pueden correr el loop de 7 pasos:
enseñar la palabra "taxi" con anticipación, reveal, porqué, shadowing, voz y
autoeval es una ceremonia absurda para algo que se resuelve en cinco segundos.
Necesitan un loop corto propio.

**T7 · Regla #1 del repo.** Nada visual se declara listo sin captura. F1 es
enteramente visual y se usa desde el celular: se verifica con `puppeteer-core` a
390 px, no razonando sobre el CSS.

---

## 3 · Los prompts

Van en orden. **No mandar dos a la vez** — cada uno termina con una verificación
que decide si el siguiente arranca.

Antes del F2, copiar a `src/content/a1/` los archivos que ya están hechos:
`tipos-ruta.ts`, `armar.ts`, `tramos.ts`, `t0-antes-de-hablar.ts`, `t3-viaje.ts`.

---

### PROMPT F0 — Cablear el nivel A1 a la ruta

```
Estás en Hablarte, rama claude/rodeo-repo-info-nw2025. Leé CLAUDE.md y
DESIGN-BRIEF.md antes de tocar nada.

PROBLEMA
El onboarding pregunta el nivel (src/views/onboarding/index.tsx, paso 'nivel')
y src/stores/onboarding.ts lo guarda en rodeo_nivel. Pero App.tsx no lo mira:
quien elige "A1 Básico" cae en el mismo Home aurora con siete cartas que un
C1. La persona que más ayuda necesita es la que peor entra.

QUÉ HACER

1. src/stores/app.ts
   · vistaInicial() hoy lee el hash #/<vista>. Agregale una regla DESPUÉS del
     hash (el hash siempre gana, es la puerta de debug):
     si rodeo_nivel === 'A1' y NO hay rodeo_a1_onboarded, la vista inicial es
     'a1'. Si ya está onboarded, respetá lo de siempre (Home) — a esa altura
     la persona ya sabe volver sola y forzarla sería secuestrarle la app.

2. src/stores/onboarding.ts, en completar()
   · si datos.nivel === 'A1', además de lo que ya hace, llamá
     useApp.setState({ view: 'a1' }).
   · POR QUÉ acá y no en App.tsx: completar() ya es el lugar donde se traduce
     "lo que dijo" a "estado de la app" (ya empuja nombre y nivel a useApp).
     Meter un if de nivel en el render de App.tsx sería poner una decisión de
     producto en un switch de vistas.

3. src/views/a1/oficina.tsx
   · Hoy, si onboarded && !job && !pospuesto, muestra el JobPicker ANTES del
     mapa. Eso le pregunta a qué se dedica a alguien que todavía no sabe decir
     "hello". Sacá esa guarda: OficinaView pasa a renderizar
     <A1View packsExtra={JOB_PACKS} PasoVoz={PasoVoz} /> siempre.
   · NO borres JobPicker ni el import: el selector vuelve en el Tramo 5. Dejá
     un comentario que diga dónde vuelve y por qué se movió.

4. src/components/rodeo/carrusel-features.tsx
   · La carta que hoy dice OFICINA / "Inglés de trabajo con Alfred" pasa a
     decir RUTA / "Tu ruta de inglés, paso a paso". El alt del contenedor
     también. Sigue apuntando a abrirFeature('a1').
   · Si rodeo_nivel === 'A1', esta carta va PRIMERA en el orden del carrusel.
     Para cualquier otro nivel, el orden se queda como está.

QUÉ NO HACER
· No toques src/stores/a1.ts. Esta fase no roza el motor.
· No agregues una vista nueva al type View. 'a1' ya existe.
· No cambies el flujo del gate ni el del onboarding general.

VERIFICACIÓN (obligatoria, regla #1 de CLAUDE.md)
Con puppeteer-core a 390x844, isMobile y hasTouch:
  a) localStorage limpio → gate → Skip → onboarding → elegir "A1 Básico" →
     terminar. CAPTURA: tiene que aterrizar en la RUTA, no en el Home.
  b) localStorage limpio → mismo flujo pero eligiendo "B1". CAPTURA: tiene que
     aterrizar en el Home, con el carrusel en su orden de siempre.
  c) Con rodeo_nivel='A1' y rodeo_a1_onboarded='true', recargar. CAPTURA:
     tiene que abrir en Home (no secuestrar).
Pegá las tres capturas antes de decir que está listo.
```

---

### PROMPT F1 — El mapa serpiente

```
Estás en Hablarte, rama claude/rodeo-repo-info-nw2025. Releé la regla #1 y la #4
de CLAUDE.md: esta fase es 100% visual y se usa desde el celular.

PROBLEMA
src/views/a1/mapa.tsx es una lista vertical de tarjetas. Una lista comunica
"catálogo": todo pesa igual y no se sabe dónde estás. Un camino comunica
"vas por acá y falta esto". La diferencia no es estética, es de motivación.

QUÉ HACER
Reescribí el render de src/views/a1/mapa.tsx como un CAMINO SERPIENTE. La
firma del componente <Mapa/> NO cambia (a1/index.tsx lo monta igual: pack,
onUnidad, onRepaso, onSeguir, onGuardadas, onPanico).

ESTRUCTURA
· Un nodo por ESCENA (no por unidad). Hoy hay 31 escenas en 11 unidades.
· Nodo: círculo de 68px, con el icono de la escena. Separación vertical 76px.
· Serpiente: desplazamiento horizontal senoidal, amplitud ±58px sobre el eje.
  A 390px de ancho eso deja 60px de aire a cada lado — medilo, no lo asumas.
· Entre nodo y nodo, una línea que los une. La del tramo cerrado va en el
  color del tramo; la del tramo bloqueado, en --borde-sutil.
· Cabecera de tramo pegajosa (sticky) al entrar en cada tramo: el título y la
  promesa. Es lo que convierte 31 nodos sueltos en 8 capítulos.

ESTADOS DEL NODO
· hecho      → relleno del color del tramo + check
· actual     → relleno + BorderBeam (ya está en components/magicui) + escala 1.06
· abierto    → contorno del color, relleno --bg-surface
· bloqueado  → gris, opacidad .5, candado
· pendiente  → gris, candado, y etiqueta "pronto" (ver PROMPT F2)

LO QUE SE CONSERVA DE LA PANTALLA ACTUAL (no lo borres)
· El bloque de Alfred con el saludo del día.
· La métrica honesta ("ya te salen solas").
· El CTA único: repasar o seguir donde ibas.
· La barra de sección con el ← redondo y el título mono en --accent.
El orden se mantiene: métrica → Alfred → UNA acción → el camino. Un
principiante frente a 31 nodos no elige: se paraliza. Por eso el camino va al
final y el CTA arriba.

QUÉ NO HACER
· Nada de coral en los nodos. En Hablarte el coral significa error y una escena
  no es un castigo. Usá los tokens --card-* vía tokenTema().
· Nada de gradiente púrpura ni de tarjetas ícono+título+párrafo (regla #4).
· No toques stores/a1.ts en esta fase. El mapa solo lee.
· No animes los 31 nodos a la vez: en Android gama media eso tira los frames.
  Animá el actual y nada más.

VERIFICACIÓN
Con puppeteer-core a 390x844, isMobile y hasTouch:
  a) CAPTURA del mapa completo arriba del todo.
  b) CAPTURA con scroll hasta la mitad, con una cabecera de tramo pegada.
  c) Tap real (page.touchscreen, NUNCA dispatchEvent) sobre un nodo abierto →
     abre la escena. CAPTURA.
  d) Tap real sobre un nodo bloqueado → toast, no navega. CAPTURA.
  e) Medí el ancho real del contenido a 390px y confirmá que ningún nodo se
     sale ni queda cortado por overflow.
```

---

### PROMPT F2 — Meter el Tramo 0

```
Estás en Hablarte, rama claude/rodeo-repo-info-nw2025.

CONTEXTO
En src/content/a1/ hay cinco archivos nuevos: tipos-ruta.ts, armar.ts,
tramos.ts, t0-antes-de-hablar.ts, t3-viaje.ts. El Tramo 0 son 95 items (70
palabras + 25 frases) en 6 paradas, y es la entrada que hoy no existe: el
curso arranca hoy en "Good morning, everyone", que alguien en pre-A1 no puede
ni separar ni pronunciar.

Esta fase mete el Tramo 0. El Tramo 3 se queda en el repo sin cablear hasta la
fase siguiente.

QUÉ HACER

1. EL CATÁLOGO SE ARMA DESDE TRAMOS  ← lo más importante de esta fase
   En src/stores/a1.ts, línea ~186, hoy:
       const TRONCO = A1_CURSO.units.slice().sort(porOrden);
   Eso NO puede seguir. Las unidades del Tramo 0 traen order 1..6 y u1..u7
   traen 1..7: empatan, y el orden del curso queda indeterminado.
   Reemplazalo por un catálogo construido recorriendo TRAMOS (de tramos.ts) y
   resolviendo cada id de unitIds contra un mapa de todas las unidades
   disponibles (A1_CURSO.units + T0_UNIDADES). Los ids en PENDIENTES se
   incluyen como entradas bloqueadas, no se resuelven a unidad.
   POR QUÉ importa más de lo que parece: nuevos() (línea ~501) recorre
   `unidades` en orden para elegir las frases nuevas del repaso. El orden del
   array ES el currículo.

2. estaDesbloqueada() sobre tramos
   Hoy (línea ~428) asume dos bloques: `idx === 0 || idx === tronco`.
   Reescribila así:
     · la primera unidad de un tramo se abre si el tramo anterior está cerrado
     · las unidades con survival:true siguen abiertas siempre (no lo toques)
     · las de PENDIENTES nunca se abren
     · dejá preparado el caso branch:'viaje' (atajo) pero sin activarlo — se
       enciende en F3.

3. Las cuatro MUDANZAS
   Sacá de src/content/a1/core.ts, de u1 y u3, estos cuatro chunks y ponelos
   en el Tramo 0 (parada t0-ser-estar para los dos primeros, t0-preguntas para
   los otros dos):
     c-im-new-here · c-im-from-colombia · c-whats-your-name · c-nice-to-meet-you
   MOVER, no copiar. El SRS indexa por id de chunk (rodeo_a1_srs), así que
   mover no cuesta progreso: quien los tenía en caja 4 los sigue teniendo.
   Copiarlos con id nuevo SÍ costaría — el motor los cobraría dos veces.
   Ya verifiqué que esto no rompe u1-task: tarea.tsx resuelve por el índice
   global y filtra los pasos sin chunk. Confirmalo igual con un test.

4. Los nodos nuevos: 'palabras' y 'sonido'
   El loop de 7 pasos de sesion.tsx no puede correr para una palabra suelta:
   anticipación + reveal + porqué + shadowing + voz + autoeval para enseñar
   "taxi" es una ceremonia absurda.
   · nodeKind 'palabras' → loop corto: ver la palabra con su sounds_es → oírla
     → repetir → siguiente. Sin MCQ, sin producción. Al final de la escena,
     UNA autoeval para toda la tanda, no una por palabra.
   · nodeKind 'sonido' → mostrar el parMinimo (los dos, ej. "very" vs "berry"),
     oír los dos, repetir, y si hay PasoVoz que decida. Si no hay PasoVoz,
     autoeval normal.
   · Si nodeKind falta o no se reconoce, cae al loop de 7 pasos de siempre.
     Nadie tiene que acordarse de apagar nada.

5. La métrica honesta, sobre el TRAMO
   metricas() cuenta contra totalChunks() — hoy 105, con el Tramo 0 son 200.
   "Ya te salen solas: 12 de 200" desanima más de lo que informa.
   Cambiá el denominador al TRAMO ACTIVO. El archivo ya dice que lo único que
   se cuenta es capacidad real; 12/200 no es capacidad real, es desánimo con
   formato de dato.

6. Las PENDIENTES en el mapa
   Los 15 ids de PENDIENTES se pintan con candado y la etiqueta "pronto", y no
   se pueden abrir. No los escondas: ver el camino completo motiva; descubrir
   que el camino se acaba, no.

QUÉ NO HACER
· No fusiones tipos-ruta.ts dentro de tipos.ts todavía. Se hace cuando la ruta
  esté verificada en pantalla; tipos.ts es punto de encuentro de tres frentes.
· No toques el Leitner ni los INTERVALOS.
· No cablees t3-viaje.ts en esta fase.

VERIFICACIÓN
  a) Test: el catálogo sale en el orden de TRAMOS, determinista. Corrélo tres
     veces y confirmá que da idéntico.
  b) Test: los 4 chunks movidos siguen existiendo en indice.chunk y u1-task
     sigue teniendo sus 3 pasos.
  c) Test: ninguna unidad de PENDIENTES devuelve true en estaDesbloqueada.
  d) CAPTURA a 390px del mapa con el Tramo 0 arriba y los candados de PENDIENTES.
  e) CAPTURA de un nodo 'palabras' corriendo (t0-cognados).
  f) CAPTURA de un nodo 'sonido' corriendo (t0-sonidos), con el par mínimo.
  g) Tap real de punta a punta de t0-cognados, incluida la tarea de cierre.
```

---

### PROMPT F3 — Tramo 3 (viajes) y el atajo

```
Estás en Hablarte, rama claude/rodeo-repo-info-nw2025. El Tramo 0 ya está adentro
y verificado.

CONTEXTO
src/content/a1/t3-viaje.ts son 68 frases en 8 paradas: aeropuerto, migración,
avión, moverte, hotel, comer, comprar, y cuando se daña el viaje. Es el tramo
que hace que alguien pague: la oficina se aprende en tres meses, el aeropuerto
es el martes.

QUÉ HACER

1. Cablear T3_UNIDADES al catálogo. Como el Tramo 0: por TRAMOS.unitIds, no
   por order.

2. EL ATAJO DE VIAJE
   El tramo 't3' trae branch:'viaje' y atajo_es. Encendé el caso que quedó
   preparado en estaDesbloqueada():
   · con el Tramo 0 cerrado, el Tramo 3 se abre SIN haber hecho los tramos 1 y
     2. Quien vuela la otra semana no va a hacer cuarenta nodos de pasillo
     primero: cierra la app y no vuelve.
   · En el mapa, al llegar a la cabecera del Tramo 3 y estando el 0 cerrado,
     mostrá el atajo_es ("¿Viajás la otra semana? Empezá por acá.") como una
     píldora tocable que salta directo. No como banner: como una salida
     opcional del camino, que es lo que es.
   · Tomar el atajo NO marca como hechos los tramos 1 y 2. Siguen ahí,
     abiertos, para cuando vuelva.

3. Guardá qué tramo está mirando el usuario (rodeo_a1_tramo) para que el mapa
   abra donde estaba y para el denominador de la métrica del F2.

QUÉ NO HACER
· No reordenes las paradas del Tramo 3. Migración va de segunda a propósito:
  es el momento de más miedo del viaje, y dejarlo "para cuando esté listo" es
  dejarlo sin lo único que de verdad necesita.
· No conviertas las respuestas de migración en frases largas. "Business." es
  una respuesta completa, correcta y suficiente.

VERIFICACIÓN
  a) CAPTURA del mapa con la cabecera del Tramo 3 y la píldora del atajo.
  b) Tap real en el atajo → abre t3-aeropuerto. CAPTURA.
  c) Test: tomar el atajo no marca hechas las escenas de los tramos 1 y 2.
  d) Tap real de punta a punta de t3-migracion, incluida la tarea.
```

---

### PROMPT F4 — El coach

```
Estás en Hablarte, rama claude/rodeo-repo-info-nw2025. Leé COACH-diseño.md
COMPLETO antes de escribir una línea. Este prompt no lo reemplaza.

LA TESIS, porque de acá sale todo lo demás
El problema no es detectar errores: es decidir cuáles callarse. Un modelo
detecta el 100% de los errores de un principiante, y alguien en A1 comete uno
cada cuatro palabras. Si el coach habla cada vez que detecta algo, el usuario
deja de arriesgar: acorta las frases, habla menos, y por lo tanto aprende
menos. El coach no es un corrector — es alguien con quien se puede hablar mal.

QUÉ HACER

1. El nodo coach en el mapa
   Aparece al cerrar las escenas de una parada que tenga bloque `coach`.
   Es una RECOMPENSA, no una obligación: quien elige entrar aguanta una
   corrección, quien fue empujado no. No lo pongas en el camino obligatorio.

2. El prompt del turno
   El esqueleto está en COACH-diseño.md §3. Lo que NO se negocia:
   · El vocabulario permitido sale de coach.chunkIds. Nada más.
   · Tope duro de coach.topeCorrecciones por conversación entera.
   · Se corrige REFORMULANDO dentro de la respuesta, nunca señalando. Están
     prohibidas las palabras: error, incorrecto, casi, se dice, ojo, en
     realidad.
   · Nunca se corrige algo que no se enseñó. Eso no es un error: es que
     todavía no lo sabe.

3. LA REGLA QUE HACE FUNCIONAR TODO LO DEMÁS (R4)
   Cuando el usuario falla un chunk, el coach NO DICE NADA y por debajo llama
   calificar(chunkId, 'casi') — que ya existe en stores/a1.ts.
   Resultado: esa frase le vuelve mañana en el Repaso de pasillo, que es el
   contexto donde corregir sí se siente bien (una tarjeta, sin nadie mirando).
   La conversación queda para hablar; el repaso, para arreglar. No se mezclan.
   Esto es gratis: el motor ya está.

4. La salida estructurada
   JSON al cerrar (formato exacto en COACH-diseño.md §3): logro_es,
   unaCosa_es, fraseGanada, srs[], correccionesUsadas.
   srs[] se aplica en silencio con calificar(). El usuario NUNCA ve el JSON.
   El debrief que sí ve son tres bloques y en este orden: lo que lograste →
   UNA cosa → la frase que ganaste. Nunca un listado de errores.

5. Bilingüe para desbloquear, jamás para regañar
   Se traba → español, le das la frase, volvés a inglés.
   Contesta en español → se acepta como válida y se sigue. NO se le pide que
   lo repita en inglés.
   El español nunca explica gramática en medio de la conversación: eso es
   apagar la conversación y prender una clase.

QUÉ NO HACER
· Ni nota, ni puntaje, ni porcentaje de acierto, ni cuántos errores hubo.
· Nada de "¡Muy bien!" ni "buen intento": el reconocimiento genérico le
  confirma al usuario que estuvo mal y que le tienen lástima. Específico o
  nada.
· No insistir si se queda callado dos turnos: cambiá de tema o cerrá suave.
· No corregir por escrito lo que se dijo hablando. Es doble castigo.

INSTRUMENTACIÓN
Loguear tres señales de CONDUCTA, no de satisfacción:
  · largo del turno del usuario a lo largo de la conversación (si se acorta,
    se está encogiendo → bajar el tope)
  · % de sesiones abandonadas a mitad
  · si vuelve al coach sin que se lo pidan
TRAMPA que hay que tener presente al leerlas: la precisión SUBE cuando el
usuario habla menos. Un coach más duro va a mostrar mejor exactitud y peor
todo lo demás. No optimizar exactitud.

VERIFICACIÓN
  a) Test con transcripción de un A1 real con 12 errores: confirmar que el
     coach dice como máximo topeCorrecciones y que ninguna es de algo fuera de
     chunkIds.
  b) Test: los errores no corregidos aparecen en srs[] y bajan la caja.
  c) Test: el JSON nunca llega al render.
  d) CAPTURA del debrief a 390px.
```

---

## 4 · Después de las cinco fases

Falta contenido, no arquitectura: Tramo 2 (2 paradas), Tramo 4 viaje de trabajo
(5), Tramo 6 vida afuera (4), Tramo 7 ayer y mañana (4). Unas 250 frases, mismo
formato `pal()` / `fr()`, entran sin tocar código.

El Tramo 4 es el diferenciador —*"I'm running ten minutes late"*, la cena de
negocios, la factura a nombre de la empresa— y no lo tiene ninguna app. El Tramo
7 (pasado y futuro) cierra A1 y conviene dejarlo de último: cerrar contando el
finde tiene más peso que cerrar con facturas.
