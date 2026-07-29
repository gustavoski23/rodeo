// @ts-nocheck
/* El mundo 3D del gate — va en su PROPIO chunk (React.lazy desde el gate):
   three + fiber + drei pesan, y solo esta pantalla los usa.

   FluidGlass (React Bits, verbatim) en modo lens con los props del usage
   example de Gus. Los hijos de la escena son nuestros: el plano con la
   gradiente órbita (el lente necesita que la gradiente exista DENTRO del
   canvas para refractarla) y el wordmark, con el mismo estilo del Typography
   original pero diciendo RODEO. */
import * as THREE from 'three';
import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, useGLTF } from '@react-three/drei';

import FluidGlass from '@/components/reactbits/fluid-glass';
import { orbitaReducida, pintarOrbita } from '@/components/rodeo/gradiente-orbita';

/* lens.glb viene comprimido con DRACO y drei busca el decoder en el CDN de
   Google — que el artifact demo (CSP) y cualquier red capada bloquean. El
   decoder vive en public/draco/ (copiado del propio paquete de three). */
useGLTF.setDecoderPath('/draco/');

function FondoOrbita() {
  const { viewport } = useThree();

  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    pintarOrbita(c.getContext('2d'), 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  useFrame(({ clock }) => {
    if (orbitaReducida()) return; // frame 0 estático, como el DOM
    pintarOrbita(tex.image.getContext('2d'), clock.getElapsedTime());
    tex.needsUpdate = true;
  });

  /* Alto ×4: la escena vive dentro de un <Scroll> de 3 páginas (parte del
     componente verbatim) — si el usuario arrastra el fondo, sigue habiendo
     gradiente arriba y abajo en vez de un borde morado. */
  return (
    <mesh position={[0, -viewport.height * 1.4, 0]} scale={[viewport.width * 1.3, viewport.height * 4, 1]}>
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

export default function FluidGate() {
  return (
    <FluidGlass
      mode="lens"
      lensProps={{ scale: 0.25, ior: 1.15, thickness: 5, chromaticAberration: 0.1, anisotropy: 0.01 }}
    >
      <FondoOrbita />
      <Wordmark />
    </FluidGlass>
  );
}
