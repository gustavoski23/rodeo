import { motion } from 'motion/react';

import { cn } from '@/lib/utils';
import { useSlang, type SlangCard as Card } from '@/stores/slang';

/* Tarjeta sticker de jerga — port de la plantilla de L4814-4826.
   Mismos campos y mismo orden: vibe · guardar · término · significado ·
   ejemplo EN entre comillas rectas · ejemplo ES en itálica · cómo NO usarla.

   Entrada en cascada: `i` es la posición dentro del lote y hace de --i del
   viejo (animateIn → .rd-in, 0.9 s, retardo 0.07 s por índice, curva
   cubic-bezier(.16,1,.3,1)). La rotación viaja EN la misma animación: si se
   dejara como transform inline, el keyframe de entrada la borraría a mitad.

   SIN TTS, a propósito: la tarjeta de slang del viejo no habla (el único léxico
   con audio es el del DROP de STORY, que pronuncia el término). Un botón de oír
   aquí sería feature nueva, no port — y cada toque sería una llamada de pago a
   Deepgram vía speak(). Ver spec-slang.md §A3.4 y §C11. */

const EASE_SALIDA = [0.16, 1, 0.3, 1] as const;

export function SlangCardView({ card }: { card: Card }) {
  const guardar = useSlang((s) => s.guardar);

  return (
    <motion.div
      className={cn('rd-slang-card', card.theme.text)}
      style={{ background: card.theme.bg }}
      initial={{ opacity: 0, y: 24, rotate: card.rot }}
      animate={{ opacity: 1, y: 0, rotate: card.rot }}
      transition={{ duration: 0.9, ease: EASE_SALIDA, delay: card.i * 0.07 }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="label-mini">{card.vibe}</span>

        <div className="-mt-2 -mr-2 flex items-start">
          {/* Guardar en el DNA — el bookmark se rellena y ya no se vacía */}
          <button
            type="button"
            onClick={() => guardar(card.id)}
            aria-label="Guardar en DNA"
            aria-pressed={card.guardada}
            className={cn('rd-slang-icon justify-end', card.guardada && 'on')}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={card.guardada ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="term">{card.term}</div>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', margin: '6px 0 14px' }}>{card.meaning_es}</div>
      <div className="ex">"{card.example_en}"</div>
      {card.example_es && <div className="ex-es">{card.example_es}</div>}
      {card.wrong_use && <div className="wrong">⚠ {card.wrong_use}</div>}
    </motion.div>
  );
}
