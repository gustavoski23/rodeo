import { create } from 'zustand';

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

export const useOnboarding = create<OnboardingState>((set) => ({
  necesario: !store.get<string | null>(CLAVE_HECHO, null),

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

    set({ necesario: false });
  },
}));
