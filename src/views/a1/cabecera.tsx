import { motion } from 'motion/react';
import { ArrowLeft, LifeBuoy } from 'lucide-react';

import { AlfredAvatar, Puntos } from './alfred';

/* Cromo del loop — port de paintEscenaShell (public/js/a1-office.js:620-641).
   Es el MISMO en la escena, en el repaso y en la misión TBLT a propósito: el
   usuario tiene que sentir que sigue en el mismo lugar aunque cambie el
   ejercicio. Cuatro cosas y ninguna más: salir, dónde voy, el salvavidas y
   Alfred ahí, mirando. */

export function Cabecera({
  activo,
  total,
  sub,
  onSalir,
  onPanico,
}: {
  activo: number;
  total: number;
  /** Línea chica bajo los puntos (el "PASO 3/6"). */
  sub?: string;
  onSalir: () => void;
  onPanico: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 pb-4">
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={onSalir}
        aria-label="Volver al inicio"
        className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
        style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
      >
        <ArrowLeft size={17} strokeWidth={2} />
      </motion.button>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
        <Puntos activo={activo} total={total} />
        {sub && (
          <span className="font-mono text-[0.56rem] tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </span>
        )}
      </div>

      {/* El 🆘 vive DENTRO del loop: el momento de necesitarlo es justo este. */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={onPanico}
        aria-label="Frases de emergencia"
        className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
        style={{
          borderColor: 'color-mix(in oklch, var(--accent) 35%, transparent)',
          background: 'var(--accent-dim)',
          color: 'var(--accent)',
        }}
      >
        <LifeBuoy size={17} strokeWidth={2.2} />
      </motion.button>
      <AlfredAvatar size={34} />
    </div>
  );
}
