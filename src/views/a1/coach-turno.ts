import { callJSON, type ChatMessage } from '@/lib/api';
import {
  anotarSesion,
  anotarTurnoUsuario,
  aplicarSrs,
  esVuelta,
  pasarTurno,
  parsearCierre,
  tieneCoach,
  type CierreModelo,
  type TurnoModelo,
} from '@/lib/coach-a1';
import type { A1UnitRuta } from '@/content/a1/tipos-ruta';
import { useA1 } from '@/stores/a1';
import { useCoach, type SesionCoach } from '@/stores/coach';
import { toast } from '@/stores/toast';

import {
  COACH_ABRIR,
  COACH_CIERRE_MAX_TOKENS,
  COACH_MAX_TOKENS,
  COACH_TURNOS_MIN,
  coachCierreSystem,
  coachCierreUser,
  coachErrMsg,
  coachSystem,
} from './coach-prompts';

/* LA MÁQUINA DE TURNOS DEL COACH — el patrón de el motor de turnos de ESCENAS (borrado el 2026-08-17), no su copia.

   Lo que se hereda de ahí, que es lo que ya costó rondas:

   · IDENTIDAD, no truthiness. Todos los guards comparan `sesion === ses`. Si el
     usuario sale a mitad de espera y abre otra parada, este turno huérfano no
     pinta en la nueva ni le mete un assistant al historial.
   · EL REINTENTO POR JSON TRUNCADO. Kimi razona antes de responder y se queda
     sin tokens a mitad de pensamiento: el JSON llega roto con finish 'length'.
     el motor de ESCENAS (borrado) lo resolvía parseando primero y reintentando
     solo en ese caso. Acá
     no se recopia: `callJSON` (lib/api.ts) ES esa lógica ya factorizada — mismo
     parseo defensivo, mismo reintento único, mismo techo. Un tercer lugar con
     la misma trampa escrita a mano es un lugar donde se va a arreglar tarde.
   · La línea del usuario NO se traga si el turno falla: vuelve al campo.

   Lo que NO se hereda, a propósito:
   · Sin streaming. El turno del coach son ocho palabras; el lápiz dura menos que
     el tiempo de montar el pintor, y el JSON parcial de una frase corta se ve
     como parpadeo. ESCENAS streamea porque narra párrafos.
   · Sin voz. Fase 2. Ver el punto de extensión al final del archivo.

   Y lo que agrega, que es la razón de ser de todo esto: entre el modelo y la
   pantalla está la COMPUERTA (pasarTurno, lib/coach-a1.ts). El modelo propone
   una corrección; quien decide si se dice es el motor. */

let ocupado = false;
let cerrandoBusy = false;

/** Abre la conversación y deja que el personaje diga la primera línea. */
export function abrirCoach(unit: A1UnitRuta): boolean {
  if (!tieneCoach(unit) || useCoach.getState().sesion) return false;
  const ses = useCoach.getState().abrir(unit, esVuelta(unit.id));
  if (!ses) return false;
  ses.mensajes.push({
    role: 'system',
    content: coachSystem(unit.coach!, ses.vocab, ses.conv.tope),
  });
  void coachTurno(null);
  return true;
}

/** Salir a mitad. Queda anotado como ABANDONADA: es una de las tres señales, y
    es la que más rápido delata un coach que corrige de más. */
export function salirCoach(): void {
  const ses = useCoach.getState().sesion;
  if (ses && ses.intercambios > 0) {
    anotarSesion({
      ts: Date.now(),
      unitId: ses.unit.id,
      largos: ses.conv.largos,
      abandonada: true,
      porSuCuenta: ses.porSuCuenta,
      correcciones: ses.conv.usadas,
    });
  }
  useCoach.getState().cerrarSesion();
  ocupado = false;
  cerrandoBusy = false;
}

export async function coachTurno(userText: string | null): Promise<void> {
  const st = useCoach.getState();
  if (ocupado || !st.sesion) {
    // Un dictado en curso entrega su texto aunque el botón ya esté apagado.
    if (userText && st.sesion) st.devolverTexto(userText);
    return;
  }

  const ses: SesionCoach = st.sesion;
  const vive = () => useCoach.getState().sesion === ses;

  ocupado = true;
  st.setInputOn(false);

  if (userText) {
    ses.mensajes.push({ role: 'user', content: userText });
    ses.intercambios++;
    anotarTurnoUsuario(ses.conv, userText);
    st.add({ tipo: 'usuario', texto: userText });
  } else {
    ses.mensajes.push({ role: 'user', content: COACH_ABRIR });
  }

  const esperaId = useCoach.getState().add({ tipo: 'espera' });

  try {
    const { parsed } = await callJSON('chat', ses.mensajes, COACH_MAX_TOKENS);
    if (!vive()) return;

    const limpio = pasarTurno(ses.conv, parsed as TurnoModelo | null);
    if (!limpio) {
      /* El turno se cayó entero. Dos motivos posibles y los dos terminan igual:
         el modelo no devolvió nada usable, o TODO lo que dijo era señalamiento y
         el filtro no dejó una sola frase en pie. Preferimos el silencio a un
         regaño: se avisa, la línea del usuario vuelve al campo y la
         conversación sigue viva. */
      throw new Error(userText ? 'No te escuché bien. Dilo otra vez.' : 'No arrancó la escena. Prueba otra vez.');
    }

    ses.mensajes.push({ role: 'assistant', content: JSON.stringify(parsed) });
    useCoach.getState().remove(esperaId);
    useCoach.getState().add({ tipo: 'personaje', texto: limpio.reply });

    /* El personaje decidió cerrar (o ya se pasó de largo). El debrief lo escribe
       Alfred, y arranca solo: pedirle al usuario que toque "terminar" después
       de que la escena ya terminó es hacerle cerrar dos veces la misma puerta. */
    if (limpio.cerrar && ses.intercambios >= COACH_TURNOS_MIN) {
      void cerrarCoach();
      return;
    }
  } catch (err) {
    useCoach.getState().remove(esperaId);
    if (vive()) {
      toast(coachErrMsg(err), 4200);
      ses.mensajes.pop(); // no dejar el turno colgado en el historial
      if (userText) {
        ses.intercambios--;
        ses.conv.largos.pop();
        useCoach.getState().devolverTexto(userText);
      }
    }
  } finally {
    /* `!cerrando` no es paranoia: cuando el personaje cierra la escena, este
       mismo turno dispara cerrarCoach() y sigue de largo hasta acá. cerrarCoach
       corre síncrono hasta su primer await —o sea que ya dejó `cerrando` en
       true— y sin esta guarda el finally le volvía a prender el campo de texto
       y soltaba `ocupado` en plena espera del debrief: se podía escribir y
       mandar otro turno encima del cierre. */
    if (vive() && !useCoach.getState().cerrando) {
      ocupado = false;
      useCoach.getState().setInputOn(true);
    }
  }
}

