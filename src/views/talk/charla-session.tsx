import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Keyboard, Lightbulb, Play, RefreshCw, SendHorizontal, Volume2, VolumeX } from 'lucide-react';

import { MicButton } from '@/components/rodeo/mic-button';
import { PillButton } from '@/components/rodeo/pill-button';
import { crearReconocedor, soportaSTT, toggleTts, useTts, useUltimoHablado, replayUltimo, repetirUltimo, type Reconocedor } from '@/lib/speech';
import { toast } from '@/stores/toast';
import { useApp } from '@/stores/app';
import { useTalk } from '@/stores/talk';

import { BurbujaChat } from './bubbles';
import type { useCoachTurn } from './use-coach-turn';

/* Sesión de CHARLA — port de #talk-session (public/legacy.html:2391-2449):
   barra de sesión, scroll de burbujas, dock de voz y barra de texto.

   La barra va en DOS filas a propósito: en 390 px no caben ← + título +
   3 píldoras + Terminar + coste en una sola, y el viejo se salvaba porque no
   pintaba el coste. Fila 1 es la navegación (volver / dónde estoy / salir),
   fila 2 el audio y el contador. A 320 px sigue sin desbordar. */

type Motor = ReturnType<typeof useCoachTurn>;

export function CharlaSession({ motor }: { motor: Motor }) {
  const titulo = useTalk((s) => s.session?.title ?? '');
  const displayLog = useTalk((s) => s.displayLog);
  const busy = useTalk((s) => s.busy);
  const cost = useApp((s) => s.cost);
  const { ttsOn } = useTts();
  const ultimo = useUltimoHablado();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState('');
  const [teclado, setTeclado] = useState(false);

  /* Autoscroll: el viejo lo hacía a mano tras cada addBubble y en cada delta
     del stream. Aquí basta con reaccionar al displayLog — cada patch del
     stream crea una lista nueva, así que el efecto corre igual de seguido. */
  useEffect(() => {
    const c = scrollRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [displayLog]);

  /* ── Mic (initRecognition + #mic-btn, L4368-4409) ─────────────────────
     Instancia perezosa: se crea en el primer toque, no al abrir la sesión
     (pedir el micrófono antes de que lo pidas es de mala educación). */
  const recRef = useRef<Reconocedor | null>(null);
  const [grabando, setGrabando] = useState(false);

  // El envío ocurre en onEnd, no en onresult: continuous=false ⇒ el navegador
  // corta solo al detectar silencio, y ESE es el gesto de enviar.
  const enviar = useCallback(
    (t: string) => {
      const limpio = t.trim();
      if (!limpio) return;
      // El viejo deshabilitaba #send-btn mientras el turno volaba (L4112). Aquí
      // además se comprueba antes de vaciar el campo: sendTurn descarta el envío
      // por su guard de busy, y sin esto el texto se perdería al limpiarlo.
      if (useTalk.getState().busy) return;
      setTexto('');
      void motor.sendTurn(limpio);
    },
    [motor],
  );

  const toggleMic = useCallback(() => {
    if (!recRef.current) {
      if (!soportaSTT()) {
        toast('Tu navegador no soporta voz — usa Chrome');
        return;
      }
      recRef.current = crearReconocedor(
        'talk',
        (t) => setTexto(t), // transcripción en vivo dentro del input
        (final) => {
          setGrabando(false);
          if (final) enviar(final);
        },
      );
    }
    const r = recRef.current;
    if (!r) return;
    if (grabando) {
      r.stop(); // cierre limpio: el navegador entrega el final y dispara onEnd
      return;
    }
    r.start(); // corta la voz del coach y relee el idioma del chip
    setGrabando(true);
  }, [grabando, enviar]);

  // stopMic() del closeSession: al desmontar la sesión el reconocedor se aborta
  // Y desarma sus callbacks, para que un onend tardío no dispare un turno.
  useEffect(() => () => recRef.current?.abort(), []);

  const abrirTeclado = () => {
    const abrir = !teclado;
    setTeclado(abrir);
    if (abrir) requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sesión ── */}
      <div className="flex shrink-0 flex-col gap-2 pb-3">
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={motor.volver}
            aria-label="Volver a los escenarios"
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
            style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
          >
            <ArrowLeft size={17} strokeWidth={2} />
          </motion.button>
          <span
            className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
            style={{ color: 'var(--accent)' }}
          >
            {titulo}
          </span>
          <button
            type="button"
            onClick={() => void motor.terminar()}
            disabled={busy}
            className="inline-flex min-h-9 shrink-0 cursor-pointer items-center justify-center rounded-full border px-[13px] py-2 text-[0.75rem] font-semibold transition-colors disabled:cursor-default disabled:opacity-40"
            style={{ borderColor: 'var(--borde-medio)', background: 'transparent', color: 'var(--text-primary)' }}
          >
            Terminar
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Volumen: morph altavoz ⇄ altavoz tachado (snippet 1) */}
          <PillButton
            morph={{ on: ttsOn, iconOn: <Volume2 className="size-4" />, iconOff: <VolumeX className="size-4" /> }}
            active={ttsOn}
            onClick={() => toast('Voz del coach: ' + (toggleTts() ? 'ON' : 'OFF'), 1500)}
            aria-label="Activar o desactivar voz del coach"
            aria-pressed={ttsOn}
          />
          {/* Play: relee la última respuesta. Funciona con la voz apagada —
              sirve justo para probar cómo suena sin activarla en cada turno. */}
          <PillButton
            icon={<Play className="size-4" fill="currentColor" strokeWidth={0} />}
            disabled={!ultimo}
            onClick={replayUltimo}
            aria-label="Escuchar la última respuesta"
          />
          {/* Repetir: misma acción, con su gesto — el icono da media vuelta */}
          <PillButton spin icon={<RefreshCw className="size-4" />} disabled={!ultimo} onClick={repetirUltimo} aria-label="Repetir la última respuesta" />
          <span className="ml-auto shrink-0 font-mono text-[0.62rem] tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>
            ${cost.toFixed(4)}
          </span>
        </div>
      </div>

      {/* ── Burbujas ── */}
      <div
        ref={scrollRef}
        data-chat-scroll
        className="scroll-area flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2"
      >
        {displayLog.map((b) => (
          <BurbujaChat key={b.id} b={b} />
        ))}
      </div>

      {/* ── Dock de voz: el mic es el protagonista (voz-primero) ── */}
      <div className="grid shrink-0 grid-cols-[46px_1fr_46px] items-center gap-2 pt-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={abrirTeclado}
          aria-label="Escribir con teclado"
          aria-expanded={teclado}
          className="inline-flex size-[46px] cursor-pointer items-center justify-center rounded-full border transition-colors"
          style={
            teclado
              ? { borderColor: 'var(--accent)', background: 'var(--accent-dim)', color: 'var(--accent)' }
              : { borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }
          }
        >
          <Keyboard size={19} strokeWidth={1.5} />
        </motion.button>

        <div className="col-start-2">
          <MicButton ctx="talk" recording={grabando} onToggle={toggleMic} />
        </div>

        {/* Bombilla: una respuesta-ejemplo. No bloquea el turno del coach. */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => void motor.pedirIdea()}
          aria-label="Dame una idea de respuesta"
          className="inline-flex size-[46px] cursor-pointer items-center justify-center rounded-full border transition-colors"
          style={
            motor.ideaOn
              ? { borderColor: 'var(--card-lavender)', background: 'oklch(80% 0.10 290 / 0.18)', color: 'var(--text-primary)' }
              : { borderColor: 'oklch(80% 0.10 290 / 0.45)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }
          }
        >
          <Lightbulb size={19} strokeWidth={1.5} />
        </motion.button>
      </div>

      {/* ── Barra de texto: recogida por defecto (voz-primero) ── */}
      {teclado && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          className="flex shrink-0 items-center gap-2 overflow-hidden pt-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') enviar(texto);
            }}
            placeholder="Escribe en inglés..."
            autoComplete="off"
            aria-label="Mensaje en inglés"
            /* 16 px reales: por debajo, iOS hace zoom al enfocar el campo. */
            className="min-w-0 flex-1 rounded-full border px-[18px] py-3 text-[16px] outline-none focus-visible:border-[var(--accent)]"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--borde-sutil)', color: 'var(--text-primary)' }}
          />
          {/* El enviar solo existe cuando hay algo escrito (.has-text) */}
          {!!texto.trim() && (
            <motion.button
              type="button"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 600, damping: 25 }}
              onClick={() => enviar(texto)}
              disabled={busy}
              aria-label="Enviar mensaje"
              className="inline-flex size-[46px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 disabled:cursor-default disabled:opacity-40"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
            >
              <SendHorizontal size={18} strokeWidth={2} />
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  );
}
