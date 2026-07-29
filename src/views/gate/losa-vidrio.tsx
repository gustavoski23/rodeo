/* LA LOSA — el vidrio de verdad de la card del gate.
   (Iteración sobre el archivo que ya existía: la ronda anterior era una
   RoundedBox de drei y salió VELO, no vidrio. Aquí está por qué y qué cambió.)

   ── Por qué la ronda anterior salió plana ────────────────────────────────
   1. GEOMETRÍA. RoundedBox = ExtrudeGeometry con bisel = radio de esquina, y
      su TAPA frontal es un ear-clipping de los puntos del contorno: PLANA y
      con cuatro triángulos gordos. Cara plana ⇒ normal (0,0,1) ⇒ el rayo
      refractado sigue el rayo de vista ⇒ el punto de salida se proyecta al
      MISMO píxel ⇒ desplazamiento CERO en todo el interior. Solo el aro del
      bisel (radio 56 px ≈ 0.12 u sobre una card de 0.83 u) doblaba algo, y
      encima el triangulado grueso de la tapa dejaba un filo diagonal visible.
   2. EL ENTORNO SE COMÍA EL INTERIOR. Con una cara plana y espejada
      (roughness 0), el reflejo IBL de un Lightformer de intensidad 7 y
      scale [8,1.4,1] es una BANDA HORIZONTAL nítida estampada sobre la card
      —la "raya clara bajo el título Login"— y su parte difusa un lavado
      crema uniforme encima de todo. El entorno tapaba la refracción.
   3. NO HABÍA QUÉ REFRACTAR. El fondo de la escena estaba desplazado y
      magnificado 3× (ver fluid-gate.tsx): detrás de la card no quedaba
      ninguna frontera de color. Refractar un degradado plano da un degradado
      plano.

   ── Lo que hace esta versión ─────────────────────────────────────────────
   · GEOMETRÍA PROPIA, un "cojín" de rounded-rect teselado en ANILLOS. Cada
     anillo es el rounded-rect metido hacia dentro una distancia t — que para
     un rounded-rect ES exactamente la curva de nivel t del campo de
     distancias al borde. Así la altura z se puede definir como perfil de t y
     la superficie sale continua, densa (28 anillos × 80 puntos) y con el
     contorno EXACTO de la card, que es lo que la alineación con el DOM pide.
     El perfil tiene dos partes:
       – BISEL: sube casi vertical en el canto y se aplana hacia dentro
         (1-(1-u)³). Ahí la normal se tumba hasta ~60° y el rayo se desvía
         muchísimo: con thickness 2, un canto a 45° desplaza la muestra ~0.24
         unidades de mundo ≈ un 30 % del ancho de la card. Eso es "las
         franjas se doblan y se magnifican cerca de los bordes".
       – DOMO: una lente suave que abomba la cara, y CENTRADA FUERA DEL
         CENTRO de la card (ver DOMO_CX/CY). Esto no es capricho: la
         gradiente es CÓNICA y una cónica es invariante a escala, así que
         cualquier óptica concéntrica con su singularidad no se ve. Con el
         domo descentrado la magnificación no es concéntrica y los cuatro
         cantos de color se ROMPEN al cruzar el vidrio.
   · BUFFER PROPIO (patrón FBO del verbatim). Sin `buffer`, drei renderiza
     `state.scene` por su cuenta, y aquí `state.scene` es la escena portal del
     FluidGlass — un render extra por frame que se pisa con el del lente y
     dejaba desgarros de tile en SwiftShader. Rendericemos nosotros: se oculta
     la losa un instante, se pinta la escena (gradiente + wordmark) en NUESTRO
     render target a resolución completa y se le pasa al material. Lo que se
     refracta es la gradiente NÍTIDA, y no hay recursión de FBOs.
   · ENTORNO SOLO PARA EL FILO. Dos tiras grandes y suaves, intensidad baja y
     envMapIntensity 0.5: lo justo para que el Fresnel del canto (donde
     F→1 y la transmisión se apaga sola) tenga algo que reflejar en vez de
     salir negro. Nada de bandas nítidas sobre la cara.

   Valores del material: los que fijó el dueño (transmission 1, roughness 0,
   ior 1.15, thickness 2, chromaticAberration 0.05, anisotropy 0.01). */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, MeshTransmissionMaterial, useFBO } from '@react-three/drei';

