#!/usr/bin/env node
/* convertir-laminas.mjs — baja las láminas exportadas de Canva y las deja en
 * public/libro/ como WebP, que es lo que consume la vista del libro.
 *
 * POR QUÉ EXISTE: las láminas se pintan en Canva, y sus URLs de export
 * (export-download.canva.com) son firmadas y de vida corta. Este script toma un
 * manifiesto {archivo, url, tipo} y hace la parte mecánica: bajar, recortar,
 * comprimir y escribir. Así la misma receta corre igual en una máquina local o
 * en la CI del repo, sin pasos manuales ni 42 clics en el navegador.
 *
 * Uso:  node scripts/convertir-laminas.mjs scripts/laminas.json
 *
 * El manifiesto (`tipo` decide el recorte, receta del LIBRO-runbook §3.2):
 *   plena   → la lámina va a sangre en una cara entera: se deja 1400×1960.
 *   dentro  → va embebida en una cara de texto, que la enmarca en 4:3: se
 *             recorta al centro a 1400×1050. Recortar aquí y no por CSS evita
 *             mandar píxeles que nadie va a ver.
 *
 * `sharp` es dependencia TEMPORAL (~50 MB para una conversión de una sola vez):
 * se instala para correr esto y se desinstala al terminar. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const manifiesto = process.argv[2] || 'scripts/laminas.json';
const DESTINO = 'public/libro';

const { laminas } = JSON.parse(readFileSync(manifiesto, 'utf8'));
if (!Array.isArray(laminas) || !laminas.length) {
  console.error(`✗ ${manifiesto} no trae láminas`);
  process.exit(1);
}

const { default: sharp } = await import('sharp');
mkdirSync(DESTINO, { recursive: true });

/* Calidad 80: es donde el WebP deja de verse distinto del PNG a simple vista y
   todavía pesa una fracción. En Alicia, 16 láminas pasaron de 8.9 MB a 1.76 MB. */
const CALIDAD = 80;
const ANCHO = 1400;
const ALTO_PLENA = 1960;
const ALTO_DENTRO = 1050; // 4:3 sobre 1400 de ancho

let ok = 0;
let fallos = 0;
let bytes = 0;

for (const { archivo, url, tipo } of laminas) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const png = Buffer.from(await res.arrayBuffer());

    const alto = tipo === 'dentro' ? ALTO_DENTRO : ALTO_PLENA;
    const webp = await sharp(png)
      // `cover` + `centre` recorta sin deformar: la cara del libro ya impone la
      // proporción, y una lámina estirada se nota al instante.
      .resize(ANCHO, alto, { fit: 'cover', position: 'centre' })
      .webp({ quality: CALIDAD })
      .toBuffer();

    writeFileSync(join(DESTINO, archivo), webp);
    bytes += webp.length;
    ok++;
    console.log(`  ✓ ${archivo}  ${(webp.length / 1024).toFixed(0)} KB  (${tipo})`);
  } catch (e) {
    fallos++;
    console.error(`  ✗ ${archivo}: ${e.message}`);
  }
}

console.log(`\n${ok}/${laminas.length} láminas · ${(bytes / 1024 / 1024).toFixed(2)} MB en total`);
if (fallos) {
  console.error(`✗ ${fallos} fallaron (¿URLs de export vencidas? se regeneran desde Canva)`);
  process.exit(1);
}
