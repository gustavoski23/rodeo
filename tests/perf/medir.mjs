/* Runner de medición del libro en teléfono. Saca la tabla de PERF-libro.md.

     node tests/perf/medir.mjs                 # 1x, 4x y 6x de CPU
     node tests/perf/medir.mjs --throttle 4    # solo uno
     node tests/perf/medir.mjs --etiqueta base # nombre de la corrida

   Antes hay que construir el bundle instrumentado:
     npx vite build --config tests/perf/vite.perf.config.mjs

   Cada camino se repite N veces y se reporta la mediana y el p95: una sola
   pasada mide el ruido del arranque, no el volteo. */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import {
  RAIZ,
  abrirLibro,
  abrirNavegador,
  capturas,
  deslizar,
  dormir,
  esperarQuietas,
  medirVolteo,
  memoriaMb,
  pie,
  servir,
  tocar,
  tocarBoton,
} from './libro-harness.mjs';

const args = process.argv.slice(2);
const opt = (nombre, def) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : def;
};
const REPES = Number(opt('repes', 7));
const ETIQUETA = opt('etiqueta', 'corrida');
const THROTTLES = opt('throttle') ? [Number(opt('throttle'))] : [1, 4, 6];

const mediana = (xs) => {
  const v = xs.filter((x) => x !== null && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return Math.round((v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2) * 10) / 10;
};
const p95 = (xs) => {
  const v = xs.filter((x) => x !== null && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  return Math.round(v[Math.min(v.length - 1, Math.ceil(v.length * 0.95) - 1)] * 10) / 10;
};

async function corrida(browser, url, throttle) {
  const { page } = await abrirLibro(browser, url, { throttle });
  const filas = [];

  /* El tap de la portada: solo se puede medir una vez por carga, porque abre
     el libro y ya no hay portada. Va primero. */
  await page.evaluate(() => window.__reset());
  const tapPortada = await medirVolteo(page, () => tocar(page, 0.5, 0.4));
  filas.push({ camino: 'tap portada (abrir)', ...tapPortada, n: 1 });
  await dormir(600);

  /* Dos ritmos, y la diferencia entre ellos ES el hallazgo:

     - ASENTADO: se espera a que la librería termine de rasterizar las caras
       vecinas antes de volver a pasar. Es el mejor caso posible.
     - SEGUIDO: se pasa página 500 ms después de la anterior, que es como se
       hojea de verdad. Ahí la CPU todavía está ocupada con las capturas que
       disparó el volteo anterior. */
  const medirVarias = async (nombre, gesto, { asentado }) => {
    const muestras = [];
    for (let i = 0; i < REPES; i++) {
      if (asentado) await esperarQuietas(page);
      else await dormir(500);
      muestras.push(await medirVolteo(page, gesto));
    }
    const ok = muestras.filter((m) => m.curlMs !== null);
    filas.push({
      camino: nombre,
      ritmo: asentado ? 'asentado' : 'seguido',
      n: muestras.length,
      curlMs: mediana(muestras.map((m) => m.curlMs)),
      curlP95: p95(muestras.map((m) => m.curlMs)),
      fps: mediana(muestras.map((m) => m.fps)),
      drawMs: mediana(muestras.map((m) => m.drawMs)),
      frameMs: mediana(muestras.map((m) => m.frameMs)),
      volteoMs: mediana(muestras.map((m) => m.volteoMs)),
      capturasEnCamino: mediana(muestras.map((m) => m.capturasEnCamino)),
      capturasDespues: mediana(muestras.map((m) => m.capturasDespues)),
      capturaMs: mediana(muestras.flatMap((m) => m.capturas)),
      capturaP95: p95(muestras.flatMap((m) => m.capturas)),
      png: ok.flatMap((m) => m.png)[0] ?? null,
      tex: ok.flatMap((m) => m.tex)[0] ?? null,
      fallos: muestras.length - ok.length,
    });
    return muestras;
  };

  for (const asentado of [true, false]) {
    await medirVarias('botón › (adelante)', () => tocarBoton(page, 'siguiente'), { asentado });
    await medirVarias('botón ‹ (atrás)', () => tocarBoton(page, 'anterior'), { asentado });
    await medirVarias('deslizar adelante', () => deslizar(page, -1), { asentado });
    await medirVarias('deslizar atrás', () => deslizar(page, +1), { asentado });
  }

  const caps = await capturas(page);
  const mem = await memoriaMb(page);
  const donde = await pie(page);
  await page.close();
  return { throttle, filas, png: caps.png[0] ?? null, memoriaMb: mem, pie: donde };
}

/** Recorre el libro entero ida y vuelta y devuelve el heap al final. */
async function paseoMemoria(browser, url) {
  const { page } = await abrirLibro(browser, url, { throttle: 1 });
  const inicio = await memoriaMb(page);
  await tocar(page, 0.5, 0.4);
  await dormir(1200);
  for (let i = 0; i < 20; i++) {
    await tocarBoton(page, 'siguiente');
    await dormir(1100);
  }
  for (let i = 0; i < 20; i++) {
    await tocarBoton(page, 'anterior');
    await dormir(1100);
  }
  await dormir(1500);
  const fin = await memoriaMb(page);
  const donde = await pie(page);
  await page.close();
  return { inicio, fin, pie: donde };
}

const servidor = await servir({ dist: 'dist-perf', puerto: 4173 });
const browser = await abrirNavegador();
const salida = { etiqueta: ETIQUETA, fecha: new Date().toISOString(), repes: REPES, corridas: [] };
try {
  for (const t of THROTTLES) {
    process.stdout.write(`\n=== CPU ${t}x ===\n`);
    const r = await corrida(browser, servidor.url, t);
    salida.corridas.push(r);
    for (const f of r.filas) {
      process.stdout.write(
        `${(f.ritmo ?? '').padEnd(9)} ${f.camino.padEnd(20)} curl ${String(f.curlMs ?? '—').padStart(7)} ms  ` +
          `p95 ${String(f.curlP95 ?? '—').padStart(7)}  fps ${String(f.fps ?? '—').padStart(5)}  ` +
          `frame ${String(f.frameMs ?? '—').padStart(6)} (gl ${String(f.drawMs ?? '—').padStart(5)})  ` +
          `capt ${String(f.capturaMs ?? '—').padStart(6)} ms  camino ${f.capturasEnCamino ?? '—'}  ` +
          `después ${f.capturasDespues ?? '—'}  ` +
          `png ${f.png ? `${f.png.w}×${f.png.h} ${Math.round(f.png.bytes / 1024)} kB` : '—'}\n`,
      );
    }
    process.stdout.write(`heap ${r.memoriaMb} MB · ${r.pie}\n`);
  }
  process.stdout.write('\n=== paseo de memoria (10 capítulos ida y vuelta) ===\n');
  salida.memoria = await paseoMemoria(browser, servidor.url);
  process.stdout.write(
    `heap ${salida.memoria.inicio} MB → ${salida.memoria.fin} MB · ${salida.memoria.pie}\n`,
  );
} finally {
  await browser.close();
  servidor.cerrar();
}

await mkdir(path.join(RAIZ, 'tests/perf/resultados'), { recursive: true });
const destino = path.join(RAIZ, `tests/perf/resultados/${ETIQUETA}.json`);
await writeFile(destino, JSON.stringify(salida, null, 2));
process.stdout.write(`\nGuardado en ${destino}\n`);
