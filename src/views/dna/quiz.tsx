import { useRef, useState } from 'react';
import { motion } from 'motion/react';

import { PencilLoader } from '@/components/rodeo/pencil-loader';
import { callJSON } from '@/lib/api';
import type { DnaItem } from '@/lib/dna';
import { useLadder } from '@/stores/ladder';
import { toast } from '@/stores/toast';

/* REPASO RÁPIDO — port del handler de #quiz-btn (public/legacy.html:5000-5029)
   y de runQuiz (L5031-5085).

   Un solo tipo de pregunta: producción libre. No hay opción múltiple ni
   corrección automática — el usuario se autoevalúa. Y el quiz NO escribe nada:
   ni XP, ni racha, ni `dominado`, ni DNA (§9.17). El "dominado" solo lo pone
   selfJudge de SUBE. */

export type QuizQ = { q: string; a: string; hint: string };

const SYS =
  'You create quick quiz questions to drill English mistakes and vocabulary. Respond with STRICT JSON only.';

function materialDe(pool: DnaItem[]): string {
  return pool
    .map((d) =>
      d.type === 'error'
        ? `ERROR: decía "${d.quote}" → correcto: "${d.fix}" (${d.why})`
        : d.type === 'upgrade'
          ? `UPGRADE: básico "${d.b2}" → C1 "${d.fix}" (${d.why})`
          : `SLANG: "${d.term}" = ${d.meaning}. Ej: "${d.example}"`,
    )
    .join('\n');
}

export function Repaso({ dna }: { dna: DnaItem[] }) {
  const busy = useLadder((s) => s.busy);
  const setBusy = useLadder((s) => s.setBusy);

  const [cargando, setCargando] = useState(false);
  const [quiz, setQuiz] = useState<QuizQ[] | null>(null);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [revelada, setRevelada] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  async function pedirQuiz() {
    if (busy) return;
    if (dna.length < 3) {
      toast('Necesitas al menos 3 cosas en tu DNA — ve a hablar primero');
      return;
    }
    setBusy(true);
    setCargando(true);
    toast('Armando tu repaso...', 3500);
    try {
      // Baraja sucia y máximo 8 items, igual que el viejo.
      const pool = [...dna].sort(() => Math.random() - 0.5).slice(0, 8);
      const { parsed } = await callJSON(
        'creative',
        [
          { role: 'system', content: SYS },
          {
            role: 'user',
            content: `From this material of Gus's past errors and saved slang, create exactly 5 quiz questions in Spanish that force him to PRODUCE the correct English. STRICT JSON array:
[{"q":"pregunta en español pidiendo producir el inglés","a":"respuesta correcta en inglés","hint":"pista corta en español"}]
MATERIAL:\n${materialDe(pool)}`,
          },
        ],
        2600,
      );
      const preguntas = parsed as QuizQ[] | null;
      if (!Array.isArray(preguntas) || !preguntas.length) throw new Error('No pude armar el quiz');
      // Estado nuevo en cada ronda: abandonar un quiz a mitad y arrancar otro
      // no puede arrastrar el índice ni el score del anterior (§9.18).
      setQuiz(preguntas);
      setI(0);
      setScore(0);
      setRevelada(false);
      const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      requestAnimationFrame(() =>
        areaRef.current?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth' }),
      );
    } catch (err) {
      toast('Error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCargando(false);
      setBusy(false);
    }
  }

  function juzgar(acerto: boolean) {
    if (acerto) setScore((s) => s + 1);
    setI((n) => n + 1);
    setRevelada(false);
  }

  const q = quiz && i < quiz.length ? quiz[i] : null;
  const terminado = !!quiz && i >= quiz.length;

  return (
    <>
      <div className="flex gap-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          whileHover={{ y: -1 }}
          onClick={() => void pedirQuiz()}
          disabled={busy}
          className="cursor-pointer rounded-full border-0 px-7 py-[13px] text-[0.88rem] font-bold disabled:opacity-45"
          style={{ minHeight: 48, background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          REPASO RÁPIDO
        </motion.button>
      </div>

      <div ref={areaRef} className="flex flex-col gap-3">
        {cargando && (
          <div className="flex justify-center py-2">
            <PencilLoader size={4.4} label="Armando tu repaso" />
          </div>
        )}

        {q && (
          <div
            className="rounded-2xl border px-4 py-3.5"
            style={{ background: 'var(--bg-surface)', borderColor: 'oklch(87% 0.21 128 / 0.3)' }}
          >
            <div className="mb-2 font-mono text-[0.68rem] tracking-[0.16em] uppercase" style={{ color: 'var(--text-muted)' }}>
              {i + 1} / {quiz!.length}
            </div>
            <div className="text-[0.95rem] leading-[1.5] font-semibold">{q.q}</div>

            {revelada && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="mt-3 rounded-xl p-3 font-bold"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
              >
                {q.a}
              </motion.div>
            )}

            <div className="mt-3.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRevelada(true)}
                className="cursor-pointer rounded-full border bg-transparent px-4 py-2.5 text-[0.8rem]"
                style={{ borderColor: 'var(--borde-medio)', color: 'var(--text-primary)' }}
              >
                Ver respuesta
              </button>
              <button
                type="button"
                /* La guarda de tipo es real: el modelo a veces manda un objeto
                   en `hint` y el viejo pintaba "[object Object]". */
                onClick={() => toast('Pista: ' + (typeof q.hint === 'string' ? q.hint : 'sin pista'), 3500)}
                className="cursor-pointer rounded-full border bg-transparent px-4 py-2.5 text-[0.8rem]"
                style={{ borderColor: 'var(--borde-medio)', color: 'var(--text-primary)' }}
              >
                Pista
              </button>
            </div>

            {/* Los botones de autoevaluación NO existen hasta revelar. */}
            {revelada && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => juzgar(true)}
                  className="cursor-pointer rounded-full border-0 px-[22px] py-2.5 text-[0.82rem] font-bold"
                  style={{ minHeight: 44, background: 'var(--accent)', color: 'var(--accent-ink)' }}
                >
                  LA TENÍA ✓
                </button>
                <button
                  type="button"
                  onClick={() => juzgar(false)}
                  className="cursor-pointer rounded-full border bg-transparent px-[22px] py-2.5 text-[0.82rem] font-bold"
                  style={{ minHeight: 44, borderColor: 'var(--texto-mal)', color: 'var(--texto-mal)' }}
                >
                  Fallé
                </button>
              </div>
            )}
          </div>
        )}

        {terminado && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
            className="rounded-2xl border px-4 py-3.5"
            style={{ background: 'var(--bg-surface)', borderColor: 'oklch(87% 0.21 128 / 0.4)' }}
          >
            <div className="font-display text-[2rem] font-extrabold tracking-[-0.03em]">
              {score}/{quiz!.length}
            </div>
            <div className="text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
              {score === quiz!.length
                ? 'Impecable. Eso ya no se te olvida.'
                : score >= quiz!.length / 2
                  ? 'Bien — lo que fallaste se queda en el DNA para la próxima.'
                  : 'Tranquilo, para eso existe el repaso. Otra ronda mañana.'}
            </div>
            <button
              type="button"
              onClick={() => setQuiz(null)}
              className="mt-3 cursor-pointer rounded-full border bg-transparent px-4 py-2.5 text-[0.82rem]"
              style={{ borderColor: 'var(--borde-medio)', color: 'var(--text-primary)' }}
            >
              Cerrar
            </button>
          </motion.div>
        )}
      </div>
    </>
  );
}
