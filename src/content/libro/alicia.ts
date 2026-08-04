/* ALICE IN WONDERLAND — el cuento del libro interactivo.

   La regla de este contenido (pedido de Gus, 2026-08-04): el cuento MISMO
   lleva los phrasal verbs y las palabritas curiosas. No hay una lista de
   vocabulario aparte que memorizar — se aprende leyendo, que es como se
   aprende de verdad.

   El texto va con los marcadores ⟦en||es⟧ de siempre (lib/gloss.ts), así que
   <GlossText> los vuelve palabras tocables: tap → significado → ＋ guardar al
   DNA. Es el mismo camino que TALK y ESCENAS, o sea que lo que caiga aquí
   vuelve después en la conversación.

   Lewis Carroll (1865) es dominio público. Aun así el texto NO es una copia:
   está reescrito y podado a B2→C1 para que el largo entre en una página y
   para poder sembrar los phrasals donde hacen falta. Solo se conservan las
   dos frases que son la obra («Curiouser and curiouser», «Off with her
   head!») porque quitarlas sería quitarle el cuento al cuento. */

export type Capitulo = {
  /** Número de capítulo, para el folio de la página. */
  n: number;
  /** Título en inglés — el que se ve grande. */
  titulo: string;
  /** Guiño en español debajo del título: ubica sin traducir. */
  subtitulo: string;
  /** Ilustración de la cara izquierda del pliego (public/libro/*.webp). */
  img: string;
  /** Alt de la ilustración. Se lee en voz alta con lector de pantalla. */
  alt: string;
  /** El cuento, con glosas ⟦en||es⟧ embebidas. */
  texto: string;
  /** Los phrasal verbs del capítulo, en infinitivo, para la tira de abajo. */
  phrasals: string[];
};

