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

   El rim de luz no se pinta: es Fresnel. En el canto la normal queda casi
   perpendicular a la vista, la transmisión se apaga y el vidrio refleja el
   entorno — un estudio de Lightformers generado en runtime (ver abajo).

   Valores del material: los que fijó el dueño (transmission 1, roughness 0,
   ior 1.15, thickness 2, chromaticAberration 0.05, anisotropy 0.01). */
import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Environment, Lightformer, MeshTransmissionMaterial, RoundedBox } from '@react-three/drei';

/** El rect de la card DOM, en píxeles CSS de la ventana (getBoundingClientRect). */
export type RectCard = { x: number; y: number; w: number; h: number };

/* Radio del borde, en píxeles CSS. Tiene que ser EL MISMO que el
   `border-radius` de .gate-card--losa en liquid-glass-macos.css: el filo
   interior del DOM cae encima del canto del vidrio y si no coinciden se ve
   doble borde. Es más generoso que los 30 px del vidrio CSS a propósito: el
   bisel ES la lente del borde, y cuanto más ancho, más ancha la banda donde la
   gradiente se dobla y se magnifica (o sea, más grosor aparente). */
const RADIO_PX = 56;

/** Canto de la losa en unidades de mundo. Es el grosor que se ve en el bisel.
    Tiene que dar de sí para el radio: RoundedBox extruye `depth - radius*2`. */
const PROF = 0.34;

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
      {/* EL FILO DE LUZ. Esto no es decoración: es Fresnel.

          En el canto, la normal queda casi perpendicular a la vista, F→1 y la
          refracción se apaga sola —`(1.0 - F) * attenuatedColor`—, así que ahí
          el vidrio REFLEJA en vez de transmitir. Sin mapa de entorno no hay
          nada que reflejar y el borde sale NEGRO: un contorno sucio en vez del
          filo brillante donde la luz se quiebra. (Con luces sueltas tampoco
          basta: con roughness 0 el lóbulo especular es finísimo, o se enciende
          la cara plana entera —un rectángulo blanco pegado dentro de la card— o
          no se ve nada.)

          El entorno se GENERA en runtime con Lightformers, sin HDR de ningún
          CDN (el demo single-file no puede pedir nada fuera). frames={1}: se
          cocina una vez y no cuesta nada por frame. Tiras cálidas arriba-izquierda
          —como el fePointLight(-200,-200) del vidrio CSS de macOS— y frías
          abajo-derecha, que es lo que hace que un canto se lea como cristal.

          Tampoco hay ambientLight: con transmission=1 el difuso se sustituye
          entero por la refracción (`mix(totalDiffuse, transmission, 1.0)`), así
          que una ambiental no pintaría nada. */}
      <Environment resolution={128} frames={1}>
        <color attach="background" args={['#0a0a12']} />
        {/* Tira principal: el barrido de luz del borde superior. */}
        <Lightformer intensity={7} position={[-1.5, 3.5, 2]} scale={[8, 1.4, 1]} color="#fff6ec" />
        {/* Laterales, uno cálido y otro frío: separan los dos cantos verticales. */}
        <Lightformer intensity={4} position={[-5, 0.5, 1.5]} rotation-y={Math.PI / 4} scale={[3, 5, 1]} color="#ffd7bd" />
        <Lightformer intensity={3.2} position={[5, -0.5, 1.5]} rotation-y={-Math.PI / 4} scale={[3, 5, 1]} color="#c6ecff" />
        {/* Suelo tenue: sin él el canto de abajo se hunde en negro. */}
        <Lightformer intensity={2.4} position={[0, -3.5, 1.5]} scale={[8, 1, 1]} color="#ffffff" />
      </Environment>

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
          /* La fuerza del filo: sube o baja el reflejo del entorno sin tocar la
             refracción, que son los valores fijados por el dueño. */
          envMapIntensity={1.35}
          /* Sin tone mapping, igual que el plano de la gradiente: si el vidrio
             pasara por ACES y el fondo no, el centro de la losa cambiaría de
             color respecto a lo que tiene detrás y se notaría el parche. */
          toneMapped={false}
        />
      </RoundedBox>
    </>
  );
}
