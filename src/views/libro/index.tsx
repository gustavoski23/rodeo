import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, MoveRight, Volume2, VolumeX, X } from 'lucide-react';
import { MantineProvider } from '@mantine/core';
/* El <Book> viene del FORK vendorizado, no del paquete. El paquete sigue
   instalado y clavado en 1.0.5: de él salen los estilos, los tipos y
   @zumer/snapdom. Lo único que cambia en el fork es cómo se rasterizan y se
   guardan las texturas de las caras — el porqué, con números, en FORK.md y en
   PERF-libro.md. */
import { Book } from '@/vendor/mantine-book';
import { invalidarCaras } from '@/vendor/mantine-book/curl-cache';

import { GlossText } from '@/components/rodeo/gloss-text';
import { PencilLoader } from '@/components/rodeo/pencil-loader';
import { GlassButton, GlassStyles } from '@/components/ui/sign-up';
import { store } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { LIBROS, type Capitulo, type Libro } from '@/content/libro';
import { libroMudo, setLibroMudo, sonarPagina } from './sonido-pagina';

/* Mantine y la extensión del libro, en su variante `.layer.css`: así todo entra
   envuelto en `@layer mantine` y, como las utilidades de Tailwind v4 van sin
   capa, el CSS sin capa gana siempre. Con `styles.css` a secas el reset de
   Mantine se pondría a discutir con el resto de la app en cuanto alguien
   abriera esta vista una sola vez (los CSS no se descargan al desmontar). */
import '@mantine/core/styles.layer.css';
import '@gfazioli/mantine-book/styles.layer.css';
import './libro.css';

/* LIBRO — Around the World in Eighty Days, sobre <Book> de
   @gfazioli/mantine-book.

   ESTRUCTURA: 10 capítulos, cada uno de 6 caras (1 de apertura + 5 de texto),
   más tapa y contratapa = 62 caras / 31 hojas. Las seis caras de un capítulo:

     apertura   lámina a sangre del capítulo
     texto 0    abrebocas + phrasal verbs + LEER
     texto 1    solo texto
     texto 2    texto + lámina interna 1   ┐ las tres láminas internas van
     texto 3    texto + lámina interna 2   │ REPARTIDAS, una por cara, no
     texto 4    texto + lámina interna 3   ┘ todas juntas

   Los phrasal verbs viven SOLO en la primera cara de texto del capítulo: son la
   promesa de lo que se va a aprender, no un pie de página que se repite.

   MÓVIL = UNA PÁGINA. A 390 px una plana de dos deja cada hoja en ~170 px:
   linda de mirar, imposible de leer. El marco recorta a una sola página y el
   riel corre para enseñar la mitad donde está la cara actual. Por dentro el
   libro sigue siendo el mismo objeto de dos planas, así que el arrastre, el
   volteo y el curl 3D no cambian — solo se decide qué mitad se mira. */

const COLUMNA = 'mx-auto w-full max-w-[880px]';

/* El curl 3D (WebGL) va SIEMPRE, también con prefers-reduced-motion. Antes ahí
   se caía a la variante 'flat', y Gus —cuyo Windows tiene "reducir movimiento"
   activado— vio el resultado: el volteo se pintaba como un rectángulo duro
   montado sobre la otra página, con pinta de bug ("¿es normal que se vea
   así?"). La variante plana NO es una versión sin movimiento — la hoja se
   mueve igual, solo que fea — así que degradar ahí no compraba accesibilidad,
   solo un pase de página roto. Quien pide menos movimiento sigue teniendo las
   flechas: un salto de página sin arrastre. Las animaciones decorativas de la
   vista (flechitas, pulsos) sí respetan reduced-motion, en el CSS. */

/* uN SOLO disparo por toque en los botones de vidrio — mismo arreglo que
   charla-session.tsx: GlassButton envuelve el <button> en un <div> cuyo onClick
   "reenvía" el toque, y como el toque real siempre cae en el <span> interior,
   el evento burbujeaba y el handler corría DOS veces. Aquí el doble disparo
   haría que A+ suba dos pasos y el mudo se apague y encienda en el mismo tap.
   Cortar la propagación en el botón deja al wrapper sin evento que reenviar. */
const unSoloClick =
  (fn: () => void) =>
  (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    fn();
  };

/** Proporción de las láminas (1400 × 1960). Se respeta a rajatabla: si la
    página fuera más cuadrada, el object-fit se comería el marco dorado que las
    ilustraciones traen pintado. */
const RATIO = 1960 / 1400;

/** Debajo de esto se lee de a una página. No es un breakpoint de diseño: es el
    ancho a partir del cual media plana deja de ser legible. */
const UMBRAL_MOVIL = 700;

const ESCALA_MIN = 0.85;
const ESCALA_MAX = 1.75;
const PASO_ESCALA = 0.15;
const CLAVE_ESCALA = 'rodeo_libro_escala';
const CLAVE_FLECHA = 'rodeo_libro_leer_visto';

/* ────────────────────────────────────────────────────────────────────────────
   LAS CARAS — y por qué son DOS libros distintos.

   ESCRITORIO (62 caras / 31 hojas). La plana completa cabe, así que el libro
   es el libro entero: lámina de apertura + las cinco páginas del capítulo, con
   sus TRES láminas internas embebidas. Dos caras por hoja, como un libro de
   verdad.

   TELÉFONO (22 caras / 22 hojas). Pedido de Gus: «que solo hagas swap para ver
   los capítulos». Se hojea de capítulo en capítulo — lámina, abrebocas, lámina
   del siguiente, abrebocas… — y el capítulo COMPLETO vive detrás del botón
   LEER, que abre el lector y ahí se baja con scroll. Un lector de una página no
   es un libro abierto: encadenar cinco páginas de texto a puros swipes cansa,
   y el lector ya hace ese trabajo mejor.

   Y hay una razón MECÁNICA para que en el móvil vaya UNA CARA POR HOJA (frente
   con contenido, dorso en blanco): el componente solo deja arrastrar la hoja de
   arriba de cada mitad — la derecha avanza, la izquierda retrocede. Con dos
   caras por hoja, la cara visible alterna de mitad (los frentes descansan a la
   derecha, los dorsos ya volteados quedan a la izquierda), así que en la mitad
   de las páginas el gesto de avanzar habría que hacerlo sobre una mitad que en
   el móvil ni se ve — eso era el «deslizo y se mueve al lado contrario» de Gus.
   Con una cara por hoja, el contenido SIEMPRE está en la mitad derecha: el
   marco enseña esa mitad y siempre fija, y arrastrar siempre avanza, con su
   curl nativo siguiendo el dedo. */

