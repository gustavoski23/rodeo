import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, RotateCcw, SkipForward } from 'lucide-react';

import { LiveWaveform } from '@/components/elevenlabs/live-waveform';
import { MicButton } from '@/components/rodeo/mic-button';
import type { PasoVozProps, ResultadoVoz } from '@/content/a1/tipos';

import { compararProduccion } from './comparar';
import { useColorToken, useGrabadora } from './use-grabadora';

/* PASO DE VOZ — el momento en que el principiante DICE la frase.

   Es el paso más frágil del loop entero: es la primera vez que alguien que
   lleva veinte años diciendo "no sé inglés" abre la boca en inglés. Todo lo de
   acá está puesto para que ese momento no duela.

   Tres decisiones que vienen de ahí:

   1. Nunca se queda encerrado. "Saltar" está SIEMPRE en pantalla, desde el
      primer segundo, con el mismo peso visual que el mic. Si no hay micrófono,
      si negó el permiso, si está en el bus — se salta y sigue. El paso cuenta
      como visto, nunca como fallado (lo decide el loop, ver PasoVozProps).

   2. El fallo no dice "mal". Dice qué faltó y ofrece otra toma. Tres intentos,
      y a la tercera se pasa igual: insistir una cuarta vez ya no es práctica,
      es castigo.

   3. La transcripción cruda se muestra SIEMPRE, salga o no. Es la prueba de que
      la app lo escuchó de verdad y no está adivinando — y cuando Deepgram se
      equivoca, verlo escrito le explica el "casi" mucho mejor que cualquier
      mensaje nuestro. */

const MAX_INTENTOS = 3;

/* Reacciones de Alfred al acierto. Se rota para que la tercera frase seguida no
   suene a máquina — el viejo hacía lo mismo con las reacciones del SRS. */
const BIEN = [
  '¡Eso! Así se dice.',
  'Clavado. Igualito.',
  'Ahí está, te salió.',
  'Perfecto, eso mismo.',
];

/* El "casi": ni felicita ni regaña, señala y devuelve la pelota. */
const CASI = ['Casi. Te comiste algo:', 'Ahí vamos, pero faltó:', 'Cerquita. Se te fue:'];

type Fase =
  | { tipo: 'listo' }
  | { tipo: 'resultado'; r: ResultadoVoz; intento: number };

