import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { AuroraPillButton } from '@/components/rodeo/aurora-pill-button';
import { ETIQUETA_TEMA, type Tema } from '@/lib/theme';
import { useApp } from '@/stores/app';
import {
  AURORA_HEX,
  AURORA_PRESETS,
  isAuroraDefault,
  useAurora,
} from '@/stores/aurora';

/* Los tres temas de la app, en el orden del ciclo del toggler. Las
   miniaturas son CSS estático (aurora.css, .aurora-tema-card__preview):
   montar un BubbleBackground de 42px para previsualizar el gradiente sería
   un segundo árbol animado corriendo dentro de una hoja modal. */
const TEMAS: Tema[] = ['claro', 'oscuro', 'gradiente'];

/* Personalizar aurora — port 1:1 de openAuroraCustomizer
   (codex/home-aurora-production-review, index.html:2703-2799). Preview real
   (el mismo AuroraPillButton en demo), 10 paletas con nombre, tres campos HEX
   (Masa 1 · Masa 2 · Luz) con validación #RRGGBB, intercambiar extremos,
   restablecer (deshabilitado si es el default), y sliders Intensidad (55-135)
   y Velocidad (50-200). Persiste en sessionStorage vía el store. */

function ColorField({ index, label }: { index: number; label: string }) {
  const value = useAurora((s) => s.appearance.colors[index]);
  const update = useAurora((s) => s.update);
  // Borrador local para poder escribir a mano sin que cada tecla se normalice.
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const tocando = useRef(false);

  // Cuando el valor cambia por fuera (preset, swap, reset) y no lo estoy
  // editando, refresco el borrador.
  useEffect(() => {
    if (!tocando.current) setDraft(value);
  }, [value]);

  return (
    <label className="aurora-color-field" htmlFor={`aurora-color-${index}`}>
      <span className="aurora-color-field__label">{label}</span>
      <span className="aurora-color-field__shell" data-invalid={invalid || undefined}>
        <span className="aurora-color-field__swatch" aria-hidden="true" style={{ background: AURORA_HEX.test(draft) ? draft : value }} />
        <input
          id={`aurora-color-${index}`}
          type="text"
          value={draft}
          inputMode="text"
          maxLength={7}
          autoComplete="off"
          spellCheck={false}
          pattern="#[0-9A-Fa-f]{6}"
          aria-invalid={invalid}
          onFocus={() => {
            tocando.current = true;
          }}
          onChange={(e) => {
            const v = e.target.value.replace(/\s/g, '').toUpperCase();
            setDraft(v);
            const ok = AURORA_HEX.test(v);
            setInvalid(!ok);
            if (!ok) return;
            const colors = [...useAurora.getState().appearance.colors] as [string, string, string];
            colors[index] = v;
            update({ colors, activePresetId: null });
          }}
          onBlur={() => {
            tocando.current = false;
            if (!AURORA_HEX.test(draft)) {
              setDraft(value);
              setInvalid(false);
            }
          }}
          data-aurora-color={index}
        />
      </span>
      <span className="aurora-color-field__error" aria-live="polite">
        {invalid ? 'Usa #RRGGBB' : ''}
      </span>
    </label>
  );
}

