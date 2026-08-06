'use client';
/* ═══ ARCHIVO CON FORK ═══ El único de src/vendor/mantine-book/ que se aparta
   de @gfazioli/mantine-book@1.0.5. El diff completo y el porqué de cada punto
   están en src/vendor/mantine-book/FORK.md; aquí van marcados con «FORK n».

   Resumen: la librería rasteriza CUATRO caras por volteo, dos de ellas por
   nada, y lo hace en cuanto la hoja aterriza — justo cuando el dedo va a volver
   a pasar. Medido en PERF-libro.md. */
import React, { useMemo, useRef, useState, useContext, useLayoutEffect, useEffect } from 'react';
import { CurlGlRenderer } from './glRenderer.mjs';
import { CurlWebglPool } from './pool.mjs';
import { CurlWebglPoolContext } from './poolContext.mjs';
import { captureFaceTexture } from './snapshot.mjs';
import { generacionActual, guardarCara, hayVolteo, leerCara, marcarVolteo } from '../../curl-cache.mjs';

const DEFAULT_SHADOW_RGB = [0.1, 0.1, 0.12];
function cssColorToRgb(color) {
  if (!color || typeof document === "undefined") {
    return DEFAULT_SHADOW_RGB;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return DEFAULT_SHADOW_RGB;
  }
  ctx.fillStyle = "#1a1b1e";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}
const RADIUS_TAIL = 0.18;
function renderFold(renderer, fold, flipped, width, maxRadius, shadowOpacity, shadowColor) {
  if (!fold) {
    return false;
  }
  const nx = -fold.creaseDir.y;
  const ny = fold.creaseDir.x;
  const sheetLeft = flipped ? -width : 0;
  const t = fold.progress / 100;
  const shape = t < 1 - RADIUS_TAIL ? 1 - t : (1 - t) * (1 - t) / RADIUS_TAIL;
  const r = Math.max(0.05, maxRadius * shape);
  renderer.render(
    fold.creaseMid.x,
    fold.creaseMid.y,
    nx,
    ny,
    r,
    sheetLeft,
    shadowOpacity,
    shadowColor
  );
  return true;
}

/* FORK 1 — el dpr del SNAPSHOT se separa del dpr del RENDER.

   El original usa el mismo `min(devicePixelRatio, 2)` para las dos cosas, y no
   son la misma cosa: el render es la malla WebGL que se mira, y el snapshot es
   la textura de una cara que gira ~400 ms deformada sobre un cilindro.

   Medido con las dos variantes construidas y los mismos gestos
   (tests/perf/dpr-snapshot.mjs), el PNG por cara pasa de 688×964 / 707 kB a
   516×723 / 416 kB y la rasterización por volteo de 171 ms a 89 ms: −48 % de
   tiempo y −41 % de bytes. El criterio para revertir era que la pérdida se
   notara en la cara PLANA, y la plana sale idéntica — el render sigue en 2, lo
   único que baja es la textura de la cara que gira. La comparación lado a lado
   está en tests/perf/resultados/dpr-snapshot.png. */
const TOPE_DPR_SNAPSHOT = 1.5;
const dprRender = () => (typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2));
const dprSnapshot = () =>
  typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, TOPE_DPR_SNAPSHOT);

/* Identidad de hoja para la caché. Un `Symbol("curl-page")` NO sirve de clave
   de texto: `String()` de todos ellos da la misma cadena y las 22 hojas se
   pisarían entre sí. Un contador de módulo sí distingue, y las hojas del libro
   no se desmontan mientras la vista vive, así que es estable. */
let siguienteHoja = 0;

