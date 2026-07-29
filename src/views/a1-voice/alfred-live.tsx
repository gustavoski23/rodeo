import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Keyboard, SendHorizontal, Volume2, VolumeX, X } from 'lucide-react';

import { LiveWaveform } from '@/components/elevenlabs/live-waveform';
import { MicButton } from '@/components/rodeo/mic-button';
import { PencilLoader } from '@/components/rodeo/pencil-loader';
import { speak, stopSpeak, ttsActivo, useTts, toggleTts } from '@/lib/speech';
import { turnoAlfred, type CorreccionAlfred, type TurnoChat } from '@/lib/alfred/chat';
import type { A1Chunk, A1Scene } from '@/content/a1/tipos';

import { useColorToken, useGrabadora } from './use-grabadora';

/* ALFRED VIVO — el mini-roleplay de la escena.

   Todo lo anterior del módulo A1 es guionado: Alfred dice lo que el contenido
   dice que diga. Acá, por primera vez, contesta de verdad a lo que el alumno
   improvisa. Es el pago de las seis pantallas anteriores — "esto que
   practicaste, úsalo contra alguien que responde".

   Y por eso mismo es donde más se puede romper la confianza. Las protecciones
   viven repartidas: el techo de 8 palabras y la corrección única están en el
   prompt (lib/alfred/chat.ts), el filtro anti-cita-fantasma en filtro.ts, y acá
   quedan las de la interfaz:

   - El apoyo en español va SIEMPRE debajo del inglés de Alfred. Un principiante
     que no entiende el turno del otro no está conversando, está adivinando.
   - Se puede contestar por teclado sin tocar el micrófono. Hay gente que en la
     primera sesión no dice nada en voz alta, y está bien.
   - La corrección es una ficha chiquita al costado, nunca una burbuja: no es un
     turno de la conversación y no debe cortarla.

   Las burbujas son propias a propósito (no las de views/talk): comparten la
   geometría de las del coach, pero las de allá viven atadas al store de TALK y
   a las glosas, y esta vista tiene que poder montarse sola donde el loop de A1
   la ponga. */

type Turno = {
  id: number;
  de: 'user' | 'alfred';
  en: string;
  es?: string;
  correccion?: CorreccionAlfred | null;
};

let seq = 0;

/* ── Burbujas ─────────────────────────────────────────────────────────────
   Misma geometría que el coach de TALK (esquina cuadrada del lado de quien
   habla, radios 20/4, 85 % de ancho): es la misma app, no dos. */

const ENTRADA = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 34 },
};

function BurbujaUsuario({ texto }: { texto: string }) {
  return (
    <motion.div
      {...ENTRADA}
      className="ml-auto max-w-[85%] rounded-[20px_4px_20px_20px] border px-[17px] py-3 text-[0.98rem] leading-[1.55] [overflow-wrap:anywhere]"
      style={{
        background: 'var(--accent-dim)',
        borderColor: 'color-mix(in oklch, var(--accent) 28%, transparent)',
        color: 'var(--text-primary)',
      }}
    >
      {texto}
    </motion.div>
  );
}

function BurbujaAlfred({ en, es }: { en: string; es?: string }) {
  return (
    <motion.div
      {...ENTRADA}
      className="max-w-[85%] self-start rounded-[4px_20px_20px_20px] border px-[17px] py-3 [overflow-wrap:anywhere]"
      style={{ background: 'var(--superficie-t)', borderColor: 'var(--borde-sutil)' }}
    >
      <p className="text-[1rem] leading-[1.55]" style={{ color: 'var(--text-primary)' }}>
        {en}
      </p>
      {/* El apoyo en español: separado por una regla fina para que se lea como
          muleta y no como parte de lo que Alfred dijo. */}
      {!!es && (
        <p
          className="mt-2 border-t pt-2 text-[0.86rem] leading-[1.45]"
          style={{ borderColor: 'var(--borde-sutil)', color: 'var(--text-secondary)' }}
        >
          {es}
        </p>
      )}
    </motion.div>
  );
}

/** La corrección: ficha pequeña, al lado del turno del alumno, nunca en medio. */
function FichaCorreccion({ c }: { c: CorreccionAlfred }) {
  return (
    <motion.div
      {...ENTRADA}
      className="ml-auto max-w-[85%] rounded-[16px_16px_4px_16px] border px-[14px] py-2.5 text-[0.84rem] [overflow-wrap:anywhere]"
      style={{
        background: 'var(--danger-dim)',
        borderColor: 'color-mix(in oklch, var(--danger) 32%, transparent)',
      }}
    >
      <div className="leading-[1.5]">
        <span className="line-through decoration-[1.5px]" style={{ color: 'var(--texto-mal)' }}>
          {c.quote}
        </span>
        {' → '}
        <span className="font-bold" style={{ color: 'var(--texto-bien)' }}>
          {c.fix}
        </span>
      </div>
      {!!c.why_es && (
        <div className="mt-1 text-[0.8rem] leading-[1.4]" style={{ color: 'var(--text-secondary)' }}>
          {c.why_es}
        </div>
      )}
    </motion.div>
  );
}

