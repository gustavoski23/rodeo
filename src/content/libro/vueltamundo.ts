/* AROUND THE WORLD IN EIGHTY DAYS — el cuento del segundo libro interactivo.

   ⚠ ARCHIVO GENERADO Y EDITADO A MANO. Es el hermano de alicia.ts: mismo tipo,
   misma vista (src/views/libro), solo cambian el cuento y las láminas. Para
   ajustar el texto conviene editar acá directamente.

   LA REGLA DEL CONTENIDO (pedido de Gus): el cuento MISMO lleva los phrasal
   verbs y las palabritas curiosas. No hay lista de vocabulario aparte que
   memorizar — se aprende leyendo. Aquí el vocabulario es de VIAJE: transporte,
   dinero, puertos, apuros y prisas, que es justo lo útil de este cuento.

   El texto va con los marcadores ⟦en||es⟧ de lib/gloss.ts, así que <GlossText>
   los vuelve palabras TOCABLES: tap → significado → ＋ guardar al DNA. Es el
   mismo camino que TALK: lo que caiga aquí vuelve en la conversación.

   ESTRUCTURA: 10 capítulos × 5 páginas. Cada página tiene su oficio y su largo:
     0  abrebocas (55-70 palabras) — abre la situación, va junto a la lámina de
        apertura y es la única que muestra los phrasal verbs del capítulo
     1  (85-105) el capítulo arranca de verdad; es la única cara SIN lámina
     2  (55-70)  comparte la cara con la LÁMINA 1
     3  (55-70)  comparte la cara con la LÁMINA 2
     4  (55-70)  comparte la cara con la LÁMINA 3 y cierra, empujando al siguiente

   A DIFERENCIA DE ALICIA, las páginas 2, 3 y 4 llevan CADA una su lámina
   embebida (en Alicia solo la 2). Por eso las tres son cortas: una lámina 4:3
   se come el alto de la cara, y la regla dura es que a escala 1.0 no se desborde
   —ni tenga que hacer scroll— ninguna cara de texto. El total por capítulo baja
   a ~340-360 palabras respecto a los ~430 de Alicia, y es a propósito: «igual de
   cortos», dijo Gus, «no los alargues». Se verifica con captura, no razonando.

   Jules Verne (1872) es dominio público. El texto NO es una copia: está
   reescrito y podado a B2→C1, conservando los nombres y los hitos que SON la
   obra (Phileas Fogg, Passepartout, el detective Fix, Aouda, Kiouni, la apuesta
   de las veinte mil libras, el día que se gana cruzando el meridiano). */

import type { Capitulo } from './tipos';

/* Las 3 láminas internas de cada capítulo van en imgDentro[0,1,2] → caras de
   texto 2, 3 y 4. En el lector a pantalla completa se reparten por el scroll,
   cada una en el punto del cuento que le toca (§8 del runbook). */

/** Las láminas que no pertenecen a ningún capítulo. */
export const IMAGENES = {
  portada: '/libro/v00-portada.webp',
  fin: '/libro/v99-fin.webp',
} as const;

