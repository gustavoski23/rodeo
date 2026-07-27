import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp } from 'lucide-react';

import { PencilLoader } from '@/components/rodeo/pencil-loader';
import { callJSON } from '@/lib/api';
import { recordUpgrade, type DnaUpgrade } from '@/lib/dna';
import { useApp } from '@/stores/app';
import { useLadder, pushSeen, seenAvoid, type Rung } from '@/stores/ladder';
import { toast } from '@/stores/toast';

import { RungCard } from './rung';
import { LadderSummary } from './summary';
import { EX_B2, msgsGenerador, type Veta } from './prompts';
import './ladder.css';

/* Vista SUBE — port de #view-ladder (public/legacy.html:2751-2796) y de
   renderLadder / startVeta / showRung / ladderSummary (L6850-7074).

   La lógica va 1:1: mismas claves, mismos prompts, mismo tope de XP, misma
   racha en UTC. Lo rediseñado es el chrome (tokens + motion) y el giro de la
   tarjeta, que ahora es un flip 3D de verdad (ver rung.tsx). */

const VETAS: { veta: Veta; emoji: string; label: string }[] = [
  { veta: 'trabajo', emoji: '💼', label: 'TRABAJO' },
  { veta: 'calle', emoji: '🛹', label: 'CALLE' },
  { veta: 'fallos', emoji: '🎯', label: 'MIS FALLOS' },
];

