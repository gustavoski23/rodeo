import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';

import { etiquetaUsuario } from '@/lib/api';
import { store } from '@/lib/storage';

/* La grabadora compartida del módulo de voz: el paso de producción y el chat de
   Alfred vivo graban exactamente igual, así que graban acá.

   La decisión que manda sobre todo el archivo: UNA SOLA petición de micrófono.
   <LiveWaveform> ya pide el stream para dibujar las barras; si además
   abriéramos nuestro propio getUserMedia, el navegador mostraría dos permisos y
   en móvil el segundo suele fallar con el primero abierto. Entonces el
   MediaRecorder se cuelga del MISMO MediaStream que el waveform nos entrega por
   `onStreamReady`. Nosotros no pedimos mic: lo recibimos.

   De ahí sale la regla que hay que respetar al usar el hook: `alStreamListo`,
   `alError` y `alStreamFin` van a las props del waveform TAL CUAL, sin envolver
   en flechas nuevas. El efecto de micrófono del waveform los tiene en su lista
   de dependencias, así que una identidad distinta en cada render lo haría
   apagar y volver a pedir el mic en bucle. Por eso son useCallback de deps
   vacías y todo el estado que necesitan vive en refs. */

export type EstadoGrabadora = 'idle' | 'grabando' | 'transcribiendo' | 'error';

/* Deepgram por el proxy corta en 3 MB. Opus a ~24 kbps son minutos de sobra,
   pero un navegador que caiga a PCM llena eso en segundos: por las dudas el
   corte automático es de 30 s, que además es más de lo que dura cualquier
   frase de A1 (y evita el audio olvidado con el mic abierto en el bolsillo). */
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_MS = 30_000;