/* ── El cierre: habla Alfred ──────────────────────────────────────────────
   Y el JSON NO llega a la pantalla. Lo que se pinta son tres bloques ya
   resueltos (Cierre), y el `srs` se aplica en silencio: esa es la corrección
   que el usuario recibe mañana en el Repaso de pasillo, en el único contexto
   donde corregir no duele. */
export async function cerrarCoach(): Promise<void> {
  const st = useCoach.getState();
  if (!st.sesion || cerrandoBusy) return;
  const ses = st.sesion;
  const vive = () => useCoach.getState().sesion === ses;

  /* Sin una sola línea del usuario no hay nada que cerrar y el cierre es caro.
     Se sale sin hoja, y sin anotar sesión: entrar y salir no es una sesión. */
  if (ses.intercambios < 1) {
    useCoach.getState().cerrarSesion();
    return;
  }

  cerrandoBusy = true;
  st.setInputOn(false);
  st.setCerrando(true);

  try {
    // Se preserva el FINAL: ahí están los turnos donde ya se soltó a hablar.
    const transcript = ses.mensajes
      .filter((m) => m.role !== 'system')
      .slice(-16)
      .map((m) => (m.role === 'user' ? 'PERSONA: ' : 'ESCENA: ') + m.content.slice(0, 400))
      .join('\n')
      .slice(-6000);

    const mensajes: ChatMessage[] = [
      { role: 'system', content: coachCierreSystem(ses.unit.coach!, ses.vocab) },
      { role: 'user', content: coachCierreUser(transcript) },
    ];
    const { parsed } = await callJSON('creative', mensajes, COACH_CIERRE_MAX_TOKENS);
    if (!vive()) return;

    const cierre = parsearCierre(parsed as CierreModelo | null, ses.conv, ses.vocab);
    if (!cierre) throw new Error('No pude armar el cierre.');

    // En silencio, y antes de pintar: si el usuario cierra la hoja rápido, el
    // SRS ya quedó guardado igual.
    aplicarSrs(cierre);
    useA1.getState().actualizarRacha();
    anotarSesion({
      ts: Date.now(),
      unitId: ses.unit.id,
      largos: ses.conv.largos,
      abandonada: false,
      porSuCuenta: ses.porSuCuenta,
      correcciones: ses.conv.usadas,
    });

    useCoach.getState().setCierre(cierre);
  } catch (err) {
    /* Fallar el cierre NO destruye la conversación (misma decisión que ESCENAS):
       se ofrece reintentar o salir. Perder la charla entera por un rate-limit
       sería la peor forma de terminar algo que salió bien. */
    if (vive()) useCoach.getState().setErrorCierre(coachErrMsg(err));
  } finally {
    cerrandoBusy = false;
    if (vive()) {
      useCoach.getState().setCerrando(false);
      /* El turno que disparó este cierre dejó `ocupado` puesto a propósito (ver
         su finally). Se suelta acá, que es donde de verdad terminó todo. */
      ocupado = false;
      useCoach.getState().setInputOn(true);
    }
  }
}

export function reintentarCierre(): void {
  useCoach.getState().setErrorCierre(null);
  setTimeout(() => void cerrarCoach(), 100);
}

/** "Listo" de la hoja: cierra hoja y conversación. El SRS ya se aplicó. */
export function terminarCoach(): void {
  useCoach.getState().cerrarSesion();
  ocupado = false;
  cerrandoBusy = false;
}

/* ── PUNTO DE EXTENSIÓN: LA VOZ ───────────────────────────────────────────
   Preparado, no construido. Cuando entre (desde el Tramo 3, según la decisión
   de producto), lo que cambia es SOLO cómo llega el texto del usuario y cómo
   sale el del personaje — la compuerta, el tope, el SRS y el debrief no se
   enteran:

     entrada · `coachTurno(texto)` ya recibe un string y no le importa de dónde
               salió. El dictado del repo (views/a1-voice/use-grabadora.ts,
               /api/stt) devuelve exactamente eso. Un botón de mic al lado del
               campo y listo.
     salida  · `hablarSincronizado(reply)` (lib/voice-sync.ts) es lo que usa
               ESCENAS para que las letras caigan cuando arranca el audio. Va
               justo antes del `add({ tipo: 'personaje' })` de arriba.

   Lo que NO hay que hacer al conectarla: corregir por escrito lo que se dijo
   hablando. Eso es doble castigo y está prohibido en COACH-diseño §5. Si la
   entrada fue voz, la corrección sigue siendo una reformulación hablada dentro
   de la respuesta del personaje, y nada más. */
