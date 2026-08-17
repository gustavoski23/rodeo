import { create } from 'zustand';

import type { ChatMessage } from '@/lib/api';
import type { Gloss } from '@/lib/gloss';
import { store } from '@/lib/storage';
import { stopSpeak } from '@/lib/speech';
import { useApp } from '@/stores/app';
import type { ScenarioKey, Situacion } from '@/views/talk/prompts';
import type { Maquina } from '@/views/talk/typewriter';

/* Estado de la vista TALK — port de `state.talkMode` / `state.session` /
   `state.busy` / `state.sessions` (public/legacy.html:3006-3043).

   Dos notas de port:

   1. `displayLog` SÍ existe aquí. En el legacy era un campo comentado que
      nunca se usaba (spec §5.3): el "log de lo pintado" era el DOM de
      #chat-scroll, que el JS mutaba a mano con addBubble/remove. En React el
      DOM no es estado, así que displayLog pasa a ser lo que el viejo tenía
      implícito. No es una función nueva: es el mismo dato, con dueño.

   2. `busy` es el `state.busy` GLOBAL del viejo — compartido entre CHARLA,
      STORY y DROP: sirve para no pedirle dos cosas a la vez al modelo, así que
      vive aquí y no dentro de `session`. La bombilla y el debrief llevan flags
      propios a propósito (§8 trampa 15).

   3. `talkMode` y `roleplayActivo` se fueron con ESCENAS (borrada el
      2026-08-17 a pedido de Gus: TALK es CHARLA y nada más). Con un solo modo,
      un campo que solo puede valer 'charla' no es estado, es una constante — y
      `roleplayActivo` se quedó sin nadie que lo encendiera. */

export type TalkSession = {
  scenario: ScenarioKey;
  title: string;
  situation: Situacion;
  /** Historial que viaja al modelo. Se muta en sitio, como en el viejo. */
  messages: ChatMessage[];
  /** Marca el turno de apertura para alimentar rodeo_openers al terminar. */
  isOpening?: boolean;
};

/* Una burbuja del chat. `coach` tiene dos fases y por eso `texto` cambia de
   naturaleza: en fase 1 (stream) es el texto YA limpio de marcadores que se
   pinta como texto plano; en fase 2 (`final`) es el reply CRUDO, con sus
   ⟦en||es⟧, porque <GlossText> es quien sabe convertirlos en subrayados.

   `tw` marca la tercera forma de fase 1: la máquina de escribir del viejo
   (§3.2), que solo entra cuando NO hubo stream que leer. Lleva las medidas
   (medirMaquina) para que la burbuja anime con ellas. */
export type Burbuja =
  | { id: number; tipo: 'user'; texto: string }
  | { id: number; tipo: 'coach'; texto: string; glosses: Gloss[] | null; final: boolean; tw?: Maquina | null }
  | { id: number; tipo: 'correccion'; quote: string; fix: string; why: string }
  | { id: number; tipo: 'idea'; texto: string }
  | { id: number; tipo: 'espera'; desde: number };

export type BurbujaNueva =
  | Omit<Extract<Burbuja, { tipo: 'user' }>, 'id'>
  | Omit<Extract<Burbuja, { tipo: 'coach' }>, 'id'>
  | Omit<Extract<Burbuja, { tipo: 'correccion' }>, 'id'>
  | Omit<Extract<Burbuja, { tipo: 'idea' }>, 'id'>
  | Omit<Extract<Burbuja, { tipo: 'espera' }>, 'id'>;

export type Debrief = {
  top_errors?: { quote?: string; fix?: string; why?: string }[];
  upgrades?: { b2?: string; c1?: string; note?: string }[];
  closing?: string;
};

let seqBurbuja = 0;

type TalkState = {
  session: TalkSession | null;
  displayLog: Burbuja[];
  busy: boolean;
  sessions: number;
  /** Datos del debrief mientras la hoja está abierta; null = cerrada. */
  debrief: Debrief | null;
  /** Al entrar desde el Home por TECLADO, el foco debe caer en "Volver a los
      escenarios" (brief del Home aurora). La sesión lo consume y lo apaga. */
  focoVolver: boolean;
  setBusy: (v: boolean) => void;
  setDebrief: (d: Debrief | null) => void;
  setFocoVolver: (v: boolean) => void;

  abrirSesion: (s: TalkSession, iniciales?: BurbujaNueva[]) => void;
  cerrarSesion: () => void;

  addBubble: (b: BurbujaNueva) => number;
  patchCoach: (id: number, patch: Partial<Omit<Extract<Burbuja, { tipo: 'coach' }>, 'id' | 'tipo'>>) => void;
  removeBubble: (id: number) => void;

  /** rodeo_sessions += 1 (lo hacen los dos debriefs). Devuelve el total. */
  incSessions: () => number;
};

