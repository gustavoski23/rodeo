/* Los cuatro packs por trabajo, en el orden en que se pintan en el selector.

   El orden NO es alfabético: va del rol más pedido al menos pedido, porque el
   primero de la grilla es el que más se toca. Si mañana entra un pack nuevo,
   se agrega acá y el selector no se entera — pinta lo que le pasen.

   Cada pack trae UNA unidad con order 101-104: van después del tronco (1-7),
   así el módulo entero se puede ordenar por `order` sin casos especiales. */

import type { JobPack } from '@/content/a1/tipos';

import { PACK_TECH } from './tech';
import { PACK_VENTAS } from './ventas';
import { PACK_SOPORTE } from './soporte';
import { PACK_RECEPCION } from './recepcion';

export const JOB_PACKS: JobPack[] = [PACK_TECH, PACK_VENTAS, PACK_SOPORTE, PACK_RECEPCION];

export { PACK_TECH, PACK_VENTAS, PACK_SOPORTE, PACK_RECEPCION };
export { JobPicker } from './job-picker';
