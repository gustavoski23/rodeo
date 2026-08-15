import { motion } from 'motion/react';
import { Mic, MicOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useMicLang, type MicCtx } from '@/lib/speech';
import { IconMorph } from '@/components/rodeo/pill-button';

/* Mic héroe del dock de voz (public/legacy.html:2425-2436 + CSS 505-545).
   Voz-primero: es el botón más grande de la pantalla. El estado real es
   `recording` (no :hover) y de él cuelgan las tres señales del viejo: el morph
   mic ↔ mic tachado, el pulso coral y el cambio de etiqueta.

   Presentacional a propósito: el reconocedor lo crea la vista con
   crearReconocedor(), porque es ella quien sabe qué hacer con el texto final
   (sendTurn en charla, rpTurn en escenas). */

/* Chip ES/EN pegado al mic (wireMicToggle, L2969). Fija el idioma en que el
   dictado ESCUCHA; se lee justo antes de cada toma, así el cambio aplica en la
   siguiente sin recrear la instancia. Todos los chips del mismo contexto se
   repintan juntos (el DROP puede tener varias tarjetas abiertas a la vez). */
export function MicLangChip({ ctx, className }: { ctx: MicCtx; className?: string }) {
  const [lang, toggle] = useMicLang(ctx);
  const esES = lang === 'es';

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      whileHover={{ y: -1 }}
      data-lang={lang}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      aria-label={`Idioma del micrófono: ${esES ? 'español' : 'inglés'}. Tocar para cambiar`}
      title={`Dictado en ${esES ? 'español' : 'inglés'} — tocar para cambiar`}
      className={cn(
        'inline-flex h-[34px] min-w-[34px] shrink-0 cursor-pointer items-center justify-center self-center rounded-full border px-[9px]',
        'font-mono text-[0.6rem] font-bold tracking-[0.1em] transition-colors',
        esES
          ? 'border-[oklch(80%_0.14_55_/_0.4)] bg-[oklch(80%_0.14_55_/_0.12)] text-[var(--texto-es)]'
          : 'border-[oklch(87%_0.21_128_/_0.4)] bg-[var(--accent-dim)] text-[var(--accent)]',
        className,
      )}
    >
      {lang.toUpperCase()}
    </motion.button>
  );
}

export function MicButton({
  ctx = 'talk',
  recording,
  onToggle,
  size = 72,
  variant = 'hero',
  showLabel = true,
  showChip = true,
  disabled,
  className,
}: {
  ctx?: MicCtx;
  recording: boolean;
  onToggle: () => void;
  /** Lado en px. 72 = héroe del dock de TALK; 46 = mic de línea (escenas). */
  size?: number;
  /** 'hero' = relleno lima (mic-hero); 'plain' = círculo neutro (.icon-btn). */
  variant?: 'hero' | 'plain';
  showLabel?: boolean;
  showChip?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const iconSize = Math.round(size * 0.39); // 72 → 28 px, como el viejo
  const hero = variant === 'hero';

  return (
    <div className="flex flex-wrap items-center justify-center gap-[10px]">
      {showChip && <MicLangChip ctx={ctx} />}

      <motion.button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={recording ? 'Escuchando — toca para parar' : 'Presiona y habla'}
        aria-pressed={recording}
        whileTap={{ scale: 0.96 }}
        /* Pulso coral del viejo (@keyframes pulse, L512): el anillo crece de 0 a
           12 px y se desvanece. Con MotionConfig reducedMotion="user" se apaga
           solo para quien pidió menos movimiento. */
        animate={
          recording
            ? {
                boxShadow: [
                  '0 0 0 0 oklch(66% 0.20 27 / 0.45)',
                  '0 0 0 12px oklch(66% 0.20 27 / 0)',
                  '0 0 0 0 oklch(66% 0.20 27 / 0)',
                ],
              }
            : { boxShadow: '0 0 0 0 oklch(66% 0.20 27 / 0)' }
        }
        transition={recording ? { duration: 1.4, repeat: Infinity, ease: 'easeOut' } : { duration: 0.2 }}
        style={{ width: size, height: size }}
        className={cn(
          'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors',
          hero
            ? 'border-transparent bg-[var(--accent)] text-[var(--accent-ink)]'
            : recording
              ? 'border-[var(--danger)] bg-[oklch(66%_0.20_27_/_0.2)] text-[oklch(74%_0.20_27)]'
              : 'border-[var(--borde-sutil)] bg-[var(--bg-surface)] text-[var(--text-primary)]',
          'disabled:cursor-default disabled:opacity-35',
          className,
        )}
      >
        <IconMorph
          on={recording}
          size={iconSize}
          iconOn={<MicOff size={iconSize} strokeWidth={1.5} />}
          iconOff={<Mic size={iconSize} strokeWidth={1.5} />}
        />
      </motion.button>

      {showLabel && (
        <span
          aria-hidden="true"
          className={cn(
            'w-full text-center font-mono text-[0.66rem] font-bold tracking-[0.1em] uppercase transition-colors',
            recording ? 'text-[oklch(74%_0.20_27)]' : 'text-[var(--text-muted)]',
          )}
        >
          {/* Con Deepgram el texto queda en el campo al parar: enviar es aparte. */}
          {recording ? 'Escuchando… toca para parar' : 'Presiona y habla'}
        </span>
      )}
    </div>
  );
}
