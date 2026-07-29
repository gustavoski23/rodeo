import { useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Star, Volume2 } from 'lucide-react';

import type { A1Chunk } from '@/content/a1/tipos';
import { speak, useTts } from '@/lib/speech';
import { useA1 } from '@/stores/a1';
import { toast } from '@/stores/toast';

/* La tarjeta de la frase — port de revealCardHTML (public/js/a1-office.js:774).

   Regla de oro del módulo: en toda la pantalla hay UNA sola frase en inglés
   grande. El principiante no compara ni elige; lee una y la repite. Todo lo
   demás (el español, la muleta "suena:", el molde) va chico y debajo.

   La muleta `sounds_es` está SIEMPRE, suene o no suene el audio: es lo que
   salva a quien va en el bus sin datos o con el celular en silencio. */

/** Botón de voz real: speak() → /api/tts (Aura-2). Con la voz apagada no se
    pinta — la muleta "suena:" ya cubre el paso, y un botón que no hace nada es
    peor que ninguno. */
export function BotonAudio({ en, tamano = 36 }: { en: string; tamano?: number }) {
  const { ttsOn } = useTts();
  const [sonando, setSonando] = useState(false);
  if (!ttsOn) return null;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={async () => {
        setSonando(true);
        try {
          await speak(en, { trackReplay: false });
        } finally {
          setSonando(false);
        }
      }}
      aria-label={`Escuchar «${en}»`}
      className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border"
      style={{
        width: tamano,
        height: tamano,
        borderColor: 'color-mix(in oklch, var(--card-ink) 18%, transparent)',
        background: 'color-mix(in oklch, var(--card-ink) 7%, transparent)',
        color: 'var(--card-ink)',
      }}
    >
      {sonando ? (
        <Loader2 className="size-[18px] animate-spin" strokeWidth={2} />
      ) : (
        <Volume2 className="size-[18px]" strokeWidth={2} />
      )}
    </motion.button>
  );
}

/** ★ Mis frases (rodeo_a1_saved). Nada que ver con el DNA de Gus. */
export function BotonEstrella({ chunk, tamano = 36 }: { chunk: A1Chunk; tamano?: number }) {
  const guardada = useA1((s) => s.guardadas.some((x) => x && x.id === chunk.id));
  const alternar = useA1((s) => s.alternarGuardada);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={() => {
        const ahora = alternar(chunk);
        toast(ahora ? 'Guardada en tus frases ★' : 'La quité de tus frases');
      }}
      aria-pressed={guardada}
      aria-label={guardada ? 'Quitar de mis frases' : 'Guardar en mis frases'}
      className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border"
      style={{
        width: tamano,
        height: tamano,
        borderColor: 'color-mix(in oklch, var(--card-ink) 18%, transparent)',
        background: 'color-mix(in oklch, var(--card-ink) 7%, transparent)',
        color: 'var(--card-ink)',
      }}
    >
      <Star className="size-[18px]" strokeWidth={2} fill={guardada ? 'currentColor' : 'none'} />
    </motion.button>
  );
}

export function FraseCard({
  chunk,
  completa = false,
  etiqueta = 'Así se dice',
}: {
  chunk: A1Chunk;
  /** Con cabecera (★ y 🔊) y traducción. Sin ella es solo el eco para repetir. */
  completa?: boolean;
  etiqueta?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      aria-live="polite"
      className="rounded-[24px] px-5 py-5"
      style={{
        background: 'var(--card-paper)',
        color: 'var(--card-ink)',
        border: '1px solid var(--card-borde)',
        boxShadow: 'var(--sticker-shadow)',
      }}
    >
      {completa && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <span
            className="font-mono text-[0.58rem] font-bold tracking-[0.16em] uppercase"
            style={{ color: 'var(--card-ink-soft)' }}
          >
            {etiqueta}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <BotonEstrella chunk={chunk} />
            <BotonAudio en={chunk.en} />
          </span>
        </div>
      )}

      <p className="font-display text-[clamp(1.6rem,7vw,2.2rem)] leading-[1.06] font-extrabold tracking-[-0.03em] break-words">
        {chunk.en}
      </p>

      {completa && (
        <p className="mt-2 text-[0.98rem] leading-[1.45]" style={{ color: 'var(--card-ink-soft)' }}>
          {chunk.es}
        </p>
      )}

      <p className="mt-3 font-mono text-[0.72rem] tracking-[0.03em]" style={{ color: 'var(--card-ink-soft)' }}>
        suena: {chunk.sounds_es}
      </p>
    </motion.div>
  );
}

/** El molde y sus fichas — chunkFrameHTML (a1-office.js:761). Solo aparece si
    la frase TIENE hueco: inventarle uno a una frase fija confunde. */
export function Molde({ chunk, titulo = 'El molde' }: { chunk: A1Chunk; titulo?: string }) {
  if (!chunk.frame) return null;
  return (
    <div
      className="rounded-[20px] border px-4 py-4"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--borde-sutil)' }}
    >
      <span
        className="font-mono text-[0.58rem] font-bold tracking-[0.16em] uppercase"
        style={{ color: 'var(--text-muted)' }}
      >
        {titulo}
      </span>
      <p className="font-display mt-2 text-[1.25rem] leading-[1.2] font-bold tracking-[-0.02em]">{chunk.frame}</p>
      {!!chunk.swaps?.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chunk.swaps.map((s) => (
            <span
              key={s}
              className="rounded-full border px-3 py-1.5 text-[0.82rem]"
              style={{
                background: 'var(--chip-bg)',
                borderColor: 'var(--borde-sutil)',
                color: 'var(--text-secondary)',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
