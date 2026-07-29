/* Normalización de inglés hablado — la base común del filtro anti-ruido de las
   correcciones (filtro.ts) y de la comparación tolerante del paso de voz
   (views/a1-voice/comparar.ts).

   Existe `normEn` en stores/a1.ts, pero se queda corta acá: compara texto que
   Alfred ESCRIBE contra texto que el curso escribió, y ahí las dos partes usan
   la misma ortografía. Lo que llega de Deepgram no juega ese juego — transcribe
   "I'm" donde el chunk dice "I am", mete el apóstrofo tipográfico del teclado
   del iPhone y a veces parte "cannot" en dos. Si no aplanamos todo eso primero,
   el principiante dice la frase perfecta y la app le contesta que falló, que es
   la peor mentira que le podemos decir. */

/* Contracciones → forma larga. Se expande SIEMPRE hacia el lado largo (y no al
   revés) porque es el único que no es ambiguo: "he's" puede venir de "he is" o
   "he has", pero en A1 de oficina es "is" en el 99 % de los casos y el 1 %
   restante lo perdona el umbral del 70 %. */
const CONTRACCIONES: [RegExp, string][] = [
  [/\bcannot\b/g, 'can not'],
  [/\bcan't\b/g, 'can not'],
  [/\bwon't\b/g, 'will not'],
  [/\bshan't\b/g, 'shall not'],
  /* don't, doesn't, isn't, didn't, haven't… todas de una. SIN \b delante: entre
     la "o" y la "n" de "don't" no hay frontera de palabra, así que un `\bn't\b`
     no engancha nunca y "don't" terminaba partido en "don" + "t". Va DESPUÉS de
     can't/won't/shan't, que son las irregulares y necesitan su propia regla. */
  [/n't\b/g, ' not'],
  [/\bi'm\b/g, 'i am'],
  [/\blet's\b/g, 'let us'],
  [/'re\b/g, ' are'],
  [/'ve\b/g, ' have'],
  [/'ll\b/g, ' will'],
  [/'d\b/g, ' would'],
  [/'s\b/g, ' is'], // he's / she's / it's / that's — ver nota de arriba
];

/* Contracciones SIN apóstrofo. No las produce Deepgram (transcribe con
   apóstrofo casi siempre), pero sí las produce un dedo en un teclado de celular
   — y por acá pasa también lo que el alumno ESCRIBE en el chat de Alfred vivo.
   "im the new guy" tiene que valer lo mismo que "I'm the new guy".

   La lista es corta a propósito: solo entran las que no chocan con una palabra
   inglesa de verdad. Quedan fuera `id` (la credencial de la oficina, que sale
   en el curso), `ill` (enfermo), `were` (pasado de be) y `well`: convertirlas
   arruinaría frases legítimas para arreglar un caso que casi no pasa. */
const SIN_APOSTROFO: [RegExp, string][] = [
  [/\bim\b/g, 'i am'],
  [/\bive\b/g, 'i have'],
  [/\bdont\b/g, 'do not'],
  [/\bdoesnt\b/g, 'does not'],
  [/\bdidnt\b/g, 'did not'],
  [/\bcant\b/g, 'can not'],
  [/\bwont\b/g, 'will not'],
  [/\bisnt\b/g, 'is not'],
  [/\barent\b/g, 'are not'],
  [/\bwasnt\b/g, 'was not'],
  [/\bwerent\b/g, 'were not'],
  [/\bhavent\b/g, 'have not'],
  [/\byoure\b/g, 'you are'],
  [/\btheyre\b/g, 'they are'],
  [/\bthats\b/g, 'that is'],
  [/\bhes\b/g, 'he is'],
  [/\bshes\b/g, 'she is'],
  [/\bits\b/g, 'it is'],
  [/\blets\b/g, 'let us'],
];

/** Aplana inglés para comparar: minúsculas, sin puntuación, contracciones abiertas. */
export function normalizarEn(s: string | null | undefined): string {
  let t = String(s ?? '')
    .toLowerCase()
    // Apóstrofos tipográficos (’ ‘ ´ `) → el recto, que es el que matchean las
    // reglas de arriba. Deepgram devuelve el tipográfico casi siempre.
    .replace(/[‘’ʼ´`]/g, "'");

  for (const [re, con] of CONTRACCIONES) t = t.replace(re, con);
  for (const [re, con] of SIN_APOSTROFO) t = t.replace(re, con);

  return t
    // Todo lo que no sea letra (incluida la acentuada, que aparece cuando el
    // modelo multi de Deepgram se va al español) o dígito, es separador.
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Las palabras de un texto ya normalizado. Array vacío si no quedó nada. */
export function palabrasEn(s: string | null | undefined): string[] {
  const n = normalizarEn(s);
  return n ? n.split(' ') : [];
}

/* Distancia de edición con techo: en cuanto pasa de `max` corta y devuelve
   max+1. No necesitamos el número exacto, solo saber si dos palabras están a un
   dedo de distancia, y así no pagamos la matriz completa. */
function distancia(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const sig = [i];
    let mejor = i;
    for (let j = 1; j <= b.length; j++) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(fila[j]! + 1, sig[j - 1]! + 1, fila[j - 1]! + coste);
      sig.push(v);
      if (v < mejor) mejor = v;
    }
    if (mejor > max) return max + 1;
    fila = sig;
  }
  return fila[b.length]!;
}

/** ¿Son la misma palabra? Tolera UNA letra de diferencia a partir de 4 letras
    ("morning" ↔ "mornin"), que es el error típico de un micrófono de celular
    con acento paisa. En palabras cortas no se tolera nada: "in" y "on" son
    palabras distintas y confundirlas SÍ es un fallo que vale la pena señalar. */
export function mismaPalabra(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  return distancia(a, b, 1) <= 1;
}
