/* Cronómetro de `snapdom.toPng`, la rasterización que la librería del libro
   hace de cada cara antes de subirla como textura WebGL
   (node_modules/@gfazioli/mantine-book/dist/esm/Curl/webgl/snapshot.mjs).

   Es un MÓDULO, no una API del navegador, así que no se puede enganchar desde
   `evaluateOnNewDocument`. El gancho honesto es un alias de Vite:
   `tests/perf/vite.perf.config.mjs` mapea '@zumer/snapdom' aquí, y aquí se
   reexporta el paquete real envolviendo solo `toPng`.

   El import va por RUTA DE ARCHIVO y no por nombre de paquete a propósito: con
   el nombre, el alias se aplicaría también a este archivo y el import sería
   circular. */
import { snapdom as real } from '../../node_modules/@zumer/snapdom/dist/snapdom.mjs';

const bolsa = () => (globalThis.__perf ??= { caps: [] });

export const snapdom = new Proxy(real, {
  get(destino, clave, receptor) {
    if (clave !== 'toPng') return Reflect.get(destino, clave, receptor);
    return async (nodo, opciones) => {
      const t0 = performance.now();
      let img;
      try {
        img = await real.toPng(nodo, opciones);
      } catch (e) {
        // captureFaceTexture() se traga el error y devuelve null, y la librería
        // lo lee como "WebGL no disponible" y se cae al pliegue plano PARA
        // SIEMPRE. Sin dejar rastro aquí, una medición del curl acabaría
        // midiendo el DOM sin enterarse.
        (bolsa().caps ??= []).push({ t0, t1: performance.now(), ms: -1, error: String(e?.message ?? e) });
        throw e;
      }
      // El `await` de captureFaceTexture() sigue hasta que la <img> está
      // completa; sin esperarla aquí el número mediría media captura.
      if (img && !img.complete) {
        await new Promise((res) => {
          img.onload = res;
          img.onerror = res;
        });
      }
      const t1 = performance.now();
      const p = bolsa();
      (p.caps ??= []).push({ t0, t1, ms: t1 - t0, dpr: opciones?.dpr ?? null });
      return img;
    };
  },
});

/* Se cuelga de `window` para que el arnés pueda rasterizar una cara A MANO y
   comparar opciones (por ejemplo `embedFonts` false contra true, que es lo que
   decide si el snapshot sale en Libre Baskerville o en Georgia). Solo existe en
   el build de medición. */
if (typeof window !== 'undefined') window.__snapdom = snapdom;

export * from '../../node_modules/@zumer/snapdom/dist/snapdom.mjs';