type Cara =
  | {
      t: 'lamina';
      src: string;
      alt: string;
      rotulo?: string;
      kicker?: string;
      fin?: boolean;
      /** Números del cierre ("N phrasal verbs en M capítulos"), del libro activo. */
      finStats?: { phrasals: number; caps: number };
    }
  | {
      t: 'texto';
      cap: Capitulo;
      p: number;
      folio: number;
      cabecera?: boolean;
      phrasals?: boolean;
      /** Índice de la lámina interna embebida en esta cara (0,1,2 → caras de
          texto 2,3,4). undefined en las caras sin lámina. */
      lamina?: number;
    };

const apertura = (cap: Capitulo): Cara => ({
  t: 'lamina',
  src: cap.imgApertura,
  alt: cap.altApertura,
  rotulo: cap.titulo,
  kicker: `Chapter ${cap.n}`,
});

/** El folio de la página `p` del capítulo `n`, contando el libro completo. */
const folioDe = (n: number, p: number) => 2 + (n - 1) * 5 + p;

/** A qué capítulo pertenece cada cara — para el rótulo del pie, para saber qué
    abrir con LEER y para reubicarse al cruzar el umbral móvil/escritorio. */
function capsDe(caras: Cara[]): (Capitulo | null)[] {
  return caras.map((c, i) => {
    if (c.t === 'texto') return c.cap;
    const sig = caras[i + 1];
    return c.rotulo && sig?.t === 'texto' ? sig.cap : null;
  });
}

/* ── Armado del LIBRO ACTIVO ──────────────────────────────────────────────────
   Todo lo que dependía del libro (portada, caras, hojas, precarga) se calcula
   desde el `Libro` elegido, para que la MISMA vista sirva a Alicia y a Around
   the World. Lo único que cambia entre libros es cuántas láminas internas trae
   cada capítulo (Alicia 1, AtW 3): el largo de `cap.imgDentro` lo decide. */
type ArmadoLibro = {
  caras: Cara[];
  carasMovil: Cara[];
  hojas: (Cara | undefined)[][];
  hojasMovil: (Cara | undefined)[][];
  capDeCara: (Capitulo | null)[];
  capDeCaraMovil: (Capitulo | null)[];
  /** Todas las láminas del libro, en orden de aparición — para la precarga. */
  todas: string[];
};

function construir(libro: Libro): ArmadoLibro {
  const portada: Cara = { t: 'lamina', src: libro.portada, alt: libro.portadaAlt };
  const contra: Cara = {
    t: 'lamina',
    src: libro.fin,
    alt: libro.finAlt,
    fin: true,
    finStats: { phrasals: libro.phrasalsTotal.length, caps: libro.capitulos.length },
  };

  const caras: Cara[] = [
    portada,
    ...libro.capitulos.flatMap((cap) => [
      apertura(cap),
      ...Array.from({ length: 5 }, (_, p) => ({
        t: 'texto' as const,
        cap,
        p,
        folio: folioDe(cap.n, p),
        cabecera: p === 0, // el título del capítulo solo en su primera cara
        phrasals: p === 0,
        // Cada cara de texto embebe la lámina que le toca, empezando en la 2.
        // Alicia solo tiene 1 (cara 2); AtW tiene 3 (caras 2, 3, 4). El largo de
        // imgDentro decide hasta dónde llegan.
        lamina: p >= 2 && p - 2 < cap.imgDentro.length ? p - 2 : undefined,
      })),
    ]),
    contra,
  ];

  const carasMovil: Cara[] = [
    portada,
    ...libro.capitulos.flatMap((cap) => [
      apertura(cap),
      { t: 'texto' as const, cap, p: 0, folio: folioDe(cap.n, 0), cabecera: true, phrasals: true },
    ]),
    contra,
  ];

  const hojas: (Cara | undefined)[][] = Array.from({ length: Math.ceil(caras.length / 2) }, (_, i) => [
    caras[i * 2],
    caras[i * 2 + 1],
  ]);
  const hojasMovil: (Cara | undefined)[][] = carasMovil.map((c) => [c, undefined]);

  const todas: string[] = [
    libro.portada,
    ...libro.capitulos.flatMap((c) => [c.imgApertura, ...c.imgDentro]),
    libro.fin,
  ];

  return {
    caras,
    carasMovil,
    hojas,
    hojasMovil,
    capDeCara: capsDe(caras),
    capDeCaraMovil: capsDe(carasMovil),
    todas,
  };
}

/* ── El puente con el índice del <Book> ──────────────────────────────────────
   En escritorio el índice de cara ES el `page` del componente (frente de la
   hoja i en 2i, dorso en 2i+1). En el móvil, con una cara por hoja, la cara k
   se ve cuando la hoja k descansa sin voltear en la mitad derecha: eso pasa en
   `page = 2k - 1` (y en 0 para la portada, con el libro cerrado). */
const aPageDelLibro = (k: number, movil: boolean) => (!movil ? k : k === 0 ? 0 : 2 * k - 1);
const aCara = (page: number, movil: boolean) => (!movil ? page : Math.floor((page + 1) / 2));

/* ────────────────────────────────────────────────────────────────────────────
   Precarga */

/* Descarga TODAS las láminas del libro activo ANTES de abrirlo.

   Pedido fuerte de Gus: al entrar a un libro «DEBE descargárseles todo» para que
   en teléfonos sea fluido y no se quede pegado, lento ni crasheando. Por eso:

   - Bloquea con el PencilLoader hasta el 100% (o el techo de red mala).
   - Va de a TANDAS (límite de concurrencia). Decodificar 42 láminas 1400×1960 a
     la vez son ~460 MB de bitmaps: en un teléfono de gama baja, bajada segura al
     piso. Con CONCURRENCIA a la vez el pico de memoria queda acotado y el móvil
     no se ahoga. (Antes se disparaban las 42 juntas — bien en el PC, riesgoso en
     el celular.)
   - La clave del flag es POR LIBRO: bajar Alicia no marca a AtW como listo, y al
     revés. Solo bloquea LA PRIMERA VEZ de cada libro; después el service worker
     las tiene cache-first (regla 5 de sw.js) y la segunda visita entra directo.
   - El techo de 20 s evita que una red mala deje a alguien encerrado mirando el
     lápiz: pasado ese tiempo se entra igual y lo que falte se carga a su ritmo.

   `decode()` espera a que el bitmap esté LISTO PARA PINTAR (no solo bajado): sin
   eso la primera hoja parpadea mientras el navegador decodifica. onerror también
   cuenta — una lámina caída no puede dejar el libro cerrado para siempre. */
const CONCURRENCIA = 5;

