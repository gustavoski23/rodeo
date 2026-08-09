/* Registro de los libros interactivos.

   La vista (src/views/libro) es UNA sola y se maneja por `libroActivo` (store).
   Aquí los TRES libros se normalizan al shape común de tipos.ts. Alicia trae
   `imgMedio`/`altMedio` (1 lámina de la mitad) de su archivo original; se mapea a
   `imgDentro`/`altDentro` (1 elemento) SIN tocar alicia.ts. Around the World y
   One Good Part ya vienen con `imgDentro`/`altDentro` de 3. */

import { CAPITULOS as ALICIA_CAPS, IMAGENES as ALICIA_IMG, PHRASALS_TOTAL as ALICIA_PH } from './alicia';
import { CAPITULOS as VUELTA_CAPS, IMAGENES as VUELTA_IMG, PHRASALS_TOTAL as VUELTA_PH } from './vueltamundo';
import { CAPITULOS as TIEMPO_CAPS, IMAGENES as TIEMPO_IMG, PHRASALS_TOTAL as TIEMPO_PH } from './onegoodpart';
import type { Capitulo, Libro } from './tipos';

/** Alicia → shape común. Su única lámina interna (la de la mitad) se vuelve el
    primer (y único) elemento de imgDentro. */
const deAlicia = (c: (typeof ALICIA_CAPS)[number]): Capitulo => ({
  n: c.n,
  titulo: c.titulo,
  subtitulo: c.subtitulo,
  imgApertura: c.imgApertura,
  imgDentro: [c.imgMedio],
  altApertura: c.altApertura,
  altDentro: [c.altMedio],
  paginas: c.paginas,
  phrasals: c.phrasals,
});

export const ALICIA: Libro = {
  id: 'alicia',
  titulo: 'Alice in Wonderland',
  portada: ALICIA_IMG.portada,
  portadaAlt: 'Portada de Alice in Wonderland, de Lewis Carroll.',
  fin: ALICIA_IMG.fin,
  finAlt: 'Alicia dormida en la ribera mientras las criaturas del País de las Maravillas se desvanecen.',
  capitulos: ALICIA_CAPS.map(deAlicia),
  phrasalsTotal: ALICIA_PH,
  precargaKey: 'rodeo_libro_alicia_precargado',
};

export const VUELTA: Libro = {
  id: 'vuelta',
  titulo: 'Around the World in 80 Days',
  portada: VUELTA_IMG.portada,
  portadaAlt: 'Portada de Around the World in Eighty Days, de Jules Verne: la ruta del viaje sobre un mapa del mundo.',
  fin: VUELTA_IMG.fin,
  finAlt: 'Phileas Fogg y Aouda al final del viaje, con el mundo dado la vuelta.',
  capitulos: VUELTA_CAPS,
  phrasalsTotal: VUELTA_PH,
  precargaKey: 'rodeo_libro_vuelta_precargado',
};

/* One Good Part: adaptación libre de The Time Machine. Diez saltos entre seis
   ciudades reales y siete épocas (1889 a 2141), con el vocabulario de resolver
   problemas de verdad — nada de léxico de fantasía. Ver onegoodpart.ts. */
export const TIEMPO: Libro = {
  id: 'tiempo',
  titulo: 'One Good Part',
  portada: TIEMPO_IMG.portada,
  portadaAlt:
    'Rooke y Nia tomados de la mano frente a un enorme engranaje dorado y brillante, con siluetas de tejados y un rascacielos futurista disolviéndose en la niebla dorada alrededor.',
  fin: TIEMPO_IMG.fin,
  finAlt:
    'Primer plano de un banco de trabajo: las manos arrugadas de un hombre mayor guían las manos de una joven mientras sostiene un engranaje diminuto; a un costado, un radiocasete portátil viejo.',
  capitulos: TIEMPO_CAPS,
  phrasalsTotal: TIEMPO_PH,
  precargaKey: 'rodeo_libro_tiempo_precargado',
};

export const LIBROS = { tiempo: TIEMPO, vuelta: VUELTA, alicia: ALICIA } as const;
export type LibroId = keyof typeof LIBROS;

/** Orden en la vitrina del carrusel: el libro nuevo primero. */
export const LIBRO_LISTA: Libro[] = [TIEMPO, VUELTA, ALICIA];

export type { Libro, Capitulo, Pagina } from './tipos';
