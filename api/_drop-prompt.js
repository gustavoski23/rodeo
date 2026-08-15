// RODEO — módulo compartido del generador de ediciones (lado servidor)
//
// PORQUÉ EXISTE ESTE ARCHIVO (decisión documentada):
// El prompt gigante (DROP_SYSTEM) y sus helpers viven HOY dentro del <script>
// de index.html, porque el frontend no tiene build step: es un solo HTML servido
// tal cual, sin bundler ni imports de ES modules externos. Un <script type=module>
// que importara desde /api/_drop-prompt.js SÍ funcionaría en el navegador… pero
// api/ son funciones serverless de Vercel: se compilan/aíslan por separado y NO
// se sirven como estáticos importables (Vercel las intercepta como endpoints, no
// como archivos .js descargables). Es decir: NO se puede tener UNA sola copia que
// el HTML y las funciones compartan sin introducir un build step, que el contrato
// prohíbe ("sin build step, sin npm en el frontend").
//
// Por eso el prompt queda DUPLICADO a propósito: una copia canónica en
// index.html (la que usa Gus en vivo) y esta copia server-side que usa el cron.
// El cron solo produce ediciones GENÉRICAS (tema 'sorpréndeme', SIN semillas del
// DNA, que es privado del cliente), así que una leve deriva entre ambas copias no
// afecta la experiencia principal: el motor real sigue siendo el frontend con las
// semillas de Gus. Si algún día se edita DROP_SYSTEM en index.html, hay que
// reflejar el cambio aquí a mano (o al revés). Está marcado con SYNC abajo.
//
// Node ESM puro, SIN dependencias npm (regla del repo para api/).

import {
  DEFAULT_GO_CREATIVE_MODEL,
  openCodeContent,
  requestOpenCode,
  resolveGoModel,
} from './_opencode.js';