function usePrecarga(todas: string[], clave: string): { listo: boolean; hechas: number; total: number } {
  const yaEstaba = useRef(store.get<boolean>(clave, false));
  const [hechas, setHechas] = useState(0);
  const [listo, setListo] = useState(yaEstaba.current);

  useEffect(() => {
    if (store.get<boolean>(clave, false)) {
      setListo(true);
      return;
    }
    setListo(false);
    setHechas(0);
    let vivo = true;
    let n = 0;
    let i = 0;

    const unaImg = (src: string) =>
      new Promise<void>((res) => {
        const img = new Image();
        const fin = () => res();
        img.onload = () => (img.decode ? img.decode().then(fin, fin) : fin());
        img.onerror = fin;
        img.src = src;
      });

    // Cada worker toma el siguiente índice hasta agotar la lista; con
    // CONCURRENCIA workers nunca hay más de esas imágenes decodificando a la vez.
    const worker = async () => {
      while (vivo && i < todas.length) {
        await unaImg(todas[i++]);
        if (!vivo) return;
        n++;
        setHechas(n);
        if (n >= todas.length) {
          store.set(clave, true);
          setListo(true);
        }
      }
    };
    for (let k = 0; k < Math.min(CONCURRENCIA, todas.length); k++) void worker();

    const techo = setTimeout(() => {
      if (vivo) setListo(true); // red mala: se entra igual, sin marcar el flag
    }, 20000);

    return () => {
      vivo = false;
      clearTimeout(techo);
    };
  }, [todas, clave]);

  return { listo, hechas, total: todas.length };
}

/* Las tres caras de Libre Baskerville, EXIGIDAS antes de abrir el libro.

   El @font-face vive en libro.css, que es CSS de una vista lazy: la fuente no
   empieza a bajar hasta que la vista monta. Con `swap` eso significaba abrir el
   cuento en Georgia y verlo cambiar solo a Baskerville unos cientos de ms
   después — con la capitular a 2.6em, el párrafo entero se recomponía delante
   de los ojos. Ahora hay tres cosas encadenadas: <link rel=preload> en el HTML
   (arranca la descarga con el documento), `font-display: block` (nunca se pinta
   con la de repuesto) y esta espera, que retiene el libro detrás del mismo
   lápiz de la precarga hasta que las tres caras están listas.

   `document.fonts.load()` es lo que EMPUJA la descarga: `ready` a secas solo
   promete que no queda nada pendiente, y si la fuente todavía no la pidió nadie
   resuelve enseguida y no espera nada.

   El techo de 4 s es la misma idea que el de 20 s de la precarga: una red mala
   no puede dejar a nadie encerrado mirando el lápiz. Si vence, se entra con lo
   que haya — peor es no entrar. */
const CARAS_BASKERVILLE = [
  '400 1em "Libre Baskerville"',
  '700 1em "Libre Baskerville"',
  'italic 400 1em "Libre Baskerville"',
];

function useFuentes(): boolean {
  const [listas, setListas] = useState(false);

  useEffect(() => {
    let vivo = true;
    const fin = () => vivo && setListas(true);
    if (!document.fonts) {
      fin();
      return;
    }
    Promise.all(CARAS_BASKERVILLE.map((c) => document.fonts.load(c)))
      .then(() => document.fonts.ready)
      .then(fin, fin);
    const techo = setTimeout(fin, 4000);
    return () => {
      vivo = false;
      clearTimeout(techo);
    };
  }, []);

  return listas;
}

