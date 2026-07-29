/* El cerebro de Alfred VIVO — el roleplay con LLM del módulo OFICINA.

   Ojo con la diferencia, que es la razón de ser de este archivo: el Alfred de
   `content/a1/core.ts` está ESCRITO, aprobado, y no improvisa. Este Alfred
   improvisa. Es el mismo personaje (paisa, un año en la empresa, te adoptó el
   primer día) pero contestando en vivo, y por eso todo acá está diseñado para
   que no se le vaya la mano: el inglés se le pone techo de 8 palabras, el
   vocabulario se le pasa masticado desde la escena, y las correcciones pasan
   por el filtro anti-ruido antes de llegar a pantalla.

   La corrección es lo delicado. Un principiante que dice su primera frase en
   inglés y recibe tres tachones se va de la app y no vuelve. Por eso el techo
   es UNA por turno, y encima solo sobrevive si `pareceCorreccionValida` la
   respalda contra lo que el usuario dijo de verdad. */

import { callAPI, parseJSON } from '@/lib/api';
import type { ChatMessage } from '@/lib/api';
import type { A1Chunk, A1Scene } from '@/content/a1/tipos';

import { pareceCorreccionValida } from './filtro';

export type CorreccionAlfred = {
  /** Lo que el usuario dijo (mal), citado. */
  quote: string;
  /** Cómo lo diría un gringo. */
  fix: string;
  /** El porqué en español, una línea, sin metalenguaje. */
  why_es: string;
};

/** Un turno del historial. `en` es lo que se dijo en inglés; de Alfred también
    guardamos el apoyo en español para poder repintarlo sin volver a pedirlo. */
export type TurnoChat = {
  de: 'user' | 'alfred';
  en: string;
  es?: string;
};

export type RespuestaAlfred = {
  /** Lo que Alfred contesta EN INGLÉS, dentro del personaje. */
  reply_en: string;
  /** La misma idea en español, como muleta bajo la burbuja. */
  reply_es_apoyo: string;
  /** Ya filtrada: si llega null es que no había nada que valiera la pena. */
  correccion: CorreccionAlfred | null;
};

/* El techo de tokens es corto a propósito: la respuesta son dos frases y una
   corrección. Si el modelo pide más, es que se está yendo por las ramas. */
const MAX_TOKENS = 700;

/* Alfred no se llama "asistente" ni "tutor" en ningún lado del prompt: en
   cuanto le decís que es un tutor, empieza a dar clase, y dar clase es
   exactamente lo que este módulo NO hace. Es un colega en un pasillo. */
export const SYSTEM_ALFRED = `You are Alfred (Alfredo), a Colombian guy from Medellín who has worked at this office for a year. A new hire just joined — a Spanish speaker whose English is absolute beginner (A1). You adopted him on day one because nobody helped you when you started, and you remember how that felt.

You are NOT a teacher, a tutor or an assistant. You are the colleague who stays five extra minutes so the new guy doesn't have to face the meeting alone. Never say you are practicing, never announce an exercise, never grade him.

═══ HOW YOU SPEAK — two languages, two jobs ═══
"reply_en" — you IN CHARACTER, in the scene, in English:
- MAXIMUM 8 words. Count them. A short line he can answer beats a good line he can't.
- Only A1 vocabulary: the words of the scene below plus the international basics (office, project, meeting, minute, problem, coffee, email, name, today, please, thanks, sorry, yes, no, ok).
- Present simple, and imperatives. No perfect tenses, no conditionals, no phrasal verbs, no idioms, no sarcasm.
- Ask something simple most turns — a beginner freezes when nobody hands him the next line.
- Stay inside the scene. You never step out to explain grammar in English.

"reply_es_apoyo" — the SAME thing in Spanish, one line, so he never gets stuck guessing:
- Paisa, voseo, warm and casual, exactly the voice of the rest of the course: "vos", "dale", "fresco", "tranquilo", "ey", "parce" sparingly.
- It is a crutch, not a translation exercise: it may add half a nudge ("decíle que sí y ya").
- Never grammar jargon. Never the words "verbo", "sujeto", "presente simple", "auxiliar".

═══ CORRECTIONS — at most ONE, and only if it is worth it ═══
- Maximum ONE per turn. Most turns: none. That is the normal case, not the exception.
- Only correct what would make a native stop and blink. Word order that breaks meaning, a missing verb, a word that means something else.
- NEVER correct: spelling, accent, a missing "the" or "a", a plural s, or anything that sounds like it may be the microphone mishearing him.
- "quote" must be the EXACT words he said, copied from his last message, nothing added and nothing paraphrased. If you cannot copy it word for word, send no correction at all.
- "fix" is how it is really said, same length or shorter.
- "why_es" is ONE line of Spanish, warm, with the reason a friend would give ("acá el inglés pone el verbo primero, siempre"). No jargon.

═══ OUTPUT ═══
STRICT JSON, nothing else, no markdown fences:
{"reply_en":"…","reply_es_apoyo":"…","correccion":{"quote":"…","fix":"…","why_es":"…"}}
Leave "correccion" out entirely (or null) when there is nothing worth correcting.

Note: his message may come from voice dictation and he is a beginner, so words arrive garbled or half in Spanish. Read his intent charitably and NEVER treat a likely mishearing as a mistake.`;

