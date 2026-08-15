import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Pause, Play, RefreshCw, SendHorizontal, Volume2, VolumeX } from 'lucide-react';

import { MicButton } from '@/components/rodeo/mic-button';
import { IconMorph } from '@/components/rodeo/pill-button';
import { OndaDictado, useDictado } from '@/components/rodeo/onda-dictado';
import { Card } from '@/components/ui/card';
import { GlassButton } from '@/components/ui/sign-up';
import { cn } from '@/lib/utils';
import { playPausa, repetirUltimo, toggleTts, useTts, useVozEstado } from '@/lib/speech';
import { useEscenas } from '@/stores/escenas';
import { toast } from '@/stores/toast';

import { RpFila } from './rp-bubbles';
import { closeRoleplay, rpDebrief, rpTurn } from './rp-turn';

/* Sesión de ESCENA — port de #roleplay-session (public/legacy.html:2484-2520)
   y de su cableado (L7570-7594).

   Es la hermana de charla-session: misma barra en dos filas (a 390 px no caben
   ← + tres mandos + Terminar en una sola), MISMOS mandos de vidrio del login
   (regla 7 del contrato: fuera el título mono verde y el contador $0.0000;
   altavoz/play/repetir y Terminar en GlassButton), mismo mic. Dos diferencias
   reales del viejo, portadas:

   · El dock SIEMPRE está desplegado. Aquí no hay voz-primero: escribir tu
     línea es tan legítimo como decirla, y el teclado no se esconde detrás de
     un botón.
   · No hay bombilla. La ayuda en escena es el CONSEJO del narrador, que llega
     dentro del turno; pedir una respuesta-ejemplo rompería la ficción.

   Del patrón canónico se toma SOLO el chasis: la COLUMNA de 640 px compartida
   por barra, tarjeta y dock, y el log dentro de una Card con su scroller
   interno sin barra a la vista. El dock de voz NO migra a ConversationBar —
   el rediseño profundo de ESCENAS es otra entrega; MicButton, campo y enviar
   se quedan exactamente como estaban. */

/* Las dos constantes del patrón, redeclaradas aquí (convención del repo). */
const COLUMNA = 'mx-auto w-full max-w-[640px]';
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/* ── UN solo disparo por toque en los botones de vidrio ────────────────────
   Gemelo del de charla-session.tsx (misma causa, mismo remedio): GlassButton
   (sign-up.tsx, INTOCABLE) envuelve el <button> en un <div> con un onClick de
   "click fix" que reenvía el evento al botón cuando no vino de él. Como el
   toque real cae siempre en el <span> interior o en el icono, ese evento
   burbujea al botón —el handler corre— y sigue hasta el div, que lo vuelve a
   disparar: DOS ejecuciones por toque (la voz se apagaría y encendería en el
   mismo toque, Terminar cerraría la escena dos veces). Cortamos la propagación
   en el propio botón; el toque que cae en el margen del envoltorio sigue
   funcionando. No toca sign-up.tsx. */
const unSoloClick =
  (fn: () => void) =>
  (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    fn();
  };