/** La espera, con el lápiz que ya usa el resto de la app (TALK, episodios). */
function Precarga({ hechas, total }: { hechas: number; total: number }) {
  const pct = Math.round((hechas / total) * 100);
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <PencilLoader size={5.2} label="Trayendo el libro" />
      <div className="flex flex-col items-center gap-2">
        <p className="font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--text-secondary)' }}>
          Trayendo el libro
        </p>
        <p className="max-w-[30ch] text-[0.82rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Son {total} láminas pintadas a mano. Se bajan una sola vez y después el
          libro abre al instante, incluso sin señal.
        </p>
        {/* Barra de progreso: 4 px de alto, sin números grandes. Lo que importa
            es que se mueva — el porcentaje exacto no le sirve a nadie. */}
        <div
          className="mt-1 h-1 w-40 overflow-hidden rounded-full"
          style={{ background: 'var(--borde-sutil)' }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Cargando las láminas del libro"
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${pct}%`, background: 'var(--accent)' }}
          />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Texto */

/** Un párrafo que abre con comillas es diálogo y pide un pelín de aire. */
const esDialogo = (p: string) => /^\s*["“'—]/.test(p);

/* El cuento con las glosas VIVAS: se tocan, muestran el significado y se
   guardan al DNA (es el mismo <GlossText> de TALK y ESCENAS).

   El truco está en el onPointerDownCapture: el libro arma el arrastre en el
   pointerdown, así que si no se corta ahí, tocar una palabra empezaría a
   voltear la página. Cortándolo, el único costo es que NO se puede iniciar un
   arrastre agarrando justo una palabra subrayada — y las palabras subrayadas
   son una minoría de la superficie de la hoja. El resto de la página sigue
   siendo zona de arrastre.

   El otro trabajo de este componente es AVISAR CUANDO HAY MÁS TEXTO ABAJO.
   Con la letra a 130% las páginas más cargadas ya no caben en la hoja, y un
   párrafo cortado a media línea sin ninguna señal se lee como un bug, no como
   algo que se desplaza. `data-mas` enciende el degradado del borde inferior y
   se apaga solo al llegar al final. */
/* La CAPITULAR va en un <span> de verdad y no en un `::first-letter`.

   Medido (tests/perf/fuentes.mjs y las capturas de tests/perf/resultados/):
   snapdom clona NODOS y estilos calculados, y los pseudo-elementos de primera
   letra no son nodos — no tiene de dónde sacarlos. Resultado: la textura de la
   cara salía SIN capitular y, sin el hueco que dejaba su float, el párrafo se
   recomponía entero. Eso es lo que se veía al empezar a pasar página: la letra
   capital desaparecía y el texto saltaba de sitio. Con un nodo real, el
   snapshot la reproduce y la cara girando se lee igual que la quieta.

   Se lleva la PUNTUACIÓN de apertura pegada a la letra, que es justo lo que
   hace `::first-letter`: en «"Fogg…» la comilla y la F son una sola capitular.
   Si el párrafo no empieza por letra —por ejemplo si arrancara con una glosa
   `⟦…⟧`— no hay coincidencia y se pinta sin capitular, que es preferible a
   partir un marcador por la mitad. */
const CAPITULAR = /^([\s"'“‘«([¡¿—–-]*\p{L})([\s\S]*)$/u;

function CuentoVivo({ texto }: { texto: string }) {
  const parrafos = useMemo(() => texto.split(/\n{2,}/), [texto]);
  const ref = useRef<HTMLDivElement>(null);
  const [mas, setMas] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const revisar = () => {
      // -2 px de tolerancia: el subpíxel del zoom deja restos de 0.5 px que
      // encenderían el degradado en páginas que sí caben.
      setMas(el.scrollHeight - el.clientHeight - el.scrollTop > 2);
    };
    revisar();
    el.addEventListener('scroll', revisar, { passive: true });
    // La escala del lector cambia el alto del contenido sin que cambie nada
    // del DOM: hay que volver a medir.
    const ro = new ResizeObserver(revisar);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', revisar);
      ro.disconnect();
    };
  }, [texto]);

  return (
    <div
      ref={ref}
      className="libro-cuerpo"
      data-mas={mas ? '' : undefined}
      onPointerDownCapture={(e) => {
        if ((e.target as HTMLElement).closest?.('[data-gloss]')) e.stopPropagation();
      }}
    >
      {parrafos.map((p, i) => {
        const capital = i === 0 ? CAPITULAR.exec(p) : null;
        return (
          <p key={i} className={esDialogo(p) ? 'dialogo' : undefined}>
            {capital ? (
              <>
                <span className="libro-capitular">{capital[1]}</span>
                <GlossText reply={capital[2]} />
              </>
            ) : (
              <GlossText reply={p} />
            )}
          </p>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Caras */

function CaraLamina({ cara }: { cara: Extract<Cara, { t: 'lamina' }> }) {
  return (
    <div className="libro-cara">
      <img className="libro-img" src={cara.src} alt={cara.alt} draggable={false} />
      {cara.rotulo && (
        <>
          <div className="libro-velo" />
          <div className="libro-rotulo">
            <b>{cara.rotulo}</b>
            {cara.kicker && <span>{cara.kicker}</span>}
          </div>
        </>
      )}
      {cara.fin && cara.finStats && (
        <div className="libro-fin">
          <b>THE END</b>
          <span>
            {cara.finStats.phrasals} phrasal verbs
            <br />
            en {cara.finStats.caps} capítulos
          </span>
        </div>
      )}
    </div>
  );
}

function CaraTexto({
  cara,
  onLeer,
  flecha,
  movil,
}: {
  cara: Extract<Cara, { t: 'texto' }>;
  onLeer: () => void;
  flecha: boolean;
  movil: boolean;
}) {
  const { cap, p } = cara;
  const pagina = cap.paginas[p];

  return (
    <div className="libro-cara libro-pergamino">
      {cara.cabecera && (
        <div className="libro-cap">
          <i>Chapter {cap.n}</i>
          <b>{cap.titulo}</b>
          <em>{cap.subtitulo}</em>
          <u>❦</u>
        </div>
      )}

      <CuentoVivo texto={pagina.texto} />

      {/* Una de las tres láminas internas, embebida bajo el texto (caras 2,3,4). */}
      {cara.lamina !== undefined && (
        <div className="libro-medio">
          <img src={cap.imgDentro[cara.lamina]} alt={cap.altDentro[cara.lamina]} draggable={false} />
        </div>
      )}

      {/* La brújula en español: qué está pasando en esta página.
          El FOLIO solo en escritorio: el móvil enseña una sola página por
          capítulo, así que su numeración real saltaría 2 → 7 → 12 y se leería
          como un error. Allí la posición ya la dice el pie ("Cap. 2 de 7"). */}
      <div className="libro-es">
        <i>ES</i>
        <span>{pagina.es}</span>
        {!movil && <b>{cara.folio}</b>}
      </div>

      {/* Los phrasal verbs, solo en la primera cara de texto del capítulo. */}
      {cara.phrasals && (
        <div className="libro-pie">
          <div className="libro-pie-cab">
            <i>Phrasal verbs</i>
            {flecha && (
              <span className="libro-flecha" aria-hidden="true">
                leelo completo
                {/* Flecha →, no ↘: señala AL BOTÓN, que está a su derecha.
                    La de esquina apuntaba hacia abajo, donde no hay nada. */}
                <MoveRight strokeWidth={2.4} />
              </span>
            )}
            <button
              type="button"
              aria-label={`Leer completo el capítulo ${cap.n}: ${cap.titulo}`}
              /* stopPropagation en pointerdown, no en click: el libro arma el
                 arrastre en el pointerdown y esperar al click sería tarde — la
                 página ya iría volteándose bajo el dedo. */
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onLeer();
              }}
              className="libro-leer"
            >
              <BookOpen size="1.15em" strokeWidth={2.2} />
              Leer
            </button>
          </div>
          <div className="libro-chips">
            {cap.phrasals.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function pintarCara(
  cara: Cara | undefined,
  onLeer: (c: Capitulo) => void,
  flecha: boolean,
  movil: boolean,
): ReactNode {
  // Sin cara = el envés de una hoja del móvil: papel y nada más. Es lo que se
  // ve de refilón mientras la página gira.
  if (!cara) return <div className="libro-cara libro-pergamino" aria-hidden="true" />;
  if (cara.t === 'lamina') return <CaraLamina cara={cara} />;
  return (
    <CaraTexto
      cara={cara}
      movil={movil}
      onLeer={() => onLeer(cara.cap)}
      /* En el TELÉFONO la flechita se queda para siempre y en todos los
         capítulos: allí LEER no es un extra, es el ÚNICO camino al capítulo
         completo (pedido de Gus: «de nuevo le dejas el leelo completo, porque
         la gente no lee pero por inercia toca ahí»). En escritorio sigue
         siendo la pista de una sola vez que ya estaba: ahí el capítulo entero
         se hojea igual, así que insistir sobraría. */
      flecha={movil || (flecha && cara.cap.n === 1)}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Lector */

function Lector({ cap, onCerrar, escala }: { cap: Capitulo; onCerrar: () => void; escala: number }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCerrar]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onCerrar}
      className="fixed inset-0 z-[280] flex items-end justify-center sm:items-center"
      style={{ background: 'oklch(8% 0.01 60 / 0.72)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Capítulo ${cap.n}: ${cap.titulo}`}
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        style={{ ['--escala' as string]: escala, boxShadow: '0 24px 70px oklch(0% 0 0 / 0.6)' }}
        /* En el teléfono la hoja sube HASTA el notch (pedido de Gus: la franja
           oscura que quedaba arriba era espacio regalado): alto fijo de casi
           toda la pantalla, respetando el safe-area. En PC vuelve al diálogo
           centrado de siempre, que se ajusta a su contenido. */
        className="libro-lector relative flex h-[calc(100dvh-max(10px,env(safe-area-inset-top)))] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[20px] outline-none sm:h-auto sm:max-h-[90dvh] sm:rounded-[20px]"
      >
        <div
          className="flex shrink-0 items-start gap-3 px-5 pt-4 pb-3"
          style={{ borderBottom: '1px solid oklch(66% 0.09 78 / 0.45)' }}
        >
          <img
            src={cap.imgApertura}
            alt=""
            className="size-12 shrink-0 rounded-[6px] object-cover"
            style={{ border: '1px solid oklch(62% 0.08 70 / 0.55)' }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[0.6rem] font-bold tracking-[0.24em] uppercase" style={{ color: 'oklch(52% 0.09 62)' }}>
              Chapter {cap.n}
            </div>
            <div className="truncate text-[1.05rem] font-semibold" style={{ color: 'oklch(28% 0.06 55)' }}>
              {cap.titulo}
            </div>
            <div className="truncate text-[0.72rem] italic" style={{ color: 'oklch(48% 0.05 62)' }}>
              {cap.subtitulo}
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar el capítulo"
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
            style={{
              borderColor: 'oklch(62% 0.08 70 / 0.6)',
              background: 'oklch(72% 0.07 72 / 0.4)',
              color: 'oklch(32% 0.09 48)',
            }}
          >
            <X size={17} strokeWidth={2.2} />
          </button>
        </div>

        <div className="libro-lector-cuerpo min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {cap.paginas.map((pag, i) => (
            <div key={i}>
              {i > 0 && <div className="libro-lector-corte">·</div>}
              {/* Las tres láminas internas también aparecen aquí, REPARTIDAS
                  por el scroll: cada una antes de la página que le toca (2, 3 y
                  4), en su punto del cuento. El lector es el capítulo entero. */}
              {i >= 2 && (
                <img
                  src={cap.imgDentro[i - 2]}
                  alt={cap.altDentro[i - 2]}
                  className="mb-3 w-full rounded-[8px]"
                  style={{ border: '1px solid oklch(62% 0.08 70 / 0.55)' }}
                />
              )}
              {pag.texto.split(/\n{2,}/).map((p, j) => (
                <p key={j} className={esDialogo(p) ? 'dialogo' : undefined}>
                  <GlossText reply={p} />
                </p>
              ))}
            </div>
          ))}

          <div className="mt-5 pt-3" style={{ borderTop: '1px solid oklch(66% 0.09 78 / 0.45)' }}>
            <div className="mb-2 text-[0.58rem] font-bold tracking-[0.2em] uppercase" style={{ color: 'oklch(52% 0.09 62)' }}>
              Phrasal verbs de este capítulo
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cap.phrasals.map((x) => (
                <span
                  key={x}
                  className="rounded-full px-2 py-0.5 text-[0.72rem]"
                  style={{
                    background: 'oklch(72% 0.07 72 / 0.45)',
                    border: '1px solid oklch(62% 0.08 70 / 0.5)',
                    color: 'oklch(34% 0.08 48)',
                  }}
                >
                  {x}
                </span>
              ))}
            </div>
          </div>

          <p className="mt-4 text-center text-[0.68rem] italic" style={{ color: 'oklch(50% 0.05 62)' }}>
            Tocá cualquier palabra subrayada para ver qué significa y guardarla en tu DNA.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   La vista */

