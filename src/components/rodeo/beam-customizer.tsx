/* Personalizador del border beam del dock de SLANG — vive DENTRO de
   «Personalizar aurora», como una sección más bajo el mapa de aurora (se ve al
   hacer scroll). Cambia en vivo el mismo store (useBeam) que consume el dock
   real, así que lo que ajustes aquí es lo que verás en SLANG. El default es el
   que marcó Gus; «Restablecer» vuelve a él. */
import { BorderBeam } from '@/components/ui/border-beam';
import { useApp } from '@/stores/app';
import { BEAM_COLORS, BEAM_SIZES, isBeamDefault, useBeam } from '@/stores/beam';

export function BeamCustomizer() {
  const beam = useBeam((s) => s.appearance);
  const update = useBeam((s) => s.update);
  const reset = useBeam((s) => s.reset);
  const tema = useApp((s) => s.tema);

  return (
    <section className="aurora-customizer__map" aria-labelledby="beam-title">
      <div className="aurora-customizer__map-heading">
        <div>
          <p className="aurora-customizer__eyebrow">El borde del chat de SLANG</p>
          <h3 id="beam-title">Border beam</h3>
        </div>
        <button
          className="aurora-customizer__reset"
          type="button"
          disabled={isBeamDefault(beam)}
          onClick={reset}
        >
          Restablecer
        </button>
      </div>

      {/* Preview en vivo: un mini-dock con el beam según los ajustes. */}
      <div className="beam-preview">
        <BorderBeam
          key={`${beam.size}-${tema}`}
          size={beam.size}
          colorVariant={beam.colorVariant}
          theme={tema === 'claro' ? 'light' : 'dark'}
          strength={beam.strength}
          brightness={beam.brightness}
          duration={beam.duration}
        >
          <div className="beam-preview__card">
            <span className="beam-preview__dot" aria-hidden="true" />
            <span className="beam-preview__line" aria-hidden="true" />
          </div>
        </BorderBeam>
      </div>

      <p className="beam-group-label">Tipo</p>
      <div className="beam-chips" role="group" aria-label="Tipo de beam">
        {BEAM_SIZES.map((t) => (
          <button
            key={t.v}
            type="button"
            className="beam-chip"
            aria-pressed={beam.size === t.v}
            onClick={() => update({ size: t.v })}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="beam-group-label">Color</p>
      <div className="beam-chips" role="group" aria-label="Color del beam">
        {BEAM_COLORS.map((c) => (
          <button
            key={c.v}
            type="button"
            className="beam-chip"
            aria-pressed={beam.colorVariant === c.v}
            onClick={() => update({ colorVariant: c.v })}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Sliders — reutilizo la fila de movimiento del aurora (misma piel). */}
      <div className="aurora-customizer__motion" aria-label="Ajustes del beam">
        <label>
          <span>
            Fuerza <output>{Math.round(beam.strength * 100)}%</output>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(beam.strength * 100)}
            aria-label="Fuerza del beam"
            onChange={(e) => update({ strength: Number(e.target.value) / 100 })}
          />
        </label>
        <label>
          <span>
            Brillo <output>{beam.brightness.toFixed(1)}</output>
          </span>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.1}
            value={beam.brightness}
            aria-label="Brillo del beam"
            onChange={(e) => update({ brightness: Number(e.target.value) })}
          />
        </label>
        <label>
          <span>
            Duración <output>{beam.duration}s</output>
          </span>
          <input
            type="range"
            min={1}
            max={12}
            step={0.5}
            value={beam.duration}
            aria-label="Duración del beam"
            onChange={(e) => update({ duration: Number(e.target.value) })}
          />
        </label>
      </div>
    </section>
  );
}
