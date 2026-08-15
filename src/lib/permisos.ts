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
   entrar a la RUTA no vuelve a sondear. Si el navegador recuerda la concesión
   no hay popup, que es justo lo que queremos.

   PEDIR AL ENTRAR SÍ, QUEJARSE AL ENTRAR NO. El sondeo es SIEMPRE mudo: quién
   protesta lo decide quien llama, con `avisar`. La asimetría no es capricho —
   el toast de "bloqueado" es útil cuando el usuario acaba de pedir hablar (ahí
   explica por qué no pasó nada), y es un insulto cuando el usuario no pidió
   nada, porque el sondeo lo disparó el simple hecho de montar la vista. En la
   RUTA eso costaba caro: es la pantalla de bienvenida de un A1 y el toast le
   caía encima del CTA "Dale, cuéntame" antes de que leyera una palabra. */

import { toast } from '@/stores/toast';

/** El sondeo separa "no hay mic" de "lo bloquearon": solo lo segundo se avisa
    (lo primero no lo arregla el usuario tocando un candado). */
type Sondeo = { ok: boolean; bloqueado: boolean };

let enVuelo: Promise<Sondeo> | null = null;
let avisoDado = false; // el toast de "bloqueado" se da UNA vez, no en bucle

async function sondear(): Promise<Sondeo> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, bloqueado: false };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true, bloqueado: false };
  } catch (e) {
    const nombre = (e as DOMException)?.name || '';
    if (nombre === 'NotAllowedError' || nombre === 'SecurityError') {
      return { ok: false, bloqueado: true };
    }
    console.warn('[permisos] getUserMedia falló —', e);
    return { ok: false, bloqueado: false };
  }
}

/** Pide (una sola vez por sesión) el permiso de micrófono. No bloquea nada:
    quien la llama al montar una vista lo hace con `void`.

    `avisar` gobierna SOLO el toast, nunca el sondeo — el diálogo del navegador
    aparece igual, que es el punto de pedirlo al entrar. Por defecto avisa, para
    que los sitios que ya lo llamaban se comporten exactamente igual que antes;
    el que entra mudo tiene que decirlo. */
export function pedirPermisoMic({ avisar = true }: { avisar?: boolean } = {}): Promise<boolean> {
  if (!enVuelo) enVuelo = sondear();
  /* El aviso se resuelve por LLAMADA y no dentro de sondear(): la promesa se
     cachea, así que si el sondeo mudo de la RUTA se comiera la decisión, un
     `pedirPermisoMic()` posterior —el de CHARLA— se quedaría callado para
     siempre por haber llegado segundo. */
  return enVuelo.then((r) => {
    if (avisar && r.bloqueado && !avisoDado) {
      avisoDado = true;
      toast('El micrófono está bloqueado. Tócalo en el candado 🔒 de la barra de direcciones y permite el micrófono.', 6000);
    }
    return r.ok;
  });
}
