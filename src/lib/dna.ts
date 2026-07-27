/* DNA — port literal de saveDNA / recordUpgrade (public/legacy.html:4914-4938).
   La clave `rodeo_dna` y la FORMA de cada item son idénticas al viejo: un
   usuario que ya tiene datos abre la app nueva y los ve sin migración.

   El viejo guardaba el array en `state.dna` (memoria) y escribía en cada
   cambio. Aquí el caché de módulo hace lo mismo: se lee una vez de
   localStorage y a partir de ahí manda la copia en memoria — si releyéramos
   en cada saveDNA, dos escrituras en el mismo turno del coach se pisarían. */

import { store } from './storage';

export type DnaError = { type: 'error'; quote: string; fix: string; why: string; ts: number };
export type DnaSlang = { type: 'slang'; term: string; meaning: string; example: string; ts: number };
export type DnaUpgrade = {
  type: 'upgrade';
  b2: string;
  fix: string;
  swap: string;
  why: string;
  register: string;
  dominado: boolean;
  ts: number;
};
export type DnaItem = DnaError | DnaSlang | DnaUpgrade;

// Lo que entra por saveDNA: el ts lo pone la función, como en el viejo.
export type DnaNuevo =
  | { type: 'error'; quote?: string; fix: string; why?: string }
  | { type: 'slang'; term: string; meaning?: string; example?: string }
  | { type: 'upgrade'; b2?: string; fix: string; swap?: string; why?: string; register?: string; dominado?: boolean };

const LIMITE = 300; // tope duro del viejo

let dna: DnaItem[] | null = null;
const subs = new Set<(items: DnaItem[]) => void>();

function cargar(): DnaItem[] {
  if (!dna) {
    const raw = store.get<DnaItem[]>('rodeo_dna', []);
    dna = Array.isArray(raw) ? raw : [];
  }
  return dna;
}

function persistir() {
  store.set('rodeo_dna', dna);
  subs.forEach((fn) => fn(dna as DnaItem[]));
}

// La clave de dedupe del viejo: type + '|' + (fix || term || '').
function claveDe(d: { type: string; fix?: string; term?: string }): string {
  return d.type + '|' + (d.fix || d.term || '');
}

export function getDNA(): DnaItem[] {
  return cargar();
}

export function onDnaChange(fn: (items: DnaItem[]) => void): () => void {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

/* saveDNA(item) — L4914. Dedupe EXACTO por (type, fix|term): si ya existe, no
   hace nada (ni actualiza ts). Newest-first por unshift, tope 300. */
export function saveDNA(item: DnaNuevo): void {
  const lista = cargar();
  const key = claveDe(item as { type: string; fix?: string; term?: string });
  if (lista.some((d) => claveDe(d as unknown as { type: string; fix?: string; term?: string }) === key)) return;
  lista.unshift({ ...item, ts: Date.now() } as DnaItem);
  dna = lista.slice(0, LIMITE);
  persistir();
}

/* recordUpgrade — L4925. A diferencia de saveDNA, si el upgrade ya existe lo
   ACTUALIZA en sitio para que un peldaño clavado salga de "MIS FALLOS" en vez
   de repetirse. `dominado` es pegajoso; el resto solo se rellena si faltaba. */
export function recordUpgrade({
  b2,
  c1,
  swap,
  note,
  register,
  dominado,
}: {
  b2?: string;
  c1: string;
  swap?: string;
  note?: string;
  register?: string;
  dominado?: boolean;
}): void {
  const lista = cargar();
  const existing = lista.find(
    (d): d is DnaUpgrade => d.type === 'upgrade' && (d.fix || '') === c1 && (d.b2 || '') === (b2 || ''),
  );
  if (existing) {
    existing.dominado = existing.dominado || !!dominado; // "clavado" es pegajoso
    existing.b2 = existing.b2 || b2 || '';
    existing.swap = existing.swap || swap || '';
    existing.why = existing.why || note || '';
    existing.register = existing.register || register || '';
  } else {
    lista.unshift({
      type: 'upgrade',
      b2: b2 || '',
      fix: c1,
      swap: swap || '',
      why: note || '',
      register: register || '',
      dominado: !!dominado,
      ts: Date.now(),
    });
    dna = lista.slice(0, LIMITE);
  }
  persistir();
}

/* ¿Ya está esta expresión guardada como slang? (para el botón del tooltip de
   glosa) — L3385. Compara con trim + lowercase. */
export function dnaTieneSlang(term: string): boolean {
  const k = String(term || '')
    .trim()
    .toLowerCase();
  return cargar().some((d) => d.type === 'slang' && (d.term || '').trim().toLowerCase() === k);
}
