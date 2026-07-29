import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { REDUCED } from '@/lib/theme';

import './aurora.css';

/* AuroraPillButton — estructura y tiempos 1:1 de la referencia aprobada
   (codex/home-aurora-production-review, index.html:1980-1989 y 3946-3986).
   No hay un segundo AuroraPillButton en la app.

   Activación (temporización LOCAL, no finge red):
   - press: is-pressing + aria-busy + bloqueo durante AURORA_HOME_PRESS_MS (950ms;
     80ms con reduced motion);
   - luego onLaunch(viaTeclado). Enter/Espacio activan vía keydown; el clic por
     teclado (detail===0) también cuenta como teclado para llevar el foco a
     "Volver a los escenarios".

   demo=true (preview del personalizador): disabled, sin press ni launch, pero
   las masas siguen animando para ver la paleta en vivo. */

export const AURORA_HOME_PRESS_MS = REDUCED ? 80 : 950;

const waitForUi = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function AuroraPillButton({
  children,
  onLaunch,
  className,
  demo = false,
}: {
  children: React.ReactNode;
  onLaunch?: (viaTeclado: boolean) => void | Promise<void>;
  className?: string;
  demo?: boolean;
}) {
  const [pressing, setPressing] = useState(false);
  const pendingRef = useRef(false);
  const vivoRef = useRef(true);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
    };
  }, []);

  async function activar(viaTeclado: boolean) {
    if (demo || pendingRef.current) return;
    pendingRef.current = true;
    setPressing(true);
    try {
      await waitForUi(AURORA_HOME_PRESS_MS);
      if (!vivoRef.current) return;
      await onLaunch?.(viaTeclado);
    } finally {
      if (vivoRef.current) setPressing(false);
      pendingRef.current = false;
    }
  }

  return (
    <button
      type="button"
      aria-label={typeof children === 'string' ? children : undefined}
      aria-busy={pressing || undefined}
      disabled={demo || pressing || undefined}
      onClick={(e) => void activar(e.detail === 0)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        void activar(true);
      }}
      className={cn('aurora-pill', pressing && 'is-pressing', className)}
    >
      <span className="aurora-pill__field" aria-hidden="true">
        <span className="aurora-pill__inner">
          <span className="aurora-pill__mass aurora-pill__mass--one" />
          <span className="aurora-pill__mass aurora-pill__mass--two" />
          <span className="aurora-pill__mass aurora-pill__mass--three" />
        </span>
      </span>
      <span className="aurora-pill__label">{children}</span>
    </button>
  );
}
