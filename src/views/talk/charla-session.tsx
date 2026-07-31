import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Lightbulb, Play, RefreshCw, Volume2, VolumeX } from 'lucide-react';

import { ConversationBar } from '@/components/elevenlabs/conversation-bar';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/elevenlabs/conversation';
import { IconMorph } from '@/components/rodeo/pill-button';
import { useDictado } from '@/components/rodeo/onda-dictado';
import { Card } from '@/components/ui/card';
import { GlassButton } from '@/components/ui/sign-up';
import { cn } from '@/lib/utils';
import {
  toggleTts,
  toggleVoz,
  useTts,
  useUltimoHablado,
  useVoz,
  replayUltimo,
  repetirUltimo,
  VOCES,
} from '@/lib/speech';
import { toast } from '@/stores/toast';
import { useTalk } from '@/stores/talk';

import { BurbujaChat } from './bubbles';
import { OrbAvatar } from './orb-avatar';
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

   · La barra de SESIÓN de arriba se queda (volver / Terminar y la fila de
     audio). La BOMBILLA se muda ahí, junto a los botones de audio: es
     meta-ayuda del mismo rango que "repetir", no una acción de la barra de
     entrada, y en la ConversationBar no hay hueco que no rompa el visual
     verbatim de la imagen 3.

   · REGLA 7 del contrato — «donde te raye en rojo quitalo, porque eso es el
     verde de produccion»: se fueron el título mono en var(--accent)
     ("DIBUJO LIBRE") y el contador $0.0000 (con ellos, las suscripciones a
     `session.title` y a `useApp.cost`; el ticker de coste lo sigue llevando
     talk/index.tsx, que es quien lo alimenta desde la capa de API — aquí solo
     se dejaba de pintar). Y «cambia los botones por unos con el mismo material
     glass del login»: los cuatro mandos de audio son GlassButton size="icon" y
     Terminar es GlassButton size="sm", con los MISMOS iconos, aria-labels y
     acciones. El ← redondo canónico NO se toca (es el de toda la app) y el
     PillButton compartido tampoco: ESCENAS y OFICINA lo siguen usando.

   El vidrio necesita dos cosas que ya pone el ancestro (talk/index.tsx:90-95):
   la clase `vidrio-tema` (declara --background/--foreground crudas por tema) y
   <GlassStyles/> montado una vez. Aquí se repite `vidrio-tema` en la raíz —
   son dos variables CSS, anidarla es inocuo — para que la sesión no dependa de
   que nadie más lo recuerde; el <style> NO se duplica.

   La barra de sesión sigue en DOS filas a propósito: en 390 px no caben ← +
   Terminar + los cuatro mandos de audio en una sola. */

type Motor = ReturnType<typeof useCoachTurn>;

/* La barra de scroll no se pinta, el scroll sí funciona. Va al scroller REAL
   (el div interno de StickToBottom.Content, vía scrollClassName) y también al
   contenedor externo, que el kit deja en overflow-y-auto. */
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/* La conversación es una COLUMNA, no una sábana: en escritorio la Card y la
   barra comparten ancho y centro (en móvil ocupan todo, que es el caso real). */
const COLUMNA = 'mx-auto w-full max-w-[640px]';

/* ── UN solo disparo por toque en los botones de vidrio ────────────────────
   GlassButton (sign-up.tsx, INTOCABLE) envuelve el <button> en un <div> con su
   propio onClick "click fix": si el evento no viene del botón exacto, llama a
   `button.click()`. Como el toque real cae SIEMPRE en el <span> interior
   (.glass-button-text) o en el icono, ese evento burbujea al botón —el handler
   corre— y sigue hasta el div, que vuelve a disparar el botón: DOS ejecuciones
   por toque. En el gate no se nota (abrir un paso dos veces es idempotente) y
   en las pestañas de TALK tampoco, pero aquí sería fatal: el mute se apagaría y
   se encendería en el mismo toque (verificado en la primera tanda de capturas:
   aria-pressed no cambiaba), "Terminar" cerraría la sesión dos veces y la
   bombilla gastaría dos llamadas.

   Cortamos la propagación en el propio botón: el div nunca recibe el evento, su
   "fix" no llega a correr, y el toque que cae en el margen del envoltorio sigue
   funcionando como siempre (ahí el fix sí es útil). No toca sign-up.tsx. */
const unSoloClick =
  (fn: () => void) =>
  (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    fn();
  };

