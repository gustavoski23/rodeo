/* LOS TRAMOS — el esqueleto del mapa.

   Este archivo es SOLO estructura: no tiene contenido, tiene el orden. Existe
   aparte para que agregar una parada sea tocar un array de ids y no un archivo
   de setecientas frases.

   El orden NO es por dificultad, es por urgencia. El Tramo 3 (viajes) va antes
   que el 4, el 6 y el 7 aunque tenga frases más largas que el 7, porque el
   viaje es el martes y el pasado simple no es el martes de nadie.

   `branch: 'viaje'` + `atajo_es` es lo que permite abrir el Tramo 3 apenas se
   cierra el Tramo 0, sin pasar por la oficina. Quien vuela la otra semana no va
   a hacer cuarenta nodos de pasillo primero: cierra la app y no vuelve. */

import type { A1Tramo } from './tipos-ruta';

export const TRAMOS: A1Tramo[] = [
  {
    id: 't0',
    order: 0,
    title_es: 'Antes de hablar',
    promesa_es: 'De cero a decir treinta cosas sin traducir.',
    cardTheme: 'green',
    icon: '🌱',
    branch: 'espina',
    unitIds: ['t0-cognados', 't0-sonidos', 't0-cortesia', 't0-numeros', 't0-ser-estar', 't0-preguntas'],
  },
  {
    id: 't1',
    order: 1,
    title_es: 'El primer día',
    promesa_es: 'Entrar, saludar y pedir ayuda sin quedar mudo.',
    cardTheme: 'blue',
    icon: '🚶',
    branch: 'espina',
    unitIds: ['u1-llegar', 'u2-supervivencia', 'u3-presentarte'],
  },
  {
    id: 't2',
    order: 2,
    title_es: 'La oficina de todos los días',
    promesa_es: 'El cafecito, la reunión y cerrar una tarea.',
    cardTheme: 'lavender',
    icon: '☕',
    branch: 'espina',
    // Las dos últimas todavía no existen (F3). El mapa las pinta bloqueadas
    // con candado en vez de esconderlas: ver el camino completo motiva.
    unitIds: ['u4-smalltalk', 'u5-ayuda', 'u6-reunion', 'u7-tareas', 't2-embarrarla', 't2-chat-trabajo'],
  },
  {
    id: 't3',
    order: 3,
    title_es: 'Sales del país',
    promesa_es: 'Del avión al hotel sin pedirle a nadie que traduzca.',
    cardTheme: 'yellow',
    icon: '✈️',
    branch: 'viaje',
    /* Estos tres textos SE VEN: el título es la cabecera del capítulo en el
       mapa y los atajo_es son la píldora que ofrece saltarse la fila. O sea que
       les aplica lib/espanol-neutro.ts (español latino neutro, con "tú") igual
       que a cualquier cosa que le hable al usuario. Estaban en voseo. */
    atajo_es: '¿Viajas la otra semana? Empieza por aquí.',
    unitIds: [
      't3-aeropuerto', 't3-migracion', 't3-avion', 't3-moverte',
      't3-hotel', 't3-comer', 't3-comprar', 't3-se-dana',
    ],
  },
  {
    id: 't4',
    order: 4,
    title_es: 'Viaje de trabajo',
    promesa_es: 'Inglés de oficina, pero afuera.',
    cardTheme: 'peach',
    icon: '💼',
    branch: 'espina',
    unitIds: ['t4-recepcion-cliente', 't4-cena-negocios', 't4-evento', 't4-vas-tarde', 't4-facturas'],
  },
  {
    id: 't5',
    order: 5,
    title_es: 'Tu trabajo',
    promesa_es: 'Lo que se dice en TU puesto, no en un puesto genérico.',
    cardTheme: 'blue',
    icon: '🛠️',
    branch: 'job',
    atajo_es: 'Elige tu trabajo y esto se abre de una.',
    unitIds: [], // lo llena el pack activo (setPackUnits)
  },
  {
    id: 't6',
    order: 6,
    title_es: 'Tu vida afuera',
    promesa_es: 'Casa, salud, banco y amigos.',
    cardTheme: 'green',
    icon: '🏡',
    branch: 'espina',
    unitIds: ['t6-casa', 't6-salud', 't6-banco', 't6-amigos'],
  },
  {
    id: 't7',
    order: 7,
    title_es: 'Ayer y mañana',
    promesa_es: 'Contar lo que pasó y lo que viene. Cierra A1.',
    cardTheme: 'lavender',
    icon: '🎓',
    branch: 'espina',
    unitIds: ['t7-el-finde', 't7-reporte-ayer', 't7-planes', 't7-excusas'],
  },
];

/** Unidades que todavía no tienen contenido. El mapa las pinta con candado y
    la etiqueta "pronto" — nunca las esconde. Ver el camino completo motiva;
    descubrir que el camino se acaba, no. */
export const PENDIENTES = new Set<string>([
  't2-embarrarla', 't2-chat-trabajo',
  't4-recepcion-cliente', 't4-cena-negocios', 't4-evento', 't4-vas-tarde', 't4-facturas',
  't6-casa', 't6-salud', 't6-banco', 't6-amigos',
  't7-el-finde', 't7-reporte-ayer', 't7-planes', 't7-excusas',
]);
