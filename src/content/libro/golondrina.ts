/* LA GOLONDRINA — el cuento del cuarto libro interactivo, y el PRIMERO
   español-primario (para nativos de inglés que aprenden español).

   ⚠ OBRA ORIGINAL. No es una traducción ni una adaptación de ningún libro con
   derechos: es una historia nueva, escrita para este proyecto, en el mismo
   TERRITORIO temático de "un viejo, el mar y una gran lucha solitaria" (un tema
   de dominio común), con personajes, trama y final propios. Nada de Hemingway
   ni de ninguna obra protegida se reproduce aquí.

   Aurelio, el pescador más viejo de un pueblo del Caribe, construyó con sus
   manos su bote de madera, La Golondrina. El bote hace agua y necesita una
   buena temporada para repararlo. Los jóvenes con lanchas de motor se ríen del
   viejo de los remos; solo Lucía, que cuida el faro, lo espera. Sale más lejos
   que nadie y encuentra una criatura enorme atrapada en una red fantasma: su
   gran lucha —una noche larga y una tormenta— no es matarla sino LIBERARLA.
   Vuelve sin nada que vender, con el bote roto y la dignidad intacta. Su
   símbolo son las golondrinas que anidan bajo el muelle y siempre regresan.

   PORQUE ES ESPAÑOL-PRIMARIO, todo va al revés que en Alicia / Around the World
   / One Good Part:
   - `texto` es el cuento EN ESPAÑOL, con glosas ⟦español||inglés⟧: se lee en
     español y se toca la palabra para ver el inglés. lib/gloss.ts es agnóstico
     de dirección (⟦A||B⟧ muestra A, glosa B), así que NO se toca.
   - `es` (el campo de la brújula) lleva aquí la línea EN INGLÉS: ubica al
     lector en su propio idioma. El lector la etiqueta "EN" para este libro
     (flag `dir:'es'` en content/libro/index.ts).
   - `phrasals` lleva aquí las EXPRESIONES del español (modismos y frases
     hechas): el gancho equivalente a los phrasal verbs para quien aprende
     español. El lector rotula la tira "Expresiones".
   - `titulo` es el título en español (el que se ve grande); `subtitulo`, su
     guiño en inglés.

   ESTRUCTURA: 10 capítulos × 5 páginas, igual que One Good Part —
     0  abrebocas (55-70 palabras) — va con la lámina de apertura y es la única
        que muestra las expresiones del capítulo
     1  (85-105) el capítulo arranca de verdad; la única cara SIN lámina
     2  (55-70)  comparte la cara con la LÁMINA 1
     3  (55-70)  comparte la cara con la LÁMINA 2
     4  (55-70)  comparte la cara con la LÁMINA 3 y cierra, empujando al siguiente

   Las láminas se hacen en Canva (LIBRO-runbook §3), con ancla de estilo marina
   cálida caribeña. Prefijo de archivo: g.

   ESTADO: capítulo 1 = MUESTRA para aprobar el español antes de producir 2-10
   con el workflow (escritor + corrector por capítulo, runbook §2.2). */

import type { Capitulo } from './tipos';

/** Las láminas que no pertenecen a ningún capítulo. */
export const IMAGENES = {
  portada: '/libro/g00-portada.webp',
  fin: '/libro/g99-fin.webp',
} as const;

