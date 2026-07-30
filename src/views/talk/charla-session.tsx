import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Lightbulb, Play, RefreshCw, Volume2, VolumeX } from 'lucide-react';

import { ConversationBar } from '@/components/elevenlabs/conversation-bar';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/elevenlabs/conversation';
import { Backlight } from '@/components/magicui/backlight';
import { PillButton } from '@/components/rodeo/pill-button';
import { useDictado } from '@/components/rodeo/onda-dictado';
import { Card } from '@/components/ui/card';
import { toggleTts, useTts, useUltimoHablado, replayUltimo, repetirUltimo } from '@/lib/speech';
import { toast } from '@/stores/toast';
import { useApp } from '@/stores/app';
import { useTalk } from '@/stores/talk';

import { BurbujaChat } from './bubbles';
import { OrbAvatar } from './orb-avatar';
import { useTemaOscuro } from './use-tema-oscuro';
import type { useCoachTurn } from './use-coach-turn';

/* Sesión de CHARLA — REDISEÑO al look que pidió Gus (imágenes 2 y 3):

   · El chat vive dentro de una Card limpia con el <Conversation> del kit de
     ElevenLabs (StickToBottom): autoscroll pegado al fondo, botón de "bajar"
     flotante cuando te vas hacia arriba, y NADA de barra de scroll a la vista
     (la raya roja de Gus) — se apaga con utilidades en el className del propio
     scroller, sin tocar CSS global: `[scrollbar-width:none]` +
     `[&::-webkit-scrollbar]:hidden`. El dedo y la rueda siguen scrolleando.

   · Abajo, la ConversationBar de ElevenLabs sustituye al dock de voz: el mic
     héroe, la OndaDictado y la barra de teclado se van de ESTA vista (los
     componentes siguen en el repo — ESCENAS y OFICINA los usan). La barra ya
     trae su propio waveform, su teclado plegable y su botón de colgar.

   · La barra de SESIÓN de arriba se queda (volver / título / Terminar y la fila
     de audio con el coste). La BOMBILLA se muda ahí, junto a las píldoras de
     audio: es meta-ayuda del mismo rango que "repetir", no una acción de la
     barra de entrada, y en la ConversationBar no hay hueco que no rompa el
     visual verbatim de la imagen 3.

   La barra de sesión sigue en DOS filas a propósito: en 390 px no caben ← +
   título + píldoras + Terminar + coste en una sola. */

type Motor = ReturnType<typeof useCoachTurn>;

/* La barra de scroll no se pinta, el scroll sí funciona. Va al scroller REAL
   (el div interno de StickToBottom.Content, vía scrollClassName) y también al
   contenedor externo, que el kit deja en overflow-y-auto. */
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/* La conversación es una COLUMNA, no una sábana: en escritorio la Card y la
   barra comparten ancho y centro (en móvil ocupan todo, que es el caso real). */
const COLUMNA = 'mx-auto w-full max-w-[640px]';

