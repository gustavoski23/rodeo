import { useCallback, useRef, useState } from 'react';

import { extraerFrasesDelTranscript, guardarLeccionesA1, marcarTemaA1 } from '@/lib/a1-memory';
import { callAPI, callJSON, callStream, extractPartialReply, parseJSON, type ChatMessage } from '@/lib/api';
import { recordUpgrade, saveDNA } from '@/lib/dna';
import { parseChunks, stripChunksLive, type Gloss } from '@/lib/gloss';
import { hablarSincronizado } from '@/lib/voice-sync';
import { REDUCED } from '@/lib/theme';
import { toast } from '@/stores/toast';
import { guardarOpener, leerOpeners, useTalk, type Debrief, type TalkSession } from '@/stores/talk';

import { tipPrimeraVez } from './first-tip';
import { crearPintor } from './stream-paint';
import { medirMaquina } from './typewriter';
import {
  DEBRIEF_SYSTEM,
  IDEA_SYSTEM,
  SCENARIOS,
  TALK_MAX_TOKENS,
  TALK_MAX_TOKENS_RETRY,
  TALK_OPENING,
  areaUsuario,
  buildSituation,
  debriefUser,
  elegirRompehielos,
  ideaUser,
  nivelUsuario,
  nombreUsuario,
  premiumGate,
  rompehielosA1,
  talkSystemPrompt,
  type ScenarioKey,
} from './prompts';

/* EL TURNO DEL COACH — port de sendTurn (public/legacy.html:4109-4251),
   startSession (L3890), startLibre (L3975), la bombilla (L4426), el debrief
   (L4276) y closeSession (L4342).

   El orden de los pasos y las condiciones son literales. Lo único que cambia
   de forma es el DESTINO de lo pintado: donde el viejo creaba nodos y los
   metía en #chat-scroll, aquí se empujan burbujas al displayLog del store y
   React las pinta. Los guards de "¿sigue viva la sesión?" se conservan tal
   cual, incluida su forma por truthiness (§8 trampa 12).

   Dos desviaciones, ambas deliberadas y acotadas:

   · `messages` se muta sobre la sesión CAPTURADA al empezar el turno, no sobre
     `state.session` releído. El viejo hacía `state.session.messages.pop()` en
     el catch: si volviste atrás y abriste otra charla mientras el turno volaba,
     ese pop le arrancaba un mensaje a la sesión NUEVA. Aquí el turno huérfano
     escribe en su propio historial muerto. Lo visible (qué se pinta, qué se
     descarta) es idéntico; lo que se arregla es una corrupción invisible que
     la propia spec marca como la asimetría a documentar.

   · La máquina de escribir (§3.2) solo entra cuando NO hubo stream. El viejo
     tecleaba el reply limpio pieza a pieza y AL TERMINAR cambiaba el innerHTML
     por la versión glosada; con streaming eso significa re-escribir un texto
     que el usuario acaba de leer, así que ahí la fase 2 es un swap atómico a
     <GlossText> (el subrayado sigue "apareciendo como remate", que era el
     efecto buscado). Cuando la respuesta llega de golpe —fallback sin stream,
     reintento por 'length', prefers-reduced-motion aparte— se teclea con los
     valores exactos del viejo y las correcciones caen DENTRO del callback, no
     en el mismo frame que el reply: ese retardo es parte del ritmo (§1.4 p.11).
     La apertura de dibujo libre sigue sin tecleo, como en el viejo (§1.3 p.8). */

type RespuestaCoach = { reply?: string; corrections?: unknown; glosses?: unknown };
type Correccion = { quote?: string; fix?: string; why?: string };

/* ── Siembra local de una apertura visible ──────────────────────────────────
   El texto YA es la apertura del coach: se siembra como turno 'assistant' y se
   pinta directo, sin gastar llamada. Desde 2026-08-04 la charla libre B2+ NO
   pasa por aquí (abre por IA — ver abrirLibreIA); esto queda para A1 (su
   rompehielos ya viene personalizado de la API, en español) y para quien llame
   a startLibre con un texto visible ya elegido. */
