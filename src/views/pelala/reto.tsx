/* Pélala — tarjeta de sticker peel con contexto revelable.
   Flujo (según el diseño de Gus):
   1. El sticker muestra el término, arriba.
   2. Debajo, el contexto/significado va en BLUR; el ojito lo revela.
   3. Al lado, el bookmark (tipo Instagram) guarda el término.
   4. Cuando ya lo viste, PELAS el sticker → entra el siguiente.
   Animación: la entrada ya trae el barrido holográfico rosado (reappear);
   ese mismo barrido se dispara al empezar a pelar (sweep = setBackgroundRemovalEffect,
   que reusa el láser de la entrada — no se inventa nada). */

import { useCallback, useRef, useState } from 'react';

import { Bookmark, BookmarkCheck, Eye, EyeOff } from 'lucide-react';

import {
  PeelSticker,
  slangTextSource,
  type PeelStickerHandle,
} from '@/components/pelala/peel-sticker';
import { usePelala } from '@/stores/pelala';

export function Pelala() {
  const toPicker = usePelala((s) => s.toPicker);
  const orden = usePelala((s) => s.orden);
  const retoIndex = usePelala((s) => s.retoIndex);
  const retoSiguiente = usePelala((s) => s.retoSiguiente);
  const guardados = usePelala((s) => s.guardados);
  const toggleGuardar = usePelala((s) => s.toggleGuardar);

  const term = orden[retoIndex % orden.length];
  const guardado = guardados.includes(term.id);

  const [revelado, setRevelado] = useState(false);
  const stickerRef = useRef<PeelStickerHandle>(null);

  /* Al empezar a pelar: barrido holográfico (el mismo de la entrada). */
  const onPeelStart = useCallback(() => {
    stickerRef.current?.sweep();
  }, []);

  /* Al despegar del todo: entra el siguiente término (blur reseteado). */
  const onDetach = useCallback(() => {
    setRevelado(false);
    retoSiguiente();
  }, [retoSiguiente]);

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col px-4 py-4">
      <div className="mb-1 flex items-center justify-between">
        <button
          onClick={toPicker}
          className="flex items-center gap-1 text-sm text-neutral-500 transition hover:text-neutral-800 dark:hover:text-neutral-200"
          aria-label="Volver"
        >
          ← Volver
        </button>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
          Pélala · {retoIndex + 1}/{orden.length}
        </span>
      </div>

      {/* El sticker, arriba (a la altura de la raya verde). */}
      <div className="relative mt-1 aspect-[5/3] w-full select-none">
        <PeelSticker
          ref={stickerRef}
          key="reto"
          source={slangTextSource(term.term, '¿cómo se dice?')}
          sourceKey={term.id}
          onPeelStart={onPeelStart}
          onDetach={onDetach}
          className="h-full w-full"
        />
      </div>

      {/* Contexto en blur + ojito (revelar) + bookmark (guardar). */}
      <div className="mt-2 flex items-start gap-2">
        <div className="relative min-h-[3.25rem] flex-1 overflow-hidden rounded-xl bg-neutral-100 px-4 py-3 dark:bg-neutral-900">
          <div
            className={
              'transition-[filter,opacity] duration-300 ' +
              (revelado ? 'blur-0 opacity-100' : 'pointer-events-none select-none blur-[6px] opacity-80')
            }
          >
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              {term.gloss_es}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {term.context_en}
            </p>
          </div>
          {!revelado && (
            <button
              onClick={() => setRevelado(true)}
              className="absolute inset-0 flex items-center justify-center text-xs font-medium text-neutral-500"
              aria-label="Revelar el significado"
            >
              toca el ojo para ver el significado
            </button>
          )}
        </div>

        {/* Ojito: revelar / ocultar. */}
        <button
          onClick={() => setRevelado((v) => !v)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          aria-label={revelado ? 'Ocultar significado' : 'Ver significado'}
          aria-pressed={revelado}
        >
          {revelado ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>

        {/* Bookmark tipo Instagram: guardar / quitar. */}
        <button
          onClick={() => toggleGuardar(term.id)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          aria-label={guardado ? 'Quitar de guardados' : 'Guardar'}
          aria-pressed={guardado}
        >
          {guardado ? (
            <BookmarkCheck size={20} className="text-emerald-600" />
          ) : (
            <Bookmark size={20} />
          )}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-neutral-400">
        Cuando ya te lo sepas, pela el sticker para el siguiente ✌️
      </p>
    </div>
  );
}