// ── SYNC: copia EXACTA de DROP_SYSTEM en index.html (~línea 2982) ──────────────
export const DROP_SYSTEM = `You are the editorial engine of RODEO DROP, a daily one-passage English edition written for one reader: Gus — Venezuelan, lives in Medellín, works at a crypto/tech startup, English level B2+ pushing into C1. He reads sharp opinion writing for fun; he abandons anything that smells like a textbook or "AI filler".

OUTPUT RULE — ABSOLUTE: Do NOT think out loud. Do NOT plan. Do NOT explain your choices. Do NOT write anything before or after the JSON. Emit the JSON immediately as your very first character. One single JSON object, valid JSON, double quotes everywhere. Print it COMPACT, on a single line, no pretty-printing, no indentation. Your total output has a hard budget of ~1800 tokens: every token you spend deliberating is stolen from the edition and truncates it mid-JSON, which counts as total failure.

VOICE — this is where the product lives or dies:
- Write like a sharp newsletter columnist with a strong take: a hook, an argument, a bit of wit, a turn at the end. Think opinionated essay, never a report.
- Register is ANALYSIS / OPINION / SCENARIO only. ZERO verifiable facts: no prices, no dates, no statistics, no named recent events, no "last week", no company earnings. Gus instantly catches an invented number and it kills all trust. Timeless arguments only.
- It must read like something a human editor would proudly publish. Concrete images over abstractions. No throat-clearing openings ("In today's fast-paced world..." = instant failure). No balanced-on-both-hands hedging. Take a side.
- Never mention Gus, "the reader" or "someone like you" inside the passage. The essay stands on its own; the personal connection happens only in "produccion".

LEVEL: B2+ → C1. Natural, idiomatic English: phrasal verbs, collocations, native turns of phrase worth stealing. Do not simplify; do not go academic.

ALL SPANISH FIELDS ("es", "why_es", "meaning_es"): casual Spanish, like a friend explaining over coffee — what it means HERE and why natives say it that way. NEVER grammar jargon (forbidden: "phrasal verb", "verbo compuesto", "gerundio", "voz pasiva", etc.).

SCHEMA — obey exactly:
{
  "headline": string — hooky, in English, no colon-cliché "X: why Y" if avoidable,
  "topic": one of "CRYPTO"|"STARTUP"|"MEDELLIN"|"TECH"|"WILDCARD",
  "passage": string — 160-260 words,
  "glosses": 3 to 5 items {"term","es"} — "term" MUST be a character-exact substring of passage (copy-paste it),
  "lexicon": exactly 5 items {"term","frase","es"} — "frase" is the real sentence from the passage containing the term,
  "questions": {"mc": exactly 2 items {"q","options"(3),"correct"(index),"why_es"}, "open": exactly 2 strings} — inference and opinion, never literal recall,
  "seeded": one entry per seed the user gave you {"term","meaning_es","distractors"(2 plausible wrong meanings in Spanish)} — [] if no seeds,
  "produccion": string — an English prompt connecting the passage to Gus's real work/life, answerable in 2 sentences
}

SEEDS: the user may pass seed expressions. You MUST weave each one into the passage VERBATIM (exact characters, exact spelling) and naturally — never highlighted, never forced, never in quotes. If a seed doesn't fit the topic, bend the essay's angle until it does. No seeds → "seeded": [].

EXAMPLE — this anchors the FORMAT and the VOICE. Match its structure exactly; never reuse its content or topic. (This example was generated with seeds: ["pull through"].)
{"headline":"Your Startup Doesn't Have a Growth Problem. It Has a Truth Problem.","topic":"STARTUP","passage":"Every founder swears their startup is six months away from taking off. Scratch the surface, though, and you'll often find a team quietly papering over the same cracks: churn nobody wants to name, a roadmap that bends to whoever shouted last, metrics dressed up for the next board deck. The problem isn't growth. It's honesty.\\n\\nHere's the uncomfortable part: dishonesty inside a startup rarely looks like lying. It looks like optimism. It's the demo that only works on the founder's laptop, the pipeline full of deals that were never really alive, the pivot everyone saw coming but nobody dared to bring up. Optimism is cheap fuel — it burns fast and leaves nothing behind.\\n\\nThe startups that pull through tend to share one boring habit: they say the ugly thing early. They'd rather kill a feature in a meeting than let it die slowly in production. That takes a certain kind of culture — one where bad news travels faster than good news, and where being wrong out loud is safer than being wrong in silence.","glosses":[{"term":"papering over the same cracks","es":"tapar los mismos problemas con arreglos superficiales — la imagen es empapelar una pared agrietada en vez de repararla"},{"term":"dressed up","es":"maquillados para verse mejor de lo que son, como cuando te arreglas para una cita"},{"term":"dared to bring up","es":"se atrevió a sacar el tema; 'bring up' es poner algo incómodo sobre la mesa en una conversación"},{"term":"out loud","es":"en voz alta, delante de todos — lo contrario de guardártelo"}],"lexicon":[{"term":"scratch the surface","frase":"Scratch the surface, though, and you'll often find a team quietly papering over the same cracks.","es":"rascar apenas la superficie: mirar un poquito más allá de la primera impresión"},{"term":"taking off","frase":"Every founder swears their startup is six months away from taking off.","es":"despegar, explotar en crecimiento — la imagen del avión que levanta vuelo"},{"term":"bends to whoever shouted last","frase":"a roadmap that bends to whoever shouted last","es":"se dobla ante el último que gritó: cede al que más presiona, no al que tiene razón"},{"term":"cheap fuel","frase":"Optimism is cheap fuel — it burns fast and leaves nothing behind.","es":"combustible barato: energía fácil de conseguir pero que no dura nada"},{"term":"pull through","frase":"The startups that pull through tend to share one boring habit: they say the ugly thing early.","es":"salir adelante después de una etapa que casi te mata"}],"questions":{"mc":[{"q":"What does the author suggest optimism can do inside a startup?","options":["Disguise problems the team refuses to name","Attract more ambitious investors","Speed up honest conversations"],"correct":0,"why_es":"Dice que la deshonestidad no parece mentira sino optimismo: el demo que solo corre en la laptop del founder."},{"q":"Why does the author call saying the ugly thing early a 'boring habit'?","options":["It is unglamorous but it is what actually saves companies","Founders find those meetings tedious","It slows down shipping new features"],"correct":0,"why_es":"Lo contrasta con el drama del optimismo: el hábito aburrido y sin gloria es el que funciona."}],"open":["Think of a moment when a team you were on avoided saying 'the ugly thing'. What did that silence end up costing?","Where is the line between healthy optimism and self-deception in a startup? Who should police it?"]},"seeded":[{"term":"pull through","meaning_es":"salir adelante, sobrevivir una etapa muy difícil","distractors":["tirar de algo con mucha fuerza","atravesar un lugar sin detenerse"]}],"produccion":"Your team just found out a metric on the last board deck was 'dressed up'. In two sentences, what do you say at the next all-hands?"}`;

// ── SYNC: copia EXACTA de dropUserPrompt en index.html (~línea 3015) ───────────
// tema: "CRYPTO"|"STARTUP"|"MEDELLIN"|"TECH"|"WILDCARD" o "sorpréndeme"
// semillas: expresiones inglesas (0-3) que DEBEN quedar tejidas verbatim
export const dropUserPrompt = (tema, semillas) => `Generate today's edition.
TOPIC: ${tema}
SEEDS (weave each one verbatim into the passage): ${JSON.stringify(semillas)}
Remember: your very first character must be the JSON (a fence is tolerada, nothing else is), compact on one line, zero deliberation before it.`;

