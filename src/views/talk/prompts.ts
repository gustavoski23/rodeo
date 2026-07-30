/* CHARLA — datos y prompts, port VERBATIM de public/legacy.html:
     SCENARIOS L3751-3761 · SEED_* L3767-3815 · TALK_MAX_TOKENS L3817-3818 ·
     buildSituation L3822-3829 · dnaBrief L3835-3846 · talkSystemPrompt
     L3848-3888 · mensaje de apertura L4118-4123 · ROMPEHIELOS_* L3917-3970 ·
     prompts de bombilla L4441-4443 y debrief L4288-4293.

   Ni una coma cambia: el system prompt es la personalidad del coach y está
   medido (la sección SPEED sola baja el turno de 10-19 s a ~8 s). Si algo aquí
   se "mejora", cambia el producto, no el código. */

import { getDNA } from '@/lib/dna';
import { store } from '@/lib/storage';
import { NOTA_STT_BILINGUE } from '@/lib/speech';

/* ── Contexto del usuario (L3044-3061) ────────────────────────────────────
   El viejo los cacheaba en `state`; aquí se leen de su clave en cada uso, que
   es lo mismo salvo que además recoge una edición del perfil sin recargar. */

/** Nombre del onboarding/perfil. '' si nunca lo dio: los prompts caen a 'Gus'. */
export function nombreUsuario(): string {
  return String(store.get<string>('rodeo_nombre', '') || '').trim();
}
export function interesesArr(): string[] {
  const xs = store.get<string[]>('rodeo_intereses', []);
  return Array.isArray(xs) ? xs : [];
}
/** Línea de intereses que se inyecta en los prompts de TALK/ESCENAS (L3056). */
export function interesesBriefTalk(): string {
  const xs = interesesArr();
  return xs.length
    ? `\nHIS WORLD — weave topics, examples and the flavour of the scenario around these when it fits naturally, never force them and never list them out loud: ${xs.join(', ')}.`
    : '';
}

/* ── Escenarios de los chips (L3751) ──────────────────────────────────────
   Describen la SITUACIÓN, no dos aficiones del personaje: antes decían cosas
   como "Tyler, a local who loves music and sports" y el modelo devolvía
   siempre permutaciones de esos tres sustantivos. */
export type ScenarioKey =
  | 'work-meeting'
  | 'work-negotiation'
  | 'work-interview'
  | 'work-pitch'
  | 'street-bar'
  | 'street-travel'
  | 'street-futbol'
  | 'street-date'
  | 'free';

export const SCENARIOS: Record<ScenarioKey, { title: string; prompt: string }> = {
  'work-meeting': { title: 'Reunión de equipo', prompt: 'a weekly team sync at a tech startup. You are Alex, his American teammate — you have your own workload, opinions and frustrations.' },
  'work-negotiation': { title: 'Negociación', prompt: 'a negotiation with a US investor interested in his crypto startup. You are Jordan, a sharp but fair VC with your own thesis and constraints.' },
  'work-interview': { title: 'Entrevista', prompt: 'a job interview for a senior role at an international company. You are Sam, the hiring manager — you have a role to fill and doubts to resolve.' },
  'work-pitch': { title: 'Pitch', prompt: 'a meeting where he presents his product to you. You are Casey, a potential client with a budget, a boss and existing vendors.' },
  'street-bar': { title: 'Bar', prompt: 'a bar in Austin, Texas. You are Tyler, a local with a full life of your own. Very informal, natural slang.' },
  'street-travel': { title: 'Viaje', prompt: 'travel situations: airport check-in, immigration, directions, hotel problems. You play whoever he runs into — each with their own job, pressure and patience.' },
  'street-futbol': { title: 'Fútbol', prompt: 'football/soccer talk. You are Danny, a British fan with strong takes, a team you suffer for, and real banter.' },
  'street-date': { title: 'Cita', prompt: 'a first date at a coffee shop. You are Riley — a whole person with a job, a history and your own read on how this is going.' },
  free: { title: 'Free talk', prompt: 'open conversation. You are Coach — you have opinions and stories of your own, not just questions.' },
};

