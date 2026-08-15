/* TRAMO 3 — SALÉS DEL PAÍS

   El tramo que hoy no existe y es el que hace que alguien pague. Motivo simple:
   la oficina se aprende en tres meses; el aeropuerto es el martes.

   Ocho paradas cubiertas punta a punta — del check-in a la maleta perdida. No
   es un curso de "inglés para viajeros": es la secuencia REAL de un viaje, en
   el orden en que pasa. Por eso el orden de las paradas no se reordena por
   dificultad: se reordena por reloj.

   Dos decisiones de contenido que valen explicar:

   1. MIGRACIÓN VA DE SEGUNDA, no de última. Es el momento de más miedo del
      viaje entero (un uniformado, una pregunta, y la sensación de que si
      contestás mal te devuelven). Ponerlo al final "cuando ya esté listo" es
      dejarlo sin lo único que de verdad necesita.

   2. LAS RESPUESTAS SON DE UNA O DOS PALABRAS. En migración nadie quiere tu
      párrafo: quiere la categoría. "Business." es una respuesta completa,
      correcta y suficiente. Enseñar "I am here because I will attend a
      conference" es enseñar a fallar bajo presión.

   Este tramo tiene ATAJO: se puede abrir apenas se cierra el Tramo 0, sin pasar
   por la oficina. Quien vuela el martes no va a hacer cuarenta nodos de
   pasillo primero — cierra la app y no vuelve. */

import { fr } from './armar';
import type { A1UnitRuta } from './tipos-ruta';

