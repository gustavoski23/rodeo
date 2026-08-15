/* DockPractica — la superficie glass ÚNICA de SLANG.

   Antes el área de "úsalo tú" eran DOS cajas idénticas apiladas: la tarjeta de
   significado y el mini-chat, cada una con su propio --bg-surface + borde +
   sombra y un hueco (mt-3) entre medias. En oscuro se leía como "una cajita
   dentro de otra cajita" — el fallo que marcó Gus en la captura. Este dock las
   funde en UN SOLO material continuo: un fondo, un borde exterior y una sombra.
   El divisor entre significado y práctica es un hairline INTERIOR del mismo
   componente (lo pone la zona de práctica con su border-top), no otra caja.

   BORDE ANIMADO: el BorderBeam del paquete npm `border-beam` (components/ui).
   Sus props salen del STORE `useBeam` — el default lo fijó Gus en el playground
   (pulse-inner · colorful · 100% · brillo 1.1 · 10 s) y el personalizador (bajo
   «Personalizar aurora») lo cambia en vivo. El `theme` sigue al tema real de la
   app (claro→light; oscuro y gradiente→dark, ambos son fondos oscuros). El
   paquete trae su propio soporte de prefers-reduced-motion.

   `vidrio-tema` (aurora.css) se declara aquí: es el ancestro de los GlassButton
   del compositor, así heredan las crudas --background/--foreground por tema y el
   vidrio del login se ve igual en claro/oscuro/gradiente. */

import type { ReactNode } from 'react';

import { BorderBeam } from '@/components/ui/border-beam';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { useBeam } from '@/stores/beam';

export function DockPractica({ className, children }: { className?: string; children: ReactNode }) {
  const tema = useApp((s) => s.tema);
  const beam = useBeam((s) => s.appearance);

  return (
    <BorderBeam
      /* key por tipo+tema: el paquete calcula presets al montar, así que un
         cambio de tipo o de tema debe re-montar para tomar los valores nuevos. */
      key={`${beam.size}-${tema}`}
      size={beam.size}
      colorVariant={beam.colorVariant}
      theme={tema === 'claro' ? 'light' : 'dark'}
      strength={beam.strength}
      brightness={beam.brightness}
      duration={beam.duration}
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
