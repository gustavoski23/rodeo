import { type ReactNode } from 'react';
import { motion } from 'motion/react';

import { GlossText } from '@/components/rodeo/gloss-text';
import { PencilLoader } from '@/components/rodeo/pencil-loader';
import { parseChunks } from '@/lib/gloss';
import type { RpBurbuja } from '@/stores/escenas';

/* Filas del scroll de la escena — port de rpAddMission (L7322), rpAddBubble
   (L7334), rpAddConsejo (L7345) y del CSS .rp-mission / .rp-narr / .rp-consejo
   (public/legacy.html:1913-1946).

   La narración conserva su marca: barra lima a la izquierda (.rp-narr), que es
   lo que distingue "la voz que pinta la escena" de una respuesta de coach. */

const entrada = {
  variants: {
    oculta: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  },
  initial: 'oculta' as const,
  animate: 'visible' as const,
  transition: { type: 'spring' as const, stiffness: 420, damping: 34 },
};

/* La acotación teatral realza las frases entre comillas: son "lo que puedes
   decir ahora mismo", no prosa. parseChunks primero porque el modelo cuela
   ⟦en||es⟧ dentro del consejo (pasa): deja el inglés y descarta el corchete. */
function consejoNodos(texto: string): ReactNode[] {
  const limpio = parseChunks(texto).clean;
  return limpio.split(/[“"]([^”"]+)[”"]/g).map((p, i) =>
    i % 2 === 1 ? (
      <b key={i} className="font-bold" style={{ color: 'var(--text-primary)' }}>
        “{p}”
      </b>
    ) : (
      p
    ),
  );
}

/** Ficha de misión: lo primero de la escena — rol / objetivo / obstáculo. */
function LineaMision({ k, v, obst }: { k: string; v: string; obst?: boolean }) {
  return (
    <div className="mt-[7px] flex gap-[9px] text-[0.86rem] leading-[1.45]">
      <span
        className="w-[62px] shrink-0 pt-0.5 font-mono text-[0.58rem] font-bold tracking-[0.1em] uppercase"
        style={{ color: 'var(--text-muted)' }}
      >
        {k}
      </span>
      {/* El obstáculo en durazno cálido: sobre el shell oscuro manda
          --texto-obst (en las tarjetas-sticker pastel manda --swap-old). */}
      <span className="min-w-0" style={{ color: obst ? 'var(--texto-obst)' : 'var(--text-secondary)' }}>
        {v}
      </span>
    </div>
  );
}

export function RpFila({ b }: { b: RpBurbuja }) {
  if (b.tipo === 'mision') {
    return (
      <motion.div
        {...entrada}
        className="shrink-0 rounded-2xl border px-4 py-3.5"
        style={{
          borderColor: 'color-mix(in oklch, var(--accent) 32%, transparent)',
          background: 'linear-gradient(158deg, color-mix(in oklch, var(--accent) 9%, transparent), var(--chip-bg))',
        }}
      >
        <span
          className="mb-2 inline-flex items-center gap-[7px] font-mono text-[0.58rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          🎭 tu papel en esta escena
        </span>
        <LineaMision k="Rol" v={b.sc.role_es} />
        <LineaMision k="Objetivo" v={b.sc.goal_es} />
        <LineaMision k="Obstáculo" v={b.sc.obstacle_es} obst />
      </motion.div>
    );
  }

  if (b.tipo === 'user') {
    return (
      <motion.div
        {...entrada}
        className="ml-auto max-w-[85%] rounded-[20px_4px_20px_20px] border px-[18px] py-3.5 text-[1rem] leading-[1.6]"
        style={{
          background: 'var(--accent-dim)',
          borderColor: 'color-mix(in oklch, var(--accent) 28%, transparent)',
          color: 'var(--text-primary)',
        }}
      >
        {b.texto}
      </motion.div>
    );
  }

  if (b.tipo === 'espera') {
    return (
      <motion.div
        {...entrada}
        aria-live="polite"
        className="max-w-[85%] self-start rounded-[4px_20px_20px_20px] border border-l-[3px] px-[18px] py-3.5"
        style={{
          background: 'var(--superficie-t)',
          borderColor: 'var(--borde-sutil)',
          borderLeftColor: 'color-mix(in oklch, var(--accent) 55%, transparent)',
        }}
      >
        {/* Sin contador de segundos: eso es exclusivo de CHARLA (spec §1.8). */}
        <PencilLoader size={4.4} label="Narrando" />
        {b.nota && (
          <div className="mt-1.5 text-[0.78rem]" style={{ color: 'var(--text-secondary)' }}>
            {b.nota}
          </div>
        )}
      </motion.div>
    );
  }

  if (b.tipo === 'narr') {
    return (
      <motion.div
        {...entrada}
        className="max-w-[85%] self-start rounded-[4px_20px_20px_20px] border border-l-[3px] px-[18px] py-3.5 text-[1rem] leading-[1.6] break-words"
        style={{
          background: 'var(--superficie-t)',
          borderColor: 'var(--borde-sutil)',
          borderLeftColor: 'color-mix(in oklch, var(--accent) 55%, transparent)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Fase 1: texto plano tal cual llega del stream. Fase 2: swap a la
            versión glosada. En ESCENAS no hay máquina de escribir. */}
        {b.final ? <GlossText reply={b.texto} glosses={b.glosses} /> : b.texto}
      </motion.div>
    );
  }

  // Consejo: dirección desde bastidores, en español, fuera del diálogo.
  return (
    <motion.div
      {...entrada}
      className="mr-auto max-w-[88%] rounded-[0_12px_12px_0] border-l-2 border-dashed px-3.5 py-2.5 text-[0.86rem] leading-[1.55]"
      style={{
        borderLeftColor: 'color-mix(in oklch, var(--accent) 50%, transparent)',
        background: 'color-mix(in oklch, var(--accent) 6%, transparent)',
        color: 'var(--text-secondary)',
      }}
    >
      <span
        className="mb-[5px] flex items-center gap-1.5 font-mono text-[0.56rem] font-bold tracking-[0.14em] uppercase"
        style={{ color: 'var(--accent)' }}
      >
        🎭 dirección · entre bastidores
      </span>
      {consejoNodos(b.texto)}
    </motion.div>
  );
}