export default function LadderView() {
  const xp = useLadder((s) => s.xp);
  const streak = useLadder((s) => s.streak);
  const dna = useLadder((s) => s.dna);
  const pool = useLadder((s) => s.pool);
  const idx = useLadder((s) => s.idx);
  const combo = useLadder((s) => s.combo);
  const runClavados = useLadder((s) => s.runClavados);
  const busy = useLadder((s) => s.busy);
  const setBusy = useLadder((s) => s.setBusy);
  const iniciarRun = useLadder((s) => s.iniciarRun);
  const siguiente = useLadder((s) => s.siguiente);
  const limpiarRun = useLadder((s) => s.limpiarRun);
  const registrarClavado = useLadder((s) => s.registrarClavado);
  const setView = useApp((s) => s.setView);

  const [cargando, setCargando] = useState(false);
  const [vacioFallos, setVacioFallos] = useState(false);
  const [frase, setFrase] = useState('');
  const [resumen, setResumen] = useState(false);

  /* renderLadder() L6855: entrar a SUBE acredita la racha del día y descarta
     el run anterior. Se ejecuta al montar la vista, que es exactamente cuando
     el viejo llamaba a renderLadder desde switchView. */
  useEffect(() => {
    useLadder.getState().enterLadder();
  }, []);

  /* showRung L6932: cuando el índice desborda el lote, se abre la hoja. No lo
     dispara el botón TERMINAR (§9.22): TERMINAR solo suma 1 al índice. */
  useEffect(() => {
    if (pool.length && idx >= pool.length) setResumen(true);
  }, [pool.length, idx]);

  async function startVeta(veta: Veta, ownPhrase?: string) {
    // startVeta L6876 leía `state.busy`, el flag VIVO. Aquí también: la copia
    // suscrita (`busy`) es la del render y no se entera de setBusy(true)
    // dentro del mismo lote, así que dos disparos en el mismo tick colarían
    // dos llamadas a la API.
    if (useLadder.getState().busy) return;
    setVacioFallos(false);
    iniciarRun([]); // combo y clavados del run a 0, runarea limpia

    if (veta === 'fallos') {
      // Sin API: los upgrades que TÚ fallaste, barajados (§9.12).
      const lista: Rung[] = dna
        .filter((d): d is DnaUpgrade => d.type === 'upgrade' && !d.dominado)
        .map((d) => ({
          b2: d.b2 || '',
          context_en: 'de tu conversación en TALK',
          c1: d.fix,
          swap: d.swap || '',
          register: d.register || '',
          note_es: d.why || '',
        }))
        .filter((r) => r.b2 && r.c1);
      if (!lista.length) {
        setVacioFallos(true);
        return;
      }
      iniciarRun(lista.sort(() => Math.random() - 0.5)); // baraja sucia, tal cual
      return;
    }

    setBusy(true);
    setCargando(true);
    try {
      const { parsed } = await callJSON('creative', msgsGenerador(veta, seenAvoid(), ownPhrase), 3800);
      const rungs = parsed as Rung[] | null;
      /* El modelo devuelve a veces el ejemplo del prompt tal cual, o un
         "peldaño" que no sube nada: fuera los dos (§9.6). */
      const valid = (Array.isArray(rungs) ? rungs : []).filter(
        (r) =>
          r &&
          r.b2 &&
          r.c1 &&
          String(r.b2).trim() !== String(r.c1).trim() &&
          !EX_B2.includes(String(r.b2).toLowerCase().trim()),
      );
      if (!valid.length) throw new Error('Respuesta inválida, dale otra vez');
      pushSeen(valid.map((r) => r.b2));
      iniciarRun(valid);
    } catch (err) {
      limpiarRun();
      toast('Error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCargando(false);
      setBusy(false);
    }
  }

  function ladderOwnPhrase() {
    const v = frase.trim();
    if (!v) return; // vacío: no hace nada, ni limpia
    setFrase('');
    void startVeta('own', v);
  }

  /* selfJudge L7031: recordUpgrade SIEMPRE (clavado o no — el "CASI" deja el
     fallo en el DNA para MIS FALLOS y el REPASO) y, si clavó, XP + combo. */
  function onSelfJudge(r: Rung, nailed: boolean) {
    recordUpgrade({ b2: r.b2, c1: r.c1, swap: r.swap, note: r.note_es, register: r.register, dominado: nailed });
    const nuevoCombo = registrarClavado(nailed);
    if (nailed && nuevoCombo >= 2) toast('combo x' + nuevoCombo + ' 🔥', 1500);
  }

  const rung = pool[idx];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
      {/* ── HÉROE ── */}
      <div>
        <p
          className="mb-3 flex items-center gap-2.5 font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          <span className="h-0.5 w-6 shrink-0 rounded-sm bg-current" />
          Sube · B2 → C1
        </p>
        <p className="font-display mb-3 text-[clamp(2.3rem,9.5vw,3.4rem)] leading-[0.92] font-extrabold tracking-[-0.035em]">
          SUBE TU
          <br />
          INGLÉS<span style={{ color: 'var(--accent)' }}>.</span>
        </p>
        <p className="max-w-[330px] text-[0.92rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
          Di lo mismo, pero como un C1.
        </p>
      </div>

      <BarraB2C1 pct={xp.pct} dias={streak.days} />

      {/* ── Vetas ── */}
      <div className="mt-1 flex flex-wrap gap-2.5">
        {VETAS.map(({ veta, emoji, label }) => (
          <motion.button
            key={veta}
            type="button"
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -1 }}
            disabled={busy}
            onClick={() => void startVeta(veta)}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-[18px] py-3 text-[0.9rem] font-medium disabled:opacity-45"
            style={{
              borderColor: 'var(--borde-sutil)',
              background: 'var(--chip-bg-fuerte)',
              color: 'var(--text-primary)',
            }}
          >
            <span aria-hidden="true">{emoji}</span>
            {label}
          </motion.button>
        ))}
      </div>

      {/* ── Frase propia ── */}
      <div className="flex gap-2">
        <input
          type="text"
          className="lad-input"
          value={frase}
          onChange={(e) => setFrase(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') ladderOwnPhrase();
          }}
          placeholder="o sube esta frase tuya..."
          aria-label="Frase propia para subir de nivel"
          autoComplete="off"
        />
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={ladderOwnPhrase}
          disabled={busy}
          aria-label="Subir esta frase"
          className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-transparent disabled:opacity-45"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          <ArrowUp size={18} strokeWidth={2} />
        </motion.button>
      </div>

      {/* ── Zona del peldaño (#ladder-runarea) ── */}
      <div className="pb-6">
        {cargando ? (
          <div className="lad-skeleton flex items-center justify-center">
            <PencilLoader size={4.4} label="Buscando peldaños" />
          </div>
        ) : vacioFallos ? (
          <div
            className="rounded-2xl border px-4 py-3.5"
            style={{ background: 'var(--bg-surface)', borderColor: 'oklch(87% 0.21 128 / 0.3)' }}
          >
            <div className="text-[0.92rem] font-semibold">Aquí caen las frases que TÚ dijiste en TALK, subidas a C1.</div>
            <div className="mt-1.5 text-[0.82rem]" style={{ color: 'var(--text-secondary)' }}>
              Ve a hablar y termina con debrief para llenar esta veta.
            </div>
            <button
              type="button"
              onClick={() => setView('talk')}
              className="mt-3 cursor-pointer rounded-full border-0 px-[22px] py-2.5 text-[0.82rem] font-bold"
              style={{ minHeight: 44, background: 'var(--accent)', color: 'var(--accent-ink)' }}
            >
              IR A TALK
            </button>
          </div>
        ) : rung ? (
          <RungCard
            /* La key remonta la tarjeta en cada peldaño: es lo que reinicia
               fase, intento y guard anti doble-tap sin tocarlos a mano. */
            key={idx}
            r={rung}
            idx={idx}
            total={pool.length}
            combo={combo}
            setBusy={setBusy}
            onSelfJudge={onSelfJudge}
            onSiguiente={siguiente}
          />
        ) : null}
      </div>

      <LadderSummary
        abierta={resumen}
        clavados={runClavados}
        bestCombo={xp.bestCombo}
        pct={xp.pct}
        onClose={() => {
          setResumen(false);
          limpiarRun(); // el LISTO del viejo vaciaba #ladder-runarea
        }}
      />
    </div>
  );
}