export function AuroraCustomizer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const appearance = useAurora((s) => s.appearance);
  const update = useAurora((s) => s.update);
  const reset = useAurora((s) => s.reset);
  const swapEnds = useAurora((s) => s.swapEnds);
  const applyPreset = useAurora((s) => s.applyPreset);
  const tema = useApp((s) => s.tema);
  // MISMO camino que el toggler del Home/Header: cambiarTema pinta <html>,
  // persiste rodeo_tema y avisa. Nada de rutas paralelas.
  const cambiarTema = useApp((s) => s.cambiarTema);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="velo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          <motion.div
            key="hoja"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aurora-customizer-title"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="fixed inset-0 z-50 m-auto h-fit max-h-[min(90vh,820px)] w-[min(560px,calc(100vw-40px))] overflow-y-auto rounded-[28px] border p-5"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--glass-border)' }}
          >
            <div className="aurora-customizer">
              <div className="aurora-customizer__header">
                <div>
                  <p className="aurora-customizer__eyebrow">Tu botón de práctica</p>
                  <h2 id="aurora-customizer-title">Personalizar aurora</h2>
                </div>
                <button className="aurora-customizer__close" type="button" aria-label="Cerrar personalización" onClick={onClose}>
                  ×
                </button>
              </div>

              {/* TEMA va PRIMERO: es lo que decide el lienzo sobre el que se
                  ve todo lo demás (incluida la preview del aurora de abajo). */}
              <section className="aurora-customizer__map" aria-labelledby="aurora-tema-title">
                <div className="aurora-customizer__map-heading">
                  <div>
                    <p className="aurora-customizer__eyebrow">El lienzo de la app</p>
                    <h3 id="aurora-tema-title">Tema</h3>
                  </div>
                </div>

                <div className="aurora-customizer__temas" role="group" aria-label="Tema de la app">
                  {TEMAS.map((t) => (
                    <button
                      key={t}
                      className="aurora-tema-card"
                      type="button"
                      aria-pressed={tema === t}
                      onClick={() => cambiarTema(t)}
                    >
                      <span className="aurora-tema-card__preview" data-tema={t} aria-hidden="true" />
                      <span>{ETIQUETA_TEMA[t]}</span>
                      <span className="aurora-tema-card__check">{tema === t ? '● activo' : '○'}</span>
                    </button>
                  ))}
                </div>
              </section>

              <div className="aurora-customizer__preview">
                <AuroraPillButton demo>Conversación libre</AuroraPillButton>
              </div>

              <section className="aurora-customizer__map" aria-labelledby="aurora-map-title">
                <div className="aurora-customizer__map-heading">
                  <div>
                    <p className="aurora-customizer__eyebrow">1 vibrante · 2 suaves</p>
                    <h3 id="aurora-map-title">Mapa de aurora</h3>
                  </div>
                  <button
                    className="aurora-customizer__reset"
                    type="button"
                    disabled={isAuroraDefault(appearance)}
                    onClick={reset}
                  >
                    Restablecer
                  </button>
                </div>

                <div className="aurora-customizer__presets" role="group" aria-label="Paletas curadas">
                  {AURORA_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      className="aurora-preset"
                      type="button"
                      aria-pressed={appearance.activePresetId === preset.id}
                      onClick={() => applyPreset(preset)}
                    >
                      <span className="aurora-preset__map" aria-hidden="true">
                        {preset.colors.map((color, i) => (
                          <i key={i} style={{ background: color }} />
                        ))}
                      </span>
                      <span className="aurora-preset__name">{preset.label}</span>
                    </button>
                  ))}
                </div>

                <div className="aurora-customizer__colors">
                  <ColorField index={0} label="Masa 1" />
                  <ColorField index={1} label="Masa 2" />
                  <ColorField index={2} label="Luz" />
                </div>

                <button className="aurora-customizer__swap" type="button" onClick={swapEnds}>
                  ⇄&nbsp; Intercambiar extremos
                </button>

                <div className="aurora-customizer__motion" aria-label="Movimiento de la aurora">
                  <label>
                    <span>
                      Intensidad <output>{appearance.intensity}%</output>
                    </span>
                    <input
                      type="range"
                      min={55}
                      max={135}
                      step={5}
                      value={appearance.intensity}
                      aria-label="Intensidad de la aurora"
                      onChange={(e) => update({ intensity: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    <span>
                      Velocidad <output>{Number((appearance.speed / 100).toFixed(2))}×</output>
                    </span>
                    <input
                      type="range"
                      min={50}
                      max={200}
                      step={10}
                      value={appearance.speed}
                      aria-label="Velocidad de la aurora"
                      onChange={(e) => update({ speed: Number(e.target.value) })}
                    />
                  </label>
                </div>
              </section>
              <p className="aurora-customizer__note">Se guarda hasta que cierres esta pestaña.</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
