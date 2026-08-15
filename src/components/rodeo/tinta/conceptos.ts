/* EL MAPA: EMOJI DEL CONTENIDO → CONCEPTO DIBUJADO.

   ── POR QUÉ LA LLAVE ES EL EMOJI ───────────────────────────────────────────
   Porque es lo que ya está escrito. El contenido guarda el icono de cada escena
   como `icon: '✈️'` (t0-antes-de-hablar.ts, t3-viaje.ts, core.ts, jobs/*) y el
   mapa del camino lo lee tal cual (`s.icon || u.icon || u.emoji`). Cablear por
   id de escena obligaba a tocar los ~150 sitios del contenido antes de poder
   ver un solo icono nuevo; cablear por emoji deja el contenido intacto y
   convierte el reemplazo en un archivo que crece solo.
   El precio: dos escenas con el mismo emoji comparten dibujo. Es lo correcto —
   comparten concepto. Y el corolario que muerde al curar: SE ELIGE PARA EL
   EMOJI, NO PARA LA ESCENA. Si un icono calza perfecto con la escena de hoy
   pero miente para el emoji (el caso de `sunset` para 👋, ver el final), no va:
   el día que otra escena use ese emoji, ahí queda el atardecer.

   ── EL RESPALDO NO ES OPCIONAL ─────────────────────────────────────────────
   Hoy hay 73 conceptos dibujados y 109 emoji distintos en src/content. Un emoji
   que no está acá NO deja un hueco: <IconoTinta> lo pinta como emoji, tal cual
   venía. La app tiene que seguir entera mientras el set se llena, y el que
   llene el set tiene que poder agregar de a uno.

   ── LA TRAMPA DEL SELECTOR DE VARIACIÓN ────────────────────────────────────
   '✈️' son DOS puntos de código (U+2708 + U+FE0F, el selector que pide pintarlo
   a color) y '🛂' es uno solo. Si la llave se compara cruda, '✈' y '✈️' son
   llaves distintas y el mismo avión falla o acierta según qué escribió quien
   editó el contenido. Por eso `buscarConcepto` normaliza sacando U+FE0F y
   U+200D antes de mirar el mapa.
   MEDIDO al fusionar las dos mitades curadas (scratchpad/fus-censo.mjs): hoy
   NINGÚN emoji del contenido está escrito en las dos formas, y las llaves de
   acá copian la forma del contenido. O sea que la normalización todavía no
   salvó a nadie — sigue puesta porque el día que alguien pegue un ✈ pelado de
   otro lado, la salva sin que nadie se entere.

   ── POR QUÉ EL "POR QUÉ" VA EN COMENTARIO Y NO EN UN CAMPO ─────────────────
   La primera versión guardaba la justificación de cada icono en un campo
   `nota: string`. Medido en el build: 1,9 kB de prosa que nadie lee en runtime,
   viajando al teléfono de Gus dentro del chunk de la ruta. En comentario dice
   exactamente lo mismo en el diff y pesa cero.

   ── LA CLAVE ES UNA SEMILLA, NO UNA ETIQUETA ───────────────────────────────
   `clave` alimenta el sorteo de aguada (aguada.ts): misma clave = misma mancha,
   mismo giro, mismo pigmento. De ahí dos consecuencias que ya mordieron en la
   fusión:
     · Dos emoji que son la MISMA cosa comparten clave a propósito (✈️/🛫 el
       aeropuerto, 🚕/🚖 el taxi). Se ven juntos en pantalla y tienen que ser
       el mismo objeto, no dos primos.
     · Dos conceptos DISTINTOS no pueden compartirla. Las mitades traían 🎧 y
       📞 las dos como 'llamada' con dibujos distintos: dos iconos que no se
       parecen con la misma mancha se leen como un error de render. 🎧 quedó
       como 'audifonos' (que además describe el emoji y no la escena, que es la
       regla de arriba). */

import type { ComponentType, ReactNode, SVGProps } from 'react';
import {
  AlarmClock,
  Armchair,
  Banknote,
  BedDouble,
  BookOpen,
  Briefcase,
  Bug,
  Building2,
  Calendar,
  CarTaxiFront,
  CircleCheck,
  CircleQuestionMark,
  ClipboardPen,
  Coffee,
  Compass,
  ConciergeBell,
  CreditCard,
  CupSoda,
  DoorOpen,
  EarOff,
  Footprints,
  Gift,
  Globe,
  GraduationCap,
  Hammer,
  Hand,
  HandHeart,
  HandHelping,
  Headphones,
  House,
  IdCardLanyard,
  KeyRound,
  Laptop,
  LifeBuoy,
  Luggage,
  Mail,
  /* `MapIcon` es el alias OFICIAL de lucide para `Map`, y se usa ese y no el
     nombre corto por una razón dura: `import { Map }` tapa el Map NATIVO de
     JavaScript en todo el módulo. Hoy acá no hay ningún `new Map()` y no
     pasaría nada, pero el día que alguien meta un caché va a recibir "Map is
     not a constructor" y lo va a buscar en cualquier lado menos en la lista de
     iconos. Verificado que son el mismo componente (MapIcon === Map). */
  MapIcon,
  MapPin,
  MessageCircleMore,
  Package,
  Phone,
  Pill,
  PlaneTakeoff,
  Puzzle,
  Receipt,
  ReceiptText,
  Search,
  Shirt,
  ShoppingBag,
  Signpost,
  Siren,
  Smartphone,
  Sparkles,
  Speech,
  Sprout,
  Stamp,
  Sun,
  Sunrise,
  Tally5,
  ThumbsUp,
  Ticket,
  Timer,
  TrendingUp,
  TriangleAlert,
  UserRound,
  UsersRound,
  Utensils,
  Volume2,
  Wind,
  Wrench,
} from 'lucide-react';

