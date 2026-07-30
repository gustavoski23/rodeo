import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

import { Card } from '@/components/ui/card';
import { useSlang } from '@/stores/slang';

import { EsperaDrop } from './espera';
import { ErrorSlang } from './error-slang';
import { SlangCardView } from './slang-card';

/* Pane de CALLE / TRABAJO — REDISEÑO al lenguaje del chat de CHARLA.

   El héroe de landing (el letrote "SLANG QUE SÍ SE USA" a 3,4 rem con la carita
   lima flotando en una esquina) se convierte en un ESTADO VACÍO centrado dentro
   de la tarjeta, del mismo rango que el ConversationEmptyState del chat: la
   mascota vuelve a tamaño de icono, el titular baja a 1,5 rem y la lima queda de
   acento (eyebrow + una palabra), no de grito.

   El botón DROP se muda a la barra de abajo (DropBar, más abajo en este mismo
   fichero): es la acción de la vista, y en la charla ese sitio es el de la
   ConversationBar. Deja de flotar al final del scroll, así que se puede pulsar
   sin llegar hasta abajo del feed.

   Dos comportamientos del viejo que hay que respetar y que se leen como bugs:
   · el héroe se oculta con el PRIMER drop y no vuelve en toda la sesión;
   · cambiar de pill CALLE↔TRABAJO no limpia el feed (es un timeline, y lo único
     que cambia es la `category` del siguiente prompt). */

const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Mascota halftone de RODEO (decorativa) — mismo SVG del viejo, ahora a tamaño
   de icono dentro del estado vacío. */
function Mascota() {
  return (
    <div aria-hidden="true" className="size-[68px] shrink-0" style={{ color: 'var(--accent)' }}>
      <svg
        viewBox="0 0 120 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="block h-full w-full"
      >
        <defs>
          <pattern id="rd-slang-dots" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="2.2" cy="2.2" r="1.7" fill="currentColor" />
          </pattern>
          <clipPath id="rd-slang-clip">
            <path d="M60 14C40 14 24 22 24 40C24 52 30 58 30 68C30 88 42 104 60 104C78 104 90 88 90 68C90 58 96 52 96 40C96 22 80 14 60 14 Z" />
          </clipPath>
        </defs>
        <g clipPath="url(#rd-slang-clip)" opacity="0.5">
          <rect x="20" y="10" width="80" height="100" fill="url(#rd-slang-dots)" />
        </g>
        <path d="M60 14C40 14 24 22 24 40C24 52 30 58 30 68C30 88 42 104 60 104C78 104 90 88 90 68C90 58 96 52 96 40C96 22 80 14 60 14 Z" />
        <path
          d="M34 50 L54 50 Q58 50 58 55 L57 63 Q56 68 50 68 L42 68 Q36 68 35 62 L33 54 Q32 50 34 50 Z"
          fill="currentColor"
          strokeWidth="4"
        />
        <path
          d="M66 50 L86 50 Q88 50 87 54 L85 62 Q84 68 78 68 L70 68 Q64 68 63 63 L62 55 Q62 50 66 50 Z"
          fill="currentColor"
          strokeWidth="4"
        />
        <path d="M58 55 Q60 53 62 55" />
        <path d="M44 82 Q56 92 74 84" />
        <path d="M60 14 Q60 4 70 4 Q80 4 80 12 Q80 19 72 19" strokeWidth="5" />
        <circle cx="82" cy="10" r="4.5" strokeWidth="4.5" />
      </svg>
    </div>
  );
}

