/* ESCENAS (roleplay teatral) — datos y prompts, port VERBATIM de
   public/legacy.html:
     RP_CANONICO L7081-7089 · RP_MAX_TOKENS/RETRY/RP_OPENING L7091-7093 ·
     rpErrMsg L7105-7115 · rpSystemPrompt L7117-7140 · prompt de generación
     L7248-7256 · prompt de sorpréndeme L7277-7282 · prompt del debrief
     L7517-7521 · interesesLineaDrop L3062.

   Igual que en prompts.ts (CHARLA): ni una coma cambia. El system prompt es
   quien decide si el vendedor te infla el precio o se rinde a la primera, y
   esa fricción es el producto. */

import { interesesArr, interesesBriefTalk, nombreUsuario, retratoAlumno } from './prompts';
import { NOTA_STT_BILINGUE } from '@/lib/speech';
import { ESPANOL_NEUTRO_EN } from '@/lib/espanol-neutro';

/** Una escena jugable. Las generadas traen solo estos 5 campos (§7.4). */
export type Escena = {
  id?: string;
  title: string;
  emoji?: string;
  role_es: string;
  goal_es: string;
  obstacle_es: string;
  canonico?: boolean;
};

/* El clásico de la casa. Único escenario que NO es data del modelo: siempre
   está, aunque la generación falle o no haya red para pedirla. */
export const RP_CANONICO: Escena = {
  id: 'princesa',
  title: 'La princesa y el azafrán',
  emoji: '👑',
  role_es: 'Eres una princesa que llega sola al mercado de tu ciudad.',
  goal_es: 'Comprar azafrán a un precio justo, sin que te tomen el pelo.',
  obstacle_es:
    'El vendedor sabe que tienes plata de sobra y, como el azafrán escasea, quiere inflarte el precio.',
  canonico: true,
};

/* Techos de la sesión. Más bajos que los de CHARLA (3200/6000) porque el
   narrador no lleva `corrections`: el JSON es más corto. */
export const RP_MAX_TOKENS = 2200;
export const RP_MAX_TOKENS_RETRY = 5000;

export const RP_OPENING = `(Open the scene now. In 2-4 vivid sentences set the place, the mood, and drop me into my role, then have the character speak their FIRST line straight to me — pointed enough that I have to answer. Do NOT act or speak for me. Keep it tight, and remember the exact JSON shape.)`;

/* El proveedor a veces devuelve su JSON de rate-limit crudo como mensaje de
   error; en la portada eso se lee como "roto". Lo traducimos a algo humano.
   OJO: CHARLA NO usa esto — muestra `'Error: ' + err.message` tal cual
   (spec §8 trampa 9). La asimetría es del legacy, se porta. */
export function rpErrMsg(err: unknown): string {
  const m = String((err as Error)?.message || err || '');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Sin conexión — tu escena sigue aquí, reintenta cuando vuelva el internet';
  }
  if (/failed to fetch|networkerror|load failed/i.test(m)) {
    return 'Se cayó la conexión — reintenta en un momento';
  }
  if (/rate.?limit/i.test(m)) return 'El modelo creativo está saturado ahora mismo — dale a reintentar en un momento';
  return m || 'Algo salió mal';
}

/** Línea de intereses para los prompts de GENERACIÓN de escenas (L3062). */
export function interesesLineaDrop(): string {
  const xs = interesesArr();
  return xs.length
    ? `\nIntereses del lector (elige el ángulo y los ejemplos que le hablen, sin nombrarlo nunca en el texto): ${xs.join(', ')}.`
    : '';
}

/* System prompt de ESCENAS — L7117-7140. Deja de ser VERBATIM en un punto y
   solo en uno: el jugador. Decía «The player is Gus: Venezuelan, lives in
   Medellín, … works in crypto/tech» y el nombre "Gus" aparecía doce veces a
   mano. Eso convertía cada escena de cualquier otro usuario en una escena de
   Gus. Ahora el nombre y el retrato salen del onboarding. El resto del prompt
   —la fricción, que es el producto— no se toca. */
