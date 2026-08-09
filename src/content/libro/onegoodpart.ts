/* ONE GOOD PART — el cuento del tercer libro interactivo.

   ⚠ ARCHIVO GENERADO Y EDITADO A MANO. Es el hermano de alicia.ts y
   vueltamundo.ts: mismo tipo, misma vista (src/views/libro), solo cambian el
   cuento y las láminas. Para ajustar el texto conviene editar acá directamente.

   Adaptación LIBRE de "The Time Machine" de H.G. Wells — no sigue la trama
   original, solo la premisa (una máquina del tiempo, un inventor). Dos
   protagonistas: Professor Halden Rooke (74, reparador excéntrico en Lisboa) y
   Nia Serrano (17, su ayudante). El arco: en el presente pasa algo que hay que
   arreglar → viajan al pasado a arreglarlo → sin saberlo dañan el presente →
   vuelven y lo encuentran peor → van al futuro a entender qué rompieron →
   vuelven a cerrar la historia. 6 ciudades reales, 5 continentes, 7 épocas.

   El vocabulario es el de resolver problemas de verdad: perder algo, llegar
   tarde, pedir ayuda, negociar, arreglar lo que se rompió — nada de léxico de
   fantasía. El texto MISMO lleva los phrasal verbs, glosados con ⟦en||es⟧
   (lib/gloss.ts): no hay lista de vocabulario aparte, se aprende leyendo.

   ESTRUCTURA: 10 capítulos × 5 páginas, igual que Around the World —
     0  abrebocas (55-70 palabras) — va con la lámina de apertura y es la única
        que muestra los phrasal verbs del capítulo
     1  (85-105) el capítulo arranca de verdad; la única cara SIN lámina
     2  (55-70)  comparte la cara con la LÁMINA 1
     3  (55-70)  comparte la cara con la LÁMINA 2
     4  (55-70)  comparte la cara con la LÁMINA 3 y cierra, empujando al siguiente

   Las láminas se generaron con Abacus.AI RouteLLM (gemini-3.1-flash-image), no
   con Canva — ver la memoria del proyecto sobre por qué. Estilo cel-shaded
   cinematográfico (Ghibli/Cartoon Saloon), personajes con ficha de descripción
   repetida en cada prompt para mantener consistencia sin referencia de imagen
   real. Detalle en LIBRO-time-machine-prompts.md. */

import type { Capitulo } from './tipos';

/** Las láminas que no pertenecen a ningún capítulo. */
export const IMAGENES = {
  portada: '/libro/o00-portada.webp',
  fin: '/libro/o99-fin.webp',
} as const;