/** El rect de la card DOM, en píxeles CSS de la ventana (getBoundingClientRect). */
export type RectCard = { x: number; y: number; w: number; h: number };

/* Radio del borde, en píxeles CSS. Tiene que ser EL MISMO que el
   `border-radius` de .gate-card--losa en liquid-glass-macos.css: el filo
   interior del DOM cae encima del canto del vidrio y si no coinciden se ve
   doble borde. */
const RADIO_PX = 56;

/** z de la losa: entre la cámara (z=20) y la gradiente (z=0), y DELANTE del
    wordmark (z=12) para que el vidrio también lo refracte. */
export const Z_LOSA = 13;

/* ── El perfil del cojín, en unidades de mundo ─────────────────────────── */

/** Tramo recto del canto (la pared vertical del silueteado). Da el filo. */
const CANTO = 0.1;
/** Ancho de la banda del bisel, como fracción del lado corto de la card. */
const BANDA_FRAC = 0.24;
/** Altura del bisel, como fracción de su ancho (≈ la pendiente del canto). */
const BISEL_ALTO = 0.62;
/** Altura del domo central (la lente suave). */
const DOMO = 0.06;
/** Centro del domo, en fracciones del ancho/alto de la card desde su centro.
    Descentrado a propósito: ver la nota de cabecera (cónica invariante). */
const DOMO_CX = -0.2;
const DOMO_CY = 0.13;
/** Radio del bulto del domo, en fracciones del ancho/alto. Se pasa de la card
    y el factor del bisel lo recorta: así el domo no toca el contorno. */
const DOMO_RX = 0.78;
const DOMO_RY = 0.78;
/** La espalda repite el perfil, más plana: es una lente, no una cáscara. */
const ESPALDA = 0.35;

/* Teselado. 28 anillos concentran vértices cerca del canto (exponente 1.7) y
   80 puntos de perímetro dan esquinas limpias a 56 px de radio. */
const N_ANILLOS = 28;
const N_ARCO = 12;
const N_RECTA = 8;
const N_PERIM = 4 * (N_ARCO + N_RECTA);

/** Un anillo: el contorno del rounded-rect de semiejes a,b y radio r, en
    sentido antihorario y con EXACTAMENTE N_PERIM puntos, siempre en el mismo
    orden — así los anillos se cosen entre sí sin buscar correspondencias.
    Cuando a o b se agotan (el anillo más interior) los puntos colapsan: los
    triángulos degenerados no molestan y la superficie queda cerrada. */
