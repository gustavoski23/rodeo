import { create } from 'zustand';
import { store } from '@/lib/storage';
import { aplicarTema, ETIQUETA_TEMA, hidratarTema, type Tema } from '@/lib/theme';
import { toast } from '@/stores/toast';

/* Estado de shell. La persistencia NO usa el middleware `persist` de zustand
   (envolvería los valores en {state,version} y rompería las claves rodeo_*):
   cada campo persistente lee/escribe su clave con el mismo formato de siempre. */

export type View = 'home' | 'talk' | 'story' | 'slang' | 'ladder' | 'dna' | 'a1';

type AppState = {
  view: View;
  tema: Tema;
  nombre: string | null;
  nivel: string | null;
  cost: number;
  setView: (v: View) => void;
  setTema: (t: Tema) => void;
  /** Cambia el tema DE VERDAD: pinta <html>, persiste rodeo_tema, avisa.
      Es el único camino que usan el toggler del Home/Header y las tarjetas
      del personalizador, para que los tres no se desincronicen nunca. */
  cambiarTema: (t: Tema) => void;
  setCost: (total: number) => void;
};

export const useApp = create<AppState>((set) => ({
  // El Home aurora es la puerta de la app (decisión de Gus, 2026-07-28).
  view: 'home',
  tema: typeof document !== 'undefined' ? hidratarTema() : 'oscuro',
  nombre: store.get<string | null>('rodeo_nombre', null),
  nivel: store.get<string | null>('rodeo_nivel', null),
  cost: store.get<number>('rodeo_cost', 0),
  setView: (view) => set({ view }),
  setTema: (tema) => set({ tema }),
  cambiarTema: (tema) => {
    aplicarTema(tema);
    store.set('rodeo_tema', tema);
    set({ tema });
    // El ciclo es de TRES: sin el aviso, el tercer toque parece un no-op
    // (gradiente y oscuro comparten tokens; lo que cambia es el fondo).
    toast(`Tema: ${ETIQUETA_TEMA[tema]}`, 1500);
  },
  setCost: (cost) => set({ cost }),
}));
