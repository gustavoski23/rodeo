import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Eye } from 'lucide-react';

import type { A1Chunk, A1Scene, A1Unit, PasoVozProps } from '@/content/a1/tipos';
import { speak, useTts } from '@/lib/speech';
import {
  barajar,
  escenasHechas,
  metricas,
  normEn,
  opcionesMcq,
  quizaCerrarEscena,
  rungDe,
  swapCorrecto,
  tareaHecha,
  useA1,
  type Clase,
  type EnCola,
  type Nota,
  type OpcionMcq,
  type Rung,
} from '@/stores/a1';

import { AlfredBloque, ENTRADA } from './alfred';
import { Cabecera } from './cabecera';
import { BotonAudio, FraseCard, Molde } from './frase-card';

/* EL LOOP — port de openA1Escena/openA1Repaso y de paintBeat
   (public/js/a1-office.js:547-950, 1229-1430).

   Un "beat" = enseñar UNA frase, en seis pasos, y un solo tap para avanzar
   (segmentación: el principiante no puede con dos cosas a la vez):

     1 ESCENA        Alfred monta la situación. CERO inglés todavía.
     2 ANTICIPACIÓN  el silencio incómodo — intentás decirlo antes de verlo.
     3 REVEAL        la frase, grande, y sonando de verdad.
     4 EL PORQUÉ     la analogía y el molde: por qué se dice así.
     5 SHADOWING     la producís en voz alta, sin nota y sin nadie oyendo.
     6 AUTOEVAL      Clavado / Casi / Todavía no — y el SRS mueve la caja.

   El paso 2 cambia de forma según la caja Leitner (el "rung"): la primera vez
   se enseña completo, pero al repasar sube de reconocer (MCQ) a completar el
   molde, a producir de memoria, a hacerlo tuyo. Misma frase, exigencia
   creciente — eso es lo que la fija.

   El paso de VOZ (A1.3) entra como paso 5b, después de producir y antes de
   autoevaluarse: primero la decís sin juez, después el micrófono opina, y la
   última palabra sigue siendo tuya. Si el workstream de voz no está montado,
   el loop queda en los seis del legacy y no se nota el hueco. */

export type Meta = { clase: Clase; scene: A1Scene | null; unit: A1Unit | null };

export type Arranque =
  | { modo: 'escena'; unit: A1Unit; scene: A1Scene; desde: number }
  | { modo: 'repaso'; cola: EnCola[] };

type Paso = 'escena' | 'anticipacion' | 'reveal' | 'porque' | 'shadowing' | 'voz' | 'autoeval';

/** Los seis del legacy, en orden. */
const ORDEN: Paso[] = ['escena', 'anticipacion', 'reveal', 'porque', 'shadowing', 'autoeval'];
/** Los mismos seis con la voz colada entre producir y autoevaluarse (A1.3). */
const ORDEN_CON_VOZ: Paso[] = [
  'escena',
  'anticipacion',
  'reveal',
  'porque',
  'shadowing',
  'voz',
  'autoeval',
];

/* Reacciones de Alfred a la autoeval. "Todavía no" es NEUTRO y reconfortante a
   propósito: modela el error, no lo castiga. Nadie vuelve a una app que lo hace
   sentir bruto. */
const REACCION: Record<Nota, string> = {
  clavado: '¡Eso! Ni mandado a hacer. Esa ya es tuya.',
  casi: 'Casi, casi. Escuchala una vez más y la repetís conmigo. Vas bien.',
  todavia:
    "Tranquilo, esa se enreda al principio. Te la repasamos pronto pa' que no se te vaya. Nadie nace sabiendo.",
};

type Run = {
  chunks: A1Chunk[];
  meta: Meta[];
  i: number;
  paso: Paso;
  fase: 'beat' | 'react' | 'done';
  rung: Rung;
  /** ¿Toca montar la escena completa? Solo la primera frase de cada escena. */
  setupAhora: boolean;
  respondido: boolean;
  elegido: string | null;
  acierto: boolean | null;
  mcq: OpcionMcq[] | null;
  cloze: string[] | null;
  nota: Nota | null;
  /** Resultado del paso de voz (A1.3). null = no hubo o se saltó. */
  vozLograda: boolean | null;
  requeued: Record<string, true>;
  setupVisto: Record<string, true>;
};

/* El cloze necesita hueco real Y fichas. El contenido lo garantiza, pero si
   algún día no, el beat cae a producir en vez de quedarse sin salida. */