function anillo(a0: number, b0: number, r0: number): number[] {
  const a = Math.max(a0, 0);
  const b = Math.max(b0, 0);
  const r = Math.max(0, Math.min(r0, a, b));
  const cx = a - r;
  const cy = b - r;
  const p: number[] = [];
  const arco = (ox: number, oy: number, d0: number, d1: number) => {
    for (let i = 0; i < N_ARCO; i++) {
      const t = d0 + ((d1 - d0) * i) / N_ARCO;
      p.push(ox + r * Math.cos(t), oy + r * Math.sin(t));
    }
  };
  const recta = (x0: number, y0: number, x1: number, y1: number) => {
    for (let i = 0; i < N_RECTA; i++) {
      const t = i / N_RECTA;
      p.push(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    }
  };
  arco(cx, cy, 0, Math.PI / 2);
  recta(cx, b, -cx, b);
  arco(-cx, cy, Math.PI / 2, Math.PI);
  recta(-a, cy, -a, -cy);
  arco(-cx, -cy, Math.PI, 1.5 * Math.PI);
  recta(-cx, -b, cx, -b);
  arco(cx, -cy, 1.5 * Math.PI, 2 * Math.PI);
  recta(a, -cy, a, cy);
  return p;
}

/** Altura de la cara sobre el plano medio, para un punto a distancia t del
    borde y en la posición (px,py) de la card. */
function altura(t: number, px: number, py: number, w: number, h: number, banda: number): number {
  const u = banda > 0 ? Math.min(1, t / banda) : 1;
  // Bisel: casi vertical en t=0 (normal tumbada ⇒ desvío máximo) y plano al
  // final de la banda. Es la banda que dobla y magnifica la gradiente.
  const bisel = BISEL_ALTO * banda * (1 - (1 - u) ** 3);
  // Domo: bulto elíptico descentrado, recortado por `u` para no tocar el
  // contorno (el silueteado tiene que seguir siendo el rect de la card).
  const dx = (px - DOMO_CX * w) / (DOMO_RX * w);
  const dy = (py - DOMO_CY * h) / (DOMO_RY * h);
  const d = Math.min(1, Math.hypot(dx, dy));
  const bulto = (1 - d) * (1 - d) * (3 - 2 * (1 - d)); // smoothstep invertido
  return bisel + DOMO * bulto * u;
}

/** El cojín completo: cara frontal + espalda + pared del canto, indexado
    (para que computeVertexNormals dé normales SUAVES: en una geometría no
    indexada saldrían facetadas y el bisel se vería a escalones). */
function construirCojin(w: number, h: number, radio: number): THREE.BufferGeometry {
  const tmax = Math.min(w, h) / 2;
  const banda = Math.min(Math.min(w, h) * BANDA_FRAC, tmax * 0.85);

  const ts: number[] = [];
  for (let i = 0; i <= N_ANILLOS; i++) ts.push(tmax * (i / N_ANILLOS) ** 1.7);

  const pos: number[] = [];
  const idx: number[] = [];
  const base = [0, (N_ANILLOS + 1) * N_PERIM];

  for (let cara = 0; cara < 2; cara++) {
    const signo = cara === 0 ? 1 : -1;
    const escala = cara === 0 ? 1 : ESPALDA;
    for (let i = 0; i <= N_ANILLOS; i++) {
      const t = ts[i];
      const p = anillo(w / 2 - t, h / 2 - t, radio - t);
      for (let j = 0; j < N_PERIM; j++) {
        const px = p[j * 2];
        const py = p[j * 2 + 1];
        pos.push(px, py, signo * (CANTO / 2 + altura(t, px, py, w, h, banda) * escala));
      }
    }
  }

  for (let cara = 0; cara < 2; cara++) {
    const b = base[cara];
    for (let i = 0; i < N_ANILLOS; i++) {
      for (let j = 0; j < N_PERIM; j++) {
        const k = (j + 1) % N_PERIM;
        const v00 = b + i * N_PERIM + j;
        const v01 = b + i * N_PERIM + k;
        const v11 = b + (i + 1) * N_PERIM + k;
        const v10 = b + (i + 1) * N_PERIM + j;
        // Los anillos van antihorarios y hacia dentro: este orden mira a +z.
        if (cara === 0) idx.push(v00, v01, v11, v00, v11, v10);
        else idx.push(v00, v11, v01, v00, v10, v11);
      }
    }
  }

  /* La pared del canto duplica el anillo 0 de las dos caras en vértices
     PROPIOS: si los compartiera, computeVertexNormals promediaría pared y
     bisel y el filo se redondearía — y el filo es justo donde el Fresnel
     enciende el rim de luz. */
  const muroF = pos.length / 3;
  for (let j = 0; j < N_PERIM; j++) {
    const s = base[0] * 3 + j * 3;
    pos.push(pos[s], pos[s + 1], pos[s + 2]);
  }
  const muroB = pos.length / 3;
  for (let j = 0; j < N_PERIM; j++) {
    const s = base[1] * 3 + j * 3;
    pos.push(pos[s], pos[s + 1], pos[s + 2]);
  }
  for (let j = 0; j < N_PERIM; j++) {
    const k = (j + 1) % N_PERIM;
    idx.push(muroF + j, muroB + j, muroF + k, muroF + k, muroB + j, muroB + k);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

type Medida = { x: number; y: number; w: number; h: number; radio: number };

export function LosaVidrio({ rect, onListo }: { rect: RectCard; onListo?: () => void }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const viewport = useThree((s) => s.viewport);
  const malla = useRef<THREE.Mesh>(null);
  const avisado = useRef(false);

  /* px → unidades de mundo en el plano z=Z_LOSA. getCurrentViewport da el
     ancho/alto del frustum a esa profundidad; el resto es regla de tres. */
  const m = useMemo<Medida>(() => {
    const v = viewport.getCurrentViewport(camera, [0, 0, Z_LOSA]);
    const k = v.width / Math.max(1, size.width); // unidades de mundo por píxel CSS
    const w = Math.max(0.02, rect.w * k);
    const h = Math.max(0.02, rect.h * k);
    return {
      x: (rect.x + rect.w / 2 - size.width / 2) * k,
      y: -(rect.y + rect.h / 2 - size.height / 2) * k,
      w,
      h,
      radio: Math.min(RADIO_PX * k, w / 2 - 1e-4, h / 2 - 1e-4),
    };
  }, [rect, size.width, size.height, camera, viewport]);

  const geo = useMemo(() => construirCojin(m.w, m.h, m.radio), [m.w, m.h, m.radio]);
  useEffect(() => () => geo.dispose(), [geo]);

  /* NUESTRO buffer de refracción (patrón FBO del componente verbatim).
     `state.scene` aquí es la escena portal del FluidGlass: la gradiente + el
     wordmark. Se oculta la losa para no fotografiarse a sí misma, se pinta a
     resolución completa y el material muestrea ESO — nítido y sin recursión.
     Sin tone mapping, igual que hace drei internamente: el plano que compone
     la escena offscreen ya aplica ACES una vez y no queremos dos. */
  const fbo = useFBO();
  useFrame((state) => {
    const obj = malla.current;
    if (!obj) return;
    const tono = state.gl.toneMapping;
    state.gl.toneMapping = THREE.NoToneMapping;
    obj.visible = false;
    state.gl.setRenderTarget(fbo);
    state.gl.render(state.scene, state.camera);
    state.gl.setRenderTarget(null);
    obj.visible = true;
    state.gl.toneMapping = tono;
  });

  // Aviso al gate de que el vidrio real ya está en pantalla: hasta entonces la
  // card DOM conserva su vidrio CSS y no se queda desnuda.
  useEffect(() => {
    if (avisado.current) return;
    avisado.current = true;
    onListo?.();
  }, [onListo]);

  return (
    <>
      {/* EL FILO DE LUZ — y NADA más. Esto no es decoración: es Fresnel. En el
          canto la normal queda casi perpendicular a la vista, F→1, la
          refracción se apaga sola (`(1.0 - F) * attenuatedColor`) y el vidrio
          refleja. Sin mapa de entorno ese canto sale NEGRO.

          Ojo con la dosis: es lo que hundió la ronda anterior. Un Lightformer
          intenso y estrecho sobre una cara espejada se ve como una BANDA
          nítida estampada dentro de la card, y su difusa lava el interior.
          Aquí: dos tiras GRANDES y suaves, intensidad baja y envMapIntensity
          0.5 — reflejo de barrido, no bandas. Se cocina una vez (frames={1}).

          Sin HDR de ningún CDN: el demo single-file no puede pedir nada fuera.
          Tampoco hay ambientLight: con transmission=1 el difuso se sustituye
          entero por la refracción y no pintaría nada. */}
      <Environment resolution={64} frames={1}>
        <color attach="background" args={['#191622']} />
        <Lightformer intensity={2.1} position={[-1, 3, 2]} scale={[12, 4, 1]} color="#fff3e4" />
        <Lightformer intensity={1.1} position={[1.5, -3, 2]} scale={[12, 4, 1]} color="#d8ecff" />
        <Lightformer intensity={0.9} position={[-5, 0, 1]} rotation-y={Math.PI / 4} scale={[4, 8, 1]} color="#ffe6d2" />
      </Environment>

      <mesh ref={malla} geometry={geo} position={[m.x, m.y, Z_LOSA]}>
        <MeshTransmissionMaterial
          buffer={fbo.texture}
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
          /* La fuerza del filo. Bajo a propósito: sube el rim sin lavar la
             cara (ver la nota del Environment). */
          envMapIntensity={0.5}
          /* Sin tone mapping: el plano que compone la escena offscreen ya
             aplica ACES una vez; si la losa lo aplicara otra vez su interior
             cambiaría de color respecto al fondo y se vería el parche. */
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
