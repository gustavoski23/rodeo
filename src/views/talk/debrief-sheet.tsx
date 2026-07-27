import { useTalk } from '@/stores/talk';

import { Sheet } from './sheet';

/* Hoja de DEBRIEF — port del bloque de openSheet en #end-session
   (public/legacy.html:4304-4333). Mismas tres secciones y mismo orden:
   errores que más cuestan, "dilo como un C1", y el cierre en cursiva.

   El guardado en rodeo_dna ya ocurrió antes de abrir la hoja (saveDNA +
   recordUpgrade en el motor): aquí solo se muestra lo aprendido, no se
   decide nada. Por eso LISTO cierra hoja Y sesión (closeSheetAndSession). */
export function DebriefSheet() {
  const d = useTalk((s) => s.debrief);
  const setDebrief = useTalk((s) => s.setDebrief);
  const cerrarSesion = useTalk((s) => s.cerrarSesion);

  const cerrar = () => {
    setDebrief(null);
    cerrarSesion();
  };

  const errores = (d?.top_errors || []).filter((e) => e && e.fix);
  const upgrades = (d?.upgrades || []).filter((u) => u && u.c1);

  return (
    <Sheet abierta={!!d} onClose={cerrar} labelledBy="debrief-titulo">
      <p id="debrief-titulo" className="font-display text-[2.4rem] leading-[0.95] font-black">
        DEBRIEF<span style={{ color: 'var(--accent)' }}>.</span>
      </p>

      {errores.length > 0 && (
        <p className="mt-[18px] mb-2.5 font-mono text-[0.7rem] tracking-[0.18em] uppercase" style={{ color: 'var(--texto-mal)' }}>
          Errores que más te cuestan
        </p>
      )}
      {errores.map((e, i) => (
        <div
          key={`e${i}`}
          className="mb-2 rounded-2xl border px-4 py-3.5"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--superficie-t)' }}
        >
          <div className="text-[0.9rem] leading-[1.5]">
            <span className="line-through" style={{ color: 'var(--texto-mal)' }}>
              {e.quote}
            </span>
            {' → '}
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>
              {e.fix}
            </span>
          </div>
          <div className="mt-1 text-[0.8rem]" style={{ color: 'var(--text-secondary)' }}>
            {e.why}
          </div>
        </div>
      ))}

      {upgrades.length > 0 && (
        <p className="mt-[18px] mb-2.5 font-mono text-[0.7rem] tracking-[0.18em] uppercase" style={{ color: 'var(--accent)' }}>
          Dilo como un C1
        </p>
      )}
      {upgrades.map((u, i) => (
        <div
          key={`u${i}`}
          className="mb-2 rounded-2xl border px-4 py-3.5"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--superficie-t)' }}
        >
          <div className="text-[0.9rem]" style={{ color: 'var(--text-secondary)' }}>
            "{u.b2}"
          </div>
          <div className="mt-[3px] text-[0.95rem] font-semibold" style={{ color: 'var(--text-primary)' }}>
            "{u.c1}"
          </div>
          <div className="mt-1 text-[0.8rem]" style={{ color: 'var(--text-secondary)' }}>
            {u.note}
          </div>
        </div>
      ))}

      <p className="mt-[18px] text-[0.95rem] leading-[1.6] italic" style={{ color: 'var(--text-secondary)' }}>
        "{d?.closing || 'Good session.'}"
      </p>

      <div className="mt-[22px] flex justify-center">
        <button
          type="button"
          onClick={cerrar}
          className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border-0 px-8 py-[13px] text-[0.95rem] font-bold"
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            boxShadow: '0 0 32px color-mix(in oklch, var(--accent) 25%, transparent)',
          }}
        >
          LISTO
        </button>
      </div>
    </Sheet>
  );
}
