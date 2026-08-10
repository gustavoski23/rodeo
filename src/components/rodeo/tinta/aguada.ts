/* LA RECETA — el núcleo compartido de "tinta y aguada".

   Acá no hay nada por icono: todo sale de una función del NOMBRE del concepto.
   Es lo que hace que la receta escale a los ~115 conceptos del contenido sin
   curaduría manual — lo único que un humano elige por icono es CUÁL icono
   (conceptos.ts), nunca el tratamiento.

   POR QUÉ EXISTE ESTE ARCHIVO. Los iconos de escena eran emoji del sistema y
   desentonaban con el mundo dibujado a tinta y aguada. Medido: a 18 px el emoji
   mete 5-6x más croma que un icono de línea (77 contra 12-31); el 🛂 es un
   azulejo azul sólido y el 🎁 llega a croma 172. Y encima fallan: 🪪 y 🛟
   salieron como cuadrito vacío en el Android de Gus por ser de Unicode 14.

   Se carearon dos caminos sobre los mismos 8 conceptos y ganó el barato:
     · a mano  — 12,4 kB gz para 65 iconos, 13-16 h, y a 18 px su aguada NO SE
       VE porque vive DENTRO del contorno y el propio trazo se la come.
     · lucide entintado — 7,9 kB gz, 3-5 h, y su aguada DESBORDA el dibujo
       (viewBox -4..28), que es justo lo que la deja sobrevivir al achique:
       gana 2,3x en pigmento a 18 px en tema claro.
   En tema oscuro los dos son indistinguibles (15,5 contra 12,0 es ruido de
   antialias). Decisión: lucide entintado como sistema, a mano solo donde lucide
   no da (conceptos.ts sabe recibir un dibujo propio).

   Las manchas las generó scratchpad/iconos/lucide/_medicion/gen-lavados.mjs. Si
   se regeneran se pega el resultado acá — no se editan a mano las curvas. */

/* ── El lienzo ─────────────────────────────────────────────────────────────
   lucide dibuja en 0..24. Acá el viewBox es -4..28 (32 de lado) y NO es un
   detalle: la primera versión mantuvo el viewBox de 24 y acotó la mancha a
   radio 9.4 para que no la recortara el borde. Resultado, visible en la primera
   captura: la mancha quedaba MÁS CHICA que el dibujo, siempre por detrás y
   nunca desbordándolo, y el ojo la leía como una sombra sucia — un cerco de
   café debajo del icono. Una aguada que cabe dentro del contorno no es una
   aguada. Con 32 de lado la mancha desborda el dibujo por donde le toca y
   sigue sin tocar el recorte (12.4 de radio + 2.2 de corrimiento = 26.6 < 28).

   Consecuencia para quien lo monte: el <svg> mide `px * 32/24` y la TINTA mide
   `px`. O sea, para un dibujo de 18 px el elemento ocupa 24 px. En la fila de la
   portada y en el disco de 68 del mapa sobra lugar. */
export const VB = { min: -4, lado: 32 } as const;
export const FACTOR_CAJA = VB.lado / 24; // 1.3333…

/* ── Las tres manchas ──────────────────────────────────────────────────────
   Centradas en 0,0, radio máximo 12.4. 1232 bytes crudos las tres, y se pagan
   UNA vez para todos los conceptos: van en un <defs> global (<TintaDefs/>) y
   cada icono las referencia con <use>. */
