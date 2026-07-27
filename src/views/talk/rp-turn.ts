/* EL MOTOR DE ESCENAS — port de generarEscenas (public/legacy.html:7226),
   scheduleRpGenRetry (L7204), rpSorprende (L7268), startRoleplay (L7303),
   rpTurn (L7373), closeRoleplay (L7470), rpDebrief (L7482) y
   rpGuardarDebrief/rpCerrarDebrief (L7560-7568).

   Módulo de funciones, no hook: en el viejo esto era código de módulo con sus
   flags (`rpBusy`, `rpGenBusy`, `rpDebriefBusy`, `rpGenRetryTimer`,
   `rpLastDebrief`) sobreviviendo a cualquier repintado. Un hook con refs
   perdería esos flags al desmontar el pane y un turno en vuelo se quedaría
   sin dueño; aquí sobreviven exactamente igual que en el legacy.

   Contra el turno de CHARLA (use-coach-turn.ts) hay TRES diferencias que la
   spec marca como deliberadas y que aquí se portan literales (§8 trampas 2 y 12):

   · IDENTIDAD, no truthiness. Todos los guards comparan `session === ses`. Si
     Gus sale a mitad de stream y abre otra escena, este turno viejo NO pinta
     en la nueva ni le mete un assistant en su historial.
   · El reintento PARSEA PRIMERO y solo reintenta `if (!parsed && finish ===
     'length')` — cubre a la vez respuesta vacía y JSON truncado, que es el caso
     común aquí. CHARLA solo cubre el vacío. No se unifican.
   · El texto NO se teclea: `renderReply` de una. Y el turno enciende el
     `state.busy` GLOBAL (CHARLA también) para que la generación de escenas no
     le pida otra cosa al modelo a la vez. */

import { callAPI, callJSON, callStream, extractPartialReply, parseJSON, type ChatMessage } from '@/lib/api';
import { saveDNA } from '@/lib/dna';
import { stripChunksLive, type Gloss } from '@/lib/gloss';
import { registrarHablado, speak, ttsActivo } from '@/lib/speech';
import { useApp } from '@/stores/app';
import { useEscenas, type RpAprendizaje, type RpSession } from '@/stores/escenas';
import { useLadder } from '@/stores/ladder';
import { useTalk } from '@/stores/talk';
import { toast } from '@/stores/toast';

import { tipPrimeraVez } from './first-tip';
import { crearPintor } from './stream-paint';
import { premiumGate } from './prompts';
import {
  GEN_SYSTEM,
  RP_CANONICO,
  RP_DEBRIEF_SYSTEM,
  RP_MAX_TOKENS,
  RP_MAX_TOKENS_RETRY,
  RP_OPENING,
  SORPRESA_SYSTEM,
  escenaValida,
  genUser,
  rpDebriefUser,
  rpErrMsg,
  rpSystemPrompt,
  sorpresaUser,
  type Escena,
} from './escenas-prompts';

/* Flags de módulo, como en el viejo (L7096-7100). `rpBusy` es la reentrancia de
   los TURNOS y `rpGenBusy` la de la GENERACIÓN: son flags aparte a propósito —
   armar cartas (creative, lento) no debe bloquear jugar una escena. */
let rpBusy = false;
let rpDebriefBusy = false;
let rpGenRetryTimer: ReturnType<typeof setInterval> | null = null;
let rpLastDebrief: RpAprendizaje[] = [];

type RespuestaRp = { reply?: string; glosses?: unknown; consejo?: unknown };

/* ── Portada ──────────────────────────────────────────────────────────── */

/** Títulos que el modelo no debe repetir (L7245): las cartas vivas + el clásico. */
function titulosAEvitar(): string {
  return useEscenas.getState().cards.map((c) => c.title).concat(RP_CANONICO.title).join(', ') || 'none';
}