export const CAPITULOS: Capitulo[] = [
  {
    n: 1,
    titulo: 'Down the Rabbit Hole',
    subtitulo: 'Por la madriguera',
    img: '/libro/01-madriguera.webp',
    alt: 'Alicia cayendo por una madriguera profunda con estantes, libros y faroles, y un conejo blanco con chaleco abajo.',
    texto: `Alice was ⟦fed up with||harta de⟧ sitting by the river with nothing to do, when a White Rabbit in a ⟦waistcoat||chaleco⟧ ⟦rushed past||pasó corriendo⟧ her, muttering, "Oh dear! I shall be late!"

It ⟦took out||sacó⟧ a pocket watch, glanced at it, and ⟦hurried on||siguió de afán⟧.

Burning with curiosity, Alice ⟦jumped up||se paró de un brinco⟧ and ⟦ran after||corrió detrás de⟧ it across the field — just in time to see it ⟦pop down||meterse de golpe por⟧ a large rabbit-hole under the ⟦hedge||seto⟧.

Down she went after it, never once ⟦working out||cayendo en cuenta de⟧ how on earth she would ⟦get out||salir⟧ again.`,
    phrasals: ['be fed up with', 'rush past', 'take out', 'hurry on', 'run after', 'pop down', 'get out'],
  },
  {
    n: 2,
    titulo: 'The Pool of Tears',
    subtitulo: 'El charco de lágrimas',
    img: '/libro/02-charco.webp',
    alt: 'Alicia diminuta sobre un piso ajedrezado inundado, junto a una mesa de vidrio gigante con un frasco etiquetado.',
    texto: `The fall ⟦went on||siguió y siguió⟧ forever. At last Alice landed in a long hall ⟦lined with||llena de⟧ locked doors.

On a glass table lay a tiny golden key and a bottle labelled DRINK ME. She ⟦drank it up||se lo tomó todo⟧ — and began to ⟦shrink||encogerse⟧ until she was ten inches high.

Then she ⟦came across||se topó con⟧ a cake marked EAT ME. One bite and she ⟦shot up||se disparó para arriba⟧ like a telescope, her head ⟦knocking against||golpeando contra⟧ the ceiling.

"Curiouser and curiouser!" she cried, and ⟦burst into tears||rompió a llorar⟧ — until the hall ⟦filled up||se llenó⟧ with a ⟦pool||charco⟧ of her own tears.`,
    phrasals: ['go on', 'drink up', 'come across', 'shoot up', 'knock against', 'burst into tears', 'fill up'],
  },
  {
    n: 3,
    titulo: 'The Cheshire Cat',
    subtitulo: 'El gato de Cheshire',
    img: '/libro/03-gato.webp',
    alt: 'Alicia mirando hacia arriba a un gato atigrado sonriente sentado en una rama, con la luna llena detrás.',
    texto: `In a moonlit wood a grin ⟦showed up||apareció⟧ among the branches — and then, slowly, a cat ⟦turned up||se materializó⟧ around it.

"Which way should I go?" Alice asked.

"That depends on where you want to ⟦end up||terminar⟧," said the Cat.

"I don't much care where —"

"Then it doesn't matter which way you go."

Alice tried to ⟦figure out||descifrar⟧ whether he was ⟦making fun of||burlándose de⟧ her. Before she could ⟦bring it up||sacar el tema⟧, the Cat began to ⟦fade away||desvanecerse⟧, tail first, until nothing was left but the grin — which ⟦hung on||se quedó ahí⟧ long after the rest had gone.`,
    phrasals: ['show up', 'turn up', 'end up', 'figure out', 'make fun of', 'bring up', 'fade away', 'hang on'],
  },
  {
    n: 4,
    titulo: 'A Mad Tea Party',
    subtitulo: 'Una merienda de locos',
    img: '/libro/04-te.webp',
    alt: 'Mesa larga bajo un árbol con decenas de tazas desparejas, Alicia, el Sombrerero con chistera y una liebre.',
    texto: `"No room! No room!" they shouted when Alice ⟦turned up||se apareció⟧ at the table.

"There's plenty of room," she said, and ⟦sat down||se sentó⟧ anyway.

The Hatter ⟦broke in||interrumpió⟧ with a riddle: "Why is a ⟦raven||cuervo⟧ like a writing-desk?"

"I believe I can ⟦work that out||resolver eso⟧," said Alice.

"You mean you think you can find the answer?" said the March Hare.

They had ⟦run out of||quedado sin⟧ clean cups, so everyone simply ⟦moved up||se corrió⟧ one seat. The ⟦Dormouse||Lirón⟧ ⟦dozed off||se quedó dormido⟧ inside the teapot.

Alice ⟦got up||se levantó⟧ and ⟦walked off||se fue⟧ in disgust.`,
    phrasals: ['turn up', 'sit down', 'break in', 'work out', 'run out of', 'move up', 'doze off', 'walk off'],
  },
  {
    n: 5,
    titulo: 'The Queen of Hearts',
    subtitulo: 'La Reina de Corazones',
    img: '/libro/05-reina.webp',
    alt: 'La Reina de Corazones de rojo gritando en un rosal, con soldados naipe detrás y Alicia pequeña y firme delante.',
    texto: `In the royal garden three gardeners were ⟦painting over||repintando⟧ white roses with red paint.

"We ⟦mixed up||confundimos⟧ the bulbs," they whispered, "and if the Queen ⟦finds out||se entera⟧, she'll ⟦chop off||cortar⟧ our heads!"

Just then the Queen ⟦swept in||entró como un vendaval⟧, her face ⟦turning||poniéndose⟧ crimson.

"Off with her head!"

But Alice did not ⟦back down||echarse para atrás⟧. She ⟦stood up to||le hizo frente a⟧ the Queen and said: "You're nothing but a ⟦pack of cards||baraja de naipes⟧!"

At that the whole court ⟦flew up||salió volando⟧ into the air — and Alice ⟦woke up||se despertó⟧ on the riverbank, the leaves still ⟦rustling||susurrando⟧ overhead.`,
    phrasals: ['paint over', 'mix up', 'find out', 'chop off', 'sweep in', 'back down', 'stand up to', 'wake up'],
  },
];

/** Todos los phrasal verbs del libro, sin repetir — para el cierre. */
export const PHRASALS_TOTAL = Array.from(
  new Set(CAPITULOS.flatMap((c) => c.phrasals)),
);
