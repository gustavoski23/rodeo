import { create } from 'zustand';

import { A1_CURSO } from '@/content/a1/core';
import type { A1Chunk, A1Scene, A1Unit, JobPackId } from '@/content/a1/tipos';
import { store } from '@/lib/storage';

/* MOTOR DE OFICINA (A1) — port de public/js/a1-office.js (capas 1-4: progreso,
   SRS Leitner, rungs, racha y "Mis frases") sin una sola línea de DOM.

   Dos cosas que NO se tocan al portar:

   1. Las CLAVES y sus FORMAS. `rodeo_a1_progress`, `rodeo_a1_srs`,
      `rodeo_a1_streak`, `rodeo_a1_saved` y `rodeo_a1_onboarded` se leen y se
      escriben con el mismo nombre y el mismo esquema del viejo — quien ya
      venía usando OFICINA entra y encuentra su progreso donde lo dejó. Por eso
      los campos internos siguen en inglés (`box`, `due`, `doneScenes`): son
      datos ya guardados en el celular de alguien, no nombres nuevos.

   2. Las fechas 'YYYY-MM-DD' en hora LOCAL. `new Date('2026-07-29')` parsea en
      UTC y en Medellín (UTC-5) eso corre el día hacia atrás: una frase vencería
      un día antes de tiempo. Se arman a mano y se comparan como texto.

   Nada de esto sincroniza a la nube: las claves rodeo_a1_* no están en
   SB_SYNC_KEYS (public/js/supabase-sync.js:34), así que `store.set` dispara el
   hook y el hook las ignora. El progreso de OFICINA vive en el celular.

   Lo que SÍ cambia respecto al legacy: la voz. El viejo usaba speechSynthesis
   local y guardaba su propio interruptor en `rodeo_a1_tts`; acá el audio es el
   real de la app (speak() → /api/tts, Aura-2) y el interruptor es el global de
   siempre, `rodeo_tts`. Esa clave queda huérfana a propósito: dos botones de
   mute para la misma voz confunden más de lo que ayudan. */

const K_ONBOARDED = 'rodeo_a1_onboarded';
const K_PROGRESS = 'rodeo_a1_progress';
const K_SRS = 'rodeo_a1_srs'; // cerebro Leitner, AISLADO del DNA de Gus
const K_STREAK = 'rodeo_a1_streak'; // racha propia, NO punitiva (nunca rodeo_streak)
const K_SAVED = 'rodeo_a1_saved'; // "Mis frases" (mini-DNA propio, JAMÁS rodeo_dna)
const K_JOB = 'rodeo_a1_job'; // el pack de trabajo elegido (A1.2)

/* ═══════════════════ Tipos del estado guardado ═══════════════════ */

/** Autoevaluación del PASO 6. Neutra a propósito: no hay "mal". */
export type Nota = 'clavado' | 'casi' | 'todavia';

/** Entrada Leitner de un chunk. `due` es 'YYYY-MM-DD' local. */
export type SrsEntry = {
  box: number;
  due: string;
  seen: number;
  clavado: number;
  casi: number;
  no: number;
  last: string | null;
  firstSeen: string;
};

export type SrsMapa = Record<string, SrsEntry>;

export type A1Progreso = {
  /** Dónde quedó el recorrido lineal (alimenta "Seguí donde ibas"). */
  unitId?: string;
  sceneId?: string;
  chunkIdx?: number;
  doneScenes: string[];
  doneUnits: string[];
  unlockedUnits: string[];
  doneTasks: string[];
  ts?: number;
};

export type A1Racha = { days: number; last: string | null; freezeUsed: boolean };

export type A1Guardada = { id: string; en: string; es: string; why: string; ts: number };

export type Metricas = { salen: number; repertorio: number; frescas: number; total: number };

export type Vencido = { id: string; entry: SrsEntry; chunk: A1Chunk };

/** El reto del PASO 2. Lo decide la caja Leitner, solo en repaso. */
export type Rung = 'teach' | 'mcq' | 'cloze' | 'producir' | 'swap';

/** De dónde sale el chunk en la cola: enseñanza completa o repaso. */
export type Clase = 'teach' | 'due';

/* ═══════════════════ Fechas locales ═══════════════════ */

