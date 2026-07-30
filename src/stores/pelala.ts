/* Estado de Pélala — el sub-feature de stickers peel dentro de SLANG.
   Dos modos separados (picker → muro | reto). Aislado: no toca stores/app.ts
   ni stores/slang.ts (zona caliente del otro agente). El enchufe dentro de
   SLANG son las ~6 líneas de wiring que se difieren a la integración. */

import { create } from 'zustand';

import { DECK, type SlangTerm } from '@/content/pelala/deck';

export type PelalaMode = 'picker' | 'muro' | 'reto';

/* Pista de esquina "por dónde pelar" — se muestra una sola vez (persistida).
   Sufijo _v2: resetea la pista para quien ya tenía el flag viejo. */
const PEEL_HINT_KEY = 'pelala_peel_hint_visto_v2';
function leerPeelHintVisto(): boolean {
  try {
    return localStorage.getItem(PEEL_HINT_KEY) === '1';
  } catch {
    return false;
  }
}
function marcarPeelHintVistoLS(): void {
  try {
    localStorage.setItem(PEEL_HINT_KEY, '1');
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}

/* Términos guardados — persistidos a localStorage (patrón manual de Rodeo). */
const GUARDADOS_KEY = 'pelala_guardados';
function leerGuardados(): string[] {
  try {
    const raw = localStorage.getItem(GUARDADOS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
function escribirGuardados(ids: string[]): void {
  try {
    localStorage.setItem(GUARDADOS_KEY, JSON.stringify(ids));
  } catch {
    /* almacenamiento no disponible: se ignora en silencio */
  }
}

/* Baraja determinista-por-sesión sin Math.random en import (evita rarezas de
   SSR/estabilidad): rota el mazo por un offset fijo. Se re-baraja al entrar. */
function rotated<T>(arr: T[], offset: number): T[] {
  const n = arr.length;
  if (n === 0) return arr;
  const k = ((offset % n) + n) % n;
  return arr.slice(k).concat(arr.slice(0, k));
}

type PelalaState = {
  mode: PelalaMode;
  open: (mode: Exclude<PelalaMode, 'picker'>) => void;
  toPicker: () => void;

  /* ----- Mazo compartido (orden de la sesión) ----- */
  orden: SlangTerm[];
  barajar: (offset?: number) => void;

  /* ----- El Muro: índice de lectura ----- */
  muroIndex: number;
  muroActual: () => SlangTerm;
  muroSiguiente: () => void; // al despegar

  /* ----- Pélala: reto + marcador ----- */
  retoIndex: number;
  retoActual: () => SlangTerm;
  aciertos: number;
  fallos: number;
  intento: 'idle' | 'correcto' | 'incorrecto';
  responder: (correcto: boolean) => void; // marca el intento (dispara el peel si correcto)
  retoSiguiente: () => void; // tras el peel de recompensa
  reiniciarReto: () => void;

  /* ----- Guardados (bookmark tipo Instagram) ----- */
  guardados: string[];
  estaGuardado: (id: string) => boolean;
  toggleGuardar: (id: string) => void;

  /* ----- Pista de esquina "por dónde pelar" (una sola vez) ----- */
  peelHintVisto: boolean;
  marcarPeelHintVisto: () => void;
};

export const usePelala = create<PelalaState>((set, get) => ({
  mode: 'picker',
  open: (mode) => set({ mode }),
  toPicker: () => set({ mode: 'picker' }),

  orden: DECK,
  barajar: (offset = 3) => set({ orden: rotated(DECK, offset) }),

  muroIndex: 0,
  muroActual: () => {
    const { orden, muroIndex } = get();
    return orden[muroIndex % orden.length];
  },
  muroSiguiente: () =>
    set((s) => ({ muroIndex: (s.muroIndex + 1) % s.orden.length })),

  retoIndex: 0,
  retoActual: () => {
    const { orden, retoIndex } = get();
    return orden[retoIndex % orden.length];
  },
  aciertos: 0,
  fallos: 0,
  intento: 'idle',
  responder: (correcto) =>
    set((s) =>
      correcto
        ? { intento: 'correcto', aciertos: s.aciertos + 1 }
        : { intento: 'incorrecto', fallos: s.fallos + 1 },
    ),
  retoSiguiente: () =>
    set((s) => ({
      retoIndex: (s.retoIndex + 1) % s.orden.length,
      intento: 'idle',
    })),
  reiniciarReto: () => set({ retoIndex: 0, aciertos: 0, fallos: 0, intento: 'idle' }),

  guardados: leerGuardados(),
  estaGuardado: (id) => get().guardados.includes(id),
  toggleGuardar: (id) =>
    set((s) => {
      const next = s.guardados.includes(id)
        ? s.guardados.filter((x) => x !== id)
        : [...s.guardados, id];
      escribirGuardados(next);
      return { guardados: next };
    }),

  peelHintVisto: leerPeelHintVisto(),
  marcarPeelHintVisto: () => {
    if (get().peelHintVisto) return;
    marcarPeelHintVistoLS();
    set({ peelHintVisto: true });
  },
}));
