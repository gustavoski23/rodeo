import { useCallback, useRef, useState } from 'react';

import { callAPI, callJSON, callStream, extractPartialReply, parseJSON, type ChatMessage } from '@/lib/api';
import { recordUpgrade, saveDNA } from '@/lib/dna';
import { stripChunksLive, type Gloss } from '@/lib/gloss';
import { registrarHablado, speak, ttsActivo } from '@/lib/speech';
import { toast } from '@/stores/toast';
import { guardarOpener, leerOpeners, useTalk, type Debrief, type TalkSession } from '@/stores/talk';

import { tipPrimeraVez } from './first-tip';
import {
  DEBRIEF_SYSTEM,
  IDEA_SYSTEM,
  SCENARIOS,
  TALK_MAX_TOKENS,
  TALK_MAX_TOKENS_RETRY,
  TALK_OPENING,
  buildSituation,
  debriefUser,
  elegirRompehielos,
  ideaUser,
  nombreUsuario,
  premiumGate,
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

   · No hay máquina de escribir. El viejo tecleaba el reply limpio pieza a pieza
     y AL TERMINAR cambiaba el innerHTML por la versión glosada; con streaming
     eso significaba escribir dos veces el mismo texto. Aquí la fase 1 es el
     stream (texto plano, throttled a un frame) y la fase 2 es un swap atómico
     a <GlossText>: el subrayado sigue "apareciendo como remate", que era el
     efecto buscado, sin re-teclear lo que ya se leyó. */

/* Throttle del stream a un frame: callStream entrega el acumulado en cada
   chunk (decenas por segundo) y cada patch es un render de la lista entera.
   Con rAF se pinta como mucho una vez por frame, que es lo máximo que el ojo
   puede ver. */
function crearPintor(patch: (texto: string) => void) {
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
    // Se llama antes de borrar la burbuja o de hacer el swap final: si quedara
    // un frame en vuelo, repintaría el texto de la fase 1 encima de la fase 2.
    cancelar() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      pendiente = null;
    },
  };
}

type RespuestaCoach = { reply?: string; corrections?: unknown; glosses?: unknown };
type Correccion = { quote?: string; fix?: string; why?: string };

export function useCoachTurn() {
  // La bombilla tiene su propio flag: puedes pedir una idea mientras el coach
  // responde (L4425). Nunca toca state.busy.
  const ideaBusyRef = useRef(false);
  const [ideaOn, setIdeaOn] = useState(false);

  /* ── El turno (sendTurn, L4109) ───────────────────────────────────────── */
  const sendTurn = useCallback(async (userText: string | null) => {
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
      } catch {
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

      // FASE 2: swap atómico. Se cancela el pintor primero para que un frame
      // rezagado del stream no pise el reply crudo que necesita <GlossText>.
      pintor.cancelar();
      useTalk.getState().removeBubble(typingId);
      if (liveId === null) {
        liveId = useTalk.getState().addBubble({ tipo: 'coach', texto: reply, glosses, final: true });
      } else {
        useTalk.getState().patchCoach(liveId, { texto: reply, glosses, final: true });
      }

      // Y recién entonces caen las correcciones, para no pisar la lectura.
      corrections.forEach((c) => {
        if (!c || !c.fix) return;
        useTalk.getState().addBubble({
          tipo: 'correccion',
          quote: c.quote || '',
          fix: c.fix,
          why: c.why || '',
        });
        saveDNA({ type: 'error', quote: c.quote || '', fix: c.fix, why: c.why || '' });
      });

      // Memoria anti-repetición: las últimas 8 aperturas vuelven al prompt de
      // las siguientes sesiones como "no abras así".
      if (ses.isOpening) {
        ses.isOpening = false;
        guardarOpener(reply);
      }

      /* La voz arranca EN PARALELO al pintado: leer y oír a la vez es la
         gracia. Con la voz apagada se registra igual, para que el botón
         repetir tenga algo si la enciendes después. */
      if (ttsActivo()) void speak(reply);
      else registrarHablado(reply);
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
  }, []);

  /* ── Arranque por chip (startSession, L3890) ──────────────────────────── */
  const startSession = useCallback(
    (key: ScenarioKey) => {
      // Premium: cada charla nueva cuenta contra la cuota diaria.
      if (!premiumGate('talk')) return;
      const sc = SCENARIOS[key];
      const sit = buildSituation();
      useTalk.getState().abrirSesion({
        scenario: key,
        title: sc.title,
        situation: sit,
        messages: [{ role: 'system', content: talkSystemPrompt(sc.prompt, sit, leerOpeners()) }],
      });
      tipPrimeraVez('talk', 'Toca el mic y habla — te corrijo');
      void sendTurn(null); // el coach abre (esto SÍ gasta una llamada)
    },
    [sendTurn],
  );

  /* ── Dibujo libre (startLibre, L3975) ─────────────────────────────────
     El rompehielos YA es la apertura del coach: se siembra como turno
     'assistant' y se pinta directo, sin gastar una llamada a la API. */
  const startLibre = useCallback((iceVisible?: string) => {
    if (useTalk.getState().busy) return;
    if (!premiumGate('talk')) return;

    let ice = (iceVisible || '').trim() || elegirRompehielos();
    // El coach abre saludando por tu nombre — pequeño, pero mata el "Hello
    // user". Solo baja la mayúscula si la palabra es normal (no siglas "AI …").
    const nom = nombreUsuario();
    if (nom) {
      const low = /^[A-Z][a-z]/.test(ice) ? ice.charAt(0).toLowerCase() + ice.slice(1) : ice;
      ice = `Hey ${nom} — ${low}`;
    }

    const sit = buildSituation();
    useTalk.getState().abrirSesion(
      {
        scenario: 'free',
        title: 'Dibujo libre',
        situation: sit,
        messages: [
          { role: 'system', content: talkSystemPrompt(SCENARIOS.free.prompt, sit, leerOpeners()) },
          { role: 'assistant', content: JSON.stringify({ reply: ice, corrections: [], glosses: [] }) },
        ],
      },
      // La apertura ya pintada: sin lápiz, sin stream, directa a fase 2.
      [{ tipo: 'coach', texto: ice, glosses: [], final: true }],
    );
    tipPrimeraVez('talk', 'Toca el mic y habla — te corrijo');
    if (ttsActivo()) void speak(ice);
    else registrarHablado(ice);
  }, []);

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
    } catch (err) {
      // El fallo del debrief de CHARLA se lleva la sesión por delante (el de
      // ESCENA no: ofrece reintentar). Asimetría del legacy, portada tal cual.
      toast('Error en el debrief: ' + (err as Error).message);
      useTalk.getState().cerrarSesion();
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

  return { sendTurn, startSession, startLibre, pedirIdea, ideaOn, terminar, volver };
}
