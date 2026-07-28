import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { REDUCED } from '@/lib/theme';
import { useAurora } from '@/stores/aurora';

import './aurora.css';

/* EL AuroraPillButton — único en la app (regla del brief: no crear un segundo).
   La píldora del Home aprobado: masas de color derivando dentro, borde
   persistente y un haz de luz recorriendo el perímetro.

   Interacción de activación (brief del Home, temporización LOCAL — no finge
   ninguna llamada al modelo):
   - Al activar NO navega ya: estado hundido (.is-pressing) durante 950 ms,
     con aria-busy y bloqueo de reactivaciones.
   - Después dispara onLaunch(viaTeclado) — el destino lo decide el llamador.
   - Reduced motion: la presión dura 80 ms y no hay traslación ni haz animado
     (eso lo resuelve aurora.css con @media).
   - Enter/Espacio activan gratis por ser <button>; distinguimos teclado por
     event.detail === 0 (los clics sintetizados por teclado llegan sin detail),
     para que el llamador pueda mover el foco a "Volver a los escenarios". */

export const AURORA_HOME_PRESS_MS = 950;
const PRESS_MS_REDUCED = 80;

export function AuroraPillButton({
  children,
  onLaunch,
  className,
  demo = false,
}: {
  children: React.ReactNode;
  onLaunch?: (viaTeclado: boolean) => void;
  className?: string;
  /** El preview del personalizador: sin presión larga ni launch. */
  demo?: boolean;
}) {
  const { masa1, masa2, luz, intensidad, velocidad } = useAurora();
  const [pressing, setPressing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Si el Home se desmonta a mitad de presión (volvió atrás, cambió de vista),
  // el timer muere con él: nada de launches fantasma.
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function activar(e: React.MouseEvent<HTMLButtonElement>) {
    if (demo || pressing) return; // bloqueo de activaciones repetidas
    const viaTeclado = e.detail === 0;
    setPressing(true);
    timerRef.current = setTimeout(() => {
      setPressing(false);
      onLaunch?.(viaTeclado);
    }, REDUCED ? PRESS_MS_REDUCED : AURORA_HOME_PRESS_MS);
  }

  return (
    <button
      type="button"
      onClick={activar}
      aria-busy={pressing || undefined}
      disabled={demo ? true : undefined}
      className={cn(
        'aurora-pill flex w-full cursor-pointer items-center px-8 text-left',
        pressing && 'is-pressing',
        demo && 'pointer-events-none',
        className,
      )}
      style={
        {
          '--au-m1': masa1,
          '--au-m2': masa2,
          '--au-luz': luz,
          '--au-int': intensidad,
          '--au-vel': `${velocidad}s`,
        } as React.CSSProperties
      }
    >
      <span className="aurora-pill__masas" aria-hidden="true" />
      <span className="aurora-pill__haz" aria-hidden="true" />
      <span className="relative z-10 text-[1.32rem] font-bold tracking-tight text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.45)]">
        {children}
      </span>
    </button>
  );
}
