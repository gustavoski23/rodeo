import { motion } from 'motion/react';
import { X } from 'lucide-react';

import type { DnaItem } from '@/lib/dna';
import { useLadder } from '@/stores/ladder';

import { NumberTicker } from './number-ticker';
import { Repaso } from './quiz';
import './dna.css';

/* Vista DNA — port de #view-dna (public/legacy.html:2798-2842) y de renderDNA
   (L4940-4998).

   ⚠ La lista NO agrupa ni reordena: itera el DNA en su orden natural
   (newest-first por el unshift de saveDNA) con los tres tipos intercalados.
   La "agrupación por tipo" del viejo son SOLO los cuatro contadores del héroe
   (spec §9.13). Agrupar aquí rompería el orden cronológico, que es lo que
   hace que lo último que fallaste esté siempre arriba. */

export default function DnaView() {
  const dna = useLadder((s) => s.dna);
  const stories = useLadder((s) => s.stories);
  const borrarDna = useLadder((s) => s.borrarDna);

  const errores = dna.filter((d) => d.type === 'error').length;
  const slang = dna.filter((d) => d.type === 'slang').length;
  // Solo los DOMINADOS: un upgrade fallado no es un upgrade clavado (§9.15).
  const upgrades = dna.filter((d) => d.type === 'upgrade' && d.dominado).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
      {/* ── HÉROE + STATS ── */}
      <div className="relative">
        <p
          className="mb-3 flex items-center gap-2.5 font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          <span className="h-0.5 w-6 shrink-0 rounded-sm bg-current" />
          DNA · tu cerebro de errores
        </p>

        {/* Hélice line-art: decorativa, detrás de los números. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-1 -right-0.5 -z-10 size-[92px] opacity-80 max-[359px]:hidden"
          style={{ color: 'var(--accent)' }}
        >
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="block h-full w-full">
            <path d="M32 12 C64 30 64 30 32 50 C0 70 0 70 32 88" transform="translate(4 0)" />
            <path d="M72 12 C40 30 40 30 72 50 C104 70 104 70 72 88" transform="translate(-4 0)" />
            <path d="M34 24 L66 24" strokeWidth="5" />
            <path d="M28 40 L72 40" strokeWidth="5" />
            <path d="M28 60 L72 60" strokeWidth="5" />
            <path d="M34 76 L66 76" strokeWidth="5" />
          </svg>
        </div>

        <div className="flex flex-wrap items-end gap-x-7 gap-y-4 pt-1">
          <Stat valor={errores} label="Errores cazados" />
          <Stat valor={slang} label="Slang guardado" color="var(--accent)" />
          <Stat valor={upgrades} label="Upgrades clavados" color="var(--card-yellow)" />
          <Stat valor={stories} label="Episodios" />
        </div>
      </div>

      <p className="max-w-[320px] text-[0.92rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
        Lo que fallas vuelve aquí hasta que lo domines.
      </p>

      <Repaso dna={dna} />

      <p
        className="flex items-center gap-2.5 font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
        style={{ color: 'var(--text-muted)' }}
      >
        <span className="h-0.5 w-6 shrink-0 rounded-sm bg-current" />
        Todo lo que tocaste
      </p>

      <div className="flex flex-col gap-2.5 pb-6">
        {!dna.length ? (
          <p className="pt-2 text-[0.88rem]" style={{ color: 'var(--text-muted)' }}>
            Todavía no hay nada aquí. Habla en TALK o guarda slang — tus errores y hallazgos van cayendo solos.
          </p>
        ) : (
          dna.map((d, i) => (
            /* La key lleva el ts + el índice: dos items pueden compartir ts
               (mismo turno del coach) y el ts solo no sería único. */
            <Fila key={`${d.ts}-${i}`} d={d} onBorrar={() => borrarDna(d)} />
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ valor, label, color }: { valor: number; label: string; color?: string }) {
  return (
    <div>
      <NumberTicker
        value={valor}
        className="font-display block text-[clamp(2.6rem,11vw,3.6rem)] leading-none font-extrabold tracking-[-0.03em]"
        style={{ color: color ?? 'var(--text-primary)' }}
      />
      <div className="mt-1 font-mono text-[0.58rem] tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  );
}

function Fila({ d, onBorrar }: { d: DnaItem; onBorrar: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start justify-between gap-3 rounded-2xl border px-4 py-3.5"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--superficie-t)' }}
    >
      <div className="rd-dna-texto">
        {d.type === 'error' ? (
          <>
            <div className="text-[0.88rem]">
              <span className="line-through" style={{ color: 'var(--texto-mal)' }}>
                {d.quote}
              </span>{' '}
              → <span className="font-semibold" style={{ color: 'var(--accent)' }}>{d.fix}</span>
            </div>
            <div className="mt-[3px] text-[0.78rem]" style={{ color: 'var(--text-secondary)' }}>
              {d.why || ''}
            </div>
          </>
        ) : d.type === 'upgrade' ? (
          <>
            <div className="text-[0.88rem]">
              <span className="line-through" style={{ color: 'var(--text-muted)' }}>
                {d.b2 || ''}
              </span>{' '}
              → <span className="font-semibold" style={{ color: 'var(--accent)' }}>{d.fix}</span>
            </div>
            <div className="mt-[3px] text-[0.78rem]" style={{ color: 'var(--text-secondary)' }}>
              {d.dominado && (
                <>
                  <span className="font-bold" style={{ color: 'var(--warn)' }}>
                    clavado ✓
                  </span>{' '}
                  ·{' '}
                </>
              )}
              {d.why || ''}
            </div>
          </>
        ) : (
          <>
            <div className="text-[0.92rem] font-bold">
              {d.term}
              {d.meaning && (
                <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>
                  {' '}
                  — {d.meaning}
                </span>
              )}
            </div>
            {d.example && (
              <div className="mt-[3px] text-[0.78rem] italic" style={{ color: 'var(--text-secondary)' }}>
                "{d.example}"
              </div>
            )}
          </>
        )}
      </div>

      {/* Borrado por IDENTIDAD del objeto, no por índice (§9.14). */}
      <button
        type="button"
        onClick={onBorrar}
        aria-label="Borrar"
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent"
        style={{ color: 'var(--text-muted)' }}
      >
        <X size={15} strokeWidth={1.5} />
      </button>
    </motion.div>
  );
}