/** El primer contenedor que soporte el navegador. Safari solo tiene mp4. */
function tipoSoportado(): string {
  const candidatos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  if (typeof MediaRecorder === 'undefined') return '';
  return candidatos.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

/* Las cabeceras HTTP son latin-1: un keyterm con acento (el modelo multi de
   Deepgram acepta español) tumbaría el fetch entero con un TypeError. Se limpia
   acá y no en el proxy porque el error explota del lado del navegador. */
function cabeceraKeyterms(keyterms: readonly string[]): string {
  return keyterms
    .join(',')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .slice(0, 900);
}

export type OpcionesGrabadora = {
  /** Términos que Deepgram debe esperar (las palabras del chunk objetivo). */
  keyterms?: readonly string[];
  /** Lo que Deepgram entendió. No se llama con transcripción vacía. */
  onTranscript: (texto: string) => void;
  /** Mensaje ya listo para pantalla; `sinMic` indica permiso/hardware. */
  onError?: (mensaje: string, sinMic: boolean) => void;
};

export function useGrabadora({ keyterms, onTranscript, onError }: OpcionesGrabadora) {
  const [estado, setEstado] = useState<EstadoGrabadora>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sinMic, setSinMic] = useState(false);

  const grabadorRef = useRef<MediaRecorder | null>(null);
  const trozosRef = useRef<BlobPart[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const cortaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vivoRef = useRef(true);

  /* El stream que nos pasó el waveform, y si todavía lo queremos.
     Los dos existen por el mismo agujero: el waveform solo apaga las pistas
     `if (streamRef.current)`, y su streamRef sigue en null mientras el diálogo
     de permiso está abierto. Si el alumno toca Saltar (o cambia de vista) con el
     diálogo abierto y DESPUÉS concede el permiso, la promesa de getUserMedia
     resuelve en el vacío: el waveform ya no va a limpiar nada y el punto rojo
     del navegador se queda prendido hasta recargar la página.

     Como `onStreamReady` nos llega igual, somos el único lugar del código que
     puede cerrar esa puerta. Por eso el stream se guarda SIEMPRE, aunque el
     turno ya no valga, y hay un ref aparte que dice si todavía lo queremos. */
  const streamRef = useRef<MediaStream | null>(null);
  const activoRef = useRef(false);

  /** Apaga el micrófono de verdad. Idempotente: parar una pista ya parada no hace nada. */
  const soltarStream = useCallback(() => {
    const s = streamRef.current;
    streamRef.current = null;
    s?.getTracks().forEach((t) => t.stop());
  }, []);

  /* Callbacks y opciones en refs: ver la nota de arriba sobre la identidad
     estable. El hook se re-renderiza a cada rato (estado) y las props del
     waveform no pueden enterarse. */
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const keytermsRef = useRef(keyterms);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    keytermsRef.current = keyterms;
  });

  const fallar = useCallback((mensaje: string, esDeMic = false) => {
    if (!vivoRef.current) return;
    setError(mensaje);
    if (esDeMic) setSinMic(true);
    setEstado('error');
    onErrorRef.current?.(mensaje, esDeMic);
  }, []);

  /* ── Transcripción ────────────────────────────────────────────────────
     POST /api/stt con el blob crudo como body (no multipart: el proxy lee el
     stream tal cual y le pasa el Content-Type a Deepgram). */
  const transcribir = useCallback(
    async (blob: Blob) => {
      if (!blob.size) return fallar('No se grabó nada — probá de nuevo');
      if (blob.size > MAX_BYTES) return fallar('Muy largo — decilo más cortito');

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const cabeceras: Record<string, string> = { 'Content-Type': blob.type || 'audio/webm' };
        const kt = cabeceraKeyterms(keytermsRef.current ?? []);
        if (kt) cabeceras['x-rodeo-keyterms'] = kt;
        // Mismo gate por PIN que /api/chat (lib/api.ts): si la instancia está
        // protegida, sin esta cabecera el proxy responde 401.
        const pass = store.get<string | null>('rodeo_pass', null);
        if (pass) cabeceras['x-rodeo-pass'] = pass;
        // Etiqueta del tester: el panel /uso agrupa el gasto de voz por persona.
        const quien = etiquetaUsuario();
        if (quien) cabeceras['x-rodeo-user'] = quien;

        const res = await fetch('/api/stt', {
          method: 'POST',
          headers: cabeceras,
          body: blob,
          signal: ctrl.signal,
        });
        const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string; detail?: string };
        if (!res.ok) throw new Error(data.detail || data.error || 'No pude escucharte');

        const texto = String(data.text ?? '').trim();
        if (!vivoRef.current) return;
        if (!texto) return fallar('No te escuché — acercate al micrófono y dale otra vez');

        setEstado('idle');
        onTranscriptRef.current(texto);
      } catch (e) {
        // Abort al desmontar: la vista ya no está, no hay a quién avisarle.
        if (ctrl.signal.aborted) return;
        fallar(e instanceof Error ? e.message : 'No pude escucharte');
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
      }
    },
    [fallar],
  );

  /* ── Ciclo de grabación ───────────────────────────────────────────────── */

  /** Va a `active` del waveform: encenderlo es lo que dispara el getUserMedia. */
  const iniciar = useCallback(() => {
    setError(null);
    trozosRef.current = [];
    activoRef.current = true;
    setEstado('grabando');
  }, []);

  /* Parar y transcribir. Detiene el MediaRecorder ANTES de que el waveform
     apague el stream: `stop()` encola el último `dataavailable` y el `stop` de
     forma síncrona, así que el audio ya está a salvo cuando React repinta y el
     waveform corta las pistas. Si nunca llegó el stream (el usuario tocó parar
     mientras el navegador todavía preguntaba por el permiso) vuelve a idle sin
     drama, en vez de quedarse esperando una transcripción que no existe. */
  const parar = useCallback(() => {
    // Ya no queremos el mic. Las pistas las apaga el waveform al repintarse
    // inactivo; acá solo importa que un stream que llegue tarde (permiso
    // concedido después de tocar parar) se encuentre con la puerta cerrada.
    activoRef.current = false;
    if (cortaRef.current) {
      clearTimeout(cortaRef.current);
      cortaRef.current = null;
    }
    const mr = grabadorRef.current;
    grabadorRef.current = null;
    if (mr && mr.state !== 'inactive') mr.stop();
    /* Doble parar en el mismo frame (mic + botón Detener disparados juntos):
       la segunda llamada encuentra mr=null y NO debe pisar 'transcribiendo'
       con 'idle' mientras el fetch a Deepgram sigue en vuelo. Solo se baja a
       idle desde 'grabando' (el caso real: parar con el permiso aún abierto). */
    setEstado((prev) => (mr ? 'transcribiendo' : prev === 'grabando' ? 'idle' : prev));
  }, []);

  const alStreamListo = useCallback(
    (stream: MediaStream) => {
      // Se guarda ANTES de cualquier guard: aunque este stream ya no sirva,
      // alguien tiene que poder apagarlo, y ese alguien es soltarStream().
      streamRef.current = stream;

      /* Puede llegar tarde: el alumno tardó en dar el permiso y mientras tanto
         canceló o se fue de la vista. Sin este guard arrancaríamos a grabar en
         una vista muerta — y sin soltar el stream dejaríamos el mic prendido. */
      if (!vivoRef.current || !activoRef.current) {
        soltarStream();
        return;
      }

      try {
        const tipo = tipoSoportado();
        const mr = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
        mr.ondataavailable = (e) => {
          if (e.data.size) trozosRef.current.push(e.data);
        };
        mr.onstop = () => {
          const blob = new Blob(trozosRef.current, { type: mr.mimeType || tipo || 'audio/webm' });
          trozosRef.current = [];
          if (vivoRef.current) void transcribir(blob);
        };
        grabadorRef.current = mr;
        mr.start();

        // Corte de seguridad: pasa por parar() y no por mr.stop() a secas, para
        // que la UI se entere y salga de "Escuchando". Se limpia en parar().
        cortaRef.current = setTimeout(parar, MAX_MS);
      } catch {
        fallar('Tu navegador no deja grabar audio — usá Chrome', true);
      }
    },
    // Todas son useCallback de deps vacías: la identidad de alStreamListo
    // no cambia nunca, que es justo lo que el waveform necesita.
    [transcribir, parar, fallar, soltarStream],
  );

  /** Tirar la toma: ni transcribe ni avisa. Para cerrar la vista o reintentar. */
  const cancelar = useCallback(() => {
    activoRef.current = false;
    if (cortaRef.current) {
      clearTimeout(cortaRef.current);
      cortaRef.current = null;
    }
    const mr = grabadorRef.current;
    grabadorRef.current = null;
    if (mr) {
      mr.onstop = null;
      mr.ondataavailable = null;
      if (mr.state !== 'inactive') mr.stop();
    }
    trozosRef.current = [];
    abortRef.current?.abort();
    abortRef.current = null;
    // Saltar el paso apaga el micrófono en el acto, sin esperar al repintado
    // del waveform: el punto rojo del navegador tiene que irse con el gesto.
    soltarStream();
    setEstado('idle');
    setError(null);
  }, [soltarStream]);

  /* Va a `onError` del waveform: es la ÚNICA vía por la que nos enteramos de
     que getUserMedia falló (permiso denegado, sin mic, o pestaña sin https).

     El parámetro es una unión y no `Error` a secas por un detalle del tipo de
     <LiveWaveform>: sus props son `HTMLAttributes<HTMLDivElement> & { onError:
     (e: Error) => void }`, y esa intersección exige un handler que sirva para
     las DOS firmas — la del div y la suya. El componente es de librería y no se
     toca (contrato de exactitud), así que el que cede es este lado. En la
     práctica solo llega el Error; el resto se ignora. */
  const alError = useCallback((e: Error | SyntheticEvent) => {
    const nombre = e instanceof Error ? e.name : '';
    const denegado = nombre === 'NotAllowedError' || nombre === 'SecurityError';
    const sinHardware = nombre === 'NotFoundError' || nombre === 'OverconstrainedError';
    fallar(
      denegado
        ? 'No me diste permiso del micrófono. Podés seguir sin hablar.'
        : sinHardware
          ? 'No encuentro micrófono en este aparato.'
          : 'No pude abrir el micrófono.',
      true,
    );
  }, [fallar]);

  /** Va a `onStreamEnd`. El waveform ya soltó el mic; si quedaba algo grabando
      (el usuario cambió de vista), se descarta en vez de mandar medio audio. */
  const alStreamFin = useCallback(() => {
    // El waveform ya paró las pistas: nuestra copia sobra y guardarla solo
    // serviría para intentar apagar dos veces un mic que ya está apagado.
    streamRef.current = null;
    if (grabadorRef.current && !vivoRef.current) {
      grabadorRef.current.onstop = null;
      grabadorRef.current = null;
    }
  }, []);

  /* Cierre limpio: al desmontar se corta la grabación Y el fetch en vuelo. Sin
     esto, salir de la escena mientras Deepgram responde deja un setState sobre
     un componente muerto y, peor, el mic encendido. */
  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
      activoRef.current = false;
      if (cortaRef.current) clearTimeout(cortaRef.current);
      const mr = grabadorRef.current;
      grabadorRef.current = null;
      if (mr) {
        mr.onstop = null;
        mr.ondataavailable = null;
        if (mr.state !== 'inactive') mr.stop();
      }
      abortRef.current?.abort();
      abortRef.current = null;
      // Y el mic. Si el stream ya está acá lo apagamos nosotros; si todavía
      // viene en camino, lo apaga el guard de alStreamListo cuando aterrice.
      soltarStream();
    };
  }, [soltarStream]);

  return {
    estado,
    error,
    /** true si el fallo fue de permiso/hardware: ya no tiene sentido reintentar. */
    sinMic,
    grabando: estado === 'grabando',
    procesando: estado === 'transcribiendo',
    iniciar,
    parar,
    cancelar,
    /** Estas tres van a <LiveWaveform> tal cual — no las envuelvas. */
    alStreamListo,
    alError,
    alStreamFin,
  };
}

/* ── Color de las barras del waveform ─────────────────────────────────────
   El canvas no entiende `var(--accent)`: lo que se le pasa a fillStyle tiene
   que ser un color ya resuelto. Se lee el token del <html> y se vuelve a leer
   cuando cambia el tema, porque en claro el acento es una lima mucho más
   oscura y las barras quedarían invisibles sobre el papel. */
export function useColorToken(nombre: string, fallback: string): string {
  const leer = useCallback(() => {
    if (typeof window === 'undefined') return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
    return v || fallback;
  }, [nombre, fallback]);

  const [color, setColor] = useState(leer);

  useEffect(() => {
    // El toggle de tema pone data-theme en <html> (ver lib/theme.ts).
    const obs = new MutationObserver(() => setColor(leer()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    setColor(leer());
    return () => obs.disconnect();
  }, [leer]);

  return color;
}
