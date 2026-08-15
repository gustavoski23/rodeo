import { create } from 'zustand';

import { esNivelA1 } from '@/lib/nivel';
import { store } from '@/lib/storage';
import { useApp } from '@/stores/app';

/* Onboarding — el estado del "¿quién eres?" que va JUSTO después del gate.

   Misma filosofía que el gate (stores/auth.ts): no es un muro ni una cuenta,
   es una decisión del dispositivo. Se contesta UNA vez (nombre, idioma, nivel,
   gustos) y no vuelve a aparecer hasta borrar datos del navegador. La
   persistencia va por `store` (@/lib/storage) y NO por el middleware persist
   de zustand, para no romper el formato rodeo_* compartido con el sync.

   Las claves NO son nuevas porque sí: `rodeo_nombre` y `rodeo_nivel` ya
   existían (las lee useApp, los prompts de TALK y lib/api.ts) — el onboarding
   simplemente las llena por fin desde una pantalla propia. Solo `rodeo_idioma`,
   `rodeo_intereses` y `rodeo_area` son claves nuevas de esta rama. */

const CLAVE_HECHO = 'rodeo_onboarding';

/** Niveles MCER que ofrece la pantalla 3: Básico / Intermedio / Avanzado. */
export type Nivel = 'A1' | 'B1' | 'B2-C1';

export type DatosOnboarding = {
  nombre: string;
  idioma: string;
  nivel: Nivel;
  intereses: string[];
  /** Trabajo o área libre para personalizar (opcional, puede llegar vacío). */
  area: string;
};

type OnboardingState = {
  /** ¿Toca mostrar las pantallas? true hasta que se completa una vez. */
  necesario: boolean;
  completar: (datos: DatosOnboarding) => void;
};

/* Dos visitas NO deben pasar por el "¿quién eres?":
   · Un enlace directo a PROFES — material de referencia que se comparte con
     profesores, instituciones y revisores para que LEAN una página, no para
     que estrenen la app.
   · El MODO DEMO (?demo=1) — el enlace de demo completo: junto con el skip
     del gate (stores/auth.ts) hace que un deep link compartido aterrice
     directo en la vista pedida.
   Las dos eximen por ESTA carga y nada más: CLAVE_HECHO no se toca, y quien
   después vuelva en frío sin el parámetro pasa por las pantallas como
   siempre. Se lee AQUÍ (creación del store) por la misma razón que
   vistaInicial() lee el hash en stores/app.ts: una vez, sin listener, sin
   escribir la URL de vuelta. */
const hashExime =
  typeof location !== 'undefined' &&
  (/^#\/?profes\b/i.test(location.hash) || new URLSearchParams(location.search).get('demo') === '1');

export const useOnboarding = create<OnboardingState>((set) => ({
  necesario: !hashExime && !store.get<string | null>(CLAVE_HECHO, null),

  completar: (datos) => {
    const nombre = datos.nombre.trim();
    const area = datos.area.trim();

    if (nombre) store.set('rodeo_nombre', nombre);
    store.set('rodeo_idioma', datos.idioma);
    store.set('rodeo_nivel', datos.nivel);
    store.set('rodeo_intereses', datos.intereses);
    if (area) store.set('rodeo_area', area);
    store.set(CLAVE_HECHO, '1');

    /* useApp leyó rodeo_nombre/rodeo_nivel AL CREARSE (antes del onboarding):
       sin este empujón el Home saludaría sin nombre hasta la próxima recarga. */
    useApp.setState((s) => ({ nombre: nombre || s.nombre, nivel: datos.nivel }));

    /* Quien acaba de decir "A1 Básico" aterriza en la RUTA, no en el Home: el
       carrusel de features no le sirve de nada a alguien que todavía no sabe
       decir "hello". (En el arranque en frío la misma decisión la toma
       vistaInicial() de stores/app.ts, que lee las claves del disco.)

       Va ACÁ y no en un `if` dentro del render de App.tsx porque completar() ya
       ES el lugar donde "lo que el usuario dijo" se traduce a "estado de la
       app" — la línea de arriba hace exactamente eso con nombre y nivel.
       Meterlo en el switch de vistas sería colar una decisión de producto
       adentro de un router, y el próximo que agregue un nivel tendría que
       acordarse de tocar App.tsx en vez de este archivo. */
    /* esNivelA1 y no `=== 'A1'`: hoy `datos.nivel` viene tipado del selector y
       no puede ser otra cosa, pero esta línea es la que decide si un
       principiante ve su ruta o el carrusel — y la versión con `===` ya falló
       una vez en el arranque (index.html comparaba contra 'a1' minúscula).
       Preguntar siempre por el mismo lado cuesta lo mismo. */
    if (esNivelA1(datos.nivel)) useApp.setState({ view: 'a1' });

    set({ necesario: false });
  },
}));
