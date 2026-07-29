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
   · GEOMETRÍA PROPIA, un "cojín": el contorno rounded-rect EXACTO de la card
     (eso es lo que la alineación con el DOM pide) teselado en 46 anillos ×
     152 puntos, y una altura z que es función ANALÍTICA del campo de
     distancias al borde (distInterior) — con normales por diferencias finitas
     de ese mismo perfil, no de los triángulos. El perfil tiene dos partes:
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
   · ENTORNO SOLO PARA EL FILO. Tiras grandes y suaves, intensidad baja y
     envMapIntensity 1.1: en el canto F→1 y se enciende el filo entero,
     mientras la cara, a incidencia normal, solo refleja un ~4 % y no se lava.
     Es lo justo para que el Fresnel del canto (donde
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
const BANDA_FRAC = 0.26;
/** Altura del bisel, como fracción de su ancho (≈ la pendiente del canto). */
const BISEL_ALTO = 0.66;
/** Altura del domo central (la lente suave). */
const DOMO = 0.095;
/** Centro del domo, en fracciones del ancho/alto de la card desde su centro.
    Descentrado a propósito: ver la nota de cabecera (cónica invariante). */
const DOMO_CX = -0.26;
const DOMO_CY = 0.16;
/** Radio del bulto del domo, en fracciones del ancho/alto. Se pasa de la card
    y el factor del bisel lo recorta: así el domo no toca el contorno. */
const DOMO_RX = 0.74;
const DOMO_RY = 0.74;
/** La espalda repite el perfil, más plana: es una lente, no una cáscara. */
const ESPALDA = 0.35;
/** Redondeo del eje medio del campo de distancias, en fracciones del lado
    corto (ver smax). Sin esto salen cortes duros en las diagonales. */
const SUAVE = 0.32;

/* Teselado. El exponente 1.6 concentra anillos cerca del canto (donde el
   perfil cambia rápido) sin dejar el centro grueso, y 152 puntos de perímetro
   dan ~2 px por segmento en un lado de 350 px: con menos, la refracción
   delata las facetas del triangulado. */
const N_ANILLOS = 46;
const N_ARCO = 16;
const N_RECTA = 22;
const N_PERIM = 4 * (N_ARCO + N_RECTA);

/** El CONTORNO de la card: el rounded-rect de semiejes a,b y radio r, en
    sentido antihorario y con EXACTAMENTE N_PERIM puntos. Es la silueta que
    tiene que coincidir con el `border-radius` del DOM. */
function contorno(a: number, b: number, r0: number): number[] {
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

/** Máximo SUAVE. El campo de distancias de un rectángulo tiene aristas en su
    eje medio (las diagonales de las esquinas y el segmento central): ahí el
    gradiente salta y una superficie construida sobre él sale con PLIEGUES
    duros, que en el vidrio se leen como cortes. Redondearlos cuesta esto. */
function smax(a: number, b: number, k: number): number {
  return 0.5 * (a + b + Math.sqrt((a - b) ** 2 + k * k));
}

/** Distancia de (px,py) al borde de la card, positiva hacia dentro: el campo
    de distancias analítico del rounded-rect (sdRoundBox con el signo dado la
    vuelta y el máximo interior suavizado). Es la coordenada natural del perfil
    del vidrio, y al ser analítica NO depende del teselado: por eso el perfil y
    las normales salen limpios hasta en el centro y en las esquinas.
    Ojo: en el CONTORNO sigue dando exactamente 0 (ahí manda el término
    `fuera`, no el máximo), así que la silueta no se mueve. */
function distInterior(px: number, py: number, w: number, h: number, radio: number, k: number): number {
  const qx = Math.abs(px) - (w / 2 - radio);
  const qy = Math.abs(py) - (h / 2 - radio);
  const fuera = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return -(fuera + Math.min(smax(qx, qy, k), 0) - radio);
}

/** Altura de la cara sobre el plano medio para el punto (px,py). */
function altura(px: number, py: number, w: number, h: number, radio: number, banda: number, k: number): number {
  const d = Math.max(0, distInterior(px, py, w, h, radio, k));
  const u = banda > 0 ? Math.min(1, d / banda) : 1;
  /* La puerta del perfil: 1 en el borde de la banda y 0 en el canto, con
     derivada NULA al llegar a 1 — así no queda un anillo de doblez a
     distancia `banda`. En u=0 la derivada es grande a propósito: el canto casi
     vertical es lo que tumba la normal y desvía el rayo. */
  const puerta = 1 - (1 - u) ** 3;
  const bisel = BISEL_ALTO * banda * puerta;
  /* Domo: bulto elíptico descentrado (en e² para no meter el pico del hypot),
     multiplicado por la puerta para que no toque el contorno — la silueta
     tiene que seguir siendo el rect exacto de la card. */
  const ex = (px - DOMO_CX * w) / (DOMO_RX * w);
  const ey = (py - DOMO_CY * h) / (DOMO_RY * h);
  const s = 1 - Math.min(1, ex * ex + ey * ey);
  return bisel + DOMO * s * s * puerta;
}

/* El cojín completo: cara frontal + espalda + pared del canto.

   ── Parametrización ──────────────────────────────────────────────────────
   Cada anillo es el CONTORNO encogido radialmente hacia el centro por un
   factor (1-s). Encogimiento radial y no "insetado" (que sería la curva de
   nivel exacta del campo de distancias) por una razón práctica: al insetar,
   el anillo interior de una card no cuadrada DEGENERA en un segmento y ahí
   los triángulos se vuelven agujas — con normales calculadas del teselado
   eso salía como un pliegue duro vertical en medio del vidrio y como
   "pétalos" en las esquinas (se veía clarísimo en la prueba de la regla).
   Con el encogimiento radial todos los anillos son homotecias del contorno:
   nada degenera salvo el vértice central.

   ── Normales ─────────────────────────────────────────────────────────────
   Por DIFERENCIAS FINITAS del propio perfil, no con computeVertexNormals: la
   altura es una función analítica de (x,y), así que la normal exacta es
   (-∂z/∂x, -∂z/∂y, 1). Así la refracción no delata el teselado. */
function construirCojin(w: number, h: number, radio: number): THREE.BufferGeometry {
  const banda = Math.min(Math.min(w, h) * BANDA_FRAC, (Math.min(w, h) / 2) * 0.85);
  const eps = Math.min(w, h) * 0.0025;
  const k = Math.min(w, h) * SUAVE; // radio de redondeo del eje medio
  const alt = (px: number, py: number) => altura(px, py, w, h, radio, banda, k);
  const zCara = (px: number, py: number, frente: boolean) =>
    frente ? CANTO / 2 + alt(px, py) : -(CANTO / 2 + ESPALDA * alt(px, py));

  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];

  /** Un vértice de superficie con su normal analítica. */
  const vertice = (px: number, py: number, frente: boolean) => {
    const z = zCara(px, py, frente);
    const gx = (zCara(px + eps, py, frente) - zCara(px - eps, py, frente)) / (2 * eps);
    const gy = (zCara(px, py + eps, frente) - zCara(px, py - eps, frente)) / (2 * eps);
    // z = f(x,y) ⇒ normal ∝ (-fx, -fy, 1) hacia +z; la espalda mira a -z.
    const sg = frente ? 1 : -1;
    const nx = -gx * sg;
    const ny = -gy * sg;
    const nz = sg;
    const l = Math.hypot(nx, ny, nz) || 1;
    pos.push(px, py, z);
    nor.push(nx / l, ny / l, nz / l);
  };

  const borde = contorno(w / 2, h / 2, radio);
  /* Los anillos se apiñan cerca del canto (exponente 1.6), que es donde el
     perfil cambia rápido. El último para en 0.985 y un vértice central cierra
     la tapa: así ni el centro degenera en agujas. */
  const ss: number[] = [];
  for (let i = 0; i <= N_ANILLOS; i++) ss.push(0.985 * (i / N_ANILLOS) ** 1.6);

  const base: number[] = [];
  const centro: number[] = [];
  for (let cara = 0; cara < 2; cara++) {
    const frente = cara === 0;
    base.push(pos.length / 3);
    for (let i = 0; i <= N_ANILLOS; i++) {
      const k = 1 - ss[i];
      for (let j = 0; j < N_PERIM; j++) vertice(borde[j * 2] * k, borde[j * 2 + 1] * k, frente);
    }
    centro.push(pos.length / 3);
    vertice(0, 0, frente);
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
        // Contorno antihorario + anillos hacia dentro: este orden mira a +z.
        if (cara === 0) idx.push(v00, v01, v11, v00, v11, v10);
        else idx.push(v00, v11, v01, v00, v10, v11);
      }
    }
    // Abanico del último anillo al vértice central.
    const ult = b + N_ANILLOS * N_PERIM;
    for (let j = 0; j < N_PERIM; j++) {
      const k = (j + 1) % N_PERIM;
      if (cara === 0) idx.push(ult + j, ult + k, centro[cara]);
      else idx.push(ult + k, ult + j, centro[cara]);
    }
  }

  /* La pared del canto: vértices PROPIOS con normal HORIZONTAL (la del campo
     de distancias). Compartirlos con el bisel redondearía el filo, y el filo
     es justo donde el Fresnel enciende el rim de luz. */
  const muroF = pos.length / 3;
  for (let vuelta = 0; vuelta < 2; vuelta++) {
    for (let j = 0; j < N_PERIM; j++) {
      const px = borde[j * 2];
      const py = borde[j * 2 + 1];
      const gx = (distInterior(px + eps, py, w, h, radio, k) - distInterior(px - eps, py, w, h, radio, k)) / (2 * eps);
      const gy = (distInterior(px, py + eps, w, h, radio, k) - distInterior(px, py - eps, w, h, radio, k)) / (2 * eps);
      const l = Math.hypot(gx, gy) || 1;
      pos.push(px, py, vuelta === 0 ? CANTO / 2 : -CANTO / 2);
      nor.push(-gx / l, -gy / l, 0); // −∇d = hacia fuera
    }
  }
  const muroB = muroF + N_PERIM;
  for (let j = 0; j < N_PERIM; j++) {
    const k = (j + 1) % N_PERIM;
    idx.push(muroF + j, muroB + j, muroF + k, muroF + k, muroB + j, muroB + k);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
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
     wordmark. Se oculta la losa para no fotografiarse a sí misma y el material
     muestrea ESO — nítido y sin recursión. A MEDIA resolución (nota del
     auditor): esta es la tercera pasada de escena por frame y a resolución
     completa era la primera candidata a tumbar los FPS en un móvil de gama
     baja; la gradiente es suave y la mitad no se nota tras la refracción.
     Sin tone mapping, igual que hace drei internamente: el plano que compone
     la escena offscreen ya aplica ACES una vez y no queremos dos. */
  const fbo = useFBO(Math.max(2, Math.round(size.width / 2)), Math.max(2, Math.round(size.height / 2)));
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
        {/* El cuarto, por la derecha (nota del auditor): sin él, el canto
            derecho cortaba contra el fondo sin filo encendido y el aro de luz
            quedaba abierto. Frío y algo más tenue que su gemelo cálido. */}
        <Lightformer intensity={0.8} position={[5, 0.5, 1]} rotation-y={-Math.PI / 4} scale={[4, 8, 1]} color="#e4f0ff" />
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
          envMapIntensity={1.1}
          /* Sin tone mapping: el plano que compone la escena offscreen ya
             aplica ACES una vez; si la losa lo aplicara otra vez su interior
             cambiaría de color respecto al fondo y se vería el parche. */
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