/* Poller de 700 ms (L7204): otro módulo tiene el modelo tomado, así que las
   escenas cargan solas en cuanto se libere. Aborta si ya no aplica — salió de
   TALK, se abrió una escena, ya hay cartas, o 40 intentos (~28 s): un poller
   inmortal es peor que una portada vacía. */
function scheduleRpGenRetry(): void {
  if (rpGenRetryTimer) return;
  let tries = 0;
  rpGenRetryTimer = setInterval(() => {
    tries++;
    const e = useEscenas.getState();
    const homeVigente =
      useApp.getState().view === 'talk' && useTalk.getState().talkMode === 'escenas' && !e.session;
    if (!homeVigente || e.cards.length || tries > 40) {
      clearInterval(rpGenRetryTimer!);
      rpGenRetryTimer = null;
      return;
    }
    if (!useTalk.getState().busy && !e.genBusy) {
      clearInterval(rpGenRetryTimer!);
      rpGenRetryTimer = null;
      void generarEscenas();
    }
  }, 700);
}

/* generarEscenas(fromTap) — L7226. `fromTap` distingue el clic explícito
   ("otras escenas" / "cargar ya" / "reintentar") de la carga automática de la
   portada: un tap bloqueado avisa por toast, el arranque silencioso no. */
export async function generarEscenas(fromTap?: boolean): Promise<void> {
  const st = useEscenas.getState();
  if (st.genBusy) {
    if (fromTap) toast('Ya estoy armando tus escenas…', 1800);
    return;
  }
  if (useTalk.getState().busy) {
    // Otro módulo tiene el modelo: skeletons + "cargar ya" + poller, en vez de
    // dejar "Escenas frescas" vacía y muda.
    st.setCardsEstado({ tipo: 'espera' });
    scheduleRpGenRetry();
    if (fromTap) toast('Estoy terminando otra cosa — cargan solas en cuanto acabe', 2800);
    return;
  }

  st.setGenBusy(true);
  st.setCardsEstado({ tipo: 'cargando' });
  try {
    const { parsed } = await callJSON(
      'creative',
      [
        { role: 'system', content: GEN_SYSTEM },
        { role: 'user', content: genUser(titulosAEvitar()) },
      ],
      2600,
    );
    const valid = (Array.isArray(parsed) ? parsed : []).filter(escenaValida).slice(0, 3);
    if (!valid.length) throw new Error('No pude armar las escenas, dale otra vez');
    useEscenas.getState().setCards(valid);
    useEscenas.getState().setCardsEstado({ tipo: 'ok' });
  } catch (err) {
    useEscenas.getState().setCardsEstado({ tipo: 'error', msg: rpErrMsg(err) });
  } finally {
    useEscenas.getState().setGenBusy(false);
  }
}

/* rpSorprende — L7268. Una escena inesperada, y si sale se entra derecho. */
export async function rpSorprende(): Promise<void> {
  const st = useEscenas.getState();
  if (st.genBusy || useTalk.getState().busy) {
    toast('Espera a que termine lo que está corriendo', 2200);
    return;
  }
  st.setGenBusy(true);
  toast('Inventando una escena...', 3000);
  try {
    const { parsed } = await callJSON(
      'creative',
      [
        { role: 'system', content: SORPRESA_SYSTEM },
        { role: 'user', content: sorpresaUser(titulosAEvitar()) },
      ],
      1800,
    );
    // El modelo a veces devuelve el objeto suelto y a veces un array de uno.
    const bruto = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!escenaValida(bruto)) throw new Error('No salió — intenta de nuevo');
    useEscenas.getState().setGenBusy(false);
    /* Si mientras se generaba abrieron otra escena, NO la pisamos: la sorpresa
       se suma a la portada para que la encuentre al volver (§8 trampa 19). */
    if (useEscenas.getState().session) {
      const e = useEscenas.getState();
      e.setCards([bruto, ...e.cards].slice(0, 3));
      e.setCardsEstado({ tipo: 'ok' });
      toast('Tu escena sorpresa te espera en la portada', 3000);
    } else {
      startRoleplay(bruto);
    }
  } catch (err) {
    toast('Error: ' + rpErrMsg(err), 5000);
    useEscenas.getState().setGenBusy(false);
  }
}