export const MANCHAS = {
  a: 'M9.3 0C8.9 1.1 7.8 1.9 7.3 2.8C6.7 3.7 6.6 4.7 6 5.6C5.4 6.5 4.7 7.7 3.7 8.3C2.7 8.8 1.3 8.9 0 9C-1.3 9 -2.7 9 -3.8 8.6C-5 8.2 -6.4 7.5 -7 6.5C-7.6 5.6 -7.5 4 -7.5 2.9C-7.5 1.8 -7.2 0.9 -7.1 0C-7 -0.9 -7.3 -1.8 -7 -2.7C-6.8 -3.6 -6.3 -4.4 -5.7 -5.3C-5.1 -6.2 -4.5 -7.1 -3.5 -8C-2.6 -8.8 -1.4 -10.3 0 -10.6C1.4 -11 3.3 -10.8 4.6 -10.2C5.9 -9.7 6.9 -8.3 7.8 -7.2C8.6 -6.1 9.4 -4.9 9.7 -3.7C9.9 -2.5 9.7 -1.1 9.3 0Z',
  b: 'M8.8 0C8.6 0.9 8 1.7 7.4 2.4C6.9 3.1 6 3.6 5.3 4.2C4.6 4.8 4.1 5.4 3.2 6.1C2.4 6.8 1.2 8.2 0 8.5C-1.2 8.8 -2.9 8.4 -4.2 8C-5.5 7.6 -7.1 7 -7.8 6.1C-8.6 5.2 -8.3 3.8 -8.6 2.8C-9 1.8 -9.8 1 -10 0C-10.2 -1 -10.3 -2.2 -10 -3.2C-9.6 -4.3 -9 -5.5 -8 -6.2C-7 -6.9 -5.3 -7.5 -4 -7.5C-2.6 -7.5 -1.2 -6.5 0 -6.2C1.2 -5.9 2.1 -5.9 3 -5.6C3.9 -5.3 4.5 -4.7 5.5 -4.3C6.5 -3.8 8.2 -3.5 8.8 -2.8C9.3 -2.1 9.1 -0.9 8.8 0Z',
  c: 'M7.5 0C7.7 1 7.9 2.2 7.7 3.3C7.5 4.3 7 5.6 6.3 6.5C5.6 7.4 4.6 8.4 3.5 8.7C2.5 8.9 1 8.2 0 7.9C-1 7.5 -2 7.3 -2.7 6.7C-3.4 6.1 -3.5 4.9 -4.1 4.2C-4.8 3.6 -5.7 3.4 -6.4 2.7C-7 2 -7.7 1.1 -8.2 0C-8.7 -1.1 -9.5 -2.6 -9.5 -4C-9.6 -5.5 -9.2 -7.4 -8.4 -8.6C-7.6 -9.7 -5.9 -10.6 -4.5 -11.1C-3.1 -11.5 -1.3 -11.8 0 -11.3C1.3 -10.9 2.4 -9.2 3.3 -8.2C4.2 -7.2 5 -6.5 5.5 -5.6C5.9 -4.6 5.8 -3.5 6.1 -2.6C6.5 -1.7 7.2 -1 7.5 0Z',
} as const;

export type ClaveMancha = keyof typeof MANCHAS;

/* ── El sorteo ─────────────────────────────────────────────────────────────
   FNV-1a de 32 bits sobre el nombre del concepto. Se usa un hash y no
   Math.random por una razón dura: el icono tiene que salir IGUAL siempre. Si
   "avion" se pintara distinto en la portada que en el mapa, o distinto después
   de recargar, dejaría de ser un icono y pasaría a ser ruido.
   FNV-1a y no algo más serio porque no es criptografía: solo hace falta que
   nombres parecidos ("cafe" / "cafeteria") caigan lejos, y eso lo cumple. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Bits [desde, desde+ancho) del hash, normalizados a 0..1. */
function trozo(h: number, desde: number, ancho: number): number {
  return ((h >>> desde) & ((1 << ancho) - 1)) / ((1 << ancho) - 1);
}

export interface Sorteo {
  mancha: ClaveMancha;
  giroMancha: number;
  /** grados: giro del dibujo de tinta (chico, ±5.5) */
  giroTinta: number;
  /** corrimiento del centro de la mancha, en unidades de la grilla de 24 */
  dx: number;
  dy: number;
  escala: number;
  tono: 'ocre' | 'verdemar';
}

/* Cada campo se lee de bits DISTINTOS del mismo hash. Si todos salieran del
   mismo número, el giro y el corrimiento quedarían correlacionados y las
   manchas se alinearían en diagonal a lo largo de una lista — se ve. */
export function sortear(concepto: string): Sorteo {
  const h = fnv1a(concepto);
  const ang = trozo(h, 11, 8) * Math.PI * 2;
  /* El corrimiento va en polares y no en dx/dy sueltos para que la distancia
     sea pareja: con dx y dy independientes salen muchas manchas casi centradas
     (el caso aburrido) y pocas bien corridas. */
  const r = 1.3 + trozo(h, 19, 6) * 0.9;
  return {
    mancha: (['a', 'b', 'c'] as const)[h % 3]!,
    giroMancha: trozo(h, 2, 9) * 360,
    giroTinta: (trozo(h, 25, 6) - 0.5) * 11,
    dx: Math.cos(ang) * r,
    dy: Math.sin(ang) * r,
    escala: 0.84 + trozo(h, 5, 5) * 0.18,
    /* El tono se sortea en vez de asignarse por significado. En un cuaderno de
       viaje real el pintor tiene dos panes cargados y usa el que tiene a mano;
       que dos escenas seguidas caigan en ocre no es un error, es la verdad del
       medio. Asignarlo por semántica pedía curar ~115 casos a mano, que es
       justo lo que esta receta existe para evitar. */
    tono: (h >>> 9) & 1 ? 'ocre' : 'verdemar',
  };
}

