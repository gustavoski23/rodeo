/* DockPractica — la superficie glass ÚNICA de SLANG.

   Antes el área de "úsalo tú" eran DOS cajas idénticas apiladas: la tarjeta de
   significado y el mini-chat, cada una con su propio --bg-surface + borde +
   sombra y un hueco (mt-3) entre medias. En oscuro se leía como "una cajita
   dentro de otra cajita" — el fallo que marcó Gus en la captura. Este dock las
   funde en UN SOLO material continuo: un fondo, un borde exterior y una sombra.
   El divisor entre significado y práctica es un hairline INTERIOR del mismo
   componente (lo pone la zona de práctica con su border-top), no otra caja.

   Borde-pulso (no permanente): el borde interior respira cálido SOLO en
   interacción — enfocar el input, revelar el significado, enviar o recibir
   feedback. Tonos de marca (ciruela --aurora-1 → albaricoque --aurora-2),
   intensidad baja y ritmo lento; en reposo es invisible. Respeta
   prefers-reduced-motion (brillo quieto, sin respiración). Sustituye al
   BorderBeam viajero que antes giraba SIEMPRE en el mini-chat.

   `vidrio-tema` (aurora.css) se declara aquí: es el ancestro de los GlassButton
   del compositor, así heredan las crudas --background/--foreground por tema y el
   vidrio del login se ve igual en claro/oscuro/gradiente. */

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';

export function DockPractica({
  activo,
  className,
  children,
}: {
  activo: boolean;
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={cn('vidrio-tema relative overflow-hidden rounded-[22px]', className)}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--borde-sutil)',
        boxShadow: 'var(--sticker-shadow)',
      }}
    >
      {children}

      {/* Anillo interior cálido: 1px de tinta + un halo hacia dentro. Va como
          hijo absoluto (rounded-[inherit]) para pintarse sobre el contenido sin
          desplazarlo. La opacidad respira entre 0.3 y 0.6 solo cuando `activo`. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          boxShadow:
            'inset 0 0 0 1px color-mix(in oklch, var(--aurora-1) 52%, transparent), ' +
            'inset 0 0 24px -6px color-mix(in oklch, var(--aurora-2) 62%, transparent)',
        }}
        initial={{ opacity: 0 }}
        animate={activo ? (reduce ? { opacity: 0.5 } : { opacity: [0.3, 0.6, 0.3] }) : { opacity: 0 }}
        transition={
          activo && !reduce
            ? { duration: 2.6, ease: 'easeInOut', repeat: Infinity }
            : { duration: 0.5, ease: 'easeOut' }
        }
      />
    </div>
  );
}
