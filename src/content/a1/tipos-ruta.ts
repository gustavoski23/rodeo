/* Extensiones ADITIVAS de tipos.ts para la RUTA. Archivo aparte a propósito:
   tipos.ts es el punto de encuentro de tres workstreams y no se le mete mano
   mientras la ruta no esté verificada en pantalla. Cuando lo esté, esto se
   fusiona ahí y este archivo desaparece.

   Todo acá es OPCIONAL. El contenido viejo sigue tipando sin tocar una línea:
   una unidad sin `tramo` es del tronco, una escena sin `nodeKind` es una
   escena normal, un chunk sin `kind` es una frase. */

import type { A1Chunk, A1Scene, A1Unit } from './tipos';

export type A1TramoId = 't0' | 't1' | 't2' | 't3' | 't4' | 't5' | 't6' | 't7';

/** Sección del mapa. Es lo que pinta la cabecera pegajosa del camino. */
export type A1Tramo = {
  id: A1TramoId;
  order: number;
  title_es: string;
  /** Una línea. Lo que vas a PODER hacer, no lo que vas a estudiar. */
  promesa_es: string;
  /** Token de card existente. Nunca coral: en Hablarte ese color significa error. */
  cardTheme: string;
  icon: string;
  /** Ids de unidades, en orden de camino. */
  unitIds: string[];
  /** 'espina' = obligatorio en orden · 'viaje'/'job' = se puede abrir por atajo. */
  branch: 'espina' | 'viaje' | 'job';
  /** Si existe, el mapa ofrece saltarse la fila: "¿Viajás la otra semana?". */
  atajo_es?: string;
};

/* ── Nodos del camino ────────────────────────────────────────────────────
   Una escena puede pedir un motor distinto al loop de 7 pasos. Solo el Tramo 0
   usa los dos nuevos, y solo porque enseñar una palabra suelta con siete pasos
   es una ceremonia absurda: la palabra se ve, se oye, se repite y se sigue. */

export type NodeKind =
  /** Loop de 7 pasos de siempre (sesion.tsx). El default. */
  | 'escena'
  /** Tarjetas de palabra suelta: ver → oír → repetir → siguiente. */
  | 'palabras'
  /** Un fonema: se oye el par mínimo, se repite, PasoVoz decide. */
  | 'sonido';

export type A1SceneRuta = A1Scene & {
  nodeKind?: NodeKind;
  /** Solo en 'sonido': el par que se contrasta ("very" vs "berry"). */
  parMinimo?: [string, string];
};

export type A1ChunkRuta = A1Chunk & {
  /** 'palabra' cambia la tarjeta y saca los pasos de anticipación/producción. */
  kind?: 'palabra' | 'frase';
};

/* ── El bloque del COACH ─────────────────────────────────────────────────
   Va en el CONTENIDO, no en el prompt. Motivo: el coach solo puede hablar de
   lo que ya se enseñó, y quien sabe qué se enseñó es el contenido. Si esto
   viviera en el prompt, el modelo terminaría metiendo vocabulario de A2 en una
   conversación de pre-A1 — que es exactamente la forma más rápida de que
   alguien sienta que no sabe nada.

   Nada de esto se usa offline. Se escribe ahora para no retrofitear 660
   frases después. */
export type A1Coach = {
  /** La situación, en una línea. Se la lee el usuario antes de entrar. */
  escenario_es: string;
  /** Qué tiene que LOGRAR, no qué tiene que decir. */
  meta_es: string;
  /** Primera línea del coach, en inglés. Corta y con una sola pregunta. */
  abridor_en: string;
  /** La misma, en español, por si se traba y pide traducción. */
  abridor_es: string;
  /** El vocabulario que el coach TIENE PERMITIDO usar. Nada más. */
  chunkIds: string[];
  /** Máximo de correcciones en toda la conversación. Default 2. Nunca >3. */
  topeCorrecciones?: number;
};

export type A1UnitRuta = Omit<A1Unit, 'scenes'> & {
  tramo: A1TramoId;
  scenes: A1SceneRuta[];
  /** Si falta, esta parada no abre conversación (las de sonidos, por ejemplo). */
  coach?: A1Coach;
};