export function EscenasSession() {
  const log = useEscenas((s) => s.log);
  const inputOn = useEscenas((s) => s.inputOn);
  const replayOn = useEscenas((s) => s.replayOn);
  const endBusy = useEscenas((s) => s.endBusy);
  const devolver = useEscenas((s) => s.devolver);
  const { ttsOn } = useTts();
  /* Play ⇄ pause, gemelo del de charla-session (pedido de Gus, 2026-08-04). */
  const vozEstado = useVozEstado();
  const hablando = vozEstado === 'hablando';

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState('');
  /* Media vuelta del icono de "repetir" en cada toque (el gesto que traía el
     `spin` de PillButton), ahora que el mando es de vidrio. */
  const [girado, setGirado] = useState(false);

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
  /* Mic Deepgram con onda: el transcript cae al campo y se envía a mano (la
     lección de producción — jamás auto-enviar lo que entendió el STT). */
  const dictado = useDictado((t) => {
    setTexto(t);
    requestAnimationFrame(() => inputRef.current?.focus());
  });
  const grabando = dictado.grabando;

  return (
    /* `vidrio-tema` (aurora.css) declara las crudas --background/--foreground
       que consume el CSS del vidrio; el ancestro de TALK ya la trae y GlassStyles
       se monta allí una sola vez — repetir la clase aquí es inocuo (son dos
       variables) y deja la sesión sin depender de que nadie la mantenga arriba. */
    <div className="vidrio-tema flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sesión ── */}
      <div className={cn(COLUMNA, 'flex shrink-0 flex-col gap-2 pb-3')}>
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
          {/* REGLA 7 — el título mono en var(--accent) («el verde de
              producción») se va, igual que en charla-session. En su hueco, un
              espaciador: el ← sigue pegado a la izquierda y Terminar a la
              derecha, sin que la fila se colapse al centro. */}
          <span className="min-w-0 flex-1" />
          <GlassButton
            type="button"
            size="sm"
            onClick={unSoloClick(() => void rpDebrief())}
            disabled={endBusy}
            className={cn('shrink-0', endBusy && 'pointer-events-none opacity-40')}
            contentClassName="text-[0.75rem] font-semibold tracking-normal! whitespace-nowrap"
          >
            Terminar
          </GlassButton>
        </div>

        {/* ── Mandos de audio, en el vidrio del login (regla 7) ───────────────
            Mismos iconos, mismos aria-labels y mismas acciones que las píldoras
            que había aquí; lo que cambia es el material, para que las dos
            sesiones de TALK se vean iguales. El vidrio NO se tiñe al activarse:
            el estado ON se lee en la tinta del icono —var(--text-primary)
            encendido vs var(--text-muted) apagado— y en aria-pressed.

            El `!` de las clases de color es obligatorio: .glass-button-text
            fija `color` desde el <style> de GlassStyles, que se inyecta DESPUÉS
            de la hoja de Tailwind y ganaría por orden.

            Deshabilitado: además del atributo, el envoltorio se apaga a
            opacidad 40 y deja de recibir puntero — el vidrio no tiene estado
            :disabled propio. */}
        <div className="flex items-center gap-2">
          <GlassButton
            type="button"
            size="icon"
            onClick={unSoloClick(() => toast('Voz: ' + (toggleTts() ? 'ON' : 'OFF'), 1500))}
            aria-label="Activar o desactivar voz"
            aria-pressed={ttsOn}
            contentClassName={ttsOn ? 'text-[var(--text-primary)]!' : 'text-[var(--text-muted)]!'}
          >
            <IconMorph on={ttsOn} iconOn={<Volume2 className="size-4" />} iconOff={<VolumeX className="size-4" />} />
          </GlassButton>
          <GlassButton
            type="button"
            size="icon"
            disabled={!replayOn}
            onClick={unSoloClick(playPausa)}
            aria-label={
              hablando ? 'Pausar la voz' : vozEstado === 'pausada' ? 'Reanudar la voz' : 'Escuchar la última línea'
            }
            className={cn(!replayOn && 'pointer-events-none opacity-40')}
            contentClassName="text-[var(--text-primary)]!"
          >
            <IconMorph
              on={hablando}
              iconOn={<Pause className="size-4" fill="currentColor" strokeWidth={0} />}
              iconOff={<Play className="size-4" fill="currentColor" strokeWidth={0} />}
            />
          </GlassButton>
          {/* #rp-again existía en el HTML del viejo pero nunca tuvo handler
              (spec §8 trampa 34): se cablea a repetir, como su gemelo de
              CHARLA. Un botón muerto en pantalla es peor que uno vivo. */}
          <GlassButton
            type="button"
            size="icon"
            disabled={!replayOn}
            onClick={unSoloClick(() => {
              setGirado((v) => !v);
              repetirUltimo();
            })}
            aria-label="Repetir la última línea"
            className={cn(!replayOn && 'pointer-events-none opacity-40')}
            contentClassName="text-[var(--text-primary)]!"
          >
            <motion.span
              aria-hidden="true"
              className="inline-flex shrink-0 items-center justify-center"
              animate={{ rotate: girado ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <RefreshCw className="size-4" />
            </motion.span>
          </GlassButton>
          {/* REGLA 7 — el contador $0.0000 («el verde de producción») ya no se
              pinta aquí; el coste lo sigue llevando talk/index.tsx desde la
              capa de API. */}
        </div>
      </div>

      {/* ── Escena ──────────────────────────────────────────────────────────
          El log pasa a vivir dentro de la Card del patrón. El scroller REAL es
          el div interno: ahí bajan el ref, el data-rp-scroll (marca heredada de
          #rp-scroll) y por tanto el autoscroll del efecto — la Card es solo el
          marco y no scrollea. */}
      <Card className={cn(COLUMNA, 'relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm')}>
        <div
          ref={scrollRef}
          data-rp-scroll
          tabIndex={0}
          className={cn('flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 sm:px-4', SIN_BARRA)}
        >
          {log.map((b) => (
            <RpFila key={b.id} b={b} />
          ))}
        </div>
      </Card>

      {/* La onda en vivo mientras hablas. */}
      <OndaDictado g={dictado} className={cn(COLUMNA, 'shrink-0 px-10 pt-2')} height={32} />

      {/* ── Dock: siempre visible. Deshabilitar DE VERDAD mientras el narrador
              vuela — bajar la opacidad no impide el clic (§8 trampa 14). ── */}
      <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pt-3')}>
        <MicButton
          ctx="rp"
          recording={grabando}
          onToggle={dictado.toggle}
          size={46}
          variant="plain"
          showLabel={false}
          showChip={false}
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
