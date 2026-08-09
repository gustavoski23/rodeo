import { create } from 'zustand';

import { A1_CURSO } from '@/content/a1/core';
import { T0_UNIDADES } from '@/content/a1/t0-antes-de-hablar';
import { T3_UNIDADES } from '@/content/a1/t3-viaje';
import { PENDIENTES, TRAMOS } from '@/content/a1/tramos';
import type { A1Chunk, A1Scene, A1Unit, JobPackId } from '@/content/a1/tipos';
import type { A1ChunkRuta, A1SceneRuta, A1Tramo, A1TramoId, A1UnitRuta } from '@/content/a1/tipos-ruta';
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
/* El tramo que el usuario está mirando. Clave NUEVA (las otras rodeo_a1_* son
   del legacy y no se les toca ni el nombre ni la forma). Guarda el id pelado
   —'t3'— y como todo pasa por `store`, en disco queda el JSON `"t3"`. Se lee
   validando contra TRAMOS: un id de un tramo que ya no existe se descarta en
   vez de dejar la barra midiendo la nada. */
const K_TRAMO = 'rodeo_a1_tramo';

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
function leerTramoVisto(): A1TramoId | null {
  const v = store.get<string | null>(K_TRAMO, null);
  return TRAMOS.some((t) => t.id === v) ? (v as A1TramoId) : null;
}

/* ═══════════════════ Índice plano del catálogo ═══════════════════ */

/* El índice sale tipado con los tipos ANCHOS de la ruta (A1SceneRuta /
   A1UnitRuta). No es cosmética: el repaso saca la escena de un chunk de acá, y
   con `Record<string, A1Scene>` el `nodeKind` desaparecía del sistema de tipos
   justo en el camino donde la sesión lo necesita para elegir su loop. */
type Indice = {
  chunk: Record<string, A1Chunk>;
  escenaDe: Record<string, A1SceneRuta>;
  unidadDe: Record<string, A1UnitRuta>;
  supervivencia: A1Chunk[];
};

function construirIndice(unidades: readonly A1UnitRuta[]): Indice {
  const ix: Indice = { chunk: {}, escenaDe: {}, unidadDe: {}, supervivencia: [] };
  const yaSos = new Set<string>();
  unidades.forEach((u) => {
    u.scenes.forEach((s) => {
      s.chunks.forEach((c) => {
        if (!c.id) return;
        ix.chunk[c.id] = c;
        ix.escenaDe[c.id] = s;
        ix.unidadDe[c.id] = u;
        /* El guard NO es paranoia: el contenido REUSA el mismo chunk en dos
           escenas a propósito (una palabra que se ve en cognados y vuelve en la
           parada de pronunciación) para no inventarle un id nuevo — el SRS
           indexa por id y duplicar el id le cobraría dos veces al usuario la
           misma palabra. O sea que compartir es lo correcto y lo que hay que
           arreglar es el índice. Sin este `if`, la lista de supervivencia trae
           el mismo chunk dos veces y HojaPanico pinta dos elementos de React
           con la misma key. */
        if (c.survival && !yaSos.has(c.id)) {
          yaSos.add(c.id);
          ix.supervivencia.push(c);
        }
      });
    });
  });
  return ix;
}

/* ═══════════════════ El catálogo se arma desde TRAMOS ═══════════════════

   El orden de `unidades` ES el currículo: nuevos() lo recorre en orden y de ahí
   salen las frases nuevas de cada repaso. Antes esto era
   `A1_CURSO.units.slice().sort(porOrden)` y eso ya no da.

   MEDIDO: de las 21 unidades que existen hoy, 20 empatan en `order` — el core
   usa 1-7, el Tramo 0 usa 1-6 y el Tramo 3 usa 1-8. El empate NO da un orden
   aleatorio (Array.sort es estable desde ES2019): daba siempre el mismo, y por
   eso era peor. El resultado real era
     u1-llegar → t0-cognados → t3-aeropuerto → u2-supervivencia → t0-sonidos → …
   un intercalado perfecto de oficina / pre-A1 / aeropuerto que se ve estable y
   parece intencional. Un bug que parece diseño no lo reporta nadie.

   Ahora manda tramos.ts: se recorre TRAMOS en orden y cada id de `unitIds` se
   resuelve contra el mapa de unidades disponibles. Un id que no resuelve —las
   PENDIENTES, que todavía no tienen contenido— NO entra al catálogo. El mapa
   las pinta igual con candado y "pronto", pero eso lo hace leyendo
   TRAMOS/PENDIENTES por su cuenta; meterlas acá obligaría a filtrarlas en cada
   consulta del motor y tarde o temprano alguien se olvidaría de una.

   El pack de trabajo entra en la POSICIÓN DEL TRAMO 5 ("Tu trabajo",
   `unitIds: []` con el comentario "lo llena el pack activo"), no al final.
   Antes era `[...TRONCO, ...extra]`, que con el catálogo por tramos habría
   dejado el inglés de TU puesto después de "Ayer y mañana" — el nodo que
   cierra A1. Elegir trabajo tiene que dar algo pronto, no en tres meses.

   Ojo con el tipo: cada unidad sale con su `tramo` puesto acá, aunque el
   contenido viejo (core.ts, los packs) no lo declare. Así `u.tramo` es
   confiable para todos y nadie tiene que preguntarle a TRAMOS de nuevo. */