/* Barra B2 → C1 con la racha en medio. updateBar() L6850: el ancho es el pct
   crudo y el 🔥 aparece SOLO con racha viva. La celebración es nueva: cada +3
   suelta un destello lima que recorre la barra — el viejo saltaba de golpe. */
function BarraB2C1({ pct, dias }: { pct: number; dias: number }) {
  const previo = useRef(pct);
  const [pulso, setPulso] = useState(0);

  useEffect(() => {
    if (pct > previo.current) setPulso((n) => n + 1);
    previo.current = pct;
  }, [pct]);

  return (
    <div className="mt-0.5">
      <div className="mb-2 flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] uppercase"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span aria-hidden="true" style={{ color: 'var(--text-muted)' }} className="inline-flex">
            {/* olla fría: el extremo B2 */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 10h16v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
              <path d="M3 10h18M8 10V7M12 10V6M16 10V7" />
            </svg>
          </span>
          B2
        </span>

        <span className="font-mono text-[0.66rem] font-bold tracking-[0.04em]" style={{ color: 'var(--warn)' }}>
          racha {dias}
          {dias ? ' 🔥' : ''}
        </span>

        <span
          className="inline-flex items-center gap-1.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] uppercase"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span aria-hidden="true" style={{ color: 'var(--text-muted)' }} className="inline-flex">
            {/* llama: el extremo C1 */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2c1.5 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.5.5-2.5 1-3 .3 1 1 1.5 1.5 1.5C10 6 12 4 12 2z" />
            </svg>
          </span>
          C1
        </span>
      </div>

      <div
        className="relative h-2 overflow-hidden rounded-full"
        style={{ background: 'var(--superficie-t)' }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de B2 a C1"
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--accent)' }}
          animate={{ width: `${pct}%` }}
          initial={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
        />
        <AnimatePresence>
          {pulso > 0 && (
            <motion.span
              key={pulso}
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-full"
              style={{
                background: 'linear-gradient(90deg, transparent, oklch(98% 0.05 128 / 0.85), transparent)',
              }}
              initial={{ x: '-100%', opacity: 0.9 }}
              animate={{ x: '100%', opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