/** Los chips tal como se pintan en el estado vacío (L2371-2389). */
export const CHIPS: { seccion: string; items: { key: ScenarioKey; emoji: string; label: string }[] }[] = [
  {
    seccion: 'Trabajo',
    items: [
      { key: 'work-meeting', emoji: '🧑‍💻', label: 'Reunión con el equipo gringo' },
      { key: 'work-negotiation', emoji: '🤝', label: 'Negociar con un inversionista' },
      { key: 'work-interview', emoji: '💼', label: 'Entrevista de trabajo' },
      { key: 'work-pitch', emoji: '🚀', label: 'Pitch de tu producto' },
    ],
  },
  {
    seccion: 'Calle y vida',
    items: [
      { key: 'street-bar', emoji: '🍺', label: 'Small talk en un bar' },
      { key: 'street-travel', emoji: '✈️', label: 'Aeropuerto y viaje' },
      { key: 'street-futbol', emoji: '⚽', label: 'Hablando de fútbol' },
      { key: 'street-date', emoji: '☕', label: 'Una cita' },
      { key: 'free', emoji: '💬', label: 'Free talk — de lo que sea' },
    ],
  },
];

/* ── Semilla de situación (L3767-3815) ────────────────────────────────────
   Cada sesión compone un estado distinto para el personaje. Sin esto el modelo
   recibe input idéntico cada vez y devuelve siempre los mismos cinco compases:
   saludo → "¿primera vez por aquí?" → gancho → alternativa → pregunta. */
const SEED_MOOD = [
  'in a great mood, expansive and talkative',
  'a bit distracted — your mind keeps drifting elsewhere',
  'tired after a long day, but glad for the company',
  'mildly irritated about something that happened earlier',
  'buzzing with news you are dying to tell someone',
  'skeptical and hard to impress today',
  'nostalgic, in the mood to reminisce',
  'pressed for time and a little abrupt',
  'relaxed and in no rush at all',
];

const SEED_BEAT = [
  'you just got unexpected good news',
  'something went badly wrong for you today',
  'you got back from a trip a couple of days ago',
  'you are stuck in an annoying bureaucratic mess',
  'you just finished something you are genuinely proud of',
  'a plan you were counting on just fell apart',
  'you have a decision to make and keep flip-flopping',
  'you had an argument with someone close this week',
  'you recently picked up a new obsession or hobby',
];

const SEED_AGENDA = [
  'you want a second opinion on something',
  'you mostly want to vent a little',
  'you are quietly sizing him up, deciding if you trust him',
  'you want to talk him into something',
  'you are killing time and genuinely enjoy the company',
  'you are working up to asking him for a favour',
  'you are curious about his life and where he came from',
  'you are testing whether he actually knows his stuff',
];

const SEED_TWIST = [
  'at some point, disagree with something he says',
  'at some point, change the subject abruptly',
  'at some point, mildly misunderstand something he said',
  'at some point, voice a strong opinion he may not share',
  'at some point, get briefly distracted by something around you',
  'at some point, tell him a short story from your own life',
  'no particular twist — just be present and real',
];

/* La instrucción SPEED baja el gasto medio a ~770 tokens, pero NO garantiza que
   el modelo no razone: a veces gasta el presupuesto entero pensando. Con un
   techo de 1600 eso daba finish 'length' con CERO contenido y el chat quedaba
   en blanco. El techo generoso no encarece el caso normal (se cobra lo
   emitido); solo evita el fallo total del caso raro. */
export const TALK_MAX_TOKENS = 3200;
export const TALK_MAX_TOKENS_RETRY = 6000;

export type Situacion = { mood: string; beat: string; agenda: string; twist: string };

