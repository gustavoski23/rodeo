/* PERMISOS — el permiso de micrófono se pide AL ENTRAR a una feature de voz,
   no al primer toque del mic (pedido de Gus).

   El problema que arregla: el navegador solo abre el diálogo de permiso cuando
   alguien llama a getUserMedia. La grabadora lo llamaba en el momento de
   grabar, así que si el usuario había bloqueado el mic (o el diálogo nunca se
   había mostrado en ese origen) el primer toque del mic moría con un "no me
   diste permiso" sin que el navegador hubiera preguntado NADA. Preguntando al
   montar la vista, el diálogo aparece cuando el usuario acaba de decidir que
   quiere hablar — y cuando llega al mic, el permiso ya está resuelto.

   No toca la grabadora ni el LiveWaveform: esto solo abre (y cierra) un stream
   de sondeo. Los tracks se paran INMEDIATAMENTE — dejar el stream vivo
   encendería el LED del micro toda la sesión.

   Singleton de módulo: la promesa se cachea, así que entrar a CHARLA, salir y
   entrar a OFICINA no vuelve a sondear. Si el navegador recuerda la concesión
   no hay popup, que es justo lo que queremos. */

import { toast } from '@/stores/toast';

let enVuelo: Promise<boolean> | null = null;
let avisoDado = false; // el toast de "bloqueado" se da UNA vez, no en bucle

async function sondear(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch (e) {
    const nombre = (e as DOMException)?.name || '';
    if (nombre === 'NotAllowedError' || nombre === 'SecurityError') {
      if (!avisoDado) {
        avisoDado = true;
        toast('El micrófono está bloqueado. Tócalo en el candado 🔒 de la barra de direcciones y permite el micrófono.', 6000);
      }
    } else {
      console.warn('[permisos] getUserMedia falló —', e);
    }
    return false;
  }
}

/** Pide (una sola vez por sesión) el permiso de micrófono. No bloquea nada:
    quien la llama al montar una vista lo hace con `void`. */
export function pedirPermisoMic(): Promise<boolean> {
  if (!enVuelo) enVuelo = sondear();
  return enVuelo;
}