function sembrarLibre(ice: string) {
  const sit = buildSituation();
  useTalk.getState().abrirSesion(
    {
      scenario: 'free',
      title: 'Dibujo libre',
      situation: sit,
      messages: [
        { role: 'system', content: talkSystemPrompt(SCENARIOS.free.prompt, sit, leerOpeners(), nivelUsuario()) },
        { role: 'assistant', content: JSON.stringify({ reply: ice, corrections: [], glosses: [] }) },
      ],
    },
    [{ tipo: 'espera', desde: Date.now() }],
  );
  tipPrimeraVez('talk', 'Toca el mic y habla — te corrijo');
  const idLapiz = useTalk.getState().displayLog[0]?.id ?? null;
  void (async () => {
    await hablarSincronizado(ice);
    if (idLapiz !== null) useTalk.getState().removeBubble(idLapiz);
    useTalk.getState().addBubble({ tipo: 'coach', texto: ice, glosses: [], final: true });
  })();
}

// El "Hey Gus — " de las aperturas B2+ que no genera el modelo.
function conSaludo(ice: string): string {
  const nom = nombreUsuario();
  if (!nom) return ice;
  const low = /^[A-Z][a-z]/.test(ice) ? ice.charAt(0).toLowerCase() + ice.slice(1) : ice;
  return `Hey ${nom} — ${low}`;
}

/* ── Apertura por IA de la charla libre (pedido de Gus, 2026-08-04) ─────────
   "Conversación libre" sembraba un rompehielos de un pool local fijo y con el
   uso se repetían las mismas preguntas ("Pitch me your city…" otra vez). Ahora
   la apertura ES un turno real del modelo: sale por la API con la semilla de
   situación, el DNA y la memoria anti-repetición (TALK_OPENING + los últimos
   8 openers en el system como "no abras así") — exactamente el circuito que ya
   usaban los chips de escenario. Cuesta una llamada por apertura: es lo
   pedido, a cambio de que nunca pregunte lo mismo seguido.

   Si esa llamada falla (sin red, sin saldo), cae al rompehielos local de
   siempre para que el chat no se quede vacío. */
async function abrirLibreIA(): Promise<void> {
  const sit = buildSituation();
  useTalk.getState().abrirSesion({
    scenario: 'free',
    title: 'Dibujo libre',
    situation: sit,
    messages: [{ role: 'system', content: talkSystemPrompt(SCENARIOS.free.prompt, sit, leerOpeners(), nivelUsuario()) }],
  });
  tipPrimeraVez('talk', 'Toca el mic y habla — te corrijo');

  const ses = useTalk.getState().session;
  await ejecutarTurno(null); // el coach abre — esto SÍ gasta una llamada
  const st = useTalk.getState();
  // ¿El turno de apertura no pintó nada? (falló y su catch hizo pop). Respaldo
  // local para no dejar la sesión muda. Solo si SIGUE siendo esta sesión.
  if (st.session && st.session === ses && !st.displayLog.some((b) => b.tipo === 'coach')) {
    const ice = conSaludo(elegirRompehielos());
    ses.messages.push({ role: 'assistant', content: JSON.stringify({ reply: ice, corrections: [], glosses: [] }) });
    void (async () => {
      await hablarSincronizado(ice);
      if (useTalk.getState().session !== ses) return;
      useTalk.getState().addBubble({ tipo: 'coach', texto: ice, glosses: [], final: true });
    })();
  }
}

/* ── Apertura desde el Home aurora ──────────────────────────────────────────
   Función de módulo (no hook): el Home vive fuera de TalkView y solo necesita
   los stores. B2+: apertura por IA (abrirLibreIA). A1: rompehielos
   personalizado vía API en español, sembrado directo — el modo A1 no abre con
   TALK_OPENING. */
export async function lanzarLibreAurora(opts: { focoVolver?: boolean } = {}): Promise<boolean> {
  if (useTalk.getState().busy) return false;
  if (!premiumGate('talk')) return false;

  useTalk.getState().setTalkMode('charla');

  if (nivelUsuario() === 'A1') {
    const ice = await rompehielosA1().catch(() => elegirRompehielos());
    sembrarLibre(ice);
  } else {
    /* No se espera el turno: la sesión y su lápiz ya quedaron abiertos de
       forma síncrona dentro de abrirLibreIA, y el Home debe cambiar de vista
       YA, no cuando el modelo termine. */
    void abrirLibreIA();
  }

  useTalk.getState().setFocoVolver(!!opts.focoVolver);
  return true;
}