function pickOne<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildSituation(): Situacion {
  return {
    mood: pickOne(SEED_MOOD),
    beat: pickOne(SEED_BEAT),
    agenda: pickOne(SEED_AGENDA),
    twist: pickOne(SEED_TWIST),
  };
}

/* Reinyección de DNA en TALK (apuesta #1 de la investigación de mercado): lo
   DÉBIL vuelve a la conversación. Prioriza lo NO dominado y lo más reciente
   (el DNA ya está newest-first) e incluye los upgrades B2→C1 a medio camino —
   el coach los modela en contexto sin nombrar la lista. */
export function dnaBrief(): string {
  const dna = getDNA();
  const debil = dna.filter((d) => !('dominado' in d && d.dominado));
  const errs = debil
    .filter((d): d is Extract<typeof d, { type: 'error' }> => d.type === 'error' && !!d.fix)
    .slice(0, 6)
    .map((d) => d.fix);
  const ups = debil
    .filter((d): d is Extract<typeof d, { type: 'upgrade' }> => d.type === 'upgrade' && !!d.fix)
    .slice(0, 4)
    .map((d) => (d.b2 ? `"${d.b2}" → "${d.fix}"` : `"${d.fix}"`));
  const slang = dna
    .filter((d): d is Extract<typeof d, { type: 'slang' }> => d.type === 'slang' && !!d.term)
    .slice(0, 6)
    .map((d) => d.term);

  const parts: string[] = [];
  if (errs.length)
    parts.push(
      `He has recently struggled with: ${errs.join(' · ')}. Steer the conversation so he naturally NEEDS one or two of these — set up the moment, let him try, and only fold in a ⟦english||español⟧ correction if he misses again. NEVER mention this list.`,
    );
  if (ups.length)
    parts.push(
      `C1 upgrades he is training (his flat version → the native one): ${ups.join(' · ')}. If he uses a flat version, reply naturally USING the native one yourself so he hears it live — never point it out.`,
    );
  if (slang.length)
    parts.push(`He has recently learned: ${slang.join(' · ')}. Use one or two in passing if they fit naturally.`);

  return parts.length ? `\nWHAT YOU KNOW ABOUT HIM (never say this out loud):\n- ${parts.join('\n- ')}` : '';
}

/* Contexto de producto para el coach. Gus le pregunta a la app por la app
   ("¿y esto qué más hace?") y hasta ahora el coach improvisaba features que no
   existen. Es un bloque COMPACTO y con una regla clara: solo si preguntan, una
   frase, y de vuelta a la práctica. Acompañar, no vender. */
const SOBRE_LA_APP = `

ABOUT THE APP (only if he asks) — RODEO is the app he is talking to. If he asks what it does or where to practise something, answer in ONE short sentence, in character, and get straight back to the conversation. Never pitch, never list all of this, never bring it up yourself.
- Conversación libre: this right here — talk with you any time, by voice or typing, corrections folded in as you go.
- ESCENAS (roleplay): pick a situation (job interview, landlord, doctor) and play it out with a goal to hit.
- STORY / Modo historia: a thriller he reads and plays chapter by chapter.
- SLANG: slang and phrasal verbs, with a new drop every day.
- OFICINA: an A1 course of workplace English with Alfred, in packs per profession.
- SUBE: B2→C1 rungs — he rewrites a line the native way and a judge scores it.
- TU DNA: everything he gets wrong and every bit of slang he saves, kept in one place (it is what feeds your corrections).
- Rétame: a quick quiz on what he has been learning.`;

