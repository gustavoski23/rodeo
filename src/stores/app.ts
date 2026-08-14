import { create } from 'zustand';
import { store } from '@/lib/storage';
import { aplicarTema, hidratarTema, type Tema } from '@/lib/theme';
import type { LibroId } from '@/content/libro';

/* Estado de shell. La persistencia NO usa el middleware `persist` de zustand
   (envolvería los valores en {state,version} y rompería las claves rodeo_*):
   cada campo persistente lee/escribe su clave con el mismo formato de siempre. */

export type View = 'home' | 'talk' | 'story' | 'slang' | 'ladder' | 'dna' | 'a1' | 'perfil' | 'libro' | 'podcast';

const VISTAS: readonly View[] = ['home', 'talk', 'story', 'slang', 'ladder', 'dna', 'a1', 'perfil', 'libro', 'podcast'];

/* Vista de arranque. Normalmente el Home —es la puerta de la app— pero un
   `#/libro` en la URL abre directo ahí.

   No es un router: es UNA lectura del hash al crear el store, sin listener y
   sin escribir la URL de vuelta. Con eso alcanza para lo que hace falta —
   mandarle a alguien el enlace de una sección, y que el demo single-file
   (scripts/hacer-demo.mjs con DEMO_VIEW) aterrice donde toca en vez de obligar
   a cruzar el carrusel.

   El hash SIEMPRE gana: es la puerta de debug y de la que depende el demo. La
   regla del nivel A1 va DESPUÉS, y solo cuando no hay hash que respetar. */
function vistaInicial(): View {
  if (typeof location === 'undefined') return 'home';
  const m = location.hash.match(/^#\/?([a-z0-9]+)/i);
  const v = m?.[1]?.toLowerCase() as View | undefined;
  if (v && VISTAS.includes(v)) return v;

  /* Quien dijo "A1 Básico" en el onboarding no arranca en el Home aurora: un
     carrusel de siete features y una píldora de charla libre no son una puerta
     para alguien que todavía no sabe decir "hello". Arranca en la RUTA.

     Pero solo HASTA QUE la conozca: en cuanto rodeo_a1_onboarded está en alto,
     manda el Home de siempre. A esa altura ya sabe volver sola a la ruta, y
     seguir forzándola sería secuestrarle la app.

     Se lee con `store.get` y NO con localStorage.getItem a pelo: la
     persistencia de este repo pasa por JSON.stringify, así que en disco
     rodeo_nivel vale "A1" CON comillas y un getItem crudo nunca empataría. */
  const esA1 = store.get<string | null>('rodeo_nivel', null) === 'A1';
  const yaVioLaRuta = store.get<boolean>('rodeo_a1_onboarded', false);
  return esA1 && !yaVioLaRuta ? 'a1' : 'home';
}

type AppState = {
  view: View;
  tema: Tema;
  nombre: string | null;
  nivel: string | null;
  cost: number;
  /** Qué libro abre la vista LIBRO. Lo fija la carta del carrusel al entrar;
      por defecto el nuevo. La vista lo lee para elegir contenido y láminas. */
  libroActivo: LibroId;
  setLibroActivo: (id: LibroId) => void;
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
  // El Home aurora es la puerta de la app (decisión de Gus, 2026-07-28); un
  // #/<vista> en la URL puede abrir directo en otra.
  view: vistaInicial(),
  tema: typeof document !== 'undefined' ? hidratarTema() : 'oscuro',
  nombre: store.get<string | null>('rodeo_nombre', null),
  nivel: store.get<string | null>('rodeo_nivel', null),
  cost: store.get<number>('rodeo_cost', 0),
  libroActivo: 'tiempo',
  setLibroActivo: (libroActivo) => set({ libroActivo }),
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
