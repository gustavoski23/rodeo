// @ts-nocheck
/* El mundo 3D del gate — va en su PROPIO chunk (React.lazy desde el gate):
   three + fiber + drei pesan, y solo esta pantalla los usa.

   FluidGlass (React Bits, verbatim) en modo lens. Los hijos de la escena son
   nuestros: el plano con la gradiente órbita (el lente y la losa necesitan que
   la gradiente exista DENTRO del canvas para refractarla), el wordmark, y la
   LOSA de vidrio de la card.

   ── Dónde vive cada cosa y por qué ────────────────────────────────────────
   El verbatim monta así: <Canvas> → <ScrollControls> → <Lens> (ModeWrapper) →
   <Scroll>{children}</Scroll>. ModeWrapper hace createPortal(children, scene)
   sobre una escena OFFSCREEN, la renderiza a un FBO y usa ese FBO para (a) un
   plano a pantalla completa en la escena principal y (b) el buffer del lente.
   O sea: todo lo que pasamos como children vive en la escena offscreen.

   Necesitamos estar en esa escena offscreen —así el lente que sigue al puntero
   refracta también nuestras cosas, que es el look correcto— pero la GRADIENTE
   y la LOSA no pueden estar dentro del <Scroll>:
     · la losa se desalinearía de la card DOM, que no se mueve;
     · la gradiente, al desplazarse, dejaría ver el clear color morado del
       verbatim (`gl.setClearColor(0x5227ff)`) por el borde.
   Solución sin tocar el verbatim y sin restar el offset del scroll a mano en
   useFrame: desde dentro del <Scroll> hacemos un createPortal a la RAÍZ de la
   escena offscreen (useThree().scene dentro del portal ES esa escena). Quedan
   como hermanas del grupo del Scroll: misma escena, refractadas por el lente,
   inmunes al scroll. El wordmark SÍ se queda dentro del <Scroll> — que algo
   se mueva al arrastrar es el gesto del componente original. */
import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { Text, useGLTF } from '@react-three/drei';

import FluidGlass from '@/components/reactbits/fluid-glass';
import { anguloOrbita, orbitaReducida, pintarOrbita } from '@/components/rodeo/gradiente-orbita';
import { LosaVidrio } from './losa-vidrio';

/* lens.glb viene comprimido con DRACO y drei busca el decoder en el CDN de
   Google — que el artifact demo (CSP) y cualquier red capada bloquean. El
   decoder vive en public/draco/ (copiado del propio paquete de three). */
useGLTF.setDecoderPath('/draco/');

function FondoOrbita() {
  const { viewport } = useThree();
  const malla = useRef();

  /* La textura se pinta UNA vez y el barrido se hace ROTANDO el plano: la
     gradiente es cónica alrededor del centro del canvas, así que girar la
     malla ES el barrido — misma receta (anguloOrbita), sin repintar millones
     de píxeles por frame y sin perder nitidez. */
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = 2048;
    pintarOrbita(c.getContext('2d'), 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);

  useFrame(({ clock }) => {
    if (!malla.current || orbitaReducida()) return; // reduced-motion: frame 0 estático, como el DOM
    /* Grados de la receta → radianes, en negativo: el `from Xdeg` del CSS gira
       en sentido del reloj y en three la Z positiva mira a la cámara. */
    malla.current.rotation.z = -(anguloOrbita(clock.getElapsedTime()) * Math.PI) / 180;
  });

  /* PARIDAD CON LA CAPA 0 (el DOM). La capa 0 es un div full-bleed con
     `conic-gradient(... at 50% 50%)`: la singularidad cae en el CENTRO de la
     pantalla y la textura se ve a tamaño natural. Aquí, exactamente igual:
       · centro en [0,0,0] — la ronda anterior lo movía a
         [-vw*0.16, -vh*0.2] y con eso la única estructura nítida que tiene
         esta gradiente (la singularidad, donde convergen los cuatro colores)
         quedaba FUERA de la card: no había nada que doblar. Ahora las cuatro
         fronteras de color CRUZAN la card, que es el criterio;
       · lado = la DIAGONAL del viewport (no 3×). Con 3× se veía una porción
         angular minúscula de una textura de 2048 estirada seis veces: un
         degradado lavado y borroso. Con el lado = diagonal, el círculo
         inscrito del cuadrado cubre la pantalla en CUALQUIER ángulo de giro y
         quedan ~2 texels por píxel: la cónica se ve nítida, como en el DOM.
     Al vivir fuera del <Scroll> ya no hace falta material de sobra para las
     3 páginas del ScrollControls. */
  const lado = Math.hypot(viewport.width, viewport.height) * 1.02;
  return (
    <mesh ref={malla} position={[0, 0, 0]} scale={[lado, lado, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

function Wordmark() {
  return (
    <Text
      position={[0, 0.72, 12]}
      fontSize={0.26}
      letterSpacing={-0.05}
      outlineWidth={0}
      outlineBlur="20%"
      outlineColor="#000"
      outlineOpacity={0.5}
      color="white"
      anchorX="center"
      anchorY="middle"
      font="/fonts/AlanSans-VariableFont_wght.ttf"
    >
      RODEO.
    </Text>
  );
}

/* El puente: se renderiza dentro del <Scroll> del verbatim pero manda a sus
   hijos a la raíz de la escena portal (ver la nota de arriba). */
function FueraDelScroll({ children }) {
  const escena = useThree((s) => s.scene); // dentro del portal = la escena offscreen del FluidGlass
  return createPortal(children, escena);
}

export default function FluidGate({ rect, onLosaLista }) {
  const medida = rect && rect.w >= 2 && rect.h >= 2 ? rect : null;
  return (
    <FluidGlass
      mode="lens"
      /* scale 0.14 (el del demo original es 0.15). La ronda anterior lo tenía
         a 0.25 y el lente era el elemento vítreo dominante de la pantalla:
         un cuenco enorme estampado sobre el formulario. Pequeño, y siguiendo
         al puntero como manda el componente, se lee como lupa. */
      lensProps={{ scale: 0.14, ior: 1.15, thickness: 5, chromaticAberration: 0.1, anisotropy: 0.01 }}
    >
      <FueraDelScroll>
        {/* El wordmark también fuera del <Scroll> (nota del auditor): con la
            losa y la gradiente clavadas, que el logo se fuera solo al
            arrastrar el canvas dejaba la pantalla coja. */}
        <Wordmark />
        <FondoOrbita />
        {medida && <LosaVidrio rect={medida} onListo={onLosaLista} />}
      </FueraDelScroll>
    </FluidGlass>
  );
}
