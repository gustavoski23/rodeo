import { Suspense, lazy, useMemo, useSyncExternalStore } from 'react';

import type { AgentState } from '@/components/elevenlabs/orb';
import { MODO_LIGERO } from '@/lib/device';
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

   2. UN SOLO ORB VIVO Y UN DISCO CALCADO DEBAJO. Cada Orb es un <canvas> WebGL
      y los navegadores cortan a ~16 contextos: una charla larga con un canvas
      por burbuja se queda sin contextos y empieza a matar los de arriba. Así
      que el Orb de verdad solo lo monta la ÚLTIMA burbuja del coach (`vivo`).
      Lo que la auditoría r1 cazó es que el disco de debajo era un degradado
      rosa liso que no se parecía en NADA al Orb, y dos mensajes seguidos del
      coach lucían avatares distintos. Se ha rehecho leyendo el shader
      (orb.tsx:396-495) y midiendo el resultado píxel a píxel: ver `discoOrb`.

   3. EL CANVAS, MÁS GRANDE QUE SU HUECO. El Orb dibuja un circleGeometry de
      radio 3.5 con la cámara por defecto, o sea un círculo que cubre ~91 % del
      alto del canvas: a tamaño exacto quedaba un aro del disco de debajo
      asomando alrededor, la costura dura que se veía en la auditoría. El canvas
      va al 112 % y el rounded-full del padre recorta lo que sobra.

   Los colores siguen el aurora que Gus haya elegido (los mismos tokens que
   pinta el Home), leídos con useColorToken porque three necesita colores
   resueltos, no `var(--aurora-1)`. */

const Orb = lazy(() => import('@/components/elevenlabs/orb').then((m) => ({ default: m.Orb })));

/* ── El tema, en un solo sitio ───────────────────────────────────────────────
   Dos cosas cuelgan de aquí, y las dos las alimenta el MISMO MutationObserver:

   a) EL ESPEJO data-theme → clase `dark`. BLOQUEANTE de la auditoría r1. El Orb
      es verbatim y decide su polaridad (el uniform uInverted, orb.tsx:149 y
      :237) leyendo `document.documentElement.classList.contains('dark')`, con
      su propio observer sobre ['class']. Hablarte tematiza con `data-theme`
      (lib/theme.ts:15-17) y NUNCA pone esa clase, así que el Orb se creía en
      tema claro SIEMPRE: en oscuro —el tema por defecto— salía con la polaridad
      al revés, un disco de fondo BLANCO sobre la Card negra en lugar de una
      esfera integrada. Se arregla sin tocar el componente: reflejamos el
      atributo en la clase. No mueve ni un token, porque en Hablarte la variante
      `dark:` es `&:where(:root:not([data-theme='light']) *)` (tokens.css:17),
      va por atributo y no por clase; y los dos AnimatedThemeToggler viven en
      modo controlado, así que su observer de ['class'] sale por la puerta de
      atrás (animated-theme-toggler.tsx:169) y tampoco se entera.

   b) EL TEMA COMO ESTADO, para pintar el disco de debajo con la paleta del tema
      (ver `discoOrb`).

   Va en el cuerpo del módulo y no en un efecto: los uniforms del Orb se
   calculan en el primer render de la Scene, y los efectos de los hijos corren
   ANTES que los del padre. Aquí la clase queda puesta en cuanto se importa el
   chunk de CHARLA, mucho antes de que baje el chunk del Orb. Y es UN observer
   para todos los avatares, no uno por burbuja. El observer solo escucha
   data-theme, así que escribir la clase no se retroalimenta. */
const oyentes = new Set<() => void>();
let oscuroActual = true;

function leerTema() {
  oscuroActual = document.documentElement.getAttribute('data-theme') !== 'light';
  document.documentElement.classList.toggle('dark', oscuroActual);
  for (const f of oyentes) f();
}

if (typeof document !== 'undefined') {
  leerTema();
  new MutationObserver(leerTema).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}

function useOscuro(): boolean {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => oscuroActual,
    () => true,
  );
}

/** El color del token en espacio LINEAL, que es lo que acaba pintando three. */
function lineal(color: string): string {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const g = cv.getContext('2d');
  if (!g) return color;
  g.fillStyle = color;
  g.fillRect(0, 0, 1, 1);
  const [r, v, a] = g.getImageData(0, 0, 1, 1).data;
  // La misma cuenta que THREE.SRGBToLinear.
  const f = (n: number) => {
    const s = n / 255;
    return Math.round(255 * (s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)));
  };
  return `rgb(${f(r)} ${f(v)} ${f(a)})`;
}

