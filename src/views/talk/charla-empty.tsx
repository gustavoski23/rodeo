import { useState } from 'react';
import { motion } from 'motion/react';

import { TextAnimate } from '@/components/magicui/text-animate';
import { useApp } from '@/stores/app';

import { CHIPS, elegirRompehielos, type ScenarioKey } from './prompts';

/* Estado vacío de CHARLA — port de #talk-empty (public/legacy.html:2332-2390):
   héroe, tarjeta de dibujo libre con su rompehielos, y los 9 chips en dos
   secciones. Mismo contenido y mismos textos; el chrome se rehace con tokens.

   FUERA DE ALCANCE (spec §8 trampa 32): el botón "Rétame" (#retame-btn) vive
   en este markup pero su lógica es js/cards-mode.js, una isla que no se porta.
   Aquí no se pinta: un botón que no hace nada es peor que no tenerlo.

   El rompehielos se sortea al MONTAR. Es el mismo momento que en el viejo:
   allí refrescarRompehielos() corría al entrar a la vista y al cerrar sesión,
   que es exactamente cuando este componente aparece. */
export function CharlaEmpty({
  onLibre,
  onScenario,
}: {
  onLibre: (ice: string) => void;
  onScenario: (key: ScenarioKey) => void;
}) {
  const nombre = useApp((s) => s.nombre);
  const [ice, setIce] = useState(elegirRompehielos);

  return (
    <div className="scroll-area flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto pb-4">
      {/* ── HÉROE ── */}
      <div className="relative">
        <p className="mb-3 flex items-center gap-2.5 font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
          <span className="h-0.5 w-6 shrink-0 rounded-sm bg-current" />
          Talk · coach en vivo
        </p>
        <p className="font-display mb-3 text-[clamp(2.3rem,9.5vw,3.4rem)] leading-[0.92] font-extrabold tracking-[-0.035em]">
          ¿DE QUÉ
          <br />
          HABLAMOS <span style={{ color: 'var(--accent)' }}>HOY?</span>
        </p>
        {/* El saludo por nombre entra animado: es lo único personal de la
            pantalla y merece que se note que te está hablando a ti. */}
        <TextAnimate
          key={nombre ?? 'anon'}
          as="p"
          animation="blurInUp"
          by="word"
          once
          duration={0.5}
          className="max-w-[330px] text-[0.92rem] leading-[1.55]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {nombre
            ? `Hey ${nombre} — elige tema y habla. Te corrijo sin cortarte el flow.`
            : 'Elige tema, habla — te corrijo sin cortarte el flow.'}
        </TextAnimate>

        {/* Ilustración line-art: coach con auriculares + bocadillo (decorativa).
            Va DETRÁS del titular (-z-10, no encima como en el viejo): el trazo
            es grueso y el "HOY?" acababa cruzado por el círculo de la cabeza. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-1.5 -right-1 -z-10 h-[108px] w-[108px] opacity-85 max-[359px]:hidden"
          style={{ color: 'var(--accent)' }}
        >
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="block h-full w-full">
            <circle cx="42" cy="46" r="24" />
            <path d="M18 46 Q18 20 42 20 Q66 20 66 46" />
            <path d="M16 44 L16 54" strokeWidth="9" />
            <path d="M68 44 L68 54" strokeWidth="9" />
            <path d="M68 52 Q68 66 54 66" />
            <path d="M52 66 L52 66" strokeWidth="8" />
            <path d="M70 22 L92 22 Q98 22 98 28 L98 40 Q98 46 92 46 L84 46 L80 54 L79 46 L72 46" strokeWidth="5" />
            <path d="M78 34 L78 34" strokeWidth="5" />
            <path d="M85 34 L85 34" strokeWidth="5" />
            <path d="M92 34 L92 34" strokeWidth="5" />
          </svg>
        </div>
      </div>

      {/* ── Dibujo libre: el coach arranca, sin gastar llamada ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }}
        className="rounded-[20px] border px-[18px] pt-4 pb-[15px]"
        style={{
          borderColor: 'color-mix(in oklch, var(--accent) 24%, transparent)',
          background:
            'linear-gradient(158deg, color-mix(in oklch, var(--accent) 7%, transparent), var(--chip-bg))',
        }}
      >
        <span
          className="inline-flex items-center gap-[7px] font-mono text-[0.6rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          <span
            aria-hidden="true"
            className="size-[7px] rounded-full"
            style={{ background: 'var(--accent)', boxShadow: '0 0 0 4px color-mix(in oklch, var(--accent) 14%, transparent)' }}
          />
          Dibujo libre · el coach arranca
        </span>
        <p className="my-[11px] min-h-[1.5em] text-[1.06rem] leading-[1.5] font-medium" style={{ color: 'var(--text-primary)' }}>
          {ice}
        </p>
        <div className="flex flex-wrap items-center gap-3.5">
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onLibre(ice)}
            className="inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2.5 rounded-full border-0 px-[22px] py-3 text-[0.95rem] font-bold"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              boxShadow: '0 0 32px color-mix(in oklch, var(--accent) 25%, transparent)',
            }}
          >
            Sígueme el hilo →
          </motion.button>
          <button
            type="button"
            onClick={() => setIce(elegirRompehielos())}
            aria-label="Otro rompehielos"
            className="cursor-pointer border-0 bg-transparent px-1 py-1.5 font-mono text-[0.74rem] tracking-[0.04em] underline underline-offset-[3px]"
            style={{ color: 'var(--text-muted)' }}
          >
            otro tema
          </button>
        </div>
      </motion.div>

      {/* ── Chips de escenario ── */}
      {CHIPS.map(({ seccion, items }) => (
        <div key={seccion}>
          <p className="mb-3 flex items-center gap-2.5 font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
            <span className="h-0.5 w-6 shrink-0 rounded-sm bg-current" />
            {seccion}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {items.map(({ key, emoji, label }) => (
              <motion.button
                key={key}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onScenario(key)}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-[18px] py-3 text-left text-[0.9rem] font-medium transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-dim)]"
                style={{
                  borderColor: 'var(--borde-sutil)',
                  background: 'var(--chip-bg-fuerte)',
                  color: 'var(--text-primary)',
                }}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {emoji}
                </span>
                {label}
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
