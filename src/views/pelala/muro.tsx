/* El Muro — lees el término con su contexto y lo despegas cuando ya te lo sabes.
   Al despegar (detachcomplete), avanza al siguiente y entra con reappear(). */

import { useCallback } from 'react';

import { PeelSticker, slangTextSource } from '@/components/pelala/peel-sticker';
import { usePelala } from '@/stores/pelala';

export function ElMuro() {
  const toPicker = usePelala((s) => s.toPicker);
  const muroSiguiente = usePelala((s) => s.muroSiguiente);
  const orden = usePelala((s) => s.orden);
  const muroIndex = usePelala((s) => s.muroIndex);

  const term = orden[muroIndex % orden.length];

  const onDetach = useCallback(() => {
    muroSiguiente();
  }, [muroSiguiente]);

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col px-4 py-4">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={toPicker}
          className="flex items-center gap-1 text-sm text-neutral-500 transition hover:text-neutral-800 dark:hover:text-neutral-200"
          aria-label="Volver"
        >
          ← Volver
        </button>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
          El Muro · {muroIndex + 1}/{orden.length}
        </span>
      </div>

      {/* El sticker peel: gesto con dedo (móvil) o mouse (PC), resuelto por el motor. */}
      <div className="relative aspect-[4/3] w-full select-none">
        <PeelSticker
          key="muro"
          source={slangTextSource(term.term, term.gloss_es)}
          sourceKey={term.id}
          onDetach={onDetach}
          className="h-full w-full"
        />
      </div>

      <div className="mt-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-900">
        <p className="text-base text-neutral-800 dark:text-neutral-100">
          {term.context_en}
        </p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {term.emoji} {term.gloss_es}
        </p>
      </div>

      <p className="mt-3 text-center text-xs text-neutral-400">
        Despega el sticker cuando ya te lo sepas ✌️
      </p>
    </div>
  );
}
