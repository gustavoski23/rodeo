import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { JOB_PACKS, JobPicker } from '@/content/a1/jobs';
import { cn } from '@/lib/utils';
import { useA1 } from '@/stores/a1';
import { useApp } from '@/stores/app';
import { PasoVoz } from '@/views/a1-voice/paso-voz';

import A1View from './index';

const COLUMNA = 'mx-auto w-full max-w-[640px]';

function useDesborde() {
  const ref = useRef<HTMLDivElement>(null);
  const [hayMas, setHayMas] = useState(false);

  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setHayMas(el.scrollHeight - el.clientHeight - el.scrollTop > 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    Array.from(el.children).forEach((child) => ro.observe(child));
    return () => ro.disconnect();
  }, [medir]);

  return { ref, hayMas, medir };
}

/** OFICINA lives in its own route chunk, including packs and voice practice. */
export default function OficinaView() {
  const onboarded = useA1((s) => s.onboarded);
  const job = useA1((s) => s.job);
  const setJob = useA1((s) => s.setJob);
  const setView = useApp((s) => s.setView);
  const [pospuesto, setPospuesto] = useState(false);
  const scroller = useDesborde();

  if (onboarded && !job && !pospuesto) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-3')}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => setView('home')}
            aria-label="Volver al inicio"
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
            style={{
              borderColor: 'var(--borde-sutil)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            }}
          >
            <ArrowLeft size={17} strokeWidth={2} />
          </motion.button>
          <span
            className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
            style={{ color: 'var(--accent)' }}
          >
            Oficina · elige tu trabajo
          </span>
        </div>

        <Card className={cn(COLUMNA, 'relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm')}>
          <div
            ref={scroller.ref}
            onScroll={scroller.medir}
            className={cn(
              'flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-3 py-4 sm:gap-4 sm:px-4',
              '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            )}
          >
            <p className="text-[0.88rem] leading-[1.45] sm:text-[0.9rem] sm:leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
              El tronco del curso es para todos; tu trabajo le suma sus propias escenas.
            </p>
            <JobPicker packs={JOB_PACKS} seleccionado={null} onPick={setJob} />
            <button
              type="button"
              onClick={() => setPospuesto(true)}
              className="mx-auto mt-auto cursor-pointer pt-1 text-[0.85rem] underline-offset-4 hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Después elijo
            </button>
          </div>

          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-[22px]"
            style={{ background: 'linear-gradient(to top, var(--bg-surface), transparent)' }}
            initial={false}
            animate={{ opacity: scroller.hayMas ? 1 : 0 }}
            transition={{ duration: 0.18 }}
          />
        </Card>
      </div>
    );
  }

  return <A1View packsExtra={JOB_PACKS} PasoVoz={PasoVoz} />;
}
