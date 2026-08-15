import { useEffect, useRef, useState } from 'react';

import SocialCards, { type CardItem } from '@/components/ui/card-fan-carousel';
import { useApp, type View } from '@/stores/app';
import type { LibroId } from '@/content/libro';

import './aurora.css';

/* CARRUSEL DE FEATURES — la vitrina que se abre desde el chevron ⌄ del Home.

   Monta el SocialCards VERBATIM (card-fan-carousel.tsx) y solo le pasa las
   cards: el abanico, el GSAP, el hover, las flechas ‹ ›, los puntos y el swipe
   son los suyos. Aquí vive únicamente el CONTENIDO: qué feature es cada carta
   y a dónde navega.

   OCHO cartas, todas con imagen real (pedido de Gus para mandárselo a
   amigos: «deja solo las que ya tienen imagen»). Fuera quedaron SUBE —que iba
   sobre una gradiente, no una foto— y los dos «Próximamente» transparentes.
   La octava es PODCAST (2026-08-13).

   El abanico ARRANCA centrado en el índice 3 (centerIndex inicial = HALF), y de
   ahí se pagina con el dedo o con las flechas. Nota: el componente solo pagina
   con ≥ 7 cartas (adaptación 5 de card-fan-carousel: `>=`, para que 7 no se
   queden en un abanico estático e intocable); con 8 la paginación es la del
   componente original sin adaptación siquiera (8 > 7). El abanico solo enseña
   7 a la vez, así que con 8 cartas UNA queda fuera al nacer — cuál, se decide
   abajo, en el orden del arreglo.

   ORDEN DE LAS CARTAS (decisión, no descuido): la que nace al frente es la del
   índice 3, así que ahí va SLANG —la firma de la app—. El arreglo NO es el
   orden de lectura sino una ROTACIÓN del mismo: a la izquierda inmediata de
   SLANG caen los dos LIBROS (los recién horneados); el resto reparte el
   abanico. Se conserva la adyacencia cíclica del orden original, solo centrada
   en SLANG al abrir.

   Las imágenes son las ilustraciones de Gus
   (public/carrusel/{slang,story,conversacion,oficina,dna}.jpg, 800×1400, set
   coherente con acentos lima) y las dos tapas de libro
   (public/libro/{v00,00}-portada.webp): lo que se ve en la vitrina es
   literalmente lo que se abre al tocar. */

/** Índice de la carta centrada al abrir: el HALF del componente (=3), que es
    donde nace su centerIndex al paginar. Ahí ponemos SLANG. */
const CENTRO_INICIAL = 3;

/** …salvo para un A1, que abre con su RUTA al frente: la carta 0. Ver la nota
    de `ruta` más abajo — no alcanza con ponerla primera en el arreglo. */
const CENTRO_A1 = 0;

/* Overlay de una feature real. Dos registros según dónde esté la carta:
   - CENTRADA: gradiente oscuro desde abajo + eyebrow mono + el bloque de texto
     (título display, subtítulo y la línea en español).
   - EN UN FLANCO: solo el rótulo micro de arriba con el nombre de la feature.
     El bloque rico no cabe — en el abanico las cartas laterales están tapadas
     por la central y el texto se leería cortado a media palabra (ver el
     comentario de .cf-overlay en aurora.css) — pero el nombre en el borde
     superior sí, que es la parte de la carta que ninguna vecina alcanza.
   Quién manda lo decide el CSS con el data-centro del lienzo. */
function OverlayFeature({
  titulo,
  subtitulo,
  linea,
  aurora = false,
}: {
  titulo: string;
  subtitulo: string;
  linea: string;
  /* SUBE no tiene ilustración propia: va sobre una gradiente aurora, que es
     mucho más clara y saturada que las fotos oscuras de las demás y se come
     el texto blanco. `aurora` añade .cf-overlay--aurora, que solo sube el
     velo — ninguna clase existente cambia, así que las cartas con foto
     quedan pixel-iguales. */
  aurora?: boolean;
}) {
  return (
    <div className={`cf-overlay${aurora ? ' cf-overlay--aurora' : ''}`}>
      <p className="cf-overlay__tag">{titulo}</p>
      <p className="cf-overlay__eyebrow">FEATURE</p>
      <div className="cf-overlay__texto">
        <h3 className="cf-overlay__titulo">{titulo}</h3>
        <p className="cf-overlay__sub">{subtitulo}</p>
        <p className="cf-overlay__linea">{linea}</p>
      </div>
    </div>
  );
}

/* ← AL ORIGEN (regla 5): «cuando hago click en el boton para ← regresar me
   lleva directo al home, debe regresar es al carrusel de features». Las vistas
   no saben por dónde entró el usuario — su ← siempre hace setView('home') —,
   así que la marca la deja QUIEN abre: al salir por una carta se levanta
   `carruselAlVolver` y el Home, al montar, aparece con la vitrina abierta.
   Se lee del store con getState() y no con un hook: esto corre dentro de un
   onClick, no en render, y así el carrusel no se re-renderiza por suscribirse
   a un setter que nunca cambia. */
