/* LAS LÁMINAS DEL MUNDO — generado por scratchpad/mundo/f6-hornear-tinta.mjs.
   NO EDITAR A MANO: los nombres llevan hash de contenido y un hash mal tecleado
   da un 404 que en el mapa se ve igual que una región que todavía no se bajó
   (la niebla es también el estado de carga), o sea que no se nota hasta
   producción. Para cambiar el arte: rehornear.

   Van INLINEADAS en el bundle y no en un JSON aparte: son 368 bytes de texto
   y un fetch más antes de poder pintar la pantalla más usada del módulo no se
   paga por eso.

   Peso total del juego: 231.0 kB a WebP q70, 780×480 (390×240 CSS a dpr 2).
   Ver MUNDO-runbook §C. */
import type { A1TramoId } from '@/content/a1/tipos-ruta';

export const LAMINA_MUNDO: Partial<Record<A1TramoId, string>> = {
  t0: '/assets/mundo/t0-descampado.e1444824.webp',
  t1: '/assets/mundo/t1-entrada.7e56948b.webp',
  t2: '/assets/mundo/t2-planta.27edc12d.webp',
  t3: '/assets/mundo/t3-viaje.c132a2ac.webp',
  t4: '/assets/mundo/t4-convenciones.05dddebd.webp',
  t5: '/assets/mundo/t5-puertas.825aad4e.webp',
  t6: '/assets/mundo/t6-manzana.04002745.webp',
  t7: '/assets/mundo/t7-mirador.e086802c.webp',
};