export const CAPITULOS: Capitulo[] = [
  {
    n: 1,
    titulo: 'The Burst Pipe',
    subtitulo: 'La tubería revienta',
    imgApertura: '/libro/oc1-apertura.webp',
    imgDentro: ['/libro/oc1-1.webp', '/libro/oc1-2.webp', '/libro/oc1-3.webp'],
    altApertura:
      'Una calle empedrada del barrio de Alfama en Lisboa al amanecer, con azulejos y rieles de tranvía en el suelo; una chica sola con mochila está parada frente a la puerta de un taller, con un chorro de agua saliendo por debajo hacia sus zapatos, luz azul de madrugada.',
    altDentro: [
      'Primer plano de las manos de una chica levantando una caja de cartón empapada sobre agua estancada que refleja las lámparas del techo; las cintas de casete se deslizan de vuelta al agua.',
      'Un hombre mayor descalzo, con la camisa arrugada, tira de una lona gris cubriendo algo alto contra la pared del fondo, con polvo flotando en un haz de luz.',
      'Primer plano extremo de una ruedita de latón sobre un banco de madera mojado, con una grieta clara cruzando sus dientes, bajo la luz cálida de una lámpara de escritorio.',
    ],
    phrasals: ['show up', 'fall apart', 'clean up', 'throw away', 'own up', 'hold on', 'figure out', 'pull out', 'give up', 'set off'],
    paginas: [
      {
        texto: `Nia had a key to the ⟦workshop||taller⟧, but she had never needed it ⟦before eight||antes de las ocho⟧. That morning she ⟦showed up||apareció⟧ at seven, because Professor Rooke had promised her the last three tapes ⟦by Friday||para el viernes⟧, and Professor Rooke had ⟦never once||ni una sola vez⟧ ⟦kept a promise||cumplido una promesa⟧ about time. She put the key in the lock. Water ⟦came out||salió⟧ under the door and ⟦onto her shoes||hasta sus zapatos⟧.`,
        es: 'Nia llega temprano al taller a buscar las cintas que Rooke le prometió, y encuentra agua entrando bajo la puerta.',
      },
      {
        texto: `Inside, everything was floating. Tools, receipts, a cardboard box of cassette tapes ⟦turning grey at the edges||poniéndose grises en los bordes⟧. The whole room smelled of wet paper and old oil.

"Pipe ⟦went||reventó⟧ in the night," Rooke said from the stairs. He was ⟦barefoot||descalzo⟧, in yesterday's shirt. "I heard it at four. I ⟦told myself||me dije⟧ it was rain."

Nia lifted the box. The wet cardboard ⟦fell apart||se deshizo⟧ in her hands and the tapes went into the water, ⟦one after another||uno tras otro⟧, like something being dropped ⟦on purpose||a propósito⟧.

Her mother's ⟦handwriting||letra⟧ on the labels ⟦had already run||ya se había corrido⟧.

"We can't ⟦clean this up||limpiar esto⟧ with towels," she said.`,
        es: 'El taller está inundado y las cintas con la voz de la madre de Nia quedan arruinadas, con su letra ya borrosa por el agua.',
      },
      {
        texto: `Rooke started ⟦throwing away||tirando⟧ the ⟦ruined reels||carretes arruinados⟧, fast, not looking at them.

"Stop."

"They're ⟦gone||se perdieron⟧, Nia."

"You ⟦don't get to||no tienes derecho a⟧ throw them away. Not you."

He stopped. He stood in the water in his ⟦bare feet||pies descalzos⟧ ⟦for a long moment||durante un buen rato⟧.

"I knew about that pipe," he said. "I've known since March. I should ⟦own up||sincerarme⟧ to that before you ⟦hear it from someone else||te enteres por alguien más⟧."`,
        es: 'Rooke empieza a tirar los carretes arruinados, Nia se lo impide, y él confiesa que sabía de la tubería desde marzo.',
      },
      {
        texto: `He didn't ⟦apologise again||volver a disculparse⟧. He walked to the back wall and pulled ⟦a grey tarpaulin||una lona gris⟧ off something tall.

"What is that."

"⟦Hold on||Espera⟧. Let me say it ⟦properly||como es debido⟧." He ⟦wiped his hands on his shirt||se secó las manos en la camisa⟧. "It works. It has worked for forty years. I've never told anyone, and I'm ⟦too old now||ya demasiado viejo⟧ to ⟦figure out||encontrar⟧ ⟦a good reason why||una buena razón⟧."`,
        es: 'Rooke destapa una máquina que lleva cuarenta años funcionando en secreto, sin decir todavía qué es.',
      },
      {
        texto: `He ⟦pulled out||sacó⟧ a ⟦small brass wheel||ruedita de latón⟧ and set it on the wet bench. A crack ⟦ran clean across the teeth||atravesaba los dientes de lado a lado⟧.

"Water ⟦got it||la dañó⟧. Without this, the machine ⟦jumps far and lands badly||salta lejos y aterriza mal⟧. Twelve hours ⟦is precision||es cuestión de precisión⟧. I can't ⟦do precision||lograr precisión⟧."

"So we ⟦give up||nos rendimos⟧."

"So we ⟦set off||partimos⟧ tonight. Kyoto. The man who ⟦cut this one||la fabricó⟧ is twenty years old."`,
        es: 'Rooke saca la ruedita dañada por el agua y explica que sin ella la máquina pierde precisión; deciden partir esa misma noche hacia Kyoto por una nueva.',
      },
    ],
  },
  {
    n: 2,
    titulo: 'The Kyoto Workshop',
    subtitulo: 'El taller de Kioto',
    imgApertura: '/libro/oc2-apertura.webp',
    imgDentro: ['/libro/oc2-1.webp', '/libro/oc2-2.webp', '/libro/oc2-3.webp'],
    altApertura:
      'Rooke y Nia, de espaldas, saliendo de un callejón hacia una calle más ancha de Kioto al amanecer de 1889, con casas de madera de dos pisos y ventanas de papel, un farol de gas encendido y niebla azul.',
    altDentro: [
      'Un puesto de comida callejera en Kioto al amanecer, con vapor subiendo de una olla de hierro; los dos sostienen cuencos calientes con las dos manos mientras el vendedor se ríe.',
      'Una cuadrilla de obreros con chaquetas cortas índigo tirando de sogas para levantar un poste de madera para el nuevo cable del tranvía, mientras un carro de bueyes pasa detrás.',
      'Interior de un taller a ras de suelo: un joven artesano japonés arrodillado en un banco bajo, limando una ruedita diminuta a la luz de una lámpara, con dos pares de zapatos gastados en el escalón de entrada.',
    ],
    phrasals: ['get by', 'point out', 'run into', 'look for', 'try on', 'blend in', 'warm up', 'take off', 'write down', 'hurry up'],
    paginas: [
      {
        texto: `The machine did not land them in a ⟦workshop||taller⟧. It landed them in a ⟦lane||callejón⟧ behind it, in cold that ⟦went straight through||atravesaba⟧ Nia's jacket, two hours before the sun. Somewhere close, a dog was ⟦complaining||quejándose⟧. Rooke counted the coins in his ⟦palm||palma⟧ — eleven of them, brown and ⟦thin||delgadas⟧ — and said the thing she would hear all week: "We'll ⟦get by||nos las arreglaremos⟧."`,
        es: 'La máquina los deja de madrugada en un callejón, muertos de frío y con solo unas monedas; Rooke promete que se las arreglarán.',
      },
      {
        texto: `⟦By first light||Al amanecer⟧ they had a problem that had nothing to do with time travel: they looked wrong. Rooke bought two ⟦used||usadas⟧ jackets off a man ⟦unloading||descargando⟧ a cart, and Nia ⟦tried on||se probó⟧ the smaller one behind a stack of ⟦crates||cajones⟧ while he ⟦stood guard||hacía guardia⟧, badly.

"The backpack goes," he said. "If you want to ⟦blend in||pasar desapercibido⟧, the backpack goes."

"It has the notebook in it."

"Then carry the notebook."

They walked out into a street of wooden houses and paper windows, and Nia understood that she had never once been ⟦properly||verdaderamente⟧ far from home.`,
        es: 'Rooke y Nia consiguen ropa usada para pasar desapercibidos, y ella siente por primera vez lo lejos que está de casa.',
      },
      {
        texto: `They ⟦warmed up||entraron en calor⟧ at a ⟦food stall||puesto de comida⟧, a bowl each, standing in the road because there was ⟦nowhere to sit||no había dónde sentarse⟧. The man ⟦serving them||que los atendía⟧ said something Nia ⟦did not catch||no entendió⟧ and laughed at his own joke ⟦anyway||de todos modos⟧. When Rooke asked, in bad Japanese, where the Mizuno workshop was, an old woman at the next stall ⟦pointed it out||lo señaló⟧ with her chin and did not stop eating.`,
        es: 'Desayunan en un puesto de comida y, cuando preguntan por el taller de Mizuno, una anciana se lo señala con la barbilla sin dejar de comer.',
      },
      {
        texto: `On the way they ⟦ran into||se toparon con⟧ a ⟦work crew||cuadrilla⟧ ⟦raising||que alzaba⟧ a wooden pole, arguing about cable, while an ⟦ox cart||carreta de bueyes⟧ ⟦went round them||los rodeó⟧ ⟦without slowing||sin frenar⟧.

"Electricity," Rooke said, ⟦delighted||encantado⟧. "They're building the first ⟦tram line||línea de tranvía⟧ in the country. Right now. This week."

"And we're here ⟦looking for||buscando⟧ a ⟦gear||engranaje⟧."

"We're here looking for a very good gear."`,
        es: 'En el camino se cruzan con obreros tendiendo cables para el primer tranvía del país, y mientras Rooke se maravilla, Nia insiste en que solo están ahí por un engranaje.',
      },
      {
        texto: `They ⟦took off||se quitaron⟧ their shoes at the ⟦step||umbral⟧. Inside, a young man was ⟦bent over||encorvado sobre⟧ a low bench, ⟦filing||limando⟧ a wheel ⟦no bigger than a coin||apenas del tamaño de una moneda⟧.

"Two days," said Sato Kenji, ⟦without looking up||sin levantar la vista⟧. "⟦Don't hurry me up||No me apures⟧. Fast work is bad work."

Nia ⟦wrote down||anotó⟧ every ⟦measurement||medida⟧ he gave them. Three streets away, the machine was already too hot to touch.`,
        es: 'En el taller, Sato Kenji promete el engranaje en dos días y no piensa apurarse, aunque la máquina ya casi no aguanta el calor.',
      },
    ],
  },
  {
    n: 3,
    titulo: 'What We Took',
    subtitulo: 'Lo que se llevaron',
    imgApertura: '/libro/oc3-apertura.webp',
    imgDentro: ['/libro/oc3-1.webp', '/libro/oc3-2.webp', '/libro/oc3-3.webp'],
    altApertura:
      'Un banco de trabajo japonés visto desde arriba, con un paño de lino abierto y una sola pieza de latón terminada en el centro, rodeada de limas finas y virutas de metal, bajo luz cálida de lámpara.',
    altDentro: [
      'Una chica sola de pie en un taller vacío, con las manos cruzadas detrás de la espalda, mirando hacia abajo el banco que le pidieron cuidar.',
      'Dos figuras corriendo por un callejón de tierra al amanecer en la vieja Kioto; en primer plano, un cuaderno negro cae al piso de madera junto a la entrada de un taller.',
      'Un joven artesano japonés visto de espaldas, de pie inmóvil frente a un paño de lino vacío, con un cuaderno negro abierto en una mano.',
    ],
    phrasals: ['look after', 'mix up', 'hand over', 'pick up', 'put back', 'run out', 'sort out', 'head off', 'take back'],
    paginas: [
      {
        texto: `Kenji went out for ⟦charcoal||carbón⟧ at nine. At the door he stopped, thought about it, and said the sentence that ⟦would cost him everything||le costaría todo⟧: "⟦Look after||Cuida⟧ the bench for ten minutes."

Nia said yes. She was seventeen and someone had ⟦trusted her with something||le había confiado algo⟧, and it ⟦felt good||se sintió bien⟧, and that was ⟦the whole of it||eso era todo⟧. She has thought about those ten minutes every day ⟦since||desde entonces⟧.`,
        es: 'Kenji sale a buscar carbón y le pide a Nia que cuide el banco diez minutos; ella acepta sin saber que esos minutos la van a perseguir toda la vida.',
      },
      {
        texto: `Four minutes in, a man came through the back door ⟦in a hurry||con prisa⟧ — the master's son, ⟦sleeves already rolled||con las mangas ya remangadas⟧, a ⟦ledger||libro de cuentas⟧ under his arm and no time for anyone. He looked at the cloth on the bench, then at Rooke.

"The finished one? It's paid for?"

"It isn't," Rooke said, and then, because the machine was three streets away and ⟦getting hotter||cada vez más caliente⟧, "but it can be."

The son had ⟦mixed up||confundió⟧ two orders that morning and ⟦would not notice||no se daría cuenta⟧ for a week. He ⟦named a price||puso un precio⟧. Rooke ⟦handed over||entregó⟧ every coin he had, and some of Nia's.`,
        es: 'El hijo del maestro llega de prisa con una pieza que vendió por error, y Rooke paga lo que sea con tal de llevársela ya.',
      },
      {
        texto: `Nia ⟦picked up||recogió⟧ the piece. It was ⟦warm from the light||tibia por la luz⟧ and ⟦heavier than it looked||más pesada de lo que parecía⟧, and the teeth were ⟦so fine||tan finos⟧ she ⟦could not count them with her eyes||no lograba contarlos a simple vista⟧.

"⟦Put it back||Devuélvala⟧," she said. She didn't know why.

"It's ours. He sold it."

"Put it back, Professor."

⟦Somewhere behind the houses||En algún lugar detrás de las casas⟧, a sound started ⟦that only the two of them could hear||que solo ellos dos podían oír⟧.`,
        es: 'Nia siente que algo no está bien con la pieza y le insiste a Rooke que la devuelva, pero él ya la compró; a lo lejos empieza a sonar la máquina.',
      },
      {
        texto: `Their time ⟦ran out||se acabó⟧ ⟦all at once||de golpe⟧, ⟦the way it always does||como siempre pasa⟧.

"We'll ⟦sort it out||resolverlo⟧ when we're home," Rooke said, already moving toward the door.

They ⟦headed off||partieron⟧ down the ⟦lane||callejón⟧ ⟦at a run||corriendo⟧, and Nia's bag was open ⟦the whole way||todo el camino⟧, and the notebook went from her arm to the step to the floor ⟦without anyone hearing it land||sin que nadie lo oyera caer⟧.`,
        es: 'El tiempo se les acaba de golpe y salen corriendo hacia la máquina, sin notar que el cuaderno de Nia se cae por el camino.',
      },
      {
        texto: `Kenji ⟦returned||regresó⟧ with the ⟦charcoal||carbón⟧ at twenty past nine. The cloth was ⟦open and empty||abierto y vacío⟧. He stood there a while, trying to remember whether he had ⟦moved it himself||lo movió él mismo⟧.

On the floor by the step was a black notebook, full of drawings he ⟦could not read||no lograba descifrar⟧.

"I'd ⟦take it back||retractarme⟧ if I could," Nia said, ⟦a hundred and thirty-seven years away||a ciento treinta y siete años de distancia⟧.`,
        es: 'Kenji vuelve y encuentra el banco vacío junto a un cuaderno que no logra descifrar; muchos años después, Nia dice que se retractaría si pudiera.',
      },
    ],
  },
  {
    n: 4,
    titulo: 'Stuck in Valparaíso',
    subtitulo: 'Varados en Valparaíso',
    imgApertura: '/libro/oc4-apertura.webp',
    imgDentro: ['/libro/oc4-1.webp', '/libro/oc4-2.webp', '/libro/oc4-3.webp'],
    altApertura:
      'El puerto de Valparaíso al mediodía de 1906, visto desde lo alto de un cerro: veleros y vapores en la bahía, casas de colores apiladas en la ladera y un ascensor de madera subiendo por su riel.',
    altDentro: [
      'Un mercado de pescado en el puerto, con cajones sobre hielo bajo toldos de lona; una chica con mochila carga un cajón de madera demasiado grande para ella entre estibadores.',
      'Un hombre mayor sentado solo en un cajón en una esquina empedrada de Valparaíso, con un pañuelo extendido y seis relojes de bolsillo abiertos, una lupa de joyero en el ojo.',
      'Un hombre mayor de pie solo frente a una vitrina tapiada con tablones cruzados, comparando un papel con la puerta vacía, bajo la luz de un farol.',
    ],
    phrasals: ['break down', 'end up', 'work out', 'look around', 'put up with', 'get around', 'turn down', 'hold up', 'check in', 'ask around'],
    paginas: [
      {
        texto: `The machine ⟦broke down||se averió⟧ halfway. Nia felt it — a ⟦stutter||sacudida⟧, like a car ⟦changing gear||cambiando de marcha⟧ badly — and then heat, and then a smell of ⟦burning dust||polvo quemado⟧, and then ⟦gulls||gaviotas⟧.

They were standing on a ⟦hillside||ladera⟧ above a ⟦harbour||puerto⟧ full of ⟦masts||mástiles⟧, in warm afternoon light, in the wrong century and the wrong ⟦hemisphere||hemisferio⟧. March, 1906.`,
        es: 'La máquina se avería a mitad de camino y los deja varados en una colina sobre un puerto desconocido, en pleno marzo de 1906.',
      },
      {
        texto: `"How do you ⟦end up||terminas⟧ in Chile ⟦aiming for||con rumbo a⟧ Portugal?" Nia said.

"Three days," said Rooke, not answering, already opening the panel. "The ⟦core||núcleo⟧ has to ⟦cool||enfriarse⟧. Three days and I can recalculate."

Three days with no money. They ⟦looked around||recorrieron⟧ the port for somewhere to sleep and ⟦turned down||rechazaron⟧ the first two offers, one because of the price and one because of the man making it. In the end they ⟦put up with||se conformaron con⟧ a ⟦doorway behind a bakery||zaguán detrás de una panadería⟧, which was warm at four in the morning and ⟦smelled of bread||olía a pan⟧ they could not buy.`,
        es: 'Sin plata para pasar la noche, Nia y Rooke recorren el puerto rechazando ofertas hasta conformarse con un zaguán detrás de una panadería.',
      },
      {
        texto: `They worked. Nia carried ⟦crates||cajones⟧ at the ⟦fish market||mercado de pescado⟧ for a man who paid at the end of every ⟦shift||turno⟧ and never looked at her face. A ⟦broken cart||carretilla rota⟧ ⟦held them up||los retrasó⟧ for an hour on the second morning and cost her ⟦half a day's pay||medio día de paga⟧. By the third day the other ⟦loaders||cargadores⟧ had ⟦stopped watching||dejado de vigilarla⟧ to see if she would ⟦drop one||dejar caer uno⟧.`,
        es: 'Nia carga cajones en el mercado de pescado; para el tercer día ya se ganó el respeto callado de los demás cargadores.',
      },
      {
        texto: `Rooke worked a corner with a ⟦handkerchief||pañuelo⟧ spread on a crate, ⟦mending||remendando⟧ ⟦pocket watches||relojes de bolsillo⟧ for ⟦sailors||marineros⟧, and learned how you ⟦get around||te mueves por⟧ a city built on forty hills: you pay a coin and a ⟦wooden lift||ascensor de madera⟧ ⟦hauls you up||te sube⟧ the ⟦slope||cuesta⟧ on a cable.

"We could ⟦check in||hospedarnos⟧ somewhere tonight," Nia said, counting the coins twice.

"We could eat instead."`,
        es: 'Rooke repara relojes de bolsillo en una esquina y aprende a moverse por los cerros de Valparaíso; esa noche prefieren comer antes que pagar un techo.',
      },
      {
        texto: `On the last afternoon Rooke went to buy a ⟦spring||resorte⟧ from a ⟦watchmaker||relojero⟧ he had used before, on a previous ⟦jump||salto⟧. The address was right. The shop was a ⟦boarded doorway||puerta tapiada⟧. He ⟦asked around||preguntó por ahí⟧ for an hour and ⟦nobody had heard the name||nadie conocía ese nombre⟧.

"It'll ⟦work out||salir bien⟧," he said, on the way back, and for the first time Nia noticed that he said that when he was ⟦frightened||asustado⟧.`,
        es: 'Rooke va a buscar la relojería de un salto anterior y descubre que nunca existió; es la primera grieta, aunque todavía no entienden qué significa.',
      },
    ],
  },
  {
    n: 5,
    titulo: 'The Wrong Lisbon',
    subtitulo: 'La Lisboa equivocada',
    imgApertura: '/libro/oc5-apertura.webp',
    imgDentro: ['/libro/oc5-1.webp', '/libro/oc5-2.webp', '/libro/oc5-3.webp'],
    altApertura:
      'La misma calle empedrada de Alfama, pero donde debería estar el taller hay ahora una tienda moderna de fundas de celular con vidriera iluminada; Rooke y Nia parados en medio de la calle mirándola, al atardecer.',
    altDentro: [
      'Un hombre mayor con las dos manos apoyadas en la vidriera de una tienda, mirando hacia adentro un interior que no reconoce, con su propio reflejo superpuesto en el vidrio.',
      'Primer plano de un celular en la mano de una chica, con un mapa en la pantalla y un resultado de búsqueda vacío.',
      'Un cajón de casa abierto visto desde arriba: llaves, papeles doblados, monedas, y una foto vieja de un joven con delantal de taller.',
    ],
    phrasals: ['get in', 'let in', 'look up', 'come back', 'turn out', 'shut down', 'move out', 'tear down', 'wipe out', 'find out'],
    paginas: [
      {
        texto: `The ⟦landing||aterrizaje⟧ was perfect. That was the thing Nia would remember: the machine finally did exactly what it ⟦was supposed to do||se suponía que debía hacer⟧. Same street. Same ⟦cobbles||adoquines⟧. Same tiles, ⟦cracked||agrietadas⟧ in the same place by the door.

Where the ⟦workshop||taller⟧ had been there was a shop selling ⟦phone cases||fundas de celular⟧, open, ⟦lit||iluminada⟧, ⟦busy||concurrida⟧, at nine on a Tuesday night.`,
        es: 'La máquina aterriza perfecta en la misma calle de siempre, pero donde debía estar el taller ahora hay una tienda de fundas de celular.',
      },
      {
        texto: `They couldn't ⟦get in||entrar⟧. A girl behind the ⟦counter||mostrador⟧ said the ⟦unit||local⟧ had been hers for four years and would not ⟦let them in||dejarlos entrar⟧ to look at the back wall, which was completely reasonable and did not help at all, and Rooke stood in the doorway saying his own address at her until Nia ⟦pulled him out||lo sacó de ahí⟧.

On the ⟦pavement||acera⟧ she ⟦looked it up||lo buscó⟧ on her phone. No workshop. No ⟦listing||registro⟧. No archived photo.

"We ⟦came back||volvimos⟧ to the wrong one," Rooke said.

"No," said Nia. "This is the right one now."`,
        es: 'La empleada del local no los deja entrar, y Nia no encuentra ningún rastro del taller en su teléfono: no se equivocaron de sitio, este sitio cambió.',
      },
      {
        texto: `It ⟦turned out||resultó que⟧ he was still alive, still seventy-four, still in Lisbon. He had ⟦spent forty years||pasó cuarenta años⟧ in an ⟦insurance office||oficina de seguros⟧ on Avenida Almirante Reis and ⟦retired||se jubiló⟧ last spring with a clock and a card everyone had ⟦signed||firmada⟧.

The workshop had not ⟦shut down||cerrado⟧. It had never opened. Nobody had ever taught him to ⟦hold a file||sostener una lima⟧, and his hands, when he looked at them, were ⟦somebody else's||de otra persona⟧.`,
        es: 'Resulta que Rooke sigue vivo, pero pasó cuarenta años en una oficina de seguros: en esta versión el taller nunca abrió y nadie le enseñó el oficio.',
      },
      {
        texto: `Her own house was there. Her family was there. But in this version they had ⟦moved out||se mudaron⟧ of the ⟦neighbourhood||barrio⟧ when she was six, half the street had been ⟦torn down||derribada⟧ and ⟦rebuilt||reconstruida⟧, and there was no Professor Rooke in her life at all — no ⟦bench||banco⟧, no Saturdays, no ⟦tapes||cintas⟧.

Forty years of somebody's work, ⟦wiped out||borrado⟧, and only two people ⟦on earth||en el mundo⟧ ⟦could tell||podían saberlo⟧.`,
        es: 'La casa y la familia de Nia siguen ahí, pero se mudaron del barrio cuando ella tenía seis años y nunca conoció a Rooke: cuarenta años de trabajo, borrados, y solo ellos dos podrían notarlo.',
      },
      {
        texto: `"Somebody taught my teacher," Rooke said. He was sitting on a ⟦kerb||borde de la acera⟧, which she had ⟦never once||nunca antes⟧ seen him do. "Walt ⟦learned it from||lo aprendió de⟧ a Japanese man who ⟦came to||llegó a⟧ Europe in ⟦the thirties||los años treinta⟧. Find him and we find ⟦the hole||el hueco⟧. I need to ⟦find out||averiguar⟧ what happened to him."

"And if he's dead?"

"Then somewhere in 1935 he isn't."`,
        es: 'Rooke dice que su maestro aprendió el oficio de un japonés que llegó a Europa en los años treinta, y que hay que encontrarlo para averiguar qué le pasó — aunque hoy esté muerto, quizás en 1935 todavía no lo esté.',
      },
    ],
  },
  {
    n: 6,
    titulo: 'Finding Kenji',
    subtitulo: 'Encontrar a Kenji',
    imgApertura: '/libro/oc6-apertura.webp',
    imgDentro: ['/libro/oc6-1.webp', '/libro/oc6-2.webp', '/libro/oc6-3.webp'],
    altApertura:
      'El callejón de los hojalateros de un zoco de Marrakech al final de la tarde de 1935, con cientos de faroles de metal colgando y polvo dorado en el aire; un hombre japonés mayor martillando una olla en un banquito.',
    altDentro: [
      'Primer plano de dos vasos de té a la menta sirviéndose desde muy alto, con el chorro cayendo entre vapor y un rayo de luz.',
      'Dos pares de manos sobre una mesa baja, vistas desde arriba: unas viejas y quemadas por el metal, otras jóvenes, cerca pero sin tocarse.',
      'Un hombre japonés mayor sentado en un banquito señalando hacia el fondo de un callejón con un martillo en la mano, mientras una chica ya se está dando vuelta para irse, entre faroles al anochecer.',
    ],
    phrasals: ['track down', 'get through', 'bring up', 'open up', 'go over', 'look into', 'give in', 'wear out', 'carry on', 'stop by'],
    paginas: [
      {
        texto: `It took four days to ⟦track him down||dar con él⟧. ⟦Ship records||Registros de embarque⟧, a ⟦work permit||permiso de trabajo⟧, a name written three different ways. Sato Kenji had ⟦failed||reprobado⟧ his examination in 1889, left Kyoto that winter, taken whatever a strong young man could take, and ⟦washed up||fue a parar⟧, ⟦eventually||con el tiempo⟧, in North Africa. He was sixty-six years old and he ⟦mended||reparaba⟧ pots.`,
        es: 'Tras cuatro días de búsqueda dan con Sato Kenji: reprobó su examen en 1889 y hoy, a los sesenta y seis años, repara ollas en el norte de África.',
      },
      {
        texto: `They ⟦got through||lograron atravesar⟧ the crowd in the square at the hour when the ⟦food stalls||puestos de comida⟧ ⟦go up||se instalan⟧ and the whole place starts shouting at once, and ⟦cut into||se metieron en⟧ the ⟦tinsmiths' lane||callejón de los hojalateros⟧, where four hundred lanterns hang from the ceiling and every man is ⟦hammering||martillando⟧ something. The noise was a physical thing; you ⟦felt it in your teeth||lo sentías en los dientes⟧.

He was at the end, on a low stool. Small. Enormous ⟦forearms||antebrazos⟧. Reading glasses ⟦pushed up||subidos a la frente⟧.

He looked at them politely and did not know them. Forty-six years had ⟦gone by||pasado⟧, and they had been two foreigners for three minutes.`,
        es: 'Cruzan el zoco de Marrakech y encuentran a Sato en su taller, pero han pasado tantos años que no los reconoce.',
      },
      {
        texto: `He made them tea, ⟦pouring from a height||sirviendo desde lo alto⟧ so the mint ⟦turned over||se revolvía⟧ in the glass. Rooke ⟦brought up||sacó el tema de⟧ Kyoto, ⟦carefully||con cuidado⟧, the way you touch a ⟦bruise||moretón⟧, and the old man ⟦went quiet||se quedó callado⟧ for a long moment.

Then he ⟦opened up||se abrió⟧. He talked for an hour. He had not talked about it in forty years. Not to a customer, not to a wife, not to anybody.`,
        es: 'Con té de menta de por medio, Rooke menciona Kioto con cuidado y Sato se abre por primera vez en cuarenta años.',
      },
      {
        texto: `He ⟦went over||repasó⟧ the examination rules from memory, still ⟦word-perfect||exacto, palabra por palabra⟧. One finished piece on the ⟦bench||banco de trabajo⟧ by the sixth hour. No piece, no ⟦pass||aprobado⟧.

"Nobody ever ⟦looked into||investigó⟧ why I failed," he said. "They just failed me."

"And after?"

He ⟦gave in||cedió⟧ and showed them his hands, and his tools, ⟦worn out||desgastadas⟧ and ⟦re-handled||con el mango cambiado⟧ twice. "You ⟦carry on||sigues adelante⟧. ⟦That's all there is||Eso es todo lo que hay⟧. You carry on."`,
        es: 'Sato recuerda de memoria las reglas del examen que reprobó y muestra las manos y las herramientas gastadas de toda una vida de seguir adelante.',
      },
      {
        texto: `"⟦Stop by||Pasen por aquí⟧ tomorrow," he said. "I close ⟦at dark||al anochecer⟧." Then, ⟦packing up||guardando sus cosas⟧, ⟦without weight||como si nada⟧: "A girl left a notebook on my bench once, that same week. Strange drawings. I ⟦kept||guardé⟧ it forty years, then gave it to an archive that collects ⟦old trades||oficios antiguos⟧."

Nia's mouth ⟦went dry||se secó⟧.

"Which archive?"

"They moved. Lagos, I think. Nigeria. They ⟦took everything||se lo llevaron todo⟧."`,
        es: 'Sato cuenta, como si nada, que guardó el cuaderno de una chica y lo donó a un archivo que ahora está en Lagos, Nigeria; a Nia se le seca la boca.',
      },
    ],
  },
  {
    n: 7,
    titulo: 'Lagos, Level Nine',
    subtitulo: 'Lagos, nivel nueve',
    imgApertura: '/libro/oc7-apertura.webp',
    imgDentro: ['/libro/oc7-1.webp', '/libro/oc7-2.webp', '/libro/oc7-3.webp'],
    altApertura:
      'Vista amplia de una ciudad futurista construida en capas sobre una laguna al atardecer, con pasarelas peatonales en varios niveles, botes cargados cruzando el agua y jardines en las terrazas.',
    altDentro: [
      'Un taller de reparación abierto a la calle en el futuro, con estantes de piezas recicladas ordenadas del piso al techo, tres personas trabajando en bancos distintos y una fila de clientes con aparatos rotos.',
      'Un hombre mayor detenido en medio de una pasarela elevada llena de gente que lo esquiva por los dos lados, agarrado del pasamanos, con la ciudad futurista de fondo.',
      'Una fila larga y ordenada de gente afuera de un edificio bajo de hormigón; una mujer reparte fichas numeradas en la puerta, luz cálida de la tarde.',
    ],
    phrasals: ['take in', 'get used to', 'keep up', 'sign up', 'turn into', 'speak up', 'line up', 'plug in', 'hand out', 'look out'],
    paginas: [
      {
        texto: `Two hundred and fifteen years forward, the machine ⟦set them down||los dejó⟧ on a ⟦walkway||pasarela⟧ nine levels above the water, and Nia ⟦stopped dead||se detuvo en seco⟧ and just stood there to ⟦take it in||asimilarlo todo⟧: a city built in ⟦layers||capas⟧ over a ⟦lagoon||laguna⟧, boats moving below, gardens on the roofs, and more people than she had ever seen at once, all of them ⟦going somewhere||yendo a alguna parte⟧.`,
        es: 'La máquina deja a Rooke y Nia en una pasarela sobre una laguna, en una ciudad futurista construida en capas; Nia se queda paralizada tratando de asimilarlo todo.',
      },
      {
        texto: `Nothing here was ⟦hostile||hostil⟧. Everything here was fast. Rooke could not ⟦keep up||seguirle el paso⟧ with the walking crowd and had to ⟦hold the rail||sujetarse de la baranda⟧, twice, and pretend he was admiring the view. It was the first time Nia had ever had to slow down for him.

"⟦Look out||Cuidado⟧ —" A cargo drone came over low enough to move his hair.

A boy at a stall ⟦plugged in||conectó⟧ a ⟦cracked||rajado⟧ panel and it ⟦woke up||se encendió⟧, and Nia understood something about this place before she could say it: nobody was selling anything new. The whole level was repair, and everybody on it had ⟦a trade||un oficio⟧.`,
        es: 'Cruzan un nivel donde todo se mueve rápido y nada se vende nuevo — un chico conecta un panel roto y Nia entiende que aquí todo el mundo vive de reparar cosas.',
      },
      {
        texto: `The old fish market had ⟦turned into||se convirtió en⟧ a ⟦repair floor||piso de reparación⟧: shelves of ⟦sorted parts||piezas clasificadas⟧ from the ground to the ceiling, three people working three different ⟦benches||bancos de trabajo⟧, a ⟦queue||cola⟧ of customers with broken things in their arms, waiting their turn.

"You'll ⟦get used to||acostumbrarte a⟧ the noise," a woman told Nia, ⟦not unkindly||sin maldad⟧. "Or you won't. Both are fine." And ⟦went back to work||volvió a trabajar⟧.`,
        es: 'El antiguo mercado de pescado ahora es un piso entero de reparaciones, y una mujer le dice a Nia que ya se acostumbrará al ruido.',
      },
      {
        texto: `You had to ⟦sign up||inscribirte⟧ to enter the archive, and then you had to ⟦line up||hacer fila⟧ like everyone else. A woman at the door ⟦handed out||repartió⟧ ⟦numbered tokens||fichas numeradas⟧ and told people how long they would wait.

"⟦Speak up||Habla más fuerte⟧, ⟦uncle||señor⟧," she said to Rooke. "I can't hear you."

They waited two hours. Nobody ⟦complained||se quejó⟧. It was clearly normal, and Nia found that she ⟦did not mind||no le molestó⟧.`,
        es: 'Para entrar al archivo hay que inscribirse y hacer fila como todos los demás; esperan dos horas sin quejarse, y a Nia no le molesta en absoluto.',
      },
      {
        texto: `⟦On the way out||Camino a la salida⟧ Nia stopped at a ⟦shelf||estante⟧ near the entrance, ⟦behind glass||detrás del vidrio⟧, ⟦unlabelled||sin etiqueta⟧: forty or fifty small mechanisms, all broken, ⟦all waiting||todos a la espera⟧.

"Everything here ⟦gets fixed||se arregla⟧," she said. "So why is there a whole shelf of things nobody can fix?"

Rooke looked at the shelf ⟦for a long time||por un buen rato⟧ and did not answer her.`,
        es: 'Camino a la salida, Nia ve un estante de mecanismos rotos que nadie puede arreglar y le pregunta a Rooke por qué, pero él no le responde.',
      },
    ],
  },
  {
    n: 8,
    titulo: 'My Own Handwriting',
    subtitulo: 'Mi propia letra',
    imgApertura: '/libro/oc8-apertura.webp',
    imgDentro: ['/libro/oc8-1.webp', '/libro/oc8-2.webp', '/libro/oc8-3.webp'],
    altApertura:
      'El interior de un archivo enorme: pasillos altísimos de cajas grises idénticas que se pierden en la oscuridad, con una sola franja de luz cayendo sobre una mesa de lectura vacía.',
    altDentro: [
      'Manos con guantes blancos de algodón abriendo con cuidado un cuaderno negro muy gastado sobre una bandeja de espuma, bajo una lámpara enfocada.',
      'Primer plano extremo de una página de cuaderno: dibujos técnicos a lápiz desvanecido de una ruedita dentada, con medidas anotadas rápido al margen.',
      'Una chica sentada en una mesa de archivo con una mano en la boca, mirando un cuaderno abierto; detrás, un hombre mayor ya se inclina midiendo el dibujo con los dedos.',
    ],
    phrasals: ['back up', 'come across', 'look through', 'make out', 'hold back', 'add up', 'piece together', 'sum up', 'rule out', 'set aside'],
    paginas: [
      {
        texto: `The archive was cold and ⟦badly lit||mal iluminado⟧ ⟦on purpose||a propósito⟧. ⟦Aisles||Pasillos⟧ of grey boxes going up ⟦further than the light reached||más allá de donde llegaba la luz⟧, and one long table where you were allowed to open ⟦one box at a time||una caja a la vez⟧, with ⟦cotton gloves||guantes de algodón⟧, while somebody watched you do it. Everything in the building had been ⟦backed up||respaldado⟧ twice, the archivist said, and once on paper, because paper is the only copy that ⟦survives being forgotten||sobrevive al olvido⟧.`,
        es: 'Rooke y Nia entran a un archivo frío y muy controlado, donde todo se guarda por partida doble, incluso en papel.',
      },
      {
        texto: `They asked for everything donated by a ⟦tinsmith||hojalatero⟧ from Marrakesh, and ⟦came across||se encontraron con⟧ it in the third box, under a ⟦tin cup||taza de hojalata⟧ and a folded apron: a black notebook, two hundred and fifty years old, the cover ⟦gone soft as cloth||ablandada como la tela⟧. Somebody had written a catalogue number on it in white ink.

Nia ⟦looked through||hojeó⟧ it with the gloves on, ⟦one page at a time||página por página⟧, and could barely ⟦make out||descifrar⟧ the pencil.

It was her ⟦handwriting||letra⟧. Not similar. Hers. The measurements she had taken from Kenji's bench, ⟦in her own hand||de su puño y letra⟧, catalogued and numbered by ⟦strangers||desconocidos⟧.`,
        es: 'Entre los objetos del hojalatero de Marrakech, Nia se encuentra con su propio cuaderno de hace 250 años y reconoce su letra en las medidas que ella misma tomó.',
      },
      {
        texto: `She ⟦held back||se contuvo⟧ in front of the archivist, ⟦which took everything she had||lo cual le costó todo lo que tenía⟧, and put both ⟦gloved hands flat on the table||las manos enguantadas bien planas sobre la mesa⟧ ⟦until it passed||hasta que se le pasó⟧.

"Now it ⟦adds up||cuadra⟧," Rooke said, ⟦very quietly||en voz muy baja⟧, beside her. "He kept it. Of course he kept it. It was ⟦the only thing he had left||lo único que le quedaba⟧ from the week he lost."`,
        es: 'Nia se contiene frente a la archivista, y Rooke entiende por qué Kenji guardó el cuaderno: era lo único que le quedaba de la semana que perdió.',
      },
      {
        texto: `Between them they ⟦pieced together||reconstruyeron⟧ what had actually broken. Not history. A line of teaching: Kenji had never become a ⟦master||maestro⟧, so he never taught, so nobody ⟦carried the method forward||transmitió el método⟧, so the ⟦shelf||estante⟧ by the door was full.

"⟦Sum it up||Resúmelo⟧ for me ⟦in one line||en una frase⟧," said Nia.

"We stole a man's future and ⟦spent it on||lo gastamos en⟧ a ⟦gear||engranaje⟧."`,
        es: 'Juntos reconstruyen qué se rompió de verdad: sin línea de enseñanza, Kenji nunca llegó a maestro, y ellos le robaron el futuro por un engranaje.',
      },
      {
        texto: `They ⟦ruled out||descartaron⟧ going back to Kyoto ⟦empty-handed||con las manos vacías⟧; ⟦you cannot un-take a thing||no se puede deshacer lo ya tomado⟧.

"We give him a better one," Rooke said. "⟦One good part||Una pieza buena⟧, on that ⟦bench||banco⟧, before the examiner walks in. The measurements are here. We only need a machine that can cut them."

The archivist ⟦set the box aside||apartó la caja⟧ for them and ⟦asked no questions at all||no preguntó absolutamente nada⟧.`,
        es: 'Descartan volver a Kyoto con las manos vacías; deciden fabricarle a Kenji una pieza mejor y dejarla en su banco antes del examen, y la archivista les entrega la caja sin hacer preguntas.',
      },
    ],
  },
  {
    n: 9,
    titulo: 'One Good Part',
    subtitulo: 'Una pieza buena',
    imgApertura: '/libro/oc9-apertura.webp',
    imgDentro: ['/libro/oc9-1.webp', '/libro/oc9-2.webp', '/libro/oc9-3.webp'],
    altApertura:
      'El piso de un pequeño taller de repuestos de automóviles en Detroit al final de un turno de 1957: una fila de tornos pesados, virutas de metal en el concreto y un ventanal industrial polvoriento con luz de tarde entrando en diagonal.',
    altDentro: [
      'Un joven de veinticuatro años con overol y gorra de tela apoyado en un torno, hablando; un hombre mayor de pelo blanco lo escucha con una expresión que apenas puede contener.',
      'Primer plano extremo de manos jóvenes ajustando una pieza diminuta de latón en el mandril de un torno, con virutas brillantes saliendo del corte.',
      'Un banco de trabajo japonés vacío en la vieja Kioto, con un paño de lino abierto y una pieza de latón nueva en el centro; la sombra de alguien acercándose se proyecta desde un corredor.',
    ],
    phrasals: ['show around', 'try out', 'start over', 'mess up', 'straighten out', 'cut off', 'count on', 'pull off', 'put down', 'get away'],
    paginas: [
      {
        texto: `There was ⟦exactly||justo⟧ one moment in history when that ⟦gear||engranaje⟧ had been ⟦cut by machine||cortado a máquina⟧, and it was a ⟦parts shop||tienda de repuestos⟧ on Michigan Avenue in the winter of 1957. Rooke knew the address ⟦without checking||sin comprobarla⟧. He had ⟦swept||barrió⟧ that floor when he was eleven years old, and again at fourteen, and again ⟦every summer after that||todos los veranos siguientes⟧.`,
        es: 'Rooke identifica de memoria el taller de Detroit de 1957, el único momento de la historia en que esa pieza se fabricaba a máquina.',
      },
      {
        texto: `The owner was twenty-four years old, in ⟦overalls||overol⟧ and a ⟦cloth cap||gorra de tela⟧, and his name was Walt Rooke. Halden had to ⟦look at the floor||bajar la mirada⟧ for a moment before he could speak at all.

He could not say ⟦a single true word||una sola palabra verdadera⟧ to him. He asked for the loan of a ⟦lathe||torno⟧ like any other customer and paid for the hour ⟦in cash||en efectivo⟧.

Walt ⟦showed them around||les hizo un recorrido⟧ the floor anyway, because he showed everyone around, and told Nia to ⟦try out||probar⟧ the small lathe first. "She ⟦pulls left||tira hacia la izquierda⟧. Everybody learns that ⟦the hard way||por las malas⟧. Now you don't have to," he said.`,
        es: 'Walt, sin saber quién tiene enfrente, les presta el torno y deja que Nia lo pruebe primero.',
      },
      {
        texto: `The first cut was wrong and they ⟦started over||empezaron de nuevo⟧. The second was worse.

"I ⟦messed it up||la eché a perder⟧," Nia said.

"So did I. Twice. Go again."

On the third she ⟦straightened out||enderezó⟧ the ⟦mounting||montaje⟧ with her hands instead of the tool, the way nobody teaches you, and the ⟦swarf||viruta⟧ ⟦came off||salió⟧ the cut in one long bright ⟦ribbon||cinta⟧. Her hands were ⟦steadier||más firmes⟧ than his had been at her age.`,
        es: 'Nia arruina los dos primeros cortes, pero al tercero encuentra el pulso justo y hace la pieza mejor de lo que Rooke hacía a su edad.',
      },
      {
        texto: `The power was ⟦cut off||se cortaba⟧ at six, the way it was every night on that ⟦block||cuadra⟧, and they finished ⟦by lamp||a la luz de una lámpara⟧.

"Can I ⟦count on you||contar contigo⟧ to ⟦hold it steady||sostenerla firme⟧?" Rooke said, and she did.

They ⟦pulled it off||lo lograron⟧. Walt ⟦turned the piece over||volteó la pieza⟧ twice under the light and said, "That'll ⟦outlive you||te sobrevivirá⟧" — a sentence Halden had first heard at ten years old.`,
        es: 'Les cortan la luz a las seis y terminan a lámpara; entre los dos logran la pieza, y Walt la aprueba con una frase que Halden ya conocía de niño.',
      },
      {
        texto: `Kyoto, 1889, nine minutes past nine in the morning. The workshop was empty. The ⟦cloth||paño⟧ was open.

Rooke ⟦put the piece down||dejó la pieza⟧ in the middle of it and ⟦squared it||la alineó⟧ with one finger.

Footsteps in the corridor, ⟦unhurried||sin prisa⟧, ⟦official||con aire de autoridad⟧.

"Now," said Nia, and they ⟦got away||escaparon⟧ through the back before the door ⟦slid open||se abrió deslizándose⟧ behind them.`,
        es: 'En el Kioto de 1889 dejan la pieza en el banco vacío y escapan por atrás justo cuando se oyen pasos acercándose.',
      },
    ],
  },
  {
    n: 10,
    titulo: 'Back on Time',
    subtitulo: 'De vuelta a tiempo',
    imgApertura: '/libro/oc10-apertura.webp',
    imgDentro: ['/libro/oc10-1.webp', '/libro/oc10-2.webp', '/libro/oc10-3.webp'],
    altApertura:
      'El mismo taller de reparaciones, todavía con agua en el piso reflejando el techo, pero ahora con la puerta abierta de par en par y luz cálida de la mañana entrando desde la calle; las herramientas de vuelta en su lugar.',
    altDentro: [
      'Una pequeña caja de madera lacada japonesa abierta sobre un estante alto, con un cuaderno negro muy viejo adentro y una carta doblada y amarillenta encima.',
      'Una chica sentada en el piso mojado del taller con audífonos puestos, los ojos cerrados, un radiocasete portátil viejo apoyado en las rodillas, luz de mañana desde la puerta.',
      'Un hombre mayor visto de espaldas guardando herramientas en un cajón una por una; en la puerta abierta del taller, una chica mide la pared con una cinta métrica donde va el cartel nuevo, en blanco.',
    ],
    phrasals: ['turn up', 'settle down', 'bring back', 'get over', 'wrap up', 'catch up', 'put away', 'take over', 'pass on', 'take up'],
    paginas: [
      {
        texto: `Same street. The workshop was there, door ⟦propped open||sostenida abierta⟧, and the whole place ⟦smelled of||olía a⟧ oil and ⟦wet wood||madera mojada⟧.

⟦So did the water||Y también el agua⟧. They had arrived twelve hours after ⟦the pipe||la tubería⟧, not before it, because they never ⟦could have arrived||habrían podido llegar⟧ before it. That part they did not fix, and ⟦were never going to be able to||nunca iban a poder⟧.`,
        es: 'Rooke y Nia llegan al taller doce horas después de que reventó la tubería, no antes: ese es el precio que nunca van a poder cambiar.',
      },
      {
        texto: `The box ⟦turned up||apareció⟧ on the top shelf, where it had always been: a small wooden box from Japan that Rooke had never opened because it was his teacher's and not his. Forty years he had ⟦dusted around||sacudía el polvo alrededor⟧ it.

Inside was her notebook, a hundred and thirty-seven years old, and a letter ⟦dated||fechada⟧ 1904, signed Sato Kenji, master, ⟦addressed to||dirigida a⟧ the girl who left this on my ⟦bench||banco de trabajo⟧.

⟦He had passed||Había fallecido⟧. He had taught. And that ⟦line of teaching||linaje de enseñanza⟧, ⟦unbroken||ininterrumpido⟧, is what put Halden Rooke in this room. Outside, the street ⟦settled down||se calmó⟧ as the last of the trucks left.`,
        es: 'Rooke abre por fin la caja de su maestro y encuentra el cuaderno de Nia junto a una carta de 1904 que confirma que el oficio pasó de maestro a alumno sin romperse jamás.',
      },
      {
        texto: `Of the three tapes, two were ⟦gone for good||perdidas para siempre⟧. The third ⟦dried out||se secó⟧ and played, and for thirty seconds Nia's mother said something ⟦ordinary||cotidiano⟧ about dinner in a kitchen that no longer exists, and it ⟦brought back||trajo de vuelta⟧ all of it ⟦at once||de golpe⟧, the whole kitchen.

"You don't ⟦get over||superas⟧ it," Rooke said from the doorway. "You ⟦get better at||mejoras en⟧ ⟦carrying it||cargarlo⟧."`,
        es: 'De los tres casetes sobrevive uno solo, y basta para devolverle a Nia, de golpe, la cocina entera de su infancia; Rooke le dice que el duelo no se supera, se aprende a cargar.',
      },
      {
        texto: `They ⟦wrapped up||terminaron⟧ the cleaning at ⟦two in the morning||las dos de la madrugada⟧. Nia had three weeks of school to ⟦catch up on||ponerse al día con⟧ and ⟦did not care||no le importaba⟧.

Rooke ⟦put away||guardaba⟧ his tools ⟦one at a time||uno por uno⟧, slowly, in the order he had kept them for forty years, and did not take ⟦a single one||ni uno solo⟧ of them out again that night.`,
        es: 'Terminan de limpiar a las dos de la madrugada; a Nia no le importa la escuela atrasada, y Rooke guarda sus herramientas una por una sin volver a tocarlas esa noche.',
      },
      {
        texto: `"You'll ⟦take over||te harás cargo de⟧ the shop," he said. "I've decided. Kenji ⟦passed on||transmitió⟧ what he knew and ⟦it reached me||me llegó⟧, so I'm passing it on, and that's the whole of the ⟦trade||oficio⟧. ⟦Take it up||Dedícate a esto⟧ ⟦properly||como se debe⟧. Not just Saturdays."

She was already outside, measuring the doorway for the new ⟦sign||letrero⟧.

"It doesn't say Rooke anymore."

"No. It says Rooke and Serrano. ⟦Get in here||Ven para acá⟧ and hold this."`,
        es: 'Rooke le entrega el taller a Nia — lo que Kenji le transmitió a él, ahora ella lo recibe — y el nuevo letrero en la puerta va a decir Rooke and Serrano.',
      },
    ],
  },
];

/** Los phrasal verbs DISTINTOS que enseña el libro. Es el número del cierre
    ("N phrasal verbs en M capítulos"), así que va sin repetir: sumar las tiras
    de los diez capítulos daría un número inflado. */
export const PHRASALS_TOTAL = Array.from(
  new Set(CAPITULOS.flatMap((c) => c.phrasals.map((p) => p.toLowerCase()))),
);