/** Entrar a un libro concreto: fija cuál abre la vista LIBRO y navega. La
    precarga (todo el libro antes de abrir) la dispara la vista al entrar. */
/* Exportados: el BENTO de teléfonos (bento-features.tsx) navega con estas
   MISMAS puertas — la marca de carruselAlVolver es una sola para las dos
   vitrinas, así el ← de cualquier vista reabre la que corresponda. */
export function abrirLibro(id: LibroId) {
  useApp.getState().setLibroActivo(id);
  abrirFeature('libro');
}

export function abrirFeature(view: View) {
  const { setCarruselAlVolver, setView } = useApp.getState();
  setCarruselAlVolver(true);
  setView(view);
}

export function CarruselFeatures() {
  const lienzoRef = useRef<HTMLDivElement>(null);
  // El nivel del onboarding decide dónde cae la carta RUTA (ver más abajo).
  const nivel = useApp((s) => s.nivel);
  /* `undefined` fuera de A1 A PROPÓSITO, no CENTRO_INICIAL: sin la prop el
     abanico usa su propio cálculo (`needsPagination ? HALF : totalCards >> 1`)
     y queda idéntico al de hoy pase lo que pase con el número de cartas.
     Pasarle un 3 fijo empataría con las 7 de ahora y mentiría el día que sean
     menos de 7 —ahí el original centra en totalCards>>1, no en 3—. */
  const centroInicial = nivel === 'A1' ? CENTRO_A1 : undefined;
  /* El estado local espeja el centro del componente para pintar `data-centro`;
     tiene que ARRANCAR en el mismo índice, o el primer render dibujaría el
     overlay rico sobre una carta que no es la del frente. */
  const [centro, setCentro] = useState(centroInicial ?? CENTRO_INICIAL);

  /* Qué carta está centrada. El componente de Gus no lo publica (y no se
     toca), pero SÍ lo pinta: el punto de paginación activo lleva la utilidad
     `scale-[1.3]`. Observamos la clase de los puntos y espejamos el índice en
     `data-centro`; es leer la verdad que el propio componente ya renderiza, en
     vez de duplicar su lógica de paginación (que además ignora entradas
     mientras anima y se desincronizaría).
     Va por atributo y no por prop para NO provocar un render nuevo del
     carrusel: cambiar `cards` invalidaría su useEffect de GSAP en mitad de la
     animación de paginado. Con las 7 cartas el abanico SÍ pagina (adaptación 5
     del componente), así que pinta puntos y el observador lee de verdad; el
     valor inicial CENTRO_INICIAL=3 solo cubre el primer render, antes de que el
     observador se enganche. */
  useEffect(() => {
    const lienzo = lienzoRef.current;
    if (!lienzo) return;
    const puntos = Array.from(
      lienzo.querySelectorAll<HTMLSpanElement>('section > div:last-child > div > span'),
    );
    if (!puntos.length) return;

    const leer = () => {
      const i = puntos.findIndex((p) => p.className.includes('scale-'));
      if (i >= 0) setCentro(i);
    };
    const observador = new MutationObserver(leer);
    puntos.forEach((p) => observador.observe(p, { attributes: true, attributeFilter: ['class'] }));
    leer();
    return () => observador.disconnect();
  }, []);

  /* La RUTA (antes OFICINA). Sale del arreglo de abajo porque su POSICIÓN
     depende del nivel: para un A1 es la carta con la que se entra a la app —
     literalmente su curso—, así que va PRIMERA. Para cualquier otro nivel se
     queda de última, exactamente donde está desde siempre.
     El nivel se lee del store y no de localStorage: useApp ya lo hidrata al
     crearse Y lo actualiza completar() del onboarding, así que la carta se
     reordena sin esperar una recarga.

     MEDIDO, y por eso hay DOS cambios y no uno: "primera en el arreglo" no es
     "la que se ve". El abanico nace centrado en su HALF (=3), así que con la
     RUTA en el índice 0 la vitrina abría en Alicia y la RUTA quedaba en el
     flanco izquierdo, a tres toques de ‹ — o sea, un A1 seguía sin ver su
     ruta. Por eso además le pasamos `centroInicial` al abanico (adaptación 6
     de card-fan-carousel). El componente sigue sin saber qué es "RUTA": recibe
     un número. Quien sabe de features es este archivo. */
  const ruta: CardItem = {
    imgUrl: '/carrusel/oficina.jpg',
    alt: 'RUTA · Tu ruta de inglés, paso a paso',
    onClick: () => abrirFeature('a1'),
    contenido: (
      <OverlayFeature
        titulo="RUTA"
        subtitulo="Tu ruta de inglés, paso a paso"
        linea="Desde cero y con packs por profesión."
      />
    ),
  };

  // Siete cartas aquí (la octava, RUTA, se suma abajo según el nivel),
  // ordenadas para que SLANG quede al frente (índice 3, donde nace el centro
  // del abanico paginado). A su izquierda inmediata, los TRES LIBROS (One Good
  // Part, Verne, Alicia). A la derecha, CONVERSACIÓN → PODCAST, y DNA cierra el
  // arreglo. Se quitó la carta STORY (pedido de Gus); la vista `story` sigue
  // existiendo, solo sale de la vitrina.
  // Con 8 cartas en total el abanico (aforo 7) deja UNA fuera al abrir: para un
  // no-A1 es la RUTA —la última del arreglo—, que es la carta que menos le
  // habla a quien no está en el curso; un swipe la trae. PODCAST entra ANTES de
  // DNA a propósito: la feature nueva tiene que verse en el abanico de
  // nacimiento, no esconderse detrás de un swipe.
  const resto: CardItem[] = [
    {
      // La carta usa la MISMA portada que la tapa del libro: lo que se ve en la
      // vitrina es literalmente lo que se abre al tocar. Son TRES libros ahora
      // (pedido de Gus): cada carta entra al suyo y dispara su propia precarga.
      // El más nuevo, One Good Part, va primero.
      imgUrl: '/libro/o00-portada.webp',
      alt: 'LIBRO · One Good Part',
      onClick: () => abrirLibro('tiempo'),
      contenido: (
        <OverlayFeature
          titulo="LIBRO"
          subtitulo="One Good Part"
          linea="Diez saltos en el tiempo, sembrados de phrasal verbs."
        />
      ),
    },
    {
      imgUrl: '/libro/v00-portada.webp',
      alt: 'LIBRO · Around the World in Eighty Days',
      onClick: () => abrirLibro('vuelta'),
      contenido: (
        <OverlayFeature
          titulo="LIBRO"
          subtitulo="Around the World in 80 Days"
          linea="Diez escalas, una vuelta al mundo sembrada de phrasal verbs."
        />
      ),
    },
    {
      imgUrl: '/libro/00-portada.webp',
      alt: 'LIBRO · Alice in Wonderland',
      onClick: () => abrirLibro('alicia'),
      contenido: (
        <OverlayFeature
          titulo="LIBRO"
          subtitulo="Alice in Wonderland"
          linea="Un cuento que se hojea, sembrado de phrasal verbs."
        />
      ),
    },
    {
      imgUrl: '/carrusel/slang.jpg',
      alt: 'SLANG · Phrasal verbs y jerga real',
      onClick: () => abrirFeature('slang'),
      contenido: (
        <OverlayFeature
          titulo="SLANG"
          subtitulo="Phrasal verbs y jerga real"
          linea="El inglés que se habla en la calle, no el del libro."
        />
      ),
    },
    {
      imgUrl: '/carrusel/conversacion.jpg',
      alt: 'CONVERSACIÓN · Habla 24/7 con tu coach',
      /* La carta abre la PORTADA de TALK, no una sesión ya empezada.
         Antes hacía `lanzarLibreAurora(); setView('talk')`, y como la píldora
         del Home hace lo mismo, las DOS únicas rutas a la vista aterrizaban con
         sesión viva: la portada (CHARLA + ESCENAS, su toggle y todo el catálogo
         de escenas) era inalcanzable para un usuario. El atajo a la charla libre
         sigue existiendo y sin cambiar — es la píldora aurora del Home; aquí, en
         la vitrina, lo que corresponde es enseñar la sección, y "Sígueme el
         hilo →" de la portada arranca la misma conversación libre a un toque. */
      onClick: () => abrirFeature('talk'),
      contenido: (
        <OverlayFeature
          titulo="CONVERSACIÓN"
          subtitulo="Habla 24/7 con tu coach"
          linea="Practica hablando con la voz, como con un amigo."
        />
      ),
    },
    {
      imgUrl: '/carrusel/podcast.jpg',
      alt: 'PODCAST · Conversaciones reales a dos voces',
      onClick: () => abrirFeature('podcast'),
      contenido: (
        <OverlayFeature
          titulo="PODCAST"
          subtitulo="Conversaciones reales a dos voces"
          linea="Escucha, toca lo que no entiendas, pregunta."
        />
      ),
    },
    {
      // DNA iba primera; se corrió al final para hacerle sitio al tercer libro
      // sin mover a SLANG del índice 3 (el HALF del abanico) ni cambiar el total
      // de 7 cartas. Se llega a ella deslizando, como a cualquier carta del flanco.
      imgUrl: '/carrusel/dna.jpg',
      alt: 'DNA · Tu archivo de lenguaje, siempre contigo',
      onClick: () => abrirFeature('dna'),
      contenido: (
        <OverlayFeature
          titulo="DNA"
          subtitulo="Tu archivo de lenguaje, siempre contigo"
          linea="Tus fallos, tu jerga y tus upgrades, vivos."
        />
      ),
    },
  ];

  /* `[...resto, ruta]` reproduce el arreglo de siempre carta por carta — la
     RUTA era la última. El único caso que cambia es A1. */
  const cards: CardItem[] = nivel === 'A1' ? [ruta, ...resto] : [...resto, ruta];

  return (
    <div ref={lienzoRef} className="aurora-carrusel__lienzo" data-centro={centro}>
      <SocialCards cards={cards} centroInicial={centroInicial} />
    </div>
  );
}

export default CarruselFeatures;
