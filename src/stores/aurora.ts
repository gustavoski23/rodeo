import { create } from 'zustand';

/* Aurora — port 1:1 del modelo de la referencia aprobada
   (codex/home-aurora-production-review, index.html:2551-2637).
   Tres colores HEX (2 masas vibrantes + 1 luz), intensidad 55-135, velocidad
   50-200, y una paleta activa. Persistencia SOLO en sessionStorage
   (AURORA_SESSION_KEY): el look sobrevive a recargas pero cada pestaña nueva
   arranca en el default. Aplica variables --aurora-* en :root, que el CSS
   del botón/thinking consume. */

export type AuroraAppearance = {
  colors: [string, string, string];
  intensity: number;
  speed: number;
  activePresetId: string | null;
};

export type AuroraPreset = { id: string; label: string; colors: [string, string, string] };

const AURORA_SESSION_KEY = 'rodeo_aurora';

export const AURORA_DEFAULT: AuroraAppearance = {
  colors: ['#B85D8A', '#D99C66', '#EBE0C5'],
  intensity: 100,
  speed: 100,
  activePresetId: 'noir',
};

export const AURORA_PRESETS: AuroraPreset[] = [
  { id: 'noir', label: 'Noir ámbar', colors: ['#B85D8A', '#D99C66', '#EBE0C5'] },
  { id: 'copper', label: 'Cobre rosado', colors: ['#B34E5F', '#E49A6C', '#F0C99F'] },
  { id: 'olive', label: 'Oliva crema', colors: ['#6F6A2B', '#B6AC72', '#ECE0AF'] },
  { id: 'plum', label: 'Ciruela humo', colors: ['#70516B', '#AD858B', '#DFC0AD'] },
  { id: 'mineral', label: 'Azul mineral', colors: ['#397486', '#86A9A8', '#D5DAB9'] },
  { id: 'ruby', label: 'Rubí arena', colors: ['#B93E63', '#D97E82', '#F0D8B9'] },
  { id: 'indigo', label: 'Índigo nube', colors: ['#4654AF', '#9198C5', '#DADDEB'] },
  { id: 'jade', label: 'Jade salvia', colors: ['#268F84', '#86B8AA', '#D4DDC6'] },
  { id: 'saffron', label: 'Azafrán lino', colors: ['#D78319', '#D4AD79', '#EDE1CA'] },
  { id: 'violet', label: 'Violeta humo', colors: ['#774092', '#A889AF', '#DCD4E5'] },
];

export const AURORA_HEX = /^#[0-9A-F]{6}$/i;
const clampAurora = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number(value)));

export function normalizeAuroraAppearance(raw: unknown): AuroraAppearance {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<AuroraAppearance>;
  const colors: [string, string, string] =
    Array.isArray(source.colors) && source.colors.length === 3
      ? (source.colors.map((color, index) =>
          AURORA_HEX.test(String(color)) ? String(color).toUpperCase() : AURORA_DEFAULT.colors[index],
        ) as [string, string, string])
      : ([...AURORA_DEFAULT.colors] as [string, string, string]);
  const presetExists = AURORA_PRESETS.some((preset) => preset.id === source.activePresetId);
  return {
    colors,
    intensity: clampAurora(source.intensity || AURORA_DEFAULT.intensity, 55, 135),
    speed: clampAurora(source.speed || AURORA_DEFAULT.speed, 50, 200),
    activePresetId: presetExists ? (source.activePresetId as string) : null,
  };
}

function load(): AuroraAppearance {
  try {
    const saved = sessionStorage.getItem(AURORA_SESSION_KEY);
    return saved ? normalizeAuroraAppearance(JSON.parse(saved)) : normalizeAuroraAppearance(AURORA_DEFAULT);
  } catch {
    return normalizeAuroraAppearance(AURORA_DEFAULT);
  }
}

function persist(a: AuroraAppearance) {
  try {
    sessionStorage.setItem(AURORA_SESSION_KEY, JSON.stringify(a));
  } catch {
    /* la personalización sigue viva en memoria si sessionStorage está bloqueado */
  }
}

/* Pinta las variables en :root — la misma matemática del original:
   strength = intensity/100, brightness = 0.8 + intensity/500,
   durationScale = 100/speed sobre las tres duraciones base. */
export function applyAuroraAppearance(a: AuroraAppearance) {
  const root = document.documentElement;
  const strength = a.intensity / 100;
  const brightness = 0.8 + a.intensity / 500;
  const durationScale = 100 / a.speed;
  root.style.setProperty('--aurora-1', a.colors[0]);
  root.style.setProperty('--aurora-2', a.colors[1]);
  root.style.setProperty('--aurora-3', a.colors[2]);
  root.style.setProperty('--aurora-strength', strength.toFixed(2));
  root.style.setProperty('--aurora-brightness', brightness.toFixed(2));
  root.style.setProperty('--aurora-duration-one', (12.8 * durationScale).toFixed(2) + 's');
  root.style.setProperty('--aurora-duration-two', (14 * durationScale).toFixed(2) + 's');
  root.style.setProperty('--aurora-duration-three', (10.6 * durationScale).toFixed(2) + 's');
}

export function isAuroraDefault(a: AuroraAppearance) {
  return (
    a.intensity === AURORA_DEFAULT.intensity &&
    a.speed === AURORA_DEFAULT.speed &&
    a.colors.every((color, index) => color === AURORA_DEFAULT.colors[index])
  );
}

type AuroraState = {
  appearance: AuroraAppearance;
  update: (patch: Partial<AuroraAppearance>, opts?: { persist?: boolean }) => void;
  reset: () => void;
  swapEnds: () => void;
  applyPreset: (preset: AuroraPreset) => void;
};

export const useAurora = create<AuroraState>((set, get) => {
  const inicial = load();
  return {
    appearance: inicial,

    update: (patch, opts = {}) => {
      const next = normalizeAuroraAppearance({ ...get().appearance, ...patch });
      applyAuroraAppearance(next);
      if (opts.persist !== false) persist(next);
      set({ appearance: next });
    },

    reset: () => {
      const next = normalizeAuroraAppearance(AURORA_DEFAULT);
      applyAuroraAppearance(next);
      try {
        sessionStorage.removeItem(AURORA_SESSION_KEY);
      } catch {
        /* noop */
      }
      set({ appearance: next });
    },

    swapEnds: () => {
      const c = get().appearance.colors;
      get().update({ colors: [c[2], c[1], c[0]], activePresetId: null });
    },

    applyPreset: (preset) => {
      get().update({ colors: [...preset.colors] as [string, string, string], activePresetId: preset.id });
    },
  };
});

/* Aplica el look guardado al arrancar, antes de que se monte el Home. */
export function initAurora() {
  applyAuroraAppearance(useAurora.getState().appearance);
}
