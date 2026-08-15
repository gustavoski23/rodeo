import { useApp } from '@/stores/app';

import { abrirFeature, abrirLibro } from '@/components/rodeo/carrusel-features';
import './bento-features.css';

/* BENTO DE FEATURES — la vitrina de TELÉFONOS (pedido de Gus, 2026-08-15).

   En pantalla chica el abanico de cartas pedía swipe para descubrir; este grid
   enseña las OCHO features de un vistazo, en el formato de tamaños mezclados
   que Gus aprobó en el demo (cards de imagen con esquinas 24px, gradiente
   negro desde abajo, eyebrow mono + título + subtítulo; las anchas llevan
   además la línea en español). ESTÁTICO a propósito: las cards no se expanden
   ni cambian de tamaño al tocarlas — navegan y ya.

   El contenido es EL MISMO del abanico (carrusel-features.tsx, que sigue
   siendo la vitrina de PC): mismos títulos, mismas imágenes y las MISMAS
   puertas de navegación exportadas de allí, así que `carruselAlVolver` y los
   ← de las vistas funcionan idéntico entre por cuál vitrina se entre.

   Para un A1 manda su curso: la RUTA sube a la card ancha de arriba (el
   equivalente del centroInicial=0 del abanico) y SLANG baja al par. */

type Card = {
  id: string;
  titulo: string;
  subtitulo: string;
  linea: string;
  img: string;
  /** Las portadas de libro son tapas verticales: se encuadra arriba para que
      el título de la tapa no muera bajo el recorte del cover. */
  tapa?: boolean;
  ancha?: boolean;
  alto: number;
  onClick: () => void;
};

const SLANG: Card = {
  id: 'slang',
  titulo: 'SLANG',
  subtitulo: 'Phrasal verbs y jerga real',
  linea: 'El inglés que se habla en la calle, no el del libro.',
  img: '/carrusel/slang.jpg',
  ancha: true,
  alto: 168,
  onClick: () => abrirFeature('slang'),
};

const RUTA: Card = {
  id: 'ruta',
  titulo: 'RUTA',
  subtitulo: 'Tu ruta de inglés, paso a paso',
  linea: 'Desde cero y con packs por profesión.',
  img: '/carrusel/oficina.jpg',
  alto: 150,
  onClick: () => abrirFeature('a1'),
};

const RESTO: Card[] = [
  {
    id: 'conversacion',
    titulo: 'CONVERSACIÓN',
    subtitulo: 'Habla 24/7 con tu coach',
    linea: 'Practica hablando con la voz, como con un amigo.',
    img: '/carrusel/conversacion.jpg',
    alto: 150,
    onClick: () => abrirFeature('talk'),
  },
  {
    id: 'libro-tiempo',
    titulo: 'LIBRO',
    subtitulo: 'One Good Part',
    linea: 'Diez saltos en el tiempo, sembrados de phrasal verbs.',
    img: '/libro/o00-portada.webp',
    tapa: true,
    alto: 185,
    onClick: () => abrirLibro('tiempo'),
  },
  {
    id: 'libro-vuelta',
    titulo: 'LIBRO',
    subtitulo: 'Around the World in 80 Days',
    linea: 'Diez escalas, una vuelta al mundo sembrada de phrasal verbs.',
    img: '/libro/v00-portada.webp',
    tapa: true,
    alto: 185,
    onClick: () => abrirLibro('vuelta'),
  },
  {
    id: 'libro-alicia',
    titulo: 'LIBRO',
    subtitulo: 'Alice in Wonderland',
    linea: 'Un cuento que se hojea, sembrado de phrasal verbs.',
    img: '/libro/00-portada.webp',
    tapa: true,
    alto: 170,
    onClick: () => abrirLibro('alicia'),
  },
  {
    id: 'dna',
    titulo: 'DNA',
    subtitulo: 'Tu archivo de lenguaje, siempre contigo',
    linea: 'Tus fallos, tu jerga y tus upgrades, vivos.',
    img: '/carrusel/dna.jpg',
    alto: 170,
    onClick: () => abrirFeature('dna'),
  },
  {
    id: 'podcast',
    titulo: 'PODCAST',
    subtitulo: 'Conversaciones reales a dos voces',
    linea: 'Escucha, toca lo que no entiendas, pregunta.',
    img: '/carrusel/podcast.jpg',
    ancha: true,
    alto: 150,
    onClick: () => abrirFeature('podcast'),
  },
];

export function BentoFeatures() {
  const nivel = useApp((s) => s.nivel);
  /* No-A1: SLANG ancha arriba (la firma) y la RUTA en el par con CONVERSACIÓN.
     A1: la RUTA hereda la card ancha de arriba —su curso primero— y SLANG
     baja al par. El resto no se mueve; PODCAST cierra ancho, como en el demo. */
  const cards: Card[] =
    nivel === 'A1'
      ? [{ ...RUTA, ancha: true, alto: 168 }, { ...SLANG, ancha: false, alto: 150 }, ...RESTO]
      : [SLANG, { ...RUTA }, ...RESTO];

  return (
    <div className="bento-lienzo">
      <div className="bento" role="list">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            role="listitem"
            onClick={c.onClick}
            className={`bento-card${c.ancha ? ' bento-card--ancha' : ''}`}
            style={{ height: c.alto }}
          >
            {/* Sin loading="lazy" a propósito: las ocho están en o rozando el
                viewport cuando la vitrina abre — igual que el abanico, que
                carga plano — y lazy solo retrasaba la primera pintura. */}
            <img
              src={c.img}
              alt=""
              className={`bento-card__img${c.tapa ? ' bento-card__img--tapa' : ''}`}
            />
            <span className="bento-card__velo" aria-hidden="true" />
            <span className="bento-card__texto">
              <span className="bento-card__eyebrow">{c.titulo}</span>
              <span className="bento-card__titulo">{c.subtitulo}</span>
              {c.ancha && <span className="bento-card__linea">{c.linea}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default BentoFeatures;
