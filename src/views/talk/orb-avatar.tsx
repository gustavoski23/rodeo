import { Suspense, lazy, useMemo } from 'react';

import type { AgentState } from '@/components/elevenlabs/orb';
import { cn } from '@/lib/utils';
import { useColorToken } from '@/views/a1-voice/use-grabadora';

/* El avatar del coach: la esfera animada de ElevenLabs (el Orb) dentro del
   círculo con ring del demo que dio Gus.

   TRES DECISIONES, las tres declaradas:

   1. LAZY. El Orb arrastra three + @react-three/fiber + drei (~1 MB). Hoy three
      solo vive en el chunk del gate 3D, y CHARLA no puede ser quien lo meta en
      el bundle principal: se carga con React.lazy y hasta que llega —o si el
      dispositivo no tiene WebGL— se ve el disco pintado debajo. El
      `import type { AgentState }` NO cuenta: verbatimModuleSyntax lo borra en
      compilación, no genera require.

   2. UN SOLO ORB VIVO + FALLBACK CALCADO. Cada Orb es un <canvas> WebGL y los
      navegadores cortan a ~16 contextos: una charla larga con un canvas por
      burbuja se queda sin contextos y empieza a matar los de arriba. Así que el
      Orb de verdad solo lo monta la ÚLTIMA burbuja del coach (`vivo`). Lo que
      la auditoría r1 cazó es que el disco de debajo era un degradado rosa liso
      que NO se parecía en nada al Orb, y dos mensajes seguidos del coach
      lucían avatares distintos. Arreglado leyendo el shader (orb.tsx:396-495)
      en vez de inventando: ver `discoOrb` más abajo.

   3. EL CANVAS, MÁS GRANDE QUE SU HUECO. El Orb dibuja un circleGeometry de
      radio 3.5 con la cámara por defecto, o sea un círculo que cubre ~91 % del
      alto del canvas: a tamaño exacto quedaba un aro del disco de debajo
      asomando alrededor, que es la costura dura que se veía en la auditoría.
      El canvas va al 112 % y el rounded-full del padre recorta lo que sobra.

   Los colores siguen el aurora que Gus haya elegido (los mismos tokens que
   pinta el Home), leídos con useColorToken porque three necesita colores
   resueltos, no `var(--aurora-1)`. */

const Orb = lazy(() => import('@/components/elevenlabs/orb').then((m) => ({ default: m.Orb })));

/* ── Espejo data-theme → clase `dark` (BLOQUEANTE de la auditoría r1) ────────
   El Orb es verbatim y decide su polaridad (el uniform uInverted, orb.tsx:149 y
   :237) leyendo `document.documentElement.classList.contains('dark')`, con un
   MutationObserver sobre ['class']. RODEO tematiza con `data-theme` en <html>
   (lib/theme.ts:15-17) y NUNCA pone esa clase, así que el Orb se creía en tema
   claro SIEMPRE: en oscuro —el tema por defecto— salía con la polaridad al
   revés, un disco de fondo BLANCO sobre la Card negra en vez de una esfera
   integrada.

   Se arregla sin tocar el componente: reflejamos data-theme en la clase. No
   mueve ni un token porque en RODEO la variante `dark:` es
   `&:where(:root:not([data-theme='light']) *)` (tokens.css:17), es decir va por
   atributo y no por clase; y los dos AnimatedThemeToggler viven en modo
   controlado, así que su observer de ['class'] sale por la puerta de atrás
   (animated-theme-toggler.tsx:169) y tampoco se entera.

   Va en el cuerpo del módulo, no en un efecto: los uniforms del Orb se calculan
   en el primer render de la Scene, y los efectos de los hijos corren ANTES que
   los del padre. Aquí queda puesto en cuanto se importa el chunk de CHARLA,
   mucho antes de que baje el chunk del Orb. El observer solo escucha
   data-theme, así que escribir la clase no se retroalimenta. */
function espejoDark() {
  const raiz = document.documentElement;
  raiz.classList.toggle('dark', raiz.getAttribute('data-theme') !== 'light');
}

if (typeof document !== 'undefined') {
  espejoDark();
  new MutationObserver(espejoDark).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}

/* ── El disco de debajo, calcado del shader ─────────────────────────────────
   Qué pinta el Orb de verdad (fragmentShader, orb.tsx:396-495):

   · Fondo blanco (color.rgb = 1.0), y encima 7 óvalos en coordenadas polares
     centrados en 0, π/2, π, 3π/2 (los 7 centros de la línea 424 caen en esos 4
     ángulos, con repetidos), cada uno de ~±0.65 rad de ancho angular y con
     b ≈ 1.75 de alcance radial: llegan de sobra al borde. Cubren ~83 % de los
     ángulos, así que lo que queda del fondo son CUATRO RENDIJAS estrechas en
     las diagonales — el "aspa" que vio la auditoría, que es el fondo, no un
     brazo.
   · Dentro del óvalo el gris se achata a 0.45–0.55 (línea 317), y el colorRamp
     lo manda a mix(uColor1, uColor2, 0.36–0.66): los brazos son la mezcla de
     los dos colores del aurora, no colores puros.
   · uInverted decide si el FONDO es blanco (claro) o negro (oscuro) — es lo que
     arregla el espejo de arriba.

   Traducido a CSS: un repeating-conic-gradient de periodo 90° que alterna
   fondo → aurora → fondo (los 4 brazos y las 4 rendijas) sobre el color de
   fondo, más un aro exterior que vuelve al fondo, que es lo que hace el
   sharpRing/smoothRing del shader (líneas 462-480). --orb-base sale de una
   clase, no de JS, para que el toggle de tema no tenga que repintar nada. */
function discoOrb(c1: string, c2: string) {
  return [
    `radial-gradient(circle at 50% 50%, transparent 0 70%, color-mix(in oklab, var(--orb-base) 78%, transparent) 100%)`,
    `repeating-conic-gradient(from 24deg at 50% 50%, var(--orb-base) 0deg, ${c1} 30deg, ${c2} 62deg, var(--orb-base) 90deg)`,
  ].join(', ');
}

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
  const fondo = useMemo(() => discoOrb(c1, c2), [c1, c2]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        'ring-border relative size-8 shrink-0 overflow-hidden rounded-full ring-1',
        // El fondo del disco: blanco en claro, negro en oscuro — lo mismo que
        // hace uInverted en el shader.
        '[--orb-base:#ffffff] dark:[--orb-base:#000000]',
        className,
      )}
    >
      {/* Pintado SIEMPRE debajo: es lo que se ve mientras baja el chunk de
          three, lo que queda si el canvas no arranca y el avatar de las
          burbujas del coach que ya no son la última. */}
      <div className="absolute inset-0" style={{ background: fondo, backgroundColor: 'var(--orb-base)' }} />
      {vivo && (
        <Suspense fallback={null}>
          <Orb
            agentState={estado}
            colors={colores}
            className="absolute top-[-6%] left-[-6%] h-[112%] w-[112%]"
          />
        </Suspense>
      )}
    </div>
  );
}
