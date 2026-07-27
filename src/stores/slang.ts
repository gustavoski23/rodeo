import { create } from 'zustand';

import { callJSON } from '@/lib/api';
import { saveDNA } from '@/lib/dna';
import { store } from '@/lib/storage';
import { toast } from '@/stores/toast';
import { useTalk } from '@/stores/talk';
import {
  CATEGORIA_CALLE,
  CATEGORIA_TRABAJO,
  PAISA_SYSTEM,
  SLANG_SYSTEM,
  paisaUserPrompt,
  slangUserPrompt,
} from '@/views/slang/prompts';

/* Estado de SLANG — port de #drop-btn y translatePaisa
   (public/legacy.html:4719-4917). El DOM del viejo era el estado: aquí el feed
   y los resultados de paisa son datos y la vista los pinta.

   Tres decisiones de port que NO son cosméticas:

   1. `busy` es GLOBAL en el viejo (state.busy, compartido con TALK/STORY/
      LADDER): dos generaciones nunca podían arrancar a la vez. Ese flag ya vive
      en `src/stores/talk.ts`, así que aquí se LEE y se ESCRIBE ahí en vez de
      duplicarlo — un usuario con una charla en vuelo no puede además pedir un
      DROP, igual que antes. Se accede por los helpers `estaOcupado` /
      `marcarOcupado` de abajo, que toleran que TALK mueva o renombre el flag.

   2. El tema de cada tarjeta se calcula DESPUÉS de empujar su término a
      `seenSlang` (L4809-4810): la longitud ya viene incrementada cuando se hace
      `(seenSlang.length + i) % 5`. Se replica el orden exacto o la rotación de
      colores no coincide con la del viejo.

   3. Dos topes distintos y ambos exactos: se PERSISTEN 200 términos
      (`slice(-200)`) y se mandan al prompt 60 (`slice(-60)`).

   FUERA DE ALCANCE — el "DROP del día" (`rodeo_drop_hoy` / `rodeo_drop_manana`,
   promoción por fecha y prefetch silencioso) NO vive aquí: en el legacy es el
   motor de la lectura diaria de STORY (#drop-pane, L5226-6120), no el de esta
   vista. El `#drop-btn` de SLANG es un falso amigo léxico: genera 3 tarjetas de
   jerga y no toca ninguna de esas claves. Implementarlo desde SLANG escribiría
   la edición del día desde la vista equivocada. Ver spec-slang.md §"Aviso de
   alcance" y §B1.

   PENDIENTE DE ASIGNAR (no es de este equipo): a día de hoy NADIE porta ese
   motor — `grep -rn "rodeo_drop_hoy\|prefetchDropManana\|DROP_SYSTEM" src/` solo
   devuelve comentarios. Sin el promotor de `rodeo_drop_manana` cada usuario
   regenera y paga la edición todos los días. La Parte B de spec-slang.md le toca
   a quien porte STORY. */

export type SlangMode = 'calle' | 'trabajo' | 'paisa';

/* L4721-4727, VERBATIM. `text` es decorativo: el CSS iguala light-text y
   dark-text a --card-ink (la paleta pasó a pastel CLARO y el blanco sería
   invisible). Se emite igual por fidelidad. */
export const CARD_THEMES = [
  { bg: 'var(--card-blue)', text: 'light-text' },
  { bg: 'var(--card-green)', text: 'light-text' },
  { bg: 'var(--card-yellow)', text: 'dark-text' },
  { bg: 'var(--card-coral)', text: 'light-text' },
  { bg: 'var(--card-paper)', text: 'dark-text' },
] as const;

export type CardTheme = (typeof CARD_THEMES)[number];

/** Rotaciones fijas por posición dentro del lote (L4811). */
const ROTACIONES = [-1.2, 0.8, -0.6, 1.1, -0.9];

export type SlangCard = {
  id: number;
  term: string;
  meaning_es: string;
  example_en: string;
  example_es: string;
  wrong_use: string;
  vibe: string;
  theme: CardTheme;
  rot: number;
  /** Posición dentro de su lote: alimenta el stagger de entrada (--i del viejo). */
  i: number;
  /** El bookmark relleno tras guardar. No hay des-guardar, como en el viejo. */
  guardada: boolean;
};