export function CharlaSession({ motor }: { motor: Motor }) {
  const displayLog = useTalk((s) => s.displayLog);
  const busy = useTalk((s) => s.busy);
  const { ttsOn } = useTts();
  const ultimo = useUltimoHablado();
  /* La etiqueta del waveform dice QUIÉN te habla y se toca para cambiar de voz
     (pedido de Gus): "Coach RODEO" era decoración, "Coach Helena" es un mando.
     El re-render lo trae useVoz (useSyncExternalStore sobre el singleton de
     speech.ts) — no hace falta estado local, y así cualquier otro sitio que
     cambie la voz repinta esta etiqueta sola. El toast lo da toggleVoz. */
  const voz = useVoz();

  const volverRef = useRef<HTMLButtonElement>(null);
  const barraRef = useRef<HTMLDivElement>(null);
  /* Lo que Deepgram entendió, de camino al textarea de la barra (prop
     `textoInicial`). Se limpia en el tick siguiente para que dictar DOS VECES
     la misma frase vuelva a caer en el campo: la barra compara valores y con
     el mismo string no se enteraría del segundo dictado. */
  const [transcript, setTranscript] = useState('');
  /* El giro de "repetir" (0° ⇄ 180°) lo hacía PillButton por dentro; con el
     botón de vidrio el gesto se conserva aquí, con los mismos valores de
     muelle. Es del botón, no del estado de la app: alterna y se queda donde
     cae. */
  const [girado, setGirado] = useState(false);

  useEffect(() => {
    if (!transcript) return;
    const h = setTimeout(() => setTranscript(''), 0);
    return () => clearTimeout(h);
  }, [transcript]);

  /* El tip de primera vez (FirstTip) es global y se coloca solo, con un offset
     desde abajo calibrado para el dock de voz clásico (120 px). La
     ConversationBar mide la mitad, así que el tip aterrizaba flotando DENTRO de
     la Card, sin anclaje visible (auditoría r1). Le publicamos la MEDIDA REAL:
     la distancia del borde inferior de la ventana al techo del bloque de la
     barra, que es exactamente el borde de abajo de la Card — el tip queda
     apoyado en la tarjeta y justo encima de la barra. Se recalcula si la barra
     crece (al abrir el teclado) y se retira al salir, para que ESCENAS y
     OFICINA sigan con su offset de siempre. */
  useEffect(() => {
    const el = barraRef.current;
    if (!el) return;
    const medir = () => {
      const alto = window.innerHeight - el.getBoundingClientRect().top;
      document.documentElement.style.setProperty('--rd-tip-abajo', `${Math.round(alto)}px`);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    window.addEventListener('resize', medir);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', medir);
      document.documentElement.style.removeProperty('--rd-tip-abajo');
    };
  }, []);

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
    /* `vidrio-tema` (aurora.css) declara las crudas --background/--foreground
       que consume el CSS del vidrio; el ancestro de TALK ya la trae, y
       repetirla aquí es inocuo (son dos variables) pero deja la sesión sin
       depender de que nadie la mantenga arriba. */
    <div className="vidrio-tema flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sesión ──────────────────────────────────────────────────
          Va en la MISMA columna que la Card y la barra de abajo. Sin esto, en
          escritorio los mandos se estiraban a todo el ancho mientras lo que
          controlan se ceñía a 640 px: el ← en el borde izquierdo, el
          "Terminar" en el derecho, y la tarjeta flotando en medio sin
          relación con ninguno (auditoría r1). */}
      <div className={cn(COLUMNA, 'flex shrink-0 flex-col gap-2 pb-3')}>
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
          {/* El hueco que dejó el título mono lo ocupa un espaciador: el ←
              sigue pegado a la izquierda y Terminar a la derecha, sin que la
              fila se colapse al centro. */}
          <span className="min-w-0 flex-1" />
          <GlassButton
            type="button"
            size="sm"
            onClick={unSoloClick(() => void motor.terminar())}
            disabled={busy}
            className={cn('shrink-0', busy && 'pointer-events-none opacity-40')}
            contentClassName="text-[0.75rem] font-semibold tracking-normal! whitespace-nowrap"
          >
            Terminar
          </GlassButton>
        </div>

        {/* ── Mandos de audio, en el vidrio del login (regla 7) ───────────────
            Mismos iconos, mismos aria-labels y mismas acciones que las píldoras
            que había aquí; lo que cambia es el material. El vidrio NO se tiñe
            al activarse (no hay lima): el estado ON se lee en la tinta del
            icono —var(--text-primary) encendido vs var(--text-muted) apagado—
            y, para lectores de pantalla, en aria-pressed.

            El `!` de las clases de color es obligatorio: .glass-button-text
            fija `color` desde el <style> de GlassStyles, que se inyecta
            DESPUÉS de la hoja de Tailwind y ganaría por orden.

            Deshabilitado: además del atributo (que ya frena el click, también
            el reenvío del wrapper de GlassButton), el envoltorio se apaga a
            opacidad 40 y deja de recibir puntero — el vidrio no tiene estado
            :disabled propio. */}
        <div className="flex items-center gap-2">
          {/* Volumen: morph altavoz ⇄ altavoz tachado (snippet 1) */}
          <GlassButton
            type="button"
            size="icon"
            onClick={unSoloClick(() => toast('Voz del coach: ' + (toggleTts() ? 'ON' : 'OFF'), 1500))}
            aria-label="Activar o desactivar voz del coach"
            aria-pressed={ttsOn}
            contentClassName={ttsOn ? 'text-[var(--text-primary)]!' : 'text-[var(--text-muted)]!'}
          >
            <IconMorph
              on={ttsOn}
              iconOn={<Volume2 className="size-4" />}
              iconOff={<VolumeX className="size-4" />}
            />
          </GlassButton>
          {/* Play: relee la última respuesta. Funciona con la voz apagada —
              sirve justo para probar cómo suena sin activarla en cada turno. */}
          <GlassButton
            type="button"
            size="icon"
            disabled={!ultimo}
            onClick={unSoloClick(replayUltimo)}
            aria-label="Escuchar la última respuesta"
            className={cn(!ultimo && 'pointer-events-none opacity-40')}
            contentClassName="text-[var(--text-primary)]!"
          >
            <Play className="size-4" fill="currentColor" strokeWidth={0} />
          </GlassButton>
          {/* Repetir: misma acción, con su gesto — el icono da media vuelta */}
          <GlassButton
            type="button"
            size="icon"
            disabled={!ultimo}
            onClick={unSoloClick(() => {
              setGirado((v) => !v);
              repetirUltimo();
            })}
            aria-label="Repetir la última respuesta"
            className={cn(!ultimo && 'pointer-events-none opacity-40')}
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
          {/* Bombilla: una respuesta-ejemplo. No bloquea el turno del coach. */}
          <GlassButton
            type="button"
            size="icon"
            onClick={unSoloClick(() => void motor.pedirIdea())}
            aria-label="Dame una idea de respuesta"
            aria-pressed={motor.ideaOn}
            contentClassName={motor.ideaOn ? 'text-[var(--text-primary)]!' : 'text-[var(--text-muted)]!'}
          >
            <Lightbulb className="size-4" />
          </GlassButton>
        </div>
      </div>

      {/* ── El chat ──────────────────────────────────────────────────────────
          Capa OPACA y limpia, SIN ningún filtro. Antes la Card colgaba de un
          <Backlight> (magicui) cuyo filtro SVG —feGaussianBlur(40) + saturate(4)
          compuesto por debajo— pintaba una copia desenfocada y sobre-saturada de
          la propia tarjeta que rebosaba ~40px FUERA de su borde: ése era el halo
          de color que marcó Gus (el rojo/magenta del orb a la izquierda y la
          banda clara de arriba) en oscuro y en gradiente. En claro ya se anulaba,
          pero el efecto no aporta nada y la petición es que NINGÚN tema tenga
          manchas ni bandas alrededor del panel, así que el Backlight se retira
          entero (el componente verbatim no se toca; solo se deja de usar). El
          gradiente del fondo —capa `fixed` a pantalla completa (aurora.css)—
          queda continuo, y la tarjeta se apoya encima sin desenfocarlo.

          Es un <div> plano montado SIEMPRE (no cambia con el toggle de tema): el
          árbol no se mueve al cambiar de tema, así que la Card no se re-monta —lo
          que en su día perdía burbujas y re-animaba el texto (auditoría r2)—. La
          profundidad la sigue dando el shadow-sm neutro de la propia Card, que no
          es un halo de color. */}
      <div className={cn(COLUMNA, 'flex min-h-0 flex-1 flex-col')}>{tarjeta}</div>

      {/* ── La barra de abajo (imagen 3) ──────────────────────────────────────
          El envoltorio no es decorativo: es lo que se mide para colocar el tip
          de primera vez (ver el efecto de --rd-tip-abajo arriba), y su techo es
          el borde de abajo de la Card. */}
      <div ref={barraRef} className={cn(COLUMNA, 'shrink-0 pt-3')}>
        <ConversationBar
          className="p-0"
          conectado
          grabando={dictado.grabando}
          procesando={dictado.procesando}
          onMic={dictado.toggle}
          onEnviar={enviar}
          onColgar={motor.volver}
          etiqueta={'Coach ' + VOCES[voz]}
          onEtiqueta={() => void toggleVoz()}
          etiquetaLabel="Cambiar la voz del coach"
          alStreamListo={dictado.alStreamListo}
          alError={dictado.alError}
          alStreamFin={dictado.alStreamFin}
          textoInicial={transcript}
        />
      </div>
    </div>
  );
}