/* ── El disco de debajo, calcado del shader ─────────────────────────────────
   Qué pinta el Orb de verdad (fragmentShader, orb.tsx:396-495):

   · Fondo blanco (color.rgb = 1.0), y encima 7 óvalos en coordenadas polares
     centrados en 0, π/2, π y 3π/2 (los 7 centros de la línea 424 caen en esos 4
     ángulos, con repetidos), cada uno de ~±0.65 rad de ancho y con b ≈ 1.75 de
     alcance radial: llegan de sobra al borde. Cubren ~83 % de los ángulos, así
     que lo que queda del fondo son unas RENDIJAS estrechas — el "aspa" que vio
     la auditoría es el FONDO, no un brazo. El vaivén de la línea 429 mueve los
     centros, así que las rendijas nunca son las cuatro iguales.
   · uInverted decide si el fondo es blanco (claro) o negro (oscuro) — es lo que
     arregla el espejo de la clase `dark` de arriba.
   · El colorRamp (línea 325) tiene CUATRO tramos: negro → uColor1 → uColor2 →
     blanco. En oscuro la luminancia se queda en el tramo bajo (medido: nunca
     pasa de 86/255), o sea NEGRO → uColor1; en claro se queda en el alto
     (nunca baja de 84), o sea uColor2 → BLANCO. Por eso la paleta del disco
     cambia con el tema y no solo el color de fondo.
   · Y el detalle que no se ve leyendo el .tsx: three pasa los colores a espacio
     LINEAL al construir THREE.Color (ColorManagement va activo por defecto) y
     este shader los escribe tal cual, sin volver a sRGB. El Orb NO pinta el
     token: pinta su versión linealizada, más oscura y saturada. Con los tokens
     de fábrica (#B85D8A / #D99C66) el brazo mide rgb(138,44,56), que es
     exactamente mix(lineal(#B85D8A) 70 %, lineal(#D99C66) 30 %). Sin esa
     cuenta el disco sale claro y lavado, que es lo que cantaba en r1.

   Perfil MEDIDO del Orb vivo a x7 (arnés chat-r2-perfil2.mjs) y a lo que se
   ajusta el disco:
     · oscuro: media [94,32,36], brazos ~[138,44,56], rendijas a NEGRO, plano de
       r=0.08 a r=0.78 y en r=0.94 un 20 % más bajo.
     · claro: media [179,104,84], brazos ~[158,65,45], rendijas a BLANCO.

   Tres capas (la primera es la de arriba): el aro del borde (lo que hacen
   sharpRing/smoothRing, líneas 462-480), el cubo del centro —un conic converge
   en punta y ahí salía un pinchazo claro que el Orb no tiene— y los brazos, un
   conic de UNA vuelta con las cuatro rendijas desiguales: con
   repeating-conic-gradient y las cuatro clavadas cada 90° el disco cantaba a
   molinillo. */
function discoOrb(t1: string, t2: string, oscuro: boolean) {
  const c1 = lineal(t1);
  const c2 = lineal(t2);
  const base = oscuro ? '#000000' : '#ffffff';
  /* El tramo del ramp en el que vive cada tema, ajustado a la luminancia MEDIDA
     del Orb (0-86 en oscuro, 82-255 en claro): en oscuro el brazo va de uColor1
     a medio camino de uColor2 y NO llega a uColor2 entero (su luminancia, 107,
     se pasa del techo medido); en claro arranca en ese mismo punto medio y sube
     hacia uColor2 y el blanco. */
  const medias = `color-mix(in srgb, ${c2} 55%, ${c1})`;
  const p = oscuro ? c1 : medias;
  const s = oscuro ? medias : c2;
  const medio = `color-mix(in srgb, ${p} 70%, ${s})`;
  /* Las rendijas, estrechas y de anchos distintos: los óvalos del shader cubren
     ~83 % de los ángulos. Cada brazo sube rápido, barre de p a s y cae rápido —
     con rampas largas el disco se llenaba de medios tonos lavados que el Orb no
     tiene (en claro se iba 17 puntos de luminancia por encima del medido). */
  const brazos = [
    `${base} 0deg`, `${p} 10deg`, `${s} 60deg`, `${s} 84deg`, `${base} 96deg`,
    `${base} 104deg`, `${p} 114deg`, `${s} 152deg`, `${s} 178deg`, `${base} 190deg`,
    `${base} 197deg`, `${s} 208deg`, `${p} 250deg`, `${p} 276deg`, `${base} 288deg`,
    `${base} 304deg`, `${p} 316deg`, `${s} 344deg`, `${s} 352deg`, `${base} 360deg`,
  ].join(', ');
  return {
    fondo: [
      `radial-gradient(circle at 50% 50%, transparent 0 84%, color-mix(in srgb, ${base} 34%, transparent) 100%)`,
      `radial-gradient(circle at 50% 50%, ${medio} 0, color-mix(in srgb, ${medio} 60%, transparent) 10%, transparent 24%)`,
      `conic-gradient(from 18deg at 50% 50%, ${brazos})`,
    ].join(', '),
    base,
  };
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
  const oscuro = useOscuro();
  // Array nuevo en cada render = un setState de colores por frame en el Orb.
  const colores = useMemo<[string, string]>(() => [c1, c2], [c1, c2]);
  const disco = useMemo(() => discoOrb(c1, c2, oscuro), [c1, c2, oscuro]);

  return (
    <div
      aria-hidden="true"
      className={cn('ring-border relative size-8 shrink-0 overflow-hidden rounded-full ring-1', className)}
    >
      {/* Pintado SIEMPRE debajo: es lo que se ve mientras baja el chunk de
          three, lo que queda si el canvas no arranca y el avatar de las
          burbujas del coach que ya no son la última. */}
      {/* El medio píxel de blur redondea los cantos del conic: sin él las
          rendijas son triángulos de bordes rectos que convergen en un punto
          exacto, y ese es el último rasgo que delataba al disco frente al Orb,
          cuyos óvalos tienen `softness` (orb.tsx:452). No mueve la media. */}
      <div
        className="absolute inset-0"
        style={{ background: disco.fondo, backgroundColor: disco.base, filter: 'blur(0.5px)' }}
      />
      {vivo && !MODO_LIGERO && (
        <Suspense fallback={null}>
          <Orb agentState={estado} colors={colores} className="absolute top-[-6%] left-[-6%] h-[112%] w-[112%]" />
        </Suspense>
      )}
    </div>
  );
}
