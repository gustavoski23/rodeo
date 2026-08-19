/* Mazo curado de Pélala / El Muro — jerga y phrasal verbs de inglés real.
   Un solo término alimenta los dos modos:
   · El Muro  → muestra term + contexto + gloss; el usuario lo pela cuando ya se lo sabe.
   · Pélala   → muestra la imagen (o el contexto con el término en blanco); el usuario
                dice/escribe la respuesta y se valida contra `accept`.

   `accept` es el chequeo local rápido; el juez real (api/chat.js) tolera variantes.
   `image` queda como pack curado pre-generado (fase de contenido posterior); por ahora
   `emoji` da un placeholder demostrable y Pélala arranca en variante "contexto en blanco". */

export type SlangKind = 'phrasal' | 'slang' | 'idiom';

/** Un significado de un término polisémico (ver `senses`). */
export type SlangSense = {
  /** El significado, en español latino neutro. */
  gloss_es: string;
  /** Ejemplo natural en inglés para ESTE significado. */
  example_en: string;
  /** Traducción del ejemplo. */
  example_es: string;
};

export type SlangTerm = {
  id: string;
  term: string;
  kind: SlangKind;
  /** Frase natural que usa el término (para El Muro y para el fill-in-the-blank de Pélala). */
  context_en: string;
  /** El término tal como aparece en context_en, para poder blanquearlo. */
  target: string;
  /** Glosa en español latino neutro. */
  gloss_es: string;
  /** Respuestas aceptadas (base + flexiones + con pronombre). */
  accept: string[];
  /** Placeholder inmediato mientras no exista el pack de imágenes. */
  emoji: string;
  /** Prompt para generar la imagen de acción del pack curado (fase posterior). */
  imagePrompt: string;
  /** Términos con VARIOS significados (p. ej. "pay off": vale la pena / saldar una
      deuda / sobornar): un solo sticker, pero la tarjeta de significado los explica
      todos. Si está presente, el render revelado lo usa en vez de gloss_es solo. */
  senses?: SlangSense[];
};

