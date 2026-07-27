import { create } from 'zustand';
import { store } from '@/lib/storage';
import { temaActual, type Tema } from '@/lib/theme';

/* Estado de shell. La persistencia NO usa el middleware `persist` de zustand
   (envolvería los valores en {state,version} y rompería las claves rodeo_*):
   cada campo persistente lee/escribe su clave con el mismo formato de siempre. */

export type View = 'talk' | 'story' | 'slang' | 'ladder' | 'dna' | 'a1';

type AppState = {
  view: View;
  tema: Tema;
  nombre: string | null;
  nivel: string | null;
  cost: number;
  setView: (v: View) => void;
  setTema: (t: Tema) => void;
  setCost: (total: number) => void;
};

export const useApp = create<AppState>((set) => ({
  view: 'talk',
  tema: typeof document !== 'undefined' ? temaActual() : 'oscuro',
  nombre: store.get<string | null>('rodeo_nombre', null),
  nivel: store.get<string | null>('rodeo_nivel', null),
  cost: store.get<number>('rodeo_cost', 0),
  setView: (view) => set({ view }),
  setTema: (tema) => set({ tema }),
  setCost: (cost) => set({ cost }),
}));
