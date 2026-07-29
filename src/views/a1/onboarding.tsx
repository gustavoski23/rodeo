import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, TriangleAlert } from 'lucide-react';

import { A1_CURSO } from '@/content/a1/core';
import type { A1Cognate } from '@/content/a1/tipos';

import { AlfredAvatar, Burbuja, ENTRADA, Puntos } from './alfred';

/* ONBOARDING — port de renderOnboarding (public/js/a1-office.js:199-253).

   Cuatro beats, una sola vez en la vida (gate rodeo_a1_onboarded): (1) Alfred
   se presenta · (2) baja el miedo · (3) el truco de los cognados · (4) encuadra
   y arranca.

   El beat 3 es el que hace el trabajo: son 16 palabras que el usuario YA sabe
   sin saberlo. Voltear una tarjeta y descubrir que "information" es
   "información" cambia la creencia "no sé nada de inglés" antes de que empiece
   la primera lección — y esa creencia es el verdadero obstáculo, no el
   vocabulario. Por eso se toca, no se lee: descubrirlo uno mismo pega, que te
   lo cuenten no. */

const TOTAL = 4;

function Cognado({ c }: { c: A1Cognate }) {
  const [volteada, setVolteada] = useState(false);
  const trampa = !!c.falseHook_es;

  return (
    <button
      type="button"
      onClick={() => setVolteada((v) => !v)}
      aria-pressed={volteada}
      aria-label={`${c.en} — tocá para ver el español`}
      className="relative cursor-pointer"
      style={{ perspective: 700 }}
    >
      {/* Alto fijo y las dos caras en absoluto: si la cara de atrás sale del
          flujo y la de adelante no, la tarjeta cambia de tamaño al voltear y
          la grilla entera baila. */}
      <motion.span
        animate={{ rotateY: volteada ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="relative block h-[78px] w-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Cara EN */}
        <span
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[18px] border px-2 py-3 text-center"
          style={{
            backfaceVisibility: 'hidden',
            background: 'var(--bg-surface)',
            borderColor: trampa ? 'color-mix(in oklch, var(--warn) 45%, transparent)' : 'var(--borde-sutil)',
            color: 'var(--text-primary)',
          }}
        >
          <span className="font-display text-[0.95rem] leading-tight font-bold tracking-[-0.02em] break-words">
            {c.en}
          </span>
          {trampa && <TriangleAlert className="size-3.5" style={{ color: 'var(--warn)' }} aria-hidden="true" />}
        </span>

        {/* Cara ES */}
        <span
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-3 text-center"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'var(--card-green)',
            color: 'var(--card-ink)',
            boxShadow: 'var(--sticker-shadow)',
          }}
        >
          <span className="text-[0.9rem] leading-tight font-semibold break-words">{c.es}</span>
          {c.falseHook_es && (
            <span className="text-[0.6rem] leading-[1.25]" style={{ color: 'var(--card-ink-soft)' }}>
              {c.falseHook_es}
            </span>
          )}
        </span>
      </motion.span>
    </button>
  );
}

export function Onboarding({ onListo }: { onListo: () => void }) {
  const [beat, setBeat] = useState(0);
  const intro = A1_CURSO.companion.intro_es;
  const ultimo = beat === TOTAL - 1;
  const etiqueta = beat === 0 ? 'Dale, contame' : ultimo ? 'Empezar' : 'Seguir';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-2">
      <div className="shrink-0 pt-2">
        <Puntos activo={beat} total={TOTAL} />
      </div>

      <div className="flex shrink-0 justify-center">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        >
          <AlfredAvatar size={66} />
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={beat} {...ENTRADA} exit={{ opacity: 0, y: -8 }} className="flex flex-1 flex-col gap-3">
          {beat === 0 && (
            <>
              <Burbuja>{intro[0]}</Burbuja>
              <Burbuja>{intro[1]}</Burbuja>
            </>
          )}

          {beat === 1 && <Burbuja>{intro[2]}</Burbuja>}

          {beat === 2 && (
            <>
              <Burbuja>Mirá estas y decime si no las entendés… Tocá cada una y volteala.</Burbuja>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2.5">
                {A1_CURSO.cognates.map((c) => (
                  <Cognado key={c.en} c={c} />
                ))}
              </div>
              <p className="text-[0.88rem] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
                ¿Viste? Ya te sabías un montón y no lo sabías. Arrancás con ventaja.
              </p>
            </>
          )}

          {beat === 3 && <Burbuja>{intro[3]}</Burbuja>}
        </motion.div>
      </AnimatePresence>

      <div className="flex shrink-0 items-center gap-3 pt-1">
        {beat > 0 ? (
          <button
            type="button"
            onClick={() => setBeat((b) => b - 1)}
            className="min-h-11 shrink-0 cursor-pointer rounded-full border px-4 text-[0.85rem] font-semibold"
            style={{ borderColor: 'var(--borde-sutil)', color: 'var(--text-secondary)' }}
          >
            Atrás
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => (ultimo ? onListo() : setBeat((b) => b + 1))}
          className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full text-[0.95rem] font-bold"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          {etiqueta}
          <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden="true" />
        </motion.button>
      </div>
    </div>
  );
}
