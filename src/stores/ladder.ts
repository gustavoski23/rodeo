import { create } from 'zustand';

import { getDNA, onDnaChange, type DnaItem } from '@/lib/dna';
import { store } from '@/lib/storage';

/* Estado de SUBE (ladder) + lo que DNA necesita del mundo exterior.
   Port de los campos de `state` del viejo (public/legacy.html:3016-3029) y de
   updateStreak/updateBar (L6784-6792, L6850-6853).

   Las CLAVES y las FORMAS son las del legacy, sin migración:
     rodeo_ladder_xp   { pct, clavados, bestCombo }
     rodeo_streak      { days, last:'YYYY-MM-DD' }
     rodeo_seen_ladder string[]  (persistido truncado a 200)
     rodeo_stories     number    (solo LECTURA aquí: lo escribe story-mode)
     rodeo_dna         lo maneja @/lib/dna; aquí solo el borrado (§6.1)

   Lo que NO persiste, igual que en el viejo: pool, idx, combo y los clavados
   del run. Son de la sesión y mueren al salir de la vista. */

export type LadderXP = { pct: number; clavados: number; bestCombo: number };
export type Streak = { days: number; last: string };

/* El peldaño tal como lo devuelve el modelo (§5.1) y como lo fabrica la veta
   MIS FALLOS desde el DNA. */
export type Rung = {
  b2: string;
  context_en: string;
  c1: string;
  swap: string;
  register: string;
  note_es: string;
};

const XP_DEFECTO: LadderXP = { pct: 0, clavados: 0, bestCombo: 0 };
const STREAK_DEFECTO: Streak = { days: 0, last: '' };

function leerXP(): LadderXP {
  const v = store.get<LadderXP>('rodeo_ladder_xp', XP_DEFECTO);
  return v && typeof v === 'object' ? { ...XP_DEFECTO, ...v } : { ...XP_DEFECTO };
}
function leerStreak(): Streak {
  const v = store.get<Streak>('rodeo_streak', STREAK_DEFECTO);
  return v && typeof v === 'object' ? { ...STREAK_DEFECTO, ...v } : { ...STREAK_DEFECTO };
}

/* seenLadder en memoria crece toda la sesión; solo el store.set se trunca a
   200 y el prompt usa los últimos 60. Tres números distintos, a propósito
   (trampa §9.5). Vive fuera del store de zustand porque nadie lo pinta. */
let seenLadder: string[] = store.get<string[]>('rodeo_seen_ladder', []);
if (!Array.isArray(seenLadder)) seenLadder = [];

export function seenAvoid(): string {
  return seenLadder.slice(-60).join(' | ') || 'ninguna';
}

export function pushSeen(b2s: string[]): void {
  b2s.forEach((b2) => seenLadder.push(b2));
  store.set('rodeo_seen_ladder', seenLadder.slice(-200));
}

type LadderState = {
  xp: LadderXP;
  streak: Streak;
  /** rodeo_stories — solo lectura para el stat "Episodios" de DNA. */
  stories: number;
  /** Copia viva del DNA para que DNA y MIS FALLOS repinten al cambiar. */
  dna: DnaItem[];

  /* En memoria, no persiste (trampa §9.3) */
  pool: Rung[];
  idx: number;
  combo: number;
  runClavados: number;
  /** Guard equivalente a `state.busy` del viejo (trampa §9.21). */
  busy: boolean;

  setBusy: (v: boolean) => void;
  /** updateStreak() L6784 — VERBATIM, fechas en UTC. */
  updateStreak: () => void;
  /** Entrada a la vista: renderLadder() L6855 (racha + barra + run limpio). */
  enterLadder: () => void;
  iniciarRun: (pool: Rung[]) => void;
  siguiente: () => void;
  limpiarRun: () => void;
  /** selfJudge L7031: el trozo que toca estado. Devuelve el combo resultante. */
  registrarClavado: (nailed: boolean) => number;
  /** Borrado del DNA por identidad, no por índice (trampa §9.14). */
  borrarDna: (item: DnaItem) => void;
  refrescarDna: () => void;
};

export const useLadder = create<LadderState>((set, get) => ({
  xp: leerXP(),
  streak: leerStreak(),
  stories: store.get<number>('rodeo_stories', 0) || 0,
  dna: getDNA(),

  pool: [],
  idx: 0,
  combo: 0,
  runClavados: 0,
  busy: false,

  setBusy: (busy) => set({ busy }),

  updateStreak: () => {
    const today = new Date().toISOString().slice(0, 10);
    const s = get().streak;
    if (s.last === today) return; // ya contada hoy
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const next: Streak = { days: s.last === yest ? s.days + 1 : 1, last: today };
    store.set('rodeo_streak', next);
    set({ streak: next });
  },

  enterLadder: () => {
    // ⚠ Abrir SUBE acredita la racha del día sin hacer nada. Es intencional
    // (trampa §9.1): estaba así en renderLadder() y mover el corte cambiaría
    // la racha de los usuarios que ya la tienen viva.
    get().updateStreak();
    set({ pool: [], idx: 0, combo: 0, runClavados: 0, stories: store.get<number>('rodeo_stories', 0) || 0 });
  },

  iniciarRun: (pool) => set({ pool, idx: 0, combo: 0, runClavados: 0 }),
  siguiente: () => set((s) => ({ idx: s.idx + 1 })),
  limpiarRun: () => set({ pool: [], idx: 0 }),

  registrarClavado: (nailed) => {
    if (!nailed) {
      set({ combo: 0 });
      return 0;
    }
    const s = get();
    const combo = s.combo + 1;
    const xp: LadderXP = {
      pct: Math.min(97, s.xp.pct + 3), // tope duro 97: C1 no se "termina"
      clavados: s.xp.clavados + 1,
      bestCombo: combo > s.xp.bestCombo ? combo : s.xp.bestCombo,
    };
    store.set('rodeo_ladder_xp', xp);
    set({ combo, runClavados: s.runClavados + 1, xp });
    return combo;
  },

  borrarDna: (item) => {
    // @/lib/dna no expone deleteDNA y no se puede editar: se escribe la misma
    // clave con el mismo formato y se avisa a la vista. El caché de módulo de
    // dna.ts se recarga solo en el próximo arranque; dentro de la sesión el
    // filtrado por identidad basta porque saveDNA hace unshift sobre su copia.
    const lista = getDNA();
    const i = lista.indexOf(item);
    if (i < 0) return;
    lista.splice(i, 1); // mutación in situ: es el MISMO array que cachea dna.ts
    store.set('rodeo_dna', lista);
    set({ dna: [...lista] });
  },

  refrescarDna: () => set({ dna: [...getDNA()] }),
}));

/* Cuando TALK o SLANG guardan algo, DNA y MIS FALLOS lo ven sin recargar. */
onDnaChange((items) => useLadder.setState({ dna: [...items] }));

/* Puente de RÉTAME (window.rodeoCardsBridge, L6841): js/cards-mode.js llama a
   updateStreak/getDNA desde fuera del bundle. Se publican las dos piezas que
   dependen de este store; el resto del puente (speak, toast, saveDNA,
   tipPrimeraVez) lo cablea el orquestador si RÉTAME sigue vivo. */
declare global {
  interface Window {
    rodeoCardsBridge?: Record<string, unknown>;
  }
}
if (typeof window !== 'undefined') {
  window.rodeoCardsBridge = {
    ...(window.rodeoCardsBridge || {}),
    updateStreak: () => useLadder.getState().updateStreak(),
    getDNA: () => getDNA(),
  };
}