/** Una unidad tal como la trae el contenido: todavía sin saber de qué tramo es. */
type UnidadFuente = Omit<A1UnitRuta, 'tramo'>;

/* El Tramo 3 entra por acá y por ningún otro lado. Sus 8 paradas ya declaran
   `tramo: 't3'` en el contenido, pero eso NO es lo que las ordena: el orden y la
   pertenencia salen de TRAMOS.unitIds igual que las del Tramo 0. Que el archivo
   de contenido y tramos.ts coincidan es una comodidad, no la fuente de verdad —
   si algún día discreparan, manda tramos.ts y el id huérfano simplemente no
   entra al catálogo.
   Antes de esto, t3-viaje.ts existía y no lo importaba nadie: sus ids no estaban
   ni en el catálogo ni en PENDIENTES, así que el mapa ni siquiera pintaba el
   capítulo. Ocho paradas invisibles. */
const DISPONIBLES: UnidadFuente[] = [...A1_CURSO.units, ...T0_UNIDADES, ...T3_UNIDADES];

function construirCatalogo(pack: readonly A1Unit[]): A1UnitRuta[] {
  const porId = new Map<string, UnidadFuente>();
  for (const u of [...DISPONIBLES, ...pack]) porId.set(u.id, u);

  const out: A1UnitRuta[] = [];
  for (const t of TRAMOS) {
    // El tramo 'job' no lista ids: los pone el pack elegido, en su propio orden.
    const ids = t.branch === 'job' && !t.unitIds.length ? pack.map((u) => u.id) : t.unitIds;
    for (const id of ids) {
      if (PENDIENTES.has(id)) continue;
      const u = porId.get(id);
      if (!u) continue;
      out.push({ ...u, tramo: t.id });
    }
  }
  return out;
}

const CATALOGO_BASE = construirCatalogo([]);

/* ═══════════════════ Store ═══════════════════ */

