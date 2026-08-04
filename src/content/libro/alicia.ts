/* ALICE IN WONDERLAND — el cuento del libro interactivo.

   ⚠ ARCHIVO GENERADO. Se escribió con el workflow `libro-alicia-7-capitulos`
   (siete agentes escribiendo un capítulo cada uno + un corrector por capítulo)
   y se armó con scratchpad/gen-contenido.mjs. Para cambiar el cuento conviene
   editar acá directamente: el workflow ya cumplió su parte.

   LA REGLA DEL CONTENIDO (pedido de Gus): el cuento MISMO lleva los phrasal
   verbs y las palabritas curiosas. No hay lista de vocabulario aparte que
   memorizar — se aprende leyendo, que es como se aprende de verdad.

   El texto va con los marcadores ⟦en||es⟧ de lib/gloss.ts, así que <GlossText>
   los vuelve palabras TOCABLES: tap → significado → ＋ guardar al DNA. Es el
   mismo camino que TALK y ESCENAS, o sea que lo que caiga aquí vuelve después
   en la conversación.

   ESTRUCTURA: 7 capítulos × 5 páginas. Cada página tiene su oficio y su largo:
     0  abrebocas (55-70 palabras) — abre la situación, va junto a la lámina
        de apertura y es la única que muestra los phrasal verbs del capítulo
     1  (85-105) el capítulo arranca de verdad
     2  (55-70)  comparte la página con la lámina de la MITAD, por eso más corta
     3  (85-105)
     4  (85-105) cierra y empuja al siguiente capítulo

   Lewis Carroll (1865) es dominio público. Aun así el texto NO es una copia:
   está reescrito y podado a B2→C1. Solo sobreviven textuales las frases que
   SON la obra («Curiouser and curiouser», «Off with her head!», «We're all mad
   here») porque quitarlas sería quitarle el cuento al cuento. */

export type Pagina = {
  /** El cuento en inglés, con glosas ⟦en||es⟧ embebidas. */
  texto: string;
  /** La brújula: una línea en español con lo que pasa en esta página. Va al
      pie, para que quien se pierda no tenga que salir del libro a traducir. */
  es: string;
};

export type Capitulo = {
  n: number;
  /** Título en inglés — el que se ve grande. */
  titulo: string;
  /** Guiño en español debajo del título: ubica sin traducir. */
  subtitulo: string;
  /** Lámina a sangre que abre el capítulo (cara izquierda del primer pliego). */
  imgApertura: string;
  /** Lámina de la MITAD del capítulo, embebida en la tercera cara de texto. */
  imgMedio: string;
  altApertura: string;
  altMedio: string;
  /** Las cinco páginas del capítulo. */
  paginas: Pagina[];
  /** Los phrasal verbs del capítulo, para la tira de chips de su primera
      página. Van ordenados: primero los que este capítulo ESTRENA, después los
      que ya habían salido antes (que reaparezcan es repaso espaciado, no un
      descuido). */
  phrasals: string[];
};

/** Las láminas que no pertenecen a ningún capítulo. */
export const IMAGENES = {
  portada: '/libro/00-portada.webp',
  fin: '/libro/99-fin.webp',
} as const;

