import { create } from 'zustand';

/* ¿ESTOY DENTRO DE LA LECCIÓN DEL A1? — la señal que App lee para mandar el
   loop a pantalla completa.

   Es EL MISMO mecanismo que useEnCharla() (stores/talk.ts) y por la misma razón,
   pedida por el mismo usuario: dentro de la lección la fila de arriba (Menu ☰ +
   toggler) es ruido duplicado, porque la cabecera del loop —←, los puntos, el
   bombillo y Alfred— ya hace de header. Gus la tachó en rojo, igual que tachó el
   wordmark encima de la sesión de CHARLA en su día.

   EN UN STORE PROPIO Y NO EN stores/a1.ts, A PROPÓSITO. Ese archivo es el MOTOR
   —progreso, Leitner, racha y "Mis frases"—, todo persistido en localStorage con
   las claves del legacy, y su cabecera promete "sin una sola línea de DOM". Esto
   es justo lo contrario: cromo de pantalla, efímero, que TIENE que morir al
   recargar. Metido ahí, cualquiera que toque el motor tendría que acordarse de
   no persistirlo.

   Tampoco puede quedarse en el `useState<Pantalla>` de views/a1/index.tsx, que
   es donde nace: App es HERMANA de esa vista, no su madre, y no hay forma de
   que lea ese estado sin subirlo. El store es el cable entre las dos. */

type A1LeccionState = {
  enLeccion: boolean;
  setEnLeccion: (v: boolean) => void;
};

export const useA1Leccion = create<A1LeccionState>((set) => ({
  enLeccion: false,
  setEnLeccion: (enLeccion) => set({ enLeccion }),
}));

/** ¿El usuario está DENTRO de la lección (portada, sesión, misión o la charla de
    la parada) y no en el mapa? En el MAPA vale `false` a propósito: ahí el menú
    es el centro de navegación del módulo y esconderlo dejaría al usuario sin
    salida. La usa App para quitar la fila superior y devolverle a la lección los
    píxeles de arriba y los de abajo. */
export function useEnLeccion(): boolean {
  return useA1Leccion((s) => s.enLeccion);
}
