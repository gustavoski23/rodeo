import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

import { SB_ANON_KEY, SB_URL, supabase } from '@/lib/supabase';

/* Gate de login — el estado de la puerta, no de la cuenta.

   La app entera funciona sin cuenta (mejora progresiva pura), pero la PUERTA es
   ahora lo PRIMERO que se ve SIEMPRE que no haya sesión (pedido de Gus): cada
   vez que abres o recargas la app sin haber iniciado sesión con Google (o
   cuenta), el gate aparece. `gateNecesario` pregunta lo esencial — ¿hay sesión
   de Supabase? — y si no la hay, la puerta se pinta.

   "Skip" sigue siendo el escape para entrar SIN cuenta, pero ya NO se persiste
   en disco: vale solo para ESTA carga de la app. Al reabrir o recargar (arranque
   en frío del PWA o del navegador) el gate vuelve a estar primero. Antes "Skip"
   guardaba `rodeo_gate_skip` en localStorage para siempre, y por eso la app a
   veces abría directo al Home y a veces (tras borrar caché) mostraba el login:
   esa inconsistencia es justo lo que se elimina aquí. */

// "Skip" en memoria: vive lo que dure esta carga del módulo y se reinicia en
// cada arranque en frío. Así la puerta reaparece siempre que no haya sesión,
// sin un muro persistido que la esconda entre aperturas.
//
// MODO DEMO (?demo=1): el enlace que se comparte con un revisor o un amigo
// arranca con el skip YA dado — la puerta no se pinta en ESA carga y el deep
// link (#/profes, #/podcast…) aterriza directo donde apunta. Es el mismo skip
// de siempre, solo que dado por la URL en vez del botón: en memoria, sin
// persistir, y la regla de Gus ("la puerta primero, siempre") sigue intacta
// para todo el que abra la app sin ese parámetro.
let saltadoEnSesion =
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('demo') === '1';

/** ¿Ya saltó el gate en ESTA carga de la app? (A propósito NO se persiste.) */
function saltado(): boolean {
  return saltadoEnSesion;
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
  if (/provider is not enabled|unsupported provider|is not enabled/.test(m))
    return 'Google todavía no está activado en Supabase. Actívalo en Authentication → Providers → Google (ver SUPABASE-runbook §4) y reintenta.';
  if (/popup|closed by the user|cancel/.test(m)) return 'Cancelaste el inicio con Google.';
  if (/fetch|network|failed to fetch/.test(m)) return 'Sin conexión con el servidor. Revisa tu internet.';
  return mensaje;
}

function comoMensaje(e: unknown): string {
  return traducir(String((e as { message?: string })?.message ?? e));
}

/**
 * El access token de la sesión actual, o null. Lo usa el flujo de pago para
 * mandar `Authorization: Bearer` a /api/cripto y que el servidor ate el pago a
 * esta cuenta. Es una lectura local (supabase-js lo tiene en memoria/refresca
 * solo): no pega a la red.
 */
export async function tokenActual(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/* ¿Qué proveedores externos están habilitados en el proyecto? Igual que el sync
   legacy: se le pregunta a /auth/v1/settings para NO pintar el botón de Google
   si el Paso 4 del runbook no está hecho (si no, "Google" lleva a un JSON de
   error `provider is not enabled`). Se cachea: la respuesta no cambia en una
   sesión. */
let providersCache: { google: boolean } | null = null;
export async function providersDisponibles(): Promise<{ google: boolean }> {
  if (providersCache) return providersCache;
  try {
    const res = await fetch(`${SB_URL}/auth/v1/settings`, { headers: { apikey: SB_ANON_KEY } });
    const data = (await res.json()) as { external?: { google?: boolean } };
    providersCache = { google: data?.external?.google === true };
  } catch {
    providersCache = { google: false };
  }
  return providersCache;
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
  /** Entra con Google (OAuth). Redirige la página; solo devuelve error. */
  loginGoogle: () => Promise<ResultadoAuth>;
  /** Manda un enlace mágico al correo (sin contraseña). `confirmar` = enviado. */
  loginConEnlace: (email: string) => Promise<ResultadoAuth>;
  /** Cierra la sesión de Supabase y vuelve a mostrar la puerta de login. */
  logout: () => Promise<void>;
  /** Reabre la puerta de login SIN cerrar sesión (para quien entró con Skip). */
  mostrarGate: () => void;
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

  /* "Skip" deja entrar como invitado por ESTA carga de la app. A propósito NO se
     persiste: al reabrir o recargar sin sesión, la puerta vuelve a ser lo
     primero (es lo que hace que aparezca SIEMPRE que no hay login). */
  skip: () => {
    saltadoEnSesion = true;
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

  loginGoogle: async () => {
    try {
      // Vuelve al mismo origen donde estaba el usuario (así la sesión queda en
      // el dominio que de verdad usa; ver la nota de Site URL en el runbook).
      // Al volver, detectSessionInUrl (default de supabase-js) lee el token del
      // hash y dispara SIGNED_IN → onAuthStateChange cierra el gate solo.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) return { ok: false, mensaje: traducir(error.message) };
      // En el éxito el navegador se va a Google; onAuthStateChange recoge la
      // sesión al volver. No hace falta set() aquí.
      return { ok: true };
    } catch (e) {
      return { ok: false, mensaje: comoMensaje(e) };
    }
  },

  loginConEnlace: async (email) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) return { ok: false, mensaje: traducir(error.message) };
      // Correo enviado: no hay sesión todavía. La vista dice "revisa tu buzón".
      return { ok: true, confirmar: true };
    } catch (e) {
      return { ok: false, mensaje: comoMensaje(e) };
    }
  },

  /* Cerrar sesión. Resetea el "skip" en memoria para que la PUERTA vuelva a
     aparecer al salir (si no, saltadoEnSesion seguiría true y caerías al Home
     sin sesión). signOut dispara SIGNED_OUT → onAuthStateChange, pero también
     fijamos el estado aquí para que la UI reaccione al instante. Falla suave:
     sin red igual limpiamos lo local para reflejar "sesión cerrada". */
  logout: async () => {
    saltadoEnSesion = false;
    try {
      await supabase.auth.signOut();
    } catch {
      /* offline: el estado local se limpia igual abajo */
    }
    set({ usuario: null, gateNecesario: true });
  },

  /* Reabrir la puerta a voluntad, SIN cerrar sesión. Es la contraparte de
     `skip`: quien entró como invitado no tenía forma de volver al login sin
     recargar la página. Baja la marca de "salté" para que la puerta no se
     cierre sola en el siguiente cambio de estado. */
  mostrarGate: () => {
    saltadoEnSesion = false;
    set({ gateNecesario: true });
  },
}));
