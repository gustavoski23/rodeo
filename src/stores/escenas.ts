import { create } from 'zustand';

import type { ChatMessage } from '@/lib/api';
import type { Gloss } from '@/lib/gloss';
import { stopSpeak } from '@/lib/speech';
import { useTalk } from '@/stores/talk';
import type { Escena } from '@/views/talk/escenas-prompts';

/* Estado del pane ESCENAS — port de `rpCards` / `state.roleplay` / `rpGenBusy`
   / `rpLastDebrief` y del DOM de #roleplay-home y #roleplay-session
   (public/legacy.html:7095-7100, 7142-7479).

   Tres notas de port:

   1. Lo que en el viejo era el DOM de #rp-scroll (nodos que el JS creaba,
      mutaba y borraba a mano) aquí es `log`: los mismos datos, con dueño.
      Es la misma decisión que en el store de CHARLA.

   2. `busy` NO vive aquí: es el `state.busy` GLOBAL y sigue en useTalk. El
      turno de escena lo enciende igual que el viejo (`state.busy = true`)
      para que la generación de escenas no le pida otra cosa al modelo a la
      vez. Los flags PROPIOS del roleplay (rpBusy del turno, rpDebriefBusy)
      viven en use-rp-turn.ts, en módulo-scope, como en el legacy.

   3. La identidad de sesión es el OBJETO `session`, no un booleano: todos los
      guards del turno comparan `getState().session === ses` (spec §1.8). Con
      truthiness, un turno huérfano pintaría en la escena nueva y le corrompería
      el historial. Es la asimetría que la spec pide portar tal cual. */

export type RpSession = {
  scenario: Escena;
  /** Historial que viaja al modelo. Se muta en sitio, como en el viejo. */
  messages: ChatMessage[];
};

/* Una fila del scroll de la escena. `narr` tiene las dos fases del pintado:
   en fase 1 (stream) `texto` es el inglés ya limpio de marcadores; en fase 2
   (`final`) es el reply CRUDO, que es lo que <GlossText> sabe subrayar. */
export type RpBurbuja =
  | { id: number; tipo: 'mision'; sc: Escena }
  | { id: number; tipo: 'user'; texto: string }
  | { id: number; tipo: 'narr'; texto: string; glosses: Gloss[] | null; final: boolean }
  | { id: number; tipo: 'consejo'; texto: string }
  | { id: number; tipo: 'espera'; nota?: string };

export type RpBurbujaNueva =
  | Omit<Extract<RpBurbuja, { tipo: 'mision' }>, 'id'>
  | Omit<Extract<RpBurbuja, { tipo: 'user' }>, 'id'>
  | Omit<Extract<RpBurbuja, { tipo: 'narr' }>, 'id'>
  | Omit<Extract<RpBurbuja, { tipo: 'consejo' }>, 'id'>
  | Omit<Extract<RpBurbuja, { tipo: 'espera' }>, 'id'>;

/** Estado de la lista de escenas frescas de la portada. */
export type CardsEstado =
  | { tipo: 'ok' }
  | { tipo: 'cargando' } // 3 skeletons: el modelo está armándolas
  | { tipo: 'espera' } // otro módulo tiene el modelo (renderRpBusyState, L7191)
  | { tipo: 'error'; msg: string };

export type RpAprendizaje = { en: string; es?: string };

/** La hoja del cierre: el debrief que salió, o el fallo con su reintento. */
export type RpHoja =
  | { tipo: 'ok'; items: RpAprendizaje[]; closing: string }
  | { tipo: 'error'; msg: string };

let seq = 0;

type EscenasState = {
  /** Las 3 escenas generadas. Memoria pura, no persisten (spec §7.4). */
  cards: Escena[];
  cardsEstado: CardsEstado;
  genBusy: boolean;

  session: RpSession | null;
  log: RpBurbuja[];
  /** rpInputEnabled (L7361): deshabilita DE VERDAD input, enviar y mic. */
  inputOn: boolean;
  /** #rp-replay arranca disabled y se habilita tras el primer turno (L7311). */
  replayOn: boolean;
  /** #rp-end disabled mientras corre el cierre. */
  endBusy: boolean;
  /* Texto que un onend tardío del mic entregó con el input ya bloqueado: la
     sesión lo DEVUELVE al campo en vez de tragárselo (spec §8 trampa 14). El
     contador fuerza el efecto aunque devuelva dos veces el mismo texto. */
  devolver: { texto: string; n: number } | null;
  hoja: RpHoja | null;

  setCards: (cards: Escena[]) => void;
  setCardsEstado: (e: CardsEstado) => void;
  setGenBusy: (v: boolean) => void;
  setInputOn: (v: boolean) => void;
  setReplayOn: (v: boolean) => void;
  setEndBusy: (v: boolean) => void;
  setHoja: (h: RpHoja | null) => void;
  devolverTexto: (t: string) => void;

  abrirSesion: (sc: Escena) => RpSession;
  cerrarSesion: () => void;

  add: (b: RpBurbujaNueva) => number;
  patchNarr: (id: number, patch: Partial<Omit<Extract<RpBurbuja, { tipo: 'narr' }>, 'id' | 'tipo'>>) => void;
  remove: (id: number) => void;
};

export const useEscenas = create<EscenasState>((set) => ({
  cards: [],
  cardsEstado: { tipo: 'ok' },
  genBusy: false,

  session: null,
  log: [],
  inputOn: true,
  replayOn: false,
  endBusy: false,
  devolver: null,
  hoja: null,

  setCards: (cards) => set({ cards }),
  setCardsEstado: (cardsEstado) => set({ cardsEstado }),
  setGenBusy: (genBusy) => set({ genBusy }),
  setInputOn: (inputOn) => set({ inputOn }),
  setReplayOn: (replayOn) => set({ replayOn }),
  setEndBusy: (endBusy) => set({ endBusy }),
  setHoja: (hoja) => set({ hoja }),
  devolverTexto: (texto) => set((s) => ({ devolver: { texto, n: (s.devolver?.n ?? 0) + 1 } })),

  /* startRoleplay (L7303) — el objeto que se devuelve ES la identidad de la
     sesión: el turno lo captura y compara por referencia. */
  abrirSesion: (sc) => {
    const session: RpSession = { scenario: sc, messages: [] };
    // La tab bar y el toggle CHARLA/ESCENAS desaparecen: es body.rd-sesion.
    useTalk.getState().setRoleplayActivo(true);
    set({
      session,
      log: [{ id: ++seq, tipo: 'mision', sc }],
      inputOn: true,
      replayOn: false,
      endBusy: false,
      devolver: null,
    });
    return session;
  },

  /* closeRoleplay (L7470): la escena muere, la voz calla, el scroll y el
     input se vacían. La portada vuelve sola porque el pane la pinta cuando
     `session` es null. */
  cerrarSesion: () => {
    stopSpeak();
    useTalk.getState().setRoleplayActivo(false);
    set({ session: null, log: [], inputOn: true, replayOn: false, endBusy: false, devolver: null });
  },

  add: (b) => {
    const id = ++seq;
    set((s) => ({ log: [...s.log, { ...b, id } as RpBurbuja] }));
    return id;
  },

  // Si la burbuja ya no existe (salió a mitad de stream) el patch no encuentra
  // su id y se evapora: no hay nada que guardar.
  patchNarr: (id, patch) =>
    set((s) => ({
      log: s.log.map((b) => (b.id === id && b.tipo === 'narr' ? { ...b, ...patch } : b)),
    })),

  remove: (id) => set((s) => ({ log: s.log.filter((b) => b.id !== id) })),
}));
