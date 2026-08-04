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
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, CornerRightDown, Volume2, VolumeX, X } from 'lucide-react';
import { MantineProvider } from '@mantine/core';
import { Book } from '@gfazioli/mantine-book';

import { GlossText } from '@/components/rodeo/gloss-text';
import { PencilLoader } from '@/components/rodeo/pencil-loader';
import { store } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { CAPITULOS, IMAGENES, PHRASALS_TOTAL, type Capitulo } from '@/content/libro/alicia';
import { libroMudo, setLibroMudo, sonarPagina } from './sonido-pagina';

/* Mantine y la extensión del libro, en su variante `.layer.css`: así todo entra
   envuelto en `@layer mantine` y, como las utilidades de Tailwind v4 van sin
   capa, el CSS sin capa gana siempre. Con `styles.css` a secas el reset de
   Mantine se pondría a discutir con el resto de la app en cuanto alguien
   abriera esta vista una sola vez (los CSS no se descargan al desmontar). */
import '@mantine/core/styles.layer.css';
import '@gfazioli/mantine-book/styles.layer.css';
import './libro.css';

/* LIBRO — Alicia en el País de las Maravillas, sobre <Book> de
   @gfazioli/mantine-book.

   ESTRUCTURA (7 capítulos × 3 hojas = 21 hojas + tapa + cierre = 22 hojas,
   44 caras). Cada capítulo son tres pliegos, y cada pliego tiene su oficio:

     pliego 1   IZQ lámina de apertura     DER abrebocas + phrasal verbs + LEER
     pliego 2   IZQ solo texto             DER texto + la lámina de la MITAD
     pliego 3   IZQ solo texto             DER solo texto → cierra el capítulo

   Los phrasal verbs viven SOLO en el primer pliego del capítulo: son la
   promesa de lo que se va a aprender, no un pie de página que se repite cinco
   veces.

   MÓVIL = UNA PÁGINA. A 390 px una plana de dos deja cada hoja en ~170 px:
   linda de mirar, imposible de leer. El marco recorta a una sola página y el
   riel corre para enseñar la mitad donde está la cara actual. Por dentro el
   libro sigue siendo el mismo objeto de dos planas, así que el arrastre, el
   volteo y el curl 3D no cambian — solo se decide qué mitad se mira. */

const COLUMNA = 'mx-auto w-full max-w-[880px]';

/* El curl 3D (WebGL) es LA razón de ser de este componente, así que se queda
   también en el móvil: es un canvas pequeño, no un escenario. Solo cae al
   pliegue plano (mismo gesto, puro DOM) si el sistema pide menos movimiento. */
const SIN_CURL =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
   Las 44 caras, derivadas de los capítulos. Se arma una lista PLANA y después
   se parte en hojas de dos: así el reparto vive en un solo lugar y agregar un
   capítulo no obliga a recontar hojas a mano. */

type Cara =
  | { t: 'lamina'; src: string; alt: string; rotulo?: string; kicker?: string; fin?: boolean }
  | { t: 'texto'; cap: Capitulo; p: number; folio: number; cabecera?: boolean; phrasals?: boolean; medio?: boolean };

const CARAS: Cara[] = (() => {
  const out: Cara[] = [
    { t: 'lamina', src: IMAGENES.portada, alt: 'Portada de Alice in Wonderland, de Lewis Carroll.' },
  ];
  let folio = 2;
  for (const cap of CAPITULOS) {
    out.push({
      t: 'lamina',
      src: cap.imgApertura,
      alt: cap.altApertura,
      rotulo: cap.titulo,
      kicker: `Chapter ${cap.n}`,
    });
    for (let p = 0; p < 5; p++) {
      out.push({
        t: 'texto',
        cap,
        p,
        folio: folio++,
        cabecera: p === 0, // el título del capítulo solo en su primera cara
        phrasals: p === 0,
        medio: p === 2, // la cara que comparte espacio con la lámina de la mitad
      });
    }
  }
  out.push({
    t: 'lamina',
    src: IMAGENES.fin,
    alt: 'Alicia dormida en la ribera mientras las criaturas del País de las Maravillas se desvanecen.',
    fin: true,
  });
  return out;
})();

/** Las hojas físicas: [frente, dorso]. La última puede quedar sin dorso. */
const HOJAS: Cara[][] = Array.from({ length: Math.ceil(CARAS.length / 2) }, (_, i) =>
  CARAS.slice(i * 2, i * 2 + 2),
);

/** A qué capítulo pertenece cada cara — para el rótulo del pie y para saber
    qué abrir cuando alguien pulsa LEER. */