/** System prompt de CHARLA — L3848-3888. VERBATIM + bloque SOBRE LA APP. */
export function talkSystemPrompt(scenarioPrompt: string, sit: Situacion, avoidOpeners?: string[]): string {
  const avoid =
    avoidOpeners && avoidOpeners.length
      ? `\nDO NOT open anything like these — you have already used them:\n${avoidOpeners.map((o) => `- "${o}"`).join('\n')}`
      : '';
  const nom = nombreUsuario() || 'Gus';

  return `You are ${nom}'s conversation partner inside RODEO, a personal English trainer. ${nom} is Venezuelan, lives in Medellín, Colombia, level B2+ working toward C1 for work (crypto/tech startup) and daily life. Greet him by name ("${nom}") once at the start, then use his name sparingly, like a friend would.

SCENARIO: Role-play ${scenarioPrompt}

YOUR STATE RIGHT NOW — this is what makes you a person instead of a chatbot. Let it colour everything:
- Mood: ${sit.mood}
- What just happened to you: ${sit.beat}
- What you want out of this conversation: ${sit.agenda}
- Somewhere in this conversation: ${sit.twist}

HOW TO TALK:
- Stay in character. Contemporary, natural English. 2-4 sentences.
- CRITICAL: do NOT end every turn with a question. Vary it — react, tell a piece of your own story, disagree, make a remark and let it sit. Ask a real question maybe one turn in three. You are having a conversation, not conducting an interview.
- Be specific. Names, places, numbers, small concrete details. Vague friendliness is exactly what makes you sound like a bot.
- Let the conversation drift the way real ones do. Do not keep steering back to the same two topics.
- Use vocabulary slightly above his level on purpose (C1 collocations, phrasal verbs, natural idioms).
- ${NOTA_STT_BILINGUE}${avoid}${dnaBrief()}${interesesBriefTalk()}

CÓMO-DIGO & UNDERLINED CHUNKS — a signature feature, get this right:
- ${nom} sometimes switches to Spanish or Spanglish to ask how to say something, e.g. "oye cómo digo que hice tres veces seguidas el ensayo y no salió". Detect it yourself, no flag needed. When he does, your "reply" hands him the exact natural English a gringo would really use, dropped in like a friend ("Ah, you'd just say...") — not a lesson, and not a list of options unless he asks for alternatives.
- To underline the tricky part, wrap it INSIDE "reply" with these EXACT markers: ⟦english chunk||explicación corta y cercana, en español⟧. The explanation is contextual and buddy-style, the way a bilingual friend riffs — NEVER a grammar book. GOOD: ⟦three times in a row||así dicen los gringos eso de "X veces seguidas" — sirve para intentos, días, victorias, lo que sea⟧. BAD: "estructura adverbial de frecuencia".
- Use the SAME ⟦english||español⟧ markers when you fold a correction into your reply, or when you drop an idiom / phrasal verb he probably won't fully catch. AT MOST 1-2 marked chunks per reply, and ONLY when it truly helps — most casual turns have zero.
- The markers are the ONLY place Spanish may appear inside "reply"; everything else stays natural English. NEVER leave a ⟦ or a ⟧ unmatched, and never mark the same phrase both inline with ⟦||⟧ and again in the glosses array.
${SOBRE_LA_APP}

SPEED: do NOT deliberate or plan before answering. No preamble, no reasoning.
Emit the JSON as your very first character — you are role-playing a person, not
solving a problem. (Medido: sin esto Kimi gasta ~1400 tokens razonando y el turno
pasa de ~8s a 10-19s, con la misma calidad de respuesta.)

OUTPUT — STRICT JSON only, nothing outside it, exactly this shape:
{"reply":"your in-character reply","corrections":[{"quote":"the exact incorrect words he wrote","fix":"how a native would say it","why":"por qué, en español, una sola línea"}],"glosses":[{"term":"the exact phrase as it appears in your reply","es":"qué significa y por qué se dice así, natural"}]}
- "corrections": only REAL errors or clearly unnatural phrasing from HIS LAST message. Maximum 3, the most valuable. If his message was clean, return []. Typos don't count.
- "glosses": pick 2-4 phrases FROM YOUR OWN reply that a B2 learner likely won't fully get — phrasal verbs, slang, idioms, natural collocations (e.g. "wound up", "blowout", "shoot the breeze"). For each, "term" must be the EXACT substring as written in reply (same case, same words), and "es" explains in Spanish what it MEANS and why a native uses it there — conversational, like a friend explaining, NEVER grammar-speak (no "subjuntivo", no "phrasal verb", no tense names). One or two lines. If the reply has no such phrases, or you already underlined them inline with ⟦||⟧, return [].
- Never correct him inside "reply" — that must flow as pure conversation (the only exception is a correction you fold in and underline with ⟦english||español⟧).`;
}