/* Las correcciones caen juntas, en orden, y siempre DESPUÉS del reply: pisarle
   la lectura al usuario con la tarjeta roja era lo que el viejo evitaba metiendo
   esto en el callback del tecleo (L4213-4218).

   Si volvió a los escenarios mientras se tecleaba ya no se pintan — el viejo las
   metía igual en el #chat-scroll recién vaciado y reaparecían en la charla
   siguiente —, pero SÍ se guardan: el DNA es dato del usuario, no de la
   pantalla, y esa parte del viejo sí es la correcta. */
function soltarCorrecciones(corrections: Correccion[]) {
  const viva = !!useTalk.getState().session;
  corrections.forEach((c) => {
    if (!c || !c.fix) return;
    if (viva) {
      useTalk.getState().addBubble({
        tipo: 'correccion',
        quote: c.quote || '',
        fix: c.fix,
        why: c.why || '',
      });
    }
    saveDNA({ type: 'error', quote: c.quote || '', fix: c.fix, why: c.why || '' });
  });
}

/* ── El turno (sendTurn, L4109) ─────────────────────────────────────────────
   Función de MÓDULO desde 2026-08-04 (era un useCallback del hook, con CERO
   dependencias — solo toca stores y módulos): abrirLibreIA también la necesita
   y vive fuera del hook. Comportamiento idéntico; el hook la sigue exponiendo
   como `sendTurn`. */
