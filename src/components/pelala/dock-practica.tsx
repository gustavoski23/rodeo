/* DockPractica — la superficie glass ÚNICA de SLANG.

   Antes el área de "úsalo tú" eran DOS cajas idénticas apiladas: la tarjeta de
   significado y el mini-chat, cada una con su propio --bg-surface + borde +
   sombra y un hueco (mt-3) entre medias. En oscuro se leía como "una cajita
   dentro de otra cajita" — el fallo que marcó Gus en la captura. Este dock las
   funde en UN SOLO material continuo: un fondo, un borde exterior y una sombra.
   El divisor entre significado y práctica es un hairline INTERIOR del mismo
   componente (lo pone la zona de práctica con su border-top), no otra caja.

   BORDE ANIMADO: el BorderBeam del paquete npm `border-beam` (el código que
   pegó Gus en su spec — components/ui/border-beam.tsx), NO el pulso casero de
   la primera pasada, que era tan tenue que "no se veía nada". Es un wrapper:
   envuelve el dock y dibuja el haz colorful alrededor. Queda SIEMPRE visible a
   plena fuerza (como la referencia "Build anything…" que mandó Gus — la
   primera pasada era tan tenue que "no se veía") y en interacción (foco del
   input, revelar, enviar, feedback) sube el brillo. El paquete trae su propio soporte de reduced-motion y de tema; el
   prop `theme` se alimenta del tema real de la app (claro→light; oscuro y
   gradiente→dark, ambos son fondos oscuros).

   `vidrio-tema` (aurora.css) se declara aquí: es el ancestro de los GlassButton
   del compositor, así heredan las crudas --background/--foreground por tema y el
   vidrio del login se ve igual en claro/oscuro/gradiente. */

import type { ReactNode } from 'react';

import { BorderBeam } from '@/components/ui/border-beam';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';

export function DockPractica({
  activo,
  className,
  children,
}: {
  activo: boolean;
  className?: string;
  children: ReactNode;
}) {
  const tema = useApp((s) => s.tema);

  return (
    <BorderBeam
      size="md"
      colorVariant="colorful"
      theme={tema === 'claro' ? 'light' : 'dark'}
      brightness={activo ? 1.7 : 1.3}
      duration={4}
      className={className}
    >
      <div
        className={cn('vidrio-tema relative overflow-hidden rounded-[22px]')}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--borde-sutil)',
          boxShadow: 'var(--sticker-shadow)',
        }}
      >
        {children}
      </div>
    </BorderBeam>
  );
}
