import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeftRight, RotateCcw, X } from 'lucide-react';

import { AuroraPillButton } from '@/components/rodeo/aurora-pill-button';
import { PALETAS, useAurora } from '@/stores/aurora';

/* PERSONALIZAR — la hoja que ajusta el aurora del Home. Preview REAL (el
   mismo AuroraPillButton, en modo demo), diez paletas, los tres colores
   editables, intercambiar extremos, restablecer, intensidad y velocidad.
   Todo persiste en sessionStorage vía el store (ver stores/aurora.ts). */

function FilaColor({ etiqueta, valor, onChange }: { etiqueta: string; valor: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--borde-sutil)' }}>
      <span className="text-[0.88rem] font-medium">{etiqueta}</span>
      <span className="flex items-center gap-2.5">
        <span className="font-mono text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>
          {valor.toUpperCase()}
        </span>
        <input
          type="color"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          aria-label={etiqueta}
          className="size-9 cursor-pointer rounded-lg border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0"
        />
      </span>
    </label>
  );
}

function FilaSlider({
  etiqueta,
  min,
  max,
  step,
  valor,
  onChange,
  formato,
}: {
  etiqueta: string;
  min: number;
  max: number;
  step: number;
  valor: number;
  onChange: (v: number) => void;
  formato: (v: number) => string;
}) {
  return (
    <label className="flex flex-col gap-2 rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--borde-sutil)' }}>
      <span className="flex items-center justify-between text-[0.88rem] font-medium">
        {etiqueta}
        <span className="font-mono text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>
          {formato(valor)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={etiqueta}
        className="w-full accent-[var(--accent)]"
      />
    </label>
  );
}

export function AuroraCustomizer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cfg = useAurora();

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
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          <motion.div
            key="hoja"
            role="dialog"
            aria-modal="true"
            aria-label="Personalizar el botón del inicio"
            initial={{ y: '104%' }}
            animate={{ y: 0 }}
            exit={{ y: '104%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-3xl border-t px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--glass-border)' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
                personalizar
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar personalizador"
                className="text-muted-foreground hover:text-foreground inline-flex size-9 cursor-pointer items-center justify-center rounded-xl"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </div>

            {/* Preview real: el MISMO componente del Home, sin launch. */}
            <AuroraPillButton demo className="mb-5 h-[88px]">
              Conversación libre
            </AuroraPillButton>

            {/* Diez paletas */}
            <p className="mb-2 font-mono text-[0.6rem] tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
              paletas
            </p>
            <div className="mb-4 grid grid-cols-5 gap-2">
              {PALETAS.map((p) => {
                const activa = cfg.paleta === p.nombre;
                return (
                  <button
                    key={p.nombre}
                    type="button"
                    onClick={() => cfg.aplicarPaleta(p)}
                    aria-label={`Paleta ${p.nombre}`}
                    aria-pressed={activa}
                    title={p.nombre}
                    className="h-11 cursor-pointer rounded-xl border-2 transition-transform active:scale-95"
                    style={{
                      background: `linear-gradient(100deg, ${p.masa1} 8%, ${p.masa2} 52%, ${p.luz} 96%)`,
                      borderColor: activa ? 'var(--accent)' : 'transparent',
                    }}
                  />
                );
              })}
            </div>

            {/* Colores editables */}
            <div className="mb-4 flex flex-col gap-2">
              <FilaColor etiqueta="Masa 1" valor={cfg.masa1} onChange={(v) => cfg.set({ masa1: v })} />
              <FilaColor etiqueta="Masa 2" valor={cfg.masa2} onChange={(v) => cfg.set({ masa2: v })} />
              <FilaColor etiqueta="Luz" valor={cfg.luz} onChange={(v) => cfg.set({ luz: v })} />
            </div>

            {/* Acciones */}
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={cfg.intercambiarExtremos}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[0.85rem] font-medium transition-colors hover:bg-[var(--superficie-t)]"
                style={{ borderColor: 'var(--borde-sutil)' }}
              >
                <ArrowLeftRight className="size-4" strokeWidth={2} />
                Intercambiar extremos
              </button>
              <button
                type="button"
                onClick={cfg.restablecer}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[0.85rem] font-medium transition-colors hover:bg-[var(--superficie-t)]"
                style={{ borderColor: 'var(--borde-sutil)' }}
              >
                <RotateCcw className="size-4" strokeWidth={2} />
                Restablecer
              </button>
            </div>

            {/* Intensidad y velocidad */}
            <div className="flex flex-col gap-2">
              <FilaSlider
                etiqueta="Intensidad"
                min={0.35}
                max={1.4}
                step={0.05}
                valor={cfg.intensidad}
                onChange={(v) => cfg.set({ intensidad: v })}
                formato={(v) => `${Math.round(v * 100)}%`}
              />
              <FilaSlider
                etiqueta="Velocidad"
                min={4}
                max={30}
                step={1}
                valor={cfg.velocidad}
                onChange={(v) => cfg.set({ velocidad: v })}
                formato={(v) => `${v}s por ciclo`}
              />
            </div>

            <p className="mt-4 text-[0.72rem] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Se guarda solo en esta sesión del navegador: al abrir una pestaña nueva vuelve al look por defecto.
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
