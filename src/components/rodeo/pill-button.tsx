import { useState, type ComponentProps, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';

import { cn } from '@/lib/utils';

/* Píldora de audio de la barra de sesión (volumen · play · repetir) y su morph
   de icono. Geometría del snippet que eligió el dueño: 36 px de alto, radio 40,
   fondo translúcido y borde apenas visible — los tokens --pill-* ya son ese
   blanco al 4/7/9 %, invertido en tema claro. */

/* ── Morph de dos iconos superpuestos (snippet 1, valores exactos) ─────────
   El que manda es el estado REAL (silenciado, grabando), no :hover: esto es
   móvil y ahí el hover no existe. popLayout saca al saliente del flujo para
   que el entrante no lo empuje mientras cruzan. */
export function IconMorph({
  on,
  iconOn,
  iconOff,
  size = 16,
  className,
}: {
  on: boolean;
  iconOn: ReactNode;
  iconOff: ReactNode;
  /** Lado del contenedor en px. 16 = píldora; 28 = mic héroe. */
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={on ? 'on' : 'off'}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 600, damping: 25 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {on ? iconOn : iconOff}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// motion.button admite MotionValue como hijo; aquí sólo entran nodos React.
type PillButtonProps = Omit<ComponentProps<typeof motion.button>, 'children'> & {
  children?: ReactNode;
  /** Icono fijo (sin morph). Se ignora si se pasa `morph`. */
  icon?: ReactNode;
  /** Dos iconos que se relevan según `on` (snippet 1). */
  morph?: { on: boolean; iconOn: ReactNode; iconOff: ReactNode };
  /** Variante rotatoria: cada toque alterna 0° ⇄ 180° (snippet 3). */
  spin?: boolean;
  /** Estado encendido: se tiñe de acento sin cambiar de forma (.pill-btn.on). */
  active?: boolean;
  /** Texto opcional a la derecha del icono (.pill-txt). */
  label?: string;
};

export function PillButton({
  icon,
  morph,
  spin,
  active,
  label,
  className,
  onClick,
  children,
  ...rest
}: PillButtonProps) {
  // El giro es del botón, no del estado de la app: en el viejo era una clase
  // que se quitaba a los 460 ms; aquí alterna y se queda donde cae.
  const [girado, setGirado] = useState(false);

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      onClick={(e) => {
        if (spin) setGirado((v) => !v);
        onClick?.(e);
      }}
      className={cn(
        'inline-flex h-[36px] min-w-[36px] cursor-pointer items-center justify-center gap-2 rounded-[40px] border px-3',
        'border-[var(--pill-border)] bg-[var(--pill-bg)] text-[var(--text-primary)] transition-colors',
        'hover:bg-[var(--pill-bg-hover)]',
        'disabled:cursor-default disabled:opacity-[0.38] disabled:hover:bg-[var(--pill-bg)]',
        active && 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)] hover:bg-[var(--accent-dim)]',
        className,
      )}
      {...rest}
    >
      {morph ? (
        <IconMorph on={morph.on} iconOn={morph.iconOn} iconOff={morph.iconOff} size={16} />
      ) : spin ? (
        <motion.span
          aria-hidden="true"
          className="inline-flex shrink-0 items-center justify-center"
          animate={{ rotate: girado ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          {icon ?? <RefreshCw className="size-4" />}
        </motion.span>
      ) : (
        icon
      )}
      {label && <span className="font-sans text-[13px] font-medium tracking-[-0.01em]">{label}</span>}
      {children}
    </motion.button>
  );
}
