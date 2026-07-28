import { create } from 'zustand';

/* Config del botón aurora del Home — el que Gus aprobó en su referencia local.
   Tres colores con nombre propio (los del personalizador): las dos MASAS de
   color que derivan dentro de la píldora y la LUZ que remata el extremo.

   Persistencia SOLO en sessionStorage (decisión del brief del Home): el look
   se conserva al recargar, pero cada pestaña/sesión nueva arranca con el
   default. Por eso NO usa store.get/set (que es localStorage y sincroniza a
   Supabase) — esto es un juguete de sesión, no estado del usuario. */

export type AuroraCfg = {
  masa1: string;
  masa2: string;
  luz: string;
  /** 0.35–1.4 — multiplica la opacidad/presencia de las masas. */
  intensidad: number;
  /** Segundos por ciclo de deriva. Menos = más rápido. */
  velocidad: number;
  /** Nombre de la paleta activa, o null si Gus editó colores a mano. */
  paleta: string | null;
};

export type Paleta = { nombre: string; masa1: string; masa2: string; luz: string };

/* Diez paletas. La primera es la de la captura aprobada: píldora oscura que
   amanece hacia durazno/crema por la derecha con un tránsito malva. */
export const PALETAS: Paleta[] = [
  { nombre: 'Amanecer', masa1: '#241b3a', masa2: '#8a5a83', luz: '#f5cfa8' },
  { nombre: 'Boreal', masa1: '#04202e', masa2: '#0e7a6f', luz: '#9ff2c8' },
  { nombre: 'Lima RODEO', masa1: '#12210b', masa2: '#4e7a1e', luz: '#d9f56a' },
  { nombre: 'Ultravioleta', masa1: '#170b2e', masa2: '#5b2d91', luz: '#c4a6ff' },
  { nombre: 'Sangre fría', masa1: '#230a12', masa2: '#8a1f3d', luz: '#ff9fb0' },
  { nombre: 'Océano', masa1: '#061530', masa2: '#1e4f9e', luz: '#8fd0ff' },
  { nombre: 'Brasas', masa1: '#2b0f05', masa2: '#a83c0f', luz: '#ffcf7d' },
  { nombre: 'Menta nocturna', masa1: '#0a1f1a', masa2: '#2c7a5e', luz: '#c8ffe3' },
  { nombre: 'Neón', masa1: '#1c0530', masa2: '#c026d3', luz: '#67e8f9' },
  { nombre: 'Grafito', masa1: '#111114', masa2: '#3f3f46', luz: '#e4e4e7' },
];

const DEFAULT: AuroraCfg = { ...PALETAS[0], paleta: PALETAS[0].nombre, intensidad: 1, velocidad: 12 } as AuroraCfg & {
  nombre?: string;
};
// PALETAS[0] arrastra `nombre`, que no es parte de la config: fuera.
delete (DEFAULT as Record<string, unknown>).nombre;

const CLAVE = 'rodeo_aurora';

function leer(): AuroraCfg {
  try {
    const raw = sessionStorage.getItem(CLAVE);
    if (!raw) return { ...DEFAULT };
    const v = JSON.parse(raw) as Partial<AuroraCfg>;
    return {
      masa1: typeof v.masa1 === 'string' ? v.masa1 : DEFAULT.masa1,
      masa2: typeof v.masa2 === 'string' ? v.masa2 : DEFAULT.masa2,
      luz: typeof v.luz === 'string' ? v.luz : DEFAULT.luz,
      intensidad: clamp(Number(v.intensidad), 0.35, 1.4, DEFAULT.intensidad),
      velocidad: clamp(Number(v.velocidad), 4, 30, DEFAULT.velocidad),
      paleta: typeof v.paleta === 'string' || v.paleta === null ? (v.paleta as string | null) : DEFAULT.paleta,
    };
  } catch {
    return { ...DEFAULT };
  }
}

function clamp(n: number, min: number, max: number, fallback: number) {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function guardar(cfg: AuroraCfg) {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(cfg));
  } catch {
    /* sessionStorage bloqueado: el look vive solo en memoria y no pasa nada */
  }
}

type AuroraState = AuroraCfg & {
  set: (patch: Partial<AuroraCfg>) => void;
  aplicarPaleta: (p: Paleta) => void;
  intercambiarExtremos: () => void;
  restablecer: () => void;
};

export const useAurora = create<AuroraState>((set, get) => ({
  ...leer(),

  set: (patch) => {
    // Editar un color a mano desengancha la paleta con nombre (queda "custom"),
    // pero mover intensidad/velocidad no: siguen siendo la misma paleta.
    const tocaColor = 'masa1' in patch || 'masa2' in patch || 'luz' in patch;
    const next = { ...cfgDe(get()), ...patch, ...(tocaColor && !('paleta' in patch) ? { paleta: null } : {}) };
    guardar(next);
    set(next);
  },

  aplicarPaleta: (p) => {
    const next = { ...cfgDe(get()), masa1: p.masa1, masa2: p.masa2, luz: p.luz, paleta: p.nombre };
    guardar(next);
    set(next);
  },

  /* La luz y la masa oscura se cambian de lado: el "amanecer" pasa de derecha
     a izquierda. Se implementa permutando los extremos del gradiente. */
  intercambiarExtremos: () => {
    const c = cfgDe(get());
    const next = { ...c, masa1: c.luz, luz: c.masa1, paleta: null };
    guardar(next);
    set(next);
  },

  restablecer: () => {
    const next = { ...DEFAULT };
    guardar(next);
    set(next);
  },
}));

function cfgDe(s: AuroraState): AuroraCfg {
  const { masa1, masa2, luz, intensidad, velocidad, paleta } = s;
  return { masa1, masa2, luz, intensidad, velocidad, paleta };
}
