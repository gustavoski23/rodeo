import { create } from 'zustand';
import { store } from '@/lib/storage';
import { aplicarTema, hidratarTema, type Tema } from '@/lib/theme';

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
  /** ← AL ORIGEN (regla 5 del contrato). Lo levanta la carta del carrusel
      justo antes de navegar y lo consume el Home AL MONTAR: si está en alto,
      el Home aparece con la vitrina YA abierta, que es de donde salió el
      usuario. No se persiste a propósito — es memoria de un viaje, no una
      preferencia: recargar la app tiene que devolver el Home cerrado. */
  carruselAlVolver: boolean;
  setCarruselAlVolver: (v: boolean) => void;
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
    /* SIN TOAST (regla 1 del contrato): «no quiero que salga ese pop-up — el
       usuario podra ver el nombre del tema si hace click en el menu y va a
       personalizar». Antes salía un `Tema: …` de 1500ms para que el tercer
       toque del ciclo no pareciera un no-op; el nombre vive ahora únicamente
       en las tarjetas del personalizador. */
  },
  setCost: (cost) => set({ cost }),
  carruselAlVolver: false,
  setCarruselAlVolver: (carruselAlVolver) => set({ carruselAlVolver }),
}));
