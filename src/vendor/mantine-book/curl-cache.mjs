/* ARCHIVO NUEVO DEL FORK — no existe en @gfazioli/mantine-book.

   La caché de texturas del curl, y el único punto por el que la app puede
   invalidarla.

   POR QUÉ HACE FALTA. Cada cara del libro se pinta en el curl 3D como una
   TEXTURA: un screenshot del DOM que snapdom rasteriza a PNG. Medido en este
   repo (PERF-libro.md), en el banco de pruebas cada cara cuesta 478-875 ms a 1×
   y 1,5-7,5 s a 4×, y la librería rehace CUATRO por volteo. A ritmo de lectura
   real eso deja la rasterización solapando el gesto siguiente y el curl no
   llega a dibujarse ni una vez: el volteo entero se ve como el pliegue plano
   del DOM. Guardar las caras ya rasterizadas es lo que corta ese trabajo.

   POR QUÉ ESTÁ ACOTADA. Son PNG de 688×964 (≈700 kB cada uno) más su bitmap
   decodificado. Sin tope, hojear los 10 capítulos acumularía las 22 caras y en
   un teléfono de 3 GB eso tumba la pestaña. TOPE = 6 caras: las dos vecinas que
   la librería mantiene calientes, más holgura para ir y volver dentro de un
   capítulo sin volver a rasterizar.

   SOBRE `gl.deleteTexture()`. No aplica, y conviene dejarlo escrito para que
   nadie lo busque: el pool de la librería (Curl/webgl/pool.mjs) tiene UN solo
   renderer con DOS texturas de GPU que se reescriben con `texImage2D` en cada
   volteo. No hay una textura de GPU por cara que liberar. Lo que ocupa memoria
   de verdad es la <img> con su bitmap decodificado, y de eso se encarga el
   TOPE: soltar la referencia deja que el recolector se lleve el bitmap.

   Medido con el paseo de los 10 capítulos ida y vuelta (tests/perf/medir.mjs):
   el heap acaba en 41 MB con esta caché contra 54 MB sin ella, y en 21 MB con
   la CPU frenada 4×. Menos memoria que antes, no más, aunque ahora se guarden
   caras que antes se tiraban — porque antes se rasterizaban una y otra vez y
   los PNG viejos se acumulaban esperando al recolector. */

const TOPE = 6;

/** Map en orden de inserción = LRU pobre pero exacta: la primera clave es la
    menos usada recientemente porque cada acierto la reinserta al final. */
const caras = new Map();

/* Generación: la parte de la clave que la librería NO puede saber. El tamaño de
   página está en `captureKey` (width×height), pero la ESCALA del lector (A−/A+)
   y el cambio de libro reordenan el texto sin cambiar ni un píxel de la caja, y
   con la textura vieja la cara curvada mostraría el layout anterior. La vista
   llama a `invalidarCaras()` y todo lo guardado deja de valer. */
let generacion = 0;

export const generacionActual = () => generacion;

/** Tira TODAS las caras guardadas. La llama la vista al cambiar escala o libro. */
export function invalidarCaras() {
  generacion++;
  for (const clave of [...caras.keys()]) soltar(clave);
}

function soltar(clave) {
  const entrada = caras.get(clave);
  caras.delete(clave);
  if (!entrada) return;
  for (const img of [entrada.a, entrada.b]) {
    // snapdom devuelve la <img> con una blob: URL. Sin revocarla el blob queda
    // vivo aunque nadie apunte a la imagen: soltar la referencia de JS no basta.
    if (img?.src?.startsWith('blob:')) URL.revokeObjectURL(img.src);
  }
}

export function leerCara(clave) {
  const entrada = caras.get(clave);
  if (!entrada) return null;
  caras.delete(clave); // reinsertar = marcarla como la más reciente
  caras.set(clave, entrada);
  return entrada;
}

export function guardarCara(clave, entrada) {
  if (caras.has(clave)) caras.delete(clave);
  caras.set(clave, entrada);
  while (caras.size > TOPE) soltar(caras.keys().next().value);
}

/** Para la prueba de regresión: cuántas caras hay guardadas ahora mismo. */
export const carasGuardadas = () => caras.size;

if (typeof window !== 'undefined') {
  // Ventana de inspección para el arnés de tests/perf (y para depurar a mano).
  window.__curlCache = { carasGuardadas, invalidarCaras, generacionActual };
}
