/* Prompts de SLANG — VERBATIM de la app original (public/legacy.html:4740-4917).
   Copiados por lectura del archivo, nunca de memoria: cambiar una coma cambia
   la calidad de la salida y el modelo empieza a devolver material de libro de
   texto (que es justo lo que estos prompts prohíben).

   Nota de port: `interesesArr()` también vive en `src/views/talk/prompts.ts`.
   Se reimplementa aquí (dos líneas, misma clave `rodeo_intereses`, mismo
   fallback) para no acoplar SLANG a un archivo de otra vista que se está
   editando en paralelo. Si algún día hay un `src/lib/intereses.ts`, las dos
   copias se colapsan ahí. */

import { store } from '@/lib/storage';
import { ESPANOL_NEUTRO_ES } from '@/lib/espanol-neutro';

/** L3045 — los intereses del onboarding, o [] si nunca eligió. */
export function interesesArr(): string[] {
  const xs = store.get<string[]>('rodeo_intereses', []);
  return Array.isArray(xs) ? xs.filter((x): x is string => typeof x === 'string') : [];
}

/* L3066-3069 — VERBATIM. OJO: termina en '\n' y por eso se concatena PEGADO a
   la línea siguiente del prompt. Sin intereses devuelve '' y el prompt queda
   exactamente como el de siempre. */
export function interesesLineaSlang(): string {
  const xs = interesesArr();
  return xs.length
    ? `Cuando sea natural, inclina los EJEMPLOS hacia su mundo (${xs.join(', ')}), pero las expresiones deben seguir siendo de uso general, no jerga de nicho.\n`
    : '';
}

/* L4775-4777 — las dos categorías del feed. La pill `jerga` no usa ninguna:
   tiene su propio prompt. */
export const CATEGORIA_TRABAJO =
  'professional/business English actually used in 2026: expressions, phrasal verbs and idioms from real meetings, negotiations, startup and tech culture';
export const CATEGORIA_CALLE =
  'street slang and informal expressions actually used by natives in 2026: internet culture, daily life, sports, going out';

/** L4782 — system de las 3 tarjetas. Decía «for a B2+ Venezuelan living in
    Medellín»: el perfil de Gus incrustado. El alumno es hispanohablante y no
    hace falta saber de dónde para enseñarle slang inglés. */
export const SLANG_SYSTEM =
  'You create fresh English-learning content for a B2+ Spanish-speaking learner aiming for C1. Never textbook material. Respond with STRICT JSON only.';

/** L4783-4796 — user de las 3 tarjetas. `avoid` son los últimos 60 términos vistos. */
export function slangUserPrompt(category: string, avoid: string): string {
  return `Generate exactly 3 REAL expressions of: ${category}.
Already seen (do NOT repeat any of these): ${avoid}.
${interesesLineaSlang()}Do NOT think out loud, do not explain your reasoning, do not write any preamble.
Emit the JSON array immediately as your very first character. Keep every field to one short sentence.
Return a STRICT JSON array of 3 objects. Keys per object:
- "term": the English expression itself
- "meaning_es": significado directo en español
- "example_en": one natural example sentence in English
- "example_es": traducción natural del ejemplo
- "wrong_use": en español — cuándo NO usarla o el error típico del hispanohablante al usarla
- "vibe": exactly one of "casual", "spicy", "pro", "internet"
Here is ONE example of a well-formed item — NEVER reuse its content, generate fresh real expressions:
{"term":"no cap","meaning_es":"sin mentiras, en serio","example_en":"That match was insane, no cap.","example_es":"Ese partido estuvo una locura, en serio.","wrong_use":"No la uses en emails de trabajo ni con gente mayor: es slang de internet.","vibe":"internet"}
Mix difficulty. Genuinely current and useful, zero textbook material.`;
}

/* L4870 — system de JERGA → GRINGO.

   Era PAISA → GRINGO y el experto era «Colombian/Venezuelan Spanish ↔ real
   native English». Eso funcionaba mientras el único usuario viviera en
   Medellín: a un chileno que escribe "me cargó la pana" o a un mexicano con
   "no manches", el modelo le contestaba desde otro dialecto. Ahora el experto
   cubre TODO el español de América y detecta de qué variante viene la frase en
   vez de asumirla. */
export const JERGA_SYSTEM =
  'You are a bilingual slang expert across ALL varieties of Latin American Spanish (Mexican, Caribbean, Andean, Rioplatense, Chilean, Central American) ↔ real native English. Identify which variety the phrase comes from and translate the INTENT, never the words. Respond with STRICT JSON only.';

/* L4871-4880 — user de JERGA. No inyecta intereses ni anti-repetición: es
   traducción puntual, no un feed que se pueda repetir. */
export function jergaUserPrompt(phrase: string): string {
  return `A Spanish-speaking learner wants to say this in English: "${phrase}"
The phrase may be in any Latin American variety of Spanish — work out which one from the phrase itself, and do not assume a country.
Give REAL equivalents natives actually use — never literal translations.
Return STRICT JSON: an object with "phrase" (the original) and "equivalents" (array of 2-4 objects, most common first). Keys per equivalent:
- "en": the actual English expression
- "register": exactly one of "casual", "neutral", "vulgar", "pro"
- "example": one natural example sentence using it
- "note_es": matiz o contexto en español, una línea
${ESPANOL_NEUTRO_ES}
Example of ONE well-formed equivalent (never reuse its content):
{"en":"that's sick","register":"casual","example":"Bro, that goal was sick!","note_es":"Positivo entre jóvenes; no confundir con 'estar enfermo'."}`;
}