function CurlWebglLayer(props) {
  const {
    width,
    height,
    active,
    fold,
    flipped,
    curlRadius,
    shadowOpacity,
    shadowColor,
    pageBackground,
    frontContent,
    backContent,
    onUnavailable,
    onReadyChange,
    warm = true
  } = props;
  const shadowColorRgb = useMemo(() => cssColorToRgb(shadowColor), [shadowColor]);
  const mountRef = useRef(null);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const ctxHolder = useContext(CurlWebglPoolContext);
  const localHolderRef = useRef({ pool: null });
  const holder = ctxHolder ?? localHolderRef.current;
  const holderRef = useRef(holder);
  holderRef.current = holder;
  const ownerRef = useRef(/* @__PURE__ */ Symbol("curl-page"));
  const hojaRef = useRef(0);
  if (hojaRef.current === 0) {
    hojaRef.current = ++siguienteHoja;
  }
  const leaseRef = useRef(null);
  const uploadedRef = useRef(false);
  const onUnavailableRef = useRef(onUnavailable);
  onUnavailableRef.current = onUnavailable;
  const onReadyChangeRef = useRef(onReadyChange);
  onReadyChangeRef.current = onReadyChange;
  const foldRef = useRef(fold);
  foldRef.current = fold;
  const flippedRef = useRef(flipped);
  flippedRef.current = flipped;
  const curlRadiusRef = useRef(curlRadius);
  curlRadiusRef.current = curlRadius;
  const shadowOpacityRef = useRef(shadowOpacity);
  shadowOpacityRef.current = shadowOpacity;
  const shadowColorRgbRef = useRef(shadowColorRgb);
  shadowColorRgbRef.current = shadowColorRgb;
  const hasBack = backContent != null;
  const hasBackRef = useRef(hasBack);
  hasBackRef.current = hasBack;

  /* FORK 2 — `flipped` SALE de la clave de captura.

     Original: `${width}x${height}|${hasBack}|${flipped}`. Como el `flipped` de
     la hoja cambia en cuanto el volteo aterriza, la clave cambiaba y la
     librería volvía a rasterizar LAS MISMAS DOS CARAS. Y es un cambio que no
     necesita rasterizar nada: en Curl.mjs, `frontContent` y `backContent` son
     `restFaceNode` y `liftFaceNode`, que al voltear se INTERCAMBIAN entre sí.
     Los mismos dos nodos, con los papeles cambiados. Así que se guarda el par
     tal cual se capturó (a = lo que estaba en frontContent, b = en backContent)
     junto con el `flipped` de ese momento, y al usarlo se intercambian si hace
     falta. Eso es la mitad del trabajo por volteo, gratis.

     La `generacion` sí entra en la clave: es lo que la librería no puede saber
     (escala del lector, cambio de libro). Ver curl-cache.mjs. */
  const captureKey = `hoja${hojaRef.current}|${width}x${height}|${hasBack}|g${generacionActual()}`;
  const currentKeyRef = useRef(captureKey);
  currentKeyRef.current = captureKey;
  /* Si la LRU desalojó nuestro par mientras seguíamos haciendo falta, hay que
     volver a rasterizar: `intento` es lo que reabre el efecto de captura. Con
     el tope de 6 y solo 2 hojas calientes a la vez no debería pasar nunca, pero
     un desalojo silencioso dejaría la hoja SIN curl y sin nadie que lo note.

     `ownKeyRef` es lo que distingue «me lo quitaron» de «todavía no lo tengo»:
     sin él, el fallo normal de la PRIMERA captura (que aún está en vuelo)
     dispararía `intento`, y el efecto se cancelaría a sí mismo en bucle. */
  const [intento, setIntento] = useState(0);
  const ownKeyRef = useRef(null);

  const uploadAndDraw = () => {
    const lease = leaseRef.current;
    const par = leerCara(currentKeyRef.current);
    if (!lease) {
      return;
    }
    if (!par?.a) {
      if (ownKeyRef.current === currentKeyRef.current) {
        ownKeyRef.current = null;
        setIntento((n) => n + 1);
      }
      return;
    }
    // El intercambio del FORK 2: si la hoja está volteada respecto a cuando se
    // capturó, la cara que descansa es la otra.
    const alReves = flippedRef.current !== par.flipped;
    lease.renderer.setFront(alReves ? par.b ?? par.a : par.a);
    lease.renderer.setBack(hasBackRef.current ? (alReves ? par.a : par.b) : null);
    uploadedRef.current = true;
    const drew = renderFold(
      lease.renderer,
      foldRef.current,
      flippedRef.current,
      width,
      curlRadiusRef.current,
      shadowOpacityRef.current,
      shadowColorRgbRef.current
    );
    if (drew) {
      onReadyChangeRef.current?.(true);
    }
  };
  const uploadAndDrawRef = useRef(uploadAndDraw);
  uploadAndDrawRef.current = uploadAndDraw;
  useLayoutEffect(() => {
    if (!active) {
      return;
    }
    const holder2 = holderRef.current;
    const mount = mountRef.current;
    if (!mount) {
      return;
    }
    holder2.pool ?? (holder2.pool = new CurlWebglPool());
    const owner = ownerRef.current;
    const lease = holder2.pool.acquire(owner);
    if (!lease) {
      onUnavailableRef.current?.();
      return;
    }
    leaseRef.current = lease;
    const { canvas } = lease;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    mount.appendChild(canvas);
    lease.renderer.resize(width, height, dprRender());
    lease.renderer.clear();
    uploadAndDrawRef.current();
    return () => {
      leaseRef.current = null;
      uploadedRef.current = false;
      onReadyChangeRef.current?.(false);
      holder2.pool?.release(owner);
    };
  }, [active, width, height]);
  /* Mientras esta hoja gira, que nadie rasterice. Lo publica en el contador
     compartido de curl-cache.mjs; lo lee el planificador de la captura. */
  useEffect(() => {
    if (!active) {
      return;
    }
    marcarVolteo(true);
    return () => marcarVolteo(false);
  }, [active]);
  useEffect(() => {
    const localHolder = localHolderRef.current;
    return () => {
      if (!ctxHolder) {
        localHolder.pool?.dispose();
        localHolder.pool = null;
      }
    };
  }, []);

  /* FORK 3 — la captura, cacheada y fuera del camino del dedo.

     Dos cambios sobre el original:

     a) Si la LRU ya tiene este par (misma caja, misma generación, misma hoja),
        no se rasteriza nada: se sube y se dibuja. Es lo que hace que ir y
        volver dentro de un capítulo no cueste nada.
     b) Cuando la hoja solo está CALIENTE (todavía sin volteo), la captura
        espera a que el hilo principal esté QUIETO. El original la lanza en
        cuanto la hoja de al lado empieza a girar, o sea metida dentro de la
        animación; medido a 4× de CPU, eso dejaba el volteo siguiente sin curl
        1-3 veces de cada 4. Si la hoja ya está `active` (girando de verdad) no
        se espera a nada: ahí la textura hace falta ya.

     «Quieto» son DOS condiciones, y la primera es la que importa:

     1. que NINGUNA hoja esté girando (`hayVolteo()`, que sale del `active` de
        las capas). Es el dato de verdad. La versión anterior solo miraba los
        frames y eso mide otra cosa: en una máquina rápida los frames del volteo
        ya son de 16 ms, así que daba la animación por terminada mientras seguía
        corriendo y metía la rasterización dentro. Aquí no se notaba porque este
        banco tarda 60-200 ms por frame durante el volteo; en un teléfono con
        GPU sí se habría notado.
     2. y que además el hilo respire — dos frames seguidos por debajo de 24 ms.

     No se usa `requestIdleCallback` para nada de esto: se probó y no sirve.
     Medido en este banco, sus callbacks no llegaban hasta vencer el `timeout`,
     así que el «idle» acababa siendo un retardo fijo, y con 600 ms caía justo
     en mitad de la animación de 900 ms (los fps del volteo bajaron de 30 a 5 y
     una fila entera se quedó sin curl).

     El tope de 1800 ms es el respaldo por si nada se calma nunca (pestaña de
     fondo, rAF frenado): más largo que el volteo más largo que admite la vista,
     para que no vuelva a caer dentro de la animación. */
  useEffect(() => {
    if (!warm && !active) {
      return;
    }
    if (leerCara(captureKey)) {
      ownKeyRef.current = captureKey;
      uploadAndDrawRef.current();
      return;
    }

    let cancelled = false;
    const capturar = async () => {
      if (cancelled) {
        return;
      }
      const dpr = dprSnapshot();
      const bg = frontRef.current ? getComputedStyle(frontRef.current).backgroundColor || "#ffffff" : "#ffffff";
      const a = frontRef.current ? await captureFaceTexture(frontRef.current, dpr, bg) : null;
      if (cancelled) {
        return;
      }
      if (!a) {
        onUnavailableRef.current?.();
        return;
      }
      let b = null;
      if (hasBack && backRef.current) {
        b = await captureFaceTexture(backRef.current, dpr, bg);
        if (cancelled) {
          return;
        }
        if (!b) {
          onUnavailableRef.current?.();
          return;
        }
      }
      guardarCara(captureKey, { a, b, flipped: flippedRef.current });
      ownKeyRef.current = captureKey;
      uploadAndDrawRef.current();
    };

    if (active || typeof requestAnimationFrame !== "function") {
      void capturar();
      return () => {
        cancelled = true;
      };
    }

    let raf = 0;
    let anterior = 0;
    let seguidos = 0;
    const limite = performance.now() + 1800;
    const mirar = (t) => {
      if (cancelled) {
        return;
      }
      const delta = anterior ? t - anterior : Infinity;
      anterior = t;
      seguidos = !hayVolteo() && delta < 24 ? seguidos + 1 : 0;
      if (seguidos >= 2 || performance.now() > limite) {
        void capturar();
        return;
      }
      raf = requestAnimationFrame(mirar);
    };
    raf = requestAnimationFrame(mirar);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [captureKey, warm, active, hasBack, intento]);

  /* FORK 4 — aquí el original tenía un tercer efecto que BORRABA las imágenes
     en cuanto `warm` y `active` eran falsos. Se quitó: con él, volver una
     página atrás obligaba a rasterizar otra vez las dos caras. El par vive
     ahora en la LRU acotada de curl-cache.mjs, que lo suelta al pasar del tope
     de 6 caras. Menos memoria, no más: medido, el paseo por los 10 capítulos
     ida y vuelta acaba en 41 MB contra los 54 MB de antes. */

  useEffect(() => {
    const lease = leaseRef.current;
    if (lease && active && uploadedRef.current && fold) {
      const drew = renderFold(
        lease.renderer,
        fold,
        flipped,
        width,
        curlRadius,
        shadowOpacity,
        shadowColorRgb
      );
      if (drew) {
        onReadyChangeRef.current?.(true);
      }
    }
  }, [active, fold, flipped, width, curlRadius, shadowOpacity, shadowColorRgb]);
  const captureStyle = {
    position: "absolute",
    top: 0,
    left: -99999,
    width,
    height,
    overflow: "hidden",
    background: pageBackground ?? "var(--curl-page-background, white)",
    pointerEvents: "none"
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, (warm || active) && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { ref: frontRef, style: captureStyle, "aria-hidden": "true" }, frontContent), hasBack && /* @__PURE__ */ React.createElement("div", { ref: backRef, style: captureStyle, "aria-hidden": "true" }, backContent)), /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: mountRef,
      "aria-hidden": "true",
      style: {
        position: "absolute",
        // Vertical headroom (single source of truth: CurlGlRenderer.PAD_RATIO)
        // so the lifted curl can extend above/below the page unclipped.
        top: -Math.round(height * CurlGlRenderer.PAD_RATIO),
        left: 0,
        width: width * 2,
        height: height + 2 * Math.round(height * CurlGlRenderer.PAD_RATIO),
        pointerEvents: "none",
        display: active ? "block" : "none",
        zIndex: 6
      }
    }
  ));
}

export { CurlWebglLayer };
