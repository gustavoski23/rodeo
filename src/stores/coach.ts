import { create } from 'zustand';

import type { A1UnitRuta } from '@/content/a1/tipos-ruta';
import type { ChatMessage } from '@/lib/api';
import {
  abrirConversacion,
  vocabularioDe,
  type Cierre,
  type Conversacion,
  type CoachVocab,
} from '@/lib/coach-a1';

/* EL ESTADO DE LA CONVERSACIÓN CON EL COACH.

   Store y no useState por lo mismo que ESCENAS: quien corre los turnos es un
   módulo (coach-turno.ts), no un componente, y un turno en vuelo tiene que
   sobrevivir a cualquier repintado. La IDENTIDAD de la sesión es la referencia
   del objeto `sesion`: si el usuario sale y entra a otra parada, el turno viejo
   compara `getState().sesion === ses` y no pinta en la nueva. Esa trampa ya está
   pagada en el motor de turnos de ESCENAS (borrado el 2026-08-17) (§8 trampa 13) y acá se copia el patrón, no la letra.

   Lo que NO vive acá: la cuenta de correcciones, el vocabulario permitido y lo
   que va al SRS. Eso es `Conversacion` (lib/coach-a1.ts), que es puro y se
   prueba sin navegador. El store solo lo transporta. */

/* `Omit<union, 'id'>` NO distribuye sobre la unión: colapsa a las claves que
   comparten todas las ramas y `texto` desaparece. Por eso el mensaje se declara
   primero SIN id y el id se agrega arriba. */
export type MsgNuevo =
  | { tipo: 'personaje'; texto: string }
  | { tipo: 'usuario'; texto: string }
  /** El lápiz mientras el modelo piensa. */
  | { tipo: 'espera' };

export type MsgCoach = MsgNuevo & { id: number };

export type SesionCoach = {
  unit: A1UnitRuta;
  conv: Conversacion;
  vocab: CoachVocab[];
  /** Historial para el modelo. El system va de primero. */
  mensajes: ChatMessage[];
  /** Turnos del usuario. Decide cuándo el personaje puede cerrar. */
  intercambios: number;
  /** Volvió a un coach que ya había hecho: nadie se lo pidió. Señal de §4. */
  porSuCuenta: boolean;
  abierta: number;
};

type CoachState = {
  sesion: SesionCoach | null;
  hilo: MsgCoach[];
  /** El campo de texto se apaga mientras corre un turno. */
  inputOn: boolean;
  /** El cierre está en vuelo (espera larga, indicador persistente). */
  cerrando: boolean;
  /** La hoja de tres bloques. Mientras sea null no hay hoja. */
  cierre: Cierre | null;
  /** El cierre falló: se ofrece reintentar o salir, como en ESCENAS. La
      conversación NO se destruye por un fallo de cierre. */
  errorCierre: string | null;
  /** Texto que un turno fallido devuelve al campo: su línea no se pierde. */
  devuelto: string;

  abrir: (unit: A1UnitRuta, porSuCuenta: boolean) => SesionCoach | null;
  cerrarSesion: () => void;
  add: (m: MsgNuevo) => number;
  remove: (id: number) => void;
  setInputOn: (v: boolean) => void;
  setCerrando: (v: boolean) => void;
  setCierre: (c: Cierre | null) => void;
  setErrorCierre: (m: string | null) => void;
  devolverTexto: (t: string) => void;
  tomarDevuelto: () => void;
};

let seq = 0;

export const useCoach = create<CoachState>((set, get) => ({
  sesion: null,
  hilo: [],
  inputOn: true,
  cerrando: false,
  cierre: null,
  errorCierre: null,
  devuelto: '',

  abrir: (unit, porSuCuenta) => {
    const conv = abrirConversacion(unit);
    if (!conv || !unit.coach) return null;
    const sesion: SesionCoach = {
      unit,
      conv,
      vocab: vocabularioDe(unit.coach),
      mensajes: [],
      intercambios: 0,
      porSuCuenta,
      abierta: Date.now(),
    };
    set({ sesion, hilo: [], inputOn: true, cerrando: false, cierre: null, errorCierre: null, devuelto: '' });
    return sesion;
  },

  cerrarSesion: () =>
    set({ sesion: null, hilo: [], inputOn: true, cerrando: false, cierre: null, errorCierre: null, devuelto: '' }),

  add: (m) => {
    const id = ++seq;
    set((s) => ({ hilo: [...s.hilo, { ...m, id }] }));
    return id;
  },
  remove: (id) => set((s) => ({ hilo: s.hilo.filter((m) => m.id !== id) })),

  setInputOn: (inputOn) => set({ inputOn }),
  setCerrando: (cerrando) => set({ cerrando }),
  setCierre: (cierre) => set({ cierre }),
  setErrorCierre: (errorCierre) => set({ errorCierre }),
  devolverTexto: (devuelto) => set({ devuelto }),
  tomarDevuelto: () => {
    if (get().devuelto) set({ devuelto: '' });
  },
}));
