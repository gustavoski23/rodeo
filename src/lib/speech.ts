/* VOZ — port literal de la capa de voz de public/legacy.html:
     · TTS:  pickVoice/speakSistema L4456-4521, VOCES L4524-4531,
             pedirTTS L4534-4547, speak L4549-4593, stopSpeaking L4595-4603,
             syncReplayButton + #again-btn/#replay-btn L4629-4650.
     · STT:  MIC_LANGS/micLang/micLangCode L2953-2965, wireMicToggle L2969-3001,
             initRecognition L4368-4409, wireMic (genérico) L6328-6366.

   Es un singleton de módulo, como en el viejo: hay UNA voz sonando y UN
   reconocedor por vista. Las vistas se suscriben con los hooks del final.  */

import { useSyncExternalStore } from 'react';

import { parseChunks } from './gloss';
import { store } from './storage';
import { toast } from '@/stores/toast';

/* ═══════════════════ Nota bilingüe para los system prompts ═══════════════ */

// Reparación por LLM (L3004): se añade al system de cada flujo que recibe el
// habla de Gus. VERBATIM — cambiarla cambia cómo el modelo lee el dictado.
export const NOTA_STT_BILINGUE =
  'Note: his message may come from voice dictation, and Gus is bilingual (Spanish/English) — he often mixes both languages mid-sentence, so words from either language can arrive mis-transcribed or garbled. Read his intent charitably: infer what he meant instead of taking an odd transcription literally, and never flag a likely mis-hearing as a mistake.';

/* ═══════════════════ TTS ═══════════════════ */

/* Voz seleccionable. Dos opciones por ahora. NO se persiste: Helena es
   SIEMPRE el punto de partida al cargar y Draco es un cambio por sesión, para
   que "predeterminada = Helena" se cumpla en cada visita y el botón no se
   quede pegado en Draco tras una prueba (L4523-4531). */
export const VOCES = {
  'aura-2-helena-en': 'Helena', // US, femenina, cálida
  'aura-2-draco-en': 'Draco', // UK, masculino, barítono
} as const;
export type VozId = keyof typeof VOCES;

let voz: VozId = 'aura-2-helena-en';
export function vozActual(): VozId {
  return voz;
}

let audioActual: AudioBufferSourceNode | null = null;
let speakToken = 0; // invalida reproducción en curso
let audioCtx: AudioContext | null = null;
let ultimo = ''; // ultimoHablado: lo que relee el botón repetir
let avisoTTSDado = false; // no repetir el toast de fallo en cada turno

let ttsOn = store.get<boolean>('rodeo_tts', true);

/* Reproducción por Web Audio API, no por <audio>: Brave bloquea el autoplay de
   HTMLMediaElement, pero un AudioContext se desbloquea con cualquier clic y
   queda desbloqueado toda la sesión. */
function ctxAudio(): AudioContext {
  if (!audioCtx) {
    const W = window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    audioCtx = new (W.AudioContext || W.webkitAudioContext!)();
  }
  return audioCtx;
}

// Cualquier clic desbloquea el contexto; repetirlo es gratis (L4488-4492).
if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    () => {
      const c = ctxAudio();
      if (c.state === 'suspended') c.resume().catch(() => {});
    },
    true,
  );
}

function pararAudio() {
  if (audioActual) {
    try {
      audioActual.stop();
    } catch {
      /* ya paró */
    }
    audioActual = null;
  }
}

/* ── Fallback: el motor del sistema (robótico pero instantáneo) ─────────── */

let voiceEN: SpeechSynthesisVoice | null = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices();
  voiceEN =
    voices.find((v) => v.lang === 'en-US' && /natural|google|premium/i.test(v.name)) ||
    voices.find((v) => v.lang === 'en-US') ||
    voices.find((v) => v.lang.startsWith('en')) ||
    null;
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

function speakSistema(text: string) {
  if (!('speechSynthesis' in window) || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voiceEN) u.voice = voiceEN;
  u.lang = 'en-US';
  u.rate = 1.0;
  speechSynthesis.speak(u);
}

// Por qué la voz cayó al motor del sistema. Se avisa una vez, no en cada turno.
function caerASistema(text: string, motivo: string, err?: unknown) {
  (window as unknown as { __vozMotor?: string }).__vozMotor = 'sistema';
  const detalle = err ? String((err as Error)?.message || err) : '';
  console.warn('[voz] fallback al sistema —', motivo, err || '');
  if (!avisoTTSDado) {
    avisoTTSDado = true;
    toast('Voz del sistema — ' + motivo + (detalle ? ': ' + detalle.slice(0, 120) : ''), 6000);
  }
  speakSistema(text);
}