/* Los tres que lucide no da. Viven en un .tsx porque este archivo es .ts y acá
   no se puede escribir <path/> — ver el encabezado de dibujos.tsx. */
import { DIENTE, ESE, LENGUA } from './dibujos';

/* lucide-react tipa sus iconos con LucideIcon, que además acepta `size`,
   `absoluteStrokeWidth`… Acá solo se usan atributos SVG, y tiparlo así deja
   entrar también un componente propio dibujado a mano sin pelear con el tipo
   de la librería. */
export type Trazo = ComponentType<SVGProps<SVGSVGElement>>;

export interface ConceptoTinta {
  /** SEMILLA DEL SORTEO (aguada.ts). Estable para siempre: si cambia, cambia la
      mancha del icono en toda la app. No es un id de contenido — es el nombre
      del concepto en castellano, para que se lea en el diff. */
  clave: string;
  /** El dibujo. Un icono de lucide, o uno propio con la misma pinta. */
  trazo?: Trazo;
  /** Escape para los conceptos donde lucide no da: paths crudos en la grilla
      0..24, sin <svg> alrededor. Están en dibujos.tsx y entran por acá. */
  propio?: ReactNode;
}

const MAPA: Record<string, ConceptoTinta> = {
  /* ═══ TRAMO 0 · ANTES DE HABLAR ═══════════════════════════════════════════
     Los cinco sonidos son el bloque que más dibujo propio consume: son órganos
     de la boca y lucide no tiene ninguno. */

  /* Calce directo. Dos hojas asimétricas sobre una línea de suelo, y la
     asimetría ayuda: a 18 px se distingue de `leaf` y de cualquier check.
     Es el azulejo del tramo (tramos.ts), no una escena. */
  '🌱': { clave: 'brote', trazo: Sprout },

  /* A MANO. lucide no tiene lengua ni boca (verificado: no hay `mouth`, no hay
     `lip`, no hay `tongue`). Se probaron `smile`, `smile-plus`, `scan-face` y
     `mic-vocal`: los cuatro dicen otra cosa —cara, escaneo, micrófono— y la
     escena es literalmente "saca la lengua". */
  '👅': { clave: 'lengua', propio: LENGUA },

  /* A MANO. Tampoco hay diente. `bone` dice hueso y `diamond` dice diamante;
     `smile` ya chocaba con la de arriba. */
  '🦷': { clave: 'diente', propio: DIENTE },

  /* A MANO, y el dibujo es la LETRA, no la culebra. La culebra del contenido
     es un chiste sobre la forma de la S; a 18 px una culebra reconocible pide
     escamas y cabeza, que es más detalle del que entra. El trazo hace la S de
     una pasada y le pone ojo y lengua bífida en la punta: se lee culebra y se
     lee S al mismo tiempo, que es exactamente lo que enseña la escena
     (work vs works). Y de paso rima con el resto: es caligrafía. */
  '🐍': { clave: 'ese', propio: ESE },

  /* La H que sí suena = un soplo. `wind` son tres rachas curvas con la punta
     enroscada: a 18 px se lee aire, no se lee otra cosa. `fan` (el otro
     candidato) sale molinete. */
  '💨': { clave: 'soplo', trazo: Wind },

  /* NO ES `ambulance`, y no por gusto. Medido en el careo: la ambulancia de
     lucide son siete trazos en 24 unidades (cabina, caja, cruz, dos ruedas) y a
     18 px se vuelve una mancha — fue el peor de los ocho. Y el significado real
     tampoco era ese: la escena es "Las que te salvan" (t0-s3-salvavidas), o sea
     salvavidas, no emergencia médica. `life-buoy` gana en las dos cosas, y por
     eso la clave dice `salvavidas` y no `ambulancia` como en el careo. */
  '🚑': { clave: 'salvavidas', trazo: LifeBuoy },

  /* Calce directo, y ya estaba en el bundle (frase-card.tsx y alfred-live.tsx lo
     importan). Los dos arcos aguantan 18 px porque son trazos separados del
     cuerpo. */
  '🔊': { clave: 'sonido', trazo: Volume2 },

  /* Calce directo y de los más legibles del set: el pulgar y el puño son dos
     masas de tamaño distinto, y esa diferencia sobrevive el achique. Sirve
     igual en las dos escenas que lo usan ("sí, no y por favor" en el T0 y
     "acordar y avanzar" en la reunión): las dos son un OK. */
  '👍': { clave: 'si', trazo: ThumbsUp },

  /* "Las cuatro que abren puertas" (gracias, perdón, permiso) en el T0, la
     puerta de embarque en el T3 y la de la recepción en el pack — una sola
     entrada para las tres, que es de lo que se trata mapear por emoji.
     `door-closed` es un rectángulo con un punto: a 18 px podía ser un celular,
     una tarjeta o una nevera. `door-open` dibuja la hoja abierta en ángulo y
     ese trapecio no es ninguna otra cosa. */
  '🚪': { clave: 'puerta', trazo: DoorOpen },

  /* LA MANO DE LUCIDE SE LA LLEVA ESTA ESCENA Y NO LAS OTRAS DOS, y no es
     arbitrario: el contenido dice "son los diez dedos: una vez los tienes,
     todo lo demás es combinarlos" (analogy_es de t0-s10). Acá los cinco dedos
     SON el contenido; en 🙋 y en 👋 la mano es un gesto y el dedo no importa.
     Hay una sola mano abierta en lucide, así que las otras dos se resuelven
     por otro lado (ver 🙋) o no se resuelven (ver 👋). */
  '🖐️': { clave: 'cinco', trazo: Hand },

  /* "Los que faltan": 20, 30, 100… y la trampa -TEEN/-TY. Descartados con
     captura: `hash` se lee hashtag, `percent` se lee descuento,
     `chart-no-axes-column` se lee gráfico y `list-ordered` pierde los dígitos
     a 18 px. `tally-5` son cinco palotes con el quinto cruzado: es la marca
     universal de contar y es la silueta más limpia de las cinco.
     También se descartó `banknote` aunque la trampa sea de plata: el nodo de
     al lado (🧾) ya es la cuenta, y dos iconos de plata seguidos se leen como
     el mismo nodo repetido. */
  '💯': { clave: 'cien', trazo: Tally5 },

  /* `receipt-text` y no `receipt`: el de texto lleva tres renglones y el otro
     lleva un signo de dólar. La escena es "precio, cuarto, puerta y hora", o
     sea números en general, no solo plata — y el borde dentado de la tira ya
     dice recibo sin necesidad del dólar.
     OJO: `receipt` a secas sí está en el mapa, en 🏧. Son dos dibujos
     distintos de la misma familia y viven en tramos distintos. */
  '🧾': { clave: 'recibo', trazo: ReceiptText },

  /* Calce directo. Rectángulo con dos volúmenes de altura distinta; `building`
     (el de las nueve ventanas) a 18 px funde los puntos en gris. */
  '🏢': { clave: 'oficina', trazo: Building2 },

  /* "I'm — yo soy, yo estoy". Acá 🙋 se queda sin `hand` (se lo llevó 🖐️) y
     resulta que no lo necesita: en su único sitio visible el concepto es YO,
     no "levanto la mano". `user-round` es una cabeza y unos hombros — la
     silueta más limpia del bloque de personas y la que menos se ensucia a
     18 px (frente a `users`, que ya son dos cabezas pegadas). */
  '🙋': { clave: 'yo', trazo: UserRound },

  /* El signo de pregunta, tal cual el emoji. Se descartó `badge-question-mark`
     (el borde festoneado se vuelve un halo sucio a 18 px). Cubre las cuatro
     preguntas del T0 y las del control de migración del T3. */
  '❓': { clave: 'pregunta', trazo: CircleQuestionMark },

  /* "It's — pa' las cosas". Una caja es LA cosa genérica. `box` (el cubo
     pelado) también se leía, pero `package` trae la cinta y se distingue mejor
     del rombo de cualquier otro icono. */
  '📦': { clave: 'cosa', trazo: Package },

  /* Calce directo. `map-pinned` (el pin sobre el mapa desplegado) se guardó
     para no competir: acá alcanza la gota sola. */
  '📍': { clave: 'lugar', trazo: MapPin },

  /* CUIDADO CON LA REPETICIÓN, y por eso NO es otro signo de pregunta.
     t0-s14 (❓) y t0-s17 (🤔) caen a tres nodos de distancia en el mismo tramo.
     El candidato obvio para 🤔 era `message-circle-question-mark`, y en la
     captura los dos nodos se leían como el mismo icono repetido. `search` dice
     "averiguar el dato", que es justo lo que hacen cuál/quién/cuánto tiempo, y
     a 18 px es la lupa: nítida y distinta de todo lo demás del tramo.
     La lupa se repite en 🔎 (pack de soporte), pero están a cuatro tramos de
     distancia y nunca se ven en la misma pantalla. */
  '🤔': { clave: 'duda', trazo: Search },

  /* Calce directo. Cuadrado + dos lóbulos arriba: una de las siluetas más
     robustas del set, sin ambigüedad a ningún tamaño. */
  '🎁': { clave: 'regalo', trazo: Gift },

  /* ═══ TRAMO 1 · EL PRIMER DÍA ═════════════════════════════════════════════ */

  /* Este se ve en el AZULEJO del tramo (16 px), no en un nodo: 🚶 es icon de
     u1-llegar pero sus dos escenas traen el suyo.
     `footprints` y no `person-standing` ni `log-in`: la figura de palito es el
     glifo de accesibilidad y se lee como tal, y la flecha entrando al corchete
     es un botón de iniciar sesión —la app tiene uno— así que mentiría. Dos
     pisadas dicen "llegaste caminando" y no se parecen a ningún control. */
  '🚶': { clave: 'llegar', trazo: Footprints },

  /* "El saludo del pasillo": te cruzas con el jefe a primera hora. `sunrise`
     trae media rueda, el horizonte y la flecha hacia arriba: las tres cosas
     leen a 18 px y juntas dicen mañana. */
  '🌅': { clave: 'amanecer', trazo: Sunrise },

  /* La escarapela. `id-card-lanyard` es el único de los tres candidatos con la
     pinza arriba, y esa pinza es lo que lo despega de un carnet cualquiera
     (`id-card` es apaisado y se lee cédula; `contact-round` se lee retrato). */
  '📛': { clave: 'escarapela', trazo: IdCardLanyard },

  /* "No entendiste, se te fue el hilo". La oreja tachada es más honesta que
     cualquier cara: la escena no es que estés triste, es que no oíste. */
  '🙉': { clave: 'no-oigo', trazo: EarOff },

  /* "Te falta una palabra" en el T1 y el mapa de papel en el T3. Se evaluó
     `book-open-text` (o sea, diccionario) y se descartó: cambia la metáfora que
     eligió quien escribió el contenido. `map-pinned` mete un pin que a 18 px
     tapa medio mapa y `signpost` dice "cartel", que es otra cosa. El mapa
     plegado con los dos dobleces se lee instantáneo. */
  '🗺️': { clave: 'mapa', trazo: MapIcon },

  /* ═══ TRAMO 2 · LA OFICINA DE TODOS LOS DÍAS ══════════════════════════════ */

  /* Calce directo, y ya estaba en el bundle. Taza con asa y tres vapores: la
     silueta más reconocible de las ocho originales. Azulejo del tramo 2 y
     escena del smalltalk. */
  '☕': { clave: 'cafe', trazo: Coffee },

  /* LOS TRES AZULEJOS DE TRAMO QUE FALTABAN, y no eran un detalle: el icono de
     un tramo se pinta en su cabecera pegajosa, o sea que está en pantalla todo
     el rato que dura ese capítulo. Sin entrada caían al respaldo, y en la
     captura del mapa se veía el 💼 A COLOR justo debajo del avión entintado de
     "Sales del país" — un emoji suelto entre iconos de tinta canta más que
     cincuenta emojis juntos, porque ahí sí hay con qué compararlo.
     Los tres son de tramos que todavía no tienen contenido (4, 6 y 7), y por
     eso las dos tandas de curaduría —que fueron por contenido— no los tocaron:
     no aparecen en ninguna escena, solo en tramos.ts. */
  '💼': { clave: 'viaje-trabajo', trazo: Briefcase },
  '🏡': { clave: 'vida-afuera', trazo: House },
  '🎓': { clave: 'graduacion', trazo: GraduationCap },

  /* EL COMPROMISO MÁS CAREADO DE LA FUSIÓN, y las dos mitades no coincidieron:
     una eligió `handshake` (clave 'presentar') y la otra `users-round` (clave
     'trato'), midiendo cada una por su lado. Se volvieron a mirar juntas a
     18 px al fusionar y ganó `users-round`: el apretón son cinco paths muy
     curvos que se cruzan DENTRO de un cuadrado de 10 unidades, y con el trazo
     en 1.95 los huecos entre dedo y dedo se cierran — a 18 px es una mancha.
     Es el mismo fenómeno que explica por qué `bug` pasa con once trazos: lo que
     sobrevive el achique es la silueta EXTERIOR, no el número de trazos.
     `users-round` no dice "trato", dice "otra persona", y eso no miente en
     ninguno de los tres sitios donde vive 🤝: presentarte (u3), pedir una mano
     con el código (tech) y la llamada de venta (ventas).
     SI ALGÚN DÍA SE CABLEA 👥 (icon de u3, hoy tapado por sus escenas): tiene
     que ir a `users` (tres siluetas) y no a otra variante redonda, o los dos
     nodos se leen iguales. */
  '🤝': { clave: 'trato', trazo: UsersRound },

  /* `globe` y no `earth`: los continentes de `earth` son tres manchas que a
     18 px se leen como suciedad dentro del círculo. La retícula de meridianos
     de `globe` aguanta porque son líneas rectas y largas. */
  '🌎': { clave: 'mundo', trazo: Globe },

  /* Lunes 8 a.m. `sun` pleno (rueda + ocho rayos), distinto del `sunrise` del
     pasillo por la rueda completa. Están en tramos distintos y no se cruzan en
     pantalla, pero igual se eligió que difirieran. */
  '☀️': { clave: 'sol', trazo: Sun },

  /* "Gracias y de nada". lucide no tiene manos juntas (no hay `pray`).
     `hand-heart` —una mano abierta sosteniendo un corazón— dice gratitud sin
     decir amor, que es lo que decía `heart` pelado. `heart-handshake` era lo
     mismo pero con el doble de trazos adentro del corazón: mancha a 18 px. */
  '🙏': { clave: 'gracias', trazo: HandHeart },

  /* EL EMOJI NO DESCRIBE A SU PROPIA ESCENA, y esto está medido leyendo los
     chunks: u5-s1 son "This is my desk", "Can I ask a question?", "Can you
     help me, please?", "Can you send it to me?", "Do you have a minute?". De
     baños, nada — el título es "Ubicarte e instalarte". El cartel indicador
     dice ubicarse y aguanta que 🚻 reaparezca en otra escena: un cartel sirve
     igual para señalar el baño. (`toilet` a 18 px se leía como una silla.) */
  '🚻': { clave: 'ubicarte', trazo: Signpost },

  /* "Pedir una mano", literal. Una palma abierta por debajo de algo que baja:
     el gesto de recibir. */
  '🤲': { clave: 'pedir', trazo: HandHelping },

  /* Calce directo, y la pieza de rompecabezas es de las siluetas más
     inconfundibles que existen a cualquier tamaño. */
  '🧩': { clave: 'encajar', trazo: Puzzle },

  /* CLAVE 'audifonos' Y NO 'llamada', a propósito: 📞 ya es 'llamada' y la
     clave es la semilla de la aguada — dos dibujos distintos con la misma
     mancha se leen como un error de render.
     `headset` (con el micrófono del call center) también leía y hasta dice
     "soporte" más rápido, pero la llave es el emoji 🎧, que NO tiene micrófono,
     y el mismo emoji está en core.ts ("Se abre el Meet") y en el pack de
     soporte. Agregarle un micrófono acá se lo pone allá. */
  '🎧': { clave: 'audifonos', trazo: Headphones },

  /* Cabeza de perfil con dos ondas saliendo. Se careó contra `mic` y se
     descartó a propósito: la app usa el micrófono para GRABAR (PasoVoz), y un
     nodo del mapa con un micrófono iba a leerse como "acá se graba". */
  '🗣️': { clave: 'opinar', trazo: Speech },

  /* "Tareas y tiempos". El despertador (con las dos campanas) y no el reloj
     pelado: las campanas son lo que dice plazo y no hora. */
  '⏰': { clave: 'hora', trazo: AlarmClock },

  /* El sobre. Nada que discutir. */
  '📧': { clave: 'correo', trazo: Mail },

  /* ═══ TRAMO 3 · EL VIAJE ══════════════════════════════════════════════════ */

  /* `plane` es la flecha diagonal de siempre: a 18 px se vuelve una raya y
     podría ser un cursor, un enviar o un avión. `plane-takeoff` trae la línea de
     suelo, que da horizonte y ancla la silueta. */
  '✈️': { clave: 'avion', trazo: PlaneTakeoff },
  /* MISMA CLAVE QUE '✈️'. Son la unidad t3-aeropuerto: ✈️ es su `emoji` y 🛫 su
     `icon`, y el camino lee `s.icon || u.icon || u.emoji`, así que en la
     práctica se ve 🛫 y ✈️ es el respaldo del respaldo. Dibujarlos distinto
     sería inventar dos aviones donde el contenido puso uno. */
  '🛫': { clave: 'avion', trazo: PlaneTakeoff },

  /* `luggage` contra `briefcase` y `backpack`. Briefcase (2 trazos) es más
     limpio pero dice MALETÍN DE TRABAJO, y la escena es facturar equipaje en el
     mostrador. Backpack se empasta. Luggage tiene la manija telescópica arriba
     y las dos ruedas abajo: es lo que hace que se lea "maleta de viaje" y no
     "caja", y a 18 px las dos ruedas siguen ahí. */
  '🧳': { clave: 'maleta', trazo: Luggage },

  /* COMPROMISO ASUMIDO: lucide 1.27.0 no tiene pasaporte (verificado contra
     node_modules/lucide-react/dist/esm/icons). `id-card` dice credencial de
     oficina, no frontera; `book-user` es lo más cercano a la libreta pero a
     18 px el círculo de la cara se come el librito. `stamp` es una metonimia
     —no el pasaporte, el sello que te ponen— y su silueta (mango + base ancha +
     línea de mesa) es la más limpia de las tres. Candidato #1 a reemplazar por
     un dibujo propio: nadie lee "migración" en un sello sin el contexto de la
     fila. */
  '🛂': { clave: 'migracion', trazo: Stamp },

  /* OJO CON EL VECINO. La escena es "Cuando preguntan más" y está PEGADA a "Las
     cuatro preguntas" (❓) en la misma unidad. `circle-question-mark` otra vez,
     o cualquier variante con "?", daba dos signos de pregunta redondos uno al
     lado del otro y el camino se volvía ilegible. `message-circle-more` dice lo
     mismo con otra forma: el globo con tres puntos es "y siguen", que es
     exactamente lo que hace el oficial de migración. Descartados en captura:
     `scan-search` y `scan-eye` (los corchetes de esquina se pierden),
     `search-check` (dice "revisado", no "preguntan"). */
  '🧐': { clave: 'repregunta', trazo: MessageCircleMore },

  /* No hay asiento de avión en lucide. `armchair` es un sillón, y esa es la
     licencia: la escena es "En el avión" y el concepto que hace falta es
     ASIENTO. Descartado `sofa` — a 18 px se lee ancho y bajo, o sea sala de
     estar; el sillón individual es lo que se parece a una butaca. */
  '💺': { clave: 'asiento', trazo: Armchair },

  /* El pajito que sale del vaso es la marca. `glass-water` es un trapecio pelado
     y a 18 px podría ser una maceta. */
  '🥤': { clave: 'bebida', trazo: CupSoda },

  /* SIETE TRAZOS Y AUN ASÍ PASA, porque el cartel del techo —lo único que
     distingue un taxi de un carro— es una silueta exterior, no un detalle
     interior. Careado contra `car-front`: sin el cartel es "carro", con el
     cartel es "taxi", y el cartel sobrevive. */
  '🚕': { clave: 'taxi', trazo: CarTaxiFront },
  /* MISMA CLAVE que 🚕 — el azulejo de la unidad "Llegar y moverte" y la escena
     "El taxi" se ven en la misma pantalla, y son el mismo taxi. */
  '🚖': { clave: 'taxi', trazo: CarTaxiFront },

  /* NO ES `hotel`, aunque exista y se llame así. Medido: el `hotel` de lucide
     son DIEZ trazos (un edificio con ventanas) y a 18 px las ventanas se funden
     en gris — queda un rectángulo mudo, indistinguible del `building-2` que ya
     usa la oficina. `bed-double` son 4 trazos, se lee de una, y además dice lo
     que la unidad dice: cuarto de hotel, no fachada. */
  '🏨': { clave: 'hotel', trazo: BedDouble },

  /* `key` (la llave en diagonal con el ojo chico) y `key-square` se empastan
     donde el ojo se junta con el paletón. `key-round` tiene el ojo grande y
     redondo separado del cuerpo: es la que aguanta. */
  '🔑': { clave: 'llave', trazo: KeyRound },

  /* Un trazo, sin discusión. */
  '🔧': { clave: 'arreglo', trazo: Wrench },

  /* Tenedor y cuchillo derechos. `utensils-crossed` los cruza en X, y una X
     sobre cubiertos se lee como "cerrado / no se come acá" — al revés de lo que
     dice la escena. (`fork-knife` es un ALIAS del mismo archivo que `utensils`:
     mismo dibujo, no es una opción distinta.) */
  '🍽️': { clave: 'comer', trazo: Utensils },

  /* La carta del restaurante. `book-open-text` (6 trazos) le mete renglones que
     a 18 px son tres manchas grises, y `notebook-text` son 8. Los dos arcos
     pelados alcanzan. */
  '📖': { clave: 'carta', trazo: BookOpen },

  '💳': { clave: 'tarjeta', trazo: CreditCard },

  /* La bolsa con las dos asas. `handbag` es una cartera y `paper-bag` una bolsa
     de papel de supermercado: las dos leen, pero la escena es salir de compras
     y ese es el pictograma que todo el mundo tiene aprendido. */
  '🛍️': { clave: 'compras', trazo: ShoppingBag },

  '👕': { clave: 'ropa', trazo: Shirt },

  /* COMPROMISO ASUMIDO, Y ADEMÁS UN DIBUJO PROPIO QUE FALLÓ. lucide 1.27.0 no
     tiene cajero automático (verificado: no existe `atm`). Se dibujaron dos
     versiones a mano y se miraron en captura: las dos leen como MONITOR CON
     PIE, porque una caja ancha con algo angosto colgando abajo es, literalmente,
     la silueta de un pie de monitor. La tercera, con el billete ancho y en
     diagonal, se lee "pantalla con una bandera".
     La escena es "La caja y el cajero" y dos de sus cuatro frases son
     "Can I get a receipt?" y "Is there a fee?". `receipt` es la metonimia —no
     el cajero, el papel que sale de la caja— y fue el más legible de todo lo
     probado en esa fila, por encima de `landmark` (que además diría "banco", y
     en la escena no hay banco). Mismo tipo de compromiso que `stamp` para
     migración. */
  '🏧': { clave: 'cajero', trazo: Receipt },

  /* El triángulo de advertencia. `circle-alert` y `octagon-alert` dicen lo
     mismo, pero el triángulo es el único de los tres que no se confunde con el
     ❓ redondo de dos unidades antes. */
  '🆘': { clave: 'auxilio', trazo: TriangleAlert },

  '📱': { clave: 'celular', trazo: Smartphone },

  /* La cápsula partida en dos. `pill-bottle` es un frasco y a 18 px es una caja
     con tapa: podría ser cualquier cosa. */
  '💊': { clave: 'remedio', trazo: Pill },

  /* ═══ PACKS DE TRABAJO · recepción · soporte · tech · ventas ══════════════ */

  /* La campanita de mostrador, con la cúpula y la base. `bell-ring` es la
     campana colgante de notificación: dice "aviso de app", no "recepción". */
  '🛎️': { clave: 'timbre', trazo: ConciergeBell },

  /* "Anunciar y tomar recados". `notepad-text` (7 trazos) se empasta con la
     espiral y los renglones; `sticky-note` es un cuadrado con la esquina
     doblada y podría ser un archivo; `pencil-line` es limpísimo pero un lápiz
     solo, en una interfaz, significa "editar". El portapapeles con la pluma es
     el gesto de tomar un recado en un mostrador, y sus 4 trazos aguantan. */
  '📝': { clave: 'recado', trazo: ClipboardPen },

  /* Círculo + aguja: dos trazos, imposible de confundir. `navigation` (la
     flecha) dice "GPS" y `signpost` dice "cartel de calle"; la escena es
     orientar a alguien, que es la brújula. */
  '🧭': { clave: 'brujula', trazo: Compass },

  /* Las dos muescas laterales son lo que lo hace boleto. `tickets` apila dos y
     a 18 px se lee como un solo rectángulo grueso. */
  '🎫': { clave: 'ticket', trazo: Ticket },

  /* 🛠️ es martillo Y llave, pero 🔧 (la llave sola) ya está tomado por el
     "Cuando algo no sirve" del hotel y repetir el dibujo sería decir que son la
     misma escena. `hammer` es la otra mitad del emoji, se lee de una y ancla el
     azulejo del pack de soporte (y el del tramo 5). Descartados: `toolbox`
     (5 trazos) y `tool-case` (4 trazos, 25 comandos) se empastan los dos — son
     cajas con cosas adentro, y "cosas adentro" es justo lo que no sobrevive a
     18 px. */
  '🛠️': { clave: 'herramientas', trazo: Hammer },

  /* La lupa pelada. Dos trazos. Es el mismo dibujo que 🤔 ('duda'), y se deja
     así: están a cuatro tramos de distancia y el concepto es el mismo verbo
     (averiguar). Si algún día se ven juntos, este es el primero que hay que
     cambiar. */
  '🔎': { clave: 'buscar', trazo: Search },

  /* El tilde en círculo, no el tilde solo: `check` suelto en un camino de
     paradas se lee como "ya hiciste esta parada" y chocaría con el estado
     `hecho` del nodo. El círculo lo vuelve un objeto. */
  '✅': { clave: 'resuelto', trazo: CircleCheck },

  /* `laptop-minimal` (pantalla + raya) es más limpio pero es también,
     exactamente, un monitor. La base en trapecio de `laptop` es lo único que
     dice "portátil", y sobrevive. */
  '💻': { clave: 'laptop', trazo: Laptop },

  /* ONCE TRAZOS Y PASA. Es el contraejemplo del contador: las patas y las
     antenas salen hacia afuera del cuerpo, así que forman silueta en vez de
     rellenar un interior. A 18 px se lee "bicho" antes que cualquier otra cosa
     de la hoja. (Comparar con `handshake`, que con cinco trazos es una mancha
     porque se cruzan todos adentro — ver 🤝.) */
  '🐛': { clave: 'bicho', trazo: Bug },

  /* Círculo, aguja y la pestaña de arriba: tres trazos. `alarm-clock` (6) le
     pone las dos campanas y las patas y se ensucia; `clock` pelado dice "hora",
     no "cronómetro", y la escena es el standup de las 9. */
  '⏱️': { clave: 'cronometro', trazo: Timer },

  /* Ocho trazos, y pasa por lo mismo que el bicho: los rayos de la sirena son
     exteriores. `megaphone` leía más limpio pero dice "anuncio de marketing" y
     `flag` dice "marcar", cuando la escena es reportar que algo se rompió. */
  '🚨': { clave: 'alarma', trazo: Siren },

  /* La flecha que sube. `chart-line` es la misma idea sin punta de flecha y a
     18 px la punta es lo que dice "sube"; `chart-no-axes-combined` (6 trazos)
     mete barras y se empasta. */
  '📈': { clave: 'ventas', trazo: TrendingUp },

  /* El auricular clásico. `phone-call` le agrega dos arcos de onda que a 18 px
     son dos rayas sueltas al lado del tubo. */
  '📞': { clave: 'llamada', trazo: Phone },

  /* Cuatro puntas grandes + una chica: el ✨ del contenido son tres destellos y
     este es el que más se le parece sin volverse ruido. `wand-sparkles` (8
     trazos) mete la varita y dice "IA", que en esta app es justo lo que no
     queremos decir. */
  '✨': { clave: 'brillo', trazo: Sparkles },

  /* El billete con el círculo del centro. Queda libre porque 🏧 se fue a
     `receipt`: si los dos hubieran caído en `banknote`, dos escenas distintas
     tendrían el mismo dibujo. */
  '💵': { clave: 'billete', trazo: Banknote },

  /* El calendario pelado. `calendar-days` mete la grilla de puntos: DIEZ trazos
     y a 18 px es un rectángulo con ruido adentro. */
  '📅': { clave: 'calendario', trazo: Calendar },
};

