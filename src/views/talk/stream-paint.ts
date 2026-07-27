/* Throttle del stream a un frame. Lo comparten el turno de CHARLA (sendTurn,
   public/legacy.html:4109) y el de ESCENAS (rpTurn, L7373): los dos reciben de
   callStream el acumulado en CADA chunk — decenas por segundo — y en React cada
   patch repinta la lista entera de burbujas. Con rAF se pinta como mucho una
   vez por frame, que es lo máximo que el ojo puede ver.

   En el viejo esto no existía porque escribía `liveBubble.textContent` a pelo:
   un nodo, sin re-render. Es la única pieza que la migración añade a los dos
   turnos, y por eso vive en un sitio y no en dos. */
export function crearPintor(patch: (texto: string) => void) {
  let raf = 0;
  let pendiente: string | null = null;
  return {
    pintar(texto: string) {
      pendiente = texto;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (pendiente !== null) {
          patch(pendiente);
          pendiente = null;
        }
      });
    },
    /* Se llama antes de borrar la burbuja o de hacer el swap final: si quedara
       un frame en vuelo repintaría el texto de la fase 1 encima de la fase 2. */
    cancelar() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      pendiente = null;
    },
  };
}