export const DECK: SlangTerm[] = [
  {
    id: 'wind-up',
    term: 'wind up',
    kind: 'phrasal',
    context_en: 'We wound up talking until 3 a.m.',
    target: 'wound up',
    gloss_es: 'terminar/acabar haciendo algo (sin planearlo)',
    accept: ['wind up', 'wound up', 'winds up', 'winding up', 'wind up doing', 'wound up doing'],
    emoji: '🌀',
    imagePrompt:
      'flat illustration of a winding spiral swirl leading into a speech bubble, crescent moon and stars for late night, minimal',
  },
  {
    id: 'pull-off',
    term: 'pull off',
    kind: 'phrasal',
    context_en: 'She pulled off the deal nobody believed in.',
    target: 'pulled off',
    gloss_es: 'lograr algo difícil contra todo pronóstico',
    accept: ['pull off', 'pulled off', 'pull it off', 'pulled it off'],
    emoji: '🎯',
    imagePrompt:
      'flat illustration of a person celebrating after closing an impossible deal, confetti, minimal',
  },
  {
    id: 'run-into',
    term: 'run into',
    kind: 'phrasal',
    context_en: 'I ran into my ex at the mall.',
    target: 'ran into',
    gloss_es: 'toparse con alguien por casualidad',
    accept: ['run into', 'ran into', 'bump into', 'bumped into'],
    emoji: '😳',
    imagePrompt:
      'flat illustration of two people bumping into each other surprised at a shopping mall, minimal',
  },
  {
    id: 'ghost',
    term: 'ghost',
    kind: 'slang',
    context_en: 'He ghosted me after two dates.',
    target: 'ghosted',
    gloss_es: 'desaparecer / cortar el contacto sin dar explicación',
    accept: ['ghost', 'ghosted', 'ghost me', 'ghosted me'],
    emoji: '👻',
    imagePrompt:
      'flat illustration of a person staring at a phone with no reply, faded ghost silhouette leaving, minimal',
  },
  {
    id: 'show-up',
    term: 'show up',
    kind: 'phrasal',
    context_en: 'Only three people showed up to the party.',
    target: 'showed up',
    gloss_es: 'aparecer / presentarse a un lugar',
    accept: ['show up', 'showed up', 'shows up'],
    emoji: '🚪',
    imagePrompt:
      'flat illustration of a nearly empty party with three guests arriving, minimal',
  },
  {
    id: 'give-up',
    term: 'give up',
    kind: 'phrasal',
    context_en: "Don't give up now, you're almost there.",
    target: 'give up',
    gloss_es: 'rendirse / dejar de intentar',
    accept: ['give up', 'gave up', 'giving up', 'give it up'],
    emoji: '🏳️',
    imagePrompt:
      'flat illustration of a runner refusing to quit near the finish line, minimal',
  },
  {
    id: 'chill-out',
    term: 'chill out',
    kind: 'phrasal',
    context_en: "Chill out, it's not a big deal.",
    target: 'chill out',
    gloss_es: 'relajarse / calmarse',
    accept: ['chill out', 'chilled out', 'chill'],
    emoji: '😎',
    imagePrompt:
      'flat illustration of a relaxed person lying back calm and cool, minimal',
  },
  {
    id: 'broke',
    term: 'broke',
    kind: 'slang',
    context_en: "I can't go out tonight, I'm broke.",
    target: 'broke',
    gloss_es: 'sin plata / quebrado',
    accept: ['broke', "i'm broke", 'im broke', 'be broke'],
    emoji: '💸',
    imagePrompt:
      'flat illustration of a person turning an empty wallet upside down, minimal',
  },
  {
    id: 'hang-out',
    term: 'hang out',
    kind: 'phrasal',
    context_en: 'We hung out at the park all afternoon.',
    target: 'hung out',
    gloss_es: 'pasar el rato con alguien',
    accept: ['hang out', 'hung out', 'hangs out', 'hanging out'],
    emoji: '🧃',
    imagePrompt:
      'flat illustration of friends relaxing together on the grass at a park, minimal',
  },
  {
    id: 'figure-out',
    term: 'figure out',
    kind: 'phrasal',
    context_en: "I can't figure out this problem.",
    target: 'figure out',
    gloss_es: 'descifrar / resolver algo',
    accept: ['figure out', 'figured out', 'figure it out', 'figuring out'],
    emoji: '🧩',
    imagePrompt:
      'flat illustration of a person having an aha moment solving a puzzle, lightbulb, minimal',
  },
  {
    id: 'flex',
    term: 'flex',
    kind: 'slang',
    context_en: "He's always flexing his new car.",
    target: 'flexing',
    gloss_es: 'presumir / alardear',
    accept: ['flex', 'flexing', 'flexed'],
    emoji: '💪',
    imagePrompt:
      'flat illustration of a person showing off a shiny new car proudly, minimal',
  },
  {
    id: 'catch-up',
    term: 'catch up',
    kind: 'phrasal',
    context_en: "Let's catch up over coffee this weekend.",
    target: 'catch up',
    gloss_es: 'ponerse al día con alguien',
    accept: ['catch up', 'caught up', 'catching up', 'catch up with'],
    emoji: '☕',
    imagePrompt: 'flat illustration of two friends chatting over coffee catching up, minimal',
  },
  {
    id: 'work-out',
    term: 'work out',
    kind: 'phrasal',
    context_en: "Don't worry, everything will work out fine.",
    target: 'work out',
    gloss_es: 'resolverse / salir bien',
    accept: ['work out', 'worked out', 'works out', 'working out'],
    emoji: '🤞',
    imagePrompt: 'flat illustration of a tangled path straightening into a clear road, minimal',
  },
  {
    id: 'look-forward-to',
    term: 'look forward to',
    kind: 'phrasal',
    context_en: "I'm looking forward to the trip.",
    target: 'looking forward to',
    gloss_es: 'tener muchas ganas de algo',
    accept: ['look forward to', 'looking forward to', 'looked forward to'],
    emoji: '🤩',
    imagePrompt: 'flat illustration of a person excitedly counting days on a calendar, minimal',
  },
  {
    id: 'come-up-with',
    term: 'come up with',
    kind: 'phrasal',
    context_en: 'She came up with a brilliant idea.',
    target: 'came up with',
    gloss_es: 'idear / inventar algo',
    accept: ['come up with', 'came up with', 'coming up with'],
    emoji: '💡',
    imagePrompt: 'flat illustration of a person with a lightbulb popping above their head, minimal',
  },
  {
    id: 'get-along',
    term: 'get along',
    kind: 'phrasal',
    context_en: 'I get along with my coworkers.',
    target: 'get along',
    gloss_es: 'llevarse bien con alguien',
    accept: ['get along', 'got along', 'getting along', 'get along with'],
    emoji: '🤝',
    imagePrompt: 'flat illustration of two coworkers laughing together friendly, minimal',
  },
  {
    id: 'turn-down',
    term: 'turn down',
    kind: 'phrasal',
    context_en: 'He turned down the job offer.',
    target: 'turned down',
    gloss_es: 'rechazar una oferta o propuesta',
    accept: ['turn down', 'turned down', 'turning down', 'turn it down'],
    emoji: '🙅',
    imagePrompt: 'flat illustration of a person politely declining a contract, minimal',
  },
  {
    id: 'put-up-with',
    term: 'put up with',
    kind: 'phrasal',
    context_en: "I can't put up with the noise anymore.",
    target: 'put up with',
    gloss_es: 'aguantar / soportar algo molesto',
    accept: ['put up with', 'putting up with', 'put up with it'],
    emoji: '😤',
    imagePrompt: 'flat illustration of a person covering their ears from loud noise, minimal',
  },
  {
    id: 'run-out-of',
    term: 'run out of',
    kind: 'phrasal',
    context_en: 'We ran out of milk this morning.',
    target: 'ran out of',
    gloss_es: 'quedarse sin algo',
    accept: ['run out of', 'ran out of', 'running out of', 'run out'],
    emoji: '🥛',
    imagePrompt: 'flat illustration of an empty fridge with a lone empty milk carton, minimal',
  },
  {
    id: 'bring-up',
    term: 'bring up',
    kind: 'phrasal',
    context_en: "Don't bring up politics at dinner.",
    target: 'bring up',
    gloss_es: 'sacar un tema / mencionar algo',
    accept: ['bring up', 'brought up', 'bringing up', 'bring it up'],
    emoji: '💬',
    imagePrompt: 'flat illustration of a speech bubble raised at a dinner table, minimal',
  },
  {
    id: 'call-off',
    term: 'call off',
    kind: 'phrasal',
    context_en: 'They called off the wedding.',
    target: 'called off',
    gloss_es: 'cancelar algo ya planeado',
    accept: ['call off', 'called off', 'calling off', 'call it off'],
    emoji: '🚫',
    imagePrompt: 'flat illustration of a crossed-out calendar event, minimal',
  },
  {
    id: 'hit-up',
    term: 'hit up',
    kind: 'slang',
    context_en: 'Hit me up when you land.',
    target: 'Hit me up',
    gloss_es: 'escríbeme / contáctame',
    accept: ['hit up', 'hit me up', 'hit you up', 'hit them up'],
    emoji: '📲',
    imagePrompt: 'flat illustration of a phone buzzing with a new message, minimal',
  },
  {
    id: 'spill-the-tea',
    term: 'spill the tea',
    kind: 'slang',
    context_en: 'Okay, spill the tea — what happened?',
    target: 'spill the tea',
    gloss_es: 'suelta el chisme / cuéntalo todo',
    accept: ['spill the tea', 'spilled the tea', 'spill the beans'],
    emoji: '🍵',
    imagePrompt: 'flat illustration of a teacup with gossip bubbles rising, minimal',
  },
  {
    id: 'lowkey',
    term: 'lowkey',
    kind: 'slang',
    context_en: "I'm lowkey obsessed with this song.",
    target: 'lowkey',
    gloss_es: 'medio / en secreto (un poquito)',
    accept: ['lowkey', 'low key', 'low-key'],
    emoji: '🤫',
    imagePrompt: 'flat illustration of a person secretly enjoying music with headphones, minimal',
  },
  {
    id: 'swamped',
    term: 'swamped',
    kind: 'slang',
    context_en: "I'm swamped with work this week.",
    target: 'swamped',
    gloss_es: 'hasta el cuello de trabajo',
    accept: ['swamped', 'be swamped', "i'm swamped", 'im swamped'],
    emoji: '🌊',
    imagePrompt: 'flat illustration of a person under a wave of paperwork, minimal',
  },
  {
    id: 'salty',
    term: 'salty',
    kind: 'slang',
    context_en: "He's still salty about losing the game.",
    target: 'salty',
    gloss_es: 'resentido / picado / amargado',
    accept: ['salty', 'be salty', 'so salty'],
    emoji: '🧂',
    imagePrompt: 'flat illustration of a grumpy person with a salt shaker mood, minimal',
  },
  {
    id: 'wrap-up',
    term: 'wrap up',
    kind: 'phrasal',
    context_en: "Let's wrap up the meeting.",
    target: 'wrap up',
    gloss_es: 'cerrar / terminar algo',
    accept: ['wrap up', 'wrapped up', 'wrapping up', 'wrap it up'],
    emoji: '🎁',
    imagePrompt: 'flat illustration of hands tying a bow to close a wrapped box, minimal',
  },
  /* ── Lote 2 (2026-08-19): términos sacados de cuentas de inglés en Instagram
     (vocabulary_sailingo, teacheromizz, johnplusenglish…) y con sticker ilustrado
     propio en STICKER_IMG. "pay off" trae `senses`: un solo sticker, tres usos. ── */
  {
    id: 'pay-off',
    term: 'pay off',
    kind: 'phrasal',
    context_en: 'All those late nights finally paid off.',
    target: 'paid off',
    gloss_es: 'dar frutos / valer la pena el esfuerzo',
    accept: ['pay off', 'paid off', 'pays off', 'paying off', 'pay it off', 'paid it off'],
    emoji: '💰',
    imagePrompt:
      'flat sticker of a green sprout growing out of a jar of gold coins with a sparkling star, effort paying off, minimal',
    senses: [
      {
        gloss_es: 'Valer la pena / dar frutos (un esfuerzo).',
        example_en: 'All those late nights finally paid off.',
        example_es: 'Todas esas trasnochadas al final valieron la pena.',
      },
      {
        gloss_es: 'Terminar de pagar una deuda por completo.',
        example_en: 'I finally paid off my credit card.',
        example_es: 'Por fin terminé de pagar la tarjeta de crédito.',
      },
      {
        gloss_es: 'Sobornar a alguien (informal).',
        example_en: 'They paid off the inspector to stay quiet.',
        example_es: 'Sobornaron al inspector para que se quedara callado.',
      },
    ],
  },
  {
    id: 'break-out-of',
    term: 'break out of',
    kind: 'phrasal',
    context_en: 'I want to break out of this boring routine.',
    target: 'break out of',
    gloss_es: 'escapar de algo; salir de golpe de una situación o rutina',
    accept: ['break out of', 'broke out of', 'breaking out of', 'break out'],
    emoji: '🔓',
    imagePrompt:
      'flat sticker of a happy character leaping out through bent-open prison bars, breaking free, minimal',
  },
  {
    id: 'snap-out-of',
    term: 'snap out of',
    kind: 'phrasal',
    context_en: 'Snap out of it — we can fix this.',
    target: 'Snap out of',
    gloss_es: 'espabilar; salir de golpe de un bajón, tristeza o distracción',
    accept: ['snap out of', 'snap out of it', 'snapped out of', 'snaps out of'],
    emoji: '🫰',
    imagePrompt:
      'flat sticker of a character snapping fingers as a grey gloom cloud dissolves, brightening up, minimal',
  },
  {
    id: 'shake-off',
    term: 'shake off',
    kind: 'phrasal',
    context_en: "I can't shake off this cold.",
    target: 'shake off',
    gloss_es: 'quitarse de encima algo o a alguien molesto',
    accept: ['shake off', 'shook off', 'shakes off', 'shaking off', 'shake it off'],
    emoji: '💦',
    imagePrompt:
      'flat sticker of a puppy-like character shaking off water droplets and a clingy burr, motion lines, minimal',
  },
  {
    id: 'get-over',
    term: 'get over',
    kind: 'phrasal',
    context_en: 'It took her months to get over the breakup.',
    target: 'get over',
    gloss_es: 'superar algo (una enfermedad, una ruptura, un mal momento)',
    accept: ['get over', 'got over', 'gets over', 'getting over', 'get over it'],
    emoji: '🌈',
    imagePrompt:
      'flat sticker of a character stepping over a hill toward a rising sun, moving past an obstacle, minimal',
  },
  {
    id: 'get-a-grip',
    term: 'get a grip',
    kind: 'idiom',
    context_en: "Get a grip — it's not the end of the world.",
    target: 'Get a grip',
    gloss_es: 'controlarse y recuperar la calma',
    accept: ['get a grip', 'got a grip', 'get a grip on', 'getting a grip'],
    emoji: '✊',
    imagePrompt:
      'flat sticker of two hands firmly steadying a wobbling steering wheel, calm control, minimal',
  },
  {
    id: 'daily-grind',
    term: 'the daily grind',
    kind: 'idiom',
    context_en: 'Coffee helps me get through the daily grind.',
    target: 'daily grind',
    gloss_es: 'la rutina diaria de trabajo o estudio, monótona y agotadora',
    accept: ['daily grind', 'the daily grind', 'back to the grind'],
    emoji: '☕',
    imagePrompt:
      'flat sticker of a tired character walking a hamster wheel holding coffee, a big gear turning, minimal',
  },
  {
    id: 'switch-up',
    term: 'switch up',
    kind: 'phrasal',
    context_en: "Let's switch up the routine this week.",
    target: 'switch up',
    gloss_es: 'cambiar algo, darle un giro (a la rutina, el plan, el estilo)',
    accept: ['switch up', 'switched up', 'switching up', 'switch it up'],
    emoji: '🔀',
    imagePrompt:
      'flat sticker of a character flipping a chunky toggle switch with two swapping arrows, fresh change, minimal',
  },
  {
    id: 'pull-yourself-together',
    term: 'pull yourself together',
    kind: 'idiom',
    context_en: 'Pull yourself together and tell me what happened.',
    target: 'Pull yourself together',
    gloss_es: 'recomponerse: calmarse y recuperar el control',
    accept: ['pull yourself together', 'pull myself together', 'pulled himself together', 'pull it together'],
    emoji: '🧩',
    imagePrompt:
      'flat sticker of a character clicking floating puzzle-piece parts of itself back into place, composed, minimal',
  },
  {
    id: 'up-in-the-air',
    term: 'up in the air',
    kind: 'idiom',
    context_en: 'The wedding date is still up in the air.',
    target: 'up in the air',
    gloss_es: 'en el aire: incierto, sin decidir, sin saberse aún qué pasará',
    accept: ['up in the air', 'still up in the air', 'be up in the air'],
    emoji: '🎈',
    imagePrompt:
      'flat sticker of a character shrugging with a paper plane, question mark and balloon floating around, uncertainty, minimal',
  },
];

/** El contexto con el término blanqueado, para el reto fill-in-the-blank. */
export function blankContext(t: SlangTerm): string {
  const blank = '_'.repeat(Math.max(4, t.target.length));
  // Reemplaza la primera aparición del target (case-insensitive) por el blank.
  const re = new RegExp(t.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return t.context_en.replace(re, blank);
}

/** Chequeo local tolerante: normaliza y compara contra accept. El juez real afina. */
export function isLocalMatch(t: SlangTerm, answer: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:'"]/g, '')
      .replace(/\s+/g, ' ');
  const a = norm(answer);
  if (!a) return false;
  return t.accept.some((x) => {
    const n = norm(x);
    return a === n || a.includes(n);
  });
}
