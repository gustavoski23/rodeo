// @ts-nocheck
/* El mundo 3D del gate — va en su PROPIO chunk (React.lazy desde el gate):
   three + fiber + drei pesan, y solo esta pantalla los usa.

   FluidGlass (React Bits, verbatim) en modo lens con los props del usage
   example de Gus. Los hijos de la escena son nuestros: el plano con la
   gradiente órbita (el lente necesita que la gradiente exista DENTRO del
   canvas para refractarla), el wordmark, y la LOSA de vidrio de la card.

   ── Dónde vive la losa y por qué ──────────────────────────────────────────
   El verbatim monta así: <Canvas> → <ScrollControls> → <Lens> (ModeWrapper) →
   <Scroll>{children}</Scroll>. ModeWrapper hace createPortal(children, scene)
   sobre una escena OFFSCREEN, la renderiza a un FBO y usa ese FBO para (a) un
   plano a pantalla completa en la escena principal y (b) el buffer del lente.
   O sea: todo lo que pasamos como children vive en la escena offscreen.

   La losa tiene que estar en esa escena offscreen — así el lente que sigue al
   puntero también la refracta (vidrio sobre vidrio, que es el look correcto) —
   pero NO puede estar dentro del <Scroll>, porque el <Scroll> desplaza a sus
   hijos si el usuario arrastra el canvas y la losa quedaría desalineada de la
   card DOM, que no se mueve. Solución sin tocar el verbatim y sin restar
   offsets a mano en useFrame: desde dentro del <Scroll> hacemos un
   createPortal a la RAÍZ de la escena offscreen (useThree().scene dentro del
   portal ES esa escena). La losa termina siendo hermana del grupo del Scroll:
   misma escena, refractada por el lente, e inmune al scroll. */
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
     de píxeles por frame y sin perder nitidez. Antes se repintaba un canvas de
     512 estirado a 4× de alto y el resultado en pantalla era un degradado
     lavado: sin franjas no hay nada que el vidrio pueda DOBLAR, y doblar el
     fondo es justo el criterio de la losa. */
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

  /* Cuadrado grande: su círculo inscrito cubre la pantalla en cualquier ángulo
     de giro y sobra material para el <Scroll> de 3 páginas.

     El centro de la cónica —donde convergen los cuatro colores— se desplaza un
     poco abajo-izquierda. Ni centrado ni fuera: centrado justo detrás de la
     card, el vidrio ampliaba la singularidad y dejaba una mancha pastel plana
     en medio del formulario; fuera de la pantalla, la card quedaba sobre una
     sola franja de color plana y no había NADA que doblar. Desplazado, las
     cuatro fronteras de color cruzan la card en diagonal — que es exactamente
     la estructura que la refracción del canto tiene que quebrar. */
  const lado = Math.max(viewport.width, viewport.height) * 3;
  return (
    <mesh
      ref={malla}
      position={[-viewport.width * 0.16, -viewport.height * 0.2, 0]}
      scale={[lado, lado, 1]}
    >
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

/* El puente: se renderiza dentro del <Scroll> del verbatim pero manda la losa
   a la raíz de la escena portal (ver la nota de arriba). */
function LosaFueraDelScroll({ rect, onListo }) {
  const escena = useThree((s) => s.scene); // dentro del portal = la escena offscreen del FluidGlass
  if (!rect || rect.w < 2 || rect.h < 2) return null;
  return createPortal(<LosaVidrio rect={rect} onListo={onListo} />, escena);
}

export default function FluidGate({ rect, onLosaLista }) {
  return (
    <FluidGlass
      mode="lens"
      lensProps={{ scale: 0.25, ior: 1.15, thickness: 5, chromaticAberration: 0.1, anisotropy: 0.01 }}
    >
      <FondoOrbita />
      <Wordmark />
      <LosaFueraDelScroll rect={rect} onListo={onLosaLista} />
    </FluidGlass>
  );
}