/* ── Sesión ───────────────────────────────────────────────────────────── */

/* startRoleplay(sc) — L7303.

   DECISIÓN DE PORT (§8 trampa 33): en el legacy la carta canónica abría el
   EPISODIO ILUSTRADO (`window.openStoryImmersion('princess_001')`, módulo
   js/story-mode.js) y solo caía aquí si esa función no existía. El episodio no
   está portado, así que la app nueva toma explícitamente la opción (a) de la
   spec: la princesa entra por el flujo generativo normal, que es el fallback
   que el legacy ya soportaba y para el que el prompt ya está escrito. Cuando
   STORY se porte, esta es la línea que cambia. */
export function startRoleplay(sc: Escena): void {
  if (useTalk.getState().busy || useEscenas.getState().session) return;
  // Premium: cada escena cuenta contra la cuota diaria de 'roleplay'.
  if (!premiumGate('roleplay')) return;

  const ses = useEscenas.getState().abrirSesion(sc);
  ses.messages.push({ role: 'system', content: rpSystemPrompt(sc) });
  tipPrimeraVez('roleplay', 'Actúa tu rol — yo narro el resto');
  void rpTurn(null, true); // el narrador abre la escena
}

/* closeRoleplay — L7470 + el reset de #rp-back (L7583). El orden importa: la
   sesión se anula PRIMERO y solo después se sueltan los flags globales, para
   que el `finally` del turno huérfano —que compara identidad— ya no toque
   nada (§8 trampa 13). */
export function closeRoleplay(): void {
  useEscenas.getState().cerrarSesion();
  rpBusy = false;
  useTalk.getState().setBusy(false);
  useEscenas.getState().setInputOn(true);
}

