import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Eye } from 'lucide-react';

import type { A1Chunk, PasoVozProps } from '@/content/a1/tipos';
import type { A1SceneRuta, A1UnitRuta, NodeKind } from '@/content/a1/tipos-ruta';
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

import { AlfredBloque, ENTRADA, Eyebrow } from './alfred';
import { Cabecera } from './cabecera';
import { BotonAudio, FraseCard, Molde } from './frase-card';

/* EL LOOP — port de openA1Escena/openA1Repaso y de paintBeat
   (public/js/a1-office.js:547-950, 1229-1430).

   Un "beat" = enseñar UNA frase, en seis pasos, y un solo tap para avanzar
   (segmentación: el principiante no puede con dos cosas a la vez):

     1 ESCENA        Alfred monta la situación. CERO inglés todavía.
     2 ANTICIPACIÓN  el silencio incómodo — intentas decirlo antes de verlo.
     3 REVEAL        la frase, grande, y sonando de verdad.
     4 EL PORQUÉ     la analogía y el molde: por qué se dice así.
     5 SHADOWING     la produces en voz alta, sin nota y sin nadie oyendo.
     6 AUTOEVAL      Clavado / Casi / Todavía no — y el SRS mueve la caja.

   El paso 2 cambia de forma según la caja Leitner (el "rung"): la primera vez
   se enseña completo, pero al repasar sube de reconocer (MCQ) a completar el
   molde, a producir de memoria, a hacerlo tuyo. Misma frase, exigencia
   creciente — eso es lo que la fija.

   El paso de VOZ (A1.3) entra como paso 5b, después de producir y antes de
   autoevaluarse: primero la dices sin juez, después el micrófono opina, y la
   última palabra sigue siendo tuya. Si el workstream de voz no está montado,
   el loop queda en los seis del legacy y no se nota el hueco.

   ── LOS NODOS CORTOS DEL TRAMO 0 ────────────────────────────────────────
   El loop de arriba no puede correr para una palabra suelta: anticipación +
   reveal + porqué + shadowing + voz + autoeval para enseñar "taxi" es una
   ceremonia absurda para algo que se resuelve en cinco segundos. Con diez
   palabras por escena serían setenta taps para aprender diez cognados.

   Por eso la SECUENCIA es un valor POR BEAT y no por sesión: sale del
   `nodeKind` de la escena de ese beat. Tiene que ser por beat porque en modo
   repaso la cola mezcla escenas de distinto tipo — una palabra del Tramo 0 y
   una frase de la oficina pueden caer seguidas.

   Si el nodeKind falta o no se reconoce, cae al loop de siempre. Nadie tiene
   que acordarse de apagar nada. */

export type Meta = { clase: Clase; scene: A1SceneRuta | null; unit: A1UnitRuta | null };

export type Arranque =
  | { modo: 'escena'; unit: A1UnitRuta; scene: A1SceneRuta; desde: number }
  | { modo: 'repaso'; cola: EnCola[] };

type Paso =
  | 'escena'
  | 'anticipacion'
  | 'reveal'
  | 'porque'
  | 'shadowing'
  | 'voz'
  | 'autoeval'
  /** Tarjeta de palabra suelta: la ves, suena, la repetís, siguiente. */
  | 'palabra'
  /** El par mínimo del fonema ("very" ≠ "berry"), con los dos audios. */
  | 'par';

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

/** El nodeKind de la escena de este beat, saneado. */
function nodoDe(m: Meta): NodeKind {
  const k = m.scene?.nodeKind;
  return k === 'palabras' || k === 'sonido' ? k : 'escena';
}

/* ¿Este beat CIERRA la tanda de palabras? Una tanda es una corrida de beats
   'palabras' seguidos, y solo el último lleva autoeval: preguntarle "¿te
   salió?" diez veces seguidas por diez cognados es justamente la ceremonia que
   estos nodos existen para evitar. La nota que se dé al final se aplica a toda
   la tanda. */
function cierraTanda(meta: readonly Meta[], i: number): boolean {
  if (nodoDe(meta[i]!) !== 'palabras') return false;
  const sig = meta[i + 1];
  return !sig || nodoDe(sig) !== 'palabras';
}

function secuenciaDe(nodo: NodeKind, conVoz: boolean, cierra: boolean): Paso[] {
  if (nodo === 'palabras') return cierra ? ['palabra', 'autoeval'] : ['palabra'];
  /* El fonema: ves el contraste, lo oís, lo repetís, y si hay micrófono que
     opine el micrófono. Sin micrófono, autoeval como siempre. */
  if (nodo === 'sonido') {
    return conVoz ? ['par', 'shadowing', 'voz', 'autoeval'] : ['par', 'shadowing', 'autoeval'];
  }
  return conVoz ? ORDEN_CON_VOZ : ORDEN;
}