export function CharlaSession({ motor }: { motor: Motor }) {
  const titulo = useTalk((s) => s.session?.title ?? '');
  const displayLog = useTalk((s) => s.displayLog);
  const busy = useTalk((s) => s.busy);
  const cost = useApp((s) => s.cost);
  const { ttsOn } = useTts();
  const ultimo = useUltimoHablado();
  const oscuro = useTemaOscuro();

  const volverRef = useRef<HTMLButtonElement>(null);
  /* Lo que Deepgram entendió, de camino al textarea de la barra (prop
     `textoInicial`). Se limpia en el tick siguiente para que dictar DOS VECES
     la misma frase vuelva a caer en el campo: la barra compara valores y con
     el mismo string no se enteraría del segundo dictado. */
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    if (!transcript) return;
    const h = setTimeout(() => setTranscript(''), 0);
    return () => clearTimeout(h);
  }, [transcript]);

  /* Entrada por teclado desde el Home aurora: el foco cae en "Volver a los
     escenarios" (brief del Home), para que quien navega sin ratón no quede
     tirado en el body. Se consume una vez y se apaga. */
  useEffect(() => {
    if (useTalk.getState().focoVolver) {
      volverRef.current?.focus();
      useTalk.getState().setFocoVolver(false);
    }
  }, []);

  const enviar = useCallback((t: string) => {
    const limpio = t.trim();
    if (!limpio) return;
    /* El viejo deshabilitaba #send-btn mientras el turno volaba (L4112). La
       ConversationBar vacía su textarea ANTES de llamarnos, así que si el turno
       está ocupado (sendTurn lo descartaría por su guard) el texto se devuelve
       al campo por la vía del transcript en vez de evaporarse. */
    if (useTalk.getState().busy) {
      setTranscript(limpio);
      toast('Espera a que el coach termine', 1500);
      return;
    }
    void motor.sendTurn(limpio);
  }, [motor]);

  /* ── Mic: Deepgram Nova-3 multi ───────────────────────────────────────────
     El transcript cae SIEMPRE al campo de texto de la barra (jamás se
     auto-envía: la lección de producción) y la barra abre su teclado sola para
     que se vea qué entendió Deepgram antes de mandarlo. El waveform de la
     propia barra es el que pide el micrófono: por eso los tres callbacks de la
     grabadora viajan TAL CUAL, sin envolver (identidad estable). */
  const dictado = useDictado(setTranscript);

  // Solo la última burbuja del coach monta el Orb WebGL (ver orb-avatar.tsx).
  const ultimoCoach = useMemo(() => {
    for (let i = displayLog.length - 1; i >= 0; i--) if (displayLog[i].tipo === 'coach') return displayLog[i].id;
    return -1;
  }, [displayLog]);

  const tarjeta = (
    <Card className="relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm">
      <Conversation className={`min-h-0 flex-1 ${SIN_BARRA}`}>
        <ConversationContent className="flex flex-col gap-1 px-3 py-2 sm:px-4" scrollClassName={SIN_BARRA}>
          {displayLog.length === 0 ? (
            <ConversationEmptyState
              className="min-h-[240px]"
              icon={<OrbAvatar className="size-14" estado="listening" vivo />}
              title="Empieza la conversación…"
              description="Toca el micrófono y habla en inglés. Yo te sigo, y te corrijo por el camino."
            />
          ) : (
            displayLog.map((b) => <BurbujaChat key={b.id} b={b} orbVivo={b.id === ultimoCoach} />)
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </Card>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sesión ── */}
      <div className="flex shrink-0 flex-col gap-2 pb-3">
        <div className="flex items-center gap-2">
          <motion.button
            ref={volverRef}
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
          {/* Bombilla: una respuesta-ejemplo. No bloquea el turno del coach. */}
          <PillButton
            icon={<Lightbulb className="size-4" />}
            active={motor.ideaOn}
            onClick={() => void motor.pedirIdea()}
            aria-label="Dame una idea de respuesta"
          />
          <span className="ml-auto shrink-0 font-mono text-[0.62rem] tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>
            ${cost.toFixed(4)}
          </span>
        </div>
      </div>

      {/* ── El chat ──────────────────────────────────────────────────────────
          En OSCURO la Card va dentro del Backlight de Magic UI: el filtro SVG
          desenfoca y satura una copia de la propia tarjeta por debajo, y eso es
          el halo. En CLARO no: sobre papel el mismo filtro es una mancha gris.
          Las utilidades [&>div] estiran el div interno del Backlight (el que
          lleva el filter) para que la Card siga siendo la que reparte el alto;
          el componente es verbatim y no expone className para ese div. */}
      {oscuro ? (
        <Backlight
          blur={40}
          className={`${COLUMNA} flex min-h-0 flex-1 flex-col [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col`}
        >
          {tarjeta}
        </Backlight>
      ) : (
        <div className={`${COLUMNA} flex min-h-0 flex-1 flex-col`}>{tarjeta}</div>
      )}

      {/* ── La barra de abajo (imagen 3) ── */}
      <ConversationBar
        className={`${COLUMNA} shrink-0 p-0 pt-3`}
        conectado
        grabando={dictado.grabando}
        procesando={dictado.procesando}
        onMic={dictado.toggle}
        onEnviar={enviar}
        onColgar={motor.volver}
        etiqueta="Coach RODEO"
        alStreamListo={dictado.alStreamListo}
        alError={dictado.alError}
        alStreamFin={dictado.alStreamFin}
        textoInicial={transcript}
      />
    </div>
  );
}
