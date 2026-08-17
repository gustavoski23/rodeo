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
  /* SIEMPRE el mapa. Antes, con `onboarded && !job && !pospuesto`, esta vista
     abría con ElegirTrabajo — o sea que a quien acaba de decir "soy A1" lo
     primero que la app le preguntaba era a qué se dedica, antes de enseñarle a
     decir "hello". Con la RUTA cableada como aterrizaje del nivel A1 (F0) esa
     pantalla pasó a ser lo primero de la app entera, y no puede serlo.

     El selector NO se fue del repo: vive acá abajo, en <ElegirTrabajo />, y
     vuelve en el TRAMO 5 —`{ id: 't5', branch: 'job' }` de
     src/content/a1/tramos.ts, "Tu trabajo"—, que es el nodo del mapa que sin
     pack elegido no tiene unidades (`unitIds: []`, las llena setPackUnits).
     Ahí la pregunta llega cuando ya significa algo: el usuario ve el tramo
     bloqueado y elige para abrirlo. */
  return <A1View packsExtra={JOB_PACKS} PasoVoz={PasoVoz} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   EL SELECTOR DE TRABAJO — HOY SIN MONTAR, A LA ESPERA DEL TRAMO 5.

   Es la MISMA pantalla de antes (mismo chasis, mismo scroller con su
   desvanecido, mismo "Después elijo"), extraída a un componente en vez de
   borrada. Va `export` a propósito: con `noUnusedLocals` en alto, sin él tsc
   marcaría como huérfanos el hook useDesborde y medio archivo de imports
   (JobPicker, Card, motion, ArrowLeft…). Exportar es lo más barato que lo deja
   compilando sin perder una línea del original.

   Lo único que cambió es de quién es la decisión de "y ahora a dónde":

   · `onListo` — antes elegir trabajo caía al mapa por el propio `return` de la
     vista, y "Después elijo" levantaba un `pospuesto` local que servía para lo
     mismo. Ahora las dos salidas llaman al callback y quien lo monte decide.
   · el ← de arriba todavía hace setView('home') porque esta era la pantalla
     raíz de OFICINA. Cuando la monte el Tramo 5 lo correcto será volver al
     MAPA, no al Home: ahí toca subirlo también a prop.
   ═══════════════════════════════════════════════════════════════════════════ */
export function ElegirTrabajo({ onListo }: { onListo?: () => void }) {
  const setJob = useA1((s) => s.setJob);
  const setView = useApp((s) => s.setView);
  const scroller = useDesborde();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-3')}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => setView('home')}
          aria-label="Volver al inicio"
          className="rd-toque-44 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
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
          Ruta · elige tu trabajo
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
          <JobPicker
            packs={JOB_PACKS}
            seleccionado={null}
            onPick={(id) => {
              setJob(id);
              onListo?.();
            }}
          />
          {/* Elegir y posponer salen por la MISMA puerta: antes las dos caían al
              mapa (una fijaba el job, la otra levantaba un `pospuesto` local que
              solo servía para dejar de mostrar esta pantalla). Ahora eso lo
              decide quien monte el componente, que es el único que sabe de dónde
              vino el usuario. */}
          <button
            type="button"
            onClick={() => onListo?.()}
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
