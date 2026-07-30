import { motion } from 'motion/react';
import { ArrowLeft, X } from 'lucide-react';

import { Card } from '@/components/ui/card';
import type { DnaItem } from '@/lib/dna';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { useLadder } from '@/stores/ladder';

import { NumberTicker } from './number-ticker';
import { Repaso } from './quiz';
import './dna.css';

/* Vista DNA — port de #view-dna (public/legacy.html:2798-2842) y de renderDNA
   (L4940-4998).

   REDISEÑO al patrón canónico de SLANG / CHARLA: fuera la hélice SVG flotando
   detrás de los números y fuera los stats a clamp(3,6rem) — el título de la
   vista vive en la barra mono de arriba, junto al ← de volver, y los cuatro
   contadores bajan a una fila de tiles compactos dentro de la Card, que es el
   scroller único de la vista (stats + REPASO + la lista).

   ⚠ La lista NO agrupa ni reordena: itera el DNA en su orden natural
   (newest-first por el unshift de saveDNA) con los tres tipos intercalados.
   La "agrupación por tipo" del viejo son SOLO los cuatro contadores del héroe
   (spec §9.13). Agrupar aquí rompería el orden cronológico, que es lo que
   hace que lo último que fallaste esté siempre arriba. */

/* Las dos constantes del patrón, redeclaradas aquí a propósito (misma
   convención que slang/index.tsx): COLUMNA de 640 px y scroll sin barra. */
const COLUMNA = 'mx-auto w-full max-w-[640px]';
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

export default function DnaView() {
  const dna = useLadder((s) => s.dna);
  const stories = useLadder((s) => s.stories);
  const borrarDna = useLadder((s) => s.borrarDna);
  const setView = useApp((s) => s.setView);

  const errores = dna.filter((d) => d.type === 'error').length;
  const slang = dna.filter((d) => d.type === 'slang').length;
  // Solo los DOMINADOS: un upgrade fallado no es un upgrade clavado (§9.15).
  const upgrades = dna.filter((d) => d.type === 'upgrade' && d.dominado).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sección ─────────────────────────────────────────────── */}
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
          style={{ color: 'var(--accent)' }}
        >
          Tu DNA · tu cerebro de errores
        </span>
      </div>

      {/* ── La tarjeta ─────────────────────────────────────────────────────
          Scroller único: contadores, repaso y la lista completa. */}
      <Card className={cn(COLUMNA, 'relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm')}>
        <div className={cn('flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3.5 py-4 sm:px-5', SIN_BARRA)}>
          {/* Contadores compactos: cuatro tiles en rejilla, que en 390 px caen
              a dos filas sin que ningún número se coma la pantalla. */}
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat valor={errores} label="Errores cazados" />
            <Stat valor={slang} label="Slang guardado" color="var(--accent)" />
            <Stat valor={upgrades} label="Upgrades clavados" color="var(--card-yellow)" />
            <Stat valor={stories} label="Episodios" />
          </div>

          <p className="shrink-0 text-[0.88rem] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
            Lo que fallas vuelve aquí hasta que lo domines.
          </p>

          <div className="flex shrink-0 flex-col gap-3">
            <Repaso dna={dna} />
          </div>

          <p
            className="flex shrink-0 items-center gap-2.5 font-mono text-[0.62rem] font-bold tracking-[0.16em] uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="h-0.5 w-5 shrink-0 rounded-sm bg-current" />
            Todo lo que tocaste
          </p>

          <div className="flex shrink-0 flex-col gap-2.5 pb-1">
            {!dna.length ? (
              <p className="text-[0.88rem]" style={{ color: 'var(--text-muted)' }}>
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
      </Card>
    </div>
  );
}

function Stat({ valor, label, color }: { valor: number; label: string; color?: string }) {
  return (
    <div
      className="rounded-2xl border px-3 py-2.5"
      style={{ background: 'var(--chip-bg)', borderColor: 'var(--borde-sutil)' }}
    >
      <NumberTicker
        value={valor}
        className="font-display block text-[1.7rem] leading-none font-extrabold tracking-[-0.03em]"
        style={{ color: color ?? 'var(--text-primary)' }}
      />
      <div className="mt-1 font-mono text-[0.54rem] tracking-[0.13em] uppercase" style={{ color: 'var(--text-muted)' }}>
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