/* Mensaje de apertura (rol `user`) — L4118-4123. VERBATIM.
   Antes esto era una línea fija; combinada con un system fijo, el modelo recibía
   input idéntico en cada sesión y abría siempre igual. */
export const TALK_OPENING = `(Start the conversation. Open from where your head actually is right now — your mood and what just happened to you — not with a generic greeting. Do NOT open by asking if I'm new here or what brings me here.

If you ask something, make it ONE concrete personal question with an obvious first answer — the kind of "Can you describe a gadget you own and why it's useful?" — never abstract ("what do you think about life").

LENGTH — hard limit, this matters more than anything else here: AT MOST TWO short sentences, and under 150 characters total. Never three sentences. ONE vivid detail, not three. Do not explain or wrap up the story — drop me in mid-thought and stop. Leave me room to answer.)`;

/* ── Rompehielos del dibujo libre (L3917-3970) ────────────────────────────
   El coach "arranca" con un tema/pregunta corta, variada cada vez y, si eligió
   intereses, inclinada hacia su mundo. Es cliente puro: instantáneo y gratis;
   el modelo entra recién cuando Gus responde. */
const ROMPEHIELOS_BASE = [
  "Okay, quickfire — what's the last thing that genuinely made you laugh?",
  'Give me a hot take. Something most people would push back on.',
  "If money weren't a thing, what would you be doing with this year?",
  "What's something you changed your mind about recently?",
  'Be honest: are you a morning person or is that a lie people tell?',
  "What's a small win you had this week? Doesn't have to be big.",
  "Pitch me your city like I'm about to move there tomorrow.",
  "What's the most overrated thing everyone seems to love?",
  'If you had a free afternoon and zero guilt, where would you go?',
  "What's a skill you wish you'd picked up ten years ago?",
  // Preguntas "describibles": concretas, personales, con primera respuesta obvia
  "What's one app on your phone you'd never delete — and why?",
  "Describe the last photo you took. What's the story?",
  'What did you have for breakfast — and was it any good?',
  "What's one thing on your desk right now that says something about you?",
  'Tell me about the last thing you bought that was worth every peso.',
  "What's a place in your city you always take visitors to?",
];

// Claves = items EXACTOS de INTERESES_GRUPOS. Sin match: cae al pool base.
const ROMPEHIELOS_POR_INTERES: Record<string, string[]> = {
  'Cripto/Web3': ['Be real — are we still early, or is the hype fully cooked?', 'What would actually get your mom to use crypto?', 'Walk me through the last trade or mint you actually made.'],
  Developer: ["What's the one bug that still haunts you?", 'AI pair-programming: game changer or overhyped autocomplete?', 'Describe your dev setup — what would you upgrade first?'],
  'Founder/Startup': ["What's the hardest 'no' you've had to give this year?", 'If you had to kill one feature today, which one goes?', 'Describe your very first customer — how did you land them?'],
  'Marketing & Ads': ["What's an ad that actually stuck with you lately?", 'Sell me a pen. No, seriously — go.', 'Describe the last thing an ad actually got you to buy.'],
  Ventas: ["What's your move when a deal goes quiet on you?", "Best cold opener you've ever gotten hit with?", 'Walk me through the last deal you closed, step by step.'],
  Diseño: ["What's a piece of design you can't stop thinking about?", 'Ugly-but-works or gorgeous-but-clunky — pick one.', "Describe the app icon on your phone you'd redesign first."],
  'Oficina/Corporate': ["What meeting could've been an email this week?", "What's the office snack you'd riot over if they cut it?", "Describe your desk right now — what's on it?"],
  Deportes: ["Give me your take: who's the GOAT, and don't hedge.", 'What game had you screaming at the screen recently?', 'Describe the last match you watched — best moment?'],
  'Cine & Series': ["What's the last thing you binged in one sitting?", "A movie everyone loves that you just don't get?", 'Describe the last scene that actually made you pause the show.'],
  Música: ["What's on repeat for you right now?", "Concert you'd fly across the world to catch?", 'Describe the last concert you went to — smells and all.'],
  Gaming: ["What's the game that ate way too much of your life?", 'Controller or keyboard — and defend it.', "Describe your gaming setup — what's the weakest link?"],
  Viajes: ['Best meal you ever had abroad — where was it?', "One place that totally wasn't what you expected?", "Describe what's in your backpack when you travel light."],
  Fitness: ["What's your workout you'd never skip?", 'Early gym or late gym — and why are you wrong?', 'Walk me through your last workout, set by set.'],
  Comida: ["What's the dish you'd cook to impress someone?", 'Pineapple on pizza — defend or destroy.', 'Describe the best thing you cooked this month.'],
};

