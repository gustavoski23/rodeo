import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, RefreshCw, SendHorizontal, Volume2, VolumeX } from 'lucide-react';

import { MicButton } from '@/components/rodeo/mic-button';
import { PillButton } from '@/components/rodeo/pill-button';
import {
  crearReconocedor,
  repetirUltimo,
  replayUltimo,
  soportaSTT,
  toggleTts,
  useTts,
  type Reconocedor,
} from '@/lib/speech';
import { useApp } from '@/stores/app';
import { useEscenas } from '@/stores/escenas';
import { toast } from '@/stores/toast';

import { RpFila } from './rp-bubbles';
import { closeRoleplay, rpDebrief, rpTurn } from './rp-turn';

/* Sesión de ESCENA — port de #roleplay-session (public/legacy.html:2484-2520)
   y de su cableado (L7570-7594).

   Es la hermana de charla-session: misma barra en dos filas (a 390 px no caben
   ← + título + tres píldoras + Terminar + coste en una sola), mismas píldoras
   de audio, mismo mic. Dos diferencias reales del viejo, portadas:

   · El dock SIEMPRE está desplegado. Aquí no hay voz-primero: escribir tu
     línea es tan legítimo como decirla, y el teclado no se esconde detrás de
     un botón.
   · No hay bombilla. La ayuda en escena es el CONSEJO del narrador, que llega
     dentro del turno; pedir una respuesta-ejemplo rompería la ficción. */

export function EscenasSession() {
  const sc = useEscenas((s) => s.session?.scenario);
  const log = useEscenas((s) => s.log);
  const inputOn = useEscenas((s) => s.inputOn);
  const replayOn = useEscenas((s) => s.replayOn);
  const endBusy = useEscenas((s) => s.endBusy);
  const devolver = useEscenas((s) => s.devolver);
  const cost = useApp((s) => s.cost);
  const { ttsOn } = useTts();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState('');
  const [grabando, setGrabando] = useState(false);

  // Autoscroll: cada patch del stream crea una lista nueva, así que este
  // efecto corre tan seguido como el scrollTop a mano del viejo.
  useEffect(() => {
    const c = scrollRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [log]);

  /* Una línea que el motor DEVUELVE (mic que entregó tarde, o turno que falló):
     se recupera en el campo, y solo si está vacío — no pisar lo que ya escribió
     mientras tanto. Es el `if (i && !i.value) i.value = userText` del viejo. */
  useEffect(() => {
    if (!devolver) return;
    setTexto((actual) => (actual.trim() ? actual : devolver.texto));
  }, [devolver]);

  const enviar = useCallback((t: string) => {
    const limpio = t.trim();
    if (!limpio) return;
    setTexto('');
    void rpTurn(limpio, false);
  }, []);

  /* ── Mic (wireMic sobre #rp-mic, L7593) ──────────────────────────────
     Instancia perezosa y contexto 'rp': el chip ES/EN de esta pantalla tiene
     su propia clave (rodeo_miclang_rp), separada de la de CHARLA. */
  const recRef = useRef<Reconocedor | null>(null);
  const toggleMic = useCallback(() => {
    if (!recRef.current) {
      if (!soportaSTT()) {
        toast('Tu navegador no soporta voz — usa Chrome');
        return;
      }
      recRef.current = crearReconocedor(
        'rp',
        (t) => setTexto(t), // transcripción en vivo dentro del input
        (final) => {
          setGrabando(false);
          // El envío ocurre AQUÍ (continuous=false ⇒ el navegador corta al
          // detectar silencio). Si el turno está en vuelo, rpTurn devuelve la
          // línea al campo en vez de tragársela.
          if (final) enviar(final);
        },
      );
    }
    const r = recRef.current;
    if (!r) return;
    if (grabando) {
      r.stop();
      return;
    }
    r.start(); // corta la voz del narrador y relee el idioma del chip
    setGrabando(true);
  }, [grabando, enviar]);

  // Al desmontar la escena el reconocedor se aborta Y desarma sus callbacks:
  // un onend tardío no debe disparar un turno sobre una sesión muerta.
  useEffect(() => () => recRef.current?.abort(), []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sesión ── */}
      <div className="flex shrink-0 flex-col gap-2 pb-3">
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={closeRoleplay}
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
            {sc?.title ?? ''}
          </span>
          <button
            type="button"
            onClick={() => void rpDebrief()}
            disabled={endBusy}
            className="inline-flex min-h-9 shrink-0 cursor-pointer items-center justify-center rounded-full border px-[13px] py-2 text-[0.75rem] font-semibold transition-colors disabled:cursor-default disabled:opacity-40"
            style={{ borderColor: 'var(--borde-medio)', background: 'transparent', color: 'var(--text-primary)' }}
          >
            Terminar
          </button>
        </div>

        <div className="flex items-center gap-2">
          <PillButton
            morph={{ on: ttsOn, iconOn: <Volume2 className="size-4" />, iconOff: <VolumeX className="size-4" /> }}
            active={ttsOn}
            onClick={() => toast('Voz: ' + (toggleTts() ? 'ON' : 'OFF'), 1500)}
            aria-label="Activar o desactivar voz"
            aria-pressed={ttsOn}
          />
          <PillButton
            icon={<Play className="size-4" fill="currentColor" strokeWidth={0} />}
            disabled={!replayOn}
            onClick={replayUltimo}
            aria-label="Escuchar la última línea"
          />
          {/* #rp-again existía en el HTML del viejo pero nunca tuvo handler
              (spec §8 trampa 34): se cablea a repetir, como su gemelo de
              CHARLA. Un botón muerto en pantalla es peor que uno vivo. */}
          <PillButton
            spin
            icon={<RefreshCw className="size-4" />}
            disabled={!replayOn}
            onClick={repetirUltimo}
            aria-label="Repetir la última línea"
          />
          <span
            className="ml-auto shrink-0 font-mono text-[0.62rem] tracking-[0.06em]"
            style={{ color: 'var(--text-muted)' }}
          >
            ${cost.toFixed(4)}
          </span>
        </div>
      </div>

      {/* ── Escena ── */}
      <div
        ref={scrollRef}
        data-rp-scroll
        className="scroll-area flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2"
      >
        {log.map((b) => (
          <RpFila key={b.id} b={b} />
        ))}
      </div>

      {/* ── Dock: siempre visible. Deshabilitar DE VERDAD mientras el narrador
              vuela — bajar la opacidad no impide el clic (§8 trampa 14). ── */}
      <div className="flex shrink-0 items-center gap-2 pt-3">
        <MicButton
          ctx="rp"
          recording={grabando}
          onToggle={toggleMic}
          size={46}
          variant="plain"
          showLabel={false}
          disabled={!inputOn}
        />
        <input
          ref={inputRef}
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') enviar(texto);
          }}
          disabled={!inputOn}
          placeholder="Tu línea en inglés o toca el mic..."
          autoComplete="off"
          aria-label="Tu línea en inglés"
          /* 16 px reales: por debajo, iOS hace zoom al enfocar el campo. */
          className="min-w-0 flex-1 rounded-full border px-[18px] py-3 text-[16px] outline-none focus-visible:border-[var(--accent)] disabled:opacity-50"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--borde-sutil)', color: 'var(--text-primary)' }}
        />
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => enviar(texto)}
          disabled={!inputOn}
          aria-label="Enviar línea"
          className="inline-flex size-[46px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 disabled:cursor-default disabled:opacity-40"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          <SendHorizontal size={18} strokeWidth={2} />
        </motion.button>
      </div>
    </div>
  );
}