type A1State = {
  /** Catálogo vivo, en orden de TRAMOS. Cada unidad sabe su tramo (`u.tramo`),
      que es lo que reemplazó al viejo `tronco: number`: con ocho tramos, un
      índice de corte ya no describe nada. */
  unidades: A1UnitRuta[];
  indice: Indice;

  onboarded: boolean;
  progreso: A1Progreso;
  srs: SrsMapa;
  racha: A1Racha;
  guardadas: A1Guardada[];
  job: JobPackId | null;
  /** El tramo que el usuario está mirando (rodeo_a1_tramo). null = nunca entró
      a una parada, o sea que todavía no hay nada que recordar. */
  tramoVisto: A1TramoId | null;

  /** Rearma el catálogo metiendo el pack activo en el Tramo 5. Idempotente. */
  setPackUnits: (units: readonly A1Unit[]) => void;
  setJob: (id: JobPackId | null) => void;
  /** Anota en qué tramo está parado el usuario. Lo llama el mapa al tocar un
      nodo — es el único momento en que el usuario DICE dónde quiere estar. */
  verTramo: (id: A1TramoId | null) => void;

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
  unidades: CATALOGO_BASE,
  indice: construirIndice(CATALOGO_BASE),

  onboarded: store.get<boolean>(K_ONBOARDED, false),
  progreso: leerProgreso(),
  srs: leerSrs(),
  racha: leerRacha(),
  guardadas: leerGuardadas(),
  job: leerJob(),
  tramoVisto: leerTramoVisto(),

  /* Elegir trabajo AGREGA unidades, nunca reordena ni pisa las de todos: el
     catálogo se reconstruye entero desde TRAMOS y el pack cae en el hueco del
     Tramo 5. Se compara la lista de ids resultante antes de escribir porque la
     vista llama esto desde un efecto y rearmar el índice en cada render sería
     un ciclo. */
  setPackUnits: (units) => {
    const unidades = construirCatalogo(units);
    const actual = get().unidades;
    if (actual.length === unidades.length && unidades.every((u, i) => actual[i]?.id === u.id)) return;
    set({ unidades, indice: construirIndice(unidades) });
  },

  setJob: (job) => {
    store.set(K_JOB, job);
    set({ job });
  },

  /* Se corta si no cambió: el mapa llama esto en CADA toque de nodo y sin la
     guarda cada toque sería una escritura a localStorage más un render de toda
     la vista. Escribir lo mismo dos veces no es gratis en un Android viejo. */
  verTramo: (id) => {
    if (get().tramoVisto === id) return;
    store.set(K_TRAMO, id);
    set({ tramoVisto: id });
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

/* ── Desbloqueo: primero el TRAMO, después la cadena dentro del tramo ──────

   Antes esto asumía dos bloques (`idx === 0 || idx === tronco`). Con ocho
   tramos no sirve. Las reglas de ahora:

     · Un tramo está ABIERTO si es el primero con contenido, o si el tramo
       anterior CON CONTENIDO está cerrado. Un tramo sin ninguna unidad resuelta
       (hoy t4, t6 y t7, que son todo PENDIENTES) es transparente para la
       cadena: se saltea. Si no se salteara, todo lo que viene después quedaría
       muerto para siempre en vez de "pronto".
     · Un tramo está CERRADO si todas sus unidades resueltas tienen las escenas
       hechas. Sin unidades resueltas no está cerrado: está vacío.
     · Dentro de un tramo abierto la cadena corre sobre las unidades RESUELTAS,
       no sobre `unidades[idx-1]` a secas.

   ⚠️ `survival` YA NO DESBLOQUEA UNIDADES. Antes acá había un
   `if (unidades[idx].survival) return true`, y hoy eso afectaba a una sola
   unidad (u2-supervivencia). Con el contenido nuevo son SIETE, y tres viven en
   el Tramo 3 (t3-migracion, t3-moverte, t3-se-dana): el viaje entero quedaría
   medio abierto desde el minuto cero y el atajo de viaje —que ya está prendido,
   unas líneas más abajo— no tendría nada que abrir. Peor todavía: migración,
   que es la segunda parada, se abriría ANTES que el aeropuerto, que es la
   primera. Hay test que lo clava.

   Esto NO deja a nadie sin salvavidas, y conviene saber por qué antes de
   revertirlo: las frases SOS no se leen entrando a una unidad, se leen en la
   HOJA DE PÁNICO (views/a1/hojas.tsx), que se alimenta de `indice.supervivencia`
   —el índice GLOBAL del catálogo, sin filtrar por desbloqueo— y está enganchada
   por `onPanico` desde el mapa, la portada, la sesión y la tarea. O sea que
   están a un toque desde cualquier pantalla el día 1. Medido hoy con el Tramo 3
   adentro: 67 frases (t0=24 · t1=5 · t3=38), no menos.
   `survival` ahora marca FRASES (qué entra al salvavidas), no puertas. */

/** Tramos con al menos una unidad resuelta, en orden de camino. */
function tramosVivos(unidades: readonly A1UnitRuta[]): A1TramoId[] {
  return TRAMOS.filter((t) => unidades.some((u) => u.tramo === t.id)).map((t) => t.id);
}

function unidadesDelTramo(unidades: readonly A1UnitRuta[], tramo: A1TramoId): A1UnitRuta[] {
  return unidades.filter((u) => u.tramo === tramo);
}

export function tramoCerrado(tramo: A1TramoId): boolean {
  const us = unidadesDelTramo(useA1.getState().unidades, tramo);
  return us.length > 0 && us.every(escenasHechas);
}

/* ── EL ATAJO DE VIAJE ────────────────────────────────────────────────────

   Acá vivía un `const ATAJO_VIAJE = false` con la regla preparada y apagada.
   Se prendió, y al prenderse dejó de ser un booleano: son DOS preguntas
   distintas y confundirlas rompe la píldora del mapa.

     · abrePorCadena  — la fila de siempre: el tramo anterior CON CONTENIDO
                        cerrado. Los tramos vacíos (t4, t6, t7: todo PENDIENTES)
                        son transparentes, si no todo lo de atrás quedaría
                        muerto en vez de "pronto".
     · abrePorAtajo   — con el PRIMER tramo del camino cerrado, un tramo
                        `branch: 'viaje'` se abre sin haber hecho la fila. Quien
                        vuela la otra semana no va a hacer cuarenta nodos de
                        pasillo primero: cierra la app y no vuelve.

   `tramoAbierto` es la O de las dos y es PERMANENTE: una vez que el atajo
   abrió el tramo, sigue abierto pase lo que pase (arrancar el aeropuerto y
   encontrártelo cerrado al día siguiente sería la peor versión de esto).

   Lo que el atajo NO hace: marcar nada. Los tramos 1 y 2 quedan exactamente
   donde estaban, abiertos y sin hacer, esperando a que vuelva del viaje. El
   atajo salta la fila, no la borra — hay test que lo clava.

   Ojo con el `!== tramo` en abrePorAtajo: si el tramo de viaje fuera el primero
   del camino, ya abre por cadena y preguntar si está cerrado consigo mismo
   sería preguntar si se abre por haberse terminado. */

function abrePorCadena(tramo: A1TramoId, vivos: readonly A1TramoId[]): boolean {
  const i = vivos.indexOf(tramo);
  if (i < 0) return false;
  if (i === 0) return true;
  return tramoCerrado(vivos[i - 1]!);
}

function abrePorAtajo(tramo: A1TramoId, vivos: readonly A1TramoId[]): boolean {
  if (!vivos.includes(tramo)) return false;
  if (TRAMOS.find((t) => t.id === tramo)?.branch !== 'viaje') return false;
  const primero = vivos[0];
  return !!primero && primero !== tramo && tramoCerrado(primero);
}

export function tramoAbierto(tramo: A1TramoId): boolean {
  const vivos = tramosVivos(useA1.getState().unidades);
  return abrePorCadena(tramo, vivos) || abrePorAtajo(tramo, vivos);
}

/** ¿El mapa tiene que OFRECER el atajo de este tramo?

    Distinta pregunta que `tramoAbierto`, y por tres motivos que se ven en
    pantalla:

    1. Si el tramo ya abría por la cadena, esto no es un atajo: es el camino. Una
       píldora que ofrece entrar a donde ya se puede entrar caminando es ruido.
    2. Si el usuario ya entró al tramo, la oferta caducó. "¿Viajás la otra
       semana? Empezá por acá" cuando ya empezaste no es una invitación, es una
       pantalla que no se enteró. Se mide con `unidadVirgen` (ninguna escena
       cerrada y ningún chunk suyo en el SRS) en vez de guardar una marca
       "atajo_tomado": el progreso que ya existe alcanza para saberlo, y las
       claves rodeo_a1_* no reciben campos nuevos por cosas que se pueden
       deducir.
    3. La píldora desaparece pero la puerta NO se cierra: el tramo sigue abierto
       por `tramoAbierto`. Lo que caduca es el ofrecimiento, no el acceso. */
export function atajoDisponible(tramo: A1TramoId): boolean {
  const { unidades } = useA1.getState();
  const vivos = tramosVivos(unidades);
  if (!abrePorAtajo(tramo, vivos)) return false;
  if (abrePorCadena(tramo, vivos)) return false;
  return unidadesDelTramo(unidades, tramo).every(unidadVirgen);
}

export function estaDesbloqueada(unitId: string): boolean {
  const { unidades } = useA1.getState();
  const u = unidades.find((x) => x.id === unitId);
  if (!u) return false; // las PENDIENTES ni siquiera entran al catálogo
  if (!tramoAbierto(u.tramo)) return false;
  const hermanas = unidadesDelTramo(unidades, u.tramo);
  const k = hermanas.findIndex((x) => x.id === unitId);
  if (k <= 0) return true; // la primera resuelta del tramo abre con el tramo
  return escenasHechas(hermanas[k - 1]!);
}

/* ── El TRAMO ACTIVO y su barra ────────────────────────────────────────────

   La barra del mapa y la del logro se pintaban con totalChunks() de
   denominador. Con el Tramo 0 adentro eso las rompe: 12 frases dominadas eran
   12/63 (19%) y pasan a 12/158 (8%) — la barra dice que retrocediste por haber
   agregado contenido. Con el Tramo 3 ya cableado son 12/222, o sea 5%: empeora
   sola con cada tramo que entre. El texto "Ya te salen solas: 12" NO tiene ese
   problema —es un número absoluto y ningún copy muestra el denominador— así que
   lo único que se mueve es la barra.

   Chunks por tramo, medido hoy con el Tramo 3 adentro:
     t0=96 · t1=20 · t2=39 · t3=68 · el resto 0 · catálogo=222
   (222 y no 223 porque tres chunks se comparten entre unidades a propósito:
   w-help, w-v-seven y c-where-is-bathroom viven en dos paradas cada uno.)

   El numerador también se acota al tramo. Si se dejara global, el día que
   `salen` supere el tamaño del tramo la barra se clavaría en 100% mintiendo. */

export type ProgresoTramo = { tramo: A1Tramo | null; salen: number; total: number; pct: number };

/** Dónde estás parado. Primero el tramo RECORDADO (rodeo_a1_tramo, lo escribe
    el mapa al tocar un nodo); si no hay, el de la primera unidad sin terminar;
    y si ya no queda ninguna, el último — nadie "vuelve" al primero por haber
    terminado.

    La memoria no es comodidad, la trajo el atajo. Quien se salta la fila y se
    va al aeropuerto deja los tramos 1 y 2 abiertos y sin hacer, así que "la
    primera unidad sin terminar" sigue siendo la de la oficina: sin recordar,
    la barra y el rótulo del mapa medirían el pasillo mientras el tipo estudia
    migración. El recordado se descarta solo cuando el tramo ya no tiene nada
    pendiente, y ahí el cálculo vuelve a mandar — la barra avanza sola sin que
    nadie tenga que "cambiar de tramo" a mano. */
export function tramoActivo(): A1TramoId | null {
  const { unidades, tramoVisto } = useA1.getState();
  if (!unidades.length) return null;
  if (tramoVisto && unidades.some((u) => u.tramo === tramoVisto && !escenasHechas(u))) return tramoVisto;
  const pendiente = unidades.find((u) => !escenasHechas(u));
  return (pendiente ?? unidades[unidades.length - 1]!).tramo;
}

export function progresoDelTramo(): ProgresoTramo {
  const { unidades, srs } = useA1.getState();
  const id = tramoActivo();
  const tramo = TRAMOS.find((t) => t.id === id) ?? null;
  const vistos = new Set<string>();
  let salen = 0;
  for (const u of unidades) {
    if (u.tramo !== id) continue;
    for (const s of u.scenes) {
      for (const c of s.chunks) {
        if (vistos.has(c.id)) continue;
        vistos.add(c.id);
        if ((srs[c.id]?.box ?? 0) >= 4) salen++;
      }
    }
  }
  const total = vistos.size;
  return { tramo, salen, total, pct: total ? Math.round((salen / total) * 100) : 0 };
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

export type Retomar = {
  unit: A1UnitRuta;
  scene: A1SceneRuta;
  chunkIdx: number;
  sceneNum: number;
  sceneTotal: number;
};

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

/** La escena por la que sigue una unidad: la primera sin terminar. Devuelve
    A1SceneRuta —no A1Scene— porque quien la recibe (la sesión) decide su loop
    mirando `nodeKind`, y con el tipo angosto ese campo no existía. */
export function proximaEscena(u: A1UnitRuta): A1SceneRuta | null {
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
   hueco donde no lo hay. Solo el repaso escala; lo nuevo se enseña completo.

   LAS PALABRAS SUELTAS NUNCA VAN A MCQ. Medido: opcionesMcq() pone `chunk.en`
   como correcta y `distractors_es` como incorrectas, y en el Tramo 0 los
   distractores de una palabra son GLOSAS EN ESPAÑOL ("information" contra
   «inmigración» y «instalación»). O sea que la opción correcta es la única
   palabra en inglés de la pantalla y se acierta sin saber nada — y rungDe
   mandaba mcq en cajas 1 y 2, o sea el día después de aprender cada palabra.
   Para una palabra el repaso honesto es producirla: ves el español, la dices.

   El `kind` sale de A1ChunkRuta. La firma de armar.ts declara que pal() y fr()
   devuelven A1Chunk y eso borra `kind` del sistema de tipos, así que acá va un
   cast puntual. Cuando tipos-ruta.ts se fusione en tipos.ts, armar.ts debería
   declarar A1ChunkRuta y este cast se cae solo. */
export function esPalabra(chunk: A1Chunk): boolean {
  return (chunk as A1ChunkRuta).kind === 'palabra';
}

export function rungDe(chunk: A1Chunk, clase: Clase): Rung {
  if (clase !== 'due') return 'teach';
  if (esPalabra(chunk)) return 'producir';
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
