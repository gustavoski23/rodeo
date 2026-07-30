/* Pélala — te muestro una acción (imagen del pack / por ahora emoji + contexto en
   blanco). Dices o escribes cómo se dice. Si aciertas, el sticker se pela solo.

   Voz: el botón de mic queda como stub — al integrar se conecta a src/lib/speech.ts
   (STT) + api/chat.js (juez). El chequeo local isLocalMatch da feedback inmediato. */

import { useCallback, useRef, useState } from 'react';

import {
  PeelSticker,
  slangTextSource,
  type PeelStickerHandle,
} from '@/components/pelala/peel-sticker';
import { blankContext, isLocalMatch } from '@/content/pelala/deck';
import { usePelala } from '@/stores/pelala';

export function Pelala() {
  const toPicker = usePelala((s) => s.toPicker);
  const orden = usePelala((s) => s.orden);
  const retoIndex = usePelala((s) => s.retoIndex);
  const responder = usePelala((s) => s.responder);
  const retoSiguiente = usePelala((s) => s.retoSiguiente);
  const aciertos = usePelala((s) => s.aciertos);
  const fallos = usePelala((s) => s.fallos);

  const term = orden[retoIndex % orden.length];

  const [answer, setAnswer] = useState('');
  const [estado, setEstado] = useState<'idle' | 'correcto' | 'incorrecto'>('idle');
  const stickerRef = useRef<PeelStickerHandle>(null);

  const enviar = useCallback(() => {
    if (!answer.trim() || estado === 'correcto') return;
    const correcto = isLocalMatch(term, answer);
    responder(correcto);
    if (correcto) {
      setEstado('correcto');
      stickerRef.current?.peelOff(); // el sticker se pela solo (recompensa)
      window.setTimeout(() => {
        setAnswer('');
        setEstado('idle');
        retoSiguiente();
      }, 1100);
    } else {
      setEstado('incorrecto');
    }
  }, [answer, estado, term, responder, retoSiguiente]);

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
          Pélala · ✓ {aciertos} · ✗ {fallos}
        </span>
      </div>

      {/* La "acción": por ahora emoji grande (placeholder del pack de imágenes). */}
      <div className="flex items-center justify-center rounded-2xl bg-neutral-100 py-8 dark:bg-neutral-900">
        <span className="text-7xl" role="img" aria-label="acción">
          {term.emoji}
        </span>
      </div>

      {/* El sticker con el término: se pela solo al acertar. */}
      <div className="relative mt-3 aspect-[4/3] w-full select-none">
        <PeelSticker
          ref={stickerRef}
          key="reto"
          source={slangTextSource(term.term, '¿cómo se dice?')}
          sourceKey={term.id}
          className="h-full w-full"
        />
      </div>

      <p className="mt-3 text-center text-sm text-neutral-600 dark:text-neutral-300">
        {blankContext(term)}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => {
            /* TODO integración: src/lib/speech.ts (STT) → setAnswer(transcript). */
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white transition hover:opacity-90 dark:bg-white dark:text-neutral-900"
          aria-label="Hablar (próximamente)"
          title="Hablar — se conecta al STT en la integración"
        >
          🎤
        </button>
        <input
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
            if (estado !== 'idle') setEstado('idle');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') enviar();
          }}
          placeholder="Escribe cómo se dice…"
          className="h-11 flex-1 rounded-full border border-neutral-300 bg-white px-4 text-neutral-900 outline-none transition focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        />
        <button
          onClick={enviar}
          className="h-11 shrink-0 rounded-full bg-emerald-600 px-5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
          disabled={!answer.trim()}
        >
          Enviar
        </button>
      </div>

      {estado === 'correcto' && (
        <p className="mt-3 text-center text-sm font-bold text-emerald-600">
          ¡Pela! ✓ — {term.term}: {term.gloss_es}
        </p>
      )}
      {estado === 'incorrecto' && (
        <p className="mt-3 text-center text-sm text-rose-500">
          Casi. Pista: {term.emoji} {term.gloss_es}
        </p>
      )}
    </div>
  );
}
