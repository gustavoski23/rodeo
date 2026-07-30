/* ConversationBar — ElevenLabs UI, VERBATIM en todo lo visual (Card, waveform,
   botones mic/teclado/colgar, textarea plegable: mismas clases y estructura).

   Adaptación DECLARADA (el cerebro, no el cuerpo): el original se conecta al
   SDK de agentes de ElevenLabs (useConversationStatus/Controls/Input de
   @elevenlabs/react). RODEO no usa ese SDK — la voz es Deepgram y el chat es
   nuestro motor — así que esos tres hooks se reemplazan por PROPS con la misma
   semántica, y quien la monta (la sesión de charla) los cablea al dictado real:

   · isConnected            → prop `conectado` (hay sesión de charla viva)
   · isMuted/toggleMute     → el botón del mic ahora ARRANCA/PARA la grabación
                              (prop `grabando` + `onMic`) — y mientras graba,
                              pulso rojo en el botón + waveform activo, la señal
                              visual de "ya puedes hablar" que pidió Gus.
   · startSession/endSession→ prop `onColgar` (el teléfono/X cierra la sesión)
   · sendUserMessage        → prop `onEnviar(texto)`
   · sendContextualUpdate   → eliminado (no existe en nuestro motor)
   · "Customer Support"     → prop `etiqueta` (default "Coach RODEO"), y prop
                              NUEVA `onEtiqueta`: si llega, esa etiqueta del
                              waveform en reposo se pinta como <button> en vez
                              de <span> para poder TOCARLA (en RODEO cambia la
                              voz del coach). Mismas clases exactas
                              (text-[10px] font-medium text-foreground/50): el
                              aspecto es idéntico, solo cambia el elemento.
                              Sin la prop, sigue siendo el <span> verbatim.
   · El LiveWaveform necesita el stream del mic: se pasan los tres callbacks
     de la grabadora (alStreamListo/alError/alStreamFin), igual que en
     OndaDictado. `procesando` = transcribiendo (estado processing). */

import * as React from "react"
import {
  ArrowUpIcon,
  ChevronDown,
  Keyboard,
  Mic,
  MicOff,
  PhoneIcon,
  XIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LiveWaveform } from "@/components/elevenlabs/live-waveform"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

export interface ConversationBarProps {
  /** Hay sesión de charla viva (habilita mic/teclado). */
  conectado?: boolean
  /** El mic está grabando (waveform activo + pulso en el botón). */
  grabando?: boolean
  /** Deepgram está transcribiendo (waveform en processing). */
  procesando?: boolean
  /** Toca el mic: arranca o para la grabación. */
  onMic?: () => void
  /** Envía el texto escrito con el teclado. */
  onEnviar?: (mensaje: string) => void
  /** El teléfono/X: cierra la sesión. */
  onColgar?: () => void
  /** Texto del hueco del waveform cuando está en reposo. */
  etiqueta?: string
  /** Si llega, la etiqueta es un botón y esto es lo que hace al tocarla. */
  onEtiqueta?: () => void
  /** aria-label del botón de la etiqueta (solo con `onEtiqueta`). */
  etiquetaLabel?: string
  /** Callbacks de la grabadora hacia el LiveWaveform (identidad estable). */
  alStreamListo?: (stream: MediaStream) => void
  alError?: (e: Error | React.SyntheticEvent) => void
  alStreamFin?: () => void
  /** Texto ya transcrito que cae al teclado para revisar antes de enviar. */
  textoInicial?: string
  className?: string
  waveformClassName?: string
  placeholder?: string
}

export const ConversationBar = React.forwardRef<
  HTMLDivElement,
  ConversationBarProps
