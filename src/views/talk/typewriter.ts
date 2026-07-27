/* Máquina de escribir de CHARLA — port de escribirMaquina
   (public/legacy.html:4073-4107, spec §3.2).

   Del original quedan aquí los NÚMEROS, que es lo que se ve: el corte por
   carácter o por palabra a los 120 caracteres, el conteo de piezas "visibles"
   (los espacios no cuentan: si contaran, una frase larga tardaría el doble en
   asentar) y el total 400 + visibles*18 ms. El pintado en sí lo hace TextAnimate
   (Magic UI, verbatim) dentro de la burbuja; este módulo es la única fuente de
   esos números para que la duración de la animación y el momento del swap a
   glosas no se puedan desincronizar. */

const TW_MAX_CHARS = 120;

export type Maquina = {
  /** 'character' | 'word' — el `by` de TextAnimate. */
  por: 'character' | 'word';
  /** Piezas que no son espacio (el `visibles` del viejo). */
  visibles: number;
  /** Duración en segundos para TextAnimate: su stagger sale de duracion/segmentos. */
  duracion: number;
  /** Cuándo cae el swap a la versión glosada: 400 + visibles*18 (L4101). */
  totalMs: number;
};

export function medirMaquina(texto: string): Maquina {
  // [...texto] y no split(''): respeta emojis y acentos compuestos, igual que
  // el viejo. Por encima de 120 caracteres se teclea por palabra conservando
  // los espacios, si no una respuesta larga se vuelve eterna.
  const por = texto.length <= TW_MAX_CHARS ? 'character' : 'word';
  const piezas = por === 'character' ? [...texto] : texto.split(/(\s+)/);
  const visibles = piezas.filter((p) => p.trim()).length;
  /* TextAnimate reparte `duracion / segmentos` entre las piezas, así que para
     que el barrido dure lo mismo que el del viejo (visibles * 18 ms) hay que
     pedirle exactamente eso de duración: los espacios entran en el reparto pero
     no alargan el total. Los 400 ms de la propia animación de cada pieza se
     suman después, en totalMs. */
  return { por, visibles, duracion: visibles * 0.018, totalMs: 400 + visibles * 18 };
}
