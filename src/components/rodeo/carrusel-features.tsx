import { useEffect, useRef, useState } from 'react';

import SocialCards, { type CardItem } from '@/components/ui/card-fan-carousel';
import { useApp } from '@/stores/app';

import './aurora.css';

/* CARRUSEL DE FEATURES — la vitrina que se abre desde el chevron ⌄ del Home.

   Monta el SocialCards VERBATIM (card-fan-carousel.tsx) y solo le pasa las
   cards: el abanico, el GSAP, el hover, las flechas ‹ ›, los puntos y el swipe
   son los suyos. Aquí vive únicamente el CONTENIDO: qué feature es cada carta
   y a dónde navega.

   ORDEN DE LAS CARTAS (decisión, no descuido): el carrusel arranca con
   `centerIndex = HALF = 3` — es estado inicial del componente de Gus, que no
   tocamos. Es decir: la carta que nace GRANDE Y CENTRADA (la protagonista del
   abanico) es la del índice 3, no la del 0. Por eso SLANG sigue en el índice 3:
   al abrir, lo primero que se ve enorme y al frente es SLANG, que es lo que
   pide la vitrina.

   Ahora son SEIS features reales. SUBE entra en el 2 (a la izquierda de SLANG)
   y TU DNA en el 7 (a la derecha de OFICINA), de modo que las seis quedan
   CONTIGUAS en 2-7: paginando desde SLANG se recorre la app entera sin tropezar
   con un placeholder en medio. Quedan cuatro "Próximamente" repartidos en los
   dos flancos (0-1 y 8-9), que es donde tienen que estar.

   Las imágenes de las features REALES son las ilustraciones de Gus
   (public/carrusel/{slang,story,conversacion,oficina}.jpg, 800×1400, set
   coherente con acentos lima) y, para las dos nuevas, las gradientes 07/08 —
   las que ya estaban en el set y mejor aguantan un título encima. Los
   placeholders usan las gradientes aurora restantes (05, 06, 09, 10, 400×700,
   paletas del personalizador). */

/** Índice de la carta centrada al abrir: el HALF del componente. */
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
  /* SUBE y TU DNA no tienen ilustración propia: van sobre una gradiente aurora,
     que es mucho más clara y saturada que las fotos oscuras de las otras cuatro
     y se come el texto blanco. `aurora` añade .cf-overlay--aurora, que solo
     sube el velo — ninguna clase existente cambia, así que las cuatro cartas
     originales quedan pixel-iguales. */
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

/* Overlay de placeholder: sutil, sin título grande y SIN nombre inventado.
   Solo la eyebrow "Próximamente" arriba, que es lo honesto: todavía no existe. */
function OverlayProximamente() {
  return (
    <div className="cf-overlay cf-overlay--pronto">
      <p className="cf-overlay__eyebrow">Próximamente</p>
    </div>
  );
}

const IMG_PRONTO = ['05', '06', '09', '10'];

export function CarruselFeatures() {
  const setView = useApp((s) => s.setView);
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
     animación de paginado. */
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

  // Los cuatro placeholders, repartidos: dos al principio (índices 0-1) y dos
  // al final (8-9). Las SEIS features reales quedan contiguas (2-7): paginando
  // desde SLANG se recorren STORY → CONVERSACIÓN → OFICINA → TU DNA a la
  // derecha y SUBE a la izquierda, sin placeholders en medio.
  const pronto: CardItem[] = IMG_PRONTO.map((n) => ({
    imgUrl: `/carrusel/${n}.jpg`,
    alt: 'Feature en camino',
    contenido: <OverlayProximamente />,
  }));

  const cards: CardItem[] = [
    ...pronto.slice(0, 2),
    {
      imgUrl: '/carrusel/07.jpg',
      alt: 'SUBE · De B2 a C1 con juez',
      onClick: () => setView('ladder'),
      contenido: (
        <OverlayFeature
          aurora
          titulo="SUBE"
          subtitulo="B2 → C1"
          linea="Peldaños con juez: di lo mismo, pero como un nativo."
        />
      ),
    },
    {
      imgUrl: '/carrusel/slang.jpg',
      alt: 'SLANG · Phrasal verbs y jerga real',
      onClick: () => setView('slang'),
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
      onClick: () => setView('story'),
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
      onClick: () => setView('talk'),
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
      onClick: () => setView('a1'),
      contenido: (
        <OverlayFeature
          titulo="OFICINA"
          subtitulo="Inglés de trabajo con Alfred"
          linea="Desde cero y con packs por profesión."
        />
      ),
    },
    {
      imgUrl: '/carrusel/08.jpg',
      alt: 'TU DNA · Tu cerebro de errores',
      onClick: () => setView('dna'),
      contenido: (
        <OverlayFeature
          aurora
          titulo="TU DNA"
          subtitulo="Tu cerebro de errores"
          linea="Tus fallos, tu jerga y tus upgrades, vivos."
        />
      ),
    },
    ...pronto.slice(2),
  ];

  return (
    <div ref={lienzoRef} className="aurora-carrusel__lienzo" data-centro={centro}>
      <SocialCards cards={cards} />
    </div>
  );
}

export default CarruselFeatures;