export type PaisaEquivalente = { en: string; register: string; example: string; note_es: string };

export type PaisaCard = {
  id: number;
  /** La frase del USUARIO, no la que devuelve el modelo (`d.phrase` se ignora). */
  phrase: string;
  equivalents: PaisaEquivalente[];
  theme: CardTheme;
};

let seq = 0;

/* Puente hacia el `busy` global de TALK. Lo tocamos por aquí y no directo para
   que un renombrado o una mudanza del flag mientras TALK se reescribe degrade a
   un candado local en vez de romper la compilación de SLANG: el peor caso pasa
   de "no compila" a "el candado deja de ser compartido". Cuando la integración
   fije dónde vive `busy`, esto se colapsa a dos líneas. */
type CandadoGlobal = { busy?: unknown; setBusy?: (v: boolean) => void };
let ocupadoLocal = false;

function candado(): CandadoGlobal {
  return useTalk.getState() as unknown as CandadoGlobal;
}
function estaOcupado(): boolean {
  const g = candado();
  return typeof g.busy === 'boolean' ? g.busy : ocupadoLocal;
}
function marcarOcupado(v: boolean): void {
  ocupadoLocal = v;
  const g = candado();
  if (typeof g.setBusy === 'function') g.setBusy(v);
}

// ── helpers de lectura defensiva del JSON del modelo ────────────────────────
function esObjeto(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}
function str(x: unknown): string {
  return typeof x === 'string' ? x : '';
}

/* L4783-4791 — 'no cap' está prohibido porque es EL ejemplo del prompt y el
   modelo lo copiaba literal; la regex caza el placeholder del schema. */
const PLACEHOLDERS = ['the expression', 'no cap', 'the english expression'];

type SlangState = {
  mode: SlangMode;
  /** Feed acumulativo de calle+trabajo: cambiar de pill NO lo limpia (L4729). */
  feed: SlangCard[];
  /** Resultados de paisa, más nuevos primero (el viejo hacía `prepend`). */
  paisa: PaisaCard[];
  /** Términos ya vistos; se persisten recortados a 200. */
  seenSlang: string[];
  /** El héroe se oculta con el primer DROP y no vuelve en toda la sesión. */
  heroeOculto: boolean;
  generando: boolean;
  traduciendo: boolean;
  /** Marca de inicio de la generación: la vista pinta los segundos con esto. */
  desde: number | null;
  /** Últimos errores, para pintarlos en sitio además del toast. */
  error: string | null;
  errorPaisa: string | null;

  setMode: (m: SlangMode) => void;
  generar: () => Promise<void>;
  traducir: (phrase: string) => Promise<boolean>;
  guardar: (id: number) => void;
};

