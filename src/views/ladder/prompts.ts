import type { ChatMessage } from '@/lib/api';
import { NOTA_STT_BILINGUE } from '@/lib/speech';
import { ESPANOL_NEUTRO_ES } from '@/lib/espanol-neutro';
import { areaUsuario, nombreUsuario } from '@/views/talk/prompts';

/* Prompts de SUBE — VERBATIM de public/legacy.html:6782 y 6905-6983.
   No se tocan ni una coma: cambiar el texto cambia lo que devuelve el modelo,
   y el filtro EX_B2 de abajo depende del ejemplo literal. */

/** LADDER_EXAMPLE (L6782) — es un string JSON YA serializado; se interpola crudo. */
export const LADDER_EXAMPLE =
  '[{"b2":"I think it\'s good.","context_en":"giving your take on a proposal in a meeting","c1":"I\'m sold on it — it\'s got real legs.","swap":"it\'s good→it\'s got real legs","register":"pro","note_es":"\'has real legs\' = tiene futuro real; suena a alguien que decide, no que opina."},{"b2":"The meeting was very long.","context_en":"venting to a coworker afterward","c1":"That meeting really dragged on.","swap":"was very long→dragged on","register":"casual","note_es":"\'drag on\' es el phrasal natural para algo que se hace eterno."},{"b2":"That\'s a big problem.","context_en":"flagging a risk to your team","c1":"That\'s a real sticking point.","swap":"big problem→sticking point","register":"neutral","note_es":"\'sticking point\' = el punto donde todo se traba."}]';

/* El modelo devuelve a veces el ejemplo del prompt tal cual. Sin este filtro
   el usuario ve "I think it's good." una y otra vez (trampa §9.6). */
export const EX_B2 = ["i think it's good.", 'the meeting was very long.', "that's a big problem."];

export type Veta = 'trabajo' | 'calle' | 'fallos' | 'own';

/* Deja de ser una constante para dejar de ser el perfil de UNA persona: decía
   «for Gus (Venezuelan in Medellín, aiming C1 for crypto/tech and daily life)».
   El área sale del onboarding y la ubicación no se sustituye por otra — no se
   pregunta, así que no se nombra. */
function sysGenerador(): string {
  const area = areaUsuario();
  const para = area ? ` aiming C1 for ${area} and daily life` : ' aiming C1 for work and daily life';
  return `You upgrade B2 English to precise, natural, idiomatic C1 for a Spanish-speaking learner,${para}. Never thesaurus-dumping, never textbook. The C1 must be genuinely more precise/idiomatic, NOT just longer. ${ESPANOL_NEUTRO_ES} STRICT JSON only.`;
}

/** startVeta L6905-6910. `avoid` son los últimos 60 b2 vistos o 'ninguna'. */
export function msgsGenerador(veta: Veta, avoid: string, ownPhrase?: string): ChatMessage[] {
  const area = areaUsuario();
  const target =
    veta === 'own'
      ? `Genera 3 versiones-peldaño C1 de ESTA frase del usuario: "${ownPhrase}".`
      : `Genera exactamente 5 peldaños de registro para la veta ${
          veta === 'trabajo'
            ? `TRABAJO (reuniones, negociación${area ? `, ${area}` : ''})`
            : 'CALLE (vida diaria, casual, social)'
        }.`;
  return [
    { role: 'system', content: sysGenerador() },
    {
      role: 'user',
      content: `${target}\nYa vistos, NO repitas: ${avoid}.\nReturn a STRICT JSON array. Each object keys: b2, context_en, c1, swap ("old→new"), register ("casual"|"neutral"|"pro"), note_es (español, una línea).\nInclude this FILLED EXAMPLE — NEVER reuse its content, generate fresh:\n${LADDER_EXAMPLE}`,
    },
  ];
}

/** Juez del intento — revealRung L6980-6983. La nota bilingüe va pegada al
    final del system tras un espacio, como en el viejo. */
export function msgsJuez(b2: string, c1: string, attempt: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'You judge whether a B2 learner reached C1 with their upgrade attempt. Accept valid synonyms — there is no single right answer. STRICT JSON only. ' +
        NOTA_STT_BILINGUE,
    },
    {
      role: 'user',
      content: `B2: "${b2}". Ideal C1: "${c1}". ${nombreUsuario() || 'The learner'} wrote: "${attempt}". Return STRICT JSON {"verdict":"nailed|close|off","one_liner_es":"","better":""}. ${ESPANOL_NEUTRO_ES} Example: {"verdict":"close","one_liner_es":"Subiste el registro, pero 'has potential' suena a informe; 'has real legs' es más natural.","better":"I'm sold on it — it's got real legs."}`,
    },
  ];
}

/* `better` se pide pero NUNCA se pinta (spec §5.2). Se tipa igual para no
   perder el contrato, pero no se inventa un render para él. */
export type Judge = { verdict: 'nailed' | 'close' | 'off' | string; one_liner_es: string; better: string };
