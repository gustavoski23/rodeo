import type { A1Chunk } from '@/content/a1/tipos';
import type { A1Coach, A1UnitRuta } from '@/content/a1/tipos-ruta';
import { store } from '@/lib/storage';
import { useA1, type Nota } from '@/stores/a1';

/* EL COACH DEL A1 — el motor, sin una línea de DOM y sin una llamada al modelo.

   Este archivo existe por una razón concreta: **el problema del coach no es
   detectar errores, es decidir cuáles callarse**, y esa decisión NO se le puede
   delegar al prompt. Un prompt es una petición; un modelo que se entusiasma
   corrige nueve veces aunque le hayas pedido una. Acá está la compuerta que
   decide qué sale por pantalla, y el modelo solo PROPONE.

   Lo que se gana con eso, además de que se cumpla la regla:
   se puede probar entero sin modelo. Todos los tests de tests/coach.test.mjs
   corren contra estas funciones con transcripciones simuladas.

   Las siete reglas de COACH-diseño.md, y dónde vive cada una:
     R1 reformular, no señalar  → PROHIBIDAS + limpiarProhibidas() (y el prompt)
     R2 tope duro               → pasarTurno(), motivo 'tope'
     R3 solo lo ya enseñado     → pasarTurno(), motivo 'fuera-de-lista'
     R4 se cobra mañana         → conv.aSrs + aplicarSrs()
     R5 bilingüe pa' desbloquear→ el prompt (coach-prompts.ts)
     R6 reconocimiento concreto → el prompt
     R7 el debrief son 3 bloques→ parsearCierre() + coach-debrief.tsx */

/* ═══════════════════ Las palabras que delatan una corrección ═══════════════

   Prohibidas porque son el sonido de que te están señalando. Da igual lo suave
   que venga la frase después: "Casi. Se dice…" ya rompió la conversación y
   convirtió al otro en profesor.

   Van las españolas de COACH-diseño §3 Y las inglesas, y las inglesas no son
   un extra: el coach habla en inglés casi todo el tiempo, así que su forma
   natural de romper la regla no es "en realidad" sino "actually, we say…".
   Testear solo la lista española sería testear el caso raro.

   Se comparan sin tildes y con límites de palabra, pero con las variantes que
   importan pegadas al patrón: `error` tiene que cazar «errores» y `incorrecto`
   sus cuatro formas — si no, la regla se esquiva escribiendo el plural. */
export const PROHIBIDAS_ES: readonly RegExp[] = [
  /\berrores?\b/i,
  /\bincorrect[oa]s?\b/i,
  /\bcasi\b/i,
  /\bse dice\b/i,
  /\bojo\b/i,
  /\ben realidad\b/i,
];

/* La lista inglesa es DELIBERADAMENTE MÁS ANGOSTA que la española, y no es
   descuido. En español las seis palabras del diseño solo aparecen corrigiendo:
   un mesero no dice «en realidad» ni «se dice». En inglés no: `wrong`,
   `almost` y `actually` son palabras de todos los días en una escena de
   servicio — "wrong gate, sorry", "we're almost full", "actually, we do have a
   table". Con el patrón pelado, el filtro le borraba al personaje frases
   perfectamente normales, y borrar en silencio es peor que no filtrar: el
   usuario ve un turno cojo y no sabe por qué.

   Así que acá van solo los patrones INEQUÍVOCAMENTE metalingüísticos. El
   prompt sí pide la versión amplia ("nada de 'actually'"): la petición puede
   ser generosa porque no rompe nada si el modelo la obedece de más; la
   compuerta tiene que ser precisa porque borra.

   `in English` está en la lista por otra razón: no es que corrija, es que el
   personaje se salió del papel. Un oficial de migración no menciona el idioma. */
