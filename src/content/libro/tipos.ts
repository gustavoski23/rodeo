/* Tipos compartidos de los libros interactivos.

   Los DOS libros (Alicia y Around the World) usan la MISMA vista (src/views/libro);
   solo cambian el contenido y las láminas. Para que la vista sea una sola, ambos
   se normalizan a este shape común en content/libro/index.ts.

   La única diferencia estructural entre libros es CUÁNTAS láminas internas trae
   cada capítulo: Alicia trae 1 (la de la mitad), Around the World trae 3. Por eso
   `imgDentro` es un array de largo variable, no un campo fijo. */

export type Pagina = {
  /** El cuento en inglés, con glosas ⟦en||es⟧ embebidas. */
  texto: string;
  /** La brújula: una línea en español con lo que pasa en esta página. */
  es: string;
};

export type Capitulo = {
  n: number;
  /** Título en inglés — el que se ve grande. */
  titulo: string;
  /** Guiño en español debajo del título: ubica sin traducir. */
  subtitulo: string;
  /** Lámina a sangre que abre el capítulo. */
  imgApertura: string;
  /** Las láminas internas, embebidas en las caras de texto 2, 3, 4… (una por
      cara, empezando en la 2). Alicia: 1. Around the World: 3. El largo de este
      array decide cuántas caras llevan lámina. */
  imgDentro: string[];
  altApertura: string;
  altDentro: string[];
  /** Las cinco páginas del capítulo. */
  paginas: Pagina[];
  /** Los phrasal verbs del capítulo, para la tira de chips de su primera cara. */
  phrasals: string[];
};

export type Libro = {
  /** Identificador estable, para el store y la URL. */
  id: string;
  /** Título en el header de la vista y en la carta del carrusel. */
  titulo: string;
  portada: string;
  portadaAlt: string;
  fin: string;
  finAlt: string;
  capitulos: Capitulo[];
  /** Phrasal verbs DISTINTOS del libro (el número del cierre "N phrasal verbs"). */
  phrasalsTotal: string[];
  /** Clave localStorage del flag de precarga — DISTINTA por libro, para que
      bajar uno no marque al otro como listo. */
  precargaKey: string;
};