// Pide el audio al proxy /api/tts (Deepgram). Devuelve un ArrayBuffer MP3.
// Exportada para el visor de transcript, que necesita el audio como blob (no
// reproducirlo al vuelo como speak()).
export async function pedirTTS(text: string, modelOverride?: VozId): Promise<ArrayBuffer> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const pass = store.get<string | null>('rodeo_pass', null);
  if (pass) headers['x-rodeo-pass'] = pass;
  const r = await fetch('/api/tts', {
    method: 'POST',
    headers,
    body: JSON.stringify({ text: String(text).slice(0, 2000), model: modelOverride || voz }),
  });
  if (!r.ok) {
    const d = (await r.json().catch(() => ({}))) as Record<string, string>;
    throw new Error(d.detail || d.error || 'HTTP ' + r.status);
  }
  return r.arrayBuffer();
}

/* speak(text, opts) — L4549.
   opts.voz        = el modelOverride del viejo (el episodio ilustrado pide una
                     voz por personaje sin tocar la voz global del coach).
   opts.trackReplay = false → no contamina el botón "repetir" del coach.

   NO hay cola: hay invalidación por token. Cada speak corta lo anterior
   (speakToken++) y una reproducción vieja que despierta con el token cambiado
   se descarta en silencio. Encolar cambiaría el comportamiento del viejo: dos
   respuestas seguidas sonarían una tras otra en vez de ganar la última. */
export async function speak(
  text: string,
  opts?: { voz?: VozId; trackReplay?: boolean },
): Promise<void> {
  // La voz habla SOLO el texto limpio: parseChunks descarta los marcadores
  // ⟦en||es⟧. Sin esto, Deepgram pronunciaba la traducción y los "||" dentro de
  // una voz en inglés. Idempotente sobre texto ya limpio.
  const limpio = parseChunks(text).clean;
  if (!limpio) return;
  if (!opts || opts.trackReplay !== false) setUltimo(String(limpio));

  stopSpeak(); // corta lo anterior e invalida su token
  const token = speakToken;

  let ab: ArrayBuffer;
  try {
    ab = await pedirTTS(limpio, opts?.voz);
  } catch (e) {
    if (token !== speakToken) return; // salió a otra vista mientras pedíamos Deepgram
    return caerASistema(limpio, 'falló la voz Deepgram', e);
  }
  if (token !== speakToken) return; // otra respuesta la reemplazó

  try {
    const ctx = ctxAudio();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        /* el navegador lo desbloquea con el próximo clic */
      }
    }
    // decodeAudioData decodifica el MP3 y lo remuestrea al ritmo del contexto.
    const buf = await ctx.decodeAudioData(ab);
    if (token !== speakToken) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    audioActual = src;
    (window as unknown as { __vozMotor?: string }).__vozMotor = 'deepgram';
    await new Promise<void>((res) => {
      src.onended = () => res();
      src.start();
    });
    if (audioActual === src) audioActual = null;
  } catch (e) {
    if (token === speakToken) caerASistema(limpio, 'no pude reproducir el audio', e);
  }
}