function pad2(n: number): string {
  return (n < 10 ? '0' : '') + n;
}
function ymd(d: Date): string {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
export function hoyStr(): string {
  return ymd(new Date());
}
function parseYmd(s: string): Date {
  const p = String(s || '').split('-');
  if (p.length !== 3) return new Date();
  return new Date(+p[0]!, +p[1]! - 1, +p[2]!);
}
function sumarDias(base: string, n: number): string {
  const d = parseYmd(base);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/* ═══════════════════ Utilidades del motor ═══════════════════ */

/** Normaliza inglés para comparar (minúsculas, sin puntuación, sin dobles espacios). */
export function normEn(s: string | null | undefined): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[.,?!¡¿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fisher-Yates sobre una COPIA: el contenido es de solo lectura. */
export function barajar<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/* ═══════════════════ Lectura inicial (saneada) ═══════════════════ */

function leerProgreso(): A1Progreso {
  const p = store.get<Partial<A1Progreso> | null>(K_PROGRESS, null);
  const base = p && typeof p === 'object' ? p : {};
  return {
    ...base,
    doneScenes: Array.isArray(base.doneScenes) ? base.doneScenes : [],
    doneUnits: Array.isArray(base.doneUnits) ? base.doneUnits : [],
    unlockedUnits: Array.isArray(base.unlockedUnits) ? base.unlockedUnits : [],
    doneTasks: Array.isArray(base.doneTasks) ? base.doneTasks : [],
  };
}
function leerSrs(): SrsMapa {
  const s = store.get<SrsMapa | null>(K_SRS, null);
  return s && typeof s === 'object' ? s : {};
}
function leerRacha(): A1Racha {
  const s = store.get<Partial<A1Racha> | null>(K_STREAK, null);
  if (!s || typeof s !== 'object') return { days: 0, last: null, freezeUsed: false };
  return { days: s.days ?? 0, last: s.last ?? null, freezeUsed: !!s.freezeUsed };
}
function leerGuardadas(): A1Guardada[] {
  const s = store.get<A1Guardada[] | null>(K_SAVED, null);
  return Array.isArray(s) ? s : [];
}
function leerJob(): JobPackId | null {
  const v = store.get<string | null>(K_JOB, null);
  return v === 'tech' || v === 'ventas' || v === 'soporte' || v === 'recepcion' ? v : null;
}

/* ═══════════════════ Índice plano del catálogo ═══════════════════ */

type Indice = {
  chunk: Record<string, A1Chunk>;
  escenaDe: Record<string, A1Scene>;
  unidadDe: Record<string, A1Unit>;
  supervivencia: A1Chunk[];
};

function construirIndice(unidades: readonly A1Unit[]): Indice {
  const ix: Indice = { chunk: {}, escenaDe: {}, unidadDe: {}, supervivencia: [] };
  unidades.forEach((u) => {
    u.scenes.forEach((s) => {
      s.chunks.forEach((c) => {
        if (!c.id) return;
        ix.chunk[c.id] = c;
        ix.escenaDe[c.id] = s;
        ix.unidadDe[c.id] = u;
        if (c.survival) ix.supervivencia.push(c);
      });
    });
  });
  return ix;
}

const porOrden = (a: A1Unit, b: A1Unit) => (a.order || 0) - (b.order || 0);

const TRONCO: A1Unit[] = A1_CURSO.units.slice().sort(porOrden);

/* ═══════════════════ Store ═══════════════════ */

type A1State = {
  /** Catálogo vivo: tronco común + unidades del pack elegido (A1.2), en ese orden. */
  unidades: A1Unit[];
  /** Cuántas unidades del catálogo son del tronco (el resto es pack). */
  tronco: number;
  indice: Indice;

  onboarded: boolean;
  progreso: A1Progreso;
  srs: SrsMapa;
  racha: A1Racha;
  guardadas: A1Guardada[];
  job: JobPackId | null;

  /** Monta encima del tronco las unidades del pack activo. Idempotente. */
  setPackUnits: (units: readonly A1Unit[]) => void;
  setJob: (id: JobPackId | null) => void;

  marcarOnboarded: () => void;
  guardarProgreso: (patch: Partial<A1Progreso>) => void;
  marcarEscenaHecha: (sceneId: string) => void;
  marcarTareaHecha: (taskId: string) => void;

  /** Autoeval → Leitner: mueve la caja y recalcula el vencimiento. */
  calificar: (chunkId: string, nota: Nota) => SrsEntry | null;
  /** Sube la racha al cerrar una sesión (no punitiva: hay un perdón). */
  actualizarRacha: () => A1Racha;
  /** ★ Mis frases. Devuelve el estado NUEVO (true = quedó guardada). */
  alternarGuardada: (chunk: A1Chunk) => boolean;
};

export const useA1 = create<A1State>((set, get) => ({
  unidades: TRONCO,
  tronco: TRONCO.length,
  indice: construirIndice(TRONCO),

  onboarded: store.get<boolean>(K_ONBOARDED, false),
  progreso: leerProgreso(),
  srs: leerSrs(),
  racha: leerRacha(),
  guardadas: leerGuardadas(),
  job: leerJob(),

  /* El pack va DESPUÉS del tronco y ordenado por su propio `order`: elegir
     trabajo agrega unidades, nunca reordena ni pisa las de todos. Se compara
     por identidad de ids porque la vista lo llama desde un efecto y volver a
     construir el índice en cada render sería un ciclo. */
  setPackUnits: (units) => {
    const extra = units.slice().sort(porOrden);
    const actual = get().unidades;
    const igual =
      actual.length === TRONCO.length + extra.length &&
      extra.every((u, i) => actual[TRONCO.length + i]?.id === u.id);
    if (igual) return;
    const unidades = [...TRONCO, ...extra];
    set({ unidades, tronco: TRONCO.length, indice: construirIndice(unidades) });
  },

  setJob: (job) => {
    store.set(K_JOB, job);
    set({ job });
  },

  marcarOnboarded: () => {
    store.set(K_ONBOARDED, true);
    set({ onboarded: true });
  },

  guardarProgreso: (patch) => {
    const progreso: A1Progreso = { ...get().progreso, ...patch, ts: Date.now() };
    store.set(K_PROGRESS, progreso);
    set({ progreso });
  },

  marcarEscenaHecha: (sceneId) => {
    const p = get().progreso;
    if (!sceneId || p.doneScenes.includes(sceneId)) return;
    const progreso: A1Progreso = { ...p, doneScenes: [...p.doneScenes, sceneId] };
    store.set(K_PROGRESS, progreso);
    set({ progreso });
  },

  marcarTareaHecha: (taskId) => {
    const p = get().progreso;
    if (!taskId || p.doneTasks.includes(taskId)) return;
    const progreso: A1Progreso = { ...p, doneTasks: [...p.doneTasks, taskId] };
    store.set(K_PROGRESS, progreso);
    set({ progreso });
  },

  /* Transiciones del Leitner (§4.3 del spec legacy):
       Clavado  → box = min(box+1, 5); due = hoy + intervalo[box nuevo]
       Casi     → caja intacta;        due = mañana
       Todavía  → box = 1;             due = mañana (+ se re-encola en la sesión)
     Un chunk que nunca se vio entra en caja 1 con due=hoy y sobre eso se
     aplica la nota, así el primer "Clavado" ya lo empuja a caja 2. */
  calificar: (chunkId, nota) => {
    if (!chunkId) return null;
    const today = hoyStr();
    const prev = get().srs[chunkId];
    const e: SrsEntry =
      prev && typeof prev === 'object'
        ? { ...prev }
        : { box: 1, due: today, seen: 0, clavado: 0, casi: 0, no: 0, last: null, firstSeen: today };
    if (!e.box) e.box = 1;
    if (!e.firstSeen) e.firstSeen = today;
    e.seen = (e.seen || 0) + 1;
    e.last = today;

    if (nota === 'clavado') {
      e.clavado = (e.clavado || 0) + 1;
      e.box = Math.min(e.box + 1, 5);
      e.due = sumarDias(today, intervaloDeCaja(e.box));
    } else if (nota === 'casi') {
      e.casi = (e.casi || 0) + 1;
      // La caja NO se mueve (ni sube ni baja): se la vuelve a cobrar mañana.
      e.due = sumarDias(today, 1);
    } else {
      e.no = (e.no || 0) + 1;
      e.box = 1; // cae a caja 1, no a "caja 0": ya la conocía
      e.due = sumarDias(today, 1);
    }

    const srs: SrsMapa = { ...get().srs, [chunkId]: e };
    store.set(K_SRS, srs);
    set({ srs });
    return e;
  },

  /* Racha propia, NUNCA la de Gus (esa escribe rodeo_streak y sí sincroniza).
     Un día saltado no la rompe de una: hay un perdón, y cuando se acaba el
     reinicio es suave — cero "perdiste N días" en rojo. */
  actualizarRacha: () => {
    const s = { ...get().racha };
    const today = hoyStr();
    if (s.last === today) return s; // ya contó hoy
    const ayer = sumarDias(today, -1);
    if (s.last == null) {
      s.days = 1;
    } else if (s.last === ayer) {
      s.days = (s.days || 0) + 1;
    } else if (!s.freezeUsed) {
      s.freezeUsed = true; // perdón: la racha sigue viva
      s.days = (s.days || 0) + 1;
    } else {
      s.days = 1;
      s.freezeUsed = false;
    }
    s.last = today;
    store.set(K_STREAK, s);
    set({ racha: s });
    return s;
  },

  alternarGuardada: (chunk) => {
    if (!chunk?.id) return false;
    const lista = get().guardadas;
    const ya = lista.some((x) => x && x.id === chunk.id);
    const guardadas: A1Guardada[] = ya
      ? lista.filter((x) => x && x.id !== chunk.id)
      : [...lista, { id: chunk.id, en: chunk.en, es: chunk.es, why: chunk.why_es, ts: Date.now() }];
    store.set(K_SAVED, guardadas);
    set({ guardadas });
    return !ya;
  },
}));

/* ═══════════════════ Leitner: intervalos y consultas ═══════════════════ */

/** Índice = caja-1. Cinco cajas, cinco saltos. */
export const INTERVALOS = [1, 3, 7, 14, 30] as const;
export function intervaloDeCaja(box: number): number {
  const b = Math.max(1, Math.min(box | 0 || 1, 5));
  return INTERVALOS[b - 1]!;
}

/** Tope anti-avalancha: nadie abre la app para que le cobren 40 frases. */
export const TOPE_VENCIDOS = 8;

/** Vencidos (due <= hoy), lo más frágil primero: caja baja y due viejo. */
export function vencidos(): Vencido[] {
  const { srs, indice } = useA1.getState();
  const today = hoyStr();
  const out: Vencido[] = [];
  for (const id of Object.keys(srs)) {
    const entry = srs[id];
    const chunk = indice.chunk[id];
    if (!entry || !chunk) continue; // el contenido manda: si ya no existe, no se cobra
    if (String(entry.due) <= today) out.push({ id, entry, chunk });
  }
  out.sort((a, b) => {
    const d = (a.entry.box || 1) - (b.entry.box || 1);
    if (d !== 0) return d;
    return a.entry.due < b.entry.due ? -1 : a.entry.due > b.entry.due ? 1 : 0;
  });
  return out;
}

/** Métricas HONESTAS: "ya te salen solas" = caja>=4. Cero XP, cero puntos. */
export function metricas(): Metricas {
  const { srs, indice } = useA1.getState();
  let salen = 0,
    repertorio = 0,
    frescas = 0,
    total = 0;
  for (const id of Object.keys(srs)) {
    if (!indice.chunk[id]) continue;
    const box = srs[id]!.box || 1;
    total++;
    if (box >= 4) salen++;
    if (box >= 3) repertorio++;
    if (box <= 2) frescas++;
  }
  return { salen, repertorio, frescas, total };
}

/** Total de frases del catálogo vivo (denominador de la barra del mapa). */
export function totalChunks(): number {
  return Object.keys(useA1.getState().indice.chunk).length;
}

/* ═══════════════════ Currículo: escenas, unidades, desbloqueo ═══════════════════ */

export function escenasHechas(u: A1Unit): boolean {
  if (!u.scenes.length) return false;
  const hechas = useA1.getState().progreso.doneScenes;
  return u.scenes.every((s) => hechas.includes(s.id));
}

export function tareaHecha(taskId: string): boolean {
  return useA1.getState().progreso.doneTasks.includes(taskId);
}

/* Desbloqueo: la primera de cada bloque y el kit de supervivencia están
   abiertos desde el día 1; el resto se abre al terminar las escenas de la
   anterior. "Bloque" es el tronco o el pack: si el pack empezara encadenado al
   final del tronco, elegir trabajo no daría NADA hoy — y elegirlo es
   justamente lo que promete el selector de A1.2. */
export function estaDesbloqueada(unitId: string): boolean {
  const { unidades, tronco } = useA1.getState();
  const idx = unidades.findIndex((u) => u.id === unitId);
  if (idx < 0) return false;
  if (idx === 0 || idx === tronco) return true; // primera del tronco / primera del pack
  if (unidades[idx]!.survival) return true;
  return escenasHechas(unidades[idx - 1]!);
}

/** Dominio de una unidad: cuántos de sus chunks llegaron a caja>=3. */
export function dominioUnidad(u: A1Unit): { total: number; box3: number; tocados: number } {
  const srs = useA1.getState().srs;
  const ids: string[] = [];
  u.scenes.forEach((s) => s.chunks.forEach((c) => { if (!ids.includes(c.id)) ids.push(c.id); }));
  let box3 = 0,
    tocados = 0;
  ids.forEach((id) => {
    const e = srs[id];
    if (!e) return;
    tocados++;
    if ((e.box || 1) >= 3) box3++;
  });
  return { total: ids.length, box3, tocados };
}

/** Situación DOMINADA: >=80% de sus frases en caja>=3. */
export function unidadDominada(m: { total: number; box3: number }): boolean {
  return m.total > 0 && m.box3 >= Math.ceil(m.total * 0.8);
}

export type Retomar = { unit: A1Unit; scene: A1Scene; chunkIdx: number; sceneNum: number; sceneTotal: number };

/** "Seguí donde ibas": la última escena tocada que quedó a medias. Al
    terminarla, chunkIdx queda fuera de rango y deja de aparecer sola. */
export function puntoDeRetomar(): Retomar | null {
  const { progreso, unidades } = useA1.getState();
  if (!progreso.unitId || !progreso.sceneId) return null;
  const unit = unidades.find((u) => u.id === progreso.unitId);
  if (!unit) return null;
  const idx = unit.scenes.findIndex((s) => s.id === progreso.sceneId);
  const scene = idx >= 0 ? unit.scenes[idx]! : null;
  if (!scene) return null;
  const i = progreso.chunkIdx;
  if (typeof i !== 'number' || i < 0 || i >= scene.chunks.length) return null;
  return { unit, scene, chunkIdx: i, sceneNum: idx + 1, sceneTotal: unit.scenes.length };
}

/** ¿Es la PRIMERA vez que se entra a esta unidad? Se deduce del progreso que ya
    existe (ninguna escena cerrada y ningún chunk suyo en el SRS) en vez de
    guardar una marca nueva: las claves rodeo_a1_* son las del legacy y no se
    les inventa un campo solo pa' decidir si Alfred saluda. */
export function unidadVirgen(u: A1Unit): boolean {
  const { progreso, srs } = useA1.getState();
  return u.scenes.every((s) => !progreso.doneScenes.includes(s.id) && s.chunks.every((c) => !srs[c.id]));
}

/** La escena por la que sigue una unidad: la primera sin terminar. */
export function proximaEscena(u: A1Unit): A1Scene | null {
  const hechas = useA1.getState().progreso.doneScenes;
  return u.scenes.find((s) => !hechas.includes(s.id)) ?? u.scenes[0] ?? null;
}

/** El repaso también destraba: si TODOS los chunks de la escena ya entraron al
    SRS, la escena cuenta como hecha aunque nunca se recorriera en modo lineal. */
export function quizaCerrarEscena(scene: A1Scene | null): void {
  if (!scene || !scene.chunks.length) return;
  const srs = useA1.getState().srs;
  if (scene.chunks.every((c) => !!srs[c.id])) useA1.getState().marcarEscenaHecha(scene.id);
}

/* ═══════════════════ Selección de sesión: "Repaso de pasillo" ═══════════════════ */

/** Chunks que todavía no entraron al SRS, en orden de currículo. */
export function nuevos(n: number): A1Chunk[] {
  if (n <= 0) return [];
  const { srs, unidades } = useA1.getState();
  const out: A1Chunk[] = [];
  const vistos = new Set<string>();
  for (const u of unidades) {
    if (out.length >= n) break;
    if (!estaDesbloqueada(u.id)) continue;
    const escenas = u.scenes.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const s of escenas) {
      if (out.length >= n) break;
      for (const c of s.chunks) {
        if (out.length >= n) break;
        if (vistos.has(c.id) || srs[c.id]) continue;
        vistos.add(c.id);
        out.push(c);
      }
    }
  }
  return out;
}

export type EnCola = { chunk: A1Chunk; clase: Clase };

/* Cola del repaso: (1) calentamiento = 1 vencido de la caja MÁS ALTA (arrancar
   con una victoria) · (2) nuevos según la carga · (3) el resto de vencidos con
   tope. Regla de nuevos: <=4 vencidos → +3 · 5-6 → +2 · >=7 → +0. Con el
   backlog alto no se agrega leña al fuego. */
export function construirColaRepaso(): { cola: EnCola[]; dueCount: number; newCount: number } {
  const due = vencidos();
  const dueCount = due.length;
  const nNuevos = dueCount <= 4 ? 3 : dueCount <= 6 ? 2 : 0;

  const resto = due.slice();
  let warm: Vencido | null = null;
  if (resto.length) {
    let hi = 0;
    for (let k = 1; k < resto.length; k++) {
      if ((resto[k]!.entry.box || 1) > (resto[hi]!.entry.box || 1)) hi = k;
    }
    warm = resto.splice(hi, 1)[0]!;
  }
  const recortado = resto.slice(0, TOPE_VENCIDOS - (warm ? 1 : 0));
  const frescos = nuevos(nNuevos);

  const cola: EnCola[] = [];
  if (warm) cola.push({ chunk: warm.chunk, clase: 'due' });
  frescos.forEach((c) => cola.push({ chunk: c, clase: 'teach' }));
  recortado.forEach((d) => cola.push({ chunk: d.chunk, clase: 'due' }));
  return { cola, dueCount, newCount: frescos.length };
}

/* ═══════════════════ Rungs: la caja decide el reto del PASO 2 ═══════════════════
     caja 1           → Reconocer  (MCQ con distractores)
     caja 2 con molde → Completar  (cloze con los swaps)
     caja 3           → Producir   (de memoria, sin ayuda)
     caja 4-5 c/molde → Swap       (el molde con TU situación)
   Las frases fijas (frame:null) saltan cloze y swap: el motor no inventa un
   hueco donde no lo hay. Solo el repaso escala; lo nuevo se enseña completo. */
export function rungDe(chunk: A1Chunk, clase: Clase): Rung {
  if (clase !== 'due') return 'teach';
  const box = useA1.getState().srs[chunk.id]?.box || 1;
  const molde = !!chunk.frame;
  if (box <= 1) return 'mcq';
  if (box === 2) return molde ? 'cloze' : 'mcq';
  if (box === 3) return 'producir';
  return molde ? 'swap' : 'producir';
}

export type OpcionMcq = { text: string; correcta: boolean };

/** Hermanos de escena (y si no alcanzan, de unidad): respaldo de distractores. */
function hermanos(c: A1Chunk): string[] {
  const { indice } = useA1.getState();
  const out: string[] = [];
  const vistos = new Set<string>([c.id]);
  const add = (lista: readonly A1Chunk[]) =>
    lista.forEach((x) => {
      if (!vistos.has(x.id) && x.en) {
        vistos.add(x.id);
        out.push(x.en);
      }
    });
  const escena = indice.escenaDe[c.id];
  if (escena) add(escena.chunks);
  const unidad = indice.unidadDe[c.id];
  if (out.length < 3 && unidad) unidad.scenes.forEach((s) => add(s.chunks));
  return out;
}

/** 1 correcta + hasta 3 distractores, barajadas. La correcta SIEMPRE entra. */
export function opcionesMcq(c: A1Chunk): OpcionMcq[] {
  const opts: OpcionMcq[] = [{ text: c.en, correcta: true }];
  const usados = new Set<string>([normEn(c.en)]);
  (c.distractors_es || []).forEach((d) => {
    if (opts.length >= 4 || !d) return;
    const k = normEn(d);
    if (usados.has(k)) return;
    usados.add(k);
    opts.push({ text: d, correcta: false });
  });
  if (opts.length < 3) {
    for (const h of hermanos(c)) {
      if (opts.length >= 4) break;
      const k = normEn(h);
      if (usados.has(k)) continue;
      usados.add(k);
      opts.push({ text: h, correcta: false });
    }
  }
  return barajar(opts);
}

/** La ficha que reconstruye la frase; si ninguna calza, la primera (convención
    del contenido: la pieza propia del chunk va de primera). */
export function swapCorrecto(c: A1Chunk): string | null {
  const swaps = c.swaps || [];
  if (!swaps.length) return null;
  const objetivo = normEn(c.en);
  for (const s of swaps) {
    if (normEn(String(c.frame).replace('___', s)) === objetivo) return s;
  }
  return swaps[0]!;
}

/** ¿Está en "Mis frases"? */
export function estaGuardada(id: string): boolean {
  return useA1.getState().guardadas.some((x) => x && x.id === id);
}
