import { useEffect, useState } from 'react';

import { PencilLoader } from '@/components/rodeo/pencil-loader';

/* Espera larga del DROP — sustituye a los 3 skeletons grises + el contador
   inyectado del viejo (L4750-4768). El texto del contador es VERBATIM, incluido
   el salto a los 45 s: el modelo puede tardar minutos y tres cajas mudas se leen
   como "se colgó". El lápiz hace el resto: algo se mueve, luego algo pasa.

   REDISEÑO: dentro de la tarjeta del chat la espera deja de ser un bloque
   centrado suelto y pasa a una fila de superficie suave (los mismos tokens que
   la burbuja de espera del coach), alineada con las tarjetas del feed. */
export function EsperaDrop({ desde }: { desde: number }) {
  const [s, setS] = useState(() => Math.round((Date.now() - desde) / 1000));

  useEffect(() => {
    const tick = setInterval(() => setS(Math.round((Date.now() - desde) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [desde]);

  return (
    <div
      className="flex items-center gap-3 rounded-[18px] border px-4 py-3.5"
      role="status"
      aria-live="polite"
      style={{ borderColor: 'var(--borde-sutil)', background: 'var(--superficie-t)' }}
    >
      <PencilLoader size={3.4} label="Generando expresiones" />
      <p className="min-w-0 font-mono text-[0.75rem] leading-[1.4]" style={{ color: 'var(--text-muted)' }}>
        {s < 45 ? `generando… ${s}s` : `generando… ${s}s · el modelo está lento hoy, sigue trabajando`}
      </p>
    </div>
  );
}