// stopSpeaking del viejo (L4595).
export function stopSpeak(): void {
  speakToken++; // cualquier reproducción en vuelo queda huérfana
  pararAudio();
  // El episodio ilustrado encapsula sus fuentes en su IIFE y expone este hook.
  const w = window as unknown as { pararAudioShadow?: () => void };
  if (w.pararAudioShadow) w.pararAudioShadow();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

/* ── ultimoHablado + repetir ────────────────────────────────────────────── */

const ultimoSubs = new Set<() => void>();
function setUltimo(v: string) {
  if (ultimo === v) return;
  ultimo = v;
  ultimoSubs.forEach((fn) => fn());
}
export function ultimoHablado(): string {
  return ultimo;
}

/* Registra el texto SIN reproducirlo. Con la voz apagada el viejo seguía
   haciendo `ultimoHablado = parseChunks(reply).clean` (L4231) para que el
   botón repetir tuviera algo que soltar si la enciendes después; speak() no
   sirve para eso porque además suena. Pasa por parseChunks: lo que se repite
   es el inglés, nunca los marcadores. */
export function registrarHablado(text: string): void {
  const limpio = parseChunks(text).clean;
  if (limpio) setUltimo(limpio);
}

/* #replay-btn (L4644): vuelve a leer la última respuesta del coach. Funciona
   aunque la voz esté apagada — sirve justo para probar cómo suena sin
   activarla en cada turno. */
export function replayUltimo(): void {
  if (!ultimo) {
    toast('Aún no hay nada que repetir', 1500);
    return;
  }
  void speak(ultimo);
}

/* #again-btn (L4637): misma acción que play, con su propio gesto (el icono
   gira media vuelta — eso lo hace el botón, aquí solo suena). */
export function repetirUltimo(): void {
  if (!ultimo) {
    toast('Aún no hay nada que repetir', 1500);
    return;
  }
  void speak(ultimo);
}

/* ── Mute (rodeo_tts) ──────────────────────────────────────────────────── */

const ttsSubs = new Set<() => void>();
export function ttsActivo(): boolean {
  return ttsOn;
}
export function setTtsOn(v: boolean): void {
  ttsOn = v;
  store.set('rodeo_tts', ttsOn);
  if (!ttsOn) stopSpeak();
  ttsSubs.forEach((fn) => fn());
}
export function toggleTts(): boolean {
  setTtsOn(!ttsOn);
  return ttsOn;
}

/* ── Voz Helena ⇄ Draco (L4656-4661) ───────────────────────────────────── */

const vozSubs = new Set<() => void>();
export function toggleVoz(): VozId {
  voz = voz === 'aura-2-helena-en' ? 'aura-2-draco-en' : 'aura-2-helena-en';
  vozSubs.forEach((fn) => fn());
  toast('Voz: ' + VOCES[voz], 1500);
  if (ultimo) void speak(ultimo); // se oye el cambio al instante
  return voz;
}

/* ═══════════════════ STT ═══════════════════
   Gus habla espanglish, pero SpeechRecognition escucha en UN idioma por toma.
   Cada contexto de mic recuerda su idioma (clave localStorage separada) y
   muestra un chip ES/EN pegado al botón. La instancia lee micLangCode(ctx)
   JUSTO antes de arrancar, así el toggle aplica en la siguiente toma sin
   recrear nada.                                                            */

export const MIC_LANGS = { es: 'es-419', en: 'en-US' } as const;
export type MicLang = keyof typeof MIC_LANGS;
export type MicCtx = 'talk' | 'rp' | 'story' | 'ladder' | 'drop';

const MIC_LANG_DEFAULTS: Record<MicCtx, MicLang> = {
  talk: 'es', // TALK: puede preguntar "cómo digo X" en español
  rp: 'es', // ROLEPLAY: puede salirse de personaje para preguntar
  story: 'en', // STORY: actúa en inglés dentro de la ficción
  ladder: 'en', // SUBE: produce su versión C1 en inglés
  drop: 'en', // DROP: responde la lectura en inglés
};

export function micLang(ctx: MicCtx): MicLang {
  const v = store.get<string | null>('rodeo_miclang_' + ctx, null);
  return v === 'es' || v === 'en' ? v : MIC_LANG_DEFAULTS[ctx] || 'en';
}
export function micLangCode(ctx: MicCtx): string {
  return MIC_LANGS[micLang(ctx)];
}

// Un set de suscriptores por contexto: cambiar el idioma de 'drop' repinta
// TODOS los chips de 'drop' (el DROP puede tener varias tarjetas abiertas).
const micSubs = new Map<MicCtx, Set<() => void>>();
function subsDe(ctx: MicCtx) {
  let s = micSubs.get(ctx);
  if (!s) {
    s = new Set();
    micSubs.set(ctx, s);
  }
  return s;
}
export function setMicLang(ctx: MicCtx, lang: MicLang): void {
  store.set('rodeo_miclang_' + ctx, lang);
  subsDe(ctx).forEach((fn) => fn());
}
export function toggleMicLang(ctx: MicCtx): MicLang {
  const next: MicLang = micLang(ctx) === 'es' ? 'en' : 'es';
  setMicLang(ctx, next);
  return next;
}

/* SpeechRecognition no está en lib.dom (solo sus eventos), y en Safari/Chrome
   viejos vive con prefijo. Tipos mínimos con nombre propio para no chocar. */
type ReconocedorNativo = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type CtorSR = new () => ReconocedorNativo;

export function soportaSTT(): boolean {
  const w = window as unknown as { SpeechRecognition?: CtorSR; webkitSpeechRecognition?: CtorSR };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export type Reconocedor = {
  /** Arranca una toma. Relee el idioma del chip y corta la voz del coach. */
  start(): void;
  /** Cierre limpio: el navegador entrega el final y dispara onEnd. */
  stop(): void;
  /** Corta y DESARMA los callbacks: un onend tardío no dispara sobre una vista muerta. */
  abort(): void;
  /** ¿Hay una toma viva? (el estado .recording del viejo). */
  activo(): boolean;
};

/* crearReconocedor(ctx, onResult, onEnd) — initRecognition (L4368) + wireMic
   (L6328) unificados: eran el mismo código con distinto destino.
     onResult(texto, esFinal) — lo que el viejo escribía en el input en vivo.
     onEnd(final)             — '' si no hubo texto. El envío ocurre AQUÍ, no en
                                onresult: continuous=false ⇒ el navegador corta
                                solo al detectar silencio y eso es "enviar".
   onEnd también se llama con '' desde onerror: en el viejo, onerror quitaba la
   clase .recording del botón, y ese es el único efecto que la vista necesita. */
export function crearReconocedor(
  ctx: MicCtx,
  onResult: (texto: string, esFinal: boolean) => void,
  onEnd: (final: string) => void,
): Reconocedor | null {
  const w = window as unknown as { SpeechRecognition?: CtorSR; webkitSpeechRecognition?: CtorSR };
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SR) return null;

  const r = new SR();
  let activo = false;
  let finalText = '';
  let vivo = true;

  r.lang = micLangCode(ctx);
  r.interimResults = true;
  r.continuous = false; // autostop: el navegador corta al detectar silencio

  r.onresult = (e) => {
    let final = '',
      interim = '';
    for (const res of e.results) res.isFinal ? (final += res[0].transcript) : (interim += res[0].transcript);
    onResult((final || interim).trim(), !!final);
    if (final) finalText = final.trim();
  };
  r.onend = () => {
    activo = false;
    const t = finalText;
    finalText = '';
    if (vivo) onEnd(t);
  };
  r.onerror = (e) => {
    activo = false;
    if (e.error === 'not-allowed') toast('Permite el micrófono en el navegador');
    else if (e.error === 'network')
      toast(
        'El dictado usa el servicio de voz de Google y este navegador lo bloquea (típico de Brave). Escribe o usa Chrome.',
        5000,
      );
    // 'aborted' y 'no-speech' se ignoran en silencio: son el final normal de
    // una toma cancelada o muda.
    else if (e.error !== 'aborted' && e.error !== 'no-speech') toast('Error de micrófono: ' + e.error);
    if (vivo) onEnd('');
  };

  // Mantiene viva la instancia sincronizada con el chip ES/EN sin recrearla.
  const desuscribir = (() => {
    const s = subsDe(ctx);
    const fn = () => {
      r.lang = micLangCode(ctx);
    };
    s.add(fn);
    return () => s.delete(fn);
  })();

  return {
    start() {
      if (activo) return;
      stopSpeak();
      finalText = '';
      r.lang = micLangCode(ctx); // idioma vigente al arrancar la toma
      try {
        r.start();
        activo = true;
      } catch {
        /* start() doble */
      }
    },
    stop() {
      try {
        r.stop();
      } catch {
        /* no había toma */
      }
    },
    abort() {
      vivo = false;
      desuscribir();
      finalText = '';
      try {
        r.abort();
      } catch {
        /* no había toma */
      }
      activo = false;
    },
    activo() {
      return activo;
    },
  };
}

/* ═══════════════════ Hooks de suscripción ═══════════════════ */

/* Las funciones de subscribe se crean UNA vez por set: useSyncExternalStore
   vuelve a suscribirse cada vez que cambia su identidad, y crearlas dentro del
   hook lo haría en cada render. */
function suscriptor(set: Set<() => void>) {
  return (fn: () => void) => {
    set.add(fn);
    return () => {
      set.delete(fn);
    };
  };
}
const subTts = suscriptor(ttsSubs);
const subUltimo = suscriptor(ultimoSubs);
const subVoz = suscriptor(vozSubs);
const subMic = new Map<MicCtx, (fn: () => void) => () => void>();
const leerMic = new Map<MicCtx, () => MicLang>();

/** Voz del coach ON/OFF (clave rodeo_tts). */
export function useTts(): { ttsOn: boolean; toggleTts: () => boolean } {
  const on = useSyncExternalStore(subTts, ttsActivo, ttsActivo);
  return { ttsOn: on, toggleTts };
}

/** Última respuesta hablada: '' deshabilita los botones play/repetir. */
export function useUltimoHablado(): string {
  return useSyncExternalStore(subUltimo, ultimoHablado, ultimoHablado);
}

/** Voz Deepgram activa (Helena/Draco). */
export function useVoz(): VozId {
  return useSyncExternalStore(subVoz, vozActual, vozActual);
}

/** Idioma de dictado de un contexto + su toggle (el chip ES/EN). */
export function useMicLang(ctx: MicCtx): [MicLang, () => MicLang] {
  if (!subMic.has(ctx)) {
    subMic.set(ctx, suscriptor(subsDe(ctx)));
    leerMic.set(ctx, () => micLang(ctx));
  }
  const leer = leerMic.get(ctx)!;
  const lang = useSyncExternalStore(subMic.get(ctx)!, leer, leer);
  return [lang, () => toggleMicLang(ctx)];
}
