import { AnimatePresence, motion } from 'motion/react';

import { LiveWaveform } from '@/components/elevenlabs/live-waveform';
import { toast } from '@/stores/toast';
import { useColorToken, useGrabadora } from '@/views/a1-voice/use-grabadora';

/* El dictado de TODA la app: MediaRecorder → /api/stt (Deepgram Nova-3 multi),
   con la onda en vivo de ElevenLabs mientras hablas. Reemplaza al viejo
   SpeechRecognition del navegador por las dos razones que ya cobramos en
   producción:

   1. La transcripción del navegador inventaba texto ("Alive people Tell beca")
      y encima se auto-enviaba: el coach corregía ruido como si fueran errores
      de Gus y le contaminaba el DNA. Deepgram multi entiende el espanglish y
      el resultado SIEMPRE cae al campo de texto — enviar es un gesto aparte.
   2. En Android, SpeechRecognition no convive con el AudioContext que la onda
      necesita para dibujarse. MediaRecorder sí: un solo stream para grabar y
      pintar (lo gestiona useGrabadora colgándose del stream del waveform).

   El chip ES/EN muere con SpeechRecognition: el modelo `multi` escucha los dos
   idiomas en la misma toma, así que ya no hay nada que elegir. */

type Grabadora = ReturnType<typeof useGrabadora>;

/** Hook de conveniencia: grabadora + toggle listo para colgar del MicButton.
    El transcript llega por `onTexto` y NUNCA se envía solo. */
export function useDictado(onTexto: (t: string) => void, keyterms?: readonly string[]) {
  const g = useGrabadora({
    keyterms,
    onTranscript: onTexto,
    // El error ya viene como frase para pantalla (permiso, hardware, red).
    onError: (mensaje) => toast(mensaje),
  });
  return { ...g, toggle: g.grabando ? g.parar : g.iniciar };
}

/** La franja de onda del dock: existe solo mientras se graba o transcribe.
    Montarla es lo que enciende el micrófono (el waveform pide el stream). */
export function OndaDictado({ g, height = 40, className }: { g: Grabadora; height?: number; className?: string }) {
  const color = useColorToken('--accent', '#c8f04a');
  const visible = g.grabando || g.procesando;

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="onda"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          className={className}
          aria-hidden="true"
        >
          <LiveWaveform
            active={g.grabando}
            processing={g.procesando}
            mode="scrolling"
            height={height}
            barColor={color}
            fadeEdges
            onStreamReady={g.alStreamListo}
            onError={g.alError}
            onStreamEnd={g.alStreamFin}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
