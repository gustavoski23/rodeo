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

   SIETE cartas, todas con imagen real (pedido de Gus para mandárselo a
   amigos: «deja solo las que ya tienen imagen»). Fuera quedaron SUBE —que iba
   sobre una gradiente, no una foto— y los dos «Próximamente» transparentes.

   ORDEN DE LAS CARTAS (decisión, no descuido): con siete cartas el componente
   de Gus deja de paginar (needsPagination = totalCards > 7 es falso) y las
   abre TODAS a la vez en un abanico fijo, con la del índice 3 al frente,
   grande y centrada (totalCards >> 1 = 3). Esa es la protagonista. Por eso el
   arreglo NO es el orden de lectura sino una ROTACIÓN del mismo: dejamos SLANG
   —la firma de la app— en el índice 3, que es donde el abanico pone su cara. A
   su izquierda inmediata caen los dos LIBROS (los recién horneados, bien
   grandes); el resto reparte el abanico. Se conserva la adyacencia cíclica del
   orden original, solo centrada en SLANG.

   Las imágenes son las ilustraciones de Gus
   (public/carrusel/{slang,story,conversacion,oficina,dna}.jpg, 800×1400, set
   coherente con acentos lima) y las dos tapas de libro
   (public/libro/{v00,00}-portada.webp): lo que se ve en la vitrina es
   literalmente lo que se abre al tocar. */

/** Índice de la carta centrada al abrir. Con 7 cartas el abanico no pagina y
    su centro es totalCards >> 1 = 3; ahí ponemos SLANG. (Si algún día vuelven
    a ser >7 y pagina, el HALF del componente también es 3, así que cuadra.) */
const CENTRO_INICIAL = 3;

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
function abrirLibro(id: LibroId) {
  useApp.getState().setLibroActivo(id);
  abrirFeature('libro');
}

function abrirFeature(view: View) {
  const { setCarruselAlVolver, setView } = useApp.getState();
  setCarruselAlVolver(true);
  setView(view);
}

export function CarruselFeatures() {
  const lienzoRef = useRef<HTMLDivElement>(null);
  const [centro, setCentro] = useState(CENTRO_INICIAL);

  /* Qué carta está centrada. El componente de Gus no lo publica (y no se
     toca), pero SÍ lo pinta: el punto de paginación activo lleva la utilidad
     `scale-[1.3]`. Observamos la clase de los puntos y espejamos el índice en
     `data-centro`; es leer la verdad que el propio componente ya renderiza, en
     vez de duplicar su lógica de paginación (que además ignora entradas
     mientras anima y se desincronizaría).
     Va por atributo y no por prop para NO provocar un render nuevo del
     carrusel: cambiar `cards` invalidaría su useEffect de GSAP en mitad de la
     animación de paginado.
     OJO con las 7 cartas actuales: el abanico no pagina, así que NO pinta
     puntos — el observador no encuentra ninguno y sale (queda latente). Ahí
     manda el valor inicial CENTRO_INICIAL=3, que es justo el centro del abanico
     fijo, y por eso el `data-centro` sigue cuadrando sin puntos que leer. Si
     algún día vuelven a ser >7, el componente pagina, aparecen los puntos y
     esto se reactiva solo. */
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

  // Siete cartas, todas con foto real, ordenadas para que SLANG quede al frente
  // (índice 3, el centro del abanico fijo). A su izquierda inmediata, los dos
  // LIBROS —los recién horneados, bien grandes—; luego DNA cierra ese flanco. A
  // la derecha, STORY → CONVERSACIÓN → OFICINA. Es el orden de lectura rotado:
  // conserva la vecindad cíclica, solo centrado en SLANG.
  const cards: CardItem[] = [
    {
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
    {
      // La carta usa la MISMA portada que la tapa del libro: lo que se ve en la
      // vitrina es literalmente lo que se abre al tocar. Son DOS libros ahora
      // (pedido de Gus): cada carta entra al suyo y dispara su propia precarga.
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
      imgUrl: '/carrusel/story.jpg',
      alt: 'STORY · Modo historia',
      onClick: () => abrirFeature('story'),
      contenido: (
        <OverlayFeature
          titulo="STORY"
          subtitulo="Modo historia"
          linea="Un thriller por capítulos donde practicas sin darte cuenta."
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
      imgUrl: '/carrusel/oficina.jpg',
      alt: 'OFICINA · Inglés de trabajo con Alfred',
      onClick: () => abrirFeature('a1'),
      contenido: (
        <OverlayFeature
          titulo="OFICINA"
          subtitulo="Inglés de trabajo con Alfred"
          linea="Desde cero y con packs por profesión."
        />
      ),
    },
  ];

  return (
    <div ref={lienzoRef} className="aurora-carrusel__lienzo" data-centro={centro}>
      <SocialCards cards={cards} />
    </div>
  );
}

export default CarruselFeatures;
