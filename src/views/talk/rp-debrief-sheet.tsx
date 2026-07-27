import { useEscenas } from '@/stores/escenas';

import { Sheet } from './sheet';
import { rpCerrarDebrief, rpGuardarDebrief, rpReintentarCierre, rpSalirSinAnalisis } from './rp-turn';

/* Hoja del cierre de ESCENA — port de los dos openSheet de rpDebrief
   (public/legacy.html:7533-7557).

   Son DOS hojas, no una, y esa es la diferencia grande con el debrief de
   CHARLA (§8 trampa 17): si el análisis falla, la escena NO se destruye —
   se ofrece reintentar el cierre o salir explícitamente. Perder veinte turnos
   de teatro por un rate-limit sería una traición.

   Y aquí el guardado a DNA es una DECISIÓN del usuario ("GUARDAR N A MI DNA"),
   no algo ya hecho como en CHARLA: por eso la hoja tiene dos botones. */

export function RpDebriefSheet() {
  const hoja = useEscenas((s) => s.hoja);

  const ok = hoja?.tipo === 'ok' ? hoja : null;
  const err = hoja?.tipo === 'error' ? hoja : null;
  const items = ok?.items ?? [];

  return (
    <Sheet
      abierta={!!hoja}
      // Escape / clic en el backdrop = "Ahora no" en el cierre bueno y
      // "Salir sin análisis" en el fallo: los dos cierran hoja y escena.
      onClose={ok ? rpCerrarDebrief : rpSalirSinAnalisis}
      labelledBy="rp-debrief-titulo"
    >
      {ok && (
        <>
          <p id="rp-debrief-titulo" className="font-display text-[2.3rem] leading-[0.95] font-black">
            CÓMO TE
            <br />
            FUE<span style={{ color: 'var(--accent)' }}>.</span>
          </p>

          {items.length > 0 && (
            <p
              className="mt-[18px] mb-2.5 font-mono text-[0.7rem] tracking-[0.16em] uppercase"
              style={{ color: 'var(--accent)' }}
            >
              Vale la pena que te lo lleves
            </p>
          )}
          {items.map((it, i) => (
            <div
              key={`a${i}`}
              className="mb-2 rounded-2xl border px-4 py-3.5"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--superficie-t)' }}
            >
              <div className="text-[0.98rem] font-bold" style={{ color: 'var(--text-primary)' }}>
                {it.en}
              </div>
              <div className="mt-1 text-[0.82rem]" style={{ color: 'var(--text-secondary)' }}>
                {it.es || ''}
              </div>
            </div>
          ))}

          <p className="mt-4 text-[0.95rem] leading-[1.6] italic" style={{ color: 'var(--text-secondary)' }}>
            {ok.closing}
          </p>

          <div className="mt-[22px] flex flex-col gap-2.5">
            {items.length > 0 && (
              <button
                type="button"
                onClick={rpGuardarDebrief}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border-0 px-6 py-[13px] text-[0.95rem] font-bold"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--accent-ink)',
                  boxShadow: '0 0 32px color-mix(in oklch, var(--accent) 25%, transparent)',
                }}
              >
                GUARDAR {items.length} A MI DNA
              </button>
            )}
            <button
              type="button"
              onClick={rpCerrarDebrief}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border px-6 py-3 text-[0.9rem] font-semibold"
              style={{ borderColor: 'var(--borde-medio)', background: 'transparent', color: 'var(--text-primary)' }}
            >
              {items.length ? 'Ahora no' : 'LISTO'}
            </button>
          </div>
        </>
      )}

      {err && (
        <>
          <p id="rp-debrief-titulo" className="font-display text-[1.9rem] leading-none font-black">
            NO SALIÓ
            <br />
            EL CIERRE<span style={{ color: 'var(--accent)' }}>.</span>
          </p>
          <p className="mt-3.5 mb-5 text-[0.9rem] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
            {err.msg}
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={rpReintentarCierre}
              className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border-0 px-6 py-[13px] text-[0.95rem] font-bold"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                boxShadow: '0 0 32px color-mix(in oklch, var(--accent) 25%, transparent)',
              }}
            >
              REINTENTAR CIERRE
            </button>
            <button
              type="button"
              onClick={rpSalirSinAnalisis}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border px-6 py-3 text-[0.9rem] font-semibold"
              style={{ borderColor: 'var(--borde-medio)', background: 'transparent', color: 'var(--text-primary)' }}
            >
              Salir sin análisis
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