const CAP_DE_CARA: (Capitulo | null)[] = CARAS.map((c) => (c.t === 'texto' ? c.cap : null));
CARAS.forEach((c, i) => {
  if (c.t === 'lamina' && c.rotulo) {
    const sig = CARAS[i + 1];
    if (sig && sig.t === 'texto') CAP_DE_CARA[i] = sig.cap;
  }
});

/* ────────────────────────────────────────────────────────────────────────────
   Precarga */

/** Todas las láminas del libro, en orden de aparición. */
const TODAS: string[] = [
  IMAGENES.portada,
  ...CAPITULOS.flatMap((c) => [c.imgApertura, c.imgMedio]),
  IMAGENES.fin,
];

const CLAVE_PRECARGA = 'rodeo_libro_precargado';

/* Descarga las 16 láminas ANTES de enseñar el libro.

   Por qué bloquear: son ~1.8 MB en alta resolución (pedido de Gus: nítidas en
   el teléfono Y en el PC). Sin precarga, hojear en el celular sería ir viendo
   páginas grises que se van llenando — que es exactamente lo que rompe la
   sensación de estar pasando hojas de un libro.

   Solo bloquea LA PRIMERA VEZ. Después el service worker las tiene cache-first
   (regla 5 de sw.js las atrapa por ser estáticos same-origin), así que la
   segunda visita entra directo. El flag es del dispositivo, no del usuario.

   El techo de 20 s existe para que una red mala no deje a nadie encerrado
   mirando el lápiz: pasado ese tiempo se entra igual y las que falten se
   cargarán a su ritmo. */