export function AlfredLive({
  escena,
  chunks,
  onCerrar,
}: {
  escena: A1Scene;
  chunks: A1Chunk[];
  onCerrar: () => void;
}) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [pensando, setPensando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [teclado, setTeclado] = useState(false);

  const { ttsOn } = useTts();
  const barColor = useColorToken('--accent', '#aced37');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* El historial también en ref: el turno se dispara desde callbacks (mic, tecla
     Enter) que no siempre ven el último render, y mandarle a Alfred un historial
     viejo lo hace repetir su turno anterior. */
  const histRef = useRef<TurnoChat[]>([]);

  /* callAPI no expone AbortSignal (lib/api.ts es port literal y no se toca), así
     que el corte se hace por token, igual que speech.ts con speakToken: al
     desmontar sube el número y la respuesta que llegue tarde se descarta sin
     tocar estado. El fetch del STT sí se aborta de verdad, dentro del hook. */
  const tokenRef = useRef(0);

  const empujar = useCallback((t: Omit<Turno, 'id'>) => {
    setTurnos((prev) => [...prev, { ...t, id: ++seq }]);
  }, []);

  /* ── Un turno ─────────────────────────────────────────────────────────── */
  const pedirTurno = useCallback(async () => {
    const token = ++tokenRef.current;
    setPensando(true);
    setFallo(null);
    try {
      const r = await turnoAlfred(histRef.current, escena, { chunks });
      if (token !== tokenRef.current) return; // se cerró la escena mientras tanto

      histRef.current = [...histRef.current, { de: 'alfred', en: r.reply_en, es: r.reply_es_apoyo }];
      empujar({ de: 'alfred', en: r.reply_en, es: r.reply_es_apoyo, correccion: r.correccion });
      // Alfred SUENA: en A1 el oído es la mitad del trabajo, y la frase es corta
      // justo para que se pueda repetir en voz alta después de oírla.
      if (ttsActivo()) void speak(r.reply_en, { trackReplay: false });
    } catch (e) {
      if (token !== tokenRef.current) return;
      setFallo(e instanceof Error ? e.message : 'Alfred se enredó — dale otra vez');
    } finally {
      if (token === tokenRef.current) setPensando(false);
    }
  }, [escena, chunks, empujar]);

  /** Un turno del alumno, venga de la voz o del teclado. */
  const enviar = useCallback(
    (crudo: string) => {
      const limpio = crudo.trim();
      // El guard de `pensando` va acá y no en el botón: el micrófono también
      // llega por este camino y no mira estados de la barra de texto.
      if (!limpio || pensando) return;
      setTexto('');
      histRef.current = [...histRef.current, { de: 'user', en: limpio }];
      empujar({ de: 'user', en: limpio });
      void pedirTurno();
    },
    [pensando, empujar, pedirTurno],
  );

  const grab = useGrabadora({
    // Las frases practicadas como keyterms: es lo que se espera oír, y sesgar a
    // Deepgram hacia ellas perdona el acento en vez de castigarlo.
    keyterms: chunks.flatMap((c) => c.en.split(/\s+/)).filter(Boolean),
    onTranscript: enviar,
  });

  /* pedirTurno cambia de identidad cuando el padre repinta (`chunks` es un array
     nuevo en cada render suyo). El efecto de apertura no puede depender de eso o
     Alfred abriría la escena de nuevo a mitad de charla, así que se lo lee por
     ref y el efecto queda con deps vacías: un montaje, una apertura. */
  const pedirTurnoRef = useRef(pedirTurno);
  useEffect(() => {
    pedirTurnoRef.current = pedirTurno;
  });

  /* ── Apertura y cierre, en UN SOLO efecto ─────────────────────────────
     Alfred habla primero. Un principiante frente a un chat vacío no arranca
     nunca; con una frase suya arriba, ya tiene a qué contestar.

     Van juntos porque separarlos rompía la vista en desarrollo: <StrictMode>
     monta, ejecuta los cleanups y vuelve a montar. Con la apertura guardada por
     un `abiertoRef` que nunca se reseteaba, el segundo montaje no pedía turno;
     el cleanup del efecto de cierre, mientras tanto, ya había subido el token,
     así que la única respuesta en vuelo se descartaba entera — incluido el
     `setPensando(false)` del finally. La escena se quedaba con el lápiz girando
     para siempre.

     Emparejados, cada montaje pide su turno y cada desmontaje invalida el suyo:
     en desarrollo son dos llamadas (el precio de StrictMode, y justamente lo que
     prueba que el cierre limpia bien), en producción una. */
  useEffect(() => {
    void pedirTurnoRef.current();
    return () => {
      // Sube el token: la respuesta que llegue tarde se descarta sin tocar
      // estado. La grabación y el fetch del STT los corta el propio hook.
      tokenRef.current++;
      stopSpeak();
    };
  }, []);

  useEffect(() => {
    const c = scrollRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [turnos, pensando]);

  const cerrar = useCallback(() => {
    grab.cancelar();
    stopSpeak();
    onCerrar();
  }, [grab, onCerrar]);

  const abrirTeclado = () => {
    const abrir = !teclado;
    setTeclado(abrir);
    if (abrir) requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 pb-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={cerrar}
          aria-label="Cerrar la charla con Alfred"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          <X size={17} strokeWidth={2} />
        </motion.button>
        <span
          className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          {escena.title_es}
        </span>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => toggleTts()}
          aria-label="Activar o desactivar la voz de Alfred"
          aria-pressed={ttsOn}
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={
            ttsOn
              ? { borderColor: 'var(--accent)', background: 'var(--accent-dim)', color: 'var(--accent)' }
              : { borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-muted)' }
          }
        >
          {ttsOn ? <Volume2 size={16} strokeWidth={2} /> : <VolumeX size={16} strokeWidth={2} />}
        </motion.button>
      </div>

      {/* ── Conversación ──────────────────────────────────────────────── */}
      <div className="scroll-area flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-2" ref={scrollRef}>
        {turnos.map((t) =>
          t.de === 'user' ? (
            <BurbujaUsuario key={t.id} texto={t.en} />
          ) : (
            <div key={t.id} className="flex flex-col gap-2.5">
              {/* La corrección cuelga del turno de Alfred pero se pinta ANTES:
                  corrige lo que el alumno acaba de decir, y ahí es donde su ojo
                  todavía está. */}
              {t.correccion && <FichaCorreccion c={t.correccion} />}
              <BurbujaAlfred en={t.en} es={t.es} />
            </div>
          ),
        )}

        <AnimatePresence>
          {pensando && (
            <motion.div
              {...ENTRADA}
              exit={{ opacity: 0 }}
              aria-live="polite"
              className="max-w-[85%] self-start rounded-[4px_20px_20px_20px] border px-[17px] py-3"
              style={{ background: 'var(--superficie-t)', borderColor: 'var(--borde-sutil)' }}
            >
              <PencilLoader size={4.4} />
            </motion.div>
          )}
        </AnimatePresence>

        {fallo && (
          <div
            role="status"
            className="self-start rounded-[14px] border px-[15px] py-3 text-[0.86rem] leading-[1.45]"
            style={{
              background: 'var(--danger-dim)',
              borderColor: 'color-mix(in oklch, var(--danger) 30%, transparent)',
              color: 'var(--text-primary)',
            }}
          >
            {fallo}{' '}
            <button
              type="button"
              onClick={() => void pedirTurno()}
              className="cursor-pointer font-bold underline underline-offset-2"
              style={{ color: 'var(--accent)' }}
            >
              Reintentar
            </button>
          </div>
        )}
      </div>

      {/* ── Onda ──────────────────────────────────────────────────────────
          Montada siempre por el mismo motivo que en el paso de voz: el mic se
          pide una sola vez, al encender `active`. */}
      <div className="shrink-0 px-1 pt-2">
        <LiveWaveform
          active={grab.grabando}
          processing={grab.procesando}
          mode="scrolling"
          height={44}
          barColor={barColor}
          onStreamReady={grab.alStreamListo}
          onStreamEnd={grab.alStreamFin}
          onError={grab.alError}
        />
      </div>

      {grab.error && (
        <p className="shrink-0 pt-1 text-center text-[0.8rem]" style={{ color: 'var(--text-secondary)' }}>
          {grab.error}
          {/* Sin micrófono no se cierra la puerta: se abre la otra. */}
          {grab.sinMic && ' Escribí acá abajo y seguimos igual.'}
        </p>
      )}

      {/* ── Dock ──────────────────────────────────────────────────────── */}
      <div className="grid shrink-0 grid-cols-[46px_1fr_46px] items-center gap-2 pt-2">
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
          <MicButton
            recording={grab.grabando}
            onToggle={grab.grabando ? grab.parar : grab.iniciar}
            disabled={pensando || grab.procesando || grab.sinMic}
            size={58}
            showChip={false}
          />
        </div>
      </div>

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
            placeholder="Escribí en inglés…"
            autoComplete="off"
            aria-label="Tu respuesta en inglés"
            /* 16 px reales: por debajo, iOS hace zoom al enfocar el campo. */
            className="min-w-0 flex-1 rounded-full border px-[18px] py-3 text-[16px] outline-none focus-visible:border-[var(--accent)]"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--borde-sutil)', color: 'var(--text-primary)' }}
          />
          {!!texto.trim() && (
            <motion.button
              type="button"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 600, damping: 25 }}
              onClick={() => enviar(texto)}
              disabled={pensando}
              aria-label="Enviar"
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
