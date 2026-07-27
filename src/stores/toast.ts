import { create } from 'zustand';

import { setStorageErrorHandler } from '@/lib/storage';

/* Aviso efímero. Port de toast(msg, ms = 2600) (public/legacy.html:3208-3214).

   El viejo tenía UN solo <div id="toast">: cada aviso pisaba el anterior y le
   reiniciaba el timer. Aquí es una cola de hasta 3 apiladas, cada una con su
   propio timer, porque en el legacy había secuencias que se comían entre sí
   (`toast('Preparando tu debrief...', 4000)` y, dos segundos después, el toast
   de error del mismo debrief: el segundo borraba al primero y heredaba su
   hueco). Apilar no retrasa a nadie: cada aviso vive sus propios ms. */

export type ToastItem = { id: number; msg: string; ms: number };

const MAX_VISIBLES = 3;
let seq = 0;

type ToastState = {
  toasts: ToastItem[];
  push: (msg: string, ms?: number) => void;
  dismiss: (id: number) => void;
};

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (msg, ms = 2600) =>
    set((s) => ({ toasts: [...s.toasts, { id: ++seq, msg, ms }].slice(-MAX_VISIBLES) })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/* Imperativo, como el viejo: lo llaman módulos que no son componentes
   (speech.ts, storage.ts, los turnos de charla). Misma firma de siempre. */
export function toast(msg: string, ms = 2600): void {
  useToast.getState().push(msg, ms);
}

// store.set avisaba con un toast cuando localStorage reventaba (L2940). El
// módulo de storage no puede importar este archivo (se cargaría zustand desde
// la capa de datos), así que el enchufe se conecta aquí.
setStorageErrorHandler((msg) => toast(msg));