function usePrecarga(): { listo: boolean; hechas: number; total: number } {
  const yaEstaba = useRef(store.get<boolean>(CLAVE_PRECARGA, false));
  const [hechas, setHechas] = useState(0);
  const [listo, setListo] = useState(yaEstaba.current);

  useEffect(() => {
    if (yaEstaba.current) return;
    let vivo = true;
    let n = 0;

    const cuenta = () => {
      if (!vivo) return;
      n++;
      setHechas(n);
      if (n >= TODAS.length) {
        store.set(CLAVE_PRECARGA, true);
        setListo(true);
      }
    };

    for (const src of TODAS) {
      const img = new Image();
      // `decode()` espera a que el bitmap esté LISTO PARA PINTAR, no solo
      // descargado: sin esto la primera hoja igual parpadea mientras el
      // navegador decodifica 1400×1960. El catch cubre el caso de una imagen
      // rota — una lámina caída no puede dejar el libro cerrado para siempre.
      img.onload = () => (img.decode ? img.decode().then(cuenta, cuenta) : cuenta());
      img.onerror = cuenta;
      img.src = src;
    }

    const techo = setTimeout(() => {
      if (!vivo) return;
      setListo(true); // red mala: se entra igual, sin marcar el flag
    }, 20000);

    return () => {
      vivo = false;
      clearTimeout(techo);
    };
  }, []);

  return { listo, hechas, total: TODAS.length };
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
          Son dieciséis láminas pintadas a mano. Se bajan una sola vez y después
          el libro abre al instante, incluso sin señal.
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
      {parrafos.map((p, i) => (
        <p key={i} className={esDialogo(p) ? 'dialogo' : undefined}>
          <GlossText reply={p} />
        </p>
      ))}
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
      {cara.fin && (
        <div className="libro-fin">
          <b>THE END</b>
          <span>
            {PHRASALS_TOTAL.length} phrasal verbs
            <br />
            en {CAPITULOS.length} capítulos
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
}: {
  cara: Extract<Cara, { t: 'texto' }>;
  onLeer: () => void;
  flecha: boolean;
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

      {/* La lámina de la MITAD del capítulo, embebida bajo el texto. */}
      {cara.medio && (
        <div className="libro-medio">
          <img src={cap.imgMedio} alt={cap.altMedio} draggable={false} />
        </div>
      )}

      {/* La brújula en español: qué está pasando en esta página. */}
      <div className="libro-es">
        <i>ES</i>
        <span>{pagina.es}</span>
        <b>{cara.folio}</b>
      </div>

      {/* Los phrasal verbs, solo en la primera cara de texto del capítulo. */}
      {cara.phrasals && (
        <div className="libro-pie">
          <div className="libro-pie-cab">
            <i>Phrasal verbs</i>
            {flecha && (
              <span className="libro-flecha" aria-hidden="true">
                leelo completo
                <CornerRightDown strokeWidth={2.4} />
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

function pintarCara(cara: Cara | undefined, onLeer: (c: Capitulo) => void, flecha: boolean): ReactNode {
  if (!cara) return null;
  if (cara.t === 'lamina') return <CaraLamina cara={cara} />;
  return <CaraTexto cara={cara} onLeer={() => onLeer(cara.cap)} flecha={flecha && cara.cap.n === 1} />;
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
        className="libro-lector relative flex max-h-[90dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[20px] outline-none sm:rounded-[20px]"
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
              {i > 0 && <div className="libro-lector-corte">{i === 2 ? '· la mitad ·' : '·'}</div>}
              {/* La lámina de la mitad también aparece aquí, en su sitio del
                  cuento: el lector es el capítulo entero, no solo su texto. */}
              {i === 2 && (
                <img
                  src={cap.imgMedio}
                  alt={cap.altMedio}
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
  const { listo, hechas, total } = usePrecarga();

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
    setEscala(v);
    store.set(CLAVE_ESCALA, v);
  };

  const TOTAL = CARAS.length;
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
    }
  };

  const capActual = CAP_DE_CARA[cara];
  const pie =
    cara === 0
      ? 'Portada · arrastrá para abrir'
      : cara >= TOTAL - 1
        ? 'Fin · The End'
        : capActual
          ? `Cap. ${capActual.n} de ${CAPITULOS.length} · ${capActual.titulo}`
          : '';

  if (!listo) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-3')}>
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
            Libro · Alice in Wonderland
          </span>
        </div>
        <Precarga hechas={hechas} total={total} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sección ──────────────────────────────────────────────── */}
      <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-2')}>
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
          Libro · Alice in Wonderland
        </span>

        {/* Tamaño de letra y sonido. Van arriba y no en el pie porque el pie es
            para navegar: mezclar «dónde estoy» con «cómo lo veo» obliga a
            leer la fila entera para encontrar cualquiera de las dos. */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => cambiarEscala(-PASO_ESCALA)}
            disabled={escalaEfectiva <= ESCALA_MIN}
            aria-label="Letra más pequeña"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border text-[0.72rem] font-bold disabled:cursor-default disabled:opacity-35"
            style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
          >
            A−
          </button>
          <span
            className="w-9 text-center font-mono text-[0.58rem] font-bold tabular-nums"
            style={{ color: 'var(--text-secondary)' }}
            aria-live="polite"
          >
            {Math.round(escalaEfectiva * 100)}%
          </span>
          <button
            type="button"
            onClick={() => cambiarEscala(PASO_ESCALA)}
            disabled={escalaEfectiva >= ESCALA_MAX}
            aria-label="Letra más grande"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border text-[0.86rem] font-bold disabled:cursor-default disabled:opacity-35"
            style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
          >
            A+
          </button>
          <button
            type="button"
            onClick={() => {
              const v = !mudo;
              setMudo(v);
              setLibroMudo(v);
            }}
            aria-label={mudo ? 'Activar el sonido de las páginas' : 'Silenciar las páginas'}
            aria-pressed={mudo}
            className="ml-0.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-full border"
            style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
          >
            {mudo ? <VolumeX size={15} strokeWidth={2} /> : <Volume2 size={15} strokeWidth={2} />}
          </button>
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
            <div className="libro-marco" style={movil ? { width: pw, height: ph } : undefined}>
              <div
                className="libro-riel"
                style={movil ? { width: pw * 2, transform: `translateX(${cara % 2 === 0 ? -pw : 0}px)` } : undefined}
              >
                <Book
                  width={pw}
                  height={ph}
                  variant={SIN_CURL ? 'flat' : 'rounded'}
                  /* withCover solo en escritorio: la tapa dura centra el libro
                     CERRADO sobre la plana, y ese centrado pelearía con el riel
                     del móvil, que ya decide él qué mitad se mira. */
                  withCover={!movil}
                  /* En táctil el libro espera a ver si el gesto tira en
                     horizontal antes de reclamar el arrastre. Sin esto, con la
                     letra agrandada el dedo que quiere BAJAR por el texto
                     acabaría volteando la página. */
                  mobileScrollSupport
                  page={cara}
                  onPageChange={setCara}
                  pageBackground="#f3e6c8"
                  shadowColor="#2a1c0e"
                  revealBackground="transparent"
                  pageAnnouncement={({ from, total: t }) =>
                    from === 1 ? 'Portada' : from >= t ? 'Fin del libro' : `Página ${from} de ${t}`
                  }
                >
                  {HOJAS.map((hoja, i) => (
                    <Book.Page key={i}>
                      <Book.Page.Front>{pintarCara(hoja[0], abrirLector, flecha)}</Book.Page.Front>
                      <Book.Page.Back>{pintarCara(hoja[1], abrirLector, flecha)}</Book.Page.Back>
                    </Book.Page>
                  ))}
                </Book>
              </div>
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