export const CAPITULOS: Capitulo[] = [
  {
    n: 1,
    titulo: "Down the Rabbit Hole",
    subtitulo: "Por la madriguera",
    imgApertura: '/libro/c1-apertura.webp',
    imgMedio: '/libro/c1-medio.webp',
    altApertura: "Alicia aburrida en la orilla del río mientras un conejo blanco con chaleco mira su reloj de bolsillo.",
    altMedio: "Alicia cae despacio por la madriguera entre estantes con libros, mapas enrollados y frascos de vidrio.",
    phrasals: ["doze off", "rush past", "give way", "look around", "drift past", "land on", "snap at", "brush off", "come across", "turn up"],
    paginas: [
      {
        texto: `Alice was ⟦fed up with||harta de⟧ the afternoon. Her sister's book had no pictures, and the ⟦riverbank||orilla del río⟧ smelled of warm mud and ⟦crushed||machacada⟧ mint. She was about to ⟦doze off||quedarse dormida⟧ when something white ⟦rushed past||pasó corriendo por⟧ her elbow.

"Oh my! Oh my! I'm going to be late!"

A rabbit. In a ⟦waistcoat||chaleco⟧. ⟦Pulling out||Sacando⟧ a pocket watch.

Rabbits don't talk, Alice thought. She ⟦stood up||se paró⟧ and ran.`,
        es: "Alicia se aburre junto al río hasta que un conejo con chaleco y reloj pasa corriendo.",
      },
      {
        texto: `The Rabbit ⟦darted||salió disparado⟧ into a thick ⟦hedge||seto⟧. Alice ⟦scrambled after||se metió detrás de⟧ him without ⟦thinking twice||pensarlo dos veces⟧, and the ⟦brambles||zarzas⟧ ⟦tore at||le rasgaron⟧ her stockings.

"Wait!" she called. "You've got a watch! Rabbits don't ⟦carry around||andar cargando⟧ watches!"

The hole under the hedge was wide and dark and smelled of cold soil. She leaned in. One knee, then the other. And then the earth ⟦gave way||cedió⟧ and Alice was falling — not fast, but slowly, like a feather that had ⟦made up its mind||se había decidido⟧.

"Well," she thought, oddly calm, "at least there is plenty of time to ⟦look around||mirar alrededor⟧."`,
        es: "Alicia lo persigue por el seto, el piso cede y empieza a caer despacio.",
      },
      {
        texto: `The walls of the well were lined with ⟦shelves||estantes⟧: dusty books, old maps ⟦curling up||enrollándose⟧ at the corners, a ⟦jar||frasco⟧ labelled ORANGE MARMALADE.

She grabbed it as she ⟦drifted past||pasaba flotando⟧. Empty. Sticky. It smelled ⟦rancid||rancio⟧.

"I can't just ⟦drop||soltar⟧ it," she thought. "It might ⟦land on||caerle encima a⟧ somebody below." So she ⟦put it back||lo devolvió⟧, very ⟦prim||formalita⟧, as if she were in a shop.

Down, down, down.`,
        es: "Cayendo, ve estantes con libros, mapas viejos y un frasco de mermelada rancia.",
      },
      {
        texto: `Alice began to talk to herself, because there was nobody else to ⟦snap at||contestarle feo a⟧ or to ask. "Do cats eat bats, and do bats eat cats?" She was getting ⟦groggy||amodorrada⟧ now, and the words ⟦came out||le salían⟧ ⟦jumbled||enredadas⟧.

Then — thump! — a pile of dry leaves and ⟦twigs||ramitas⟧, and the fall was over. Nothing broken. She ⟦sprang up||se paró de un salto⟧ and ⟦brushed off||se sacudió⟧ her dress.

Ahead, a long corridor. At the far end, the White Rabbit was ⟦hurrying off||yéndose de afán⟧ around a corner.

"My ears and whiskers, I'm late!"

"Curiouser and curiouser," Alice said, and ⟦set off after||salió detrás de⟧ him.`,
        es: "Aterriza en hojas secas y alcanza a ver al Conejo doblando la esquina.",
      },
      {
        texto: `The corridor ⟦opened onto||daba a⟧ a low hall lined with doors. Alice tried them one by one. Locked. Every single one. The floor was ⟦marble||mármol⟧ and so cold it ⟦crept up||le subía⟧ through her shoes.

On a glass table she ⟦came across||se topó con⟧ a tiny golden key. It fit nothing — until she ⟦knelt down||se arrodilló⟧ and ⟦made out||distinguió⟧ a little door behind a ⟦curtain||cortina⟧, no taller than her hand.

Through it: a garden, bright ⟦flower beds||jardineras⟧, cool fountains. Her whole chest ached with wanting it. "How am I ever going to ⟦fit through||pasar por⟧ that?" she said out loud. "Something will ⟦turn up||aparecer⟧. Something always does — doesn't it?"`,
        es: "Un pasillo de puertas cerradas, una llave diminuta y un jardín inalcanzable.",
      },
    ],
  },
  {
    n: 2,
    titulo: "The Pool of Tears",
    subtitulo: "El charco de lágrimas",
    imgApertura: '/libro/c2-apertura.webp',
    imgMedio: '/libro/c2-medio.webp',
    altApertura: "Alicia agachada junto a una puertecita en un salón de mármol, con una botellita sobre la mesa de vidrio.",
    altMedio: "Alicia gigante doblada contra el techo, un pie en la chimenea y un brazo por la ventana, llorando un charco.",
    phrasals: ["show up", "figure out", "run out of", "make out", "get out of", "calm down", "blurt out", "wear off", "turn up", "come across"],
    paginas: [
      {
        texto: `The hall smelled of ⟦cold marble||mármol frío⟧ and old ⟦varnish||barniz⟧. Alice ⟦crouched down||se agachó⟧ by the tiny door, ⟦peckish||con algo de hambre⟧, cross, and completely stuck.

Then she ⟦came across||se topó con⟧ a little bottle that had ⟦turned up||había aparecido⟧ on the glass table. A paper label hung from its neck: DRINK ME.

"Well," she said, "that is ⟦awfully bossy||bien mandón⟧ for a bottle." She ⟦pulled out||sacó⟧ the ⟦stopper||tapón⟧ and sniffed. Cherry tart, toffee, hot buttered toast.`,
        es: "Alicia, atascada frente a la puertecita, encuentra la botella que dice DRINK ME.",
      },
      {
        texto: `She ⟦took a sip||dio un sorbito⟧. Nothing awful happened, so she ⟦finished it off||se lo acabó⟧ in three greedy swallows.

"What a ⟦queer||rarísima⟧ feeling," she said. "I am ⟦shutting up||cerrándome⟧ like a brass telescope." And she was. The marble rose toward her chin. In half a minute she stood ten inches tall, ⟦giddy||mareada⟧ and ⟦rather pleased with herself||bastante orgullosa⟧.

Then her stomach ⟦dropped||se le fue al piso⟧. The golden key was still up on the table, and the table ⟦towered over||se alzaba sobre⟧ her like a cathedral. She ⟦had run out of||se había quedado sin⟧ height, and, she thought, out of ideas too.

"Oh, bother," she whispered. "I ⟦figured out||descifré⟧ the whole puzzle and forgot the key."`,
        es: "Se toma la botella, se encoge como telescopio y deja la llave allá arriba.",
      },
      {
        texto: `Under the table she ⟦made out||alcanzó a distinguir⟧ a small glass box. Inside sat a cake with EAT ME spelled in ⟦currants||pasas⟧.

"Right," said Alice. "If I grow, I take the key. If I shrink, I ⟦slip under||me cuelo por debajo de⟧ the door. Either way I ⟦get out of||salgo de⟧ here."

She ⟦bit into||le dio un mordisco⟧ it. ⟦Crumbs||Migas⟧ stuck to her lip, dry as chalk. Nothing happened. Then her neck ⟦shot up||se disparó⟧ like a ⟦beanstalk||tallo de habichuela⟧.`,
        es: "Bajo la mesa aparece el pastel EAT ME; lo muerde y crece hasta el techo.",
      },
      {
        texto: `"Curiouser and curiouser!" Alice said, and her voice bounced back off the ceiling, which was now pressed flat against her ear.

One foot ⟦wedged||encajado⟧ in the fireplace, one elbow out a window, ⟦stuck fast||bien atascada⟧. She tried to ⟦calm down||calmarse⟧ and could not. Hot tears ⟦spilled over||se desbordaron⟧ and ⟦came down||cayeron⟧ in gallons, until a ⟦puddle||charco⟧ four inches deep spread across the marble. She scolded herself for ⟦bawling||llorar a moco tendido⟧ like a baby, and cried harder.

Then footsteps. The White Rabbit ⟦showed up||apareció⟧ again, carrying white ⟦kid gloves||guantes de cabritilla⟧ and an enormous fan.

"Oh, please —" Alice began.

He took one look at her and ⟦bolted||salió en estampida⟧, dropping both.`,
        es: "Enorme y llorando hace un charco; el Conejo huye y suelta guantes y abanico.",
      },
      {
        texto: `Alice ⟦snatched up||agarró de un manotazo⟧ the fan and fanned herself, for the hall had gone stuffy.

She was shrinking again, and fast. The fan ⟦slipped out of||se le resbaló de⟧ her fingers, and at last the shrinking ⟦wore off||se le pasó⟧ — by which time she was knee-high to a mushroom.

Then the floor ⟦gave way||cedió⟧ under her and she ⟦slid into||se deslizó en⟧ salt water up to her chin.

"The sea!" she gasped. It was not. It was her own tears, warm and salty.

Something ⟦paddled||chapaleaba⟧ past: a Mouse, ⟦sullen||malhumorado⟧ and soaked.

"My cat Dinah loves mice," Alice ⟦blurted out||soltó sin pensar⟧.

The Mouse stiffened and ⟦swam off||se alejó nadando⟧. Alice ⟦set off after||arrancó detrás de⟧ him.`,
        es: "Con el abanico se encoge, cae al charco de lágrimas y ofende a un ratón.",
      },
    ],
  },
  {
    n: 3,
    titulo: "Advice from a Caterpillar",
    subtitulo: "El consejo de la Oruga",
    imgApertura: '/libro/c3-apertura.webp',
    imgMedio: '/libro/c3-medio.webp',
    altApertura: "Una oruga azul fuma una pipa de agua sobre un hongo gigante mientras Alicia la mira desde abajo.",
    altMedio: "La oruga se aleja arrastrándose hacia las zarzas mientras Alicia, arrodillada junto al hongo, protesta.",
    phrasals: ["come out", "wake up", "run out", "put up with", "hold back", "break off", "make out", "snap at", "blurt out", "wear off"],
    paginas: [
      {
        texto: `The mushroom stood taller than Alice, and it smelled of wet earth and ⟦stale jam||mermelada rancia⟧. She ⟦stood on tiptoe||se paró de puntillas⟧ to ⟦make out||distinguir⟧ what was on top.

A blue ⟦caterpillar||oruga⟧ sat there with its arms folded, ⟦puffing on||fumando⟧ a ⟦hookah||pipa de agua⟧. Smoke ⟦curled up||subía en espirales⟧ into the ⟦drowsy||somnoliento⟧ air.

"Who are YOU?" it said.

Alice opened her mouth, and nothing ⟦came out||salió⟧.`,
        es: "Sobre un hongo gigante, una oruga azul fuma y le pregunta a Alicia quién es.",
      },
      {
        texto: `"I hardly know, sir," Alice said ⟦at last||por fin⟧. "This morning, when I ⟦woke up||me desperté⟧, I was sure. But I've changed size so many times since then that I've rather ⟦lost track of||perdido la cuenta de⟧ myself."

"And what is THAT supposed to mean?" the Caterpillar ⟦snapped at||le contestó de mal genio⟧ her. "Explain yourself."

"I'm afraid I can't, sir. I am not quite myself today, you see."

The Caterpillar blinked. "I don't see."

Alice felt her patience ⟦running out||agotándose⟧. The smoke ⟦drifted down||bajaba flotando⟧ and settled on her shoulders like a warm ⟦shawl||chal⟧. Rude creature, she thought. She would not ⟦put up with||aguantar⟧ much more. But she ⟦bit her tongue||se mordió la lengua⟧.`,
        es: "Alicia no sabe contestar: ha cambiado tanto de tamaño que ya no se reconoce.",
      },
      {
        texto: `The Caterpillar ⟦took a slow drag||dio una pitada lenta⟧ and said nothing for ⟦a whole minute||un minuto entero⟧. The wet ⟦bubbling||burbujeo⟧ of the hookah was the only sound. Its eyes were ⟦sullen||hoscos⟧.

"What size would suit you?"

"I'm not ⟦fussy||quisquillosa⟧ about size," Alice said. "It's only that one tires of ⟦changing so often||cambiar tan seguido⟧, you know."

"I wouldn't know," the Caterpillar said. Alice ⟦held back||se contuvo⟧. Nobody had ever ⟦contradicted||llevado la contraria⟧ her so much.`,
        es: "La oruga le pregunta qué tamaño quiere ser; Alicia se aguanta la grosería.",
      },
      {
        texto: `At last the Caterpillar ⟦uncoiled||se desenroscó⟧ itself and ⟦crawled off||se fue arrastrando⟧ the edge of the mushroom, ⟦yawning||bostezando⟧ as it went.

"Bite one side and you grow," it said. "Bite the other and you shrink."

"One side of WHAT?" Alice ⟦blurted out||soltó sin pensar⟧, ⟦flustered||aturdida⟧, before she could stop herself.

"The mushroom, of course," said the Caterpillar, ⟦as if it were obvious||como si fuera obvio⟧. A moment later it was gone into the ⟦brambles||zarzas⟧, and the grass ⟦closed over||se cerró sobre⟧ it, and the smoke ⟦wore off||se disipó⟧, and Alice was left alone with a ⟦riddle||acertijo⟧ and a cold, damp mushroom taller than herself.`,
        es: "Antes de irse, la oruga revela el secreto: un lado crece, el otro encoge.",
      },
      {
        texto: `The mushroom was perfectly round, which ⟦threw her off||la descuadró⟧ completely. Sides? Alice ⟦stretched her arms||estiró los brazos⟧ around it as far as they would reach, and ⟦broke off||arrancó⟧ a ⟦crumb||migaja⟧ with each hand.

"Now then," she said. "Which is which?"

She ⟦nibbled at||mordisqueó⟧ the right-hand piece. ⟦At once||De inmediato⟧ her chin ⟦slammed into||se estrelló contra⟧ her foot.

⟦Groggy||Atolondrada⟧ and terrified, she swallowed a little of the other piece, and her neck ⟦shot up||salió disparado⟧ through the ⟦treetops||copas de los árboles⟧ like a snake made of girl. "Curiouser and curiouser," said Alice, to the sky. Somewhere far below, something with wings began to scream.`,
        es: "Alicia arranca dos migajas del hongo y prueba: se encoge y luego se estira.",
      },
    ],
  },
  {
    n: 4,
    titulo: "The Cheshire Cat",
    subtitulo: "El gato de Cheshire",
    imgApertura: '/libro/c4-apertura.webp',
    imgMedio: '/libro/c4-medio.webp',
    altApertura: "Alicia, entre zarzas y bajo la luz de la luna, mira una sonrisa flotando sin cuerpo entre las ramas.",
    altMedio: "El gato de Cheshire, rayado, tendido en una rama mientras Alicia discute con los brazos cruzados.",
    phrasals: ["end up", "wind up", "point out", "run out of", "show up", "turn up", "make out", "put up with", "doze off", "blurt out"],
    paginas: [
      {
        texto: `Moonlight ⟦spilled through||se colaba entre⟧ the branches like cold milk. Alice had ⟦run out of||se había quedado sin⟧ path an hour ago, and every ⟦hedge||seto⟧ she passed looked like the last one.

"I'm ⟦going in circles||dando vueltas⟧," she said ⟦aloud||en voz alta⟧, mostly to hear a human voice. "Somebody could at least ⟦show up||aparecer⟧ and point."

Then, high above the ⟦brambles||zarzas⟧, a smile ⟦turned up||se asomó⟧. No face ⟦underneath||debajo⟧. No cat. Just teeth, ⟦grinning||sonriendo de oreja a oreja⟧ in the dark.`,
        es: "Perdida de noche en el bosque, Alicia ve una sonrisa flotando entre las ramas.",
      },
      {
        texto: `Alice ⟦held her breath||contuvo la respiración⟧. Slowly the rest of the cat ⟦filled in||se fue completando⟧ around the smile: two round ears, a striped back, a tail that ⟦curled up||se enroscaba⟧ like smoke off a candle.

"That is a rude way to ⟦sneak up on||aparecérsele de golpe a⟧ somebody," she said, ⟦smoothing down||alisándose⟧ her apron so her hands would stop shaking. "Teeth first."

"Most people ⟦make out||distinguen⟧ the teeth last," said the Cat. "I prefer to ⟦get it over with||salir de eso de una vez⟧."

Its purr rattled like a kettle ⟦about to boil||a punto de hervir⟧. Alice was ⟦fed up with||harta de⟧ being lost, so she asked, very politely, which way she ought to go.`,
        es: "El gato aparece completo alrededor de la sonrisa; ella le pregunta por dónde ir.",
      },
      {
        texto: `"Which way?" the Cat repeated. "That ⟦depends on||depende de⟧ where you're hoping to ⟦end up||terminar⟧."

"I don't mind," Alice said, "as long as it's somewhere."

"Then any road ⟦will do||sirve⟧." The Cat ⟦shrugged||se encogió de hombros⟧ with its whiskers. "Walk far enough and you'll ⟦wind up||ir a parar⟧ somewhere. Whether you like it is ⟦another matter||otro cuento⟧."

The wet leaves smelled ⟦sour||agrio⟧. Alice ⟦chewed on that||le dio vueltas a eso⟧: it sounded ⟦smug||creído⟧, and true, which bothered her more.`,
        es: "El gato le dice que si no sabe a dónde va, cualquier camino le sirve.",
      },
      {
        texto: `"And who lives out here?" Alice asked. The ⟦damp||húmedo⟧ moss had ⟦soaked through||traspasado⟧ her stockings, and she was getting ⟦peckish||con hambrecita⟧.

"A Hatter that way. A March Hare over there." The Cat ⟦flicked||sacudió⟧ a paw at nothing in particular. "Visit whichever you like. ⟦We're all mad here||Aquí todos estamos locos⟧."

"I don't want to ⟦put up with||aguantar⟧ mad people," Alice said, ⟦crossing her arms||cruzando los brazos⟧.

"You ⟦wandered in||te metiste aquí⟧ on your own two feet," the Cat ⟦pointed out||le hizo ver⟧, "so you must be mad too. Sane girls stay home and ⟦doze off||se quedan dormidas⟧ over their lessons." Alice had no answer for that, and her ears burned.`,
        es: "El gato menciona al Sombrerero y a la Liebre, y le dice que ella también está loca.",
      },
      {
        texto: `Alice opened her mouth to ⟦blurt out||soltar⟧ something clever, but the Cat had already begun to ⟦fade away||desvanecerse⟧, tail first, like breath on a window ⟦wearing off||que se va borrando⟧.

"Please don't ⟦vanish||desaparecer⟧ so suddenly," Alice said. "It makes me ⟦dizzy||mareada⟧." The paws went, then the stripes, then the ears, until only the grin ⟦hung||quedó colgando⟧ in the air.

"Curiouser and curiouser," she whispered. "I've ⟦come across||me he topado con⟧ plenty of cats with no grin, but never a grin with no cat."

The grin ⟦drifted off||se fue flotando⟧ toward a thin path, and somewhere ahead cups ⟦rattled||tintineaban⟧. Tea, then. Alice ⟦set off||arrancó⟧.`,
        es: "El gato se borra de a poquitos y deja la sonrisa; Alicia sigue el camino al té.",
      },
    ],
  },
  {
    n: 5,
    titulo: "A Mad Tea Party",
    subtitulo: "Una merienda de locos",
    imgApertura: '/libro/c5-apertura.webp',
    imgMedio: '/libro/c5-medio.webp',
    altApertura: "Alicia de pie ante una mesa larguísima llena de tazas sucias; el Sombrerero y la Liebre apiñados en un extremo con el Lirón dormido.",
    altMedio: "Alicia se inclina sobre la mesa del té para mirar el reloj de bolsillo detenido que el Sombrerero sostiene entre dos dedos.",
    phrasals: ["work out", "come up with", "show up", "come across", "figure out", "blurt out", "point out", "doze off", "end up", "put up with"],
    paginas: [
      {
        texto: `The table was long enough for twenty, and only three had ⟦shown up||llegado⟧.

Alice ⟦came across||se topó con⟧ it under a tree: dirty cups, a ⟦spilled||regada⟧ jug, ⟦crumbs||migas⟧ ground into the cloth. The Hatter and the March Hare were resting their elbows on a sleeping ⟦Dormouse||lirón⟧.

"No room!" they shouted.

There was ⟦plenty of room||espacio de sobra⟧. Alice ⟦sat down||se sentó⟧ anyway. Whatever these three ⟦were up to||traían entre manos⟧, she meant to ⟦figure it out||entenderlo⟧.`,
        es: "Alicia se topa con la mesa del té y se sienta aunque le griten que no hay puesto.",
      },
      {
        texto: `"Have some wine," the March Hare said ⟦cheerfully||con toda alegría⟧.

Alice looked along the table. Tea, milk, a bowl of sugar ⟦lumps||terrones⟧ gone grey and ⟦stale||rancios⟧. The whole place smelled of cold tea and sour milk. "I don't see any wine."

"There isn't any," said the Hare.

"Then it wasn't very ⟦civil||cortés⟧ of you to offer it," she ⟦snapped||le contestó feo⟧ — and ⟦went red||se puso roja⟧, because she had promised herself she would ⟦keep her temper||no perder la paciencia⟧.

The Hatter had been staring at her for a whole minute. "Your hair ⟦wants cutting||necesita corte⟧," he ⟦blurted out||soltó⟧.

"You shouldn't say things like that about people," said Alice. "It's ⟦rude||grosero⟧."`,
        es: "Le ofrecen vino que no existe y el Sombrerero le critica el pelo; Alicia se aguanta.",
      },
      {
        texto: `The Hatter ⟦leaned in||se acercó⟧, eyes ⟦gleaming||brillantes⟧. "Tell me this: how is a ⟦raven||cuervo⟧ anything like a writing ⟦desk||escritorio⟧?"

"I believe I can ⟦work that out||descifrarlo⟧," said Alice.

"You mean you can ⟦come up with||dar con⟧ the answer?"

"Exactly."

"Then say what you mean."

"I do," she said quickly. "At least — I mean what I say."

"Not one bit," said the Hatter, ⟦smug||creído⟧ as a cat on a warm ⟦hearth||chimenea⟧.`,
        es: "El Sombrerero suelta el acertijo del cuervo y el escritorio, que no tiene respuesta.",
      },
      {
        texto: `The Hatter ⟦pulled out||sacó⟧ a watch, shook it, and held it to his ear with a ⟦sullen||malhumorada⟧ face. "Two days slow," he ⟦muttered||murmuró⟧.

Alice ⟦peered over||se asomó por encima de⟧ his ⟦sleeve||manga⟧. The hands were stuck at six, and the teapot under her palm was ⟦stone cold||helada⟧. "It tells the day of the month, but not the hour?"

"Why should it? Does yours tell you the year, then?"

"Because we stay in the same year for ages," Alice ⟦pointed out||le hizo caer en cuenta⟧.

"Which is exactly what ⟦we're stuck with||nos tocó⟧," said the Hatter. "We ⟦fell out with||nos peleamos con⟧ Time, and now he won't ⟦budge||moverse⟧. Always six. Always tea."`,
        es: "El reloj parado en las seis: se pelearon con el Tiempo y siempre es hora del té.",
      },
      {
        texto: `The Dormouse ⟦woke up||despertó⟧ and began a story about three sisters who lived in a well and drank ⟦treacle||melaza⟧.

"They'd have got sick," said Alice.

"They did. Very sick," said the Dormouse, and ⟦dozed off||se quedó dormido⟧ mid-sentence.

"Clean cup!" cried the Hatter, and everyone ⟦shifted||se corrió⟧ one place round. Alice ⟦ended up||terminó⟧ with the Hare's plate, ⟦smeared||embadurnado⟧ with jam and ⟦sticky||pegajoso⟧.

That was enough. She had ⟦put up with||aguantado⟧ riddles with no answers, but not this. She stood up and walked into the trees. Nobody ⟦called her back||la llamó de vuelta⟧.

A small door stood in a trunk ahead. Alice ⟦stepped through||entró por ahí⟧, into green light and roses.`,
        es: "El Lirón cuenta su historia, Alicia se harta y se va por una puerta en un árbol.",
      },
    ],
  },
  {
    n: 6,
    titulo: "The Queen's Croquet Ground",
    subtitulo: "El croquet de la Reina",
    imgApertura: '/libro/c6-apertura.webp',
    imgMedio: '/libro/c6-medio.webp',
    altApertura: "Tres jardineros naipe pintan de rojo un rosal blanco mientras Alicia los observa agachada.",
    altMedio: "Alicia sostiene un flamenco como mazo de croquet frente a un erizo, con la Reina al fondo.",
    phrasals: ["find out", "own up", "stand up to", "turn out", "wander off", "come across", "end up", "snap at", "blurt out", "show up"],
    paginas: [
      {
        texto: `Three gardeners knelt by a rose tree, ⟦slapping on||echando a brochazos⟧ red paint with ⟦shaky||temblorosas⟧ hands. Their bodies were flat playing cards. The paint smelled of vinegar and something sour. Alice ⟦came across||se topó con⟧ them by accident and ⟦crouched down||se agachó⟧ beside them.

"Why are you painting those roses?" she asked.

"⟦Keep your voice down||Baje la voz⟧," ⟦muttered||masculló⟧ the one called Five. "If the Queen ⟦finds out||se entera⟧, we ⟦end up||terminamos⟧ ⟦headless||sin cabeza⟧ before ⟦teatime||la hora del té⟧."`,
        es: "Tres jardineros naipe pintan las rosas blancas de rojo, muertos del susto.",
      },
      {
        texto: `"⟦It was a slip-up||Fue una metida de pata⟧," said Two, wiping his ⟦brush||brocha⟧ on his own painted chest. "We ⟦put in||sembramos⟧ a white rose tree when she ordered a red one. Nobody wants to ⟦own up||confesar⟧ to it."

"So you'd rather lie on your knees in the mud?" Alice said. She meant it kindly, but Five ⟦snapped at||le contestó feo⟧ her anyway.

"You try ⟦standing up to||hacerle frente a⟧ her," he said. "One word ⟦out of turn||fuera de lugar⟧ and —" He drew a finger across his ⟦collar||el cuello de la camisa⟧.

Then ⟦trumpets||trompetas⟧. All three ⟦threw themselves||se tiraron⟧ flat on their faces. Alice stayed standing. Hiding felt worse than being seen.`,
        es: "Confiesan que sembraron mal el rosal; suenan trompetas y llega la comitiva.",
      },
      {
        texto: `The procession came in pairs: soldiers, ⟦courtiers||cortesanos⟧, then the Queen herself, ⟦crimson||carmesí⟧ and enormous.

The Queen ⟦looked her up and down||la miró de arriba abajo⟧. "Who is this?"

"Alice, Your Majesty," she said.

"⟦Don't be cheeky||No sea descarada⟧!" the Queen roared, ⟦turning purple||poniéndose morada⟧. "⟦Off with her head||Que le corten la cabeza⟧!"

Alice ⟦held her ground||se mantuvo firme⟧. Her palms were sweating, but her chin stayed up.

"Nonsense," she ⟦blurted out||soltó de una⟧. The whole garden ⟦went quiet||se quedó en silencio⟧. Somewhere a ⟦hedge||seto⟧ rustled.`,
        es: "La Reina de Corazones pide la cabeza de Alicia, y Alicia no se achica.",
      },
      {
        texto: `The King ⟦stepped in||intervino⟧ and patted the Queen's arm. "She's only a child, my dear."

To Alice's surprise, the Queen ⟦let it go||lo dejó pasar⟧ and barked, "Can you play croquet?"

The game ⟦turned out||resultó⟧ to be madness. The balls were live ⟦hedgehogs||erizos⟧. The ⟦mallets||mazos⟧ were live flamingos. The ⟦hoops||arcos⟧ were soldiers ⟦bent over double||doblados por la mitad⟧, walking off whenever they got bored.

Alice ⟦tucked||acomodó⟧ her flamingo under one arm. It was warm, ⟦bony||huesudo⟧, and deeply ⟦fed up with||harto de⟧ her. Every time she ⟦lined up||apuntaba⟧ a shot, the bird twisted its neck round and stared at her, puzzled.`,
        es: "Empieza el croquet: erizos de bola, flamencos de mazo, soldados de arco.",
      },
      {
        texto: `Nothing behaved. The hedgehog ⟦uncurled||se desenrollaba⟧ and ⟦wandered off||se iba por ahí⟧ mid-shot. The soldiers ⟦straightened up||se enderezaban⟧ and strolled away. Everyone played at once, ⟦quarrelling||peleando⟧ over the hedgehogs, and the Queen ⟦stomped around||andaba pisando duro⟧ shouting a sentence a minute.

"Off with his head! Off with hers!"

Alice noticed something odd: nobody ever ⟦carried out||cumplía⟧ the orders. The soldiers just ⟦shuffled off||se iban arrastrando los pies⟧ and quietly let the prisoners go.

"How am I to get out of this?" she wondered.

A ⟦grin||sonrisota⟧ ⟦showed up||apareció⟧ in the air above the hedge — just a grin, with no cat ⟦attached||pegado⟧ to it yet.`,
        es: "Nada obedece y nadie cumple las condenas; una sonrisa aparece en el aire.",
      },
    ],
  },
  {
    n: 7,
    titulo: "Who Stole the Tarts?",
    subtitulo: "¿Quién robó las tartas?",
    imgApertura: '/libro/c7-apertura.webp',
    imgMedio: '/libro/c7-medio.webp',
    altApertura: "Sala del juicio en el País de las Maravillas: el Rey en su trono, el Sota encadenado y Alicia al fondo, entre los curiosos.",
    altMedio: "Alicia, enorme dentro de la sala, recoge con una mano a los doce juraditos que se cayeron de la banca volcada.",
    phrasals: ["get away with", "cut in", "knock over", "back down", "blurt out", "own up", "doze off", "run out", "stand up to", "wear off"],
    paginas: [
      {
        texto: `The courtroom smelled of ⟦stale||rancia⟧ jam and hot dust. Alice ⟦squeezed in||se metió⟧ at the back, ⟦peckish||con hambrecita⟧ and a little ⟦flustered||aturdida⟧. On a velvet cushion sat an empty dish with three sticky ⟦crumbs||migas⟧.

The Knave of Hearts stood ⟦in chains||encadenado⟧, ⟦sullen||malencarado⟧ and pale. The King ⟦cleared his throat||carraspeó⟧. "Somebody," Alice thought, "is going to do something dreadful and ⟦get away with||salirse con la suya⟧ it."`,
        es: "Alicia entra al juicio: el Sota acusado y una bandeja vacía con migas.",
      },
      {
        texto: `The White Rabbit gave three ⟦shrill||chillones⟧ blasts on his trumpet and ⟦unrolled||desenrolló⟧ a scroll. "The Queen baked twelve tarts one summer afternoon, and the Knave ⟦made off with||se llevó⟧ every single one."

"Consider your verdict," said the King.
"Not yet!" the Rabbit ⟦cut in||interrumpió⟧, ⟦in a fluster||todo azarado⟧. "There is plenty to hear first."

The Hatter ⟦shuffled in||entró arrastrando los pies⟧, teacup in one hand, bread and butter in the other, still ⟦groggy||amodorrado⟧ from a party that had never ended.

"I'm just a poor fellow, Your Majesty," he ⟦blurted out||soltó de una⟧, and ⟦bit into||le dio un mordisco a⟧ his cup by mistake. The jury ⟦scribbled||garabateó⟧ that down, though nobody understood it.`,
        es: "El Conejo lee la acusación y el Sombrerero declara medio dormido.",
      },
      {
        texto: `The cook was called next. She ⟦snapped at||le contestó feo a⟧ the King and refused to ⟦own up||confesar⟧ to anything. Pepper ⟦came off||se desprendía de⟧ her apron and set half the jury ⟦sneezing||estornudando⟧. The Dormouse ⟦dozed off||se quedó dormido⟧ mid-sentence, ⟦smug||satisfecho de sí mismo⟧ as a cat.

Then Alice felt it: a slow ⟦stretching||estirón⟧ in her legs, like a yawn that refused to end. "Curiouser and curiouser," she whispered, and her knees ⟦shot up||se dispararon⟧ past the ⟦bench||banca⟧.`,
        es: "La cocinera no confiesa, el Lirón se duerme y Alicia empieza a crecer.",
      },
      {
        texto: `"You aren't allowed to grow in here," the Dormouse ⟦grumbled||refunfuñó⟧, ⟦squashed||aplastado⟧ against her sleeve.

"Don't talk nonsense," said Alice. "You're growing too."

"Yes, but at a reasonable pace," he said, and ⟦curled up||se hizo bolita⟧ again.

Alice's elbow ⟦knocked over||tumbó⟧ the jury box, and twelve small creatures ⟦tumbled||cayeron dando volteretas⟧ onto the cold marble like goldfish from a bowl. She ⟦scooped them up||los recogió⟧ ⟦in a hurry||de afán⟧, ⟦upside down||al revés⟧ and all. Her heart was ⟦thumping||retumbando⟧ against her ribs, and her patience was ⟦running out||agotándose⟧ fast.

"Alice!" called the White Rabbit. "The court calls Alice."`,
        es: "Alicia crece tanto que tumba el jurado; el Conejo la llama a declarar.",
      },
      {
        texto: `"Rule Forty-two," the King announced. "Anyone taller than a mile has to ⟦clear out||largarse⟧ of my court."

"But I'm nowhere near a mile," said Alice, "and I won't ⟦back down||echarme para atrás⟧."

"Off with her head!" ⟦shrieked||chilló⟧ the Queen, ⟦crimson||roja como un tomate⟧ to the ears.

Alice ⟦stood up to||le hizo frente a⟧ her, taller than the windows now. "You're only painted cardboard. A flat little ⟦deck||baraja⟧, and nothing more."

The whole court ⟦flew up||voló por los aires⟧ at her face — and then she was on the riverbank, ⟦blinking||parpadeando⟧, her sister ⟦brushing off||quitándole⟧ the dead leaves that had settled in her hair. The dream ⟦wore off||se fue disipando⟧ slowly, like warmth leaving a cup.`,
        es: "Alicia se planta ante la Reina, todo vuela y despierta en la ribera.",
      },
    ],
  },
];

/** Los phrasal verbs DISTINTOS que enseña el libro. Es el número del cierre
    ("N phrasal verbs en 7 capítulos"), así que va sin repetir: sumar las tiras
    de los siete capítulos daría un número inflado. */
export const PHRASALS_TOTAL = Array.from(
  new Set(CAPITULOS.flatMap((c) => c.phrasals.map((p) => p.toLowerCase()))),
);