function rungValido(rung: Rung, c: A1Chunk): Rung {
  if (rung === 'cloze' && (!c.frame || !c.frame.includes('___') || !c.swaps?.length)) return 'producir';
  if (rung === 'swap' && !c.frame) return 'producir';
  return rung;
}

function arrancar(a: Arranque): Run {
  const chunks = a.modo === 'escena' ? a.scene.chunks.slice() : a.cola.map((q) => q.chunk);
  const meta: Meta[] =
    a.modo === 'escena'
      ? chunks.map(() => ({ clase: 'teach' as Clase, scene: a.scene, unit: a.unit }))
      : a.cola.map((q) => {
          const ix = useA1.getState().indice;
          return { clase: q.clase, scene: ix.escenaDe[q.chunk.id] ?? null, unit: ix.unidadDe[q.chunk.id] ?? null };
        });
  const i = a.modo === 'escena' ? Math.min(Math.max(a.desde, 0), Math.max(chunks.length - 1, 0)) : 0;
  const base: Run = {
    chunks,
    meta,
    i,
    paso: 'escena',
    fase: 'beat',
    rung: 'teach',
    setupAhora: false,
    respondido: false,
    elegido: null,
    acierto: null,
    mcq: null,
    cloze: null,
    nota: null,
    vozLograda: null,
    requeued: {},
    setupVisto: {},
  };
  return entrar(base, i);
}

/* Entrar a una frase: vuelve al paso 1, recalcula el rung y decide si esta es
   la primera de su escena (la única que se presenta entera). */
function entrar(run: Run, i: number): Run {
  const c = run.chunks[i]!;
  const m = run.meta[i]!;
  const rung = rungValido(rungDe(c, m.clase), c);
  const escenaId = m.scene?.id ?? null;
  const setupAhora = !!escenaId && !run.setupVisto[escenaId];
  return {
    ...run,
    i,
    paso: 'escena',
    fase: 'beat',
    rung,
    setupAhora,
    setupVisto: escenaId ? { ...run.setupVisto, [escenaId]: true } : run.setupVisto,
    respondido: false,
    elegido: null,
    acierto: null,
    mcq: rung === 'mcq' ? opcionesMcq(c) : null,
    cloze: rung === 'cloze' ? barajar(c.swaps ?? []) : null,
    nota: null,
    vozLograda: null,
  };
}

/* ── Piezas de la pantalla ── */

function BotonPaso({
  children,
  onClick,
  variante = 'fantasma',
  icono,
}: {
  children: ReactNode;
  onClick: () => void;
  variante?: 'fantasma' | 'acento';
  icono?: ReactNode;
}) {
  const acento = variante === 'acento';
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="inline-flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-full border text-[0.95rem] font-bold"
      style={
        acento
          ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-ink)' }
          : { background: 'transparent', borderColor: 'var(--borde-medio)', color: 'var(--text-primary)' }
      }
    >
      {icono}
      {children}
    </motion.button>
  );
}

function LineaQuien({ texto }: { texto: string }) {
  if (!texto) return null;
  return (
    <span
      className="inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-[0.82rem]"
      style={{ borderColor: 'var(--borde-sutil)', background: 'var(--chip-bg)', color: 'var(--text-secondary)' }}
    >
      <span aria-hidden="true">👤</span>
      {texto}
    </span>
  );
}

