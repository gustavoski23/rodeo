import { useEffect, useState } from 'react';

import { PencilLoader } from '@/components/rodeo/pencil-loader';

/* Espera larga del DROP — sustituye a los 3 skeletons grises + el contador
   inyectado del viejo (L4750-4768). El texto del contador es VERBATIM, incluido
   el salto a los 45 s: el modelo puede tardar minutos y tres cajas mudas se leen
   como "se colgó". El lápiz hace el resto: algo se mueve, luego algo pasa. */
export function EsperaDrop({ desde }: { desde: number }) {
  const [s, setS] = useState(() => Math.round((Date.now() - desde) / 1000));

  useEffect(() => {
    const tick = setInterval(() => setS(Math.round((Date.now() - desde) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [desde]);

  return (
    <div className="flex flex-col items-center gap-2 py-4" role="status" aria-live="polite">
      <PencilLoader size={4.4} label="Generando expresiones" />
      <p className="text-center font-mono text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>
        {s < 45 ? `generando… ${s}s` : `generando… ${s}s · el modelo está lento hoy, sigue trabajando`}
      </p>
    </div>
  );
}