export default function LibroView() {
  const setView = useApp((s) => s.setView);
  const libroActivo = useApp((s) => s.libroActivo);
  const libro = LIBROS[libroActivo];
  const armado = useMemo(() => construir(libro), [libro]);
  const { listo: laminasListas, hechas, total } = usePrecarga(armado.todas, libro.precargaKey);
  const fuentesListas = useFuentes();
  /* Las láminas Y la tipografía. La precarga de láminas se marca en disco y no
     vuelve a bloquear; la de fuentes es de esta carga y en la segunda visita
     resuelve en el mismo tick (la woff2 ya está en caché HTTP), así que sumarla
     aquí no añade una espera visible salvo la primera vez. */
  const listo = laminasListas && fuentesListas;

  const cajaRef = useRef<HTMLDivElement>(null);
  const [caja, setCaja] = useState({ w: 0, h: 0 });
  const [cara, setCara] = useState(0);
  const [leyendo, setLeyendo] = useState<Capitulo | null>(null);
  const [escala, setEscala] = useState(() => store.get<number>(CLAVE_ESCALA, 0));
  const [mudo, setMudo] = useState(() => libroMudo());
  const [flecha, setFlecha] = useState(() => !store.get<boolean>(CLAVE_FLECHA, false));

  useLayoutEffect(() => {
    const el = cajaRef.current;
    if (!el) return;
    const medir = () => setCaja({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [listo]);

  const movil = caja.w > 0 && caja.w < UMBRAL_MOVIL;

  const caras = movil ? armado.carasMovil : armado.caras;
  const hojas = movil ? armado.hojasMovil : armado.hojas;
  const capsDeCara = movil ? armado.capDeCaraMovil : armado.capDeCara;
  const TOTAL = caras.length;

  /* Cruzar el umbral (girar el teléfono, estirar la ventana) cambia el libro
     entero debajo de los pies, y el índice viejo apuntaría a otra cosa. Se
     recoloca al ARRANQUE DEL CAPÍTULO donde se estaba — no al mismo número,
     que en la otra lista no significa nada. Portada y cierre se respetan. */
  const eraMovil = useRef(movil);
  useLayoutEffect(() => {
    if (eraMovil.current === movil) return;
    const antes = eraMovil.current ? armado.capDeCaraMovil : armado.capDeCara;
    const listaAntes = eraMovil.current ? armado.carasMovil : armado.caras;
    eraMovil.current = movil;
    setCara((k) => {
      if (k <= 0) return 0;
      if (k >= listaAntes.length - 1) return TOTAL - 1;
      const cap = antes[k];
      if (!cap) return 0;
      const destino = (movil ? armado.capDeCaraMovil : armado.capDeCara).findIndex((c) => c?.n === cap.n);
      return destino < 0 ? 0 : destino;
    });
  }, [movil, TOTAL, armado]);

  /* Tamaño de página. En móvil ocupa el ancho entero (una sola página); en
     escritorio, la mitad menos el aire del pliegue. El alto manda igual: si la
     página no cabe a lo alto, se encoge — un libro que se sale de la pantalla
     no se puede hojear. */
  const pw = useMemo(() => {
    if (!caja.w || !caja.h) return 280;
    const porAncho = movil ? caja.w - 6 : (caja.w - 18) / 2;
    const porAlto = (caja.h - 6) / RATIO;
    return Math.max(120, Math.floor(Math.min(porAncho, porAlto, movil ? 520 : 350)));
  }, [caja, movil]);

  const ph = Math.round(pw * RATIO);

  /* Escala por defecto: 1.3 en el teléfono (es el ajuste con el que Gus dijo
     «así se ve bien»), 1 en el escritorio, donde la plana ya es grande. Si el
     usuario tocó A−/A+ alguna vez, manda lo suyo: el 0 guardado significa
     «nunca eligió». */
  const escalaEfectiva = escala || (movil ? 1.3 : 1);

  const cambiarEscala = (delta: number) => {
    const v = Math.round(Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escalaEfectiva + delta)) * 100) / 100;
    if (v === escalaEfectiva) return;
    setEscala(v);
    store.set(CLAVE_ESCALA, v);
    /* La caché de texturas del curl se indexa por el TAMAÑO de la página, que
       aquí no cambia: cambia el cuerpo de letra, o sea el texto dentro de la
       misma caja. Sin este aviso la cara curvada seguiría enseñando el texto a
       la escala anterior — la página se leería de un tamaño quieta y de otro
       mientras gira. */
    invalidarCaras();
  };

  /* Y lo mismo al CAMBIAR DE LIBRO: la caja de la página puede coincidir entre
     Alicia y Around the World, así que las texturas de una podrían darse por
     buenas en la otra. Se tiran al montar la vista con otro libro. */
  useEffect(() => {
    invalidarCaras();
  }, [libro]);

  const ir = useCallback((n: number) => setCara(Math.max(0, Math.min(TOTAL - 1, n))), [TOTAL]);

  /* El sonido va en un efecto sobre `cara` y NO dentro de `ir`: así suena
     también cuando la página se voltea ARRASTRANDO (que es el gesto principal
     del componente y no pasa por nuestros botones). El ref evita que suene al
     montar la vista. */
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    sonarPagina();
  }, [cara]);

  useEffect(() => {
    if (leyendo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') ir(cara - 1);
      else if (e.key === 'ArrowRight') ir(cara + 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cara, ir, leyendo]);

  const abrirLector = (c: Capitulo) => {
    setLeyendo(c);
    if (flecha) {
      setFlecha(false); // la flechita cumplió su trabajo: no vuelve
      store.set(CLAVE_FLECHA, true);
      /* Y con ella cambia el DOM de una cara sin cambiar el tamaño de la
         página, que es justo lo que la caché de texturas no puede oler. Si no
         se invalida, la cara girando seguiría enseñando la flechita que en la
         página quieta ya no está. (Solo pasa en escritorio: en el teléfono la
         flechita se queda para siempre — es el único camino al capítulo.) */
      invalidarCaras();
    }
  };

  /* MÓVIL: AVANZAR es del libro; RETROCEDER es nuestro.

     Avanzar lo hace el componente con su arrastre nativo — la hoja se curva
     siguiendo el dedo, que es el efecto que Gus quiere conservar. Funciona
     porque en el móvil el contenido vive siempre en la mitad DERECHA (una cara
     por hoja), y arrastrar la mitad derecha es exactamente «pasar página».

     Retroceder no puede: el componente lo pide sobre la mitad IZQUIERDA, que
     en el móvil está fuera del marco. Así que el swipe hacia la derecha lo
     atendemos aquí. NO se corta la propagación —eso fue lo que mató el curl la
     vez pasada—: solo se mira el gesto de reojo y se actúa cuando fue
     claramente hacia la derecha, un movimiento que el libro nunca convierte en
     volteo desde esa mitad, así que no hay forma de que los dos respondan.

     El tap en la portada también se atiende aquí (abrir el libro), midiendo
     que el dedo no se haya movido. */
  const marcoRef = useRef<HTMLDivElement>(null);
  const caraRef = useRef(cara);
  caraRef.current = cara;

  /* Los listeners van NATIVOS y EN FASE DE CAPTURA. Las dos cosas importan.

     Nativos, porque el <Book> llama stopPropagation() en sus handlers de
     React: la propagación sintética de React es simulada, así que cortarla ahí
     deja sin correr los handlers de React de los ancestros aunque el evento
     nativo haya subido igual. Con onPointerUp={...} en el marco no se
     ejecutaba nada.

     En captura, porque también corta la propagación NATIVA. La captura baja
     desde la raíz hasta el objetivo, o sea que corre ANTES que cualquier
     handler del libro — nada de lo que él haga después nos puede dejar fuera.
     (Medido con input táctil real: en burbuja no llegaba ni el tap ni el
     deslizamiento hacia atrás; en captura, los dos.) */
  useEffect(() => {
    const el = marcoRef.current;
    if (!el || !movil) return;
    let g: { x: number; y: number; id: number } | null = null;
    let atras = false; // el gesto ya se declaró «hacia atrás»
    let abortando = false; // el pointercancel lo mandamos nosotros

    const abajo = (e: PointerEvent) => {
      g = { x: e.clientX, y: e.clientY, id: e.pointerId };
      atras = false;
    };

    const cancelar = () => {
      if (abortando) return; // es el nuestro: no borres el gesto en curso
      g = null;
      atras = false;
    };

    /* Deslizar HACIA ATRÁS: hay que quitarle el gesto al libro.

       El mismo dedo armó su arrastre, y mientras esté en él se traga cualquier
       cambio del prop `page` — medido con dedo real: la rama se ejecutaba con
       dx=+216 y la página no se movía. Esperar a que asiente serían ~600 ms de
       libro muerto. En vez de eso, en cuanto el gesto se declara hacia la
       derecha se le manda un `pointercancel` al elemento que estaba siguiendo:
       él suelta el arrastre en el acto (a la derecha no tenía nada que hacer,
       esa mitad solo voltea hacia adelante) y el salto entra limpio. */
    const mover = (e: PointerEvent) => {
      if (!g || atras || e.pointerId !== g.id) return;
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (dx < 42 || Math.abs(dy) > Math.abs(dx) * 0.8) return;
      atras = true;
      abortando = true;
      (e.target as HTMLElement | null)?.dispatchEvent(
        new PointerEvent('pointercancel', { bubbles: true, pointerId: g.id, pointerType: e.pointerType }),
      );
      abortando = false;
    };
    /* El cambio de página se pide en el TICK SIGUIENTE al pointerup.

       El mismo toque que nosotros leemos también armó el arrastre del libro, y
       mientras él sigue en ese estado se traga cualquier cambio del prop
       `page`: medido con dedo real, un deslizamiento a la derecha entraba bien
       en esta rama (dx=+216) y el libro se quedaba clavado igual. Soltando el
       hilo un instante, el libro ya asentó su arrastre a cero y acepta el
       salto. Son ~120 ms, imperceptibles porque el volteo dura mucho más. */
    const irLuego = (n: number) => setTimeout(() => ir(n), 120);

    const arriba = (e: PointerEvent) => {
      const ini = g;
      g = null;
      if (!ini) return;
      const dx = e.clientX - ini.x;
      const dy = e.clientY - ini.y;
      const k = caraRef.current;

      // Quieto = tap. En la portada, abre. (El botón «toca para abrir» tiene
      // su propio click; no hay que contarlo dos veces.)
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        if (k === 0 && !(e.target as HTMLElement).closest?.('.libro-abrir')) irLuego(1);
        return;
      }
      // Hacia la DERECHA y con intención: volver. Hacia la izquierda no se
      // toca nada — de eso se encarga el arrastre del propio libro.
      if (atras || (dx >= 48 && dx > Math.abs(dy) * 1.2)) irLuego(k - 1);
    };

    el.addEventListener('pointerdown', abajo, true);
    el.addEventListener('pointermove', mover, true);
    el.addEventListener('pointerup', arriba, true);
    el.addEventListener('pointercancel', cancelar, true);
    return () => {
      el.removeEventListener('pointerdown', abajo, true);
      el.removeEventListener('pointermove', mover, true);
      el.removeEventListener('pointerup', arriba, true);
      el.removeEventListener('pointercancel', cancelar, true);
    };
  }, [movil, ir]);

  const capActual = capsDeCara[cara];
  const pie =
    cara === 0
      ? movil
        ? 'Portada · toca para abrir'
        : 'Portada · arrastra o toca para abrir'
      : cara >= TOTAL - 1
        ? 'Fin · The End'
        : capActual
          ? `Cap. ${capActual.n} de ${libro.capitulos.length} · ${capActual.titulo}`
          : '';

  /* Con la FilaSuperior escondida en el libro móvil (App.tsx), esta barra es
     lo primero de la pantalla y a ella le toca poner el hueco del notch. */
  const BARRA_MOVIL = 'max-[739px]:pt-[max(12px,env(safe-area-inset-top))]';

  if (!listo) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={cn(COLUMNA, BARRA_MOVIL, 'flex shrink-0 items-center gap-2 pb-3')}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => setView('home')}
            aria-label="Volver al inicio"
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
            style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
          >
            <ArrowLeft size={17} strokeWidth={2} />
          </motion.button>
          <span
            className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
            style={{ color: 'var(--text-secondary)' }}
          >
            Libro · {libro.titulo}
          </span>
        </div>
        <Precarga hechas={hechas} total={total} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GlassStyles />
      {/* ── Barra de sección ──────────────────────────────────────────────── */}
      <div className={cn(COLUMNA, BARRA_MOVIL, 'flex shrink-0 items-center gap-2 pb-2')}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => setView('home')}
          aria-label="Volver al inicio"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          <ArrowLeft size={17} strokeWidth={2} />
        </motion.button>
        <span
          className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--text-secondary)' }}
        >
          Libro · {libro.titulo}
        </span>

        {/* Tamaño de letra y sonido. Van arriba y no en el pie porque el pie es
            para navegar: mezclar «dónde estoy» con «cómo lo veo» obliga a
            leer la fila entera para encontrar cualquiera de las dos.
            EN VIDRIO (pedido de Gus): el mismo material glass de los botones
            del login. La receta es la de TALK — `vidrio-tema` en el contenedor
            (mapea --background/--foreground a los tokens del tema),
            <GlassStyles/> montado una vez en la vista, y unSoloClick para que
            el wrapper de GlassButton no repita el toque. El ← redondo canónico
            NO se toca: es el de toda la app. */}
        <div className="vidrio-tema flex shrink-0 items-center gap-1.5">
          <GlassButton
            type="button"
            size="icon"
            onClick={unSoloClick(() => cambiarEscala(-PASO_ESCALA))}
            disabled={escalaEfectiva <= ESCALA_MIN}
            aria-label="Letra más pequeña"
            className={cn('shrink-0', escalaEfectiva <= ESCALA_MIN && 'pointer-events-none opacity-40')}
            contentClassName="text-[0.8rem] font-bold tracking-normal!"
          >
            A−
          </GlassButton>
          <span
            className="w-9 text-center font-mono text-[0.58rem] font-bold tabular-nums"
            style={{ color: 'var(--text-secondary)' }}
            aria-live="polite"
          >
            {Math.round(escalaEfectiva * 100)}%
          </span>
          <GlassButton
            type="button"
            size="icon"
            onClick={unSoloClick(() => cambiarEscala(PASO_ESCALA))}
            disabled={escalaEfectiva >= ESCALA_MAX}
            aria-label="Letra más grande"
            className={cn('shrink-0', escalaEfectiva >= ESCALA_MAX && 'pointer-events-none opacity-40')}
            contentClassName="text-[0.92rem] font-bold tracking-normal!"
          >
            A+
          </GlassButton>
          <GlassButton
            type="button"
            size="icon"
            onClick={unSoloClick(() => {
              const v = !mudo;
              setMudo(v);
              setLibroMudo(v);
            })}
            aria-label={mudo ? 'Activar el sonido de las páginas' : 'Silenciar las páginas'}
            aria-pressed={mudo}
            className="shrink-0"
          >
            {mudo ? <VolumeX size={16} strokeWidth={2} /> : <Volume2 size={16} strokeWidth={2} />}
          </GlassButton>
        </div>
      </div>

      {/* ── El libro ──────────────────────────────────────────────────────── */}
      <div ref={cajaRef} className={cn(COLUMNA, 'flex min-h-0 flex-1 items-center justify-center overflow-hidden')}>
        <MantineProvider defaultColorScheme="dark">
          <div style={{ ['--pw' as string]: `${pw}px`, ['--escala' as string]: escalaEfectiva }}>
            {/* En móvil el marco recorta a UNA página y el riel corre para
                enseñar la mitad donde está la cara actual: las caras pares son
                frentes (descansan a la derecha) y las impares son dorsos ya
                volteados (quedan a la izquierda). En escritorio no hay marco
                que valga: se ve la plana completa. */}
            <div
              ref={marcoRef}
              className="libro-marco relative"
              style={movil ? { width: pw, height: ph, touchAction: 'pan-y' } : undefined}
            >
              {/* El riel enseña SIEMPRE la mitad derecha del libro: es donde
                  descansan las hojas sin voltear, o sea donde está el contenido
                  con una cara por hoja. Fijo, sin alternar — de eso vive que
                  arrastrar siempre avance. */}
              <div
                className="libro-riel"
                style={movil ? { width: pw * 2, transform: `translateX(${-pw}px)` } : undefined}
              >
                <Book
                  width={pw}
                  height={ph}
                  variant="rounded"
                  /* withCover solo en escritorio: la tapa dura centra el libro
                     CERRADO sobre la plana, y ese centrado pelearía con el riel
                     del móvil, que ya decide él qué mitad se mira. */
                  withCover={!movil}
                  /* En táctil el libro espera a ver si el gesto tira en
                     horizontal antes de reclamar el arrastre. Sin esto, con la
                     letra agrandada el dedo que quiere BAJAR por el texto
                     acabaría volteando la página. */
                  mobileScrollSupport
                  /* UMBRALES DEL VOLTEO, distintos en el móvil.

                     Por defecto la hoja se voltea al soltarla pasada la MITAD
                     del recorrido (flipThreshold 50), y ese recorrido va del
                     borde libre al LOMO. En la plana completa del escritorio
                     eso es un gesto natural: el lomo está a la vista, en el
                     centro. En el móvil el lomo cae JUSTO EN EL BORDE
                     IZQUIERDO de la pantalla, así que llegar al 50% obliga a
                     arrastrar hasta casi salirse del teléfono — medido: agarrar
                     al 90% del ancho y deslizar dos tercios de la página no
                     volteaba nada; solo funcionaba empezando por la mitad.
                     Con 20 basta un deslizamiento de pulgar normal.

                     Y el atajo del "swipe rápido" pedía menos de 250 ms, que
                     para un pulgar en una pantalla de 6" se queda corto: se
                     sube a 420. */
                  flipThreshold={movil ? 20 : undefined}
                  swipeTimeThreshold={movil ? 420 : undefined}
                  /* LOS VOLTEOS DE BOTÓN, que se sentían un salto.

                     Medido cuadro a cuadro: al pulsar ‹ o › el curl (el canvas
                     WebGL) no arranca hasta 180-360 ms después. En ese hueco se
                     ve el PLIEGUE PLANO —el componente captura las texturas al
                     vuelo cuando el volteo empieza— y el relevo plano→curl a
                     mitad de camino es justo lo que se siente forzado. Con el
                     dedo no pasa: el "agarre" del pointerdown calienta las
                     texturas mientras uno todavía está arrastrando, y ahí el
                     curl entra a los 73 ms.

                     Dos cosas lo suavizan. `turnOrigin='middle'` doblega la
                     hoja RECTA en vez de con pliegue diagonal desde la esquina
                     de abajo, que era lo que hacía ver raro el movimiento en
                     reversa (la esquina volvía por un camino que el dedo nunca
                     recorre). Y `flippingTime` más largo reparte el mismo
                     relevo sobre más recorrido, así que deja de leerse como un
                     tirón y se lee como una hoja pesada. */
                  turnOrigin="middle"
                  flippingTime={400}
                  page={aPageDelLibro(cara, movil)}
                  onPageChange={(p) => setCara(aCara(p, movil))}
                  pageBackground="#f3e6c8"
                  shadowColor="#2a1c0e"
                  revealBackground="transparent"
                  /* Se calcula desde el `from` que llega, no desde `cara`: el
                     anuncio se arma durante el cambio y el estado todavía trae
                     el valor viejo. */
                  pageAnnouncement={({ from }) => {
                    const k = aCara(from - 1, movil);
                    if (k <= 0) return 'Portada';
                    if (k >= TOTAL - 1) return 'Fin del libro';
                    return `Página ${k + 1} de ${TOTAL}`;
                  }}
                >
                  {hojas.map((hoja, i) => (
                    <Book.Page
                      key={`${movil ? 'm' : 'd'}${i}`}
                      /* Solo en el MÓVIL: allí voltear la última hoja dejaría
                         la mitad derecha —la única que se ve— vacía, y habría
                         que retroceder a ciegas para volver. En escritorio se
                         voltea con normalidad: la plana entera se ve y el
                         withCover cierra el libro como debe. */
                      disabled={movil && i === hojas.length - 1}
                    >
                      <Book.Page.Front>{pintarCara(hoja[0], abrirLector, flecha, movil)}</Book.Page.Front>
                      <Book.Page.Back>{pintarCara(hoja[1], abrirLector, flecha, movil)}</Book.Page.Back>
                    </Book.Page>
                  ))}
                </Book>
              </div>

              {/* «Tocá para abrir» (pedido de Gus): el rótulo de abajo nadie lo
                  lee, así que la invitación va SOBRE la tapa — un botón que se
                  ve tocable y hace lo que dice. Solo existe en la portada;
                  abierto el libro, se va y no vuelve a estorbar. La tapa
                  cerrada queda centrada en el marco en los dos mundos (el
                  withCover del PC la centra igual), así que el 50% sirve para
                  ambos. */}
              {cara === 0 && (
                <>
                  {/* «Desliza como una revista» (pedido de Gus): el modelo mental
                      del gesto, ARRIBA de la tapa. Solo en la portada; abierto el
                      libro se va con el resto de la capa de la cara 0. */}
                  <div className="libro-revista" aria-hidden="true">
                    <ChevronLeft strokeWidth={2.4} />
                    <span>Desliza como una revista</span>
                    <ChevronRight strokeWidth={2.4} />
                  </div>
                  <button type="button" className="libro-abrir" onClick={() => ir(1)} aria-label="Abrir el libro">
                    <i>toca para abrir</i>
                    <ChevronRight strokeWidth={2.6} />
                  </button>
                </>
              )}
            </div>
          </div>
        </MantineProvider>
      </div>

      {/* ── Pie: navegación ───────────────────────────────────────────────── */}
      <div className={cn(COLUMNA, 'flex shrink-0 items-center justify-center gap-3 pt-2')}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => ir(cara - 1)}
          disabled={cara === 0}
          aria-label="Página anterior"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border disabled:cursor-default disabled:opacity-35"
          style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          <ChevronLeft size={17} strokeWidth={2.2} />
        </motion.button>

        <span
          className="min-w-0 flex-1 truncate text-center font-mono text-[0.58rem] font-bold tracking-[0.12em] uppercase"
          style={{ color: 'var(--text-secondary)' }}
        >
          {pie}
        </span>

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => ir(cara + 1)}
          disabled={cara >= TOTAL - 1}
          aria-label="Página siguiente"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border disabled:cursor-default disabled:opacity-35"
          style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          <ChevronRight size={17} strokeWidth={2.2} />
        </motion.button>
      </div>

      <AnimatePresence>
        {leyendo && (
          <Lector key={leyendo.n} cap={leyendo} escala={escalaEfectiva} onCerrar={() => setLeyendo(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
