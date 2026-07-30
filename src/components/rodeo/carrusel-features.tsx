import { useEffect, useRef, useState } from 'react';

import SocialCards, { type CardItem } from '@/components/ui/card-fan-carousel';
import { useApp } from '@/stores/app';
import { lanzarLibreAurora } from '@/views/talk/use-coach-turn';

import './aurora.css';

/* CARRUSEL DE FEATURES — la vitrina que se abre desde el chevron ⌄ del Home.

   Monta el SocialCards VERBATIM (card-fan-carousel.tsx) y solo le pasa las
   cards: el abanico, el GSAP, el hover, las flechas ‹ ›, los puntos y el swipe
   son los suyos. Aquí vive únicamente el CONTENIDO: qué feature es cada carta
   y a dónde navega.

   ORDEN DE LAS CARTAS (decisión, no descuido): el carrusel arranca con
   `centerIndex = HALF = 3` — es estado inicial del componente de Gus, que no
   tocamos. Es decir: la carta que nace GRANDE Y CENTRADA (la protagonista del
   abanico) es la del índice 3, no la del 0. Por eso SLANG va en el índice 3 y
   STORY en el 4 (justo a su derecha): al abrir, lo primero que se ve enorme y
   al frente es SLANG, que es lo que pide la vitrina. Los índices 0-2 y 5-9 son
   los "Próximamente", que es donde tienen que estar: en los flancos.

   Las imágenes de las 4 features REALES son las ilustraciones de Gus
   (public/carrusel/{slang,story,conversacion,oficina}.jpg, 800×1400, set
   coherente con acentos lima); los placeholders usan las gradientes aurora
   (05…10.jpg, 400×700, paletas del personalizador). */

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
}: {
  titulo: string;
  subtitulo: string;
  linea: string;
}) {
  return (
    <div className="cf-overlay">
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

const IMG_PRONTO = ['05', '06', '07', '08', '09', '10'];

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

  // Los seis placeholders, repartidos: tres a la izquierda de la protagonista
  // (índices 0-2) y tres al final (índices 7-9). Las CUATRO features reales
  // quedan contiguas (3-6): paginando a la derecha desde SLANG se recorren
  // STORY → CONVERSACIÓN → OFICINA sin placeholders en medio.
  const pronto: CardItem[] = IMG_PRONTO.map((n) => ({
    imgUrl: `/carrusel/${n}.jpg`,
    alt: 'Feature en camino',
    contenido: <OverlayProximamente />,
  }));

  const cards: CardItem[] = [
    ...pronto.slice(0, 3),
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
      onClick: () => {
        // El mismo viaje que la píldora aurora del Home: sesión libre lista
        // ANTES de navegar, para no aterrizar en la vista vieja de escenarios.
        lanzarLibreAurora({ focoVolver: false });
        setView('talk');
      },
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
    ...pronto.slice(3),
  ];

  return (
    <div ref={lienzoRef} className="aurora-carrusel__lienzo" data-centro={centro}>
      <SocialCards cards={cards} />
    </div>
  );
}

export default CarruselFeatures;