export const useTalk = create<TalkState>((set, get) => ({
  session: null,
  displayLog: [],
  busy: false,
  sessions: store.get<number>('rodeo_sessions', 0),
  debrief: null,
  focoVolver: false,

  setBusy: (busy) => set({ busy }),
  setDebrief: (debrief) => set({ debrief }),
  setFocoVolver: (focoVolver) => set({ focoVolver }),

  abrirSesion: (session, iniciales = []) =>
    set({ session, displayLog: iniciales.map((b) => ({ ...b, id: ++seqBurbuja }) as Burbuja) }),

  /* closeSession (L4342): la sesión muere, la voz calla y el chat se vacía
     para que la próxima no herede burbujas. El mic lo aborta el dock al
     desmontarse (era stopMic()) y el rompehielos nuevo lo sortea el estado
     vacío al montarse (era refrescarRompehielos()). */
  cerrarSesion: () => {
    stopSpeak();
    set({ session: null, displayLog: [] });
    /* Regla 5 del contrato, al pie de la letra: «Sesión → ← portada TALK».
       SIEMPRE, venga la sesión de donde venga — también de la píldora aurora
       del Home, la única entrada que salta la portada (la ronda 3 encontró que
       ese caso volvía al Home y contradecía el contrato; el campo `origen` que
       lo distinguía se ha retirado). Ya no se navega al Home nunca: eso era de
       cuando la portada de TALK estaba oculta (decisión del 2026-07-29,
       ANTERIOR a la portada nueva) y hacía que salir de la sesión saltara dos
       niveles de golpe.

       La vista ya ES 'talk' en casi todos los caminos, pero se deja explícito
       para que el destino no dependa de que nadie la haya movido mientras
       tanto. Cubre volver, terminar (<3 turnos) y el cierre del debrief. */
    useApp.getState().setView('talk');
  },

  addBubble: (b) => {
    const id = ++seqBurbuja;
    set((s) => ({ displayLog: [...s.displayLog, { ...b, id } as Burbuja] }));
    return id;
  },

  /* Si la burbuja ya no existe (el usuario cerró la sesión mientras streameaba)
     el patch no encuentra su id y se evapora: no hace falta guardar nada. */
  patchCoach: (id, patch) =>
    set((s) => ({
      displayLog: s.displayLog.map((b) => (b.id === id && b.tipo === 'coach' ? { ...b, ...patch } : b)),
    })),

  removeBubble: (id) => set((s) => ({ displayLog: s.displayLog.filter((b) => b.id !== id) })),

  incSessions: () => {
    const total = get().sessions + 1;
    store.set('rodeo_sessions', total);
    set({ sessions: total });
    return total;
  },
}));

/** ¿Hay una sesión viva? (el `body.rd-sesion` del viejo, L3702: con sesión
    desaparecía la tab bar). Con ESCENAS borrada solo queda la de CHARLA, así
    que las dos señales miran lo mismo; se conservan separadas porque cada una
    tiene su consumidor (FirstTip la de sesión, App la de charla) y decir
    "session !== null" en dos sitios distintos no explicaría por qué. */
export function useEnSesion(): boolean {
  return useTalk((s) => s.session !== null);
}

/** ¿Hay una sesión de CHARLA viva? La usa App para dejarle a la charla todo el
    alto: su propia barra de sesión (← · título · Terminar) ya hace de header. */
export function useEnCharla(): boolean {
  return useTalk((s) => s.session !== null);
}

/* Memoria anti-repetición de aperturas (rodeo_openers, L4226): las últimas 8,
   recortadas a 140 caracteres, viajan al system prompt como "no abras así". */
export function leerOpeners(): string[] {
  const xs = store.get<string[]>('rodeo_openers', []);
  return Array.isArray(xs) ? xs : [];
}
export function guardarOpener(reply: string): void {
  const prev = leerOpeners();
  prev.push(String(reply).slice(0, 140));
  store.set('rodeo_openers', prev.slice(-8));
}
