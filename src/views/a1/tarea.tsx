import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import type { A1Unit } from '@/content/a1/tipos';
import { speak, useTts } from '@/lib/speech';
import { metricas, totalChunks, useA1 } from '@/stores/a1';

import { AlfredBloque, Barra, ENTRADA, Eyebrow } from './alfred';
import { Cabecera } from './cabecera';
import { FraseCard } from './frase-card';

/* MISIÓN TBLT + LOGRO DE UNIDAD — port de openA1Task/paintTaskBeat/
   unitAchievement (public/js/a1-office.js:1562-1672).

   Acá se cierra el trato: Alfred plantea la meta POR INTENCIÓN ("dile a tu
   jefa que eres nuevo"), nunca la frase en inglés. Eso obliga a RECUPERAR de
   memoria, que es lo único que de verdad fija — reconocer la frase en una
   lista no prueba nada. Cero IA: la reacción de Alfred ya está escrita, la
   escribió alguien que sabe qué decirle a un principiante.

   Y el cierre es de CAPACIDAD, no de puntos: "Ya sabes LLEGAR A LA OFICINA ✓".
   Nada de XP, nada de medallas — lo que celebra es algo que ayer no podía
   hacer y hoy sí. */

type Fase = 'intro' | 'goal' | 'reveal' | 'logro';

export function Tarea({ unit, onSalir, onPanico }: { unit: A1Unit; onSalir: () => void; onPanico: () => void }) {
  const indice = useA1((s) => s.indice);
  const { ttsOn } = useTts();

  // Solo los pasos cuya frase todavía existe en el contenido. Si el contenido
  // cambió y no queda ninguno, la misión no se puede jugar: va directo al logro.
  const pasos = useMemo(
    () => unit.task.steps.filter((st) => !!indice.chunk[st.answerChunkId]),
    [unit, indice],
  );

  const [fase, setFase] = useState<Fase>(pasos.length ? 'intro' : 'logro');
  const [i, setI] = useState(0);

  const paso = pasos[i];
  const chunk = paso ? indice.chunk[paso.answerChunkId] : undefined;
  const ultimo = i >= pasos.length - 1;

  // La misión se cierra una sola vez, incluso si se entra dos veces seguidas.
  const cerrada = useRef(false);
  useEffect(() => {
    if (fase !== 'logro' || cerrada.current) return;
    cerrada.current = true;
    useA1.getState().marcarTareaHecha(unit.task.id);
  }, [fase, unit.task.id]);

  // El modelo suena al revelarse, igual que en el loop.
  const yaSono = useRef('');
  useEffect(() => {
    if (fase !== 'reveal' || !chunk || !ttsOn) return;
    const clave = `${i}:${chunk.id}`;
    if (yaSono.current === clave) return;
    yaSono.current = clave;
    void speak(chunk.en, { trackReplay: false });
  }, [fase, i, chunk, ttsOn]);

  const m = metricas();
  const pct = Math.round((m.salen / (totalChunks() || 1)) * 100);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Cabecera
        activo={Math.min(i, Math.max(pasos.length - 1, 0))}
        total={Math.max(pasos.length, 1)}
        sub={fase === 'logro' ? undefined : 'TU MISIÓN'}
        onSalir={onSalir}
        onPanico={onPanico}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto pb-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${fase}:${i}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="flex flex-col gap-3.5"
          >
            {fase === 'intro' && (
              <>
                <TarjetaMision eyebrow="Tu misión" texto={unit.task.intro_es} />
                <AlfredBloque
                  lineas={['Sin mirar nada. Yo te digo la situación y tú sueltas la frase, de memoria.']}
                />
              </>
            )}

            {fase === 'goal' && paso && (
              <>
                <TarjetaMision eyebrow={`Situación ${i + 1}/${pasos.length}`} texto={paso.goal_es} />
                <AlfredBloque lineas={['¿Cómo se lo dices? Dale, en voz alta — de memoria.']} />
              </>
            )}

            {fase === 'reveal' && paso && chunk && (
              <>
                <FraseCard chunk={chunk} completa etiqueta="Así se decía" />
                <AlfredBloque lineas={[paso.reaction_es]} />
              </>
            )}

            {fase === 'logro' && (
              <div className="flex flex-col gap-5 pt-2">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                  className="flex flex-col items-center gap-4 text-center"
                >
                  <span aria-hidden="true" className="text-[3.2rem] leading-none">
                    🎉
                  </span>
                  <Eyebrow acento>Misión cumplida</Eyebrow>
                  <p className="font-display text-[clamp(1.5rem,7vw,2.1rem)] leading-[1.05] font-extrabold tracking-[-0.03em]">
                    {unit.task.done_es}
                  </p>
                </motion.div>

                <motion.div {...ENTRADA} className="flex flex-col gap-2">
                  <Barra pct={pct} />
                  <p className="text-[0.85rem] leading-[1.45]" style={{ color: 'var(--text-secondary)' }}>
                    {m.salen > 0 ? (
                      <>
                        Ya te salen solas <strong style={{ color: 'var(--text-primary)' }}>{m.salen}</strong>.
                      </>
                    ) : (
                      'Cada vuelta se te van pegando más.'
                    )}{' '}
                    Eso ayer no lo tenías.
                  </p>
                </motion.div>

                <AlfredBloque
                  lineas={['Eso ayer no lo tenías. Mañana seguimos y ya vas con ventaja.']}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="shrink-0 pt-1">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            if (fase === 'intro') {
              setI(0);
              setFase('goal');
            } else if (fase === 'goal') {
              setFase('reveal');
            } else if (fase === 'reveal') {
              if (ultimo) setFase('logro');
              else {
                setI((v) => v + 1);
                setFase('goal');
              }
            } else {
              onSalir();
            }
          }}
          className="inline-flex min-h-13 w-full cursor-pointer items-center justify-center rounded-full text-[0.95rem] font-bold"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          {fase === 'intro'
            ? 'Dale, la primera →'
            : fase === 'goal'
              ? 'Ya lo dije, ver ↓'
              : fase === 'reveal'
                ? ultimo
                  ? 'Cerrar la misión ✓'
                  : 'Siguiente situación →'
                : 'Seguir mañana'}
        </motion.button>
      </div>
    </div>
  );
}

function TarjetaMision({ eyebrow, texto }: { eyebrow: string; texto: string }) {
  return (
    <motion.div
      {...ENTRADA}
      className="relative overflow-hidden rounded-[24px] border px-5 py-5"
      style={{ borderColor: 'var(--borde-medio)', background: 'var(--bg-elevated)' }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-6 h-32 w-40 rounded-full opacity-35 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--aurora-2), transparent 65%)' }}
      />
      <div className="relative flex flex-col gap-2">
        <Eyebrow acento>{eyebrow}</Eyebrow>
        <p className="text-[1.05rem] leading-[1.45] font-semibold">{texto}</p>
      </div>
    </motion.div>
  );
}