/* ── LOS QUE SE DEJARON EN EMOJI A PROPÓSITO ────────────────────────────────
   No es que falten: se probaron y se decidió que el respaldo es mejor.

   👋 saludo — u7-s3 ("Despedir la semana") y job-soporte-s1 ("Atender el
      ticket"). lucide no tiene mano saludando; la única mano abierta es `hand`
      y se la llevó 🖐️. Se dibujaron tres a mano (mano inclinada con arcos de
      movimiento, mano con dedos, manopla) y las tres se descartaron mirando la
      captura: a 18 px cuatro dedos dentro de 8 unidades de ancho se cierran con
      el trazo en 1.95, y la que no se cerraba dejaba de leerse como mano.
      `smile` sí se lee, pero dice "cara contenta", no "hola".
      Y OJO CON EL ATAJO QUE PARECE BUENO: `sunset` calza perfecto con la escena
      del viernes en la tarde y es una trampa — la llave es el EMOJI, así que el
      día que alguien use 👋 para saludar, ese nodo muestra un atardecer.
      El emoji aguanta: 👋 es de Unicode 6.0 (2010), no corre el riesgo de
      🪪/🛟, que salieron como cuadrito vacío en el Android de Gus.

   👄 boca · 😰 nervios · 🪂 paracaidas — no se ven (son `emoji` de unidad,
      tapados por el `icon` de la misma unidad) y tampoco tienen respuesta:
      no hay boca, no hay cara de nervios que no diga "triste"
      (`frown`/`annoyed`/`meh` dicen otra cosa) y no hay paracaídas (`umbrella`
      dice lluvia).

   LA BANCA — iconos de UNIDAD que hoy NO llegan a la pantalla. El mapa pinta
   `s.icon || u.icon || u.emoji` y todas las escenas de esas unidades traen
   icono propio, así que el de unidad nunca gana. Cada icono cableado pesa
   ~105 B gzip: cablearlos es pagar por dibujar nada. Están elegidos y
   verificados por si una escena futura nace sin icono:
     🔢 numeros Calculator · 🧱 pieza ToyBrick · 🗝️ llave KeyRound ·
     ⛑️ kit HardHat · 👥 equipo Users · 💬 charla MessagesSquare ·
     📋 tareas ClipboardList · 🎉 celebrar PartyPopper

   PENDIENTES DE VERDAD — los azulejos de los tramos 4, 6 y 7 (💼, 🏡, 🎓) SÍ
   se ven y no están mapeados. Quedan para la tanda que cure esos tramos. */

/* U+FE0F (selector de variación a color) y U+200D (el pegamento de los emoji
   compuestos) se sacan antes de comparar: ver la trampa del encabezado. Van
   ESCAPADOS y no literales a propósito — pegados crudos son dos caracteres
   invisibles en el fuente, y el primero que "limpie espacios raros" los borra
   sin enterarse de que eran el patrón. */
const ADORNOS = /[\uFE0F\u200D]/g;

export function buscarConcepto(emoji: string | undefined | null): ConceptoTinta | undefined {
  if (!emoji) return undefined;
  return MAPA[emoji] ?? MAPA[emoji.replace(ADORNOS, '')];
}