/* ── Las capas de agua ─────────────────────────────────────────────────────
   Dos copias de la MISMA mancha, no dos formas distintas:
     · sangrado — grande, alfa baja. El agua que se corrió del contorno.
     · charco   — más chico, girado aparte, alfa más alta. Donde se depositó el
                  pigmento al secarse.
   Donde se solapan, las alfas se componen y dan un tercer valor más oscuro
   solo. Eso es lo que el ojo lee como acuarela, y sale sin un degradado ni un
   filtro: son dos rellenos planos.

   LAS ALFAS NO ESTÁN ACÁ. Viven en tinta.css (--tinta-alfa-*) porque tienen que
   ser DISTINTAS por tema y este archivo no sabe de temas. En oscuro, un
   pigmento claro al 20% sobre casi-negro no da una aguada: da un marrón sucio
   que se lee como sombra (pasó, está en la primera captura). Sobre papel blanco
   el mismo 20% sí es una aguada. Mismo número, dos resultados opuestos: por eso
   el número lo pone el tema. */
export const CAPAS = {
  sangrado: { escala: 1, giroExtra: 0 },
  charco: { escala: 0.66, giroExtra: 28 },
} as const;

export function transformMancha(s: Sorteo, capa: keyof typeof CAPAS): string {
  const c = CAPAS[capa];
  /* El charco se corre un poco MÁS que el sangrado (×1.4): un charco centrado
     dentro de su halo parece una diana. Descentrado parece agua. */
  const k = capa === 'charco' ? 1.4 : 1;
  return `translate(${(12 + s.dx * k).toFixed(2)} ${(12 + s.dy * k).toFixed(2)}) rotate(${(s.giroMancha + c.giroExtra).toFixed(1)}) scale(${(s.escala * c.escala).toFixed(3)})`;
}

/* ── El grosor de la tinta ─────────────────────────────────────────────────
   Al revés de lo que pide el instinto. En la lámina del mundo la línea se ve
   FINA respecto al objeto, y la tentación es bajar el stroke a 1.2 en todos
   lados. Pero la línea se ve fina porque la lámina se mira a 1270 px: tiene
   decenas de píxeles de objeto alrededor. A 18 px el icono entero mide 18 px y
   un trazo de 1.2/24 son 0.9 px — medio píxel de tinta gris que se come el
   antialias. La regla va al revés: GRUESO cuando es chico, fino cuando es
   grande. Los dos extremos están calibrados mirando capturas: 1.95 a 18 px es
   lo mínimo que se lee, 1.0 a 96 px es donde deja de parecer un icono de UI
   inflado (con 1.35 todavía parecía). */
export function grosor(px: number): number {
  if (px <= 18) return 1.95;
  if (px >= 96) return 1.0;
  return 1.95 + ((px - 18) / (96 - 18)) * (1.0 - 1.95);
}

/* ── La pluma que tiembla ──────────────────────────────────────────────────
   feTurbulence + feDisplacementMap sobre el trazo. `scale` va en unidades de
   usuario, así que el temblor escala con el icono y se ve igual a 26 que a 96.
   baseFrequency 0.22 sobre la grilla de 24 = una ondulación cada ~4.5 unidades:
   más bajo y el icono se DEFORMA (deja de ser el objeto), más alto y parece
   ruido de compresión en vez de pulso de la mano. */
export const PLUMA = { frecuencia: 0.22, octavas: 2, desvio: 0.45 } as const;

/* MEDIDO, no supuesto (barrido 0.3 / 0.55 / 0.9 en el careo):
     · a 96 px, 0.3 apenas se insinúa, 0.55 se lee claramente como mano, 0.9
       deforma — la nariz del avión se dobla y el moño del regalo se rompe.
       0.45 es el punto donde tiembla sin romper ninguno de los ocho.
     · a 26 px y a 18 px las cuatro columnas del barrido salieron
       INDISTINGUIBLES. El temblor no se ve, y el filtro igual se paga.
   De ahí el umbral: debajo de 48 px no se aplica. En el mapa puede haber ~50
   nodos a la vez y no tiene sentido pagar cincuenta feTurbulence por un efecto
   que la captura dice que no está. Hoy los dos sitios que lo usan (18 y 26 px)
   caen debajo del umbral: el filtro existe para cuando el icono crezca. */
export const PLUMA_DESDE_PX = 48;

/* DESCARTADA: "segunda pasada de pluma" (una copia del trazo escalada 1.03 y
   girada 0.7° encima, para simular el contorno repasado). Se probó en el mismo
   barrido y la columna salió indistinguible de la de control: a escala uniforme
   las dos pasadas quedan siempre a la misma distancia, así que el grosor no
   varía a lo largo del trazo — solo engorda la línea. Se saca. */
