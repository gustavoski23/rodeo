/* AZÚCAR DEL CONTENIDO.

   Un A1Chunk tiene catorce campos y en la práctica nueve de cada diez frases
   dejan seis en null. Escribirlos igual hace que el archivo de contenido se
   lea como un XML: quien revisa el inglés termina buscando el inglés entre
   `cognateHook_es: null` repetidos seiscientas veces.

   Estos constructores devuelven objetos que cumplen A1Chunk EXACTO — el motor
   no se entera de que existen. Las claves cortas (`s`, `why`, `d`) son a
   propósito: en un archivo de 700 frases, cada carácter de ruido cuesta una
   revisión peor. */

import type { A1Chunk } from './tipos';
import type { A1ChunkRuta } from './tipos-ruta';

type Corta = {
  id: string;
  en: string;
  es: string;
  /** sounds_es — la muleta en ortografía española. NUNCA opcional. */
  s: string;
  /** why_es — el porqué con analogía, voz de Alfred, cero metalenguaje. */
  why: string;
  /** sayWhen_es */
  when?: string;
  /** who_es */
  who?: string;
  /** distractors_es — con dos basta: el motor completa con hermanos de escena. */
  d?: string[];
  frame?: string | null;
  swaps?: string[] | null;
  /** cognateHook_es */
  hook?: string | null;
  forms?: { label_es: string; en: string }[] | null;
  /** survival — la marca de "esta te salva de un lío". */
  sos?: boolean;
};

function base(c: Corta, kind: 'palabra' | 'frase'): A1ChunkRuta {
  return {
    id: c.id,
    en: c.en,
    es: c.es,
    sounds_es: c.s,
    why_es: c.why,
    sayWhen_es: c.when ?? '',
    who_es: c.who ?? 'con cualquiera (seguro)',
    frame: c.frame ?? null,
    swaps: c.swaps ?? null,
    distractors_es: c.d ?? [],
    cognateHook_es: c.hook ?? null,
    forms: c.forms ?? null,
    audio: null,
    survival: c.sos ?? false,
    kind,
  };
}

/** Palabra suelta (Tramo 0). Tarjeta corta: ver → oír → repetir. */
export function pal(c: Corta): A1Chunk {
  return base(c, 'palabra');
}

/** Frase completa. El loop de 7 pasos de siempre. */
export function fr(c: Corta): A1Chunk {
  return base(c, 'frase');
}