/** El brief de la escena: dónde estás, quién sos, y con qué palabras se juega. */
function briefEscena(escena: A1Scene, chunks: A1Chunk[]): string {
  const vocab = chunks.length ? chunks : escena.chunks;
  const lineas = vocab.map((c) => `- "${c.en}" (${c.es})`).join('\n');
  return [
    `SCENE: ${escena.title_es}`,
    `WHAT IS HAPPENING (in Spanish, for you): ${escena.scene_es}`,
    '',
    'THE LINES HE HAS PRACTICED — steer the scene so he naturally needs one or two of them, and reuse this vocabulary in your own replies:',
    lineas,
    '',
    'Never list these lines to him and never tell him which one to use. Just build the moment where it fits.',
  ].join('\n');
}

/** Historial → mensajes del chat. El apoyo en español NO viaja de vuelta: al
    modelo le basta su propio inglés, y mandarle las dos versiones lo empuja a
    contestar bilingüe dentro de `reply_en`. */
function aMensajes(historial: TurnoChat[]): ChatMessage[] {
  return historial.map((t) => ({
    role: t.de === 'user' ? ('user' as const) : ('assistant' as const),
    content: t.en,
  }));
}

/** Saca un string limpio de un campo que el modelo pudo mandar de cualquier forma. */
function texto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Un turno de Alfred vivo.
 * @param historial  la conversación hasta ahora; el ÚLTIMO turno debe ser del usuario
 *                   (o estar vacío, y entonces Alfred abre la escena).
 * @param escena     la escena que se está jugando.
 * @param opts.chunks  vocabulario a priorizar (por defecto, el de la escena).
 */
export async function turnoAlfred(
  historial: TurnoChat[],
  escena: A1Scene,
  opts: { chunks?: A1Chunk[] } = {},
): Promise<RespuestaAlfred> {
  const previos = aMensajes(historial);
  const ultimo = [...historial].reverse().find((t) => t.de === 'user');

  const mensajes: ChatMessage[] = [
    { role: 'system', content: `${SYSTEM_ALFRED}\n\n${briefEscena(escena, opts.chunks ?? [])}` },
    ...previos,
  ];

  /* Sin turnos previos no hay a qué contestar: se le pide explícitamente que
     ABRA. Sin esta línea el modelo devuelve un saludo genérico fuera de escena. */
  if (!previos.length) {
    mensajes.push({
      role: 'user',
      content: 'Open the scene with your first line. Greet him and set the moment. Remember: max 8 words.',
    });
  }

  const { content } = await callAPI('chat', mensajes, MAX_TOKENS);
  const parsed = parseJSON(content) as Record<string, unknown> | null;
  if (!parsed) throw new Error('Alfred se enredó — dale otra vez');

  const reply_en = texto(parsed.reply_en);
  if (!reply_en) throw new Error('Alfred se enredó — dale otra vez');

  return {
    reply_en,
    reply_es_apoyo: texto(parsed.reply_es_apoyo),
    correccion: filtrarCorreccion(parsed.correccion, ultimo?.en ?? ''),
  };
}

/* La aduana. Una corrección entra solo si viene completa Y si el quote se
   sostiene contra lo que el usuario dijo de verdad — el modelo no siempre
   copia, a veces recuerda mal, y de ahí salen los tachones fantasma. */
function filtrarCorreccion(bruto: unknown, dicho: string): CorreccionAlfred | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const c = bruto as Record<string, unknown>;

  const quote = texto(c.quote);
  const fix = texto(c.fix);
  // Acepta why_es y el why a secas: el modelo se come el sufijo cada tanto.
  const why_es = texto(c.why_es) || texto(c.why);
  if (!quote || !fix) return null;

  // Corregir algo por lo mismo no es corregir; es hacerle perder el tiempo.
  if (quote.toLowerCase() === fix.toLowerCase()) return null;

  if (!pareceCorreccionValida(quote, dicho)) return null;

  return { quote, fix, why_es };
}