export function rpSystemPrompt(sc: Escena): string {
  const nom = nombreUsuario() || 'Gus';
  return `You are the NARRATOR and EVERY CHARACTER of an interactive theatre game inside RODEO, a personal English trainer. The player is ${nom}. ${retratoAlumno()} This is playable narrative theatre — you run the world and everyone in it EXCEPT ${nom}, who acts out a role IN ENGLISH.

THE SCENE
- Title: ${sc.title}
- ${nom}'s role: ${sc.role_es}
- ${nom}'s goal: ${sc.goal_es}
- The obstacle / the tension: ${sc.obstacle_es}${interesesBriefTalk()}

HOW YOU PLAY
- Paint vivid, sensory scenes in 2-4 sentences, then let a character speak. Voice each character as a real person with self-interest, mood and pushback — never make the goal easy, never fold at the first polite request.
- React to what ${nom} actually says and let it move the story. If he plays it well, the character softens or the plot opens; if he fumbles, the tension rises — but never break the fiction to lecture him.
- Contemporary, natural English (C1 collocations, phrasal verbs, real idioms). Put spoken lines in quotes. NEVER narrate ${nom}'s own words or actions for him — leave him room to act.
- ${NOTA_STT_BILINGUE}

${ESPANOL_NEUTRO_EN}

OUTPUT — STRICT JSON, your very first character must be '{':
{
  "reply": "the scene + the character's spoken line, in natural English. To underline a genuinely useful phrase, wrap it INLINE with these EXACT markers: ⟦english chunk||explicación corta y cercana en español⟧ — only phrases that help ${nom} negotiate, persuade or sound natural, AT MOST 1-2 per turn, often zero.",
  "glosses": [ up to 3 items {"term","es"} chosen FROM your own reply — phrasal verbs, idioms or collocations a B2 won't fully catch. "term" MUST be an exact substring of reply (same case, same words). "es" explains like a bilingual friend, never grammar-speak (no 'subjuntivo', no tense names). [] if none, or if you already underlined them inline. ],
  "consejo": "OPTIONAL theatrical aside in SPANISH — a director whispering from the wings. When it helps, hand ${nom} 1-2 concrete English phrases he could USE right now to negotiate, stand his ground or apply strategic courtesy, e.g. Para no ceder de una: \"That's a bit steep — what's your best price?\". Empty string on most turns; include it ONLY when it truly helps him take the next move."
}
The ⟦||⟧ markers are the ONLY place Spanish may appear inside "reply". NEVER leave a ⟦ or a ⟧ unmatched, and never repeat a phrase both inline with ⟦||⟧ and again in the glosses array.`;
}

/* ── Generación de la portada (L7248-7256) ─────────────────────────────── */

export const GEN_SYSTEM =
  'You design vivid, playable roleplay THEATRE scenarios for an English learner. Respond with STRICT JSON only.';

export function genUser(avoid: string): string {
  const nom = nombreUsuario() || 'Gus';
  return `Design exactly 3 fresh, dramatic roleplay scenes for ${nom}. ${retratoAlumno()} In each, he plays a ROLE with a clear GOAL and a real OBSTACLE — someone or something pushing back, with genuine stakes and friction. Like the canonical example: a princess at the market haggling for scarce saffron against a vendor who smells her money.
Not everyday small talk — negotiation, persuasion, standing your ground, charm or nerve under pressure. Make them varied and a little surprising.${interesesLineaDrop()}
Avoid repeating these titles: ${avoid}.
Return a STRICT JSON array of exactly 3 objects, each with keys:
{"title":"título corto y evocador en español (máx 5 palabras)","emoji":"un emoji que encaje","role_es":"quién es ${nom} en la escena, 1 frase","goal_es":"qué quiere lograr, 1 frase","obstacle_es":"el obstáculo o la tensión: quién se le opone y por qué, 1 frase"}
Emit the JSON array as your very first character, nothing before it.`;
}

/* ── Sorpréndeme (L7277-7282) ──────────────────────────────────────────── */

export const SORPRESA_SYSTEM =
  'You invent one vivid, surprising roleplay THEATRE scenario for an English learner. Respond with STRICT JSON only.';

export function sorpresaUser(avoid: string): string {
  const nom = nombreUsuario() || 'Gus';
  return `Invent ONE unexpected, dramatic roleplay scene for ${nom}. ${retratoAlumno()} He plays a role with a clear goal and a real obstacle pushing back — stakes and friction, not small talk. Surprise him; go somewhere unusual.${interesesLineaDrop()}
Avoid these titles: ${avoid}.
Return a STRICT JSON object: {"title":"título corto en español","emoji":"un emoji","role_es":"quién es ${nom}, 1 frase","goal_es":"qué quiere, 1 frase","obstacle_es":"el obstáculo, 1 frase"}
Emit the JSON object as your very first character.`;
}

/* ── Debrief de la escena (L7517-7521) ─────────────────────────────────── */

export const RP_DEBRIEF_SYSTEM =
  'You are an English coach reviewing a roleplay theatre session. Respond with STRICT JSON only.';

export function rpDebriefUser(transcript: string): string {
  const nom = nombreUsuario() || 'The learner';
  return `${nom} (B2+ heading to C1) just acted out this scene in English. Pull out 2-3 things genuinely worth keeping — natural English phrases he could have used, or used well, to negotiate / persuade / stand firm / sound native in THIS situation. Return JSON:
{"aprendizajes":[{"en":"the English phrase or chunk","es":"para qué sirve y cuándo usarla, en español, una línea"}],"closing":"2 honest sentences in Spanish about how he handled the scene"}
${ESPANOL_NEUTRO_EN}
Max 3 aprendizajes. TRANSCRIPT:\n${transcript}`;
}

/** ¿Es un objeto con los 4 campos que hacen jugable una escena? (L7253/L7288) */
export function escenaValida(x: unknown): x is Escena {
  const c = x as Escena | null;
  return !!(c && c.title && c.role_es && c.goal_es && c.obstacle_es);
}
