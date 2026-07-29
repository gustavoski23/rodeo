/* LA LOSA — el vidrio de verdad de la card del gate.

   Antes la card era un rectángulo semitransparente con blur: un velo, no
   vidrio. Un velo no dobla lo que hay detrás. Esto sí: una losa 3D con
   geometría de card redondeada y MeshTransmissionMaterial, o sea refracción
   real de la escena (la gradiente órbita + el wordmark) calculada por píxel.
   La sensación de GROSOR sale de tres cosas a la vez:

     · el bisel: la geometría es una caja redondeada con PROF de canto, así que
       cerca del borde la normal se tumba y el rayo refractado se desvía mucho
       → las franjas de la gradiente se doblan y se magnifican ahí (en el
       centro, con la cara plana de frente a la cámara, el rayo sale casi
       derecho y el fondo se ve limpio: por eso el texto del formulario
       encima sigue legible),
     · thickness=2 en unidades locales: el rayo viaja 2 unidades DENTRO del
       vidrio antes de salir, lo que da paralaje/aumento — es el grosor,
     · chromaticAberration: rojo y azul se refractan con ior distinto y en los
       bordes se separan (el fringe).

   El rim de luz es especular de verdad: roughness 0 + luces en la escena, el
   bisel curvo devuelve un filo brillante donde la luz se quiebra.

   Valores del material: los que fijó el dueño (transmission 1, roughness 0,
   ior 1.15, thickness 2, chromaticAberration 0.05, anisotropy 0.01). */
import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, RoundedBox } from '@react-three/drei';

/** El rect de la card DOM, en píxeles CSS de la ventana (getBoundingClientRect). */
export type RectCard = { x: number; y: number; w: number; h: number };

/* Radio del borde: el mismo `border-radius: 30px` de .glassContainer. Se pasa
   a mundo con la misma escala que el ancho, así el canto del vidrio cae
   exactamente sobre la esquina de la card DOM. */
const RADIO_PX = 30;

/** Canto de la losa en unidades de mundo. Es el grosor que se ve en el bisel. */
const PROF = 0.22;

/** z de la losa: entre la cámara (z=20) y la gradiente (z=0), y DELANTE del
    wordmark (z=12) para que el vidrio también lo refracte. */
export const Z_LOSA = 13;

type Medida = { x: number; y: number; w: number; h: number; radio: number };

export function LosaVidrio({ rect, onListo }: { rect: RectCard; onListo?: () => void }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const viewport = useThree((s) => s.viewport);
  const avisado = useRef(false);

  /* px → unidades de mundo en el plano z=Z_LOSA. getCurrentViewport da el
     ancho/alto del frustum a esa profundidad; el resto es regla de tres. Se
     recalcula solo cuando cambia el rect o el tamaño del canvas (resize). */
  const m = useMemo<Medida>(() => {
    const v = viewport.getCurrentViewport(camera, [0, 0, Z_LOSA]);
    const k = v.width / Math.max(1, size.width); // unidades de mundo por píxel CSS
    const w = Math.max(0.01, rect.w * k);
    const h = Math.max(0.01, rect.h * k);
    /* El radio no puede pasar de la mitad del lado más corto ni de la mitad
       del canto (RoundedBox extruye `depth - radius*2`: si se pasa, la
       geometría sale del revés). */
    const radio = Math.min(RADIO_PX * k, w / 2 - 1e-3, h / 2 - 1e-3, PROF / 2 - 1e-3);
    return {
      x: (rect.x + rect.w / 2 - size.width / 2) * k,
      y: -(rect.y + rect.h / 2 - size.height / 2) * k,
      w,
      h,
      radio,
    };
  }, [rect, size.width, size.height, camera, viewport]);

  // Aviso al gate de que el vidrio real ya está en pantalla: hasta entonces la
  // card DOM conserva su vidrio CSS y no se queda desnuda.
  useEffect(() => {
    if (avisado.current) return;
    avisado.current = true;
    onListo?.();
  }, [onListo]);

  return (
    <>
      {/* Luz para el especular del bisel: sin esto el vidrio refracta pero no
          BRILLA, y el filo de luz es medio criterio del look. La clave está
          arriba-derecha (como el highlight del vidrio macOS) y hay un relleno
          frío por abajo-izquierda para que el canto no se apague. */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[m.x + 1.2, m.y + 1.8, Z_LOSA + 3]} intensity={2.6} />
      <directionalLight position={[m.x - 1.6, m.y - 1.2, Z_LOSA + 2]} intensity={1.2} color="#a8e6ff" />

      <RoundedBox
        // Geometría de card: caja redondeada, bisel bien teselado (el bisel ES
        // la lente del borde, si sale facetado se ven escalones).
        args={[m.w, m.h, PROF]}
        radius={m.radio}
        smoothness={10}
        bevelSegments={6}
        /* creaseAngle alto = normales suaves entre cara y bisel: el doblez de
           la gradiente entra progresivo en vez de con un corte duro. */
        creaseAngle={1.0}
        position={[m.x, m.y, Z_LOSA]}
      >
        <MeshTransmissionMaterial
          /* Sin `buffer`: drei hace su propio muestreo de transmisión
             renderizando la escena en la que vive la losa (aquí, la escena
             portal del FluidGlass, o sea la gradiente + el wordmark). Pasarle
             el buffer del lente daría una recursión de FBOs. */
          transmission={1}
          roughness={0}
          ior={1.15}
          thickness={2}
          chromaticAberration={0.05}
          anisotropy={0.01}
          /* 6 muestras en vez de las 10 de drei: con roughness 0 no hay blur
             que promediar y son 3 refracciones por muestra (una por canal). */
          samples={6}
          color="#ffffff"
          toneMapped={false}
        />
      </RoundedBox>
    </>
  );
}
