import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { MantineProvider } from '@mantine/core';
import { Book } from '@gfazioli/mantine-book';

import { GlossText } from '@/components/rodeo/gloss-text';
import { replySpans } from '@/lib/gloss';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { CAPITULOS, PHRASALS_TOTAL, type Capitulo } from '@/content/libro/alicia';

/* Estos dos CSS son de Mantine y de la extensión del libro, y son GLOBALES.
   Van en su variante `.layer.css` a propósito: así todo entra envuelto en
   `@layer mantine`, y como las utilidades de Tailwind v4 van sin capa, el CSS
   sin capa gana SIEMPRE. Con `styles.css` a secas el reset de Mantine se
   pondría a discutir con el resto de la app en cuanto alguien abriera esta
   vista una sola vez (los CSS no se descargan al desmontar). */
import '@mantine/core/styles.layer.css';
import '@gfazioli/mantine-book/styles.layer.css';
import './libro.css';

/* LIBRO — Alicia en el País de las Maravillas sobre <Book> de
   @gfazioli/mantine-book (hoja de dos caras que se voltea arrastrando
   cualquier punto del borde libre).

   SEIS HOJAS = doce caras, y el reparto no es casual: cada pliego abierto
   deja la ILUSTRACIÓN a la izquierda y el TEXTO a la derecha, que es como
   está armado un libro ilustrado de verdad.

     cara  0 → portada            (hoja 0, frente)
     cara  1 → cap. 1 ilustración (hoja 0, dorso)   ┐ pliego
     cara  2 → cap. 1 texto       (hoja 1, frente)  ┘
     …
     cara 10 → cap. 5 texto       (hoja 5, frente)
     cara 11 → contraportada      (hoja 5, dorso)

   Por qué las glosas NO son tocables DENTRO del libro: la página se pasa
   arrastrando desde cualquier punto, o sea que el gesto del libro y el tap de
   una glosa se pelearían por el mismo píxel — y perdería el que más importa,
   porque una glosa que a veces pasa la página es peor que ninguna. Así que
   dentro del libro la palabra glosada se ve (subrayada, invita), y el toque
   vive en el LECTOR a pantalla completa, donde no hay gesto que la dispute y
   además se lee a un tamaño humano. En el móvil la página mide ~175 px: el
   libro es para hojear, el lector es para leer. */

const COLUMNA = 'mx-auto w-full max-w-[860px]';

/* El curl 3D (WebGL) es LA razón de ser de este componente, así que se queda
   también en el móvil: es un solo canvas pequeño, no un escenario. Solo cae al
   pliegue plano (mismo gesto, puro DOM) si el sistema pide menos movimiento.
   Ojo: NO se usa MODO_LIGERO, que da true en cualquier pantalla <768px o con
   dedo — con ese criterio casi nadie llegaría a ver el curl. */
const SIN_CURL =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Proporción de las láminas de Canva (900 × 1260). Se respeta a rajatabla:
   si la página fuera más cuadrada, el object-fit se comería el marco dorado
   que las ilustraciones traen pintado. */
const RATIO = 1260 / 900;

/** Cara ilustrada: la lámina a sangre + su rótulo sobre el velo inferior. */
function CaraIlustrada({ src, alt, rotulo, kicker }: { src: string; alt: string; rotulo?: string; kicker?: string }) {
  return (
    <div className="libro-cara">
      <img className="libro-img" src={src} alt={alt} draggable={false} />
      {rotulo && (
        <>
          <div className="libro-velo" />
          <div className="libro-rotulo">
            <b>{rotulo}</b>
            {kicker && <span>{kicker}</span>}
          </div>
        </>
      )}
    </div>
  );
}

/* Texto del libro con las glosas MARCADAS pero inertes (ver cabecera). Se
   apoya en el mismo replySpans() que usa <GlossText>, así que lo subrayado
   aquí y lo tocable en el lector son exactamente las mismas palabras — no hay
   dos fuentes de verdad que se puedan desincronizar. */
function TextoInerte({ texto }: { texto: string }) {
  const parrafos = useMemo(() => texto.split(/\n{2,}/).map((p) => replySpans(p, null)), [texto]);
  return (
    <>
      {parrafos.map(({ clean, spans }, pi) => {
        const nodos: React.ReactNode[] = [];
        let pos = 0;
        spans.forEach((s, i) => {
          if (s.start > pos) nodos.push(clean.slice(pos, s.start));
          nodos.push(
            <span key={i} data-gloss className="border-b-[1.5px] border-dotted">
              {clean.slice(s.start, s.end)}
            </span>,
          );
          pos = s.end;
        });
        if (pos < clean.length) nodos.push(clean.slice(pos));
        return <p key={pi}>{nodos}</p>;
      })}
    </>
  );
}