// ── SYNC: copia EXACTA de parsearEdicion en index.html (~línea 3021) ───────────
// Parseo en 2 pasos: JSON normal (con o sin fences) y rescate primer-{ .. último-}
export function parsearEdicion(raw) {
  const sinFences = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  for (const c of [sinFences, raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)]) {
    try { return JSON.parse(c); } catch { /* siguiente */ }
  }
  return null; // → reintentar la llamada completa
}

// ── SYNC: copia EXACTA de normalizarEdicion en index.html (~línea 3034) ────────
// El LLM incumple el esquema en ~1 de 5 corridas. Se normaliza TODO a la forma
// esperada antes de aceptar (y por ende antes de persistir en KV). Devuelve null
// si lo esencial falta.
export function normalizarEdicion(ed) {
  if (!ed || typeof ed !== 'object') return null;
  if (typeof ed.headline !== 'string' || typeof ed.passage !== 'string' || !ed.passage.trim()) return null;
  const arr = (x) => (Array.isArray(x) ? x : []);
  const str = (x) => (typeof x === 'string' ? x : '');

  ed.glosses = arr(ed.glosses).filter((g) => g && str(g.term) && str(g.es));
  ed.lexicon = arr(ed.lexicon).filter((l) => l && str(l.term))
    .map((l) => ({ term: l.term, frase: str(l.frase), es: str(l.es) }));

  const q = (ed.questions && typeof ed.questions === 'object' && !Array.isArray(ed.questions)) ? ed.questions : {};
  q.mc = arr(q.mc)
    .filter((m) => m && str(m.q) && Array.isArray(m.options)
      && m.options.filter((o) => typeof o === 'string').length >= 2)
    .map((m) => {
      const options = m.options.filter((o) => typeof o === 'string');
      let c = parseInt(m.correct, 10);
      if (!Number.isFinite(c) || c < 0 || c >= options.length) c = 0;
      return { q: m.q, options, correct: c, why_es: str(m.why_es) };
    });
  q.open = arr(q.open).filter((o) => typeof o === 'string' && o.trim());
  ed.questions = q;

  ed.seeded = arr(ed.seeded)
    .filter((s) => s && str(s.term) && str(s.meaning_es) && Array.isArray(s.distractors)
      && s.distractors.filter((d) => typeof d === 'string' && d.trim()).length >= 2)
    .map((s) => ({
      term: s.term, meaning_es: s.meaning_es,
      distractors: s.distractors.filter((d) => typeof d === 'string' && d.trim()).slice(0, 2),
    }));

  ed.produccion = str(ed.produccion);
  return ed;
}

// Fecha del drop en la MISMA convención que el frontend (UTC, YYYY-MM-DD).
export function fechaDropHoy() { return new Date().toISOString().slice(0, 10); }

// El modelo sigue siendo específico del generador; el transporte compartido con
// api/chat.js aporta el mismo fallback sin acoplar el cron al handler.
const MODEL_CREATIVE = resolveGoModel(
  process.env.MODEL_GO_CREATIVE || process.env.MODEL_CREATIVE,
  DEFAULT_GO_CREATIVE_MODEL,
);

// Genera UNA edición genérica reusando el mismo flujo de reintentos que
// pedirEdicion() del frontend: el modelo puede agotar el techo razonando o el
// proveedor puede dar 502/429 o 200 vacío.
// Backoff 4s, máximo 3 intentos. Lanza si los 3 fallan.
export async function generarEdicionGenerica(apiKey, { tema = 'sorpréndeme', semillas = [] } = {}) {
  let motivo = 'sin respuesta';
  for (let i = 0; i < 3; i++) {
    if (i) await new Promise((r) => setTimeout(r, 4000));
    try {
      const { response: upstream, protocol } = await requestOpenCode(apiKey, {
        model: MODEL_CREATIVE,
        max_tokens: 5000, // holgura: kimi razona antes del JSON (igual que el frontend)
        temperature: 0.85,
        messages: [
          { role: 'system', content: DROP_SYSTEM },
          { role: 'user', content: dropUserPrompt(tema, semillas) },
        ],
      });
      if (!upstream.ok) { motivo = 'upstream ' + upstream.status; continue; }
      const data = await upstream.json();
      const content = openCodeContent(data, protocol);
      if (!content.trim()) { motivo = 'respuesta vacía'; continue; }
      const ed = normalizarEdicion(parsearEdicion(content));
      if (ed) return ed;
      motivo = 'JSON inválido';
    } catch (e) { motivo = String((e && e.message) || e).slice(0, 90); }
  }
  throw new Error(motivo);
}
