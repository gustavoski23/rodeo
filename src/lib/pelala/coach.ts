/* Coach de uso — el juez de "úsalo tú": ¿usaste el slang/phrasal verb como lo
   diría un nativo? Y si en vez de una frase le lanzas una pregunta ("¿esto se
   puede usar así?"), te la responde.

   POR QUÉ EXISTE ESTE ARCHIVO TAL CUAL: antes era un stub LOCAL —heurística de
   "¿aparece el término? ¿hay 4+ palabras? → ¡Perfecto!"— que en producción NUNCA
   corregía. Felicitaba cualquier cosa, incluso frases con errores o sin relación
   con el término: bastaba meter la palabra y estirar la frase para que dijera
   "así lo diría un nativo". Eso es exactamente lo que un alumno NO necesita.

   Ahora juzga la AI de verdad (el mismo /api/chat que el resto de la app) y es
   HONESTA: si está mal, lo dice y te da la versión que sí diría un nativo; si
   está bien, lo confirma sin inventar peros; y si preguntas, te contesta con un
   ejemplo. El historial del mini-chat viaja para que una pregunta de seguimiento
   ("¿y en pasado?") sepa de qué se venía hablando.

   Si la IA no está disponible se PROPAGA el error hacia la vista, que muestra un
   aviso honesto — nunca un falso "perfecto", que es justo el fallo que este
   archivo viene a enterrar. */

import { callJSON } from '@/lib/api';
import type { ChatMessage } from '@/lib/api';
import { ESPANOL_NEUTRO_ES } from '@/lib/espanol-neutro';
import type { SlangTerm } from '@/content/pelala/deck';

/* 'respuesta' es el estado NUEVO: el usuario no intentó una frase, hizo una
   pregunta, y la burbuja va neutra (ni celebración ni corrección). */
export type EstadoVeredicto = 'bien' | 'forzado' | 'falta' | 'respuesta';

export type Veredicto = {
  estado: EstadoVeredicto;
  mensaje: string;
};

/** Un turno previo del mini-chat, para dar contexto a las preguntas de seguimiento. */
export type CoachTurno = { rol: 'user' | 'tutor'; texto: string };

/* Techo de tokens corto a propósito: la respuesta es una burbuja de chat (1–3
   frases). Si el modelo pide más se está yendo por las ramas; callJSON solo
   reintenta a 8000 si se truncó de verdad (finish 'length'). */
const MAX_TOKENS = 900;

const ESTADOS: readonly string[] = ['bien', 'forzado', 'falta', 'respuesta'];

/** La ficha del término que ve el juez: qué es, qué significa, cómo se usa. */
function fichaTermino(term: SlangTerm): string {
  const tipo = term.kind === 'phrasal' ? 'phrasal verb' : 'slang';
  return [
    `- expression: "${term.term}" (${tipo})`,
    `- meaning (Spanish): ${term.gloss_es}`,
    `- how a native uses it: "${term.context_en}"`,
    `- natural forms that count as using it: ${term.accept.join(', ')}`,
  ].join('\n');
}

/** System del juez. En inglés (el modelo obedece mejor el esquema JSON así),
    pero el `mensaje` que emite va en español latino neutro. */
export function coachSystem(term: SlangTerm): string {
  return `You are a warm, sharp, bilingual English tutor. A Spanish-speaking learner (B2 heading to C1) is practicing ONE expression they just learned, in a tiny chat. You are HONEST: you never rubber-stamp. If what they wrote is wrong, unnatural, or does not really use the expression, you say so and show them how a native says it. If it is genuinely good, you confirm it briefly. If they ask you a QUESTION, you answer it for real.

═══ THE EXPRESSION BEING PRACTICED ═══
${fichaTermino(term)}

═══ READ what the learner just did and pick EXACTLY ONE "estado" ═══
If they wrote a sentence TRYING TO USE the expression, judge it with a native ear:
- "bien" — it genuinely works; a native would really say it. Confirm in one warm line. Do NOT invent problems that aren't there.
- "forzado" — the expression is present but it sounds off or forced (wrong preposition, odd context, unnatural collocation, wrong register). Give the natural version in English and one short reason.
- "falta" — there is a real grammar/meaning error, OR they did not actually use "${term.term}". Correct it: show the real English sentence and explain the fix in one line. If the expression is simply missing, tell them warmly to actually use it and hand them a model sentence with it.
If instead they ASKED A QUESTION (in Spanish or English — "¿se puede usar así?", "is it formal?", "¿cuál es la diferencia con X?"):
- "respuesta" — answer it concretely, with a quick real example. Never dodge, never grade a question as if it were a sentence.

═══ HOW TO WRITE "mensaje" ═══
- In Spanish, warm and human, SHORT: 1–3 sentences — it is a chat bubble on a phone.
- Put any English (the fix, an example) inside "quotes" within the Spanish.
- Talk like a bilingual friend, not a grammar book. No heavy jargon.
- NEVER praise something that is wrong. Honesty is the entire point of this feature.

${ESPANOL_NEUTRO_ES}

═══ OUTPUT ═══
STRICT JSON, no markdown fences, nothing else:
{"estado":"bien|forzado|falta|respuesta","mensaje":"…"}`;
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Historial → mensajes del chat: el usuario tal cual, el tutor como assistant. */
function aMensajes(historial: CoachTurno[]): ChatMessage[] {
  return historial.map((t) => ({
    role: t.rol === 'user' ? ('user' as const) : ('assistant' as const),
    content: t.texto,
  }));
}

/**
 * El juez de "úsalo tú". Llama a la IA y devuelve el veredicto ya normalizado.
 * @param term       el término en práctica.
 * @param frase      lo último que escribió el usuario (una frase, o una pregunta).
 * @param historial  turnos previos del mini-chat, SIN incluir `frase`.
 * @throws si la IA no está disponible o devuelve algo ilegible. La vista lo
 *         muestra como aviso; jamás como un falso "bien".
 */
export async function evaluarUso(
  term: SlangTerm,
  frase: string,
  historial: CoachTurno[] = [],
): Promise<Veredicto> {
  const mensajes: ChatMessage[] = [
    { role: 'system', content: coachSystem(term) },
    ...aMensajes(historial),
    { role: 'user', content: frase },
  ];

  const { parsed } = await callJSON('chat', mensajes, MAX_TOKENS);
  const d =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;

  const mensaje = d ? texto(d.mensaje) : '';
  if (!mensaje) throw new Error('No pude revisar eso ahora, intenta de nuevo');

  // Estado desconocido → 'respuesta' (neutro): ante la duda, nunca celebrar de
  // más. Un falso "bien" es exactamente lo que este archivo elimina.
  const bruto = d ? texto(d.estado).toLowerCase() : '';
  const estado = (ESTADOS.includes(bruto) ? bruto : 'respuesta') as EstadoVeredicto;

  return { estado, mensaje };
}