/** rpTurn(userText, isOpening) — L7373. */
export async function rpTurn(userText: string | null, isOpening: boolean): Promise<void> {
  const st = useEscenas.getState();
  if (rpBusy || !st.session) {
    /* Una toma de mic en curso entrega su texto aunque el botón ya esté
       deshabilitado: se conserva devolviéndolo al campo, no se traga. */
    if (userText && st.session) st.devolverTexto(userText);
    return;
  }

  // La IDENTIDAD de la sesión. Todo el turno mide contra esta referencia.
  const ses: RpSession = st.session;
  const vive = () => useEscenas.getState().session === ses;

  rpBusy = true;
  useTalk.getState().setBusy(true); // bloquea la generación de escenas
  st.setInputOn(false);

  if (userText) {
    ses.messages.push({ role: 'user', content: userText });
    useEscenas.getState().add({ tipo: 'user', texto: userText });
  } else {
    ses.messages.push({ role: 'user', content: RP_OPENING });
  }

  // El lápiz, SIN contador de segundos: eso es exclusivo de CHARLA (§1.8).
  const typingId = useEscenas.getState().add({ tipo: 'espera' });

  let liveId: number | null = null;
  const pintor = crearPintor((texto) => {
    if (liveId !== null) useEscenas.getState().patchNarr(liveId, { texto });
  });

  try {
    let content: string, finish: string | null;
    try {
      ({ content, finish } = await callStream('chat', ses.messages, RP_MAX_TOKENS, (acc) => {
        if (!vive()) return; // salió o abrió otra escena: no pintar nada
        const partial = extractPartialReply(acc);
        if (!partial) return; // el modelo aún razona: el lápiz sigue girando
        if (liveId === null) {
          useEscenas.getState().remove(typingId);
          liveId = useEscenas.getState().add({ tipo: 'narr', texto: '', glosses: null, final: false });
        }
        pintor.pintar(stripChunksLive(partial));
      }));
    } catch {
      // Stream no disponible (proxy que bufferea, red rara): ruta clásica, sin
      // romperle la escena a nadie.
      pintor.cancelar();
      if (liveId !== null) {
        useEscenas.getState().remove(liveId);
        liveId = null;
      }
      ({ content, finish } = await callAPI('chat', ses.messages, RP_MAX_TOKENS));
    }

    if (!vive()) return;

    /* Reintento con techo alto. Aquí se PARSEA PRIMERO: el caso común no es
       content vacío sino JSON truncado con finish 'length'. Distinto a CHARLA
       a propósito (§8 trampa 2). */
    let parsed = parseJSON(content) as RespuestaRp | null;
    if (!parsed && finish === 'length') {
      pintor.cancelar();
      if (liveId !== null) {
        useEscenas.getState().remove(liveId);
        liveId = null;
      }
      ({ content, finish } = await callAPI('chat', ses.messages, RP_MAX_TOKENS_RETRY));
      if (!vive()) return;
      parsed = parseJSON(content) as RespuestaRp | null;
    }

    let reply: string, glosses: Gloss[], consejo: string;
    if (parsed && parsed.reply) {
      reply = String(parsed.reply);
      glosses = Array.isArray(parsed.glosses) ? (parsed.glosses as Gloss[]) : [];
      consejo = typeof parsed.consejo === 'string' ? parsed.consejo : '';
      ses.messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
    } else if (finish === 'stop' && content && !content.trim().startsWith('{')) {
      // Texto plano legítimo: se pushea el content CRUDO, no un stringify.
      reply = content;
      glosses = [];
      consejo = '';
      ses.messages.push({ role: 'assistant', content });
    } else {
      throw new Error(isOpening ? 'No pude abrir la escena — reintenta' : 'El narrador se enredó — repite tu línea');
    }

    // Swap a fase 2. Sin máquina de escribir: la escena se lee de una.
    pintor.cancelar();
    useEscenas.getState().remove(typingId);
    if (liveId === null) {
      liveId = useEscenas.getState().add({ tipo: 'narr', texto: reply, glosses, final: true });
    } else {
      useEscenas.getState().patchNarr(liveId, { texto: reply, glosses, final: true });
    }
    if (consejo && consejo.trim()) useEscenas.getState().add({ tipo: 'consejo', texto: consejo });

    useEscenas.getState().setReplayOn(true);
    /* La voz arranca en paralelo al pintado. Con la voz apagada se registra
       igual, para que "repetir" tenga algo si la enciendes después. */
    if (ttsActivo()) void speak(reply);
    else registrarHablado(reply);
  } catch (err) {
    pintor.cancelar();
    useEscenas.getState().remove(typingId);
    if (liveId !== null) useEscenas.getState().remove(liveId); // no dejar media escena
    if (vive()) {
      toast('Error: ' + rpErrMsg(err), 5000);
      ses.messages.pop(); // no dejar el turno colgado
      if (userText) useEscenas.getState().devolverTexto(userText); // su línea no se pierde
    }
  } finally {
    /* Solo se toca el estado global si esta sesión SIGUE siendo la activa: el
       finally de un turno huérfano no debe soltarle los flags a la nueva. */
    if (vive()) {
      rpBusy = false;
      useTalk.getState().setBusy(false);
      useEscenas.getState().setInputOn(true);
    }
  }
}

/* ── Cierre con debrief "cómo te fue" (rpDebrief, L7482) ──────────────── */

