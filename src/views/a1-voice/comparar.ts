/* La comparación tolerante del paso de producción.

   Acá se decide lo único que le importa al que está grabando: ¿le salió o no?
   Y la respuesta tiene que estar del lado del alumno. El chunk objetivo es
   "Good morning, everyone" y él dice "good morning everyone" con un ruido de
   silla encima: eso SALIÓ. Deepgram le devuelve "good morning every one": eso
   también salió. Ser estricto acá no enseña nada, solo enseña a callarse.

   La regla: se aceptan las palabras del chunk que aparecen en la transcripción
   EN ORDEN aproximado, y basta con el 70 %. El orden importa porque en inglés
   es la mitad del significado ("I can help you" no es "you can help I"), pero
   se mide como subsecuencia y no como igualdad: una palabra de más en el medio
   (un "uhm", un "the" que se le escapó) no rompe nada.

   Las que no entran en esa subsecuencia son las `faltantes`, y son literalmente
   lo que se le muestra en pantalla: "te faltó esto". Por eso se devuelven con
   la ortografía ORIGINAL del chunk y no normalizadas — nadie quiere leer que le
   faltó "can not" cuando la frase decía "can't". */

import { mismaPalabra, palabrasEn } from '@/lib/alfred/texto';
import type { A1Chunk, ResultadoVoz } from '@/content/a1/tipos';

/** Proporción de las palabras del chunk que hay que decir para que cuente. */
const UMBRAL = 0.7;

/* Subsecuencia común más larga entre objetivo y dicho. Devuelve qué índices del
   objetivo quedaron cubiertos. Es O(n·m) pero n≤10 palabras (un chunk de A1) y
   m son las que quepan en 30 segundos: cuesta nada y a cambio da el "en orden"
   gratis, sin ventanas ni heurísticas de posición. */
function cubiertas(objetivo: string[], dicho: string[]): boolean[] {
  const n = objetivo.length;
  const m = dicho.length;

  // tabla[i][j] = largo de la mejor subsecuencia usando objetivo[i..] y dicho[j..]
  const tabla: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      tabla[i]![j] = mismaPalabra(objetivo[i]!, dicho[j]!)
        ? tabla[i + 1]![j + 1]! + 1
        : Math.max(tabla[i + 1]![j]!, tabla[i]![j + 1]!);
    }
  }

  // Se recorre la tabla hacia adelante marcando qué palabra del objetivo entró.
  const marca = new Array<boolean>(n).fill(false);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (mismaPalabra(objetivo[i]!, dicho[j]!) && tabla[i]![j] === tabla[i + 1]![j + 1]! + 1) {
      marca[i] = true;
      i++;
      j++;
    } else if (tabla[i + 1]![j]! >= tabla[i]![j + 1]!) {
      i++;
    } else {
      j++;
    }
  }
  return marca;
}

/**
 * Compara lo que se dijo contra el chunk objetivo.
 * @param chunk       la frase que tocaba producir.
 * @param transcript  lo que devolvió Deepgram, tal cual.
 */
export function compararProduccion(chunk: A1Chunk, transcript: string): ResultadoVoz {
  /* Se parte el chunk por su ortografía real (para poder devolver las faltantes
     legibles) y en paralelo se normaliza cada palabra para comparar. La
     normalización puede partir una en dos ("can't" → "can not"), así que se
     mapea palabra original → sus piezas normalizadas y se toma la primera:
     alcanza para alinear y no desordena nada. */
  const originales = String(chunk.en)
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const objetivo: string[] = [];
  const etiqueta: string[] = [];
  for (const original of originales) {
    for (const norm of palabrasEn(original)) {
      objetivo.push(norm);
      etiqueta.push(original);
    }
  }

  const dicho = palabrasEn(transcript);
  if (!objetivo.length) return { transcript, logrado: false, faltantes: [] };

  const marca = cubiertas(objetivo, dicho);
  const acertadas = marca.filter(Boolean).length;

  /* Techo hacia arriba: en una frase de 3 palabras el 70 % son 2,1, y redondear
     para abajo dejaría pasar decir dos tercios de "I need help". Las frases de
     A1 son cortas justamente porque cada palabra carga peso. */
  const minimo = Math.ceil(objetivo.length * UMBRAL);
  const logrado = acertadas >= minimo;

  /* Faltantes SIN repetir y con la ortografía del curso. Si una palabra aparece
     dos veces en la frase y solo se dijo una, se nombra una sola vez: el
     feedback es un empujón, no un informe. */
  const faltantes: string[] = [];
  for (let i = 0; i < objetivo.length; i++) {
    if (marca[i]) continue;
    const palabra = etiqueta[i]!.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') || etiqueta[i]!;
    if (!faltantes.some((f) => f.toLowerCase() === palabra.toLowerCase())) faltantes.push(palabra);
  }

  return { transcript, logrado, faltantes };
}