/* Reacciones de Alfred a la autoeval. "Todavía no" es NEUTRO y reconfortante a
   propósito: modela el error, no lo castiga. Nadie vuelve a una app que lo hace
   sentir bruto. */
const REACCION: Record<Nota, string> = {
  clavado: '¡Eso! Ni mandado a hacer. Esa ya es tuya.',
  casi: 'Casi, casi. Escuchala una vez más y la repites conmigo. Vas bien.',
  todavia:
    "Tranquilo, esa se enreda al principio. Te la repasamos pronto pa' que no se te vaya. Nadie nace sabiendo.",
};

/** La misma reacción cuando la nota fue de toda la tanda, no de una sola. */
const REACCION_TANDA: Record<Nota, string> = {
  clavado: '¡Uy! Y eran varias de una. Esas ya las tienes encima.',
  casi: 'Bien ahí. Las que se enredaron te las vuelvo a poner en el repaso, sin afán.',
  todavia:
    'Tranquilo, son hartas de una sentada. Te las voy soltando de a poquitas en los repasos. Así se pegan.',
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
  /** Ids de la tanda de palabras que todavía no se calificaron.
      Salirse a la mitad de una tanda las deja SIN entrar al SRS, y está bien:
      una palabra que viste una vez y abandonaste no es una palabra aprendida —
      cuando vuelvas te la vuelve a enseñar. La posición sí se guarda igual
      (guardarProgreso corre por beat), así que "seguí donde ibas" te devuelve a
      la palabra exacta. */
  tanda: string[];
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

function arrancar(a: Arranque, conVoz: boolean): Run {
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
    tanda: [],
    requeued: {},
    setupVisto: {},
  };
  return entrar(base, i, conVoz);
}

/* Entrar a una frase: vuelve al PRIMER paso de la secuencia que le toca a este
   beat (que no siempre es 'escena': una palabra suelta arranca en su tarjeta),
   recalcula el rung y decide si esta es la primera de su escena — la única que
   se presenta entera. `tanda` NO se toca acá: sobrevive de beat a beat, que es
   justamente lo que hace que la autoeval sea una sola al final. */
