import { LadderSheet } from './sheet';

/* "VETA HECHA" — port de ladderSummary (public/legacy.html:7059-7074).

   Se dispara desde showRung cuando el índice desborda el lote (§9.22): el
   botón TERMINAR solo incrementa el índice, no abre nada. */
export function LadderSummary({
  abierta,
  clavados,
  bestCombo,
  pct,
  onClose,
}: {
  abierta: boolean;
  /** Clavados de ESTE run (state.ladderRunClavados), no el acumulado. */
  clavados: number;
  bestCombo: number;
  pct: number;
  onClose: () => void;
}) {
  return (
    <LadderSheet abierta={abierta} onClose={onClose} labelledBy="veta-hecha">
      <p id="veta-hecha" className="font-display text-[2.4rem] leading-[0.95] font-extrabold tracking-[-0.03em]">
        VETA HECHA<span style={{ color: 'var(--accent)' }}>.</span>
      </p>

      <div className="my-4 flex items-end gap-8">
        <Stat valor={String(clavados)} label="Clavados" color="var(--accent)" />
        <Stat valor={String(bestCombo)} label="Mejor combo" />
        <Stat valor={`${pct}%`} label="Hacia C1" color="var(--card-yellow)" />
      </div>

      <p className="text-[0.9rem] leading-[1.6]" style={{ color: 'var(--text-secondary)' }}>
        Lo que fallaste ya está en tu DNA y vuelve en el REPASO. Lo que clavaste sale de "Mis fallos".
      </p>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-full border-0 px-8 py-[13px] text-[0.9rem] font-bold"
          style={{ minHeight: 48, background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          LISTO
        </button>
      </div>
    </LadderSheet>
  );
}

function Stat({ valor, label, color }: { valor: string; label: string; color?: string }) {
  return (
    <div>
      <div
        className="font-display text-[clamp(2.6rem,11vw,3.6rem)] leading-none font-extrabold tracking-[-0.03em]"
        style={{ color: color ?? 'var(--text-primary)' }}
      >
        {valor}
      </div>
      <div className="font-mono text-[0.6rem] tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  );
}
