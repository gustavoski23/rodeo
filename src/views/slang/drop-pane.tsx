import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

import { useSlang } from '@/stores/slang';

import { EsperaDrop } from './espera';
import { ErrorSlang } from './error-slang';
import { SlangCardView } from './slang-card';

/* Pane de CALLE / TRABAJO — port de #slang-drop-area (L2709-2729).
   Héroe + feed acumulativo + dock del botón DROP.

   Dos comportamientos del viejo que hay que respetar y que se leen como bugs:
   · el héroe se oculta con el PRIMER drop y no vuelve en toda la sesión;
   · cambiar de pill CALLE↔TRABAJO no limpia el feed (es un timeline, y lo único
     que cambia es la `category` del siguiente prompt). */

const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    <div className="flex flex-col">
      {!heroeOculto && (
        <div className="relative flex flex-col items-start gap-4 pt-4">
          <p
            className="flex items-center gap-2.5 font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
            style={{ color: 'var(--accent)' }}
          >
            <span className="h-0.5 w-6 shrink-0 rounded-sm bg-current" />
            Slang · fresco de la calle
          </p>
          <p className="font-display text-[clamp(2.3rem,9.5vw,3.4rem)] leading-[0.92] font-extrabold tracking-[-0.035em]">
            SLANG QUE
            <br />
            <span style={{ color: 'var(--accent)' }}>SÍ SE USA.</span>
          </p>
          <p className="max-w-[330px] text-[0.92rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
            Expresiones frescas: contexto, ejemplo y cómo NO usarlas.
          </p>

          {/* Mascota halftone de RODEO (decorativa) — mismo SVG del viejo. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-1 -right-1 -z-10 h-[112px] w-[112px] opacity-80 max-[359px]:hidden"
            style={{ color: 'var(--accent)' }}
          >
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
        </div>
      )}

      <div className="flex flex-col gap-4 pt-4 pb-4">
        {feed.map((card) => (
          <SlangCardView key={card.id} card={card} />
        ))}
        {generando && desde !== null && <EsperaDrop desde={desde} />}
        {!generando && error && <ErrorSlang mensaje={error} onReintentar={() => void generar()} />}
        <div ref={finRef} />
      </div>

      <div className="flex justify-center py-4">
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          disabled={generando}
          onClick={() => void generar()}
          className="inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2.5 rounded-full border-0 px-[22px] py-3 text-[0.95rem] font-bold disabled:cursor-default disabled:opacity-[0.45]"
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            boxShadow: '0 0 32px color-mix(in oklch, var(--accent) 25%, transparent)',
          }}
        >
          <svg
            width="17"
            height="17"
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
      </div>
    </div>
  );
}