export const useSlang = create<SlangState>((set, get) => ({
  // `slangMode` NO se persiste en el viejo: al recargar vuelve a 'calle'.
  mode: 'calle',
  feed: [],
  paisa: [],
  seenSlang: (() => {
    const xs = store.get<string[]>('rodeo_seen_slang', []);
    return Array.isArray(xs) ? xs.filter((x): x is string => typeof x === 'string') : [];
  })(),
  heroeOculto: false,
  generando: false,
  traduciendo: false,
  desde: null,
  error: null,
  errorPaisa: null,

  setMode: (mode) => set({ mode }),

  /* #drop-btn (L4740-4855). 3 tarjetas nuevas al final del feed. */
  generar: async () => {
    const st = get();
    if (st.generando || estaOcupado()) return;
    marcarOcupado(true);
    set({ generando: true, error: null, desde: Date.now(), heroeOculto: true });

    const category = st.mode === 'trabajo' ? CATEGORIA_TRABAJO : CATEGORIA_CALLE;

    try {
      const avoid = st.seenSlang.slice(-60).join(', ') || 'none';
      // 5000: el caso bueno usa ~2200 tokens; deja margen y acota el peor caso
      // (un finish 'length' a 8000 costaba ~4x más). Comentario del viejo.
      const { parsed } = await callJSON(
        'creative',
        [
          { role: 'system', content: SLANG_SYSTEM },
          { role: 'user', content: slangUserPrompt(category, avoid) },
        ],
        5000,
      );

      const crudas = Array.isArray(parsed) ? (parsed as unknown[]) : [];
      const valid = crudas.filter((c): c is Record<string, unknown> => {
        if (!esObjeto(c)) return false;
        if (!str(c.term) || !str(c.meaning_es) || !str(c.example_en)) return false;
        if (PLACEHOLDERS.includes(String(c.term).toLowerCase().trim())) return false;
        return !/significado en español/i.test(String(c.meaning_es));
      });
      if (!valid.length) throw new Error('Respuesta inválida, dale otra vez');

      // Orden EXACTO del viejo: push del término y, con la longitud ya
      // incrementada, el tema de esa misma tarjeta.
      const seen = [...get().seenSlang];
      const nuevas: SlangCard[] = valid.map((c, i) => {
        seen.push(str(c.term));
        return {
          id: ++seq,
          term: str(c.term),
          meaning_es: str(c.meaning_es),
          example_en: str(c.example_en),
          example_es: str(c.example_es),
          wrong_use: str(c.wrong_use),
          vibe: str(c.vibe) || 'slang',
          theme: CARD_THEMES[(seen.length + i) % CARD_THEMES.length]!,
          rot: ROTACIONES[i % ROTACIONES.length]!,
          i,
          guardada: false,
        };
      });

      store.set('rodeo_seen_slang', seen.slice(-200));
      set((s) => ({ feed: [...s.feed, ...nuevas], seenSlang: seen }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      toast('Error: ' + msg, 6000);
    } finally {
      set({ generando: false, desde: null });
      marcarOcupado(false);
    }
  },

  /* translatePaisa (L4858-4917). Devuelve true en éxito: el input se limpia
     SOLO entonces, como en el viejo. */
  traducir: async (phrase: string) => {
    const limpia = phrase.trim();
    if (!limpia || get().traduciendo || estaOcupado()) return false;
    marcarOcupado(true);
    set({ traduciendo: true, errorPaisa: null });

    try {
      const { parsed } = await callJSON(
        'creative',
        [
          { role: 'system', content: PAISA_SYSTEM },
          { role: 'user', content: paisaUserPrompt(limpia) },
        ],
        2600,
      );

      const d = esObjeto(parsed) ? parsed : null;
      if (!d || !Array.isArray(d.equivalents)) throw new Error('No pude traducir eso, intenta de nuevo');

      const equivalents: PaisaEquivalente[] = (d.equivalents as unknown[]).filter(esObjeto).map((eq) => ({
        en: str(eq.en),
        register: str(eq.register),
        example: str(eq.example),
        note_es: str(eq.note_es),
      }));

      const card: PaisaCard = {
        id: ++seq,
        phrase: limpia, // la del usuario; `d.phrase` se ignora a propósito
        equivalents,
        theme: CARD_THEMES[Math.floor(Math.random() * CARD_THEMES.length)]!,
      };
      set((s) => ({ paisa: [card, ...s.paisa] }));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ errorPaisa: msg });
      toast('Error: ' + msg);
      return false;
    } finally {
      set({ traduciendo: false });
      marcarOcupado(false);
    }
  },

  /* .save-slang (L4829-4834). saveDNA deduplica por type|term case-sensitive:
     un segundo clic es no-op silencioso, pero el icono se rellena igual. */
  guardar: (id: number) => {
    const card = get().feed.find((c) => c.id === id);
    if (!card) return;
    saveDNA({ type: 'slang', term: card.term, meaning: card.meaning_es, example: card.example_en });
    toast('Guardado en tu DNA');
    set((s) => ({ feed: s.feed.map((c) => (c.id === id ? { ...c, guardada: true } : c)) }));
  },
}));
