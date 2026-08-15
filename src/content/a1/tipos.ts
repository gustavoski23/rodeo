/* Contrato de tipos del módulo OFICINA (A1) — espejo fiel del esquema del
   contenido legacy (public/js/a1-office-content.js, "Contrato de campos" §3)
   más las dos extensiones nuevas: packs por trabajo (A1.2) y el paso de
   producción con voz (A1.3).

   Este archivo es el punto de encuentro de los workstreams paralelos:
   - A1.1 (curso base) tipa su contenido y su store contra esto.
   - A1.2 (packs por profesión) exporta JobPack[].
   - A1.3 (voz) implementa PasoVozProps.
   El integrador solo cablea; nadie redefine estos tipos por su cuenta. */

/** Un chunk = UNA frase útil completa (máx. 10 palabras). Inmutable: el
    estado del SRS vive en rodeo_a1_srs, nunca aquí. */
export type A1Chunk = {
  id: string;
  en: string;
  es: string;
  /** Pronunciación en ortografía española (muleta offline, SIEMPRE presente). */
  sounds_es: string;
  /** El PORQUÉ con analogía, voz de Alfred, cero metalenguaje. */
  why_es: string;
  sayWhen_es: string;
  who_es: string;
  /** Plantilla con hueco ("Good morning, ___.") o null si la frase es fija. */
  frame: string | null;
  /** Rellenos válidos del frame, o null. */
  swaps: string[] | null;
  /** Opciones incorrectas para el paso de reconocimiento. */
  distractors_es: string[];
  cognateHook_es: string | null;
  forms: { label_es: string; en: string }[] | null;
  audio: string | null;
  survival: boolean;
};

export type A1Scene = {
  id: string;
  order: number;
  title_es: string;
  scene_es: string;
  icon: string;
  /** Alfred presenta la escena (2 líneas, español latino neutro). */
  setup_es: string[];
  analogy_es: string;
  chunks: A1Chunk[];
};

/** Tarea TBLT al cierre de la unidad: cada paso se resuelve diciendo un chunk. */
export type A1Task = {
  id: string;
  intro_es: string;
  steps: { goal_es: string; answerChunkId: string; reaction_es: string }[];
  done_es: string;
};

export type A1Unit = {
  id: string;
  order: number;
  title_es: string;
  subtitle_es: string;
  arc_es: string;
  emoji: string;
  cardTheme: string;
  icon: string;
  survival: boolean;
  companionSetup_es: string[];
  scenes: A1Scene[];
  task: A1Task;
};

export type A1Companion = {
  id: string;
  name: string;
  fullName: string;
  avatarInitial: string;
  cardTheme: string;
  origin_es: string;
  tagline_es: string;
  intro_es: string[];
};

export type A1Cognate = { en: string; es: string; falseHook_es: string | null };

/** El curso completo (el window.A1_OFFICE del legacy, ya tipado). */
export type A1Course = {
  version: number;
  companion: A1Companion;
  cognates: A1Cognate[];
  units: A1Unit[];
};

/* ── A1.2: packs por trabajo ─────────────────────────────────────────────
   El tronco común (units del curso) es para todos; el pack añade encima el
   vocabulario y las escenas del rol elegido. Elegir trabajo NO borra
   progreso: solo se guarda el id en rodeo_a1_job. */

export type JobPackId = 'tech' | 'ventas' | 'soporte' | 'recepcion';

export type JobPack = {
  id: JobPackId;
  /** Nombre corto para el selector ("Tech / Dev", "Ventas"…). */
  nombre_es: string;
  /** Qué vas a poder hacer con este pack, en una línea. */
  promesa_es: string;
  emoji: string;
  /** Alfred presenta el rol (misma voz que companionSetup_es). */
  intro_es: string[];
  /** Unidades extra del rol — MISMO esquema que el tronco. */
  units: A1Unit[];
};

/* ── A1.3: paso de producción con voz ────────────────────────────────────
   Componente autocontenido: graba (LiveWaveform), transcribe (/api/stt,
   Deepgram Nova-3 multi) y compara contra el chunk objetivo. El dueño del
   loop de 6 pasos lo monta donde toque. */

export type ResultadoVoz = {
  /** Lo que Deepgram entendió, tal cual. */
  transcript: string;
  /** true si la producción se acepta (match tolerante, no byte a byte). */
  logrado: boolean;
  /** Palabras del chunk que faltaron o difirieron, para el feedback. */
  faltantes: string[];
};

export type PasoVozProps = {
  chunk: A1Chunk;
  /** Se llama al aceptar o al agotar intentos; el loop decide qué sigue. */
  onResultado: (r: ResultadoVoz) => void;
  /** Saltar el paso (sin mic / permiso negado): cuenta como visto, no como logrado. */
  onSaltar: () => void;
};
