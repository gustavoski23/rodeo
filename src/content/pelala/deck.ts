/* Mazo curado de Pélala / El Muro — jerga y phrasal verbs de inglés real.
   Un solo término alimenta los dos modos:
   · El Muro  → muestra term + contexto + gloss; el usuario lo pela cuando ya se lo sabe.
   · Pélala   → muestra la imagen (o el contexto con el término en blanco); el usuario
                dice/escribe la respuesta y se valida contra `accept`.

   `accept` es el chequeo local rápido; el juez real (api/chat.js) tolera variantes.
   `image` queda como pack curado pre-generado (fase de contenido posterior); por ahora
   `emoji` da un placeholder demostrable y Pélala arranca en variante "contexto en blanco". */

export type SlangKind = 'phrasal' | 'slang';

export type SlangTerm = {
  id: string;
  term: string;
  kind: SlangKind;
  /** Frase natural que usa el término (para El Muro y para el fill-in-the-blank de Pélala). */
  context_en: string;
  /** El término tal como aparece en context_en, para poder blanquearlo. */
  target: string;
  /** Glosa en español (colombiano cuando aplica). */
  gloss_es: string;
  /** Respuestas aceptadas (base + flexiones + con pronombre). */
  accept: string[];
  /** Placeholder inmediato mientras no exista el pack de imágenes. */
  emoji: string;
  /** Prompt para generar la imagen de acción del pack curado (fase posterior). */
  imagePrompt: string;
};

export const DECK: SlangTerm[] = [
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
    gloss_es: 'dejar en visto / desaparecer sin avisar',
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
