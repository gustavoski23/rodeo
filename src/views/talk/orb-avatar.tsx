import { Suspense, lazy, useMemo } from 'react';

import type { AgentState } from '@/components/elevenlabs/orb';
import { cn } from '@/lib/utils';
import { useColorToken } from '@/views/a1-voice/use-grabadora';

/* El avatar del coach: la esfera animada de ElevenLabs (el Orb) dentro del
   círculo con ring del demo que dio Gus.

   DOS DECISIONES DE PESO, las dos declaradas:

   1. LAZY. El Orb arrastra three + @react-three/fiber + drei (~1 MB). Hoy three
      solo vive en el chunk del gate 3D, y CHARLA no puede ser quien lo meta en
      el bundle principal: se carga con React.lazy y hasta que llega —o si el
      dispositivo no tiene WebGL— se ve el círculo de gradiente aurora estático
      que ya está pintado debajo. El `import type { AgentState }` NO cuenta:
      verbatimModuleSyntax lo borra en compilación, no genera require.

   2. UN SOLO ORB VIVO. Cada Orb es un <canvas> WebGL, y los navegadores cortan
      a ~16 contextos: una charla larga con un canvas por burbuja se queda sin
      contextos y empieza a matar los de arriba. Así que el Orb de verdad solo
      lo monta la ÚLTIMA burbuja del coach (`vivo`); las anteriores y la burbuja
      de espera se quedan con el gradiente, que a 32 px es indistinguible.

   El gradiente sigue los colores del aurora que Gus haya elegido (los mismos
   tokens que pinta el Home), leídos con useColorToken porque three necesita
   colores resueltos, no `var(--aurora-1)`. */

const Orb = lazy(() => import('@/components/elevenlabs/orb').then((m) => ({ default: m.Orb })));

export function OrbAvatar({
  estado = null,
  vivo = false,
  className,
}: {
  /** Estado del agente: 'talking' mientras streamea/habla, null en reposo. */
  estado?: AgentState;
  /** Monta el Orb WebGL de verdad. Solo la última burbuja del coach. */
  vivo?: boolean;
  className?: string;
}) {
  const c1 = useColorToken('--aurora-1', '#B85D8A');
  const c2 = useColorToken('--aurora-2', '#D99C66');
  // Array nuevo en cada render = un setState de colores por frame en el Orb.
  const colores = useMemo<[string, string]>(() => [c1, c2], [c1, c2]);

  return (
    <div
      aria-hidden="true"
      className={cn('ring-border relative size-8 shrink-0 overflow-hidden rounded-full ring-1', className)}
    >
      {/* Fallback SIEMPRE pintado debajo: es lo que se ve mientras baja el
          chunk de three y lo que queda si el canvas no arranca. */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at 32% 26%, ${c1}, ${c2} 58%, var(--bg-deep) 130%)` }}
      />
      {vivo && (
        <Suspense fallback={null}>
          <Orb agentState={estado} colors={colores} className="absolute inset-0 h-full w-full" />
        </Suspense>
      )}
    </div>
  );
}