async function ejecutarTurno(userText: string | null): Promise<void> {
  const t = useTalk.getState();
  if (t.busy || !t.session) return;
  const ses: TalkSession = t.session;
  t.setBusy(true);

  if (userText) {
    ses.messages.push({ role: 'user', content: userText });
    useTalk.getState().addBubble({ tipo: 'user', texto: userText });
  } else {
    ses.isOpening = true;
    ses.messages.push({ role: 'user', content: TALK_OPENING });
  }

  // La burbuja del lápiz. Su contador de segundos lo lleva el componente:
  // aparece a los 3 s y a los 25 s añade "· pensando" (L4133-4146).
  const typingId = useTalk.getState().addBubble({ tipo: 'espera', desde: Date.now() });

  let liveId: number | null = null;
  const pintor = crearPintor((texto) => {
    if (liveId !== null) useTalk.getState().patchCoach(liveId, { texto });
  });

  try {
    let content: string, finish: string | null;
    try {
      /* Streaming: la respuesta empieza a verse en ~3 s en vez de esperar el
         turno completo. Solo se pinta cuando ya hay texto de "reply", así el
         lápiz sigue girando mientras el modelo razona. */
      ({ content, finish } = await callStream('chat', ses.messages, TALK_MAX_TOKENS, (acc) => {
        if (!useTalk.getState().session) return; // volvió atrás: no pintar nada
        const partial = extractPartialReply(acc);
        if (!partial) return;
        if (liveId === null) {
          useTalk.getState().removeBubble(typingId);
          liveId = useTalk.getState().addBubble({ tipo: 'coach', texto: '', glosses: null, final: false });
        }
        pintor.pintar(stripChunksLive(partial));
      }));
    } catch (eStream) {
      /* Sin crédito NO es "stream no disponible": reintentar por la ruta
         clásica volvería a recorrer la cadena de modelos muerta — doble
         gasto, doble espera, mismo error. Se re-lanza y el catch de afuera
         muestra el mensaje humano de una vez. */
      if ((eStream as Error & { code?: string }).code === 'sin_saldo_ia') throw eStream;
      /* Si el stream no está disponible (proxy que bufferea, red rara) se cae
         a la ruta clásica sin romperle la sesión al usuario. */
      pintor.cancelar();
      if (liveId !== null) {
        useTalk.getState().removeBubble(liveId);
        liveId = null;
      }
      ({ content, finish } = await callAPI('chat', ses.messages, TALK_MAX_TOKENS));
    }

    // Si volvió a los escenarios mientras el turno estaba en vuelo, la
    // respuesta ya no le sirve a nadie: se descarta en silencio.
    if (!useTalk.getState().session) return;

    /* Red de seguridad: si el modelo gasta TODO el presupuesto razonando, el
       stream llega vacío con finish 'length'. Un solo reintento con techo
       mayor, en vez de dejarle el chat en blanco. */
    if ((!content || !content.trim()) && finish === 'length') {
      pintor.cancelar();
      if (liveId !== null) {
        useTalk.getState().removeBubble(liveId);
        liveId = null;
      }
      ({ content, finish } = await callAPI('chat', ses.messages, TALK_MAX_TOKENS_RETRY));
    }

    const parsed = parseJSON(content) as RespuestaCoach | null;
    let reply: string;
    let corrections: Correccion[];
    if (parsed && parsed.reply) {
      reply = String(parsed.reply);
      corrections = Array.isArray(parsed.corrections) ? (parsed.corrections as Correccion[]) : [];
      ses.messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
    } else if (finish === 'stop' && content && !content.trim().startsWith('{')) {
      // El modelo respondió en texto plano legítimo (raro pero posible): se
      // pushea el content CRUDO, no un JSON.stringify.
      reply = content;
      corrections = [];
      ses.messages.push({ role: 'assistant', content });
    } else {
      throw new Error('El coach se enredó — repite el mensaje');
    }

    const glosses: Gloss[] = parsed && Array.isArray(parsed.glosses) ? (parsed.glosses as Gloss[]) : [];

    // A1: extraer frases enseñadas del reply del coach y guardarlas en memoria
    if (nivelUsuario() === 'A1' && reply) {
      const area = areaUsuario();
      const frases = extraerFrasesDelTranscript(reply, area);
      if (frases.length) guardarLeccionesA1(frases);
    }

    // Se cancela el pintor antes de tocar nada para que un frame rezagado del
    // stream no pise el reply crudo que necesita <GlossText>.
    pintor.cancelar();

    /* Sincronía texto-voz (pedido de Gus): las letras esperan a que la voz
       de Deepgram arranque —o al tope de 3 s si tarda o falla— y aparecen
       CUANDO el audio empieza a sonar. El lápiz gira mientras tanto. Con la
       voz apagada, hablarSincronizado registra el texto y resuelve al acto. */
    await hablarSincronizado(reply);
    // ¿Salió de la charla mientras la voz calentaba? No pintar la respuesta.
    if (!useTalk.getState().session) return;

    useTalk.getState().removeBubble(typingId);

    const { clean } = parseChunks(reply);
    // Se teclea el texto YA limpio de marcadores: nunca queda un ⟦ a la vista.
    const tw = liveId === null && !REDUCED && clean ? medirMaquina(clean) : null;

    if (tw) {
      // FASE 1 tecleada + FASE 2 al terminar, como el viejo. El setTimeout no
      // se espera (el turno acaba y busy se libera ya, igual que allí: el
      // escribirMaquina del viejo también volvía en el acto).
      const burbuja = useTalk.getState().addBubble({ tipo: 'coach', texto: clean, glosses: null, final: false, tw });
      setTimeout(() => {
        useTalk.getState().patchCoach(burbuja, { texto: reply, glosses, final: true, tw: null });
        soltarCorrecciones(corrections);
      }, tw.totalMs);
    } else {
      // FASE 2 directa: swap atómico sobre lo ya streameado (o burbuja nueva
      // si el tecleo no aplica).
      if (liveId === null) {
        liveId = useTalk.getState().addBubble({ tipo: 'coach', texto: reply, glosses, final: true });
      } else {
        useTalk.getState().patchCoach(liveId, { texto: reply, glosses, final: true });
      }
      soltarCorrecciones(corrections);
    }

    // Memoria anti-repetición: las últimas 8 aperturas vuelven al prompt de
    // las siguientes sesiones como "no abras así".
    if (ses.isOpening) {
      ses.isOpening = false;
      guardarOpener(reply);
    }
  } catch (err) {
    pintor.cancelar();
    useTalk.getState().removeBubble(typingId);
    if (liveId !== null) useTalk.getState().removeBubble(liveId); // no dejar media respuesta
    // Si volvió atrás, la sesión ya no existe: ni toast ni pop.
    if (useTalk.getState().session) {
      toast('Error: ' + (err as Error).message, 5000);
      ses.messages.pop(); // no dejar el turno colgado
    }
  } finally {
    useTalk.getState().setBusy(false);
  }
}

