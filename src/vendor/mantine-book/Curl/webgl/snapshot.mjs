'use client';
/* ═══ ARCHIVO CON FORK ═══ Ver src/vendor/mantine-book/FORK.md.

   FORK 5 — `embedFonts: true`.

   El original pasa `embedFonts: false`. snapdom rasteriza clonando el DOM
   dentro de un <foreignObject> de un SVG, y ese SVG se pinta en un contexto
   AISLADO: no ve las hojas de estilo del documento, así que sin las @font-face
   embebidas cae a la serif del sistema.

   Medido (tests/perf/fuentes.mjs, y las capturas de tests/perf/resultados/):
   la MISMA cara rasterizada con false y con true difiere en el 9,7 % de sus
   píxeles y —lo que se ve— los saltos de línea NO caen en el mismo sitio,
   porque Georgia es más estrecha que Libre Baskerville. Eso es exactamente el
   «la letra cambia al empezar a pasar página» del reporte: no era la fuente
   todavía bajando, era el snapshot pintado con otra fuente. Pasa SIEMPRE, en
   los dos libros y con la fuente ya en caché.

   Cuesta: snapdom inlina las woff2 en base64 dentro del SVG. Son 3 archivos de
   ~20 kB y snapdom los guarda en su propia caché de módulo (`cache.font`), así
   que se paga una vez por sesión, no por cara. El delta medido está en
   PERF-libro.md. */
async function captureFaceTexture(node, pixelRatio, backgroundColor) {
  try {
    const { snapdom } = await import('@zumer/snapdom');
    const img = await snapdom.toPng(node, {
      dpr: pixelRatio,
      backgroundColor,
      embedFonts: true
    });
    if (!img.complete) {
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Curl snapshot image failed to load"));
      });
    }
    return img;
  } catch {
    return null;
  }
}

export { captureFaceTexture };
