import { useEffect, useState } from 'react';

const MEDIA_MODO_LIGERO = '(max-width: 767px), (pointer: coarse), (prefers-reduced-motion: reduce)';

/**
 * Phones and reduced-motion devices get the same low-cost rendering path.
 * It is intentionally decided at startup: rotating a phone must not suddenly
 * mount WebGL canvases or restart decorative animation loops mid-session.
 */
export const MODO_LIGERO =
  typeof window !== 'undefined' && window.matchMedia(MEDIA_MODO_LIGERO).matches;

const MEDIA_ES_TELEFONO = '(max-width: 767px) and (pointer: coarse)';

/* ¿Esto es un TELÉFONO? Ancho de teléfono Y dedo, con AND — a propósito
   distinto del OR de MODO_LIGERO: aquel baja calidad de render y también
   atrapa laptops táctiles anchas o con prefers-reduced-motion, que NO deben
   cambiar de layout. ES_TELEFONO decide LAYOUT (la navbar inferior de
   píldoras, quitar la píldora Menu y el TRY ME), así que exige las dos
   señales a la vez. Decidido al arranque igual que MODO_LIGERO: rotar el
   aparato a mitad de sesión no debe montar/desmontar la navegación. */
export const ES_TELEFONO =
  typeof window !== 'undefined' && window.matchMedia(MEDIA_ES_TELEFONO).matches;

/* ¿Hay red? Se pregunta EN VIVO, no una vez al arrancar como MODO_LIGERO: la
   señal de un celular se cae y vuelve varias veces en una sesión, y lo que
   depende de esto (el nodo del coach) tiene que enterarse sin recargar.

   `navigator.onLine` miente hacia arriba —dice true con wifi conectado pero sin
   internet— y eso está bien acá: lo que necesita este hook es NO esconder nada
   por creerse offline de más. Cuando miente, la llamada falla y coachErrMsg
   pone el mensaje bueno. Lo que no puede pasar es lo contrario: que la app
   apague un nodo que sí funcionaba. */
export function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine !== false,
  );
  useEffect(() => {
    const subir = () => setEnLinea(true);
    const bajar = () => setEnLinea(false);
    window.addEventListener('online', subir);
    window.addEventListener('offline', bajar);
    // Por si cambió entre el primer render y el efecto.
    setEnLinea(navigator.onLine !== false);
    return () => {
      window.removeEventListener('online', subir);
      window.removeEventListener('offline', bajar);
    };
  }, []);
  return enLinea;
}