export function useCoachTurn() {
  // La bombilla tiene su propio flag: puedes pedir una idea mientras el coach
  // responde (L4425). Nunca toca state.busy.
  const ideaBusyRef = useRef(false);
  const [ideaOn, setIdeaOn] = useState(false);

  const sendTurn = ejecutarTurno;

  /* ── Arranque por chip (startSession, L3890) ──────────────────────────── */
  const startSession = useCallback(
    (key: ScenarioKey) => {
      if (!premiumGate('talk')) return;
      const sc = SCENARIOS[key];
      const sit = buildSituation();
      const nivel = nivelUsuario();
      useTalk.getState().abrirSesion({
        scenario: key,
        title: sc.title,
        situation: sit,
        messages: [{ role: 'system', content: talkSystemPrompt(sc.prompt, sit, leerOpeners(), nivel) }],
      });
      tipPrimeraVez('talk', 'Toca el mic y habla — te corrijo');
      void sendTurn(null); // el coach abre (esto SÍ gasta una llamada)
    },
    [sendTurn],
  );

  /* ── Dibujo libre (startLibre, L3975) ─────────────────────────────────
     Sin texto dado: B2+ abre por IA (abrirLibreIA, pedido de Gus 2026-08-04)
     y A1 siembra su rompehielos personalizado de la API. Con `iceVisible`,
     ese texto ya elegido ES la apertura y se siembra directo, como siempre. */
  const startLibre = useCallback(async (iceVisible?: string) => {
    if (useTalk.getState().busy) return;
    if (!premiumGate('talk')) return;

    const esA1 = nivelUsuario() === 'A1';
    let ice = (iceVisible || '').trim();
    if (!ice) {
      if (!esA1) return abrirLibreIA();
      ice = await rompehielosA1().catch(() => elegirRompehielos());
    }
    sembrarLibre(esA1 ? ice : conSaludo(ice));
  }, []);

  /* ── Chat puro: el usuario abre escribiendo (portada de CHARLA) ───────────
     Variante de startLibre para el compositor del estado vacío: NO siembra un
     rompehielos del coach — abre una sesión libre y manda el texto del usuario
     como PRIMER turno, y el coach responde. Reusa sendTurn tal cual (gasta una
     llamada, como cualquier turno real). La sesión se abre sin displayLog: es
     sendTurn quien pinta la burbuja del usuario y el lápiz. */
  const startLibreConTexto = useCallback(
    (texto: string) => {
      const t = (texto || '').trim();
      if (!t) return;
      if (useTalk.getState().busy) return;
      if (!premiumGate('talk')) return;

      const sit = buildSituation();
      useTalk.getState().abrirSesion({
        scenario: 'free',
        title: 'Dibujo libre',
        situation: sit,
        messages: [{ role: 'system', content: talkSystemPrompt(SCENARIOS.free.prompt, sit, leerOpeners()) }],
      });
      tipPrimeraVez('talk', 'Toca el mic y habla — te corrijo');
      void sendTurn(t); // el usuario abre; el coach responde
    },
    [sendTurn],
  );

  /* ── Bombilla (#idea-btn, L4426) ──────────────────────────────────────
     Meta-ayuda: NO entra a session.messages ni usa state.busy. */
  const pedirIdea = useCallback(async () => {
    const st = useTalk.getState();
    if (!st.session || ideaBusyRef.current) return;
    ideaBusyRef.current = true;
    setIdeaOn(true);
    try {
      const lastCoach = [...st.session.messages].reverse().find((m) => m.role === 'assistant');
      let contexto = '(conversation start)';
      if (lastCoach) {
        // El turno assistant viene como JSON {"reply":…}: sacar solo el reply.
        try {
          contexto = String((JSON.parse(lastCoach.content) as RespuestaCoach).reply || '').slice(0, 500);
        } catch {
          contexto = String(lastCoach.content).slice(0, 500);
        }
      }
      const { parsed } = await callJSON(
        'chat',
        [
          { role: 'system', content: IDEA_SYSTEM },
          { role: 'user', content: ideaUser(contexto) },
        ],
        400,
      );
      const idea = (parsed as { idea?: string } | null)?.idea;
      if (!idea) throw new Error('no salió — dale otra vez');
      if (!useTalk.getState().session) return; // cerró la sesión mientras volaba
      useTalk.getState().addBubble({ tipo: 'idea', texto: String(idea) });
    } catch (err) {
      toast('Idea: ' + (err as Error).message);
    } finally {
      ideaBusyRef.current = false;
      setIdeaOn(false);
    }
  }, []);

  /* ── Terminar → debrief (#end-session, L4276) ─────────────────────────── */
  const terminar = useCallback(async () => {
    const st = useTalk.getState();
    if (!st.session || st.busy) return;
    const ses = st.session;

    /* Menos de 3 turnos 'user' → no hay nada que analizar y el debrief es una
       llamada cara. Ojo: la instrucción de apertura cuenta como 'user', así
       que por chip hacen falta 2 réplicas reales y en libre 3. */
    const userTurns = ses.messages.filter((m) => m.role === 'user').length;
    if (userTurns < 3) {
      useTalk.getState().cerrarSesion();
      return;
    }

    st.setBusy(true);
    toast('Preparando tu debrief...', 4000);
    try {
      const transcript = ses.messages
        .filter((m) => m.role !== 'system')
        .map((m) => (m.role === 'user' ? 'GUS: ' : 'COACH: ') + m.content.slice(0, 600))
        .join('\n');

      const mensajes: ChatMessage[] = [
        { role: 'system', content: DEBRIEF_SYSTEM },
        { role: 'user', content: debriefUser(transcript) },
      ];
      const { parsed } = await callJSON('creative', mensajes, 3200);
      const d = parsed as Debrief | null;
      if (!d) throw new Error('No pude analizar la sesión');

      /* rodeo_sessions sube; la racha NO. La asimetría es real: solo el debrief
         de ESCENA llama a updateStreak() (spec §8 trampa 18). Portada tal cual. */
      useTalk.getState().incSessions();

      (d.top_errors || []).forEach(
        (e) => e && e.fix && saveDNA({ type: 'error', quote: e.quote || '', fix: e.fix, why: e.why || '' }),
      );
      // Los upgrades del debrief son la munición de LEVEL UP: quedan pendientes.
      (d.upgrades || []).forEach(
        (u) => u && u.c1 && u.b2 && recordUpgrade({ b2: u.b2, c1: u.c1, note: u.note || '', dominado: false }),
      );

      useTalk.getState().setDebrief(d);

      // A1: extraer todas las frases del coach de la sesión y guardarlas
      if (nivelUsuario() === 'A1') {
        const area = areaUsuario();
        const allCoach = ses.messages
          .filter((m) => m.role === 'assistant')
          .map((m) => m.content)
          .join(' ');
        const frases = extraerFrasesDelTranscript(allCoach, area);
        if (frases.length) guardarLeccionesA1(frases);
        // Inferir temas del contenido del usuario
        const userText = ses.messages
          .filter((m) => m.role === 'user')
          .map((m) => m.content)
          .join(' ')
          .toLowerCase();
        const temasConocidos = ['programación', 'tecnología', 'música', 'deportes', 'comida', 'viajes', 'cine', 'gaming', 'diseño', 'marketing'];
        temasConocidos.filter((t) => userText.includes(t)).forEach(marcarTemaA1);
      }
    } catch (err) {
      // El fallo del debrief de CHARLA se lleva la sesión por delante (el de
      // ESCENA no: ofrece reintentar). Asimetría del legacy, portada tal cual —
      // CON una excepción nueva: sin crédito el fallo es PERSISTENTE (no un
      // blip), y cerrar la sesión destruiría la conversación entera de alguien
      // que solo quería terminarla. En ese caso la charla se queda abierta.
      toast('Error en el debrief: ' + (err as Error).message);
      if ((err as Error & { code?: string }).code !== 'sin_saldo_ia') useTalk.getState().cerrarSesion();
    } finally {
      useTalk.getState().setBusy(false);
    }
  }, []);

  /* ── Volver (#back-btn, L4336) ────────────────────────────────────────
     No dispara el debrief. Resetea busy a mano: si no, quedarías atrapado los
     segundos que tarda el stream. El turno pendiente se descarta solo. */
  const volver = useCallback(() => {
    useTalk.getState().setBusy(false);
    useTalk.getState().cerrarSesion();
  }, []);

  return { sendTurn, startSession, startLibre, startLibreConTexto, pedirIdea, ideaOn, terminar, volver };
}