export const PROHIBIDAS_EN: readonly RegExp[] = [
  /\bmistakes?\b/i,
  /\bincorrect\b/i,
  /\b(that'?s|that is|it'?s|it is|you'?re|you are) wrong\b/i,
  /\bwe say\b/i,
  /\byou (should|shouldn't|mean|meant|can) say\b/i,
  /\bthe correct (way|form|word|sentence)\b/i,
  /\balmost\s*[!.,]/i,
  /\balmost (right|correct)\b/i,
  /\bin english\b/i,
];

export const PROHIBIDAS: readonly RegExp[] = [...PROHIBIDAS_ES, ...PROHIBIDAS_EN];

/** Quita tildes para que «está» no esquive un patrón escrito sin ellas. */
function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** La primera prohibida que aparece en el texto, o null. */
export function palabraProhibida(texto: string): string | null {
  const plano = sinTildes(String(texto ?? ''));
  for (const re of PROHIBIDAS) {
    const m = plano.match(re);
    if (m) return m[0].toLowerCase();
  }
  return null;
}

/* Corta por oración y tira las que traen una prohibida, en vez de tirar el
   turno entero: lo normal es que el modelo cumpla en tres frases y se le escape
   la cuarta ("Nice! Two, please. Actually, we say two tickets."). Quedarse con
   las tres es exactamente lo que queríamos que dijera.

   Si NO queda nada, devuelve '' a propósito y quien llama descarta el turno.
   Un turno que era puro señalamiento no tiene versión buena, y el silencio es
   mejor que un regaño: la conversación se retoma sola en el siguiente turno. */
export function limpiarProhibidas(texto: string): string {
  const bruto = String(texto ?? '').trim();
  if (!bruto) return '';
  const oraciones = bruto.match(/[^.!?¡¿\n]+[.!?\n]*/g) ?? [bruto];
  const buenas = oraciones.filter((o) => !palabraProhibida(o));
  return buenas.join('').replace(/\s+/g, ' ').trim();
}

/* ═══════════════════ Vocabulario permitido ═══════════════════ */

export type CoachVocab = { id: string; en: string; es: string };

/** El default de `topeCorrecciones`, y su techo. COACH-diseño §2 R2: 2 por
    conversación, 1 en el Tramo 0, nunca más de 3. El techo se aplica acá y no
    en el contenido porque el contenido lo escribe una persona con prisa. */
export const TOPE_DEFECTO = 2;
export const TOPE_MAXIMO = 3;

export function topeDe(coach: A1Coach): number {
  const n = coach.topeCorrecciones ?? TOPE_DEFECTO;
  return Math.max(0, Math.min(Math.trunc(n) || 0, TOPE_MAXIMO));
}

/** Resuelve `coach.chunkIds` contra el índice del catálogo. Los ids que no
    resuelven se caen en silencio: un id podrido en el contenido no puede dejar
    al coach sin conversación, y el test de la ruta ya vigila que resuelvan. */
export function vocabularioDe(coach: A1Coach, chunks?: Record<string, A1Chunk>): CoachVocab[] {
  const ix = chunks ?? useA1.getState().indice.chunk;
  const out: CoachVocab[] = [];
  const vistos = new Set<string>();
  for (const id of coach.chunkIds) {
    const c = ix[id];
    if (!c || vistos.has(id)) continue;
    vistos.add(id);
    out.push({ id, en: c.en, es: c.es });
  }
  return out;
}

/* ═══════════════════ La conversación ═══════════════════ */

export type MotivoDescarte = 'tope' | 'fuera-de-lista' | 'repetida' | 'palabra-prohibida';

/** Lo que el modelo PROPONE en cada turno. Nada de esto llega a pantalla sin
    pasar por pasarTurno(). */
export type TurnoModelo = {
  reply?: unknown;
  /** El chunk que el modelo quiere corregir en voz alta. */
  correccion?: { chunkId?: unknown } | null;
  /** Los que falló y NO va a nombrar. Se cobran mañana (R4). */
  fallos?: unknown;
  cerrar?: unknown;
};

/** Lo que de verdad sale a pantalla. */
export type TurnoLimpio = {
  reply: string;
  /** El chunk que SÍ se corrigió, para la cuenta. null = este turno no corrigió. */
  corregido: string | null;
  /** Por qué se tiró la corrección que proponía el modelo. Instrumentación y
      tests; el usuario no ve esto nunca. */
  descartada: MotivoDescarte | null;
  cerrar: boolean;
};

export type Conversacion = {
  unitId: string;
  tope: number;
  /** Los chunkIds de ESTA parada. Fuera de acá no se corrige nada (R3). */
  permitidos: Set<string>;
  usadas: number;
  /** No se corrige dos veces la misma cosa. */
  corregidos: Set<string>;
  /** Lo que se va a cobrar mañana, en silencio (R4). */
  aSrs: Map<string, Nota>;
  /** Palabras de cada turno del usuario, en orden. La señal de encogimiento. */
  largos: number[];
};

/** ¿Esta parada tiene conversación? Lo pregunta el mapa para pintar el nodo, y
    vive acá —no en coach-turno.ts— para que el mapa no tenga que importar la
    máquina de turnos (y con ella la capa de API) solo para un predicado. */
export function tieneCoach(u: A1UnitRuta | undefined | null): boolean {
  return !!u?.coach && u.coach.chunkIds.length > 0;
}

export function abrirConversacion(unit: A1UnitRuta): Conversacion | null {
  if (!unit.coach) return null;
  return {
    unitId: unit.id,
    tope: topeDe(unit.coach),
    permitidos: new Set(unit.coach.chunkIds),
    usadas: 0,
    corregidos: new Set(),
    aSrs: new Map(),
    largos: [],
  };
}

function comoLista(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : [];
}

/** Anota el largo del turno del usuario. Palabras, no caracteres: lo que mide
    si se está encogiendo es cuánto se anima a decir, no cuánto teclea. */
export function anotarTurnoUsuario(conv: Conversacion, texto: string): void {
  const n = String(texto ?? '').trim().split(/\s+/).filter(Boolean).length;
  if (n > 0) conv.largos.push(n);
}

/* LA COMPUERTA. Recibe lo que propuso el modelo y devuelve lo que se pinta.

   EL ORDEN DE LOS MOTIVOS NO ES COSMÉTICO, y no es el que parecía. La primera
   versión miraba el TOPE primero, con el argumento de que agotado el tope ya da
   igual el resto. MEDIDO con la transcripción de doce errores del test: el tope
   se gasta en los dos primeros turnos y a partir de ahí TODO sale como 'tope',
   incluidas las tres correcciones de vocabulario que esta parada nunca enseñó.
   O sea que la instrumentación dejaba de ver la única falla que importa
   arreglar en el prompt.

   Ahora primero se pregunta si la corrección era LEGÍTIMA (¿es de esta parada?
   ¿ya la corregimos? ¿la frase señala en vez de reformular?) y de última si
   había PRESUPUESTO. Para el usuario no cambia nada —descartada es descartada—
   y para quien lee las señales cambia todo.

   El filtro de palabras se mira contra el reply CRUDO, no contra el limpio: si
   la reformulación vivía justo en la frase que el filtro cortó, la corrección
   no ocurrió, y contarla habría gastado el tope en algo que nadie dijo.

   Pase lo que pase con la corrección, el chunk fallado SIEMPRE entra al SRS.
   Incluido el que sí se corrigió: oír la forma buena en la conversación es
   distinto de haberla producido, y el repaso de mañana no es un castigo. */
export function pasarTurno(conv: Conversacion, crudo: TurnoModelo | null | undefined): TurnoLimpio | null {
  const bruto = typeof crudo?.reply === 'string' ? crudo.reply : '';
  const reply = limpiarProhibidas(bruto);
  if (!reply) return null; // turno inservible: quien llama decide (reintento / aviso)

  const fallos = comoLista(crudo?.fallos);
  const pedido = typeof crudo?.correccion?.chunkId === 'string' ? crudo.correccion.chunkId : null;

  let corregido: string | null = null;
  let descartada: MotivoDescarte | null = null;

  if (pedido) {
    if (!conv.permitidos.has(pedido)) descartada = 'fuera-de-lista';
    else if (conv.corregidos.has(pedido)) descartada = 'repetida';
    else if (palabraProhibida(bruto)) descartada = 'palabra-prohibida';
    else if (conv.usadas >= conv.tope) descartada = 'tope';
    else {
      corregido = pedido;
      conv.usadas++;
      conv.corregidos.add(pedido);
    }
  }

  // R4: todo lo fallado se cobra mañana. Solo del vocabulario de la parada —
  // lo que no se enseñó no es un error y no tiene por qué entrar al Leitner.
  for (const id of [...fallos, ...(pedido ? [pedido] : [])]) {
    if (conv.permitidos.has(id) && !conv.aSrs.has(id)) conv.aSrs.set(id, 'casi');
  }

  return { reply, corregido, descartada, cerrar: crudo?.cerrar === true };
}

/* ═══════════════════ El cierre ═══════════════════ */

export type CierreModelo = {
  logro_es?: unknown;
  unaCosa_es?: unknown;
  fraseGanada?: unknown;
  srs?: unknown;
  correccionesUsadas?: unknown;
};

/** Lo que ve el usuario al cerrar. TRES bloques y en este orden, siempre.
    Nunca un listado de fallas: si hubo doce, once se quedan en el SRS. */
export type Cierre = {
  logro_es: string;
  unaCosa_es: string;
  frase: A1Chunk | null;
  /** Solo para la instrumentación. No se pinta. */
  correcciones: number;
  /** Solo para la instrumentación. No se pinta. */
  aSrs: { chunkId: string; nota: Nota }[];
};

function textoCorto(v: unknown, tope: number): string {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length > tope ? s.slice(0, tope).trimEnd() + '…' : s;
}

function nota(v: unknown): Nota {
  return v === 'todavia' ? 'todavia' : 'casi';
}

/* La frase ganada NO puede quedar vacía. Es uno de los tres bloques del
   debrief, y un bloque con título y nada debajo es el fallo #1 de este repo
   (CLAUDE.md regla 1). El modelo devuelve un chunkId y a veces devuelve
   cualquier cosa, así que hay cadena de respaldo:
     1. el chunkId que mandó, si resuelve y es de esta parada
     2. la primera del vocabulario que NO cayó al SRS — o sea, una que le salió
     3. la primera del vocabulario, y ya
   El paso 2 es el que importa: "la frase que ganaste" tiene que ser una que le
   haya salido, y quién falló qué lo sabemos nosotros, no el modelo. */
function elegirFrase(
  pedida: unknown,
  vocab: readonly CoachVocab[],
  aSrs: ReadonlySet<string>,
  ix: Record<string, A1Chunk>,
): A1Chunk | null {
  const id = typeof pedida === 'string' ? pedida : '';
  const permitida = vocab.some((v) => v.id === id);
  if (id && permitida && ix[id]) return ix[id]!;
  const limpia = vocab.find((v) => !aSrs.has(v.id) && ix[v.id]);
  if (limpia) return ix[limpia.id]!;
  const primera = vocab.find((v) => ix[v.id]);
  return primera ? ix[primera.id]! : null;
}

export function parsearCierre(
  crudo: CierreModelo | null | undefined,
  conv: Conversacion,
  vocab: readonly CoachVocab[],
  chunks?: Record<string, A1Chunk>,
): Cierre | null {
  if (!crudo) return null;
  const ix = chunks ?? useA1.getState().indice.chunk;

  /* Los del turno mandan sobre los del cierre: el motor los fue anotando
     mientras pasaba, y el modelo re-listándolos al final es una segunda
     opinión, no la fuente. Se fusionan (el modelo puede haber visto uno que el
     turno no reportó) pero solo dentro del vocabulario de la parada. */
  const mezcla = new Map(conv.aSrs);
  const lista = Array.isArray(crudo.srs) ? crudo.srs : [];
  for (const it of lista) {
    const id = (it as { chunkId?: unknown })?.chunkId;
    if (typeof id !== 'string' || !conv.permitidos.has(id)) continue;
    mezcla.set(id, nota((it as { nota?: unknown })?.nota));
  }

  const logro = textoCorto(crudo.logro_es, 160);
  const unaCosa = textoCorto(crudo.unaCosa_es, 160);
  if (!logro && !unaCosa) return null; // sin los dos textos no hay hoja que pintar

  return {
    logro_es: logro || 'Sostuviste la conversación entera en inglés.',
    unaCosa_es: unaCosa || 'Sigue igual: frases cortas y sin traducir en la cabeza.',
    frase: elegirFrase(crudo.fraseGanada, vocab, new Set(mezcla.keys()), ix),
    correcciones: conv.usadas,
    aSrs: [...mezcla].map(([chunkId, n]) => ({ chunkId, nota: n })),
  };
}

/** Aplica el SRS EN SILENCIO. Devuelve cuántas cayeron; nadie lo muestra.
    Es la corrección que el usuario recibe mañana en el Repaso de pasillo, en
    el único contexto donde corregir no duele: una tarjeta, sin nadie mirando. */
export function aplicarSrs(cierre: Cierre): number {
  const calificar = useA1.getState().calificar;
  let n = 0;
  for (const { chunkId, nota: nt } of cierre.aSrs) {
    if (calificar(chunkId, nt)) n++;
  }
  return n;
}

/* ═══════════════════ Señales — de CONDUCTA, no de satisfacción ═══════════════

   Clave NUEVA (`rodeo_a1_coach`). Las rodeo_a1_* del legacy no reciben campos
   nuevos por esto: el progreso y el Leitner ya tienen su forma en el celular de
   alguien y no se toca.

   ⚠️ LA TRAMPA, y está escrita en el código a propósito porque en un documento
   nadie la lee a tiempo: LA PRECISIÓN SUBE CUANDO EL USUARIO HABLA MENOS. Un
   coach más duro va a mostrar mejor exactitud y peor TODO lo demás — turnos más
   cortos, más abandonos, nadie vuelve. Optimizar exactitud es optimizar el
   silencio del usuario.

   Por eso acá no se guarda exactitud, ni aciertos, ni "errores por turno". No
   es que no se calcule: es que NO HAY CAMPO DONDE PONERLA. Si alguien la
   quiere, tiene que agregar el campo, y ahí se va a topar con este comentario. */

const K_COACH = 'rodeo_a1_coach';
const CAP_SESIONES = 60;

export type SesionCoach = {
  ts: number;
  unitId: string;
  /** Palabras de cada turno del usuario, en orden. */
  largos: number[];
  /** Se salió a mitad, sin llegar al cierre. */
  abandonada: boolean;
  /** Volvió a un coach que ya había hecho: nadie se lo pidió. */
  porSuCuenta: boolean;
  correcciones: number;
};

function leerSesiones(): SesionCoach[] {
  const v = store.get<SesionCoach[] | null>(K_COACH, null);
  return Array.isArray(v) ? v : [];
}

/** ¿Es una vuelta voluntaria? El nodo del coach nunca empuja a nadie —siempre
    es un toque— así que lo que distingue "se lo ofrecimos" de "volvió solo" es
    si ya había hecho esa conversación antes. */
export function esVuelta(unitId: string): boolean {
  return leerSesiones().some((s) => s.unitId === unitId);
}

export function anotarSesion(s: SesionCoach): void {
  store.set(K_COACH, [...leerSesiones(), s].slice(-CAP_SESIONES));
}

export type SenalesCoach = {
  sesiones: number;
  /** Cambio de largo dentro de la conversación: <0 = se está encogiendo.
      null = todavía no hay conversaciones de 4+ turnos para medirlo. */
  encogimiento: number | null;
  /** Fracción de sesiones que se abandonaron a mitad. */
  abandono: number;
  /** Fracción de sesiones a las que volvió sin que se lo pidieran. */
  vuelven: number;
};

/** Las tres señales de COACH-diseño §4. Se leen juntas o no se leen: por
    separado cada una miente. */
export function senalesCoach(): SenalesCoach {
  const ss = leerSesiones();
  if (!ss.length) return { sesiones: 0, encogimiento: null, abandono: 0, vuelven: 0 };

  const medibles = ss.filter((s) => s.largos.length >= 4);
  let encogimiento: number | null = null;
  if (medibles.length) {
    let suma = 0;
    for (const s of medibles) {
      const mitad = Math.floor(s.largos.length / 2);
      const prom = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
      const antes = prom(s.largos.slice(0, mitad));
      const despues = prom(s.largos.slice(-mitad));
      suma += antes > 0 ? (despues - antes) / antes : 0;
    }
    encogimiento = suma / medibles.length;
  }

  return {
    sesiones: ss.length,
    encogimiento,
    abandono: ss.filter((s) => s.abandonada).length / ss.length,
    vuelven: ss.filter((s) => s.porSuCuenta).length / ss.length,
  };
}