export const CAPITULOS: Capitulo[] = [
  {
    n: 1,
    titulo: 'La Golondrina',
    subtitulo: 'The Swallow',
    imgApertura: '/libro/gc1-apertura.webp',
    imgDentro: ['/libro/gc1-1.webp', '/libro/gc1-2.webp', '/libro/gc1-3.webp'],
    altApertura:
      'Un viejo pescador con sombrero baja al amanecer por una playa del Caribe hacia un pequeño bote de madera varado en la arena; el cielo está teñido de naranja y turquesa y el mar en calma refleja la luz.',
    altDentro: [
      'Jóvenes pescadores en lanchas de motor rápidas pasan riéndose junto a un viejo que rema solo en su bote de madera, con el muelle del pueblo de fondo bajo el sol de la mañana.',
      'Una muchacha joven enciende la lámpara de un faro blanco sobre las rocas al atardecer y mira hacia el mar, donde se aleja un pequeño bote.',
      'Un viejo pescador sentado en el borde de su cama, en una casa humilde y a oscuras, mira por la ventana el mar nocturno; bajo el muelle se ven las siluetas de las golondrinas dormidas.',
    ],
    phrasals: [
      'hacer agua',
      'de madrugada',
      'echar de menos',
      'en voz baja',
      'poco a poco',
      'dar la vuelta',
      'hacer caso',
      'no pegar ojo',
      'mar adentro',
      'tener cuidado',
    ],
    paginas: [
      {
        texto: `Aurelio era el ⟦pescador||fisherman⟧ más viejo del ⟦pueblo||village⟧. Cada día, ⟦de madrugada||before dawn⟧, bajaba despacio hasta la ⟦playa||beach⟧, donde lo esperaba su ⟦bote||boat⟧ de ⟦madera||wood⟧. Lo había construido con sus propias manos y le había puesto un nombre: La Golondrina. El bote ya estaba viejo, como él, y desde hacía un tiempo ⟦hacía agua||was leaking⟧. Pero Aurelio ⟦no se lo contaba a nadie||kept it to himself⟧.`,
        es: "Aurelio, the village's oldest fisherman, walks down each dawn to the wooden boat he built by hand — a boat that, like him, is old and has quietly begun to leak.",
      },
      {
        texto: `⟦Bajo el muelle||Under the pier⟧ vivían las ⟦golondrinas||swallows⟧. Cada año se iban al terminar el verano, y cada año ⟦daban la vuelta||came back around⟧ al mismo rincón. Por eso, muchos años antes, su esposa Rosa había querido ese nombre para el bote: porque las golondrinas siempre ⟦regresan a casa||return home⟧.

Rosa ya no estaba. Aurelio la ⟦echaba de menos||missed her⟧ cada mañana, ⟦en voz baja||quietly⟧, mientras preparaba las redes. La madera tenía ⟦grietas||cracks⟧, y por las noches entraba el agua ⟦poco a poco||little by little⟧. «⟦Aguanta||Hold on⟧ una ⟦temporada||season⟧ más», le pedía, como si el bote pudiera entenderlo. Solo necesitaba una buena temporada de pesca para arreglarlo.`,
        es: 'The boat is named for the swallows that always return; his late wife Rosa chose the name. Now she is gone, and he needs one good season to repair the leaking boat.',
      },
      {
        texto: `Los ⟦jóvenes||young men⟧ del pueblo ya no pescaban como él. Tenían ⟦lanchas de motor||motorboats⟧ rápidas y aparatos que encontraban los peces solos. Cuando veían a Aurelio salir a ⟦remo||by oar⟧, se ⟦reían||laughed⟧.

—Viejo, el mar ya no es para ti —le ⟦gritaban||shouted⟧ desde el muelle.

Aurelio no ⟦les hacía caso||paid them no mind⟧. Seguía remando, despacio, hacia el ⟦agua abierta||open water⟧.`,
        es: 'The young men with fast motorboats laugh at the old man who still rows out by oar, but Aurelio pays them no mind and keeps heading for open water.',
      },
      {
        texto: `Solo una persona lo ⟦despedía||saw him off⟧ sin reírse: Lucía, la ⟦nieta||granddaughter⟧ de su viejo amigo Tomás. Ella cuidaba la ⟦lámpara||lamp⟧ del ⟦faro||lighthouse⟧ y, cada noche, la ⟦encendía||lit it⟧ para guiar a los botes ⟦de vuelta||back home⟧.

—⟦Ten cuidado||Be careful⟧, Aurelio —le decía.

—Siempre lo tengo —respondía él, aunque los dos sabían que no ⟦era del todo cierto||was entirely true⟧.`,
        es: 'Only Lucía, who keeps the lighthouse lamp lit to guide the boats home, sees him off kindly and tells him to be careful.',
      },
      {
        texto: `Esa noche, Aurelio ⟦no pegó ojo||didn't sleep a wink⟧. Pensó en la temporada, en el bote, en Rosa. Los peces grandes ya no ⟦se acercaban||came near⟧ a la costa; estaban ⟦mar adentro||far out to sea⟧, donde los jóvenes no ⟦se atrevían||dared⟧ a ir.

—Mañana iré más lejos que nadie —dijo ⟦en voz alta||out loud⟧, en la casa ⟦vacía||empty⟧—. Una última vez.

Afuera, ⟦bajo el muelle||under the pier⟧, las ⟦golondrinas||swallows⟧ dormían.`,
        es: 'Sleepless, Aurelio decides to row farther out than anyone has dared — one last time — to where the big fish still run. Outside, the swallows sleep under the pier.',
      },
    ],
  },
  /* CAPÍTULOS 2-10: pendientes. Se producen con el workflow del runbook §2.2
     (un escritor + un corrector por capítulo, en pipeline) una vez aprobada la
     muestra del capítulo 1. Arco: 2) Los que se ríen · 3) Mar afuera · 4) La
     calma · 5) La sombra bajo el agua · 6) La red fantasma · 7) La noche larga ·
     8) La tormenta · 9) La corriente · 10) El regreso de las golondrinas. */
];

/* Las expresiones DISTINTAS del libro (el número del cierre "N expresiones en M
   capítulos"). Con el capítulo 1 solo; se recalcula al sumar 2-10. */
export const PHRASALS_TOTAL: string[] = [
  'hacer agua',
  'de madrugada',
  'echar de menos',
  'en voz baja',
  'poco a poco',
  'dar la vuelta',
  'hacer caso',
  'no pegar ojo',
  'mar adentro',
  'tener cuidado',
];
