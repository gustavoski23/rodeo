/* A1 Memory — memoria de conversación para el coach A1 en "conversación libre".
   Guarda las frases que el coach le enseñó al usuario y los temas tratados,
   para que en sesiones siguientes el coach NO repita y construya sobre lo anterior.

   Misma filosofía que rodeo_a1_* (stores/a1.ts): dato del dispositivo, NO
   sincronizado a la nube. Clave propia: `rodeo_a1_lessons`. */

import { store } from './storage';

/* ── Tipos ─────────────────────────────────────────────────────────────── */

export type A1Lesson = {
  /** Dedup key: `${en.toLowerCase()}|${area}` */
  id: string;
  /** Frase en inglés tal como apareció en el ⟦marker⟧ */
  en: string;
  /** Explicación en español que venía en el marker */
  es: string;
  /** Área/trabajo del usuario (contexto de la frase) */
  area: string;
  /** Timestamp de la sesión donde se enseñó */
  sessionTs: number;
};

export type A1TalkMemory = {
  /** Frases enseñadas, newest-first. Cap 50. */
  lessons: A1Lesson[];
  /** Temas de los que ya se habló (inferidos del contenido del usuario). Cap 20. */
  topics: string[];
  /** Timestamp de la última sesión A1. */
  lastSessionTs: number;
};

/* ── Constantes ────────────────────────────────────────────────────────── */

const K = 'rodeo_a1_lessons';
const CAP_LESSONS = 50;
const CAP_TOPICS = 20;
const DECAY_DAYS = 30;

/* ── Helpers ───────────────────────────────────────────────────────────── */

function defaultMemory(): A1TalkMemory {
  return { lessons: [], topics: [], lastSessionTs: 0 };
}

export function cargarMemoriaA1(): A1TalkMemory {
  return store.get<A1TalkMemory>(K, defaultMemory());
}

function persistirMemoriaA1(mem: A1TalkMemory): void {
  store.set(K, mem);
}

/* ── Escritura ─────────────────────────────────────────────────────────── */

/** Guardar frases enseñadas en una sesión (dedup por id). */
export function guardarLeccionesA1(lessons: A1Lesson[]): void {
  if (!lessons.length) return;
  const mem = cargarMemoriaA1();
  const existentes = new Set(mem.lessons.map((l) => l.id));
  const nuevas = lessons.filter((l) => !existentes.has(l.id));
  if (!nuevas.length) return;
  mem.lessons = [...nuevas, ...mem.lessons].slice(0, CAP_LESSONS);
  mem.lastSessionTs = Date.now();
  persistirMemoriaA1(mem);
}

/** Registrar un tema conversado (sin duplicar). */
export function marcarTemaA1(topic: string): void {
  const t = topic.trim().toLowerCase();
  if (!t) return;
  const mem = cargarMemoriaA1();
  if (!mem.topics.includes(t)) {
    mem.topics = [t, ...mem.topics].slice(0, CAP_TOPICS);
    persistirMemoriaA1(mem);
  }
}

/* ── Decaimiento ─────────────────────────────────────────────────────────
   Si pasaron más de 30 días desde la última sesión, reducir la memoria
   para que el教练 no recuerde detalles de sesiones muy antiguas. */

export function limpiarSiViejo(): void {
  const mem = cargarMemoriaA1();
  if (!mem.lastSessionTs) return;
  const dias = (Date.now() - mem.lastSessionTs) / (1000 * 60 * 60 * 24);
  if (dias > DECAY_DAYS) {
    mem.lessons = mem.lessons.slice(0, 10);
    mem.topics = mem.topics.slice(0, 5);
    persistirMemoriaA1(mem);
  }
}

/* ── Extracción de frases del transcript ─────────────────────────────────
   Busca marcadores ⟦english||español⟧ en el texto del coach y los convierte
   en A1Lesson[] listos para persistir. */

export function extraerFrasesDelTranscript(transcript: string, area: string): A1Lesson[] {
  const regex = /⟦(.+?)\|\|(.+?)⟧/g;
  const lessons: A1Lesson[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(transcript)) !== null) {
    const en = match[1].trim();
    const es = match[2].trim();
    if (en && es) {
      lessons.push({
        id: `${en.toLowerCase()}|${area}`,
        en,
        es,
        area,
        sessionTs: Date.now(),
      });
    }
  }
  return lessons;
}
