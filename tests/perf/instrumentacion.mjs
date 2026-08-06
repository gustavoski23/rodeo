/* Sonda que se inyecta ANTES de cualquier script de la página
   (`page.evaluateOnNewDocument`). Todo lo que mide sale de ganchos sobre APIs
   del navegador, no de código de la app: así el mismo arnés sirve para medir
   antes y después de los cambios sin que la instrumentación sea parte de lo
   medido.

   Qué engancha y POR QUÉ cada uno:

   - `WebGL2RenderingContext.prototype.drawElements` → el PRIMER FRAME DE CURL.
     El curl del libro es WebGL2 crudo (glRenderer.mjs de la librería): mientras
     no haya un draw, lo que se ve es el pliegue plano del DOM. Es la señal más
     directa de "ya arrancó el volteo de verdad", y no depende de ninguna clase
     CSS ni de detalles internos del componente.
   - `texImage2D` → cuándo se sube la textura de cada cara a la GPU.
   - `HTMLCanvasElement.prototype.toDataURL` → el PNG intermedio de snapdom: sus
     px reales (`canvas.width × canvas.height`) y su peso en bytes.
   - Eventos de puntero en fase de captura sobre `window` → el t0 CONFIABLE de
     cada gesto. Se toma del evento real del navegador (`event.timeStamp`), no
     del reloj del proceso de Node, que va desfasado.
   - Un rAF permanente → los frames, para el FPS del volteo.

   `snapdom.toPng` se cronometra aparte, en `snapdom-timed.mjs`: es un módulo,
   no una API del navegador, y el único gancho honesto es el alias de Vite. */
export function sonda() {
  const P = {
    draws: [], // { t }            — cada gl.drawElements
    tex: [], // { t, w, h }      — cada subida de textura
    png: [], // { t, w, h, bytes } — cada toDataURL de snapdom
    caps: [], // { t0, t1, ms, dpr } — lo llena snapdom-timed.mjs
    ev: [], // { tipo, t, x, y } — pointer/touch reales
    frames: [], // t de cada rAF
    marcas: [], // { nombre, t }   — hitos que pone el arnés
  };
  window.__perf = P;
  window.__marca = (nombre) => P.marcas.push({ nombre, t: performance.now() });
  window.__reset = () => {
    P.draws.length = 0;
    P.tex.length = 0;
    P.png.length = 0;
    P.caps.length = 0;
    P.ev.length = 0;
    P.marcas.length = 0;
    // frames NO se limpia: el FPS se corta por ventana de tiempo.
  };

  /* WebGL2: el primer draw es el primer frame de curl. Se engancha el
     prototipo, así que da igual cuándo la librería cree su contexto. */
  const G = window.WebGL2RenderingContext?.prototype;
  if (G) {
    const draw = G.drawElements;
    G.drawElements = function (...a) {
      const t = performance.now();
      const r = draw.apply(this, a);
      // `ms` reparte la culpa del FPS: en este contenedor no hay GPU y el curl
      // lo rasteriza SwiftShader por CPU, así que un `ms` grande es del banco
      // de pruebas y NO se traslada a un teléfono. Si `ms` es pequeño y el
      // frame igual tarda, la culpa es del JS del hilo principal, que sí viaja.
      P.draws.push({ t, ms: performance.now() - t });
      return r;
    };
    const tex = G.texImage2D;
    G.texImage2D = function (...a) {
      const src = a[a.length - 1];
      P.tex.push({
        t: performance.now(),
        w: src?.naturalWidth ?? src?.width ?? 0,
        h: src?.naturalHeight ?? src?.height ?? 0,
      });
      return tex.apply(this, a);
    };
  }

  /* El PNG intermedio de snapdom: tamaño en px y en bytes. snapdom 2.23 pinta
     el clon en un <canvas> y lo saca por `toBlob` (no por `toDataURL`, que era
     la ruta vieja): se enganchan las dos para no depender de cuál use. */
  const toBlob = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function (cb, ...a) {
    const { width: w, height: h } = this;
    return toBlob.call(
      this,
      (blob) => {
        if (blob?.type === 'image/png') P.png.push({ t: performance.now(), w, h, bytes: blob.size });
        cb(blob);
      },
      ...a,
    );
  };
  const toDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function (...a) {
    const t = performance.now();
    const url = toDataURL.apply(this, a);
    if (typeof url === 'string' && url.startsWith('data:image/png')) {
      P.png.push({ t, w: this.width, h: this.height, bytes: Math.round((url.length - 22) * 0.75) });
    }
    return url;
  };

  /* t0 de los gestos, del evento REAL (isTrusted) y en fase de captura, que es
     la única que el <Book> no puede cortar (trampa 6 del LIBRO-runbook). */
  for (const tipo of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click']) {
    window.addEventListener(
      tipo,
      (e) => {
        if (!e.isTrusted) return;
        P.ev.push({ tipo, t: performance.now(), x: e.clientX ?? 0, y: e.clientY ?? 0 });
      },
      true,
    );
  }

  const tick = (t) => {
    P.frames.push(t);
    if (P.frames.length > 4000) P.frames.splice(0, 2000);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
