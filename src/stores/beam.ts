/* Beam — apariencia del BorderBeam que rodea el dock de práctica de SLANG.
   Mismo patrón que el store de aurora: persiste en sessionStorage (sobrevive
   recargas, cada pestaña nueva arranca en el default). El DEFAULT es el que
   marcó Gus en el playground: así se le abre a TODO el mundo. El personalizador
   (bajo «Personalizar aurora») lo cambia en vivo. */
import { create } from 'zustand';

import type { BorderBeamColorVariant, BorderBeamSize } from '@/components/ui/border-beam';

export type BeamAppearance = {
  size: BorderBeamSize;
  colorVariant: BorderBeamColorVariant;
  strength: number; // 0..1
  brightness: number; // multiplicador del glow
  duration: number; // segundos
};

const BEAM_SESSION_KEY = 'rodeo_beam';

/* Marcado por Gus: Pulse dentro · Colorful · 100% · brillo 1.1 · 10 s. */
export const BEAM_DEFAULT: BeamAppearance = {
  size: 'pulse-inner',
  colorVariant: 'colorful',
  strength: 1,
  brightness: 1.1,
  duration: 10,
};

export const BEAM_SIZES: { v: BorderBeamSize; label: string }[] = [
  { v: 'sm', label: 'Rotate sm' },
  { v: 'md', label: 'Rotate md' },
  { v: 'line', label: 'Line' },
  { v: 'pulse-outside', label: 'Pulse fuera' },
  { v: 'pulse-inner', label: 'Pulse dentro' },
];
export const BEAM_COLORS: { v: BorderBeamColorVariant; label: string }[] = [
  { v: 'colorful', label: 'Colorful' },
  { v: 'mono', label: 'Mono' },
  { v: 'ocean', label: 'Ocean' },
  { v: 'sunset', label: 'Sunset' },
];

const SIZES = new Set<BorderBeamSize>(['sm', 'md', 'line', 'pulse-outside', 'pulse-inner']);
const COLORS = new Set<BorderBeamColorVariant>(['colorful', 'mono', 'ocean', 'sunset']);
const clamp = (v: unknown, min: number, max: number, fb: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
};

export function normalizeBeam(raw: unknown): BeamAppearance {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<BeamAppearance>;
  return {
    size: SIZES.has(s.size as BorderBeamSize) ? (s.size as BorderBeamSize) : BEAM_DEFAULT.size,
    colorVariant: COLORS.has(s.colorVariant as BorderBeamColorVariant)
      ? (s.colorVariant as BorderBeamColorVariant)
      : BEAM_DEFAULT.colorVariant,
    strength: clamp(s.strength, 0, 1, BEAM_DEFAULT.strength),
    brightness: clamp(s.brightness, 0.5, 2.5, BEAM_DEFAULT.brightness),
    duration: clamp(s.duration, 1, 12, BEAM_DEFAULT.duration),
  };
}

export function isBeamDefault(a: BeamAppearance) {
  return (
    a.size === BEAM_DEFAULT.size &&
    a.colorVariant === BEAM_DEFAULT.colorVariant &&
    a.strength === BEAM_DEFAULT.strength &&
    a.brightness === BEAM_DEFAULT.brightness &&
    a.duration === BEAM_DEFAULT.duration
  );
}

function load(): BeamAppearance {
  try {
    const saved = sessionStorage.getItem(BEAM_SESSION_KEY);
    return saved ? normalizeBeam(JSON.parse(saved)) : { ...BEAM_DEFAULT };
  } catch {
    return { ...BEAM_DEFAULT };
  }
}

function persist(a: BeamAppearance) {
  try {
    sessionStorage.setItem(BEAM_SESSION_KEY, JSON.stringify(a));
  } catch {
    /* sigue vivo en memoria si sessionStorage está bloqueado */
  }
}

type BeamState = {
  appearance: BeamAppearance;
  update: (patch: Partial<BeamAppearance>) => void;
  reset: () => void;
};

export const useBeam = create<BeamState>((set, get) => ({
  appearance: typeof sessionStorage !== 'undefined' ? load() : { ...BEAM_DEFAULT },
  update: (patch) => {
    const next = normalizeBeam({ ...get().appearance, ...patch });
    persist(next);
    set({ appearance: next });
  },
  reset: () => {
    try {
      sessionStorage.removeItem(BEAM_SESSION_KEY);
    } catch {
      /* noop */
    }
    set({ appearance: { ...BEAM_DEFAULT } });
  },
}));
