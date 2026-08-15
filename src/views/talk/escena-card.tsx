import { motion } from 'motion/react';

import type { Escena } from './escenas-prompts';

/* Tarjeta de escena — port de rpCardEl (public/legacy.html:7161-7189).

   El CONTENIDO es el del viejo, línea por línea: emoji, etiqueta, título, y
   las tres filas Tu rol / Objetivo / La tensión, con el "Entrar a escena →"
   de remate. Lo que cambia es el chrome: la .rp-card era una superficie oscura
   con un halo lima; aquí es una tarjeta-sticker pastel, que es el vocabulario
   de la app nueva. Una escena es una invitación a jugar, y en papel de color
   se lee como tal.

   La tinta: --card-ink / --card-ink-soft están calculadas para leerse sobre
   CUALQUIER pastel. Para la tensión NO sirve --texto-obst (ese durazno está
   pensado para el shell oscuro y sobre un pastel se apaga): se usa --swap-old,
   la tinta roja hue-locked que el sistema define justo para eso. Dentro de la
   sesión, sobre superficie oscura, sí manda --texto-obst. */

/* Los pasteles rotan para que las tres escenas frescas nunca salgan iguales.
   El clásico se queda con el amarillo: es el que siempre está. */
const CANON = 'var(--card-yellow)';
const PALETA = ['var(--card-blue)', 'var(--card-green)', 'var(--card-coral)'];

function Linea({ k, v, obst }: { k: string; v: string; obst?: boolean }) {
  return (
    <div className="mt-[7px] flex gap-[9px] text-[0.86rem] leading-[1.45]">
      <span
        className="w-[62px] shrink-0 pt-0.5 font-mono text-[0.58rem] font-bold tracking-[0.1em] uppercase"
        style={{ color: 'var(--card-ink-soft)', opacity: 0.75 }}
      >
        {k}
      </span>
      <span className="min-w-0" style={{ color: obst ? 'var(--swap-old)' : 'var(--card-ink-soft)' }}>
        {v}
      </span>
    </div>
  );
}

export function EscenaCard({
  sc,
  canon,
  i = 0,
  onEnter,
}: {
  sc: Escena;
  /** El clásico de la casa: amarillo y con su propia etiqueta. */
  canon?: boolean;
  /** Índice dentro de la lista: elige pastel e inclinación del sticker. */
  i?: number;
  onEnter: (sc: Escena) => void;
}) {
  const fondo = canon ? CANON : PALETA[i % PALETA.length];
  // Inclinación mínima alterna: lo justo para que se lea "pegatina" y no
  // "tarjeta torcida". Se endereza al tocarla.
  const giro = canon ? -0.7 : i % 2 === 0 ? 0.6 : -0.5;

  return (
    <motion.button
      type="button"
      variants={{
        oculta: { opacity: 0, y: 18, rotate: giro },
        visible: { opacity: 1, y: 0, rotate: giro },
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      whileHover={{ y: -3, rotate: 0, boxShadow: 'var(--shadow-sticker-lift)' }}
      whileTap={{ scale: 0.985, rotate: 0 }}
      onClick={() => onEnter(sc)}
      className="w-full cursor-pointer rounded-[22px] border px-5 pt-5 pb-[18px] text-left shadow-sticker"
      style={{ background: fondo, borderColor: 'var(--card-borde)', color: 'var(--card-ink)' }}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span aria-hidden="true" className="shrink-0 text-2xl leading-none">
          {sc.emoji || '🎭'}
        </span>
        <span
          className="font-mono text-[0.58rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--card-ink-soft)' }}
        >
          {canon ? 'El clásico · siempre disponible' : 'Escena'}
        </span>
      </div>

      <div
        className="font-display mb-3 text-[clamp(1.4rem,6.2vw,1.95rem)] leading-none font-extrabold tracking-[-0.02em] break-words"
        style={{ color: 'var(--card-ink)' }}
      >
        {sc.title}
      </div>

      <Linea k="Tu rol" v={sc.role_es} />
      <Linea k="Objetivo" v={sc.goal_es} />
      <Linea k="La tensión" v={sc.obstacle_es} obst />

      <span
        className="mt-3.5 inline-flex items-center gap-[7px] font-mono text-[0.66rem] font-bold tracking-[0.1em] uppercase"
        style={{ color: 'var(--card-ink)' }}
      >
        Entrar a escena →
      </span>
    </motion.button>
  );
}