function entrar(run: Run, i: number, conVoz: boolean): Run {
  const c = run.chunks[i]!;
  const m = run.meta[i]!;
  const rung = rungValido(rungDe(c, m.clase), c);
  const escenaId = m.scene?.id ?? null;
  const setupAhora = !!escenaId && !run.setupVisto[escenaId];
  const seq = secuenciaDe(nodoDe(m), conVoz, cierraTanda(run.meta, i));
  return {
    ...run,
    i,
    paso: seq[0]!,
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

/** El regalo del cognado ("con esta regla te salen gratis: national, …").
    Vive en dos pasos distintos (el porqué del loop largo y la tarjeta de
    palabra), así que se saca a componente en vez de duplicar el estilo. */
function Gancho({ texto }: { texto: string }) {
  return (
    <motion.p
      {...ENTRADA}
      className="rounded-[18px] border px-4 py-3 text-[0.86rem] leading-[1.45]"
      style={{
        borderColor: 'color-mix(in oklch, var(--warn) 35%, transparent)',
        background: 'color-mix(in oklch, var(--warn) 10%, transparent)',
        color: 'var(--text-secondary)',
      }}
    >
      {texto}
    </motion.p>
  );
}

/* El par mínimo del nodo 'sonido'. Los DOS suenan y los dos se leen: el punto
   pedagógico es la diferencia, y una diferencia no se enseña mostrando un lado
   solo. El ≠ va en el medio y no un "vs": no están compitiendo, son distintas.

   A 390 px las dos cajas entran holgadas (los pares más largos del contenido
   son "works"/"work" y "berry"/"very"), pero igual llevan min-w-0 + break-words
   por si mañana entra un par largo — el contenido lo escribe otra gente. */
function ParMinimo({ par }: { par: readonly [string, string] }) {
  return (
    <motion.div {...ENTRADA} data-par-minimo className="flex flex-col gap-2">
      <Eyebrow>El contraste</Eyebrow>
      <div className="flex items-stretch gap-2">
        {par.map((palabra, i) => (
          <span key={palabra} className="contents">
            {i > 0 && (
              <span
                aria-hidden="true"
                className="font-display self-center text-[1.1rem] font-bold"
                style={{ color: 'var(--text-muted)' }}
              >
                ≠
              </span>
            )}
            <span
              className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-[20px] border px-3 py-3.5"
              style={{
                background: 'var(--bg-surface)',
                borderColor: i === 0 ? 'color-mix(in oklch, var(--accent) 45%, transparent)' : 'var(--borde-sutil)',
              }}
            >
              <span className="font-display text-center text-[1.25rem] leading-[1.15] font-bold tracking-[-0.02em] break-words">
                {palabra}
              </span>
              <BotonAudio en={palabra} tamano={38} tono="claro" />
            </span>
          </span>
        ))}
      </div>
    </motion.div>
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
  onTarea: (u: A1UnitRuta) => void;
}) {
  const conVoz = !!PasoVoz;
  const [run, setRun] = useState<Run>(() => arrancar(arranque, conVoz));
  const { ttsOn } = useTts();

  const c = run.chunks[run.i]!;
  const meta = run.meta[run.i]!;
  const ultima = run.i >= run.chunks.length - 1;
  const repaso = arranque.modo === 'repaso';
  const nodo = nodoDe(meta);
  /** ¿La nota de este beat califica una tanda entera de palabras? */
  const enTanda = nodo === 'palabras';
  const cierra = cierraTanda(run.meta, run.i);

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
     audio del navegador). Los nodos cortos no tienen 'reveal': su tarjeta ES el
     reveal, así que suenan al entrar. El guard por clave evita el doble disparo
     de StrictMode: son datos que salen por la red, no un efecto gratis. */
  const yaSono = useRef('');
  useEffect(() => {
    if (run.fase !== 'beat' || !ttsOn) return;
    if (run.paso !== 'reveal' && run.paso !== 'palabra' && run.paso !== 'par') return;
    const clave = `${run.i}:${c.id}`;
    if (yaSono.current === clave) return;
    yaSono.current = clave;
    void speak(c.en, { trackReplay: false });
  }, [run.fase, run.paso, run.i, c.id, c.en, ttsOn]);

  /* La secuencia sale del BEAT, no de la sesión: el nodeKind de su escena y si
     el paso de voz llegó por props. Así el "PASO 4/7" y el botón de avanzar
     leen de la misma lista y no se pueden desincronizar — la cabecera hace
     indexOf/length y nunca estuvo cableada a 6 ni a 7. */
  const secuencia = secuenciaDe(nodo, conVoz, cierra);

  const avanzar = useCallback(
    (desde: Paso) => {
      const idx = secuencia.indexOf(desde);
      const siguiente = secuencia[Math.min(idx + 1, secuencia.length - 1)]!;
      setRun((r) => ({ ...r, paso: siguiente }));
    },
    [secuencia],
  );

  /** Autoeval → Leitner. "Todavía no" re-encola la frase UNA vez en esta
      sesión: nadie se queda con la sensación de que se le escapó.

      En una tanda de palabras la nota va a TODAS las de la tanda, en bucle
      sobre `calificar()`. Y ahí NO se re-encola: volver a meter diez beats
      convertiría un "todavía no" honesto en un castigo, y el Leitner ya las
      dejó agendadas para mañana (caja 1, due +1). */
  const calificarYReaccionar = useCallback(
    (nota: Nota) => {
      const st = useA1.getState();
      const ids = enTanda ? Array.from(new Set([...run.tanda, c.id])) : [c.id];
      ids.forEach((id) => st.calificar(id, nota));
      if (repaso) quizaCerrarEscena(meta.scene);
      setRun((r) => {
        const reencolar = !enTanda && nota === 'todavia' && !r.requeued[c.id];
        return {
          ...r,
          fase: 'react',
          nota,
          tanda: [],
          chunks: reencolar ? [...r.chunks, c] : r.chunks,
          meta: reencolar ? [...r.meta, meta] : r.meta,
          requeued: reencolar ? { ...r.requeued, [c.id]: true } : r.requeued,
        };
      });
    },
    [c, meta, repaso, enTanda, run.tanda],
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
              'Listo, ese repaso quedó. Cada vuelta se te pega más.',
              m.salen > 0
                ? `Ya llevas ${m.salen}${m.salen === 1 ? ' frase que te sale sola.' : ' frases que te salen solas.'}`
                : 'Vuelve mañana y seguimos; así es como se pegan.',
            ]}
          />
        );
      }
      return (
        <AlfredBloque
          lineas={[
            'Listo, esa escena la sacaste. Eso hace un rato no lo tenías.',
            'Vuelve cuando quieras y seguimos con la próxima, sin afán.',
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
          <AlfredBloque lineas={[(enTanda ? REACCION_TANDA : REACCION)[run.nota ?? 'clavado']]} />
        </>
      );
    }

    switch (run.paso) {
      /* ── NODO CORTO · una PALABRA suelta ─────────────────────────────
         Todo en una pantalla: la palabra grande, el español, la muleta
         "suena:", el porqué de Alfred (que en un cognado ES la lección: "le
         cortaron la cola", "-CIÓN se vuelve -TION") y el regalo si lo hay.
         Un tap y sigue. Sin MCQ y sin producción. */
      case 'palabra':
        return (
          <>
            {run.setupAhora && meta.scene && (
              <AlfredBloque lineas={[...meta.scene.setup_es, meta.scene.analogy_es]} />
            )}
            <FraseCard chunk={c} completa etiqueta="Palabra" />
            <AlfredBloque lineas={[c.why_es]} />
            {c.cognateHook_es && <Gancho texto={c.cognateHook_es} />}
          </>
        );

      /* ── NODO CORTO · un FONEMA (el par mínimo) ──────────────────────── */
      case 'par':
        return (
          <>
            {run.setupAhora && meta.scene && (
              <AlfredBloque lineas={[...meta.scene.setup_es, meta.scene.analogy_es]} />
            )}
            {meta.scene?.parMinimo && <ParMinimo par={meta.scene.parMinimo} />}
            <FraseCard chunk={c} completa etiqueta="La palabra" />
            <AlfredBloque lineas={[c.why_es]} />
          </>
        );

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
                  'Esta ya te sale. Ahora hacela tuya: cambia la pieza por lo que sea TU caso.',
                  'Mira el molde, decilo en voz alta con lo tuyo. Después te muestro el ejemplo.',
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
                ? `Esta ya la conoces. ¿Cómo era pa' decir «${c.es}»? De memoria, sin mirar.`
                : `A ver… quieres decir «${c.es}». ¿Cómo suena en inglés?`,
              'Prueba en voz alta, como te salga. Nadie te oye — ese es el punto.',
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
            {c.cognateHook_es && <Gancho texto={c.cognateHook_es} />}
            <LineaQuien texto={c.who_es} />
          </>
        );

      /* ── 5 · SHADOWING ──────────────────────────────────────────────── */
      case 'shadowing':
        return (
          <>
            <AlfredBloque
              lineas={['Ahora tú. Repetila en voz alta, como suena. Nadie te oye, dale sin pena.']}
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
                /* Una sola pregunta para toda la tanda: es el punto entero de
                   los nodos de palabras. Se nombra la cantidad para que quede
                   claro que la nota no es solo de la última. */
                enTanda
                  ? `Listo esa tanda. ¿Cómo te fue con las ${Math.max(run.tanda.length + 1, 2)}?`
                  : '¿Y qué tal? ¿Te salió?',
                run.vozLograda === true
                  ? 'Te oí y te salió. Igual tú eres quien sabe cómo lo sentiste.'
                  : run.vozLograda === false
                    ? 'Tranquilo, el micrófono no es juez. Tú dices cómo te fue.'
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
                ? '¡Eso! Esa era. La tienes fresca.'
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
        <AlfredBloque lineas={['Completa el hueco. ¿Cuál ficha va acá?']} />
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
      const etiqueta = ultima
        ? repaso
          ? 'Cerrar el repaso ✓'
          : 'Cerrar la escena ✓'
        : enTanda
          ? 'Seguimos →'
          : 'Siguiente frase →';
      return (
        <BotonPaso
          variante="acento"
          onClick={() => (ultima ? finalizar() : setRun((r) => entrar(r, r.i + 1, conVoz)))}
        >
          {etiqueta}
        </BotonPaso>
      );
    }
    switch (run.paso) {
      /* La palabra que NO cierra la tanda salta al siguiente beat sin pasar por
         autoeval, y de paso se apunta en `tanda` para que la nota del final la
         alcance. La que cierra sí avanza a la autoeval de todas. */
      case 'palabra':
        return (
          <BotonPaso
            variante="acento"
            onClick={() => {
              if (cierra) {
                avanzar('palabra');
                return;
              }
              setRun((r) => ({ ...entrar(r, r.i + 1, conVoz), tanda: [...r.tanda, c.id] }));
            }}
          >
            {cierra ? 'Ya las repetí ✓' : 'Siguiente palabra →'}
          </BotonPaso>
        );
      case 'par':
        return (
          <BotonPaso variante="acento" onClick={() => avanzar('par')}>
            Ya los oí, ahora yo ↓
          </BotonPaso>
        );
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
        /* "PASO 1/1" no informa nada: en un nodo de palabras el avance ya lo
           cuentan los puntos de arriba (frase N de la tanda). */
        sub={run.fase === 'beat' && secuencia.length > 1 ? `PASO ${pasoNum}/${secuencia.length}` : undefined}
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