export const T3_UNIDADES: A1UnitRuta[] = [
  /* ═══════════════ PARADA 1 · El aeropuerto ═══════════════ */
  {
    id: 't3-aeropuerto',
    tramo: 't3',
    order: 1,
    title_es: 'El aeropuerto',
    subtitle_es: 'Del mostrador a la puerta.',
    arc_es: 'Entras con el pasaporte sudado. Sales sabiendo qué te van a preguntar.',
    emoji: '✈️',
    cardTheme: 'blue',
    icon: '🛫',
    survival: false,
    companionSetup_es: [
      'El aeropuerto asusta porque todo pasa rápido y hay fila detrás de ti. Pero te van a hacer siempre las MISMAS preguntas.',
      'Son como ocho. Te las sé de memoria. Vamos.',
    ],
    scenes: [
      {
        id: 't3-s1-checkin',
        order: 1,
        title_es: 'El mostrador',
        scene_es: 'Entregas pasaporte y maleta. Cuatro frases y ya.',
        icon: '🧳',
        setup_es: [
          'En el mostrador solo pasan tres cosas: te piden el pasaporte, te preguntan por las maletas y te preguntan dónde quieres sentarte.',
          'Con cuatro frases lo cierras sin sudar.',
        ],
        analogy_es: 'Es un formulario hablado: siempre las mismas casillas, siempre en el mismo orden.',
        chunks: [
          fr({ id: 'c-t3-flight-to', en: "I have a flight to Miami.", es: 'Tengo un vuelo a Miami.', s: 'ái jav a fláit tu Maiámi', why: 'Con esta abres. No hace falta decir hora ni aerolínea: ellos lo ven en el pasaporte.', when: 'Llegando al mostrador.', frame: 'I have a flight to ___.', swaps: ['Miami', 'Madrid', 'Panama'], d: ['I have a fly to Miami.', 'I am flight to Miami.'] }),
          fr({ id: 'c-t3-heres-passport', en: "Here's my passport.", es: 'Aquí está mi pasaporte.', s: 'jíars mai pásport', why: '"Here\'s…" es "aquí está / toma". Sirve pa\' entregar cualquier cosa: el pasaporte, el pasaje, la tarjeta.', when: 'Entregando documentos.', sos: true, frame: "Here's my ___.", swaps: ['passport', 'ticket', 'ID'], d: ['Here is passport.', 'Take my passport.'] }),
          fr({ id: 'c-t3-aisle-please', en: 'Aisle, please.', es: 'Pasillo, por favor.', s: 'áil, plíis', why: 'Ojo con "aisle": la S no suena. Se dice "áil". Te van a preguntar "window or aisle?" (ventana o pasillo).', when: 'Cuando te preguntan dónde quieres sentarte.', d: ['Window, please.', 'Isle, please.'] }),
          fr({ id: 'c-t3-just-this-bag', en: 'Just this one bag.', es: 'Solo esta maleta.', s: 'llast dis uán bag', why: '"Just" es "solamente" y suaviza todo. Te van a preguntar "how many bags?" — acuérdate: bags son contables, entonces es MANY, no much.', when: 'Cuando preguntan cuántas maletas.', d: ['Only one bags.', 'Just this one bags.'] }),
        ],
      },
      {
        id: 't3-s2-seguridad',
        order: 2,
        title_es: 'Seguridad',
        scene_es: 'Te gritan instrucciones y hay fila. Con entender cuatro basta.',
        icon: '🛂',
        setup_es: [
          'Aquí casi no tienes que hablar: tienes que ENTENDER. Te van a decir tres cosas a gritos.',
          'Y si no entiendes, una pregunta corta te salva de atrasar la fila.',
        ],
        analogy_es: 'Es como la entrada de un concierto: nadie conversa, todos repiten las mismas tres órdenes.',
        chunks: [
          fr({ id: 'c-t3-laptop-out', en: 'Laptop out?', es: '¿Saco el computador?', s: 'láptop áut', why: 'Dos palabras y ya preguntaste. En seguridad nadie habla en frases completas, ni ellos ni tú.', when: 'Antes de poner las cosas en la bandeja.', d: ['Laptop off?', 'Take laptop?'] }),
          fr({ id: 'c-t3-shoes-off', en: 'Shoes off too?', es: '¿También los zapatos?', s: 'shúus of tú', why: 'En Estados Unidos a veces sí, a veces no. Preguntar te evita el regaño y la fila atascada.', when: 'En el punto de control.', d: ['Shoes out too?', 'Off shoes?'] }),
          fr({ id: 'c-t3-nothing-to-declare', en: 'Nothing to declare.', es: 'Nada que declarar.', s: 'názin tu diclér', why: '"Declare" es cognado — declarar. Esta frase es la respuesta estándar en aduana y casi siempre cierra el tema.', when: 'Aduana, con la maleta.', d: ['Nothing declare.', 'No declare nothing.'] }),
          fr({ id: 'c-t3-just-personal', en: "It's just personal stuff.", es: 'Son solo cosas personales.', s: 'its llast pérsonal staf', why: '"Stuff" es "cosas" en montón, sin especificar. Palabra comodín utilísima cuando no sabes cómo se llama algo.', when: 'Si te abren la maleta.', d: ["It's just personal things of me.", "It's only personal stuffs."] }),
        ],
      },
      {
        id: 't3-s3-puerta',
        order: 3,
        title_es: 'La puerta',
        scene_es: 'Encontrar la puerta y saber si el vuelo va a tiempo.',
        icon: '🚪',
        setup_es: [
          'Ya pasaste seguridad. Ahora hay que encontrar la puerta y confirmar que no cambió.',
          'Las puertas CAMBIAN. Preguntar dos veces es lo normal, no es de perdido.',
        ],
        analogy_es: 'La puerta es el andén del bus: el número que te dieron al comprar no siempre es el de la salida.',
        chunks: [
          fr({ id: 'c-t3-where-gate', en: 'Where is gate twelve?', es: '¿Dónde queda la puerta doce?', s: 'uér is guéit tuélv', why: 'Es el molde "Where is the ___?" del Tramo 0 con una palabra nueva. Ya sabías preguntar; solo faltaba "gate".', when: 'Buscando la puerta.', frame: 'Where is gate ___?', swaps: ['twelve', 'B four', 'nine'], d: ['Where gate twelve?', 'Where is door twelve?'] }),
          fr({ id: 'c-t3-is-this-gate', en: 'Is this the gate for Miami?', es: '¿Esta es la puerta para Miami?', s: 'is dis de guéit for Maiámi', why: 'Confirmar antes de sentarte media hora. "Is this the ___ for ___?" sirve pa\' buses, trenes y filas también.', when: 'Al llegar a la puerta.', frame: 'Is this the gate for ___?', swaps: ['Miami', 'Bogotá', 'the 3pm flight'], d: ['This is gate for Miami?', 'Is this gate of Miami?'] }),
          fr({ id: 'c-t3-on-time', en: 'Is the flight on time?', es: '¿El vuelo sale a tiempo?', s: 'is de fláit on táim', why: '"On time" = a la hora. Lo contrario es "delayed" (diléid), retrasado — la palabra que más vas a oír en un aeropuerto.', when: 'Cuando el tablero no dice nada.', d: ['Is the flight in time?', 'The flight is on hour?'] }),
          fr({ id: 'c-t3-group-two', en: "I'm in group two.", es: 'Voy en el grupo dos.', s: 'áim in grup tú', why: 'Abordan por grupos y lo gritan. Si te formas en el grupo que no es, te devuelven — pasa todos los días.', when: 'Abordando.', frame: "I'm in group ___.", swaps: ['two', 'five', 'A'], d: ['I am group two.', "I'm on group two."] }),
        ],
      },
    ],
    task: {
      id: 't3-aeropuerto-task',
      intro_es: 'Llegaste al aeropuerto con el tiempo justo. Vamos…',
      steps: [
        { goal_es: 'Te toca el mostrador. Entrega el pasaporte.', answerChunkId: 'c-t3-heres-passport', reaction_es: 'Listo, ya arrancó el trámite.' },
        { goal_es: 'Te preguntan "window or aisle?". Tú quieres poder pararte al baño.', answerChunkId: 'c-t3-aisle-please', reaction_es: 'Áil, sin la S. Bien.' },
        { goal_es: 'En seguridad no sabes si sacar el computador. Pregunta corto.', answerChunkId: 'c-t3-laptop-out', reaction_es: 'Dos palabras y no atrasaste la fila.' },
        { goal_es: 'Llegaste a una puerta y quieres confirmar que es la tuya.', answerChunkId: 'c-t3-is-this-gate', reaction_es: 'Pasaste el aeropuerto sin decir "sorry, I don\'t speak English" ni una vez.' },
      ],
      done_es: 'Ya sabes EL AEROPUERTO. ✓',
    },
    coach: {
      escenario_es: 'Estás en el mostrador de la aerolínea.',
      meta_es: 'Que hagas el check-in completo: documento, maleta y asiento.',
      abridor_en: 'Good morning! Where are you flying today?',
      abridor_es: '¡Buenos días! ¿Pa\' dónde viaja hoy?',
      chunkIds: ['c-t3-flight-to', 'c-t3-heres-passport', 'c-t3-aisle-please', 'c-t3-just-this-bag', 'c-t3-on-time', 'w-please', 'w-thankyou'],
      topeCorrecciones: 2,
    },
  },

  /* ═══════════════ PARADA 2 · Te para migración ═══════════════ */
  {
    id: 't3-migracion',
    tramo: 't3',
    order: 2,
    title_es: 'Te para migración',
    subtitle_es: 'Cuatro preguntas. Siempre las mismas cuatro.',
    arc_es: 'El momento que más miedo da del viaje. Y el más predecible de todos.',
    emoji: '🛂',
    cardTheme: 'peach',
    icon: '🛂',
    survival: true,
    companionSetup_es: [
      'Aquí va la parada más importante del tramo. Migración asusta porque hay un uniformado y sientes que si contestas mal te devuelven.',
      'La verdad: te van a hacer CUATRO preguntas, siempre las mismas, y las respuestas son de dos palabras. Ni una frase larga. Menos es mejor.',
    ],
    scenes: [
      {
        id: 't3-s4-las-cuatro',
        order: 1,
        title_es: 'Las cuatro preguntas',
        scene_es: 'A qué vienes, cuánto te quedas, dónde duermes, cuándo te vas.',
        icon: '❓',
        setup_es: [
          'Estas cuatro se las hacen a todo el mundo, en todos los países, en este orden.',
          'Regla de oro: contesta corto y con calma. Una respuesta larga suena a que estás explicando de más, y eso sí genera preguntas.',
        ],
        analogy_es:
          'Es como el portero de un edificio: no le cuentas tu vida, le dices a qué apartamento vas. Entre más corto, más rápido te abre.',
        chunks: [
          /* Estas dos tenían `frame: '___.'`, que no es un molde: es la
             respuesta entera dentro del hueco. En caja 2 el motor manda `cloze`
             y la tarjeta parte el frame en ['', '.'], o sea muestra "•••." y no
             pregunta nada. Con `frame: null` el motor cae solo a `mcq`
             (stores/a1.ts, rungDe) — que para una respuesta de una palabra es
             el ejercicio correcto.

             Las respuestas NO se alargan: "Business." y "Two weeks." son
             completas, correctas y suficientes. Eso es justo lo que enseña la
             parada. Los `swaps` se quedan documentando las otras respuestas
             válidas, aunque hoy la vista solo los pinte cuando hay molde. */
          fr({ id: 'c-t3-purpose-business', en: 'Business.', es: 'Negocios.', s: 'bísnes', why: 'UNA palabra y es respuesta completa. Te preguntan "What\'s the purpose of your trip?" y contestas "Business." o "Tourism." Punto. No hace falta más.', when: 'Primera pregunta, siempre.', sos: true, frame: null, swaps: ['Business', 'Tourism', 'Vacation'], d: ['I go to business.', 'For to work.'] }),
          fr({ id: 'c-t3-two-weeks', en: 'Two weeks.', es: 'Dos semanas.', s: 'tú uíks', why: 'Otra vez dos palabras. La pregunta es "How long are you staying?" — que ya viste en el Tramo 0 con "How long?". Sirve igual "Ten days" o "One month".', when: 'Segunda pregunta.', sos: true, frame: null, swaps: ['Two weeks', 'Ten days', 'One month'], d: ['For two weeks I stay.', 'Two week.'] }),
          fr({ id: 'c-t3-staying-at', en: "At the Marriott downtown.", es: 'En el Marriott del centro.', s: 'at de Mérriot dáuntaun', why: '"Downtown" es el centro de la ciudad — palabra que vas a usar todo el viaje. Y "at" es la preposición pa\' lugares puntuales.', when: 'Tercera pregunta: dónde te quedas.', sos: true, frame: 'At the ___.', swaps: ['Marriott downtown', 'Hilton', "my friend's house"], d: ['In the Marriott downtown.', 'At Marriott of downtown.'] }),
          fr({ id: 'c-t3-return-ticket', en: "Yes, here's my return ticket.", es: 'Sí, aquí está mi pasaje de vuelta.', s: 'iés, jíars mai ritérn tíket', why: 'Reusa "Here\'s my ___" del mostrador. Tenlo abierto en el celular ANTES de la fila: buscarlo con el oficial mirando es lo que pone nervioso.', when: 'Si preguntan por el regreso.', sos: true, d: ["Yes, I have return.", "Yes, here is my ticket of return."] }),
        ],
      },
      {
        id: 't3-s5-cuando-insisten',
        order: 2,
        title_es: 'Cuando preguntan más',
        scene_es: 'A veces siguen. No es que sospechen: es su trabajo.',
        icon: '🧐',
        setup_es: [
          'A veces el oficial hace una o dos preguntas más. Eso NO significa que algo esté mal — les toca hacerlo por muestreo.',
          'Cuatro respuestas más y quedaste cubierto pa\' cualquier caso.',
        ],
        analogy_es: 'Es la segunda vuelta del mismo formulario. Mismas casillas, letra más chiquita.',
        chunks: [
          fr({ id: 'c-t3-conference', en: "I'm here for a conference.", es: 'Vengo a una conferencia.', s: 'áim jíar for a cónferens', why: '"Conference" es cognado. Y "I\'m here for…" es el molde pa\' explicar cualquier motivo sin enredarte.', when: 'Si piden detalle del "business".', frame: "I'm here for ___.", swaps: ['a conference', 'a meeting', 'training'], d: ['I am here for to conference.', "I'm here of a conference."] }),
          fr({ id: 'c-t3-company-paying', en: 'My company is paying.', es: 'Mi empresa paga.', s: 'mai cómpani is péiin', why: 'La respuesta a "who\'s paying for the trip?". "Company" es cognado y esta frase cierra el tema de una.', when: 'Viaje de trabajo.', d: ['My company pay.', 'My company is pay.'] }),
          fr({ id: 'c-t3-first-time', en: "It's my first time here.", es: 'Es mi primera vez acá.', s: 'its mai férst táim jíar', why: 'Reusa el "It\'s…" del Tramo 0. Y ayuda: al oficial le explica por qué te ve dudando, y eso baja la tensión.', when: 'Si notas que te miran raro.', d: ['Is my first time here.', "It's my first travel here."] }),
          fr({ id: 'c-t3-just-me', en: 'No, just me.', es: 'No, solo yo.', s: 'nóu, llast mi', why: 'Respuesta a "are you traveling with anyone?". Tres palabras. "Just" otra vez haciendo el trabajo de "solamente".', when: 'Si preguntan con quién viajas.', d: ['No, only I.', 'No, alone me.'] }),
        ],
      },
    ],
    task: {
      id: 't3-migracion-task',
      intro_es: 'Fila de migración. Te llaman con la mano. Respira — son cuatro preguntas…',
      steps: [
        { goal_es: '"What\'s the purpose of your trip?" Vienes por trabajo.', answerChunkId: 'c-t3-purpose-business', reaction_es: 'Una palabra. Perfecta. No hacía falta nada más.' },
        { goal_es: '"How long are you staying?" Dos semanas.', answerChunkId: 'c-t3-two-weeks', reaction_es: 'Corto y con calma. Así se hace.' },
        { goal_es: '"Where are you staying?" En el Marriott del centro.', answerChunkId: 'c-t3-staying-at', reaction_es: 'Bien. Y ya sabes qué es "downtown".' },
        { goal_es: '"Do you have a return ticket?" Muéstralo.', answerChunkId: 'c-t3-return-ticket', reaction_es: 'Pasaste migración. Y no era pa\' tanto, ¿cierto?' },
      ],
      done_es: 'Ya pasas MIGRACIÓN sin sudar. ✓',
    },
    coach: {
      escenario_es: 'Estás frente al oficial de migración. Viaje de trabajo, dos semanas.',
      meta_es: 'Que respondas las cuatro preguntas corto y tranquilo.',
      abridor_en: 'Passport, please. What\'s the purpose of your trip?',
      abridor_es: 'Pasaporte, por favor. ¿Cuál es el motivo de su viaje?',
      chunkIds: ['c-t3-purpose-business', 'c-t3-two-weeks', 'c-t3-staying-at', 'c-t3-return-ticket', 'c-t3-conference', 'c-t3-company-paying', 'c-t3-just-me', 'c-t3-heres-passport'],
      topeCorrecciones: 1,
    },
  },

  /* ═══════════════ PARADA 3 · En el avión ═══════════════ */
  {
    id: 't3-avion',
    tramo: 't3',
    order: 3,
    title_es: 'En el avión',
    subtitle_es: 'Doce horas sin poder pedir agua, no.',
    arc_es: 'Dejas de aguantar sed por no saber pedir.',
    emoji: '💺',
    cardTheme: 'lavender',
    icon: '💺',
    survival: false,
    companionSetup_es: [
      'Cuatro frases. Es todo lo que se habla en un avión.',
      'Pero si no las tienes, te pasas el vuelo con sed y con la vejiga llena. Lo digo por experiencia.',
    ],
    scenes: [
      {
        id: 't3-s6-a-bordo',
        order: 1,
        title_es: 'Las cuatro del vuelo',
        scene_es: 'Asiento, agua, comida y salir al pasillo.',
        icon: '🥤',
        setup_es: ['Las cuatro cosas que pasan en un avión, en orden.', 'Cortitas todas, porque se dicen con ruido de motor encima.'],
        analogy_es: 'Un avión es un bus con menos espacio: mismas cuatro interacciones, más incómodas.',
        chunks: [
          fr({ id: 'c-t3-my-seat', en: "Excuse me, that's my seat.", es: 'Perdón, ese es mi puesto.', s: 'ekskiús mi, dats mai síit', why: 'Arranca con "Excuse me" (el de ANTES, del Tramo 0) y ya no suena a reclamo. Pasa todo el tiempo y se resuelve sin roce.', when: 'Alguien sentado en tu puesto.', sos: true, d: ["Sorry, that's my seat.", "Excuse me, this is my chair."] }),
          fr({ id: 'c-t3-some-water', en: 'Can I get some water?', es: '¿Me trae agua?', s: 'kan ái guet sam uóter', why: '"Can I get…?" es EL molde pa\' pedir cualquier cosa en inglés: agua, café, la cuenta, una bolsa. Guárdalo bien.', when: 'Cuando pasa la azafata.', sos: true, frame: 'Can I get some ___?', swaps: ['water', 'coffee', 'ice'], d: ['Can I have water?', 'Give me water?'] }),
          fr({ id: 'c-t3-chicken-please', en: 'Chicken, please.', es: 'Pollo, por favor.', s: 'chíken, plíis', why: 'Te van a decir "chicken or pasta?" y con una palabra más "please" ya está. La respuesta más corta posible sigue siendo educada.', when: 'Cuando reparten comida.', frame: '___, please.', swaps: ['Chicken', 'Pasta', 'Just water'], d: ['I want chicken.', 'Chicken for me.'] }),
          fr({ id: 'c-t3-can-i-pass', en: 'Can I pass?', es: '¿Me deja pasar?', s: 'kan ái pás', why: 'Tres palabras pa\' salir al pasillo cuando el de al lado está dormido. Con una sonrisa alcanza.', when: 'Saliendo del puesto.', d: ['Can I go?', 'I pass?'] }),
        ],
      },
    ],
    task: {
      id: 't3-avion-task',
      intro_es: 'Subiste. Fila 24. Y hay alguien en tu puesto…',
      steps: [
        { goal_es: 'Hay una señora sentada en tu asiento. Dilo sin sonar agresivo.', answerChunkId: 'c-t3-my-seat', reaction_es: 'Con "excuse me" adelante, nadie se molesta.' },
        { goal_es: 'Pasa la azafata y tienes sed.', answerChunkId: 'c-t3-some-water', reaction_es: '"Can I get…" — guarda ese molde, lo vas a usar todo el viaje.' },
        { goal_es: '"Chicken or pasta?" Elige.', answerChunkId: 'c-t3-chicken-please', reaction_es: 'Dos palabras. Suficiente.' },
      ],
      done_es: 'Ya sobrevives EL VUELO. ✓',
    },
    coach: {
      escenario_es: 'Vas en el avión y pasa la tripulación.',
      meta_es: 'Que pidas algo de tomar y elijas comida.',
      abridor_en: 'Something to drink?',
      abridor_es: '¿Algo de tomar?',
      chunkIds: ['c-t3-some-water', 'c-t3-chicken-please', 'c-t3-can-i-pass', 'c-t3-my-seat', 'w-thankyou', 'w-please'],
      topeCorrecciones: 1,
    },
  },

  /* ═══════════════ PARADA 4 · Llegar y moverte ═══════════════ */
  {
    id: 't3-moverte',
    tramo: 't3',
    order: 4,
    title_es: 'Llegar y moverte',
    subtitle_es: 'Taxi, metro y cuando te pierdes.',
    arc_es: 'Sales del aeropuerto y la ciudad deja de ser un laberinto.',
    emoji: '🚕',
    cardTheme: 'yellow',
    icon: '🚕',
    survival: true,
    companionSetup_es: [
      'Ya estás afuera. Ahora hay que llegar al hotel sin que te den la vuelta larga.',
      'Ocho frases: cuatro pa\' el taxi, cuatro pa\' cuando andas solo.',
    ],
    scenes: [
      {
        id: 't3-s7-taxi',
        order: 1,
        title_es: 'El taxi',
        scene_es: 'Decir a dónde, cuánto cuesta y dónde parar.',
        icon: '🚖',
        setup_es: [
          'Truco que vale oro: muéstrale la dirección en el celular mientras la dices. Doble canal, cero malentendidos.',
          'Y pregunta el precio ANTES de arrancar. Siempre.',
        ],
        analogy_es: 'Un taxi es una negociación de tres frases: a dónde, cuánto, y dónde me bajo.',
        chunks: [
          fr({ id: 'c-t3-take-me-to', en: 'Take me to this address, please.', es: 'Lléveme a esta dirección, por favor.', s: 'téik mi tu dis ádres, plíis', why: 'Con "this address" y el celular en la mano no hay forma de que salga mal, aunque no sepas pronunciar la calle.', when: 'Subiéndote al taxi.', sos: true, frame: 'Take me to ___, please.', swaps: ['this address', 'the airport', 'the Marriott'], d: ['Bring me to this address.', 'Take me at this address.'] }),
          fr({ id: 'c-t3-how-much-downtown', en: 'How much to downtown?', es: '¿Cuánto al centro?', s: 'jáu mach tu dáuntaun', why: 'Es el "How much" del Tramo 0 + "downtown" de migración. Pregunta ANTES de arrancar: después ya no se negocia.', when: 'Antes de subirte.', sos: true, frame: 'How much to ___?', swaps: ['downtown', 'the airport', 'this address'], d: ['How much for downtown is?', 'How many to downtown?'] }),
          fr({ id: 'c-t3-stop-here', en: 'Can you stop here, please?', es: '¿Puede parar aquí, por favor?', s: 'kan iú stop jíar, plíis', why: '"Can you…?" es el molde pa\' pedirle algo a otra persona (distinto de "Can I…?" que es pa\' pedir pa\' ti).', when: 'Cuando llegaste o quieres bajarte.', sos: true, frame: 'Can you ___, please?', swaps: ['stop here', 'wait a minute', 'help me'], d: ['You can stop here?', 'Can you stop in here?'] }),
          fr({ id: 'c-t3-take-cards', en: 'Do you take cards?', es: '¿Recibe tarjeta?', s: 'du iú téik cards', why: '"Take" aquí es "aceptar". Pregúntalo antes de subirte, no cuando ya llegaste y estás con la maleta afuera.', when: 'Antes de arrancar.', sos: true, d: ['Do you accept card?', 'You take cards?'] }),
        ],
      },
      {
        id: 't3-s8-solo',
        order: 2,
        title_es: 'Metro, bus y perderse',
        scene_es: 'Cuando andas sin taxi y sin datos.',
        icon: '🗺️',
        setup_es: [
          'El transporte público es más barato y más rápido, pero hay que preguntar.',
          'Y perderse es normal. Lo que no es normal es quedarse perdido por pena.',
        ],
        analogy_es: 'Preguntar en la calle es como pedir la hora: le pasa a todo el mundo y a nadie le molesta.',
        chunks: [
          fr({ id: 'c-t3-which-stop', en: 'Which stop for the museum?', es: '¿En qué parada me bajo para el museo?', s: 'uích stop for de miusíum', why: 'Reusa "Which…?" del Tramo 0. "Stop" es la parada — de bus, de metro, de tren. Una sola palabra pa\' todo.', when: 'En el metro o el bus.', frame: 'Which stop for ___?', swaps: ['the museum', 'downtown', 'the airport'], d: ['What stop for the museum?', 'Which station of the museum?'] }),
          fr({ id: 'c-t3-right-train', en: 'Is this the right train?', es: '¿Este es el tren correcto?', s: 'is dis de ráit tréin', why: '"Right" aquí es "correcto", no "derecha". Es la misma palabra pa\' las dos cosas y el contexto la resuelve.', when: 'Antes de subirte, en el andén.', sos: true, frame: 'Is this the right ___?', swaps: ['train', 'bus', 'line'], d: ['This is the right train?', 'Is this the correct train?'] }),
          fr({ id: 'c-t3-think-im-lost', en: "I think I'm lost.", es: 'Creo que estoy perdido.', s: 'ái zink áim lóst', why: 'Junta "I think" (la palabra de la TH) con "I\'m lost" del Tramo 0. Con "I think" adelante suena menos dramático y la gente se relaja.', when: 'Parando a alguien en la calle.', sos: true, d: ["I think I am lose.", "I'm think lost."] }),
          fr({ id: 'c-t3-show-me-map', en: 'Can you show me on the map?', es: '¿Me lo muestra en el mapa?', s: 'kan iú shóu mi on de máp', why: 'La frase más útil cuando no entiendes la respuesta hablada. Le pasas el celular y el problema del idioma se acabó.', when: 'Después de preguntar una dirección.', sos: true, d: ['Can you show me in the map?', 'Show me the map?'] }),
        ],
      },
    ],
    task: {
      id: 't3-moverte-task',
      intro_es: 'Saliste del aeropuerto con la maleta. Hay taxis a la derecha…',
      steps: [
        { goal_es: 'Antes de subirte, pregunta cuánto cobra al centro.', answerChunkId: 'c-t3-how-much-downtown', reaction_es: 'Primero el precio. Después la maleta al baúl.' },
        { goal_es: 'Confirma que recibe tarjeta, que no traes efectivo.', answerChunkId: 'c-t3-take-cards', reaction_es: 'Eso te ahorra una caminata al cajero con maleta.' },
        { goal_es: 'Súbete y muéstrale la dirección en el celular.', answerChunkId: 'c-t3-take-me-to', reaction_es: 'Y no tuviste que pronunciar el nombre de la calle. Bien pensado.' },
      ],
      done_es: 'Ya te MUEVES solo. ✓',
    },
    coach: {
      escenario_es: 'Sales del aeropuerto y paras un taxi al centro.',
      meta_es: 'Que acuerdes precio, forma de pago y destino antes de arrancar.',
      abridor_en: 'Need a ride? Where to?',
      abridor_es: '¿Necesita taxi? ¿Pa\' dónde?',
      // "Is it far?" es del Tramo 0 (`c-t0-…`), no de este tramo: el prefijo
      // estaba mal y el coach quedaba sin esa frase permitida.
      chunkIds: ['c-t3-take-me-to', 'c-t3-how-much-downtown', 'c-t3-take-cards', 'c-t3-stop-here', 'c-t0-is-it-far', 'w-thankyou'],
      topeCorrecciones: 2,
    },
  },

  /* ═══════════════ PARADA 5 · El hotel ═══════════════ */
  {
    id: 't3-hotel',
    tramo: 't3',
    order: 5,
    title_es: 'El hotel',
    subtitle_es: 'Check-in, wifi y lo que se dañó.',
    arc_es: 'Llegas muerto del viaje y aun así resuelves el cuarto.',
    emoji: '🏨',
    cardTheme: 'blue',
    icon: '🏨',
    survival: false,
    companionSetup_es: [
      'El hotel es fácil porque ellos hablan inglés de hotel: lento y con las mismas palabras.',
      'Ocho frases: cuatro pa\' entrar y cuatro pa\' cuando algo no sirve.',
    ],
    scenes: [
      {
        id: 't3-s9-checkin-hotel',
        order: 1,
        title_es: 'El check-in',
        scene_es: 'Entrar al cuarto con todo resuelto.',
        icon: '🔑',
        setup_es: [
          'Cuatro frases y ya tienes cuarto, wifi, desayuno y hora de salida.',
          'Lo del wifi pregúntalo YA, no cuando estés arriba sin señal.',
        ],
        analogy_es: 'El check-in es un formulario de cuatro casillas. Llénalas de una y no bajas otra vez.',
        chunks: [
          fr({ id: 'c-t3-reservation-under', en: "I have a reservation under Ana Gómez.", es: 'Tengo una reserva a nombre de Ana Gómez.', s: 'ái jav a reservéishon ánder Ána Gómez', why: '"Reservation" es cognado. "Under" es "a nombre de" — literalmente "debajo de", que suena raro pero es así.', when: 'Llegando al hotel.', frame: 'I have a reservation under ___.', swaps: ['Ana Gómez', 'my company', 'Pangea'], d: ['I have a reserve under Ana.', 'I have reservation of Ana Gómez.'] }),
          fr({ id: 'c-t3-breakfast-included', en: 'Is breakfast included?', es: '¿El desayuno está incluido?', s: 'is brékfast inclúdid', why: '"Included" es cognado. Pregúntalo siempre: si está incluido y no vas, perdiste dinero que ya pagaste.', when: 'En el mostrador.', d: ['Is breakfast include?', 'The breakfast is included?'] }),
          fr({ id: 'c-t3-wifi-password', en: "What's the wifi password?", es: '¿Cuál es la clave del wifi?', s: 'uáts de uáifai pásuord', why: 'Wifi y password: dos palabras que ya usas en español. La frase entera es casi gratis.', when: 'Antes de subir al cuarto.', sos: true, d: ["What's the wifi key?", "Which is the wifi password?"] }),
          fr({ id: 'c-t3-checkout-time', en: 'What time is checkout?', es: '¿A qué hora es la salida?', s: 'uát táim is chekáut', why: 'Es el "What time is ___?" del Tramo 0 con una palabra nueva. Pregúntalo el primer día, no el último.', when: 'En el check-in.', d: ['What hour is checkout?', 'When is the checkout time is?'] }),
        ],
      },
      {
        id: 't3-s10-problemas-hotel',
        order: 2,
        title_es: 'Cuando algo no sirve',
        scene_es: 'El aire, las toallas, las maletas y la hora de salida.',
        icon: '🔧',
        setup_es: [
          'Algo se va a dañar. Siempre. Y reclamar en un idioma que no dominas da pena.',
          'Con "It\'s not working" ya resolviste el 90% de los reclamos posibles.',
        ],
        analogy_es: 'Es la misma frase con distinto sustantivo adelante. Aprendes una y te sirve pa\' todo el edificio.',
        chunks: [
          fr({ id: 'c-t3-ac-not-working', en: 'The AC is not working.', es: 'El aire no funciona.', s: 'de éi-si is nót uérkin', why: 'Reusa "It\'s not working" del Tramo 0. "AC" se dice por letras: éi-si. Cambia el sustantivo y reclamas lo que sea.', when: 'Llamando a recepción.', sos: true, frame: 'The ___ is not working.', swaps: ['AC', 'TV', 'shower', 'key'], d: ['The AC is not work.', "The AC doesn't working."] }),
          fr({ id: 'c-t3-leave-my-bags', en: 'Can I leave my bags here?', es: '¿Puedo dejar las maletas aquí?', s: 'kan ái líiv mai bags jíar', why: 'La frase que te salva el último día: saliste del cuarto a las 11 y el vuelo es a las 8. Todos los hoteles lo hacen y es gratis.', when: 'Después del checkout.', sos: true, d: ['Can I let my bags here?', 'Can I leave my bags in here?'] }),
          fr({ id: 'c-t3-more-towels', en: 'Can I get more towels?', es: '¿Me pueden dar más toallas?', s: 'kan ái guet mor táuels', why: 'Otra vez "Can I get…?" — el molde del avión. Ya lo tienes: solo cambias lo que va detrás.', when: 'Llamando a recepción.', frame: 'Can I get more ___?', swaps: ['towels', 'coffee', 'hangers'], d: ['Can I get more towel?', 'Give me more towels?'] }),
          fr({ id: 'c-t3-late-checkout', en: 'Can I have a late checkout?', es: '¿Me pueden dar salida tarde?', s: 'kan ái jav a léit chekáut', why: '"Late" es tarde. Se pide el día antes, no el mismo día. Muchas veces es gratis si preguntas con tiempo.', when: 'La noche anterior a irte.', d: ['Can I have a later checkout?', 'Can I get late the checkout?'] }),
        ],
      },
    ],
    task: {
      id: 't3-hotel-task',
      intro_es: 'Llegaste al hotel a las 11 de la noche, muerto. Igual hay que hacer el check-in…',
      steps: [
        { goal_es: 'Di que tienes reserva a tu nombre.', answerChunkId: 'c-t3-reservation-under', reaction_es: '"Under" — a nombre de. Listo.' },
        { goal_es: 'Antes de subir, pide la clave del wifi.', answerChunkId: 'c-t3-wifi-password', reaction_es: 'Bien: eso se pregunta abajo, no arriba sin señal.' },
        { goal_es: 'Subiste y el aire no prende. Llama a recepción.', answerChunkId: 'c-t3-ac-not-working', reaction_es: 'Una frase que sirve pa\' el aire, la tele, la ducha y la llave.' },
      ],
      done_es: 'Ya manejas EL HOTEL. ✓',
    },
    coach: {
      escenario_es: 'Estás en la recepción del hotel haciendo el check-in.',
      meta_es: 'Que entres al cuarto sabiendo wifi, desayuno y hora de salida.',
      abridor_en: 'Good evening! Checking in?',
      abridor_es: '¡Buenas noches! ¿Va a hacer check-in?',
      chunkIds: ['c-t3-reservation-under', 'c-t3-wifi-password', 'c-t3-breakfast-included', 'c-t3-checkout-time', 'c-t0-room-314', 'w-thankyou', 'w-please'],
      topeCorrecciones: 2,
    },
  },

  /* ═══════════════ PARADA 6 · Comer afuera ═══════════════ */
  {
    id: 't3-comer',
    tramo: 't3',
    order: 6,
    title_es: 'Comer afuera',
    subtitle_es: 'Pedir, avisar lo que no comes y pagar.',
    arc_es: 'Dejas de pedir señalando la foto del menú.',
    emoji: '🍽️',
    cardTheme: 'peach',
    icon: '🍽️',
    survival: false,
    companionSetup_es: [
      'Comer afuera es donde más se siente el idioma, porque hay alguien parado esperando tu respuesta.',
      'Ocho frases y comes tranquilo. Y lo de las alergias no es opcional: eso se dice siempre.',
    ],
    scenes: [
      {
        id: 't3-s11-pedir',
        order: 1,
        title_es: 'Pedir',
        scene_es: 'Mesa, plato y lo que no quieres.',
        icon: '📖',
        setup_es: [
          'El mesero va a llegar rápido y con energía. No te va a dar tiempo de traducir mentalmente.',
          'Por eso estas cuatro son cortas: se dicen sin pensar.',
        ],
        analogy_es: 'Pedir es como el mostrador del aeropuerto: mismas casillas, otro uniforme.',
        chunks: [
          fr({ id: 'c-t3-table-for-two', en: 'Table for two, please.', es: 'Mesa para dos, por favor.', s: 'téibol for tú, plíis', why: 'Cuatro palabras y entraste. Con el número que sea: "table for one" no tiene nada de malo y se dice muchísimo.', when: 'Entrando al restaurante.', frame: 'Table for ___, please.', swaps: ['two', 'one', 'four'], d: ['Table of two, please.', 'A table two, please.'] }),
          fr({ id: 'c-t3-ill-have-this', en: "I'll have this one.", es: 'Voy a pedir este.', s: 'áil jav dis uán', why: '"I\'ll have…" es LA fórmula de restaurante. Y con "this one" señalando el menú, ni hay que pronunciar el plato.', when: 'Pidiendo.', sos: true, frame: "I'll have ___.", swaps: ['this one', 'the chicken', 'the same'], d: ['I will to have this one.', 'I have this one.'] }),
          fr({ id: 'c-t3-what-recommend', en: 'What do you recommend?', es: '¿Qué me recomienda?', s: 'uát du iú recoménd', why: '"Recommend" es cognado. Y es la mejor pregunta del viaje: comes mejor y el mesero se pone de tu lado.', when: 'Cuando no entiendes el menú.', d: ['What you recommend?', 'What do you recommend me?'] }),
          fr({ id: 'c-t3-no-onions', en: 'No onions, please.', es: 'Sin cebolla, por favor.', s: 'nóu ónions, plíis', why: 'El molde pa\' quitar cualquier cosa. Y si es alergia de verdad, la palabra clave es más fuerte: "I\'m allergic to…" (áim alérllic tu).', when: 'Al pedir.', sos: true, frame: 'No ___, please.', swaps: ['onions', 'cheese', 'ice'], d: ['Not onions, please.', 'No onion, please.'] }),
        ],
      },
      {
        id: 't3-s12-pagar',
        order: 2,
        title_es: 'Pagar',
        scene_es: 'La cuenta, la tarjeta, dividir y la propina.',
        icon: '💳',
        setup_es: [
          'En Estados Unidos la cuenta NO llega sola: hay que pedirla. Puedes quedarte sentado una hora esperando.',
          'Y la propina no es opcional allá: 15-20% y va aparte de la cuenta.',
        ],
        analogy_es: 'Allá la cuenta es como el bus: no para si no le haces la señal.',
        chunks: [
          fr({ id: 'c-t3-check-please', en: 'The check, please.', es: 'La cuenta, por favor.', s: 'de chék, plíis', why: 'En Estados Unidos es "check"; en Inglaterra es "bill". Las dos funcionan en todas partes.', when: 'Cuando terminaste de comer.', sos: true, d: ['The account, please.', 'The bill of the check, please.'] }),
          fr({ id: 'c-t3-pay-by-card', en: 'Can I pay by card?', es: '¿Puedo pagar con tarjeta?', s: 'kan ái péi bai card', why: 'Es "by card", no "with card". De las poquitas preposiciones que hay que memorizar tal cual.', when: 'Antes de que traigan la cuenta.', sos: true, d: ['Can I pay with card?', 'I can pay by card?'] }),
          fr({ id: 'c-t3-split-it', en: 'Can we split it?', es: '¿Podemos dividirla?', s: 'kan uí splít it', why: '"Split" es dividir la cuenta. Allá es normalísimo y los meseros lo hacen sin problema: te pasan la máquina dos veces.', when: 'Comiendo con alguien.', d: ['Can we divide it?', 'Can we split them?'] }),
          fr({ id: 'c-t3-keep-the-change', en: 'Keep the change.', es: 'Quédese con el vuelto.', s: 'kíip de chéinch', why: '"Change" aquí es el vuelto, no el cambio de otra cosa. Tres palabras que cierran cualquier pago en efectivo.', when: 'Pagando en efectivo.', d: ['Keep the rest.', 'Take the change.'] }),
        ],
      },
    ],
    task: {
      id: 't3-comer-task',
      intro_es: 'Restaurante, siete de la noche, vas con un colega. Llega el mesero…',
      steps: [
        { goal_es: 'Pide mesa para dos.', answerChunkId: 'c-t3-table-for-two', reaction_es: 'Adentro.' },
        { goal_es: 'No entiendes ni la mitad del menú. Pídele ayuda al mesero.', answerChunkId: 'c-t3-what-recommend', reaction_es: 'Y ahora el mesero está de tu lado. Mejor comida, garantizado.' },
        { goal_es: 'Terminaron y nadie trae la cuenta. Pídela.', answerChunkId: 'c-t3-check-please', reaction_es: 'Porque allá no llega sola. Nunca.' },
      ],
      done_es: 'Ya COMES AFUERA sin señalar fotos. ✓',
    },
    coach: {
      escenario_es: 'Estás en un restaurante y llega el mesero a tomar la orden.',
      meta_es: 'Que pidas algo, avises lo que no comes y pidas la cuenta.',
      abridor_en: "Hi there! Have you had a chance to look at the menu?",
      abridor_es: '¡Hola! ¿Ya alcanzó a mirar el menú?',
      chunkIds: ['c-t3-ill-have-this', 'c-t3-what-recommend', 'c-t3-no-onions', 'c-t3-check-please', 'c-t3-pay-by-card', 'c-t3-some-water', 'w-please', 'w-thankyou'],
      topeCorrecciones: 2,
    },
  },

  /* ═══════════════ PARADA 7 · Comprar y plata ═══════════════ */
  {
    id: 't3-comprar',
    tramo: 't3',
    order: 7,
    title_es: 'Comprar y pagar',
    subtitle_es: 'Tiendas, tallas, tarjeta y cajero.',
    arc_es: 'Entras a una tienda sin miedo a que te hablen.',
    emoji: '🛍️',
    cardTheme: 'green',
    icon: '🛍️',
    survival: false,
    companionSetup_es: [
      'En las tiendas de allá te saludan apenas entras y eso pone nervioso al que no habla.',
      'Con una sola frase se resuelve ese momento. Y con las otras siete, la compra entera.',
    ],
    scenes: [
      {
        id: 't3-s13-tienda',
        order: 1,
        title_es: 'En la tienda',
        scene_es: 'Cuando te saludan, cuando pruebas y cuando preguntas.',
        icon: '👕',
        setup_es: [
          'Apenas entras te van a decir "Can I help you?". No es que sospechen: es el saludo.',
          '"Just looking, thanks" es la respuesta perfecta y no es grosera. Al contrario.',
        ],
        /* Decía "Es el 'siga, mija' de las tiendas de allá": puro paisa. La idea
           era el saludo automático del vendedor, así que se dice esa idea. */
        /* La cita es el VENDEDOR, y el vendedor habla de usted — el mismo de
           esta parada dice "¿Le ayudo a buscar algo?" en su abridor_es, así que
           en tú se contradecía a sí mismo a dos campos de distancia. Personaje
           en usted, Alfred alrededor en tú. */
        analogy_es: 'Es el "¿le ayudo en algo?" que te sueltan apenas cruzas la puerta. Se contesta y se sigue caminando.',
        chunks: [
          fr({ id: 'c-t3-just-looking', en: 'Just looking, thanks.', es: 'Solo estoy mirando, gracias.', s: 'llast lúkin, zenks', why: 'Tres palabras que te quitan de encima la incomodidad de que te sigan por la tienda. Y es lo que contesta un nativo.', when: 'Apenas entras y te saludan.', sos: true, d: ['Only looking, thanks.', 'Just look, thanks.'] }),
          fr({ id: 'c-t3-how-much-this', en: 'How much is this?', es: '¿Cuánto vale esto?', s: 'jáu mach is dis', why: 'El "How much" del Tramo 0 + "this" de la TH. Dos cosas que ya sabes, juntas.', when: 'Cuando no hay etiqueta.', sos: true, d: ['How much this is?', 'How many is this?'] }),
          fr({ id: 'c-t3-bigger-size', en: 'Do you have a bigger size?', es: '¿Tiene una talla más grande?', s: 'du iú jav a bíguer sáis', why: '"Size" es talla y también tamaño. Con "bigger" o "smaller" adelante resuelves cualquier cambio.', when: 'Probándote ropa.', frame: 'Do you have a ___ size?', swaps: ['bigger', 'smaller', 'medium'], d: ['Do you have a big size?', 'Have you a bigger size?'] }),
          fr({ id: 'c-t3-try-it-on', en: 'Can I try it on?', es: '¿Me lo puedo medir?', s: 'kan ái trái it ón', why: 'El "on" del final no se puede quitar: "try it" solo es probar (comida). "Try it ON" es medirse ropa.', when: 'En la tienda de ropa.', d: ['Can I try it?', 'Can I prove it?'] }),
        ],
      },
      {
        id: 't3-s14-pagar-plata',
        order: 2,
        title_es: 'La caja y el cajero',
        scene_es: 'Pagar, recibo y sacar dinero.',
        icon: '🏧',
        setup_es: [
          'Cuatro más pa\' cerrar: pagar, pedir el recibo (clave si viajas por trabajo) y encontrar un cajero.',
          '"Receipt" es de las palabras más traicioneras del inglés: la P no suena. Risíit.',
        ],
        analogy_es: 'La caja es el mostrador del aeropuerto otra vez. Ya viste esta película tres veces hoy.',
        chunks: [
          fr({ id: 'c-t3-card-please', en: 'Card, please.', es: 'Con tarjeta, por favor.', s: 'card, plíis', why: 'Te preguntan "cash or card?". Dos palabras y listo. Ni frase completa hace falta.', when: 'En la caja.', d: ['Cash, please.', 'With card, please.'] }),
          fr({ id: 'c-t3-get-receipt', en: 'Can I get a receipt?', es: '¿Me da el recibo?', s: 'kan ái guet a risíit', why: 'La P de "receipt" NO suena: risíit. Y si viajas por trabajo, sin recibo no te devuelven el dinero.', when: 'Después de pagar.', sos: true, d: ['Can I get a recipe?', 'Can I have a receip?'] }),
          fr({ id: 'c-t3-is-there-a-fee', en: 'Is there a fee?', es: '¿Cobran comisión?', s: 'is dér a fíi', why: '"Fee" es la comisión o el cargo extra. Pregúntala en cajeros y en hoteles: es donde más dinero se pierde sin darse cuenta.', when: 'En un cajero o pagando.', sos: true, d: ['Is there a tax?', 'Have a fee?'] }),
          fr({ id: 'c-t3-where-atm', en: 'Where is the ATM?', es: '¿Dónde hay un cajero?', s: 'uér is de éi-ti-em', why: 'El cajero automático es "ATM" y se dice por letras: éi-ti-em. Otra vez el molde "Where is the ___?".', when: 'Cuando necesitas efectivo.', sos: true, d: ['Where is the cashier?', 'Where is a ATM?'] }),
        ],
      },
    ],
    task: {
      id: 't3-comprar-task',
      intro_es: 'Entras a una tienda a matar tiempo antes del vuelo…',
      steps: [
        { goal_es: 'Apenas entras te preguntan si necesitas ayuda. Todavía no.', answerChunkId: 'c-t3-just-looking', reaction_es: 'Perfecto. Ni grosero ni incómodo.' },
        { goal_es: 'Te gustó una camisa pero te queda apretada.', answerChunkId: 'c-t3-bigger-size', reaction_es: 'Y con "smaller" funciona igual al revés.' },
        { goal_es: 'Pagaste y viajas por trabajo. Necesitas el papel.', answerChunkId: 'c-t3-get-receipt', reaction_es: 'Risíit, sin P. Y con eso te devuelven el dinero.' },
      ],
      done_es: 'Ya COMPRAS sin nervios. ✓',
    },
    coach: {
      escenario_es: 'Estás en una tienda y el vendedor se te acerca.',
      meta_es: 'Que preguntes precio y talla, y pidas el recibo al pagar.',
      abridor_en: 'Hi! Can I help you find anything?',
      abridor_es: '¡Hola! ¿Le ayudo a buscar algo?',
      chunkIds: ['c-t3-just-looking', 'c-t3-how-much-this', 'c-t3-bigger-size', 'c-t3-try-it-on', 'c-t3-card-please', 'c-t3-get-receipt', 'w-thankyou'],
      topeCorrecciones: 2,
    },
  },

  /* ═══════════════ PARADA 8 · Cuando se daña el viaje ═══════════════ */
  {
    id: 't3-se-dana',
    tramo: 't3',
    order: 8,
    title_es: 'Cuando se daña el viaje',
    subtitle_es: 'Maleta perdida, vuelo caído, robo y salud.',
    arc_es: 'Lo peor pasa. Y ahora tienes palabras pa\' eso también.',
    emoji: '🆘',
    cardTheme: 'peach',
    icon: '🆘',
    survival: true,
    companionSetup_es: [
      'Última parada, y ojalá no la uses nunca. Pero se usa.',
      'Doce frases pa\' cuando algo se dañó de verdad. Todas cortas, porque cuando estás asustado no salen frases largas.',
    ],
    scenes: [
      {
        id: 't3-s15-maleta-vuelo',
        order: 1,
        title_es: 'La maleta y el vuelo',
        scene_es: 'No llegó la maleta o se cayó el vuelo.',
        icon: '🧳',
        setup_es: [
          'La cinta se detuvo y tu maleta no salió. O el tablero dice CANCELLED.',
          'Cuatro frases y estás en la fila correcta diciendo lo correcto.',
        ],
        analogy_es: 'En un mostrador de reclamos no premian al que habla bonito: premian al que dice el problema en cinco segundos.',
        chunks: [
          fr({ id: 'c-t3-bag-didnt-arrive', en: "My bag didn't arrive.", es: 'Mi maleta no llegó.', s: 'mai bag dídent arráiv', why: '"Arrive" es cognado (arribar). Y "didn\'t" es la forma de negar en pasado — no hace falta entenderla todavía, se usa entera.', when: 'En el mostrador de equipaje.', sos: true, d: ['My bag not arrive.', "My bag doesn't arrive."] }),
          fr({ id: 'c-t3-flight-cancelled', en: 'My flight was cancelled.', es: 'Me cancelaron el vuelo.', s: 'mai fláit uás cánseld', why: '"Cancelled" es cognado. Esta frase te pone en la fila correcta y te da derecho a que te reubiquen.', when: 'Cuando el tablero cambia.', sos: true, d: ['My flight is cancel.', 'They cancelled to me the flight.'] }),
          fr({ id: 'c-t3-missed-connection', en: 'I missed my connection.', es: 'Perdí la conexión.', s: 'ái míst mai conékshon', why: '"Connection" es cognado. Es distinto a que te cancelen: acá la culpa fue del primer vuelo y por eso te reubican gratis.', when: 'Cuando llegas tarde a la escala.', sos: true, d: ['I lost my connection.', 'I miss my connection.'] }),
          fr({ id: 'c-t3-when-next-one', en: 'When is the next one?', es: '¿Cuándo sale el próximo?', s: 'uén is de nékst uán', why: 'La pregunta que sigue a cualquiera de las tres anteriores. "Next one" sirve pa\' vuelo, bus, tren o turno.', when: 'Después de reportar el problema.', sos: true, d: ['When is the next?', 'When the next one is?'] }),
        ],
      },
      {
        id: 't3-s16-perdida-robo',
        order: 2,
        title_es: 'Se perdió o te lo quitaron',
        scene_es: 'Celular, billetera y a quién llamar.',
        icon: '📱',
        setup_es: [
          'Perder el celular afuera es perder el mapa, el traductor y los pasajes de una sola vez.',
          'Por eso estas cuatro son las únicas que vale la pena tener en la cabeza, no en el teléfono.',
        ],
        analogy_es: 'Son el número de emergencia escrito en el brazo: se aprenden justo porque el aparato puede no estar.',
        chunks: [
          fr({ id: 'c-t3-lost-my-phone', en: 'I lost my phone.', es: 'Perdí el celular.', s: 'ái lóst mai fóun', why: '"Phone" con PH que suena F, como "pharmacy". Cuatro palabras y arranca la ayuda.', when: 'En recepción, en la policía, donde sea.', sos: true, frame: 'I lost my ___.', swaps: ['phone', 'passport', 'wallet'], d: ['I lose my phone.', "I'm lost my phone."] }),
          fr({ id: 'c-t3-took-my-wallet', en: 'Someone took my wallet.', es: 'Alguien me robó la billetera.', s: 'sámuan túk mai uólet', why: '"Someone" es "alguien". Se usa cuando no sabes quién fue — que es siempre. Es la frase que abre un reporte de policía.', when: 'Reportando un robo.', sos: true, d: ['Someone take my wallet.', 'Somebody stole to me the wallet.'] }),
          fr({ id: 'c-t3-call-embassy', en: 'I need to call my embassy.', es: 'Necesito llamar a mi embajada.', s: 'ái níid tu cól mai émbasi', why: '"Embassy" es cognado. Si perdiste el pasaporte, esta es LA frase: la embajada resuelve lo que ningún hotel puede.', when: 'Pasaporte perdido o robado.', sos: true, d: ['I need call my embassy.', 'I need to call to my embassy.'] }),
          fr({ id: 'c-t3-use-your-phone', en: 'Can I use your phone?', es: '¿Me presta el teléfono?', s: 'kan ái iús ior fóun', why: 'Sin celular, esta es la primera frase. "Can I use…?" es el mismo molde de siempre con un verbo nuevo.', when: 'Cuando te quedaste sin teléfono.', sos: true, d: ['Can I use the your phone?', 'I can use your phone?'] }),
        ],
      },
      {
        id: 't3-s17-salud',
        order: 3,
        title_es: 'Si te sientes mal',
        scene_es: 'Farmacia, dolor y dónde queda.',
        icon: '💊',
        setup_es: [
          'Enfermarse afuera da miedo doble: por el cuerpo y por el idioma.',
          'Con cuatro frases y señalando dónde duele, te atienden en cualquier parte del mundo.',
        ],
        analogy_es: 'Señalar dónde duele es lenguaje universal. Estas frases solo abren la puerta pa\' poder señalar.',
        chunks: [
          fr({ id: 'c-t3-something-for-headache', en: 'I need something for a headache.', es: 'Necesito algo para el dolor de cabeza.', s: 'ái níid sámzin for a jédeik', why: '"Something for…" es el molde de farmacia: sirve pa\' dolor de cabeza, de estómago, pa\' la gripe, pa\' lo que sea.', when: 'En la farmacia.', sos: true, frame: 'I need something for ___.', swaps: ['a headache', 'a cold', 'my stomach'], d: ['I need something for headache.', 'I need some for a headache.'] }),
          fr({ id: 'c-t3-dont-feel-well', en: "I don't feel well.", es: 'No me siento bien.', s: 'ái dóunt fíil uél', why: 'La frase general. No hace falta saber el nombre de lo que tienes: con esta ya te empiezan a atender.', when: 'Con cualquiera, en cualquier lado.', sos: true, d: ["I don't feel good.", "I'm not feel well."] }),
          fr({ id: 'c-t3-it-hurts-here', en: 'It hurts here.', es: 'Me duele aquí.', s: 'it jérts jíar', why: 'Tres palabras y el dedo. Es la frase más eficiente de todo el tramo: funciona sin idioma común.', when: 'Con un médico o en urgencias.', sos: true, d: ['It hurt here.', 'Here it hurts to me.'] }),
          fr({ id: 'c-t3-pharmacy-near', en: 'Is there a pharmacy near here?', es: '¿Hay una farmacia cerca?', s: 'is dér a fármasi níar jíar', why: '"Is there a ___ near here?" te ubica cualquier cosa: farmacia, cajero, restaurante, baño. Guarda el molde entero.', when: 'Buscando algo cerca.', sos: true, frame: 'Is there a ___ near here?', swaps: ['pharmacy', 'ATM', 'hospital'], d: ['There is a pharmacy near here?', 'Is a pharmacy near here?'] }),
        ],
      },
    ],
    task: {
      id: 't3-se-dana-task',
      intro_es: 'Aterrizaste. La cinta de equipaje se detuvo. Tu maleta no salió…',
      steps: [
        { goal_es: 'Vas al mostrador de reclamos. Di el problema en cinco segundos.', answerChunkId: 'c-t3-bag-didnt-arrive', reaction_es: 'Corto y claro. Así se reclama.' },
        { goal_es: 'Te dicen que llega mañana. Pregunta por el próximo vuelo que la traiga.', answerChunkId: 'c-t3-when-next-one', reaction_es: 'Bien. Sin la pregunta te vas sin fecha.' },
        { goal_es: 'Ya en el hotel te empezó un dolor de cabeza feo. Pregunta por una farmacia cerca.', answerChunkId: 'c-t3-pharmacy-near', reaction_es: 'Y ese molde — "Is there a ___ near here?" — te sirve pa\' todo el viaje.' },
      ],
      done_es: 'Ya resuelves CUANDO SE DAÑA. Terminaste el tramo. ✓',
    },
    coach: {
      escenario_es: 'Tu maleta no llegó y estás en el mostrador de reclamos.',
      meta_es: 'Que reportes el problema y salgas con una fecha.',
      abridor_en: 'Hi, how can I help you?',
      abridor_es: 'Hola, ¿en qué le ayudo?',
      chunkIds: ['c-t3-bag-didnt-arrive', 'c-t3-when-next-one', 'c-t3-flight-cancelled', 'c-t3-missed-connection', 'c-t3-staying-at', 'w-thankyou', 'w-please'],
      topeCorrecciones: 2,
    },
  },
];