/** Cara de pergamino: capítulo, cuento y la tira de phrasal verbs. */
function CaraTexto({ cap, folio, onLeer }: { cap: Capitulo; folio: number; onLeer: () => void }) {
  return (
    <div className="libro-cara libro-pergamino">
      <div className="libro-cap">
        <i>Chapter {cap.n}</i>
        <b>{cap.titulo}</b>
        <em>{cap.subtitulo}</em>
        <u>❦</u>
      </div>

      <div className="libro-cuerpo">
        <TextoInerte texto={cap.texto} />
      </div>

      <div className="libro-pie">
        {/* El botón del lector va EN LA MISMA LÍNEA que el rótulo, no flotando
            sobre la esquina: en absoluto se sentaba encima de los chips y se
            comía el último phrasal verb del capítulo.
            onPointerDown con stopPropagation porque el libro arma el arrastre
            en el pointerdown — esperar al click sería tarde, la página ya iría
            volteándose bajo el dedo. */}
        <div className="libro-pie-cab">
          <i>Phrasal verbs</i>
          <button
            type="button"
            aria-label={`Leer el capítulo ${cap.n}: ${cap.titulo}`}
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
          {cap.phrasals.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      </div>

      <div className="libro-folio">{folio}</div>
    </div>
  );
}

/** Lector a pantalla completa: aquí las glosas SÍ se tocan y se guardan al DNA. */
function Lector({ cap, onCerrar }: { cap: Capitulo; onCerrar: () => void }) {
  const parrafos = useMemo(() => cap.texto.split(/\n{2,}/), [cap.texto]);

  // Esc cierra, y el foco entra al panel para que el lector de pantalla no se
  // quede leyendo el libro que hay detrás.
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
        className="libro-lector relative flex max-h-[88dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-t-[20px] outline-none sm:rounded-[20px]"
        style={{ boxShadow: '0 24px 70px oklch(0% 0 0 / 0.6)' }}
      >
        <div
          className="flex shrink-0 items-start gap-3 px-5 pt-4 pb-3"
          style={{ borderBottom: '1px solid oklch(66% 0.09 78 / 0.45)' }}
        >
          <img
            src={cap.img}
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
          {parrafos.map((p, i) => (
            <p key={i}>
              <GlossText reply={p} />
            </p>
          ))}

          <div className="mt-5 pt-3" style={{ borderTop: '1px solid oklch(66% 0.09 78 / 0.45)' }}>
            <div
              className="mb-2 text-[0.58rem] font-bold tracking-[0.2em] uppercase"
              style={{ color: 'oklch(52% 0.09 62)' }}
            >
              Phrasal verbs de este capítulo
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cap.phrasals.map((p) => (
                <span
                  key={p}
                  className="rounded-full px-2 py-0.5 text-[0.72rem]"
                  style={{
                    background: 'oklch(72% 0.07 72 / 0.45)',
                    border: '1px solid oklch(62% 0.08 70 / 0.5)',
                    color: 'oklch(34% 0.08 48)',
                  }}
                >
                  {p}
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

export default function LibroView() {
  const setView = useApp((s) => s.setView);

  /* La hoja se mide, no se adivina: el ancho útil lo manda el contenedor
     (main ya trae px-5), y el libro abierto ocupa DOS páginas. El tope de
     340 px evita que en un monitor grande el libro crezca hasta parecer un
     cartel; el suelo de 132 px evita que en un móvil angosto la página se
     vuelva un sello. */
  const cajaRef = useRef<HTMLDivElement>(null);
  const [pw, setPw] = useState(280);
  useLayoutEffect(() => {
    const el = cajaRef.current;
    if (!el) return;
    const medir = () => {
      const ancho = el.clientWidth;
      // -16 px de aire: sin esto la sombra del pliegue queda pegada al borde.
      const alto = window.innerHeight;
      // La altura también manda: página = ancho × 1.4, y si eso no cabe en el
      // alto disponible el libro se sale de la pantalla en vez de encogerse.
      const porAncho = (ancho - 16) / 2;
      const porAlto = (alto * 0.62) / RATIO;
      setPw(Math.max(132, Math.min(340, Math.floor(Math.min(porAncho, porAlto)))));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    window.addEventListener('resize', medir);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, []);

  const ph = Math.round(pw * RATIO);

  /* Cara visible (índice de CARA, no de hoja: la hoja i tiene su frente en 2i
     y su dorso en 2i+1). Controlado desde aquí para que las flechas, el
     arrastre y el indicador cuenten lo mismo. */
  const [cara, setCara] = useState(0);
  const TOTAL = CAPITULOS.length * 2 + 2; // 12
  const [leyendo, setLeyendo] = useState<Capitulo | null>(null);

  const ir = useCallback((n: number) => setCara(Math.max(0, Math.min(TOTAL - 1, n))), [TOTAL]);

  // ← y → pasan página. No se arma si hay lector abierto: allí Esc manda.
  useEffect(() => {
    if (leyendo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') ir(cara - 1);
      else if (e.key === 'ArrowRight') ir(cara + 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cara, ir, leyendo]);

  /* Rótulo del pie. La cara 0 es la portada y la 11 el cierre; en medio, cada
     pliego es un capítulo, y `Math.ceil(cara / 2)` da justo su número. */
  const pie =
    cara === 0
      ? 'Portada · arrastrá el borde para abrir'
      : cara >= TOTAL - 1
        ? 'Fin · The End'
        : `Capítulo ${Math.ceil(cara / 2)} de ${CAPITULOS.length}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sección, el patrón de DNA/SLANG ──────────────────────── */}
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

      {/* ── El libro ──────────────────────────────────────────────────────── */}
      <div ref={cajaRef} className={cn(COLUMNA, 'flex min-h-0 flex-1 flex-col items-center justify-center')}>
        <MantineProvider defaultColorScheme="dark">
          <div style={{ ['--pw' as string]: `${pw}px` }}>
            <Book
              width={pw}
              height={ph}
              variant={SIN_CURL ? 'flat' : 'rounded'}
              /* withCover = tapa dura: la primera y la última hoja giran
                 rígidas sobre el lomo y el libro CERRADO se ve centrado, no
                 pegado a una mitad. Es lo que hace que la portada se sienta
                 portada. */
              withCover
              page={cara}
              onPageChange={setCara}
              pageBackground="#f3e6c8"
              shadowColor="#2a1c0e"
              /* TRANSPARENTE a propósito. El reveal pinta la mitad de la
                 plana donde no descansa ninguna hoja — con el libro CERRADO
                 eso es una losa de color al lado de la tapa, y parecía un
                 libro abierto con la página izquierda en blanco. En
                 transparente, cerrado se ve solo la tapa (flotando sobre el
                 fondo de la app, que es lo que se quiere) y abierto no se
                 nota: ahí las dos mitades tienen hoja encima. */
              revealBackground="transparent"
              pageAnnouncement={({ from, total }) =>
                from === 1 ? 'Portada' : from >= total ? 'Fin del libro' : `Página ${from} de ${total}`
              }
            >
              {/* Hoja 0 — portada / cap. 1 ilustración */}
              <Book.Page>
                <Book.Page.Front>
                  <CaraIlustrada src="/libro/00-portada.png" alt="Portada de Alice in Wonderland, de Lewis Carroll." />
                </Book.Page.Front>
                <Book.Page.Back>
                  <CaraIlustrada
                    src={CAPITULOS[0].img}
                    alt={CAPITULOS[0].alt}
                    rotulo={CAPITULOS[0].titulo}
                    kicker={`Chapter ${CAPITULOS[0].n}`}
                  />
                </Book.Page.Back>
              </Book.Page>

              {/* Hojas 1–4 — texto del capítulo i / ilustración del i+1 */}
              {CAPITULOS.slice(0, -1).map((cap, i) => {
                const siguiente = CAPITULOS[i + 1];
                return (
                  <Book.Page key={cap.n}>
                    <Book.Page.Front>
                      <CaraTexto cap={cap} folio={i * 2 + 2} onLeer={() => setLeyendo(cap)} />
                    </Book.Page.Front>
                    <Book.Page.Back>
                      <CaraIlustrada
                        src={siguiente.img}
                        alt={siguiente.alt}
                        rotulo={siguiente.titulo}
                        kicker={`Chapter ${siguiente.n}`}
                      />
                    </Book.Page.Back>
                  </Book.Page>
                );
              })}

              {/* Hoja 5 — texto del último capítulo / cierre */}
              <Book.Page>
                <Book.Page.Front>
                  <CaraTexto
                    cap={CAPITULOS[CAPITULOS.length - 1]}
                    folio={CAPITULOS.length * 2}
                    onLeer={() => setLeyendo(CAPITULOS[CAPITULOS.length - 1])}
                  />
                </Book.Page.Front>
                <Book.Page.Back>
                  <div className="libro-cara">
                    <img
                      className="libro-img"
                      src="/libro/06-final.png"
                      alt="Alicia dormida en la ribera mientras las criaturas del País de las Maravillas se desvanecen."
                      draggable={false}
                    />
                    <div className="libro-fin">
                      <b>THE END</b>
                      <span>
                        {PHRASALS_TOTAL.length} phrasal verbs
                        <br />
                        en cinco capítulos
                      </span>
                    </div>
                  </div>
                </Book.Page.Back>
              </Book.Page>
            </Book>
          </div>
        </MantineProvider>
      </div>

      {/* ── Pie: flechas + dónde va uno ───────────────────────────────────── */}
      <div className={cn(COLUMNA, 'flex shrink-0 items-center justify-center gap-3 pt-3')}>
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
          className="min-w-[9.5rem] text-center font-mono text-[0.6rem] font-bold tracking-[0.14em] uppercase"
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
        {leyendo && <Lector key={leyendo.n} cap={leyendo} onCerrar={() => setLeyendo(null)} />}
      </AnimatePresence>
    </div>
  );
}