>(
  (
    {
      conectado = true,
      grabando = false,
      procesando = false,
      onMic,
      onEnviar,
      onColgar,
      etiqueta = "Coach RODEO",
      onEtiqueta,
      etiquetaLabel,
      alStreamListo,
      alError,
      alStreamFin,
      textoInicial,
      className,
      waveformClassName,
      placeholder = "Escribe en inglés…",
    },
    ref
  ) => {
    const [keyboardOpen, setKeyboardOpen] = React.useState(false)
    const [textInput, setTextInput] = React.useState("")

    /* El transcript de Deepgram aterriza en el teclado (nunca se auto-envía:
       la lección de producción). Se abre el teclado para que se vea. */
    React.useEffect(() => {
      if (textoInicial !== undefined && textoInicial !== "") {
        setTextInput(textoInicial)
        setKeyboardOpen(true)
      }
    }, [textoInicial])

    const enReposo = !grabando && !procesando

    const handleSendText = React.useCallback(() => {
      if (!textInput.trim()) return
      const messageToSend = textInput
      setTextInput("")
      onEnviar?.(messageToSend)
    }, [textInput, onEnviar])

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          handleSendText()
        }
      },
      [handleSendText]
    )

    return (
      <div
        ref={ref}
        className={cn("flex w-full items-end justify-center p-4", className)}
      >
        <Card className="m-0 w-full gap-0 border p-0 shadow-lg">
          <div className="flex flex-col-reverse">
            <div>
              {keyboardOpen && <Separator />}
              <div className="flex items-center justify-between gap-2 p-2">
                <div className="h-8 w-[120px] md:h-10">
                  <div
                    className={cn(
                      "flex h-full items-center gap-2 rounded-md py-1",
                      "bg-foreground/5 text-foreground/70"
                    )}
                  >
                    <div className="h-full flex-1">
                      <div
                        className={cn(
                          "relative flex h-full w-full shrink-0 items-center justify-center overflow-hidden rounded-sm",
                          waveformClassName
                        )}
                      >
                        <LiveWaveform
                          key={enReposo ? "idle" : "active"}
                          active={grabando}
                          processing={procesando}
                          barWidth={3}
                          barGap={1}
                          barRadius={4}
                          fadeEdges={true}
                          fadeWidth={24}
                          sensitivity={1.8}
                          smoothingTimeConstant={0.85}
                          height={20}
                          mode="static"
                          onStreamReady={alStreamListo}
                          onError={alError}
                          onStreamEnd={alStreamFin}
                          className={cn(
                            "h-full w-full transition-opacity duration-300",
                            enReposo && "opacity-0"
                          )}
                        />
                        {enReposo && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {onEtiqueta ? (
                              <button
                                type="button"
                                onClick={onEtiqueta}
                                aria-label={etiquetaLabel}
                                className="text-foreground/50 cursor-pointer text-[10px] font-medium"
                              >
                                {etiqueta}
                              </button>
                            ) : (
                              <span className="text-foreground/50 text-[10px] font-medium">
                                {etiqueta}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onMic}
                    aria-pressed={grabando}
                    aria-label={grabando ? "Parar la grabación" : "Hablar"}
                    /* La señal de "estás grabando": tinte rojo + pulso. El
                       original marcaba mute con bg-foreground/5; aquí el estado
                       vivo es grabar, y tiene que notarse de un vistazo. */
                    className={cn(
                      grabando &&
                        "animate-pulse bg-red-500/15 text-red-500 hover:bg-red-500/20 hover:text-red-500"
                    )}
                    disabled={!conectado}
                  >
                    {grabando ? <MicOff /> : <Mic />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setKeyboardOpen((v) => !v)}
                    aria-pressed={keyboardOpen}
                    aria-label="Escribir con teclado"
                    className="relative"
                    disabled={!conectado}
                  >
                    <Keyboard
                      className={
                        "h-5 w-5 transform-gpu transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] " +
                        (keyboardOpen
                          ? "scale-75 opacity-0"
                          : "scale-100 opacity-100")
                      }
                    />
                    <ChevronDown
                      className={
                        "absolute inset-0 m-auto h-5 w-5 transform-gpu transition-all delay-50 duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] " +
                        (keyboardOpen
                          ? "scale-100 opacity-100"
                          : "scale-75 opacity-0")
                      }
                    />
                  </Button>
                  <Separator orientation="vertical" className="mx-1 -my-2.5" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onColgar}
                    aria-label={conectado ? "Terminar la sesión" : "Empezar"}
                  >
                    {conectado ? (
                      <XIcon className="h-5 w-5" />
                    ) : (
                      <PhoneIcon className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-out",
                keyboardOpen ? "max-h-[120px]" : "max-h-0"
              )}
            >
              <div className="relative px-2 pt-2 pb-2">
                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="min-h-[100px] resize-none border-0 pr-12 shadow-none focus-visible:ring-0"
                  disabled={!conectado}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSendText}
                  disabled={!textInput.trim() || !conectado}
                  aria-label="Enviar mensaje"
                  className="absolute right-3 bottom-3 h-8 w-8"
                >
                  <ArrowUpIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }
)

ConversationBar.displayName = "ConversationBar"