export function PasoVoz({ chunk, onResultado, onSaltar }: PasoVozProps) {
  const [fase, setFase] = useState<Fase>({ tipo: 'listo' });
  const intentosRef = useRef(0);
  const barColor = useColorToken('--accent', '#d99c66');

  /* Los keyterms son las palabras de la frase objetivo: Deepgram Nova-3 las usa
     para inclinarse hacia ellas al transcribir. Es exactamente lo que queremos
     acá — no estamos transcribiendo un discurso libre, sabemos qué debería
     estar diciendo, y ese sesgo perdona el acento en vez de castigarlo. */
  const keyterms = chunk.en.split(/\s+/).filter(Boolean);

  const alTranscript = useCallback(
    (texto: string) => {
      const r = compararProduccion(chunk, texto);
      intentosRef.current += 1;
      setFase({ tipo: 'resultado', r, intento: intentosRef.current });
    },
    [chunk],
  );

  const grab = useGrabadora({ keyterms, onTranscript: alTranscript });

  const reintentar = useCallback(() => {
    grab.cancelar();
    setFase({ tipo: 'listo' });
  }, [grab]);

  const continuar = useCallback(
    (r: ResultadoVoz) => {
      grab.cancelar();
      onResultado(r);
    },
    [grab, onResultado],
  );

  const saltar = useCallback(() => {
    grab.cancelar();
    onSaltar();
  }, [grab, onSaltar]);

  const resultado = fase.tipo === 'resultado' ? fase : null;
  const agotado = !!resultado && !resultado.r.logrado && resultado.intento >= MAX_INTENTOS;
  // Sin mic no hay nada que reintentar: la única salida honesta es saltar.
  const bloqueadoPorMic = grab.sinMic;

  return (
    <div className="flex flex-col gap-4">
      {/* ── La frase objetivo ─────────────────────────────────────────────
          Sigue en pantalla mientras graba: leer y hablar a la vez es
          justamente lo que hace un principiante, y taparla sería una prueba
          de memoria que este paso no está midiendo. */}
      <div
        className="rounded-[18px] border px-[18px] py-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--borde-sutil)' }}
      >
        <p className="text-[1.28rem] leading-[1.35] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {chunk.en}
        </p>
        <p className="mt-1.5 text-[0.94rem] leading-[1.45]" style={{ color: 'var(--text-secondary)' }}>
          {chunk.es}
        </p>
        {/* La muleta de pronunciación en ortografía española: la única forma de
            que alguien sin fonética sepa por dónde empezar. */}
        <p className="mt-2 font-mono text-[0.76rem] tracking-[0.04em]" style={{ color: 'var(--accent)' }}>
          {chunk.sounds_es}
        </p>
      </div>

      {/* ── Onda ────────────────────────────────────────────────────────────
          Montada siempre (no dentro de un condicional): el waveform pide el mic
          en un efecto atado a `active`, y desmontar el componente entero entre
          tomas obligaría a un permiso nuevo en cada intento. Las tres props de
          stream van tal cual desde el hook, con identidad estable. */}
      <div
        className="overflow-hidden rounded-[16px] border px-3"
        style={{
          background: 'var(--superficie-t)',
          borderColor: grab.grabando ? 'color-mix(in oklch, var(--accent) 34%, transparent)' : 'var(--borde-sutil)',
        }}
      >
        <LiveWaveform
          active={grab.grabando}
          processing={grab.procesando}
          mode="scrolling"
          height={64}
          barColor={barColor}
          onStreamReady={grab.alStreamListo}
          onStreamEnd={grab.alStreamFin}
          onError={grab.alError}
        />
      </div>

      {/* ── Estado en una línea ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {grab.procesando && (
          <motion.p
            key="procesando"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-live="polite"
            className="text-center font-mono text-[0.66rem] font-bold tracking-[0.14em] uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Escuchando lo que dijiste…
          </motion.p>
        )}

        {grab.error && !resultado && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="rounded-[14px] border px-[15px] py-3 text-[0.88rem] leading-[1.45]"
            style={{
              background: 'var(--danger-dim)',
              borderColor: 'color-mix(in oklch, var(--danger) 30%, transparent)',
              color: 'var(--text-primary)',
            }}
          >
            {grab.error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Veredicto ───────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {resultado && (
          <motion.div
            key={`r-${resultado.intento}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            role="status"
            aria-live="polite"
            className="rounded-[16px] border px-[16px] py-3.5"
            style={
              resultado.r.logrado
                ? {
                    background: 'var(--accent-dim)',
                    borderColor: 'color-mix(in oklch, var(--accent) 36%, transparent)',
                  }
                : { background: 'var(--superficie-t)', borderColor: 'var(--borde-medio)' }
            }
          >
            {resultado.r.logrado ? (
              <p
                className="flex items-center gap-2 text-[1rem] font-semibold"
                style={{ color: 'var(--accent)' }}
              >
                <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                {BIEN[(resultado.intento - 1) % BIEN.length]}
              </p>
            ) : (
              <>
                <p className="text-[0.98rem] leading-[1.5]" style={{ color: 'var(--text-primary)' }}>
                  {CASI[(resultado.intento - 1) % CASI.length]}
                </p>
                {/* Las faltantes en fichas: se leen de un vistazo, que es todo
                    lo que hace falta antes de la próxima toma. */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {resultado.r.faltantes.map((f) => (
                    <span
                      key={f}
                      className="rounded-full border px-2.5 py-1 font-mono text-[0.74rem] font-bold"
                      style={{
                        background: 'var(--danger-dim)',
                        borderColor: 'color-mix(in oklch, var(--danger) 30%, transparent)',
                        color: 'var(--texto-mal)',
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Lo que la app oyó, tal cual. Prueba de que escucha de verdad. */}
            <p className="mt-2.5 text-[0.8rem] leading-[1.4]" style={{ color: 'var(--text-muted)' }}>
              Te oí: “{resultado.r.transcript}”
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Controles ───────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3">
        {resultado ? (
          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            {/* Logrado o sin intentos: seguir. Si le salió, el botón es lima y
                es lo único que se ve — nadie quiere elegir después de un logro. */}
            {(resultado.r.logrado || agotado) && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => continuar(resultado.r)}
                className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full border-0 px-5 py-3 text-[0.92rem] font-bold"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
              >
                Seguir
              </motion.button>
            )}
            {!resultado.r.logrado && !agotado && !bloqueadoPorMic && (
              <>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={reintentar}
                  className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-0 px-5 py-3 text-[0.92rem] font-bold"
                  style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                >
                  <RotateCcw size={16} strokeWidth={2.2} aria-hidden="true" />
                  Otra vez ({MAX_INTENTOS - resultado.intento} {MAX_INTENTOS - resultado.intento === 1 ? 'queda' : 'quedan'})
                </motion.button>
                {/* Salida también desde el "casi": obligarlo a repetir tres
                    veces algo que no le sale es la receta para que cierre. */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => continuar(resultado.r)}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border px-4 py-3 text-[0.88rem] font-semibold"
                  style={{ borderColor: 'var(--borde-medio)', background: 'transparent', color: 'var(--text-primary)' }}
                >
                  Dejarlo así
                </motion.button>
              </>
            )}
          </div>
        ) : (
          <MicButton
            recording={grab.grabando}
            onToggle={grab.grabando ? grab.parar : grab.iniciar}
            disabled={grab.procesando || bloqueadoPorMic}
            /* Sin chip ES/EN: acá el idioma no se elige, la frase objetivo es
               en inglés y punto. Mostrar el toggle sería ofrecer una decisión
               que no existe. */
            showChip={false}
          />
        )}

        {/* SIEMPRE visible, en cualquier fase. Ver nota 1 de la cabecera. */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={saltar}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-[0.82rem] font-semibold"
          style={{ background: 'transparent', color: bloqueadoPorMic ? 'var(--accent)' : 'var(--text-muted)' }}
        >
          <SkipForward size={15} strokeWidth={2} aria-hidden="true" />
          {bloqueadoPorMic ? 'Seguir sin hablar' : 'Saltar este paso'}
        </motion.button>
      </div>
    </div>
  );
}