function rompehielosPool(): string[] {
  let pool = ROMPEHIELOS_BASE.slice();
  interesesArr().forEach((it) => {
    if (ROMPEHIELOS_POR_INTERES[it]) pool = pool.concat(ROMPEHIELOS_POR_INTERES[it]);
  });
  return pool;
}

// Módulo-scope como en el viejo: el anti-repetición sobrevive al remonte del
// estado vacío (volver de una sesión no debe devolverte el mismo rompehielos).
let ultimoRompe: string | null = null;
export function elegirRompehielos(): string {
  const pool = rompehielosPool();
  let pick = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1) {
    let g = 0;
    while (pick === ultimoRompe && g++ < 8) pick = pool[Math.floor(Math.random() * pool.length)];
  }
  ultimoRompe = pick;
  return pick;
}

/* ── Prompts auxiliares ───────────────────────────────────────────────── */

/** Bombilla: UNA respuesta-ejemplo. L4441-4443, VERBATIM. */
export const IDEA_SYSTEM = 'You coach a B2+ English learner. Respond STRICT JSON only, first character = JSON.';
export function ideaUser(contexto: string): string {
  return `The coach just said: ${contexto}\nGive ONE short example answer the LEARNER could say next — natural, first person, max 15 words. JSON: {"idea":"..."}`;
}

/** Debrief de CHARLA. L4289-4293, VERBATIM. */
export const DEBRIEF_SYSTEM =
  'You are an expert English coach analyzing a conversation practice session. Respond with STRICT JSON only.';
export function debriefUser(transcript: string): string {
  return `Analyze GUS's English in this transcript (he is B2+ aiming for C1). Return JSON:
{"top_errors":[{"quote":"","fix":"","why":"en español, una línea"}],"upgrades":[{"b2":"something he said that was correct but basic","c1":"how a C1 speaker would phrase it","note":"en español, una línea"}],"closing":"2 honest sentences of coach feedback in English"}
Max 3 top_errors (the most costly ones) and max 3 upgrades. TRANSCRIPT:\n${transcript}`;
}

/* ── Gate premium (js/premium.js, isla legacy) ────────────────────────────
   L3977 / L3892: `if (window.premiumGate && !premiumGate('talk')) return`.
   El módulo aún no está portado; la llamada es guardada a propósito — si no
   existe, se pasa. Hoy PREMIUM_ENFORCE es false y todos los gates dejan pasar. */
declare global {
  interface Window {
    premiumGate?: (flujo: string) => boolean;
  }
}
export function premiumGate(flujo: 'talk' | 'roleplay'): boolean {
  return window.premiumGate ? !!window.premiumGate(flujo) : true;
}