export const CAPITULOS: Capitulo[] = [
  {
    n: 1,
    titulo: "The Wager",
    subtitulo: "La apuesta en el Reform Club",
    imgApertura: '/libro/vc1-apertura.webp',
    imgDentro: ['/libro/vc1-1.webp', '/libro/vc1-2.webp', '/libro/vc1-3.webp'],
    altApertura: "Un caballero inglés de patillas, en frac negro, sentado solo en la sala de un club victoriano de Londres, con un reloj de bolsillo abierto en la mano y luz de gas ámbar.",
    altDentro: [
      "La mesa de whist del Reform Club: caballeros de época discuten alrededor de un periódico, bajo lámparas doradas.",
      "Dos caballeros se dan un apretón de manos sellando una apuesta, con otros socios mirando alrededor de la mesa.",
      "Fogg y Passepartout suben a un coche de caballos frente a una estación de noche, con un bolso repleto de billetes.",
    ],
    phrasals: ["set off", "take on", "go over", "make off with", "hold up", "pull off", "hand over", "keep up", "hurry up", "pay for"],
    paginas: [
      {
        texto: `Phileas Fogg was the most ⟦punctual||puntual⟧ man in London. He never ⟦ran late||llegaba tarde⟧, never ⟦rushed||se apuraba⟧, and nobody knew where his fortune ⟦came from||venía⟧. That morning he ⟦took on||contrató a⟧ a cheerful French servant, Passepartout, ⟦went over||le repasó⟧ the strict house rules, and ⟦set off||salió⟧ for the Reform Club, ⟦as usual||como siempre⟧, at exactly half past eleven.`,
        es: "Fogg, puntualísimo y misterioso, contrata a Passepartout y se va a su club.",
      },
      {
        texto: `At the club Fogg ⟦settled into||se acomodó en⟧ his armchair and ⟦picked up||tomó⟧ the newspaper. His friends were talking about a daring robbery: a thief had ⟦made off with||se había llevado⟧ fifty-five thousand pounds from the Bank of England, and the whole police force was ⟦on the hunt for||a la caza de⟧ him.

"The world is a big place," said one of the gentlemen.

"Not any more," Fogg replied, without ⟦looking up||levantar la vista⟧. "With the new railways and steamers, a man could ⟦go around||dar la vuelta a⟧ it in eighty days."

The others ⟦burst out||soltaron a⟧ laughing.`,
        es: "En el club se habla de un robo al banco; Fogg dice que se puede dar la vuelta al mundo en 80 días.",
      },
      {
        texto: `"⟦What if||¿Y si⟧ you're wrong?" laughed Stuart. "Eighty days on paper, maybe. But storms, ⟦breakdowns||averías⟧, missed ⟦connections||conexiones⟧ — anything can ⟦hold you up||demorarte⟧."

"⟦Whatever happens||Pase lo que pase⟧ is ⟦taken into account||tomado en cuenta⟧," said Fogg calmly. "I'll bet twenty thousand pounds that I can ⟦pull it off||lograrlo⟧. Are you ⟦in||le entran⟧?"

The whole room went quiet.`,
        es: "Los socios se burlan; Fogg apuesta veinte mil libras a que lo logra.",
      },
      {
        texto: `Five gentlemen ⟦took him up on||le aceptaron⟧ the bet — twenty thousand pounds, half his fortune, ⟦on the line||en juego⟧. They ⟦shook on it||lo sellaron con un apretón⟧ ⟦there and then||ahí mismo⟧.

"I leave tonight," Fogg announced, ⟦folding up||doblando⟧ the newspaper. "The Dover train ⟦pulls out||sale⟧ at a quarter to nine. I shall be back in this room on the twenty-first of December, or I shall ⟦hand over||entregar⟧ the money."`,
        es: "Cinco caballeros aceptan la apuesta y Fogg anuncia que sale esa misma noche.",
      },
      {
        texto: `That evening Fogg ⟦packed light||empacó liviano⟧: two shirts, a warm coat, and a bag ⟦stuffed with||repleto de⟧ banknotes. Passepartout could hardly ⟦keep up||seguirle el paso⟧.

"We're going ⟦all the way round||toda la vuelta al⟧ the world," Fogg said, "so ⟦hurry up||apúrate⟧."

The poor servant went pale: in his rush, he had left the gas ⟦burning||prendido⟧ in his room — and he would ⟦pay for||pagar por⟧ it for eighty days.`,
        es: "Empaca liviano, carga un bolso de billetes y corre al tren; dejó el gas prendido.",
      },
    ],
  },
  {
    n: 2,
    titulo: "The Man at Suez",
    subtitulo: "El detective en Suez",
    imgApertura: '/libro/vc2-apertura.webp',
    imgDentro: ['/libro/vc2-1.webp', '/libro/vc2-2.webp', '/libro/vc2-3.webp'],
    altApertura: "El puerto de Suez al amanecer: el vapor Mongolia humeando junto a minaretes, y un hombrecito nervioso observando entre la multitud.",
    altDentro: [
      "El detective Fix habla con el cónsul británico en una oficina, examinando un pasaporte a la luz de una lámpara.",
      "Passepartout en el bullicioso muelle de Suez, entre cargadores descalzos, camellos y túnicas de colores.",
      "El vapor Mongolia navegando por el mar Rojo al atardecer, con una estela blanca y humo negro.",
    ],
    phrasals: ["turn up", "tip off", "pull in", "strike up", "keep an eye on", "get a move on", "snap out of", "close in", "count on", "hold up"],
    paginas: [
      {
        texto: `At Suez, where Africa and Asia almost ⟦meet up||se juntan⟧, a small nervous man ⟦paced up and down||caminaba de un lado a otro⟧ the ⟦quay||muelle⟧. Detective Fix was ⟦on the hunt for||a la caza de⟧ the bank thief, and a telegram had ⟦tipped him off||le había dado el pitazo⟧: the robber might ⟦turn up||aparecer⟧ here at any moment. Every ⟦steamer||vapor⟧ was ⟦worth watching||digna de vigilar⟧.`,
        es: "En Suez, el detective Fix vigila el muelle esperando al ladrón del banco.",
      },
      {
        texto: `The steamer Mongolia ⟦pulled in||atracó⟧ right on time, ⟦belching||echando⟧ black smoke over the harbor. A noisy crowd ⟦poured off||bajó en tropel de⟧ it. Among them came Passepartout, ⟦sent ashore||mandado a tierra⟧ to get his master's passport stamped.

Fix, pretending to be a friendly traveler, ⟦struck up||entabló⟧ a conversation. "Your master seems to be ⟦in a hurry||con afán⟧."

"Oh, we're ⟦racing around||dándole la vuelta a la carrera al⟧ the whole world in eighty days," laughed Passepartout, and cheerfully ⟦rattled off||soltó de corrido⟧ the entire story — the bet, the route, the bag of money. Fix's eyes ⟦lit up||se le iluminaron⟧: this was surely his thief.`,
        es: "Llega el Mongolia; Passepartout cuenta el viaje y Fix empieza a sospechar de Fogg.",
      },
      {
        texto: `Fix ⟦hurried off||se fue de afán⟧ to the consul's office. "That passport ⟦matches||coincide con⟧ my thief," he said. "⟦Hold him up||Deténgalo⟧ here until my warrant ⟦comes through||llegue⟧."

"I can't," said the consul. "The papers are ⟦in order||en regla⟧. There's nothing to ⟦go on||en qué basarse⟧."

Fix ⟦gritted his teeth||apretó los dientes⟧. He would have to ⟦keep an eye on||vigilar a⟧ Fogg himself.`,
        es: "Fix pide detener a Fogg, pero el cónsul dice que el pasaporte está en regla.",
      },
      {
        texto: `Out on the ⟦quay||muelle⟧, Passepartout ⟦soaked it all in||lo absorbía todo⟧: barefoot porters, ⟦loaded-down||cargados⟧ camels, robes of every color, the smell of spice and coal. He had never ⟦set foot||puesto un pie⟧ outside Europe.

"⟦Get a move on||Muévete⟧!" a sailor shouted, ⟦shoving past||empujándolo al pasar⟧. Passepartout ⟦snapped out of||salió de⟧ his daydream and ⟦rushed back||volvió corriendo⟧ to the ship.`,
        es: "Passepartout se maravilla con el puerto lleno de camellos, cargadores y especias.",
      },
      {
        texto: `The Mongolia ⟦steamed off||zarpó⟧ into the Red Sea, ⟦churning up||batiendo⟧ a white wake. Fix had ⟦slipped aboard||se había colado a bordo⟧ too, ⟦keeping out of sight||sin dejarse ver⟧.

Passepartout ⟦leaned over||se asomó a⟧ the rail and grinned at the hot wind. Fogg stayed below, playing cards, ⟦unbothered||sin inmutarse⟧. Neither knew that a detective was ⟦closing in||acercándose⟧, ⟦counting on||contando con⟧ a warrant to catch them.`,
        es: "El barco zarpa por el mar Rojo; Fix se cuela a bordo para seguir a Fogg.",
      },
    ],
  },
  {
    n: 3,
    titulo: "The Elephant",
    subtitulo: "El tren que se acaba",
    imgApertura: '/libro/vc3-apertura.webp',
    imgDentro: ['/libro/vc3-1.webp', '/libro/vc3-2.webp', '/libro/vc3-3.webp'],
    altApertura: "Un tren de vapor de época cruzando un viaducto sobre la selva india, entre palmeras y neblina, con humo blanco.",
    altDentro: [
      "Pasajeros de época varados junto a las vías que se acaban en plena selva, con equipaje y caras de desconcierto.",
      "Fogg negocia la compra de un gran elefante manso a un aldeano, con billetes en la mano, en un claro del pueblo.",
      "Fogg, Cromarty y Passepartout montados en una canasta sobre el elefante, avanzando por la selva densa al anochecer.",
    ],
    phrasals: ["hop on", "cut across", "get over", "pick up", "kick up", "carry on", "ask around", "part with", "give in", "push on"],
    paginas: [
      {
        texto: `At Bombay the travelers ⟦hopped on||se treparon a⟧ the train that ⟦cut across||atravesaba⟧ India. Fogg shared his ⟦carriage||vagón⟧ with Sir Francis Cromarty, an old soldier who could not ⟦get over||creerse⟧ how calm this Englishman was. The engine ⟦pulled out||arrancó⟧, ⟦whistling||pitando⟧, and the crowded platform ⟦fell away||quedó atrás⟧ behind clouds of ⟦steam||vapor⟧.`,
        es: "En Bombay suben al tren que cruza la India; los acompaña el viejo Sir Francis Cromarty.",
      },
      {
        texto: `For two days the train ⟦rolled through||rodaba por⟧ jungle, rice fields, and sleepy towns. Then, deep in the forest, it ⟦ground to a halt||se detuvo en seco⟧ with a screech.

"Everybody off!" the conductor called. "The line isn't finished. It ⟦picks up again||vuelve a empezar⟧ fifty miles ⟦further on||más adelante⟧ — you must ⟦sort out||arreglárselas⟧ the rest yourselves."

The passengers ⟦kicked up||armaron⟧ a fuss and ⟦shouted him down||lo callaron a gritos⟧. Fogg did not. While the others ⟦stood around||se quedaron parados⟧ complaining, he quietly ⟦set out to||se propuso⟧ find another way to ⟦carry on||seguir⟧, as if delays were beneath him.`,
        es: "En plena selva el tren se detiene: la vía no está terminada. Fogg busca otra salida.",
      },
      {
        texto: `In the nearest village Fogg ⟦asked around||preguntó por ahí⟧ for horses, carts, anything. Nothing ⟦turned up||apareció⟧. Then Passepartout ⟦came across||se topó con⟧ an elephant behind a hut — a huge ⟦tame||manso⟧ beast named Kiouni.

"That'll ⟦do||servir⟧," said Fogg. The owner, though, would not ⟦part with||desprenderse de⟧ it, and every offer was ⟦turned down||rechazada⟧ ⟦flat||de plano⟧.`,
        es: "En un pueblo aparece un elefante manso, Kiouni, pero el dueño no lo quiere vender.",
      },
      {
        texto: `Fogg ⟦kept raising||seguía subiendo⟧ the price. One thousand pounds. Two thousand. At last the owner ⟦gave in||cedió⟧, ⟦won over||convencido⟧ by the pile of banknotes.

A young ⟦mahout||conductor de elefante⟧ was ⟦taken on||contratado⟧ to guide them. They ⟦loaded up||cargaron⟧ food, climbed into the ⟦howdah||canasta⟧ on the animal's back, and Kiouni ⟦lumbered off||se echó a andar pesadamente⟧ into the trees.`,
        es: "Fogg sube la oferta hasta que el dueño cede; contratan un mahout y montan la canasta.",
      },
      {
        texto: `For hours the elephant ⟦pushed on||avanzó⟧ through thick jungle, ⟦trampling||pisoteando⟧ ferns, ⟦wading across||vadeando⟧ streams. The travelers ⟦held on tight||se agarraban fuerte⟧ as the howdah ⟦rocked||se mecía⟧.

Night ⟦crept in||se metió⟧. Strange cries ⟦rang out||resonaron⟧ in the dark, and Cromarty ⟦kept watch||hacía guardia⟧ with his rifle. Fogg, of course, ⟦dozed off||se durmió⟧, as if he did this every day.`,
        es: "El elefante avanza toda la noche por la selva; Fogg se duerme como si nada.",
      },
    ],
  },
  {
    n: 4,
    titulo: "The Pyre",
    subtitulo: "El rescate de Aouda",
    imgApertura: '/libro/vc4-apertura.webp',
    imgDentro: ['/libro/vc4-1.webp', '/libro/vc4-2.webp', '/libro/vc4-3.webp'],
    altApertura: "Una procesión nocturna a la luz de antorchas hacia una pagoda en ruinas, con tambores y sacerdotes entre la selva.",
    altDentro: [
      "La joven Aouda, drogada, tendida sobre una piedra rodeada de sacerdotes dormidos, junto a una gran pira de leña.",
      "Entre el humo de la pira al amanecer, una figura se levanta de las llamas y toma en brazos a Aouda; la multitud retrocede.",
      "El elefante huye por la selva al amanecer con los viajeros y Aouda en la canasta, perseguidos a lo lejos.",
    ],
    phrasals: ["pull up", "get down", "fill in", "step in", "come up with", "run out", "draw back", "slip in", "come round", "brush off"],
    paginas: [
      {
        texto: `Near a ruined ⟦pagoda||pagoda⟧ the elephant suddenly ⟦pulled up||se frenó⟧. Torches ⟦flickered||titilaban⟧ through the trees. A strange procession was ⟦coming toward||venía hacia⟧ them: priests, drums, and, ⟦dragged along||arrastrada⟧ in the middle, a beautiful young woman who could barely ⟦stand up||tenerse en pie⟧.

"⟦Get down||Bájense⟧," whispered Cromarty. "And ⟦keep quiet||silencio⟧."`,
        es: "Una procesión nocturna: van a sacrificar a una joven viuda, Aouda, al amanecer.",
      },
      {
        texto: `Cromarty ⟦filled them in||les explicó⟧ in a low voice. The woman was Aouda, a young widow, the daughter of a rich merchant. When her old husband died, a cruel custom said she must ⟦be burned alive||ser quemada viva⟧ beside him at dawn. The priests had ⟦drugged her||la habían drogado⟧ with smoke so she could not ⟦run away||huir⟧ or even cry out.

"We must ⟦step in||intervenir⟧," said Fogg at once, as calm as if ordering tea. "We have twelve hours ⟦to spare||de sobra⟧. Why not ⟦use them up||usarlas⟧ saving a life?"

Even Passepartout, who adored his master, was ⟦taken aback||sorprendido⟧.`,
        es: "Cromarty explica el rito; Fogg decide, tranquilo, que hay que salvarla.",
      },
      {
        texto: `They ⟦crept up||se acercaron sigilosos⟧ to the pagoda and ⟦scouted it out||lo exploraron⟧. Guards were everywhere. Aouda lay ⟦laid out||tendida⟧ on a stone, ⟦surrounded by||rodeada de⟧ sleeping priests. The great ⟦pyre||pira⟧ of wood ⟦loomed over||se alzaba sobre⟧ her.

Every plan they ⟦came up with||se les ocurría⟧ seemed hopeless. Dawn was ⟦drawing near||acercándose⟧, and time was ⟦running out||agotándose⟧.`,
        es: "Se acercan a la pagoda: guardias por todas partes y el amanecer encima.",
      },
      {
        texto: `At dawn the priests ⟦set the pyre alight||prendieron la pira⟧. Smoke ⟦billowed up||subió en nubarrones⟧. Then — a gasp: the dead husband seemed to ⟦sit up||sentarse⟧ in the flames and ⟦snatch up||agarrar⟧ Aouda in his arms!

The crowd ⟦drew back||retrocedió⟧ in terror. It was Passepartout, who had ⟦slipped in||se había colado⟧ and ⟦played dead||se hizo el muerto⟧ on the pyre. "⟦Run for it||¡A correr⟧!" he yelled.`,
        es: "Passepartout se hace el muerto en la pira, agarra a Aouda y todos huyen.",
      },
      {
        texto: `They ⟦bolted||salieron disparados⟧ for the elephant and ⟦scrambled up||treparon⟧ into the howdah. Kiouni ⟦tore off||salió a toda⟧ into the forest just as the furious priests ⟦came after||salieron tras⟧ them.

Aouda, still ⟦worn out||agotada⟧, slowly ⟦came round||volvió en sí⟧, unable to believe she had been ⟦snatched from||arrebatada de⟧ the fire. Fogg simply ⟦brushed it off||le quitó importancia⟧: "We had time ⟦to spare||de sobra⟧."`,
        es: "Escapan en el elefante con los sacerdotes detrás; Aouda vuelve en sí, a salvo.",
      },
    ],
  },
  {
    n: 5,
    titulo: "The Missed Boat",
    subtitulo: "La trampa en Hong Kong",
    imgApertura: '/libro/vc5-apertura.webp',
    imgDentro: ['/libro/vc5-1.webp', '/libro/vc5-2.webp', '/libro/vc5-3.webp'],
    altApertura: "El puerto de Hong Kong: juncos de vela, el Pico al fondo y un gran vapor fondeado, con luz cálida.",
    altDentro: [
      "Un fumadero de opio en penumbra: Fix desliza una pipa a Passepartout, que se desvanece sobre unos cojines.",
      "Un muelle vacío al amanecer: Fogg y Aouda de pie, mirando el mar donde el vapor Carnatic ya se fue.",
      "Una pequeña goleta de vela luchando contra una tormenta en alta mar, con olas rompiendo sobre la cubierta.",
    ],
    phrasals: ["show up", "come along", "set sail", "egg on", "knock back", "catch on", "knock out", "get through", "give up", "press on"],
    paginas: [
      {
        texto: `By the time they reached Hong Kong, Fogg was two days ⟦ahead of schedule||adelantado⟧. Fix, though, was ⟦fed up||harto⟧: his warrant still had not ⟦shown up||aparecido⟧. If Fogg ⟦sailed on||seguía navegando⟧ to Japan, he might ⟦get away for good||escaparse para siempre⟧. So Fix ⟦came up with||se le ocurrió⟧ a nasty plan — and it ⟦centered on||giraba en torno a⟧ poor Passepartout.`,
        es: "En Hong Kong Fogg va adelantado; Fix, sin su orden, trama algo contra Passepartout.",
      },
      {
        texto: `Fogg had hoped to ⟦drop Aouda off||dejar a Aouda⟧ with a rich relative in Hong Kong, but the man had ⟦moved away||se había mudado⟧ to Holland years ago. "Then you'll ⟦come along||venir⟧ with us to Europe," said Fogg simply, and she gratefully agreed.

Their next steamer, the Carnatic, would ⟦set sail||zarpar⟧ the following morning. That evening Fix, still ⟦waiting on||a la espera de⟧ his warrant, ⟦took Passepartout out||sacó a Passepartout⟧ for a drink. He kept ⟦egging him on||incitándolo⟧ to ⟦knock back||empinar⟧ glass after glass, hoping to loosen his tongue. The trusting Frenchman never once ⟦caught on||se dio cuenta⟧.`,
        es: "El pariente de Aouda se mudó; ella sigue con ellos. Fix emborracha a Passepartout.",
      },
      {
        texto: `Fix ⟦steered him into||lo metió en⟧ a dim opium den and ⟦slipped||deslizó⟧ a drugged pipe into his hand. "One won't ⟦do any harm||hacer daño⟧," he said.

Passepartout meant to ⟦pass on||pasar⟧ the news that the Carnatic was leaving early — but the smoke ⟦knocked him out||lo noqueó⟧. He ⟦keeled over||se desplomó⟧, and the warning never ⟦got through||llegó⟧. Fix ⟦slipped away||se escabulló⟧, satisfied.`,
        es: "En un fumadero de opio, Fix duerme a Passepartout y el aviso del barco nunca llega.",
      },
      {
        texto: `At dawn Fogg and Aouda reached the ⟦quay||muelle⟧ — and ⟦stopped short||se pararon en seco⟧. The Carnatic had already ⟦pulled out||zarpado⟧, and Passepartout was nowhere to be found.

Most men would have ⟦given up||se habrían rendido⟧. Fogg did not ⟦bat an eye||ni se inmutó⟧. He ⟦set about||se puso a⟧ hiring a boat — any boat — that could ⟦catch up with||alcanzar a⟧ the steamer at the next port.`,
        es: "Al amanecer el Carnatic ya zarpó; Fogg, impasible, busca otro barco.",
      },
      {
        texto: `A pilot named John Bunsby ⟦took them on||los aceptó⟧ aboard his little schooner, the Tankadère, and they ⟦cast off||soltaron amarras⟧ into open sea.

Then the sky ⟦clouded over||se encapotó⟧. A storm ⟦blew up||se desató⟧, waves ⟦crashing over||rompiendo sobre⟧ the deck. "⟦Hold on||¡Agárrense⟧!" roared Bunsby. The little boat ⟦pitched||cabeceaba⟧ and groaned, but it ⟦held together||aguantó⟧ and ⟦pressed on||siguió adelante⟧ toward Shanghai.`,
        es: "Un piloto los lleva en la goleta Tankadère; una tormenta casi los hunde.",
      },
    ],
  },
  {
    n: 6,
    titulo: "The Acrobats",
    subtitulo: "Yokohama y el circo",
    imgApertura: '/libro/vc6-apertura.webp',
    imgDentro: ['/libro/vc6-1.webp', '/libro/vc6-2.webp', '/libro/vc6-3.webp'],
    altApertura: "Una calle del barrio extranjero de Yokohama con faroles de papel, gente de época y el monte Fuji a lo lejos, con luz cálida.",
    altDentro: [
      "Passepartout, hambriento y agotado, entre los puestos de un mercado japonés, con un templo al fondo.",
      "Una pirámide humana de acróbatas con largas narices de papel; en la base, Passepartout, y la torre a punto de venirse abajo.",
      "Fogg, Aouda y Passepartout en la baranda de un vapor que deja Japón rumbo a América, con gaviotas.",
    ],
    phrasals: ["come to", "fend for", "sign up", "get across", "ask after", "drop in", "pile up", "let go", "tag along", "get on board"],
    paginas: [
      {
        texto: `Passepartout ⟦came to||volvió en sí⟧ aboard the Carnatic, ⟦aching all over||adolorido⟧ and alone. Somehow he had been ⟦bundled onto||metido a las apuradas en⟧ the ship while ⟦knocked out||noqueado⟧. Now it had ⟦docked||atracado⟧ at Yokohama, in Japan. His master was gone, his pockets were ⟦cleaned out||sin un peso⟧, and he had to ⟦fend for himself||valerse por sí mismo⟧ in a country he could not ⟦make sense of||entender⟧.`,
        es: "Passepartout despierta solo y sin plata en Yokohama, con Fogg desaparecido.",
      },
      {
        texto: `He ⟦wandered around||deambuló por⟧ the streets for hours, ⟦worn out||agotado⟧ and starving. In the end he ⟦sold off||malbarató⟧ his fine European coat for a few coins and ⟦filled up on||se llenó con⟧ a bowl of rice. Then a bright poster ⟦caught his eye||le llamó la atención⟧: a troupe of acrobats, about to sail for America, was ⟦taking on||contratando⟧ new performers.

Passepartout ⟦signed up||se apuntó⟧ on the spot. It was a way to ⟦get across||cruzar⟧ the Pacific and — with a little luck — ⟦catch up with||alcanzar a⟧ Mr. Fogg on the far side. They ⟦kitted him out||lo disfrazaron⟧ as a long-nosed clown and told him to smile.`,
        es: "Hambriento, se une a una troupe de acróbatas que zarpa a América.",
      },
      {
        texto: `Meanwhile Fogg and Aouda ⟦turned up||llegaron⟧ in Yokohama on a later ⟦steamer||vapor⟧, ⟦anxious to||ansiosos por⟧ find Passepartout before the next ship ⟦set off||zarpara⟧. They ⟦asked after||preguntaron por⟧ him everywhere.

That night they ⟦dropped in||se pasaron por⟧ on a ⟦show||función⟧ — "The Amazing Long-Noses" — hoping to ⟦take their minds off||distraerse de⟧ the search.`,
        es: "Fogg y Aouda llegan buscándolo y esa noche caen en la función del circo.",
      },
      {
        texto: `The acrobats ⟦piled up||se treparon unos sobre otros⟧ into a huge human pyramid, long paper noses ⟦sticking out||sobresaliendo⟧ in every direction. At the very bottom, ⟦holding it all up||sosteniéndolo todo⟧, was Passepartout.

Then he ⟦spotted||divisó⟧ Fogg in the crowd. "Master!" he cried — and ⟦let go||soltó⟧. The whole pyramid ⟦came crashing down||se vino abajo⟧ ⟦in a heap||en un montón⟧ of noses. Fogg ⟦helped him up||lo ayudó a pararse⟧, unbothered as ever.`,
        es: "Passepartout ve a Fogg, suelta la pirámide humana y todo se viene abajo.",
      },
      {
        texto: `Reunited at last, the three ⟦hurried off||se fueron de afán⟧ to the harbor and ⟦got on board||subieron a bordo de⟧ the General Grant, bound for San Francisco.

Passepartout ⟦tore off||se arrancó⟧ his clown costume with relief. Fix had ⟦tagged along||se les pegó⟧ again, hiding among the passengers. As Japan ⟦faded away||se desvanecía⟧, the Pacific ⟦stretched out||se extendía⟧ ahead — twenty-two days of open water to ⟦get through||pasar⟧.`,
        es: "Reunidos, suben al General Grant rumbo a San Francisco; Fix los sigue.",
      },
    ],
  },
  {
    n: 7,
    titulo: "San Francisco",
    subtitulo: "El Pacífico y el Nuevo Mundo",
    imgApertura: '/libro/vc7-apertura.webp',
    imgDentro: ['/libro/vc7-1.webp', '/libro/vc7-2.webp', '/libro/vc7-3.webp'],
    altApertura: "El gran vapor de ruedas General Grant surcando el vasto océano Pacífico bajo un cielo inmenso, con pasajeros en cubierta.",
    altDentro: [
      "La bahía de San Francisco en 1872: colinas, veleros y muelles de madera, con un vapor entrando al puerto.",
      "Una revuelta callejera en San Francisco: una multitud alborotada peleando alrededor de una tarima política, sombreros por el aire.",
      "Una locomotora de vapor del Pacífico Central en la estación de noche, lista para cruzar el continente, bajo faroles.",
    ],
    phrasals: ["plow on", "slip by", "pick up on", "pay off", "pull into", "stick close to", "kick off", "square off", "climb aboard", "settle in"],
    paginas: [
      {
        texto: `The General Grant ⟦plowed on||surcaba⟧ across the endless Pacific. Day after day ⟦slipped by||pasaba⟧ with nothing but water. What nobody ⟦picked up on||notó⟧ was a quiet trick of the map: sailing east, they were ⟦gaining||ganando⟧ time, ⟦little by little||poco a poco⟧, as the sun ⟦came up||salía⟧ earlier each morning. That secret would ⟦pay off||dar frutos⟧ later.`,
        es: "Cruzan el Pacífico; sin notarlo, van ganando tiempo hacia el este.",
      },
      {
        texto: `On the twenty-third day land ⟦showed up||apareció⟧ ⟦at last||por fin⟧ on the horizon: America. The steamer ⟦pulled into||entró a⟧ San Francisco, a rough young city ⟦springing up||que brotaba⟧ on its steep hills, half mud and half gold.

They had only a few hours before the evening train ⟦headed off||salía⟧ east. Fix ⟦stuck close to||se pegó a⟧ Fogg the whole time, still ⟦counting on||contando con⟧ the warrant that would let him ⟦lock him up||encerrarlo⟧ on English soil. Passepartout, meanwhile, ⟦soaked up||se empapaba de⟧ the noise, the mud, and the wild new energy — nothing like old Europe.`,
        es: "Tras 23 días aparece América; desembarcan en San Francisco antes del tren.",
      },
      {
        texto: `They ⟦set off||salieron⟧ into the streets to ⟦stretch their legs||estirar las piernas⟧. San Francisco was ⟦buzzing||alborotada⟧: gold-seekers, sailors, and gamblers ⟦rubbing shoulders||codeándose⟧ in the mud.

Up ahead a crowd was ⟦building up||agolpándose⟧ around a platform. Some political meeting was about to ⟦kick off||arrancar⟧, and tempers were already ⟦flaring up||encendiéndose⟧.`,
        es: "Salen a caminar; la ciudad hierve y se arma un mitin político.",
      },
      {
        texto: `Suddenly the meeting ⟦broke into||se convirtió en⟧ a brawl. Fists ⟦flew||volaban⟧, hats ⟦sailed||salían volando⟧ through the air, and the crowd ⟦surged||se abalanzaba⟧ back and forth.

Fogg and a huge stranger — a certain Colonel Proctor — ⟦squared off||se encararon⟧ for a moment before the mob ⟦swept them apart||los separó a empujones⟧. "We'll ⟦settle this||arreglar esto⟧ another day," growled Proctor, ⟦storming off||yéndose hecho una furia⟧.`,
        es: "El mitin se vuelve pelea; Fogg se encara con el coronel Proctor.",
      },
      {
        texto: `By evening they ⟦made their way||se abrieron paso⟧ to the station, where the great train stood ⟦hissing||resoplando⟧ under its lamps. It would ⟦set out||partir⟧ across mountains, deserts, and plains — three thousand miles to New York.

They ⟦climbed aboard||subieron⟧ and ⟦settled in||se acomodaron⟧. Passepartout, glad to be ⟦on the move||en marcha⟧ again, ⟦dozed off||se durmió⟧ before the wheels even began to ⟦roll||rodar⟧.`,
        es: "De noche suben al tren transcontinental: tres mil millas hasta Nueva York.",
      },
    ],
  },
  {
    n: 8,
    titulo: "The Sioux",
    subtitulo: "El Oeste y el ataque",
    imgApertura: '/libro/vc8-apertura.webp',
    imgDentro: ['/libro/vc8-1.webp', '/libro/vc8-2.webp', '/libro/vc8-3.webp'],
    altApertura: "Un tren de vapor cruzando una pradera inmensa del Oeste americano bajo un cielo enorme, con montañas nevadas al fondo.",
    altDentro: [
      "Una enorme manada de búfalos cruzando las vías del tren en la llanura, con la locomotora esperando entre el polvo.",
      "Guerreros sioux a caballo atacando un tren de vapor en marcha por la pradera, al atardecer.",
      "Un trineo con vela deslizándose a toda velocidad sobre una llanura nevada, con los viajeros abrigados a bordo.",
    ],
    phrasals: ["rattle on", "eat up", "move on", "hold back", "talk out of", "settle down", "break out", "cut loose", "leave behind", "track down"],
    paginas: [
      {
        texto: `The train ⟦rattled on||traqueteaba⟧ east across the wide plains, ⟦eating up||devorando⟧ the miles. Snowy mountains ⟦rolled past||pasaban por⟧ the windows. Everything was ⟦running like clockwork||marchando a la perfección⟧, and Fogg was still comfortably ⟦ahead of time||adelantado⟧ — until the brakes suddenly ⟦screeched||chirriaron⟧ and the whole train ⟦shuddered to a stop||se detuvo con un temblón⟧.`,
        es: "El tren corre por las llanuras; de repente frena en seco.",
      },
      {
        texto: `A vast herd of buffalo was ⟦crossing over||cruzando⟧ the track — thousands upon thousands, ⟦packed together||apretados⟧, in no hurry at all to ⟦move on||moverse⟧. For three long hours the train had to ⟦hold back||esperar⟧ while the beasts ⟦filed past||desfilaban⟧ in a brown river.

Later a rickety bridge nearly ⟦gave way||cedió⟧ beneath them, and the driver only just ⟦made it across||lo cruzó⟧. Worst of all, Colonel Proctor ⟦turned out||resultó⟧ to be aboard the same train. He and Fogg ⟦picked up||retomaron⟧ their old quarrel, and only Aouda ⟦talked them out of||los disuadió de⟧ a duel then and there.`,
        es: "Una manada de búfalos bloquea la vía; y aparece el coronel Proctor.",
      },
      {
        texto: `That night the train ⟦sped up||aceleró⟧ across empty country. Passepartout could not ⟦settle down||tranquilizarse⟧; something felt wrong. Out in the dark, ⟦shapes||siluetas⟧ were ⟦keeping pace with||siguiéndole el paso a⟧ the train.

Then ⟦war cries||gritos de guerra⟧ ⟦rang out||resonaron⟧. A band of Sioux warriors was ⟦closing in||acercándose⟧ on horseback, ⟦gaining on||ganándole terreno a⟧ the last cars.`,
        es: "De noche el tren acelera; unos jinetes sioux se acercan en la oscuridad.",
      },
      {
        texto: `The Sioux ⟦leapt onto||saltaron a⟧ the moving train and a fight ⟦broke out||estalló⟧ car by car. Passepartout ⟦crawled underneath||se arrastró por debajo⟧ to reach the engine and ⟦cut loose||soltar⟧ the cars from the locomotive.

He ⟦pulled it off||lo logró⟧, but was ⟦carried off||arrastrado⟧ by the warriors as the train ⟦screeched to a halt||frenó en seco⟧ at Fort Kearney. Several soldiers had been ⟦taken||llevados⟧ too.`,
        es: "Los sioux atacan; Passepartout desengancha los vagones pero se lo llevan.",
      },
      {
        texto: `Fogg would not ⟦leave him behind||dejarlo atrás⟧. With a few soldiers he ⟦set out||salió⟧ into the snow, ⟦tracked down||dio con⟧ the Sioux camp, and ⟦got everyone out||sacó a todos⟧ alive. But the train had ⟦gone on||seguido⟧ without them.

Stranded, they ⟦came across||se toparon con⟧ a sledge with a sail. The wind ⟦picked up||arreció⟧, and the strange craft ⟦skimmed over||se deslizó sobre⟧ the frozen plain toward Omaha.`,
        es: "Fogg lo rescata, pierde el tren y siguen en un trineo de vela por la nieve.",
      },
    ],
  },
  {
    n: 9,
    titulo: "The Henrietta",
    subtitulo: "El Atlántico contra reloj",
    imgApertura: '/libro/vc9-apertura.webp',
    imgDentro: ['/libro/vc9-1.webp', '/libro/vc9-2.webp', '/libro/vc9-3.webp'],
    altApertura: "El puerto de Nueva York al atardecer: veleros de mástiles altos y el humo de un vapor que se aleja del muelle.",
    altDentro: [
      "Fogg negocia con el capitán Speedy en la cubierta del carguero Henrietta, entre cabos y maquinaria.",
      "Marineros arrancando la madera del barco y echándola a los hornos de la caldera, entre chispas y fuego.",
      "El vapor Henrietta, reducido a su casco pelado, luchando contra el oleaje gris del Atlántico.",
    ],
    phrasals: ["make it", "pull away", "size up", "work out", "turn down", "take over", "pitch in", "give out", "tear down", "buy out"],
    paginas: [
      {
        texto: `They ⟦made it to||llegaron a⟧ New York — but only just too late. The steamer for England had ⟦pulled away||se había alejado⟧ from the dock forty-five minutes before, its smoke still ⟦hanging over||flotando sobre⟧ the water.

Fogg did not ⟦panic||entrar en pánico⟧. He ⟦looked around||miró alrededor⟧ the harbor, ⟦sizing up||evaluando⟧ every ship, ⟦working out||calculando⟧ a new way across the Atlantic.`,
        es: "Llegan a Nueva York 45 minutos tarde: el barco a Inglaterra ya zarpó.",
      },
      {
        texto: `He ⟦set his sights on||le echó el ojo a⟧ the Henrietta, a cargo steamer ⟦bound for||con rumbo a⟧ Bordeaux. Its captain, a gruff man named Speedy, flatly ⟦turned down||rechazó⟧ any change of course, whatever the price.

So Fogg ⟦bought off||sobornó a⟧ the crew, ⟦took over||se apoderó de⟧ the ship, and ⟦locked up||encerró a⟧ the furious captain in his own cabin. "We're ⟦heading for||vamos rumbo a⟧ Liverpool," he announced, "and I'll pay you well." Coal was already ⟦running low||escaseando⟧ in the bunkers, but Fogg had ⟦figured out||descifrado⟧ a desperate answer — one that would ⟦cost him||costarle⟧ the ship itself.`,
        es: "Fogg se apodera de un carguero, el Henrietta, y pone rumbo a Liverpool.",
      },
      {
        texto: `For days the Henrietta ⟦raced across||cruzaba a toda⟧ the grey Atlantic. Fix, whose ⟦warrant||orden⟧ was now useless, had ⟦given up||renunciado a⟧ the chase and ⟦pitched in||se puso a ayudar⟧ instead — he wanted Fogg back in England as much as anyone.

Then the coal ⟦gave out||se acabó⟧. The engines began to ⟦die down||apagarse⟧, and land was still ⟦a long way off||muy lejos⟧.`,
        es: "En pleno Atlántico se acaba el carbón y las máquinas empiezan a apagarse.",
      },
      {
        texto: `Fogg's plan was mad and brilliant: if there was no coal, they would burn the ship itself. He ⟦bought out||le compró⟧ the vessel from its captain, then had the crew ⟦tear down||arrancar⟧ the masts, decks, and cabins and ⟦feed them into||echarlos a⟧ the ⟦furnaces||hornos⟧.

⟦Plank||Tablón⟧ by plank, the Henrietta ⟦burned up||quemaba⟧ its own body, ⟦pressing on||siguiendo adelante⟧ toward Ireland.`,
        es: "Fogg compra el barco y lo quema por dentro para tener combustible.",
      },
      {
        texto: `By the time land ⟦showed up||apareció⟧, the proud steamer was little more than a bare ⟦hull||casco⟧, ⟦stripped down||desmantelada⟧ to the waterline. Storms had ⟦battered||golpeado⟧ it the whole way.

They ⟦pulled into||entraron a⟧ Queenstown, in Ireland — close enough. A fast train and a boat could ⟦get them into||meterlos en⟧ Liverpool, and Liverpool to London was nothing. Fogg was going to ⟦make it||lograrlo⟧… or so it seemed.`,
        es: "El Henrietta llega a Irlanda hecho un casco pelado; aún parece que lo logra.",
      },
    ],
  },
  {
    n: 10,
    titulo: "The Eightieth Day",
    subtitulo: "El día que se ganó",
    imgApertura: '/libro/vc10-apertura.webp',
    imgDentro: ['/libro/vc10-1.webp', '/libro/vc10-2.webp', '/libro/vc10-3.webp'],
    altApertura: "La fachada del Reform Club de noche, con caballeros esperando junto a un gran reloj, bajo faroles de gas.",
    altDentro: [
      "Fogg detenido en una sala de aduana en Liverpool, sereno tras una ventana con barrotes.",
      "Passepartout corriendo sin aliento por las calles de Londres al anochecer, con la noticia del día ganado.",
      "Phileas Fogg entrando de golpe al salón del Reform Club justo cuando el reloj da la hora; los socios atónitos.",
    ],
    phrasals: ["step forward", "lock up", "come out", "own up", "let go", "shut away", "stand by", "stumble onto", "burst in", "win back"],
    paginas: [
      {
        texto: `At Liverpool, with only six hours to London, disaster ⟦struck||golpeó⟧. Fix ⟦stepped forward||dio un paso al frente⟧, at last ⟦holding||con⟧ his warrant, and ⟦clapped a hand on||le puso la mano encima a⟧ Fogg's shoulder. "You're ⟦under arrest||detenido⟧."

Fogg did not ⟦resist||resistirse⟧. He was ⟦locked up||encerrado⟧ in the customs house while the precious hours ⟦ticked away||se iban⟧.`,
        es: "En Liverpool, Fix por fin arresta a Fogg cuando faltan seis horas.",
      },
      {
        texto: `Three hours later the truth ⟦came out||salió a la luz⟧: the real bank thief had been ⟦caught||atrapado⟧ in Edinburgh three days earlier. Fix, ⟦crushed||deshecho⟧ and ashamed, ⟦let him go||lo dejó ir⟧ and ⟦owned up to||confesó⟧ his terrible mistake.

But the damage was done. Fogg calmly ⟦hired||alquiló⟧ a special express and ⟦tore off||salió disparado⟧ toward London at full steam — yet snow and delays ⟦held him up||lo demoraron⟧, and he ⟦pulled in||llegó⟧ five minutes too late. The eighty days were ⟦up||cumplidos⟧. Phileas Fogg had, it seemed, ⟦lost||perdido⟧ the wager and half his fortune.`,
        es: "El verdadero ladrón ya estaba preso; sueltan a Fogg, pero llega tarde a Londres.",
      },
      {
        texto: `Back in London, Fogg ⟦shut himself away||se encerró⟧, calm but ⟦ruined||arruinado⟧. He had ⟦gone through||pasado por⟧ half the world and ⟦come up||quedado⟧ just minutes short.

That evening Aouda, unable to ⟦hold back||contenerse⟧, took his hand. "You ⟦gave up||renunciaste a⟧ everything to save me. Will you not let me ⟦stand by||estar al lado de⟧ you now?" Fogg, ⟦moved||conmovido⟧ at last, agreed to marry her.`,
        es: "Arruinado y sereno, Fogg acepta casarse con Aouda.",
      },
      {
        texto: `Passepartout was ⟦sent off||enviado⟧ to fetch a clergyman — and ⟦stumbled onto||dio por casualidad con⟧ something impossible. The calendar said Saturday, not Sunday. Racing east around the world, they had ⟦gained||ganado⟧ a whole day without ⟦catching on||darse cuenta⟧!

"Master!" he ⟦burst in||irrumpió⟧, ⟦out of breath||sin aliento⟧. "It's a day earlier! You still have time — but you must ⟦set off||salir⟧ this instant!"`,
        es: "Passepartout descubre que ganaron un día cruzando el mundo hacia el este.",
      },
      {
        texto: `They ⟦raced off||salieron a toda⟧ to the Reform Club. Inside, the gentlemen were ⟦counting down||contando⟧ the final seconds, sure they had ⟦won||ganado⟧.

The clock ⟦struck||dio⟧ a quarter to nine. The door ⟦flew open||se abrió de golpe⟧ — and there stood Phileas Fogg. "Here I am," he said quietly. He had ⟦pulled it off||lo había logrado⟧ with seconds ⟦to spare||de sobra⟧, and ⟦won back||recuperó⟧ his fortune — and a wife.`,
        es: "Fogg entra al Reform Club en el último segundo: gana la apuesta y una esposa.",
      },
    ],
  },
];

/** Los phrasal verbs DISTINTOS que enseña el libro. Es el número del cierre
    ("N phrasal verbs en 10 capítulos"), así que va sin repetir: sumar las tiras
    de los diez capítulos daría un número inflado. */
export const PHRASALS_TOTAL = Array.from(
  new Set(CAPITULOS.flatMap((c) => c.phrasals.map((p) => p.toLowerCase()))),
);
