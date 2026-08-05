/* Registro de los libros interactivos.

   La vista (src/views/libro) es UNA sola y se maneja por `libroActivo` (store).
   Aquí los dos libros se normalizan al shape común de tipos.ts. Alicia trae
   `imgMedio`/`altMedio` (1 lámina de la mitad) de su archivo original; se mapea a
   `imgDentro`/`altDentro` (1 elemento) SIN tocar alicia.ts. Around the World ya
   viene con `imgDentro`/`altDentro` de 3. */

import { CAPITULOS as ALICIA_CAPS, IMAGENES as ALICIA_IMG, PHRASALS_TOTAL as ALICIA_PH } from './alicia';
import { CAPITULOS as VUELTA_CAPS, IMAGENES as VUELTA_IMG, PHRASALS_TOTAL as VUELTA_PH } from './vueltamundo';
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

export const LIBROS = { vuelta: VUELTA, alicia: ALICIA } as const;
export type LibroId = keyof typeof LIBROS;

/** Orden en la vitrina del carrusel: el libro nuevo primero. */
export const LIBRO_LISTA: Libro[] = [VUELTA, ALICIA];

export type { Libro, Capitulo, Pagina } from './tipos';
