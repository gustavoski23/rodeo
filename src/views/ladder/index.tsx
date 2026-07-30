import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowUp } from 'lucide-react';

import { PencilLoader } from '@/components/rodeo/pencil-loader';
import { Card } from '@/components/ui/card';
import { callJSON } from '@/lib/api';
import { recordUpgrade, type DnaUpgrade } from '@/lib/dna';
import { cn } from '@/lib/utils';
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
   tarjeta, que ahora es un flip 3D de verdad (ver rung.tsx).

   REDISEÑO al patrón canónico de SLANG / CHARLA (encargo de Gus): fuera el
   héroe "SUBE TU INGLÉS." a 3,4 rem — el título de la vista vive ahora en la
   barra mono de arriba, junto al ← de volver. El progreso B2→C1, las vetas y
   el peldaño viven DENTRO de una Card que hace de scroller, y la frase propia
   baja a la barra de acción de abajo, que es donde SLANG tiene su PaisaBar.

   Lo que NO cambia (comportamiento intacto): enterLadder al montar, el guard
   `busy` leído del store vivo, el filtro EX_B2, la key={idx} que remonta el
   peldaño, onSelfJudge → recordUpgrade + XP/combo, la hoja de resumen y el
   destello de la barra de progreso. */

const VETAS: { veta: Veta; emoji: string; label: string }[] = [
  { veta: 'trabajo', emoji: '💼', label: 'TRABAJO' },
  { veta: 'calle', emoji: '🛹', label: 'CALLE' },
  { veta: 'fallos', emoji: '🎯', label: 'MIS FALLOS' },
];

/* Las dos constantes del patrón, redeclaradas aquí a propósito (misma
   convención que slang/index.tsx y talk/charla-session.tsx): la vista es una
   COLUMNA de 640 px, no una sábana, y el scroll funciona sin pintar barra. */
const COLUMNA = 'mx-auto w-full max-w-[640px]';
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

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
  /* El fallo de red tiene que DEJAR ALGO en pantalla, como ESCENAS ("sin api ·
     reintentar"). Antes solo salía un toast efímero y la vista volvía al mismo
     estado vacío, así que a los tres segundos nadie sabía si había pasado algo
     ni por dónde volver a intentarlo. Guardamos también la veta (y la frase
     propia, si la hubo) para poder repetir EXACTAMENTE la misma llamada. */
  const [fallo, setFallo] = useState<{ veta: Veta; own?: string; msg: string } | null>(null);
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
    setFallo(null);
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
      const msg = err instanceof Error ? err.message : String(err);
      setFallo({ veta, own: ownPhrase, msg });
      toast('Error: ' + msg);
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
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sección ─────────────────────────────────────────────── */}
      <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-3')}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => setView('home')}
          aria-label="Volver al inicio"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          <ArrowLeft size={17} strokeWidth={2} />
        </motion.button>
        <span
          className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          Sube · B2 → C1
        </span>
      </div>

      {/* ── La tarjeta ───────────────────────────────────────────────────────
          Un solo scroller para el progreso, las vetas y el peldaño. El padding
          lateral deja aire de sobra al flip 3D: al girar, la perspectiva acerca
          media tarjeta y la proyecta un pelo más grande que su caja. */}
      <Card className={cn(COLUMNA, 'relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm')}>
        <div className={cn('flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3.5 py-4 sm:px-5', SIN_BARRA)}>
          <BarraB2C1 pct={xp.pct} dias={streak.days} />

          {/* ── Vetas ── */}
          <div className="flex flex-wrap gap-2">
            {VETAS.map(({ veta, emoji, label }) => (
              <motion.button
                key={veta}
                type="button"
                whileTap={{ scale: 0.97 }}
                whileHover={{ y: -1 }}
                disabled={busy}
                onClick={() => void startVeta(veta)}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 font-mono text-[0.72rem] font-bold tracking-[0.06em] disabled:opacity-45"
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

          {/* ── Zona del peldaño (#ladder-runarea) ── */}
          {/* Con peldaño (o skeleton) el bloque mide lo suyo y el scroll manda;
              vacío, se estira para centrar el estado vacío en la tarjeta. */}
          <div className={cn(rung || cargando || vacioFallos || fallo ? 'shrink-0 pb-1' : 'flex min-h-0 flex-1 flex-col justify-center pb-1')}>
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
            ) : fallo ? (
              /* Estado de error PERSISTENTE, con el mismo registro que ESCENAS:
                 el rótulo mono "sin api" y un reintento que repite la misma
                 veta (y la misma frase propia, si la escribiste). */
              <div
                className="rounded-2xl border px-4 py-3.5"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--borde-medio)' }}
              >
                <span
                  className="font-mono text-[0.6rem] font-bold tracking-[0.16em] uppercase"
                  style={{ color: 'var(--texto-mal)' }}
                >
                  sin api
                </span>
                <div className="mt-1.5 text-[0.92rem] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  No pude traer los peldaños de {VETAS.find((v) => v.veta === fallo.veta)?.label ?? 'tu frase'}.
                </div>
                <div className="mt-1 text-[0.82rem]" style={{ color: 'var(--text-secondary)' }}>
                  {fallo.msg}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void startVeta(fallo.veta, fallo.own)}
                  className="mt-3 cursor-pointer rounded-full border-0 px-[22px] py-2.5 text-[0.82rem] font-bold disabled:opacity-45"
                  style={{ minHeight: 44, background: 'var(--accent)', color: 'var(--accent-ink)' }}
                >
                  REINTENTAR
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
            ) : (
              /* Estado vacío: el sitio del viejo héroe, ahora del rango del
                 ConversationEmptyState del chat. */
              <div className="flex flex-col items-center gap-2.5 px-2 py-8 text-center">
                <p
                  className="font-display text-[1.55rem] leading-[1.06] font-extrabold tracking-[-0.025em] uppercase"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Di lo mismo, <span style={{ color: 'var(--accent)' }}>pero como un C1</span>
                </p>
                <p className="max-w-[340px] text-[0.9rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
                  Elige una veta y te caen peldaños: tu frase de B2 arriba, la versión C1 al girar la tarjeta.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── La barra de abajo ────────────────────────────────────────────────
          Espejo de la PaisaBar de SLANG: la acción de escribir TU frase vive
          donde la charla tiene su ConversationBar, no perdida entre las vetas. */}
      <div className={cn(COLUMNA, 'shrink-0 pt-3')}>
        <Card className="w-full flex-row items-center gap-2 rounded-[22px] p-2 shadow-lg">
          <input
            type="text"
            value={frase}
            onChange={(e) => setFrase(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') ladderOwnPhrase();
            }}
            placeholder="o sube esta frase tuya..."
            aria-label="Frase propia para subir de nivel"
            autoComplete="off"
            className="min-h-[46px] min-w-0 flex-1 rounded-full border-0 bg-transparent px-3 text-[0.95rem] outline-none placeholder:text-[0.9rem]"
            style={{ color: 'var(--text-primary)' }}
          />
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={ladderOwnPhrase}
            disabled={busy || !frase.trim()}
            aria-label="Subir esta frase"
            className="flex size-[46px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 disabled:cursor-default disabled:opacity-[0.45]"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              boxShadow: '0 3px 18px color-mix(in oklch, var(--accent) 26%, transparent)',
            }}
          >
            <ArrowUp size={18} strokeWidth={2} />
          </motion.button>
        </Card>
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
    <div className="shrink-0">
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