export function Sesion({
  arranque,
  PasoVoz,
  onSalir,
  onPanico,
  onTarea,
}: {
  arranque: Arranque;
  /** Paso extra de producción hablada (A1.3). Sin él, el loop es de 6 pasos. */
  PasoVoz?: ComponentType<PasoVozProps>;
  onSalir: () => void;
  onPanico: () => void;
  /** La unidad quedó completa y su misión TBLT sigue pendiente. */
  onTarea: (u: A1Unit) => void;
}) {
  const [run, setRun] = useState<Run>(() => arrancar(arranque));
  const { ttsOn } = useTts();

  const c = run.chunks[run.i]!;
  const meta = run.meta[run.i]!;
  const ultima = run.i >= run.chunks.length - 1;
  const repaso = arranque.modo === 'repaso';

  /* Posición persistida (rodeo_a1_progress): recargar en mitad de una escena
     vuelve a ESTA frase, no al principio. El repaso NO la toca — sus frases
     vienen de varias escenas y pisarían el "seguí donde ibas". */
  useEffect(() => {
    if (arranque.modo !== 'escena') return;
    useA1.getState().guardarProgreso({
      unitId: arranque.unit.id,
      sceneId: arranque.scene.id,
      chunkIdx: run.i,
    });
  }, [arranque, run.i]);

  /* La frase suena sola al revelarse (el tap de "Ver la frase" ya desbloqueó el
     audio del navegador). El guard por clave evita el doble disparo de
     StrictMode: son datos que salen por la red, no un efecto gratis. */
  const yaSono = useRef('');
  useEffect(() => {
    if (run.fase !== 'beat' || run.paso !== 'reveal' || !ttsOn) return;
    const clave = `${run.i}:${c.id}`;
    if (yaSono.current === clave) return;
    yaSono.current = clave;
    void speak(c.en, { trackReplay: false });
  }, [run.fase, run.paso, run.i, c.id, c.en, ttsOn]);

  /* La secuencia del loop se decide UNA vez, según si el paso de voz llegó por
     props. Así el "PASO 4/7" y el botón de avanzar leen de la misma lista y no
     se pueden desincronizar. */
  const secuencia = PasoVoz ? ORDEN_CON_VOZ : ORDEN;

  const avanzar = useCallback(
    (desde: Paso) => {
      const idx = secuencia.indexOf(desde);
      const siguiente = secuencia[Math.min(idx + 1, secuencia.length - 1)]!;
      setRun((r) => ({ ...r, paso: siguiente }));
    },
    [secuencia],
  );

  /** Autoeval → Leitner. "Todavía no" re-encola la frase UNA vez en esta
      sesión: nadie se queda con la sensación de que se le escapó. */
  const calificarYReaccionar = useCallback(
    (nota: Nota) => {
      useA1.getState().calificar(c.id, nota);
      if (repaso) quizaCerrarEscena(meta.scene);
      setRun((r) => {
        const reencolar = nota === 'todavia' && !r.requeued[c.id];
        return {
          ...r,
          fase: 'react',
          nota,
          chunks: reencolar ? [...r.chunks, c] : r.chunks,
          meta: reencolar ? [...r.meta, meta] : r.meta,
          requeued: reencolar ? { ...r.requeued, [c.id]: true } : r.requeued,
        };
      });
    },
    [c, meta, repaso],
  );

  const finalizar = useCallback(() => {
    const st = useA1.getState();
    if (arranque.modo === 'escena') {
      st.marcarEscenaHecha(arranque.scene.id);
      // Escena cerrada: chunkIdx fuera de rango → deja de aparecer en "seguí
      // donde ibas" y al reabrirla arranca de cero.
      st.guardarProgreso({
        unitId: arranque.unit.id,
        sceneId: arranque.scene.id,
        chunkIdx: run.chunks.length,
      });
      st.actualizarRacha();
      const u = arranque.unit;
      if (escenasHechas(u) && u.task && !tareaHecha(u.task.id)) {
        onTarea(u);
        return;
      }
    } else {
      st.actualizarRacha();
    }
    setRun((r) => ({ ...r, fase: 'done' }));
  }, [arranque, run.chunks.length, onTarea]);

  /* ── Cuerpo del beat ── */
  function cuerpo(): ReactNode {
    if (run.fase === 'done') {
      // Contar acá y no en un useMemo: son 63 entradas y solo se lee en el
      // cierre, pero tiene que reflejar la nota que se acaba de dar.
      const m = metricas();
      if (repaso) {
        return (
          <AlfredBloque
            lineas={[
              'Listo, ese repaso quedó. Cada vuelta se te pega más, parce.',
              m.salen > 0
                ? `Ya llevás ${m.salen}${m.salen === 1 ? ' frase que te sale sola.' : ' frases que te salen solas.'}`
                : 'Volvé mañana y seguimos; así es como se pegan.',
            ]}
          />
        );
      }
      return (
        <AlfredBloque
          lineas={[
            'Listo, esa escena la sacaste. Eso hace un rato no lo tenías.',
            'Volvé cuando querás y seguimos con la próxima, sin afán.',
          ]}
        />
      );
    }

    if (run.fase === 'react') {
      return (
        <>
          {run.nota === 'clavado' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: [0.9, 1.04, 1], opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex justify-center"
            >
              {/* Celebración ADULTA: una insignia lima, sin confeti. */}
              <span
                aria-hidden="true"
                className="inline-flex size-14 items-center justify-center rounded-full"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
              >
                <Check className="size-7" strokeWidth={3} />
              </span>
            </motion.div>
          )}
          <AlfredBloque lineas={[REACCION[run.nota ?? 'clavado']]} />
        </>
      );
    }

    switch (run.paso) {
      /* ── 1 · ESCENA ─────────────────────────────────────────────────── */
      case 'escena': {
        if (repaso && meta.clase === 'due') {
          return (
            <AlfredBloque
              lineas={[
                'Ojo, esta ya nos la habíamos cruzado. Repaso de pasillo, pues.',
                meta.scene?.title_es
                  ? `La de «${meta.scene.title_es}». A ver si todavía te sale, sin mirar.`
                  : 'A ver si todavía te sale, sin mirar.',
              ]}
            />
          );
        }
        const escena = meta.scene;
        return (
          <>
            {escena?.scene_es && (
              <motion.p
                {...ENTRADA}
                className="text-[1.05rem] leading-[1.5] font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {escena.icon} {escena.scene_es}
              </motion.p>
            )}
            {run.setupAhora && escena ? (
              <AlfredBloque lineas={[...escena.setup_es, escena.analogy_es]} />
            ) : (
              <AlfredBloque lineas={['Seguimos en la misma. Va otra que te sirve un montón.']} />
            )}
          </>
        );
      }

      /* ── 2 · ANTICIPACIÓN (su forma la decide la caja) ───────────────── */
      case 'anticipacion':
        // Se llaman como funciones, NO como <Mcq />: un componente declarado
        // dentro del render cambia de identidad en cada pintada y React lo
        // desmontaría entero — las burbujas volverían a entrar animándose cada
        // vez que se toca una ficha.
        if (run.rung === 'mcq') return mcq();
        if (run.rung === 'cloze') return cloze();
        if (run.rung === 'swap') {
          return (
            <>
              <AlfredBloque
                lineas={[
                  'Esta ya te sale. Ahora hacela tuya: cambiá la pieza por lo que sea TU caso.',
                  'Mirá el molde, decilo en voz alta con lo tuyo. Después te muestro el ejemplo.',
                ]}
              />
              <Molde chunk={c} titulo="Tu molde" />
            </>
          );
        }
        return (
          <AlfredBloque
            lineas={[
              run.rung === 'producir'
                ? `Esta ya la conocés. ¿Cómo era pa' decir «${c.es}»? De memoria, sin mirar.`
                : `A ver… querés decir «${c.es}». ¿Cómo suena en inglés?`,
              'Probá en voz alta, como te salga. Nadie te oye — ese es el punto.',
            ]}
          />
        );

      /* ── 3 · REVEAL + AUDIO ─────────────────────────────────────────── */
      case 'reveal':
        return (
          <>
            <FraseCard chunk={c} completa />
            {!ttsOn && (
              <AlfredBloque
                lineas={[
                  'Acá tu celu no la dice en voz alta, pero léela como está en «suena». Igual funciona, tranquilo.',
                ]}
              />
            )}
          </>
        );

      /* ── 4 · EL PORQUÉ ──────────────────────────────────────────────── */
      case 'porque':
        return (
          <>
            <AlfredBloque lineas={[c.why_es]} />
            <Molde chunk={c} />
            {c.cognateHook_es && (
              <motion.p
                {...ENTRADA}
                className="rounded-[18px] border px-4 py-3 text-[0.86rem] leading-[1.45]"
                style={{
                  borderColor: 'color-mix(in oklch, var(--warn) 35%, transparent)',
                  background: 'color-mix(in oklch, var(--warn) 10%, transparent)',
                  color: 'var(--text-secondary)',
                }}
              >
                {c.cognateHook_es}
              </motion.p>
            )}
            <LineaQuien texto={c.who_es} />
          </>
        );

      /* ── 5 · SHADOWING ──────────────────────────────────────────────── */
      case 'shadowing':
        return (
          <>
            <AlfredBloque
              lineas={['Ahora vos. Repetila en voz alta, como suena. Nadie te oye, dale sin pena.']}
            />
            <FraseCard chunk={c} />
            {ttsOn && (
              <div className="flex justify-center">
                <BotonAudio en={c.en} tamano={52} tono="claro" />
              </div>
            )}
          </>
        );

      /* ── 5b · VOZ (A1.3) ────────────────────────────────────────────── */
      case 'voz':
        if (!PasoVoz) return null;
        return (
          <>
            <AlfredBloque lineas={['Dale, decila una vez más y yo te escucho. Sin pena que esto no es examen.']} />
            <PasoVoz
              chunk={c}
              onResultado={(r) => setRun((prev) => ({ ...prev, vozLograda: r.logrado, paso: 'autoeval' }))}
              onSaltar={() => setRun((prev) => ({ ...prev, vozLograda: null, paso: 'autoeval' }))}
            />
          </>
        );

      /* ── 6 · AUTOEVAL ───────────────────────────────────────────────── */
      case 'autoeval':
        return (
          <>
            <AlfredBloque
              lineas={[
                '¿Y qué tal? ¿Te salió?',
                run.vozLograda === true
                  ? 'Te oí y te salió. Igual vos sos quien sabe cómo lo sentiste.'
                  : run.vozLograda === false
                    ? 'Tranquilo, el micrófono no es juez. Vos decís cómo te fue.'
                    : null,
              ]}
            />
            <div className="flex flex-col gap-2.5">
              {(
                [
                  ['clavado', 'Clavado', '✓'],
                  ['casi', 'Casi', '~'],
                  ['todavia', 'Todavía no', '↺'],
                ] as const
              ).map(([nota, etiqueta, signo]) => (
                <motion.button
                  key={nota}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => calificarYReaccionar(nota)}
                  className="inline-flex min-h-13 w-full cursor-pointer items-center justify-between rounded-full border px-5 text-[0.95rem] font-semibold"
                  style={
                    nota === 'clavado'
                      ? {
                          borderColor: 'color-mix(in oklch, var(--accent) 45%, transparent)',
                          background: 'var(--accent-dim)',
                          color: 'var(--accent)',
                        }
                      : {
                          borderColor: 'var(--borde-sutil)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                        }
                  }
                >
                  {etiqueta}
                  <span aria-hidden="true" style={{ color: 'var(--text-muted)' }}>
                    {signo}
                  </span>
                </motion.button>
              ))}
            </div>
          </>
        );
    }
  }

  /* ── PASO 2 · Reconocer (MCQ) ── */
  function mcq(): ReactNode {
    const opciones = run.mcq ?? [];
    return (
      <>
        <AlfredBloque lineas={[`Esta ya la viste. ¿Cuál era pa' decir «${c.es}»? Sin mirar.`]} />
        <div className="flex flex-col gap-2.5">
          {opciones.map((o) => {
            // Al responder se marca SIEMPRE la correcta, no solo el error: lo que
            // hay que recordar mañana es la buena.
            const marcada = run.respondido && o.correcta;
            const fallada = run.respondido && !o.correcta && run.elegido === o.text;
            return (
              <motion.button
                key={o.text}
                type="button"
                whileTap={{ scale: run.respondido ? 1 : 0.98 }}
                disabled={run.respondido}
                onClick={() =>
                  setRun((r) => ({ ...r, respondido: true, elegido: o.text, acierto: o.correcta }))
                }
                className="font-display min-h-14 w-full cursor-pointer rounded-[20px] border px-4 py-3 text-left text-[1.05rem] font-bold tracking-[-0.02em] disabled:cursor-default"
                style={
                  marcada
                    ? {
                        borderColor: 'var(--accent)',
                        background: 'var(--accent-dim)',
                        color: 'var(--accent)',
                      }
                    : fallada
                      ? {
                          borderColor: 'var(--borde-medio)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-muted)',
                          textDecoration: 'line-through',
                        }
                      : {
                          borderColor: 'var(--borde-sutil)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                        }
                }
              >
                {o.text}
              </motion.button>
            );
          })}
        </div>
        {run.respondido && (
          <AlfredBloque
            lineas={[
              run.acierto
                ? '¡Eso! Esa era. La tenés fresca.'
                : 'Casi. Era la que quedó marcada — tranquilo, ya te la refresco.',
            ]}
          />
        )}
      </>
    );
  }

  /* ── PASO 2 · Completar (cloze) ── */
  function cloze(): ReactNode {
    const correcta = swapCorrecto(c);
    const fichas = run.cloze ?? [];
    const partes = String(c.frame).split('___');
    return (
      <>
        <AlfredBloque lineas={['Completá el hueco. ¿Cuál ficha va acá?']} />
        <div
          className="rounded-[20px] border px-4 py-5"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--borde-sutil)' }}
        >
          <p className="font-display text-[1.35rem] leading-[1.25] font-bold tracking-[-0.02em]">
            {partes[0]}
            <span
              className="mx-1 inline-block rounded-lg px-2 py-0.5"
              style={
                run.respondido
                  ? run.acierto
                    ? { background: 'var(--accent-dim)', color: 'var(--accent)' }
                    : { background: 'var(--danger-dim)', color: 'var(--danger)' }
                  : { background: 'var(--chip-bg-fuerte)', color: 'var(--text-muted)' }
              }
            >
              {run.respondido ? run.elegido : '•••'}
            </span>
            {partes[1]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {fichas.map((s) => (
            <motion.button
              key={s}
              type="button"
              whileTap={{ scale: run.respondido ? 1 : 0.96 }}
              disabled={run.respondido}
              onClick={() =>
                setRun((r) => ({
                  ...r,
                  respondido: true,
                  elegido: s,
                  acierto: normEn(s) === normEn(correcta),
                }))
              }
              className="min-h-11 cursor-pointer rounded-full border px-4 text-[0.9rem] disabled:cursor-default"
              style={
                run.respondido && s === correcta
                  ? { borderColor: 'var(--accent)', background: 'var(--accent-dim)', color: 'var(--accent)' }
                  : { borderColor: 'var(--borde-sutil)', background: 'var(--chip-bg)', color: 'var(--text-primary)' }
              }
            >
              {s}
            </motion.button>
          ))}
        </div>
        {run.respondido && (
          <AlfredBloque
            lineas={[
              run.acierto
                ? '¡Eso! Esa pieza va ahí. Así se arma el molde.'
                : `Casi. La que iba es «${correcta}». Fresco, pa' eso repasamos.`,
            ]}
          />
        )}
      </>
    );
  }

  /* ── Pie: qué botón toca según dónde estás ── */
  function pie(): ReactNode {
    if (run.fase === 'done') {
      return (
        <BotonPaso variante="acento" onClick={onSalir}>
          Volver al inicio
        </BotonPaso>
      );
    }
    if (run.fase === 'react') {
      const etiqueta = ultima ? (repaso ? 'Cerrar el repaso ✓' : 'Cerrar la escena ✓') : 'Siguiente frase →';
      return (
        <BotonPaso variante="acento" onClick={() => (ultima ? finalizar() : setRun((r) => entrar(r, r.i + 1)))}>
          {etiqueta}
        </BotonPaso>
      );
    }
    switch (run.paso) {
      case 'escena':
        return <BotonPaso onClick={() => avanzar('escena')}>Dale ↓</BotonPaso>;
      case 'anticipacion':
        if (run.rung === 'mcq' || run.rung === 'cloze') {
          if (!run.respondido) return null; // no hay salida hasta que responda
          return (
            <BotonPaso variante="acento" onClick={() => avanzar('anticipacion')}>
              {run.rung === 'mcq' ? 'Ver bien la frase ↓' : 'Ver la frase entera ↓'}
            </BotonPaso>
          );
        }
        if (run.rung === 'swap') {
          return (
            <BotonPaso variante="acento" onClick={() => avanzar('anticipacion')}>
              Ya lo dije, ver ejemplo ↓
            </BotonPaso>
          );
        }
        return (
          <BotonPaso
            variante="acento"
            icono={<Eye className="size-4" strokeWidth={2.2} aria-hidden="true" />}
            onClick={() => avanzar('anticipacion')}
          >
            Ver la frase
          </BotonPaso>
        );
      case 'reveal':
        return <BotonPaso onClick={() => avanzar('reveal')}>Seguir ↓</BotonPaso>;
      case 'porque':
        return <BotonPaso onClick={() => avanzar('porque')}>Ya, repito ↓</BotonPaso>;
      case 'shadowing':
        return (
          <BotonPaso variante="acento" onClick={() => avanzar('shadowing')}>
            Listo, la dije
          </BotonPaso>
        );
      case 'voz':
        return null; // el componente de voz trae sus propias salidas
      case 'autoeval':
        return null; // la nota ES la salida
    }
  }

  const pasoNum = secuencia.indexOf(run.paso) + 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Cabecera
        activo={Math.min(run.i, run.chunks.length - 1)}
        total={run.chunks.length}
        sub={run.fase === 'beat' ? `PASO ${pasoNum}/${secuencia.length}` : undefined}
        onSalir={onSalir}
        onPanico={onPanico}
      />

      {/* ── El beat ── */}
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto pb-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${run.i}:${run.fase}:${run.paso}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="flex flex-col gap-3.5"
          >
            {cuerpo()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="shrink-0 pt-1">{pie()}</div>
    </div>
  );
}