export async function rpDebrief(): Promise<void> {
  const st = useEscenas.getState();
  if (!st.session || rpDebriefBusy || useTalk.getState().busy) return;
  const ses = st.session;
  const vive = () => useEscenas.getState().session === ses;

  /* La instrucción de apertura cuenta como turno 'user', así que esto exige
     ≥1 réplica real. Sin ella no hay nada que analizar y el debrief es caro. */
  const turns = ses.messages.filter((m) => m.role === 'user').length;
  if (turns < 2) {
    closeRoleplay();
    return;
  }

  rpDebriefBusy = true;
  st.setInputOn(false);
  st.setEndBusy(true);
  // Indicador PERSISTENTE, no un toast de 4 s para una espera de 15-25 s.
  const cerrandoId = st.add({ tipo: 'espera', nota: 'cerrando la escena…' });

  try {
    /* Transcript: preservamos el FINAL (donde está el clímax). El backend
       recorta cada mensaje a 8000 chars y conserva ~40; con 30 turnos juntos
       se perderían justo los últimos. Últimos 14 y truncado por seguridad. */
    const clean = ses.messages
      .filter((m) => m.role !== 'system')
      .slice(-14)
      .map((m) => (m.role === 'user' ? 'GUS: ' : 'ESCENA: ') + m.content.slice(0, 600))
      .join('\n');
    const transcript = clean.length > 7000 ? '…\n' + clean.slice(-7000) : clean;

    const mensajes: ChatMessage[] = [
      { role: 'system', content: RP_DEBRIEF_SYSTEM },
      { role: 'user', content: rpDebriefUser(transcript) },
    ];
    const { parsed } = await callJSON('creative', mensajes, 2600);
    const d = parsed as { aprendizajes?: RpAprendizaje[]; closing?: string } | null;

    if (!vive()) {
      useEscenas.getState().remove(cerrandoId); // salió a mitad
      return;
    }
    if (!d) throw new Error('no pude analizar la escena');
    useEscenas.getState().remove(cerrandoId);

    const items = (Array.isArray(d.aprendizajes) ? d.aprendizajes : []).filter((x) => x && x.en);
    rpLastDebrief = items;

    /* Contadores: ROLEPLAY también es una sesión. Aquí SÍ se toca la racha —
       el debrief de CHARLA no lo hace. La asimetría es real (§8 trampa 18). */
    useTalk.getState().incSessions();
    useLadder.getState().updateStreak();

    useEscenas.getState().setHoja({ tipo: 'ok', items, closing: d.closing || '' });
  } catch (err) {
    useEscenas.getState().remove(cerrandoId);
    /* Fallar el cierre NO destruye la escena (el de CHARLA sí se la lleva):
       se ofrece reintentar o salir explícito. */
    if (vive()) useEscenas.getState().setHoja({ tipo: 'error', msg: rpErrMsg(err) });
  } finally {
    rpDebriefBusy = false;
    useEscenas.getState().setEndBusy(false);
    if (vive()) useEscenas.getState().setInputOn(true);
  }
}

/** rpGuardarDebrief (L7560): los aprendizajes se van al DNA como slang. */
export function rpGuardarDebrief(): void {
  const items = rpLastDebrief || [];
  const n = items.length;
  items.forEach((it) => saveDNA({ type: 'slang', term: it.en, meaning: it.es || '', example: '' }));
  rpLastDebrief = [];
  useEscenas.getState().setHoja(null);
  closeRoleplay();
  if (n) toast(`${n} ${n === 1 ? 'frase guardada' : 'frases guardadas'} en tu DNA`);
}

/** rpCerrarDebrief (L7568): "Ahora no" / "LISTO" — cierra hoja y escena. */
export function rpCerrarDebrief(): void {
  rpLastDebrief = [];
  useEscenas.getState().setHoja(null);
  closeRoleplay();
}

/** "REINTENTAR CIERRE" de la hoja de fallo (L7550): cierra y vuelve a pedirlo. */
export function rpReintentarCierre(): void {
  useEscenas.getState().setHoja(null);
  setTimeout(() => void rpDebrief(), 100);
}

/** "Salir sin análisis" (L7551). */
export function rpSalirSinAnalisis(): void {
  useEscenas.getState().setHoja(null);
  closeRoleplay();
}
