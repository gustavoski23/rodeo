import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

import { store } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

/* Gate de login — el estado de la puerta, no de la cuenta.

   La app entera funciona sin cuenta (mejora progresiva pura, igual que el sync
   legacy): por eso el gate NO es un muro. `gateNecesario` solo pregunta dos
   cosas — ¿hay sesión de Supabase? ¿el usuario ya dijo "Skip" alguna vez? — y
   con que una sea sí, la puerta no se pinta. Quien saltó una vez no la vuelve
   a ver hasta que borre datos del navegador.

   La persistencia va por `store` (@/lib/storage) y no por el middleware
   `persist` de zustand: envolvería el valor en {state,version} y rompería el
   formato rodeo_* que comparte con el resto de la app. */

const CLAVE_SKIP = 'rodeo_gate_skip';

/** ¿Ya saltó el gate en este dispositivo? */
function saltado(): boolean {
  return !!store.get<string | null>(CLAVE_SKIP, null);
}

/* Lo que devuelven login/register para que la vista pinte error o aviso sin
   guardar UI en el store (el gate se monta una vez y se muere: su error es
   suyo). `confirmar` = registro OK pero SIN sesión porque Supabase mandó el
   correo de confirmación. */
export type ResultadoAuth = { ok: true; confirmar?: boolean } | { ok: false; mensaje: string };

/* Los mensajes de Supabase llegan en inglés y crudos ("Invalid login
   credentials"). Aquí se traducen a la voz de la app: qué pasó y qué hacer.
   Lo que no reconocemos se muestra tal cual — mejor un mensaje raro que un
   "algo salió mal" que no ayuda a nadie. */
function traducir(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (/invalid login credentials/.test(m)) return 'Correo o contraseña incorrectos.';
  if (/email not confirmed/.test(m)) return 'Falta confirmar el correo — busca el enlace que te mandamos.';
  if (/already registered|already exists/.test(m)) return 'Ese correo ya tiene cuenta. Entra con Login.';
  if (/password should be at least|password.*6/.test(m)) return 'La contraseña necesita al menos 6 caracteres.';
  if (/rate limit|too many/.test(m)) return 'Muchos intentos seguidos. Espera un minuto y vuelve a probar.';
  if (/invalid.*email|email.*invalid/.test(m)) return 'Ese correo no se ve válido.';
  if (/fetch|network|failed to fetch/.test(m)) return 'Sin conexión con el servidor. Revisa tu internet.';
  return mensaje;
}

function comoMensaje(e: unknown): string {
  return traducir(String((e as { message?: string })?.message ?? e));
}

type AuthState = {
  /** false hasta que init() resolvió getSession: antes NO se decide nada. */
  listo: boolean;
  usuario: User | null;
  gateNecesario: boolean;

  init: () => Promise<void>;
  skip: () => void;
  login: (email: string, pass: string) => Promise<ResultadoAuth>;
  register: (email: string, pass: string) => Promise<ResultadoAuth>;
};

// StrictMode monta dos veces en dev; sin esto habría dos suscripciones de
// onAuthStateChange escribiendo el mismo estado.
let iniciado = false;

export const useAuth = create<AuthState>((set) => ({
  // Arranca cerrado y "no listo": el integrador espera a `listo` para no
  // pintar un flash de gate a quien ya tiene sesión guardada.
  listo: false,
  usuario: null,
  gateNecesario: false,

  init: async () => {
    if (iniciado) return;
    iniciado = true;

    let usuario: User | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      usuario = data.session?.user ?? null;
    } catch {
      // Sin red o proyecto caído: seguimos como invitados. La app no depende
      // de la cuenta para funcionar, solo para sincronizar.
      usuario = null;
    }
    set({ listo: true, usuario, gateNecesario: !usuario && !saltado() });

    /* Aquí SOLO se toca el estado local. El dispatcher de onAuthStateChange
       retiene el lock de auth y llamar otros métodos del cliente adentro puede
       deadlockear (gotcha documentado de supabase-js v2, ya anotado en
       public/js/supabase-sync.js). */
    supabase.auth.onAuthStateChange((_evento, sesion) => {
      const u = sesion?.user ?? null;
      set({ listo: true, usuario: u, gateNecesario: !u && !saltado() });
    });
  },

  /* "Skip" es una decisión permanente del dispositivo, no de la sesión: quien
     entró como invitado no quiere que la puerta le vuelva a aparecer cada vez
     que abre la app. */
  skip: () => {
    store.set(CLAVE_SKIP, '1');
    set({ gateNecesario: false });
  },

  login: async (email, pass) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: pass,
      });
      if (error) return { ok: false, mensaje: traducir(error.message) };
      const u = data.session?.user ?? null;
      set({ usuario: u, gateNecesario: !u && !saltado() });
      return { ok: true };
    } catch (e) {
      return { ok: false, mensaje: comoMensaje(e) };
    }
  },

  register: async (email, pass) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: pass,
      });
      if (error) return { ok: false, mensaje: traducir(error.message) };
      const u = data.session?.user ?? null;
      // Con confirmación de correo activada, signUp NO devuelve sesión: la
      // puerta se queda abierta y la vista avisa que revise el buzón.
      if (!u) return { ok: true, confirmar: true };
      set({ usuario: u, gateNecesario: false });
      return { ok: true };
    } catch (e) {
      return { ok: false, mensaje: comoMensaje(e) };
    }
  },
}));
