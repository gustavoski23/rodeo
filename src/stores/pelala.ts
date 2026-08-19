/* Estado de Pélala — el sub-feature de stickers peel dentro de SLANG.
   Dos modos separados (picker → muro | reto). Aislado: no toca stores/app.ts
   ni stores/slang.ts (zona caliente del otro agente). El enchufe dentro de
   SLANG son las ~6 líneas de wiring que se difieren a la integración. */

import { create } from 'zustand';

import { DECK, categoriaDe, type CategoriaId, type SlangTerm } from '@/content/pelala/deck';

export type PelalaMode = 'picker' | 'muro' | 'reto';

/* La pista de esquina "por dónde pelar" YA NO vive en el store ni se persiste:
   Gus la quiere SIEMPRE al entrar a SLANG, no una vez en la vida. Ahora es
   estado local del montaje en views/pelala/reto.tsx, que se rearma en cada
   visita. Se quitó también la clave localStorage 'pelala_peel_hint_visto_v2';
   la que exista en discos viejos queda huérfana e inocua. */

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

/** Los términos de una categoría, en el orden del DECK. */
function mazoDe(cat: CategoriaId): SlangTerm[] {
  return DECK.filter((t) => categoriaDe(t) === cat);
}

/** Categoría con la que arranca SLANG. */
const CAT_INICIAL: CategoriaId = 'dia-a-dia';

type PelalaState = {
  mode: PelalaMode;
  open: (mode: Exclude<PelalaMode, 'picker'>) => void;
  toPicker: () => void;

  /* ----- Categoría activa (el botón «explorar» la cambia) ----- */
  categoria: CategoriaId;
  setCategoria: (c: CategoriaId) => void;

  /* ----- Mazo compartido (orden de la sesión, ya filtrado por categoría) ----- */
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

};

export const usePelala = create<PelalaState>((set, get) => ({
  mode: 'picker',
  open: (mode) => set({ mode }),
  toPicker: () => set({ mode: 'picker' }),

  categoria: CAT_INICIAL,
  /* Cambiar de categoría reinicia el recorrido (mazo nuevo desde el principio):
     el índice del reto/muro y el intento en curso no tienen sentido en otro mazo. */
  setCategoria: (categoria) =>
    set({ categoria, orden: mazoDe(categoria), retoIndex: 0, muroIndex: 0, intento: 'idle' }),

  orden: mazoDe(CAT_INICIAL),
  barajar: (offset = 3) => set((s) => ({ orden: rotated(mazoDe(s.categoria), offset) })),

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

}));
