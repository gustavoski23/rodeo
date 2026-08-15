import { create } from 'zustand';
import { store } from '@/lib/storage';
import { aplicarTema, hidratarTema, type Tema } from '@/lib/theme';
import type { LibroId } from '@/content/libro';
/* Type-only: onboarding.ts importa este módulo, así que un import normal sería
   un ciclo. `import type` se borra al compilar y no lo crea. El tipo vive allá
   porque el onboarding es quien lo estrena; acá solo se respeta. */
import type { Nivel } from '@/stores/onboarding';

/* Estado de shell. La persistencia NO usa el middleware `persist` de zustand
   (envolvería los valores en {state,version} y rompería las claves rodeo_*):
   cada campo persistente lee/escribe su clave con el mismo formato de siempre. */

export type View = 'home' | 'talk' | 'story' | 'slang' | 'ladder' | 'dna' | 'a1' | 'perfil' | 'libro' | 'podcast' | 'profes';

const VISTAS: readonly View[] = ['home', 'talk', 'story', 'slang', 'ladder', 'dna', 'a1', 'perfil', 'libro', 'podcast', 'profes'];

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
     para alguien que todavía no sabe decir "hello". Arranca en la RUTA, y
     SIEMPRE — no solo la primera vez (decisión de Gus, 2026-08-15).

     Antes esto miraba también `rodeo_a1_onboarded` y devolvía el Home en
     cuanto el usuario conocía la ruta, con el argumento de que a esa altura ya
     sabía volver sola. Medido: no. Al terminar el onboarding de Alfred la
     bandera se levanta, y desde el arranque siguiente el mapa desaparecía
     detrás de la vitrina — la ÚNICA puerta que queda es la card RUTA del bento
     (ancha y arriba del todo para un A1, eso sí). Ninguna barra lo lleva ahí:
     la navbar de teléfono va Home · Explore · Talk · Profile, TabBar y
     MenuSheet siguen sin montarse, y el menú flotante soltó su atajo. Para un
     A1 el mapa no es una sección de la app: es la app. Si algún día deja de
     serlo será porque cambió de nivel, y eso ya lo dice `rodeo_nivel`.

     Sigue siendo el hash quien manda por encima de esto (arriba): un #/home
     sirve para salir, igual que el menú.

     Se lee con `store.get` y NO con localStorage.getItem a pelo: la
     persistencia de este repo pasa por JSON.stringify, así que en disco
     rodeo_nivel vale "A1" CON comillas y un getItem crudo nunca empataría. */
  return store.get<string | null>('rodeo_nivel', null) === 'A1' ? 'a1' : 'home';
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
  /** Cambia el nivel DE VERDAD: persiste rodeo_nivel y actualiza el store.
      Mismo contrato que cambiarTema — es el único camino, para que el
      onboarding y el selector del Perfil no se desincronicen.

      El `store.set` NO es opcional ni redundante con el `set`: los prompts del
      coach leen `rodeo_nivel` DEL DISCO en cada turno (views/talk/prompts.ts,
      nivelUsuario/retratoAlumno), no del estado de zustand. Sin persistir, la
      UI mostraría el nivel nuevo y el coach seguiría hablándole al viejo. */
  cambiarNivel: (n: Nivel) => void;
  setCost: (total: number) => void;
  /** ← AL ORIGEN (regla 5 del contrato). Lo levanta la carta del carrusel
      justo antes de navegar y lo consume setView('home') (ver abajo): si está
      en alto, el Home aparece con la vitrina YA abierta, que es de donde salió
      el usuario. No se persiste a propósito — es memoria de un viaje, no una
      preferencia: recargar la app tiene que devolver el Home cerrado. */
  carruselAlVolver: boolean;
  setCarruselAlVolver: (v: boolean) => void;
  /** La VITRINA de features del Home (el abanico de cartas). Nació como
      useState del propio Home; subió aquí para que la navbar de teléfono
      (nav-movil) pueda abrirla desde cualquier vista y pintar «Explore»
      activo. No se persiste — es UI de un viaje, no una preferencia. */
  carruselAbierto: boolean;
  setCarruselAbierto: (v: boolean) => void;
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
  setView: (view) =>
    set((s) =>
      view === 'home'
        ? /* ← AL ORIGEN (regla 5): al ENTRAR al Home la vitrina nace abierta
             solo si `carruselAlVolver` estaba en alto, y la marca se consume
             aquí mismo — vale por UN regreso. Este traspaso vivía en el
             montaje del Home (useState perezoso + useEffect que la bajaba);
             al subir `carruselAbierto` al store se hace DENTRO de setView,
             que conserva la semántica exacta sin depender del ciclo de
             montaje: es atómico (el primer frame del Home ya pinta la
             vitrina correcta, sin flash de cerrado→abierto) y StrictMode
             puede doble-montar lo que quiera — esto corre una vez por
             NAVEGACIÓN, no por montaje. */
          { view, carruselAbierto: s.carruselAlVolver, carruselAlVolver: false }
        : { view },
    ),
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
  cambiarNivel: (nivel) => {
    store.set('rodeo_nivel', nivel);
    set({ nivel });
    /* A propósito NO navega. El onboarding sí manda a la RUTA al elegir A1
       (stores/onboarding.ts), porque ahí el usuario acaba de decir que no sabe
       inglés y no tiene nada que hacer en el carrusel. Aquí está leyendo su
       perfil: sacarlo de la pantalla de un salto sería secuestrarle el toque.
       En el siguiente arranque en frío vistaInicial() toma esa decisión sola. */
  },
  setCost: (cost) => set({ cost }),
  carruselAlVolver: false,
  setCarruselAlVolver: (carruselAlVolver) => set({ carruselAlVolver }),
  carruselAbierto: false,
  setCarruselAbierto: (carruselAbierto) => set({ carruselAbierto }),
}));