export function DropPane() {
  const feed = useSlang((s) => s.feed);
  const heroeOculto = useSlang((s) => s.heroeOculto);
  const generando = useSlang((s) => s.generando);
  const desde = useSlang((s) => s.desde);
  const error = useSlang((s) => s.error);
  const generar = useSlang((s) => s.generar);
  const finRef = useRef<HTMLDivElement | null>(null);

  // scrollIntoView del final del feed (L4840), con el mismo respeto por
  // prefers-reduced-motion. Se dispara DOS veces, igual que el viejo:
  // · al pulsar DROP (`generando` pasa a true), porque el viejo empuja el
  //   scroll ANTES de la llamada (L4769) para que el contador "generando… Ns" y
  //   los skeletons queden a la vista — sin esto, con el feed largo, pulsas y no
  //   se mueve nada y parece que se colgó (el propio legacy lo dice en
  //   L4750-4752);
  // · y cuando aterrizan las tarjetas nuevas.
  useEffect(() => {
    if (!feed.length && !generando) return;
    finRef.current?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'nearest' });
  }, [feed.length, generando]);

  return (
    /* `shrink-0`: el pane es hijo flex del scroller (que SÍ tiene alto
       definido), así que sin esto el reparto de flex comprime el pane a la
       altura visible y las tarjetas —que llevan overflow:hidden— se cortan por
       la mitad (lo cacé en mi propia captura: se veía el término y desaparecían
       el ejemplo y el "cómo NO usarla"). Con shrink-0 el pane mide lo que mide
       su contenido y el scroll hace su trabajo. */
    <div className="flex min-h-full shrink-0 flex-col gap-4">
      {!heroeOculto && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-9 text-center">
          <Mascota />
          <p
            className="flex items-center gap-2.5 font-mono text-[0.62rem] font-bold tracking-[0.16em] uppercase"
            style={{ color: 'var(--accent)' }}
          >
            <span className="h-0.5 w-5 shrink-0 rounded-sm bg-current" />
            Fresco de la calle
            <span className="h-0.5 w-5 shrink-0 rounded-sm bg-current" />
          </p>
          <p
            className="font-display text-[1.55rem] leading-[1.06] font-extrabold tracking-[-0.025em] uppercase"
            style={{ color: 'var(--text-primary)' }}
          >
            Slang que <span style={{ color: 'var(--accent)' }}>sí se usa</span>
          </p>
          <p className="max-w-[340px] text-[0.9rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
            Toca DROP y caen tres expresiones con su contexto, su ejemplo y cómo NO usarlas.
          </p>
        </div>
      )}

      {feed.map((card) => (
        <SlangCardView key={card.id} card={card} />
      ))}
      {generando && desde !== null && <EsperaDrop desde={desde} />}
      {!generando && error && <ErrorSlang mensaje={error} onReintentar={() => void generar()} />}
      <div ref={finRef} />
    </div>
  );
}

/* ── La barra de abajo de CALLE / TRABAJO ──────────────────────────────────
   Mismo sitio y misma silueta que la ConversationBar del chat: una Card baja,
   con la acción a la derecha y el estado en texto a la izquierda (que es lo que
   antes solo se sabía mirando el contador perdido en el feed). */
export function DropBar() {
  const generando = useSlang((s) => s.generando);
  const generar = useSlang((s) => s.generar);
  const mode = useSlang((s) => s.mode);

  return (
    <Card className="w-full flex-row items-center gap-3 rounded-[22px] p-2 shadow-lg">
      <span
        className="min-w-0 flex-1 truncate pl-2 text-[0.78rem] leading-[1.3]"
        style={{ color: 'var(--text-muted)' }}
      >
        {generando ? 'Buscando expresiones frescas…' : `Tres expresiones nuevas · ${mode === 'trabajo' ? 'trabajo' : 'calle'}`}
      </span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        disabled={generando}
        onClick={() => void generar()}
        aria-label="Pedir tres expresiones nuevas"
        className="inline-flex min-h-[46px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-0 px-5 py-3 font-mono text-[0.8rem] font-bold tracking-[0.08em] disabled:cursor-default disabled:opacity-[0.45]"
        style={{
          background: 'var(--accent)',
          color: 'var(--accent-ink)',
          boxShadow: '0 3px 18px color-mix(in oklch, var(--accent) 26%, transparent)',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        DROP
      </motion.button>
    </Card>
  );
}
