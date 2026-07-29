import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

import {
  TranscriptViewerAudio,
  TranscriptViewerContainer,
  TranscriptViewerPlayPauseButton,
  TranscriptViewerScrubBar,
  TranscriptViewerWords,
  type CharacterAlignmentResponseModel,
} from '@/components/elevenlabs/transcript-viewer';
import { pedirTTS, type VozId } from '@/lib/speech';

/* Transcripto: una frase con su audio TTS y el resaltado palabra-por-palabra
   del TranscriptViewer de ElevenLabs, sincronizado a la reproducción.

   Honestidad técnica: Aura-2 (nuestro TTS) NO devuelve alignment de verdad,
   así que los tiempos por carácter se ESTIMAN — reparto lineal sobre la
   duración real del MP3, que se conoce al cargar los metadatos. Para frases
   cortas (chunks de A1, respuestas del coach) el error es de decenas de ms y
   el karaoke se siente correcto; cuando tengamos timings reales de Deepgram
   (words[] del STT) se enchufan aquí sin tocar a los consumidores. */

/** Duración estimada mientras no llegan los metadatos: ~55 ms por carácter
    (ritmo tranquilo de Aura-2 en frases de curso). Solo afecta al primer
    pintado; con la duración real todo se re-escala. */
const MS_POR_CARACTER = 55;

function alinearLineal(texto: string, duracionS: number): CharacterAlignmentResponseModel {
  const chars = Array.from(texto);
  const paso = chars.length ? duracionS / chars.length : 0;
  return {
    characters: chars,
    characterStartTimesSeconds: chars.map((_, i) => i * paso),
    characterEndTimesSeconds: chars.map((_, i) => (i + 1) * paso),
  };
}

export function Transcripto({ texto, voz, className }: { texto: string; voz?: VozId; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  const [duracion, setDuracion] = useState((texto.length * MS_POR_CARACTER) / 1000);
  const urlRef = useRef<string | null>(null);

  /* El audio se pide UNA vez por texto y vive como object URL: el <audio> del
     viewer necesita un src de verdad (seek, scrub), no un ArrayBuffer. */
  useEffect(() => {
    let vivo = true;
    setSrc(null);
    setFallo(false);
    void pedirTTS(texto, voz)
      .then((ab) => {
        if (!vivo) return;
        const url = URL.createObjectURL(new Blob([ab], { type: 'audio/mpeg' }));
        urlRef.current = url;
        setSrc(url);
      })
      .catch(() => {
        if (vivo) setFallo(true);
      });
    return () => {
      vivo = false;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [texto, voz]);

  const alignment = useMemo(() => alinearLineal(texto, duracion), [texto, duracion]);

  if (fallo) return null; // sin voz no hay karaoke; el texto plano ya está en pantalla
  if (!src) {
    return (
      <div className={className} aria-hidden="true">
        <Loader2 className="mx-auto size-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    );
  }

  return (
    <TranscriptViewerContainer
      audioSrc={src}
      audioType="audio/mpeg"
      alignment={alignment}
      className={className}
      /* La duración real del MP3 re-escala la estimación: el karaoke queda
         clavado al audio aunque Aura-2 hable más lento de lo previsto. */
      /* La firma es unión (número del hook ∩ handler del div, mismo caso que
         el onError del waveform): solo interesa el número. */
      onDurationChange={(d) => {
        if (typeof d === 'number' && Number.isFinite(d) && d > 0) setDuracion(d);
      }}
    >
      <TranscriptViewerAudio />
      <TranscriptViewerWords className="text-[1.02rem] leading-[1.6]" />
      <div className="flex items-center gap-3">
        <TranscriptViewerPlayPauseButton variant="ghost" size="icon-sm" />
        <TranscriptViewerScrubBar />
      </div>
    </TranscriptViewerContainer>
  );
}
