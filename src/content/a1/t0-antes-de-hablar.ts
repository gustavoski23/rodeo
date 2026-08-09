/* TRAMO 0 — ANTES DE HABLAR (pre-A1)

   El tramo que hoy no existe y por el que se cae todo el que abre la app
   sabiendo cero: `u1-llegar` arranca en "Good morning, everyone" — tres
   palabras que alguien en pre-A1 no puede ni pronunciar ni separar. Ve eso,
   confirma que el inglés no es pa' él, y cierra.

   Este tramo NO enseña conversación. Enseña tres cosas y en este orden:

     1. Que ya sabe 300 palabras (cognados). Es la única parada cuyo objetivo
        real es emocional: bajar el miedo antes de pedir nada a cambio.
     2. Los cinco sonidos que lo delatan. Se meten ACÁ y no después porque un
        hábito de pronunciación de seis meses cuesta un año desarmarlo.
     3. Las piezas que sostienen todo A1: I am / you are / it is, los números y
        las seis preguntas. Con eso solo, ya pide, ubica y responde.

   ── MUDANZAS (hechas) ───────────────────────────────────────────────────
   Cuatro chunks del tronco eran pre-A1 y estaban mal ubicados en u1/u3. Se
   MOVIERON acá — no se copiaron, y con el id intacto:

     c-im-new-here      u1-s3-presentarte  →  t0-ser-estar / t0-s13-im
     c-im-from-colombia u3-s2-quien-eres   →  t0-ser-estar / t0-s13-im
     c-whats-your-name  u1-s2-conocer      →  t0-preguntas / t0-s16-donde-cuanto
     c-nice-to-meet-you u1-s2-conocer      →  t0-preguntas / t0-s16-donde-cuanto

   Mover NO cuesta progreso: el SRS indexa por id de chunk (rodeo_a1_srs), no
   por unidad. Quien ya los tenía en caja 4 los sigue teniendo en caja 4, ahora
   en el Tramo 0. Duplicarlos con id nuevo SÍ costaría: el motor los cobraría
   dos veces y el usuario sentiría que le repiten lo que ya sabe.

   Los cuatro van VERBATIM del core: mismo why_es, mismo sayWhen_es, mismos
   distractores, mismo frame y mismos swaps. (Este párrafo decía que hablaban
   de "tú" a diferencia del resto del tramo, que era de "vos": ya no hay tal
   diferencia — todo el tramo pasó a "tú" con la regla de lib/espanol-neutro.)

   Al llevarse las dos de `u1-s2-conocer`, esa escena quedaba con `chunks: []`
   y eso trababa `u1-llegar` para siempre (proximaEscena la devuelve infinito,
   escenasHechas nunca da true). Se borró la escena entera; el detalle está
   comentado en core.ts, donde estaba.

   ── LO QUE NO SE DUPLICA ────────────────────────────────────────────────
   "I don't understand", "Can you repeat that?" y "Can you speak slowly?" ya
   viven en u2-supervivencia, que está marcada `survival: true` y por eso está
   ABIERTA desde el día uno (estaDesbloqueada). El pre-A1 las tiene disponibles
   sin que se las escribamos de nuevo.

   Y "Where is the bathroom?" ya vive en u5-ayuda como `c-where-is-bathroom`.
   Este tramo la enseña primero, pero IMPORTA el mismo objeto en vez de escribir
   una copia con id nuevo. Ver la nota en core.ts. */

import { pal, fr } from './armar';
import { C_WHERE_IS_BATHROOM } from './core';
import type { A1UnitRuta } from './tipos-ruta';

/* ── Las tres que se enseñan DOS VECES a propósito ───────────────────────
   "help", "thanks" y "seven" aparecen cada una en dos paradas: primero por lo
   que significan, después por cómo suenan. Esa repetición es deliberada y es
   buena — el segundo encuentro es el que arregla la boca.

   Lo que NO puede pasar es que la segunda vez traiga un id nuevo. El motor no
   sabe de intención pedagógica: dos ids = dos entradas Leitner que vencen por
   separado, para siempre. Por eso acá hay UN objeto por palabra y las dos
   escenas referencian el mismo (construirIndice indexa por id y nuevos()
   deduplica con un Set, así que compartir no rompe nada).

   El `why_es` de cada una junta los dos motivos, porque la ficha es una sola.

   Efecto lateral conocido: `indice.escenaDe[id]` se queda con la ÚLTIMA escena
   que lo contiene, así que los "hermanos" de respaldo para distractores salen
   de la escena de sonidos. Es respaldo, no la fuente principal — no molesta. */
const W_HELP = pal({
  id: 'w-help', en: 'help', es: 'ayuda', s: 'jélp',
  why: 'No es cognado y entra igual aquí: una sola palabra, gritada o dicha bajito, funciona. Y cuida el soplo del principio — jélp, no élp.',
  when: 'Sola ya es una frase completa.', sos: true, d: ['elp', 'hélpe'],
});

const W_THANKS = pal({
  id: 'w-th-thanks', en: 'thanks', es: 'gracias', s: 'zenks',
  why: 'La palabra más dicha del inglés arranca con el sonido más difícil y encima termina en la S que nos comemos. Si te sale entera —lengua afuera adelante, S al final— ya ganaste.',
  when: 'Cada vez que alguien hace algo por ti. O sea, todo el día.',
  d: ['tanks', 'sanks', 'thank'],
});

const W_SEVEN = pal({
  id: 'w-v-seven', en: 'seven', es: 'siete', s: 'séven',
  why: 'La V va en la mitad, que es donde más se escapa. Sévvven, no "seben".',
  when: 'Diciendo la hora, una puerta o un precio.',
  d: ['seben', 'sefen', 'eleven'],
});

export const T0_UNIDADES: A1UnitRuta[] = [
  /* ═══════════════ PARADA 1 · Las que ya sabés ═══════════════ */
  {
    id: 't0-cognados',
    tramo: 't0',
    order: 1,
    title_es: 'Las que ya sabes',
    subtitle_es: 'Arrancas con 300 palabras encima.',
    arc_es: 'Crees que sabes cero. Alfred te muestra que no.',
    emoji: '🎁',
    cardTheme: 'green',
    icon: '🎁',
    survival: false,
    companionSetup_es: [
      'Antes de enseñarte nada, te voy a mostrar lo que YA sabes. Y es bastante.',
      'El español y el inglés comparten miles de palabras. No hay que aprenderlas: hay que reconocerlas.',
    ],
    scenes: [
      {
        id: 't0-s1-aeropuerto',
        order: 1,
        nodeKind: 'palabras',
        title_es: 'En el aeropuerto ya sabes leer',
        scene_es: 'Los letreros del aeropuerto están casi todos en español disfrazado.',
        icon: '✈️',
        setup_es: [
          'Mira un letrero de aeropuerto en Estados Unidos. Crees que no entiendes nada.',
          'Te apuesto a que entiendes ocho de cada diez. Vamos a ver.',
        ],
        analogy_es:
          'Es como oír a un primo mexicano: habla distinto, pero es el mismo idioma de fondo. La palabra está ahí, solo cambió el acento.',
        chunks: [
          pal({ id: 'w-information', en: 'information', es: 'información', s: 'informéishon', why: 'Cambia el acento y se come la "ción". La palabra es la misma. Si sabes leer "información", ya sabes esta.', when: 'El mostrador donde preguntas cualquier cosa.', d: ['inmigración', 'instalación'] }),
          pal({ id: 'w-taxi', en: 'taxi', es: 'taxi', s: 'táksi', why: 'Idéntica. Hay como trescientas así y nadie te las cuenta.', when: 'Saliendo del aeropuerto.', d: ['bus', 'tren'] }),
          pal({ id: 'w-hotel', en: 'hotel', es: 'hotel', s: 'joutél', why: 'Se escribe igual; lo único que cambia es que la H aquí SÍ suena, como una jota suave: "joutél".', when: 'Donde vas a dormir.', d: ['hospital', 'casa'] }),
          pal({ id: 'w-passport', en: 'passport', es: 'pasaporte', s: 'pásport', why: 'Le cortaron la cola. "Pasaporte" sin el "e" final y listo.', when: 'Lo que te piden tres veces antes de subirte al avión.', d: ['boleto', 'maleta'] }),
          pal({ id: 'w-international', en: 'international', es: 'internacional', s: 'internáshonal', why: 'La regla de oro: todo lo que en español termina en -CIONAL, en inglés termina en -TIONAL y suena "shonal".', when: 'La terminal a la que tienes que ir.', hook: 'Con esta regla te salen gratis: national, professional, traditional, operational.', d: ['nacional', 'interno'] }),
          pal({ id: 'w-terminal', en: 'terminal', es: 'terminal', s: 'términal', why: 'Igualita. Ni una letra distinta.', when: 'El edificio donde sale tu vuelo.', d: ['puerta', 'salida'] }),
          pal({ id: 'w-immigration', en: 'immigration', es: 'inmigración', s: 'imigréishon', why: 'Otra vez la regla: -CIÓN se vuelve -TION y suena "shon".', when: 'La fila donde te preguntan a qué vienes.', hook: 'Regalo: station, situation, reservation, vacation.', d: ['información', 'emigrante'] }),
          pal({ id: 'w-exit', en: 'exit', es: 'salida', s: 'égzit', why: '⚠️ Esta es trampa. NO es "éxito". "Exit" es SALIDA. Si en una entrevista dices "I want exit" estás pidiendo la puerta, no el triunfo.', when: 'El letrero verde que buscas cuando quieres salir.', hook: 'Éxito en inglés es "success". "Exit" es la puerta.', d: ['éxito', 'entrada'] }),
          pal({ id: 'w-control', en: 'control', es: 'control', s: 'contról', why: 'Idéntica, solo que el acento se va a la última: contról, no cóntrol.', when: 'Passport control: donde revisan documentos.', d: ['controlar', 'consulta'] }),
          pal({ id: 'w-restaurant', en: 'restaurant', es: 'restaurante', s: 'réstorant', why: 'Sin la "e" final y con el acento adelante. En inglés se comen la mitad de las vocales del medio.', when: 'Donde vas a comer.', d: ['tienda', 'baño'] }),
        ],
      },
      {
        id: 't0-s2-oficina',
        order: 2,
        nodeKind: 'palabras',
        title_es: 'En la oficina ya sabes la mitad',
        scene_es: 'El vocabulario de oficina en inglés es casi todo latín. Como el nuestro.',
        icon: '🏢',
        setup_es: [
          'La oficina es todavía más fácil que el aeropuerto.',
          'Casi todo el vocabulario de trabajo viene del latín, igual que el español. Mira.',
        ],
        analogy_es:
          'El inglés de oficina y el español de oficina son primos hermanos: los dos le copiaron al latín. El inglés de la calle es el que es otra familia.',
        chunks: [
          pal({ id: 'w-office', en: 'office', es: 'oficina', s: 'ófis', why: 'Cortita. "Oficina" sin el final.', when: 'Donde trabajas.', d: ['oficial', 'obra'] }),
          pal({ id: 'w-project', en: 'project', es: 'proyecto', s: 'próyect', why: 'La misma. Ojo que la J aquí suena como nuestra "y" fuerte, no como jota.', when: 'En lo que estás trabajando.', d: ['protecto', 'progreso'] }),
          pal({ id: 'w-client', en: 'client', es: 'cliente', s: 'cláient', why: 'Sin la "e". Pero ojo con el sonido: la I suena "ai". Cláient, no clíent.', when: 'A quien le vendes o le respondes.', d: ['clínica', 'cliente potencial'] }),
          pal({ id: 'w-computer', en: 'computer', es: 'computador', s: 'compiúter', why: 'La "u" suena "iu". Compiúter. Si dices "computer" tal cual se lee, igual te entienden.', when: 'La máquina.', d: ['calculadora', 'teléfono'] }),
          pal({ id: 'w-document', en: 'document', es: 'documento', s: 'dókiument', why: 'Sin la "o" final. Acento bien adelante: DÓkiument.', when: 'El archivo que te piden.', d: ['documental', 'carpeta'] }),
          pal({ id: 'w-minute', en: 'minute', es: 'minuto', s: 'mínit', why: 'Se escribe "minute" pero se dice "mínit". Esta es de las que se escriben como en español y suenan como no.', when: '"One minute" — el comodín que te compra tiempo.', d: ['momento', 'menú'] }),
          pal({ id: 'w-problem', en: 'problem', es: 'problema', s: 'próblem', why: '"Problema" sin la "a". Y en inglés no es femenina ni masculina: aquí los sustantivos no tienen género. Una cosa menos.', when: 'Cuando algo salió mal.', d: ['problemática', 'proyecto'] }),
          pal({ id: 'w-important', en: 'important', es: 'importante', s: 'impórtant', why: 'Sin la "e". Sirve pa\' subirle el volumen a cualquier frase: "this is important".', when: 'Cuando algo no puede esperar.', d: ['importar', 'imponente'] }),
          pal({ id: 'w-professional', en: 'professional', es: 'profesional', s: 'proféshonal', why: 'Doble S en inglés, una sola en español. Y otra vez el "shonal".', when: 'Hablando de trabajo o de gente.', d: ['profesor', 'progresivo'] }),
          pal({ id: 'w-department', en: 'department', es: 'departamento', s: 'dipártment', why: 'Ojo: en inglés "department" es el ÁREA de la empresa. El apartamento donde vives es "apartment", sin la D.', when: 'Sales department, IT department.', hook: 'department = área de la empresa · apartment = donde vives.', d: ['apartamento', 'partida'] }),
        ],
      },
      {
        id: 't0-s3-salvavidas',
        order: 3,
        nodeKind: 'palabras',
        title_es: 'Las que te salvan',
        scene_es: 'Diez palabras que en una emergencia valen más que un curso.',
        icon: '🚑',
        setup_es: [
          'Estas diez son distintas: no son pa\' quedar bien. Son pa\' que te ayuden.',
          'Si un día solo te acuerdas de diez palabras en inglés, que sean estas.',
        ],
        analogy_es:
          'Son el extintor: no lo usas nunca, pero el día que lo necesitas no hay tiempo de ir a aprender dónde queda.',
        chunks: [
          pal({ id: 'w-doctor', en: 'doctor', es: 'doctor', s: 'dóctor', why: 'Idéntica. Con decirla y señalarte, ya arrancó la ayuda.', when: 'Cuando te sientes mal.', sos: true, d: ['dolor', 'dentista'] }),
          pal({ id: 'w-hospital', en: 'hospital', es: 'hospital', s: 'jóspital', why: 'Igual, con la H sonando jota suave. Jóspital.', when: 'Emergencia.', sos: true, d: ['hotel', 'hospedaje'] }),
          pal({ id: 'w-police', en: 'police', es: 'policía', s: 'polís', why: 'Cortita: polís. Ojo que el acento va atrás, no adelante.', when: 'Si te roban o te pasa algo.', sos: true, d: ['política', 'póliza'] }),
          pal({ id: 'w-emergency', en: 'emergency', es: 'emergencia', s: 'imérllensi', why: 'La G suena como nuestra "y" fuerte de "yo". Imérllensi.', when: 'La palabra que abre todas las puertas.', sos: true, d: ['emergente', 'urgente'] }),
          pal({ id: 'w-pharmacy', en: 'pharmacy', es: 'farmacia', s: 'fármasi', why: 'La PH suena F. Siempre. Pharmacy, phone, photo: todas con F.', when: 'Cuando necesitas una pastilla.', sos: true, hook: 'PH = F. Regalo: phone, photo, elephant.', d: ['farmacéutico', 'famoso'] }),
          pal({ id: 'w-bank', en: 'bank', es: 'banco', s: 'bánk', why: 'Sin la "o". Sirve pa\' el banco del dinero; el banco de sentarse es "bench".', when: 'Sacar dinero, cambiar dinero.', d: ['banca', 'banquete'] }),
          pal({ id: 'w-water', en: 'water', es: 'agua', s: 'uóter', why: 'Esta NO es cognado y por eso está aquí: es la palabra más pedida del mundo y no se parece a nada. La T suena casi D: "uóder".', when: 'Todo el tiempo, en todas partes.', sos: true, d: ['baño', 'espera'] }),
          W_HELP, // vuelve en t0-s7-h, con el mismo id (ver la nota de arriba)
          pal({ id: 'w-coffee', en: 'coffee', es: 'café', s: 'cófi', why: 'Cófi, con acento adelante. Casi todos los idiomas la comparten.', when: 'La excusa social número uno de cualquier oficina.', d: ['copia', 'cofre'] }),
          pal({ id: 'w-library', en: 'library', es: 'biblioteca', s: 'láibreri', why: '⚠️ Trampa. "Library" es BIBLIOTECA, no librería. La librería donde compras libros es "bookstore".', when: 'Cuando alguien te da una dirección.', hook: 'library = biblioteca (prestan) · bookstore = librería (venden).', d: ['librería', 'libro'] }),
        ],
      },
    ],
    task: {
      id: 't0-cognados-task',
      intro_es: 'Aterrizaste. Vas caminando por el aeropuerto leyendo letreros. A ver qué tanto entiendes…',
      steps: [
        {
          goal_es: 'Necesitas preguntar algo y ves un mostrador. ¿Qué letrero buscas?',
          answerChunkId: 'w-information',
          reaction_es: '¡Eso! Y no lo aprendiste hoy: ya lo sabías.',
        },
        {
          goal_es: 'Ya tienes la maleta y quieres salir del edificio. ¿Qué letrero sigues?',
          answerChunkId: 'w-exit',
          reaction_es: 'Correcto. Y ojo: nada que ver con "éxito". Esa ya no te la pegan.',
        },
        {
          goal_es: 'Te empezó un dolor de cabeza feo. ¿Qué palabra necesitas?',
          answerChunkId: 'w-pharmacy',
          reaction_es: 'Ahí está. Con esa sola palabra y señalando la cabeza, te resuelven.',
        },
      ],
      done_es: 'Ya sabes 30 palabras. Y no aprendiste ninguna. ✓',
    },
    coach: {
      escenario_es: 'Vas llegando al aeropuerto y alguien de información te ayuda.',
      meta_es: 'Que encuentres el taxi. Puedes responder con UNA palabra.',
      abridor_en: 'Hi! Do you need help?',
      // Habla el mostrador de información, no Alfred: a un pasajero se le dice
      // usted. Los otros dos abridores del tramo (un compañero de oficina y
      // Sarah, la colega) se quedan en tú porque ahí nadie diría usted.
      abridor_es: '¡Hola! ¿Necesita ayuda?',
      chunkIds: ['w-information', 'w-taxi', 'w-hotel', 'w-exit', 'w-help', 'w-passport'],
      topeCorrecciones: 1,
    },
  },

  /* ═══════════════ PARADA 2 · Los sonidos que te delatan ═══════════════ */
  {
    id: 't0-sonidos',
    tramo: 't0',
    order: 2,
    title_es: 'Los sonidos que te delatan',
    subtitle_es: 'Cinco. Solo cinco.',
    arc_es: 'Descubres que no es tu boca: es que nadie te dijo dónde va la lengua.',
    emoji: '👄',
    cardTheme: 'lavender',
    icon: '🔊',
    survival: false,
    companionSetup_es: [
      'Aquí va lo que a mí nadie me explicó y me costó dos años: el inglés tiene cinco sonidos que el español no tiene.',
      'No son cuarenta. Son cinco. Y con los cinco ya no suenas a "estudiante de inglés": suenas a alguien que habla inglés con acento. Que es otra cosa.',
    ],
    scenes: [
      {
        id: 't0-s4-th',
        order: 1,
        nodeKind: 'sonido',
        parMinimo: ['think', 'sink'],
        title_es: 'La TH: saca la lengua',
        scene_es: 'El sonido que no existe en español y aparece en las palabras más comunes.',
        icon: '👅',
        setup_es: [
          'La TH no existe en español, así que tu boca nunca la hizo. No es que no puedas: es que no sabes dónde poner la lengua.',
          'Es literal: la puntita de la lengua entre los dientes y soplas. Se ve raro. Se siente raro. Así es.',
        ],
        analogy_es:
          'Es la "z" de España (zapato) pero con la lengua asomando un poquito más. Si eres de los que dice "zapato" a la española, ya la tienes medio hecha.',
        chunks: [
          pal({ id: 'w-th-think', en: 'think', es: 'pensar', s: 'zink (lengua entre los dientes)', why: 'Si te sale "sink" no pasa nada, te entienden igual — pero "sink" es lavaplatos. Vale la pena sacar la lengua.', when: '"I think so" = creo que sí. La usas mil veces al día.', d: ['sink', 'tink'] }),
          W_THANKS, // vuelve en t0-s6-s-final, con el mismo id
          pal({ id: 'w-th-this', en: 'this', es: 'esto / este', s: 'dis (lengua entre los dientes)', why: 'Ojo: hay DOS th. La de "think" es soplada; la de "this" es con voz, suena más a "d". Misma lengua afuera, distinta garganta.', when: 'Señalas algo y dices "this". Media conversación resuelta.', d: ['dis', 'zis'] }),
          pal({ id: 'w-th-they', en: 'they', es: 'ellos / ellas', s: 'déi', why: 'Con la TH sonora, igual que "this". Y fíjate: "they" sirve pa\' ellos, ellas y pa\' una persona cuando no sabes. En inglés no hay que adivinar género.', when: 'Hablando de otra gente.', d: ['dei', 'zei'] }),
        ],
      },
      {
        id: 't0-s5-v',
        order: 2,
        nodeKind: 'sonido',
        parMinimo: ['very', 'berry'],
        title_es: 'La V que no es B',
        scene_es: 'En español B y V suenan igual. En inglés son dos palabras distintas.',
        icon: '🦷',
        setup_es: [
          'En español, "vaca" y "baca" suenan idéntico. En inglés eso no existe: son sonidos distintos y cambian la palabra.',
          'La V se hace con el diente de arriba tocando el labio de abajo. Como una F pero con voz.',
        ],
        analogy_es:
          'Es la misma boca de la F. Pon la boca de decir "fffff" y prende la voz: ahí salió la V.',
        chunks: [
          pal({ id: 'w-v-very', en: 'very', es: 'muy', s: 'véri (diente sobre labio)', why: '"Very" con B suena a "berry" (fruta). Nadie se muere, pero es el detalle que más te delata.', when: '"Very good", "very important". La usas todo el día.', d: ['berry', 'bery'] }),
          pal({ id: 'w-v-video', en: 'video', es: 'video', s: 'vídio', why: 'Cognado y con V: dos por una. Practícala aquí que es fácil y después la llevas a las difíciles.', when: 'Video call, video meeting.', d: ['bidio', 'vídeo'] }),
          W_SEVEN, // vuelve en t0-s10-uno-diez como el 7 de la lista, mismo id
          pal({ id: 'w-v-invoice', en: 'invoice', es: 'factura', s: 'ínvois', why: 'V en la mitad otra vez, y es palabra de trabajo que vas a necesitar: la factura.', when: '"Can I get an invoice?" en cualquier viaje de trabajo.', d: ['inboice', 'invois de compra'] }),
        ],
      },
      {
        id: 't0-s6-s-final',
        order: 3,
        nodeKind: 'sonido',
        parMinimo: ['work', 'works'],
        title_es: 'La -S final que sí se oye',
        scene_es: 'La letra que los hispanohablantes nos comemos y en inglés cambia el significado.',
        icon: '🐍',
        setup_es: [
          /* Decía "En Medellín (y en media Latinoamérica)". Nombrar una sola
             ciudad deja afuera al resto, que es justo lo que la regla evita. */
          'En media Latinoamérica nos comemos la S final: "la\' casa\'". Y eso se nos pasa al inglés.',
          'Problema: en inglés esa S es la que dice si hablas de uno o de varios, y si la acción es de él o tuya.',
        ],
        analogy_es:
          'La S final es la firma al pie del documento: chiquita, se te olvida, y sin ella el papel no vale.',
        chunks: [
          pal({ id: 'w-s-works', en: 'works', es: 'funciona / trabaja', s: 'uérks', why: '"It work" no existe. "It works" sí. Esa S es la que dice que hablas de "él/ella/eso".', when: '"It works!" cuando algo por fin sirve.', d: ['work', 'worked'] }),
          pal({ id: 'w-s-prices', en: 'prices', es: 'precios', s: 'práisis', why: 'Cuando la palabra ya termina en sonido de S, el plural agrega una sílaba entera: práis → práisis.', when: 'Preguntando por varios precios.', d: ['price', 'pricess'] }),
          pal({ id: 'w-s-needs', en: 'needs', es: 'necesita', s: 'níids', why: 'Aquí la S suena Z: níidz. Después de sonido con voz, la S se vuelve Z sola. No hay que estudiarlo, sale solo si la dices relajado.', when: '"He needs it today."', d: ['need', 'needed'] }),
          /* Era `w-s-thanks2`: la misma palabra con otro id. La repetición se
             queda (es el punto de la escena), el id duplicado no. */
          W_THANKS,
        ],
      },
      {
        id: 't0-s7-h',
        order: 4,
        nodeKind: 'sonido',
        parMinimo: ['hi', 'i'],
        title_es: 'La H que sí suena',
        scene_es: 'En español la H es muda. En inglés es una jota suave y sin ella cambia la palabra.',
        icon: '💨',
        setup_es: [
          '"Hola" en español: la H no suena. Por eso decimos "elo" en vez de "hello" y suena rarísimo.',
          'En inglés la H es un soplido, como una jota suavecita. No es la jota fuerte de "jarra": es más suave, casi un suspiro.',
        ],
        analogy_es:
          'Es el sonido de empañar un vidrio pa\' escribir con el dedo: "jaaa". Ese soplo es la H inglesa.',
        chunks: [
          pal({ id: 'w-h-hello', en: 'hello', es: 'hola', s: 'jelóu', why: 'Con la H sonando y el acento atrás: jelÓU. Sin H suena "elou" y ahí ya te ubicaron.', when: 'La primera palabra de todo.', d: ['elou', 'jálo'] }),
          /* Era `w-h-help`: mismo "help" con otro id. Ahora es el mismo objeto
             que trae t0-s3-salvavidas. */
          W_HELP,
          pal({ id: 'w-h-house', en: 'house', es: 'casa', s: 'jáus', why: 'Ojo doble: la H suena Y la "ou" suena "au". Jáus, no "jóus".', when: 'Hablando de dónde vives.', d: ['aus', 'jóus'] }),
          pal({ id: 'w-h-hour', en: 'hour', es: 'hora', s: 'áur', why: '⚠️ La excepción que confirma la regla: en "hour" la H NO suena. Áur. Es de las poquitas — hour, honest, honor.', when: '"One hour" = una hora.', hook: 'Mudas: hour, honest, honor. Todo lo demás sopla.', d: ['jáur', 'jour'] }),
        ],
      },
    ],
    task: {
      id: 't0-sonidos-task',
      intro_es: 'Nada de escribir. Esta tarea es de boca. Dilas en voz alta, aunque estés en el bus…',
      steps: [
        {
          goal_es: 'Agradécele a alguien. Saca la lengua en la TH y no te comas la S del final.',
          answerChunkId: 'w-th-thanks',
          reaction_es: 'Las dos difíciles en una sola palabra. Eso ya es nivel.',
        },
        {
          goal_es: 'Di "muy" en inglés con el diente sobre el labio. No es "berry".',
          answerChunkId: 'w-v-very',
          reaction_es: 'Eso. Ese detallito es el que hace que suenes distinto.',
        },
        {
          goal_es: 'Saluda soplando la H.',
          answerChunkId: 'w-h-hello',
          reaction_es: 'Jelóu. Ya no dices "elou". No hay vuelta atrás.',
        },
      ],
      done_es: 'Ya tienes los cinco sonidos. Los demás salen solos. ✓',
    },
  },

  /* ═══════════════ PARADA 3 · Sí, no, gracias, perdón ═══════════════ */
  {
    id: 't0-cortesia',
    tramo: 't0',
    order: 3,
    title_es: 'Sí, no, gracias, perdón',
    subtitle_es: 'Ocho palabras y ya eres educado.',
    arc_es: 'Con ocho palabras dejas de ser el que no habla y pasas a ser el que habla poquito.',
    emoji: '🙏',
    cardTheme: 'peach',
    icon: '🙏',
    survival: true,
    companionSetup_es: [
      'Ocho palabras. Con estas ocho no vas a conversar, pero sí vas a quedar bien.',
      'Y eso importa más de lo que crees: el que dice "please" y "sorry" tiene ayuda; el que se queda mudo, no.',
    ],
    scenes: [
      {
        id: 't0-s8-si-no',
        order: 1,
        nodeKind: 'palabras',
        title_es: 'Sí, no y por favor',
        scene_es: 'Lo mínimo pa\' responder cualquier cosa.',
        icon: '👍',
        setup_es: [
          'Empezamos por lo que se responde, no por lo que se pregunta. Es más fácil contestar que arrancar.',
          'Ojo con una: "please" no es opcional en inglés. Sin él, suenas mandón aunque no quieras.',
        ],
        analogy_es:
          /* Decía «el "¿me regala…?" nuestro»: ese "regala" para pedir algo es
             de un solo país y afuera no se dice. La idea era el "por favor"
             que damos por sentado, así que se dice así. */
          /* "deme", no "dame": lo entrecomillado es el CLIENTE hablándole a un
             mesero, y a un mesero se le habla de usted. La regla de
             lib/espanol-neutro.ts pide "tú" para la voz que ENSEÑA (Alfred), no
             para las citas de personaje que son el contenido enseñado — la
             misma distinción que el archivo hace con SLANG. La frase de Alfred
             alrededor sí va en tú. */
          'El "please" en inglés es ese "por favor" que nosotros damos por sentado. Nadie pide "deme un café" así, seco. Allá "give me a coffee" seco suena igual de feo.',
        chunks: [
          pal({ id: 'w-yes', en: 'yes', es: 'sí', s: 'iés', why: 'La Y suena "i". Iés. Y en corto la vas a oír como "yeah" (iéa), que es su "sí" relajado, el de todos los días.', when: 'Todo el día.', sos: true, d: ['yeah', 'no'] }),
          pal({ id: 'w-no', en: 'no', es: 'no', s: 'nóu', why: 'Igual escrita, pero suena "nóu" con la O larga. Un "no" seco a la española suena cortante.', when: 'Todo el día.', sos: true, d: ['not', 'know'] }),
          pal({ id: 'w-please', en: 'please', es: 'por favor', s: 'plíis', why: 'La palabra que convierte una orden en un pedido. Va al final de todo: "water, please", "one minute, please".', when: 'SIEMPRE que pidas algo. Sin excepción.', sos: true, frame: '___, please.', swaps: ['Water', 'One minute', 'Coffee'], d: ['plis', 'peace'] }),
          pal({ id: 'w-okay', en: 'okay', es: 'listo / de acuerdo', s: 'oukéi', why: 'La palabra más internacional que existe. Sirve pa\' "entendí", pa\' "de acuerdo" y pa\' llenar silencios mientras piensas.', when: 'Cuando te dicen algo y no sabes qué contestar.', d: ['okey dokey', 'of course'] }),
        ],
      },
      {
        id: 't0-s9-perdon',
        order: 2,
        nodeKind: 'palabras',
        title_es: 'Gracias y perdón',
        scene_es: 'Las cuatro que abren puertas.',
        icon: '🚪',
        setup_es: [
          'Aquí va una que en español no distinguimos y en inglés sí: hay dos "perdón" distintos.',
          '"Excuse me" es antes (pa\' interrumpir o pasar). "Sorry" es después (ya metiste la pata o ya lo pisaste).',
        ],
        analogy_es:
          '"Excuse me" es tocar la puerta. "Sorry" es recoger lo que se cayó. No se cambian de puesto.',
        chunks: [
          pal({ id: 'w-thankyou', en: 'thank you', es: 'gracias', s: 'zenk iú', why: 'Dos palabras, más formal que "thanks" a secas. En duda, esta: nunca queda mal.', when: 'Cuando te ayudan.', sos: true, d: ['thanks a lot', 'thank'] }),
          pal({ id: 'w-sorry', en: 'sorry', es: 'perdón / lo siento', s: 'sóri', why: 'Va DESPUÉS del error. También sirve pa\' "no te oí" si lo dices con tono de pregunta: "Sorry?"', when: 'Cuando metiste la pata o no entendiste.', sos: true, d: ['excuse me', 'sad'] }),
          pal({ id: 'w-excuseme', en: 'excuse me', es: 'permiso / disculpe', s: 'ekskiús mi', why: 'Va ANTES. Pa\' pasar entre la gente, pa\' interrumpir, pa\' llamar a un mesero. Es tu llave universal.', when: 'Antes de molestar a alguien.', sos: true, d: ['sorry', 'excuse'] }),
          pal({ id: 'w-ofcourse', en: 'of course', es: 'claro que sí', s: 'of córs', why: 'El "obvio, con mucho gusto". Suena amable y seguro a la vez, que es difícil de lograr con dos palabras.', when: 'Cuando te piden un favor y dices que sí.', d: ['off course', 'because'] }),
        ],
      },
    ],
    task: {
      id: 't0-cortesia-task',
      intro_es: 'Vas en un pasillo estrecho con un café en la mano. Cuidado…',
      steps: [
        {
          goal_es: 'Hay alguien parado en la mitad del pasillo y necesitas pasar. Dices…',
          answerChunkId: 'w-excuseme',
          reaction_es: 'Perfecto. Antes de molestar, "excuse me".',
        },
        {
          goal_es: 'Igual lo rozaste y se le movió el café. Ahora dices…',
          answerChunkId: 'w-sorry',
          reaction_es: 'Ahí está la diferencia. Antes "excuse me", después "sorry".',
        },
        {
          goal_es: 'Te ayudó a limpiar. Agradécele en formal.',
          answerChunkId: 'w-thankyou',
          reaction_es: 'Con ocho palabras ya quedaste como una persona educada. En serio.',
        },
      ],
      done_es: 'Ya sabes SER EDUCADO en inglés. ✓',
    },
    coach: {
      escenario_es: 'Alguien te ayuda con algo chiquito en la oficina.',
      meta_es: 'Que agradezcas y respondas. Una o dos palabras basta.',
      abridor_en: 'Here you go — this is for you.',
      abridor_es: 'Toma, esto es pa\' ti.',
      chunkIds: ['w-thankyou', 'w-please', 'w-okay', 'w-ofcourse', 'w-yes', 'w-no'],
      topeCorrecciones: 1,
    },
  },

  /* ═══════════════ PARADA 4 · Números que te cobran ═══════════════ */
  {
    id: 't0-numeros',
    tramo: 't0',
    order: 4,
    title_es: 'Números que te cobran',
    subtitle_es: 'Precios, horas, puertas y cuartos.',
    arc_es: 'Dejas de asentir cuando te dicen un precio que no entendiste.',
    emoji: '🔢',
    cardTheme: 'yellow',
    icon: '🔢',
    survival: true,
    companionSetup_es: [
      'Los números son lo primero que te van a decir rápido: el precio, la puerta, el cuarto, la hora.',
      'Y es donde más dinero se pierde por asentir sin entender. Vamos despacio.',
    ],
    scenes: [
      {
        id: 't0-s10-uno-diez',
        order: 1,
        nodeKind: 'palabras',
        title_es: 'Del uno al diez',
        scene_es: 'Los diez de siempre. Rápido.',
        icon: '🖐️',
        setup_es: ['Estos diez ya los oíste mil veces en canciones y películas.', 'Solo vamos a asegurar cómo suenan de verdad.'],
        analogy_es: 'Son los diez dedos: una vez los tienes, todo lo demás es combinarlos.',
        chunks: [
          /* Los `when` de los diez estaban vacíos y la ficha de detalle se
             quedaba sin la sección "¿CUÁNDO?": diez tarjetas cojas seguidas.
             Van todos con un uso concreto, no con "para contar". */
          pal({ id: 'w-n1', en: 'one', es: 'uno', s: 'uán', why: 'Se escribe "one" y suena "uán". De las más traicioneras del inglés.', when: '"One coffee, please." Con un número y "please" ya pediste.', d: ['won', 'on'] }),
          pal({ id: 'w-n2', en: 'two', es: 'dos', s: 'tú', why: 'La W no suena. Tú, simple.', when: '"Table for two" — entrando a un restaurante.', d: ['too', 'ten'] }),
          pal({ id: 'w-n3', en: 'three', es: 'tres', s: 'zríi', why: 'Con TH. Saca la lengua. Si te sale "tríi" igual te entienden.', when: 'Puerta tres, cuarto tres, tres dólares.', d: ['free', 'tree'] }),
          pal({ id: 'w-n4', en: 'four', es: 'cuatro', s: 'fóar', why: 'Ojo que suena parecido a "for" (para). El contexto lo resuelve.', when: 'Precios: "four fifty" son cuatro con cincuenta.', d: ['for', 'five'] }),
          pal({ id: 'w-n5', en: 'five', es: 'cinco', s: 'fáiv', why: 'Con V al final: diente sobre labio. Fáiv, no "fáib".', when: '"Five minutes" — lo que te dicen cuando falta poquito.', d: ['fine', 'four'] }),
          pal({ id: 'w-n6', en: 'six', es: 'seis', s: 'siks', why: 'Fácil. Sin trampa.', when: 'La hora de salir: "at six".', d: ['sick', 'seven'] }),
          /* El 7 de esta lista es el MISMO objeto que enseña la V en t0-s5-v.
             Antes era `w-n7`, un id aparte para la misma palabra. */
          W_SEVEN,
          pal({ id: 'w-n8', en: 'eight', es: 'ocho', s: 'éit', why: 'Se escribe con cuatro letras que no suenan. Éit y ya.', when: '"Eight thirty": la hora de reunión más común que existe.', d: ['ate', 'eighty'] }),
          pal({ id: 'w-n9', en: 'nine', es: 'nueve', s: 'náin', why: 'Náin. Ojo de no decir "nínе".', when: 'Puerta nueve, cuarto nueve, las nueve de la mañana.', d: ['nice', 'ninety'] }),
          pal({ id: 'w-n10', en: 'ten', es: 'diez', s: 'ten', why: 'Igualita como se lee. Un descanso.', when: '"It\'s ten dollars." El precio redondo de siempre.', d: ['tent', 'two'] }),
        ],
      },
      {
        id: 't0-s11-grandes',
        order: 2,
        nodeKind: 'palabras',
        title_es: 'Los que faltan',
        scene_es: 'Con seis más ya armas cualquier número que te digan.',
        icon: '💯',
        setup_es: [
          'No hay que aprenderse del 1 al 100. Con seis más ya los armas todos.',
          'Y ojo con la trampa de -TEEN y -TY: fifteen (15) y fifty (50) se parecen y la diferencia son 35 dólares.',
        ],
        analogy_es:
          'Es como los billetes: no necesitas conocer todos los precios, necesitas conocer los billetes. Con esos armas cualquier cuenta.',
        chunks: [
          pal({ id: 'w-n11', en: 'eleven', es: 'once', s: 'iléven', why: 'Del 11 al 12 son inventadas; del 13 en adelante hay regla.', when: 'Cuando te dan un número entre diez y veinte y dudas.', d: ['seven', 'twelve'] }),
          pal({ id: 'w-n15', en: 'fifteen', es: 'quince', s: 'fiftíin', why: '⚠️ El acento va ATRÁS: fifTÍIN. Ahí está la diferencia con "fifty".', when: 'Cuando te dicen un precio y dudas.', sos: true, d: ['fifty', 'five'] }),
          pal({ id: 'w-n50', en: 'fifty', es: 'cincuenta', s: 'fífti', why: '⚠️ Acento ADELANTE y termina en "i": FÍFti. Si no estás seguro, pregunta: "Five zero?"', when: 'Cuando te dicen un precio y dudas.', sos: true, d: ['fifteen', 'five'] }),
          pal({ id: 'w-n20', en: 'twenty', es: 'veinte', s: 'tuéni', why: 'En Estados Unidos se comen la T del medio: suena "tuéni", no "tuénti".', when: 'Precios y minutos. "Twenty dollars", "twenty minutes".', d: ['twelve', 'twenty-two'] }),
          pal({ id: 'w-n30', en: 'thirty', es: 'treinta', s: 'zérti', why: 'Con TH al principio. Zérti.', when: 'La media hora: "nine thirty", "ten thirty".', d: ['thirteen', 'three'] }),
          pal({ id: 'w-n100', en: 'a hundred', es: 'cien', s: 'a jándred', why: 'Con "a" adelante, no solo "hundred". Y sirve pa\' todo: two hundred, three hundred.', when: 'Precios grandes: un hotel, un pasaje, una multa.', frame: '___ hundred', swaps: ['Two', 'Three', 'Five'], d: ['hundreds', 'thousand'] }),
        ],
      },
      {
        id: 't0-s12-cobran',
        order: 3,
        title_es: 'Cuando te los dicen rápido',
        scene_es: 'Precio, cuarto, puerta y hora: cómo suenan de verdad.',
        icon: '🧾',
        setup_es: [
          'Aquí está el problema real: nadie te dice los números sueltos. Te los dicen pegados y rápido.',
          'Te muestro cómo suenan de verdad pa\' que no te agarren desprevenido.',
        ],
        analogy_es:
          'Es como la placa de un auto: no la lees número por número, la lees de un solo golpe. Ellos hacen lo mismo con los precios.',
        chunks: [
          fr({ id: 'c-t0-four-fifty', en: "It's four fifty.", es: 'Son cuatro con cincuenta.', s: 'its fóar fífti', why: 'No dicen "four dollars and fifty cents". Dicen "four fifty" y ya. Los centavos van pegados, sin nada en el medio.', when: 'Pagando un café.', sos: true, frame: "It's ___.", swaps: ['four fifty', 'ten', 'twenty-five'], d: ['It\'s four fifteen.', 'It\'s forty.'] }),
          fr({ id: 'c-t0-how-much-again', en: 'Sorry, how much?', es: 'Perdón, ¿cuánto?', s: 'sóri, jáu mach', why: 'Tu red de seguridad. Preguntar dos veces no es de bruto: es de que no te cobren de más. Nadie se ofende.', when: 'Cuando no entendiste el precio.', sos: true, d: ['Sorry, how many?', 'Sorry, how long?'] }),
          fr({ id: 'c-t0-room-314', en: "Room three fourteen.", es: 'Cuarto trescientos catorce.', s: 'rum zríi fortíin', why: 'Los cuartos se dicen por pedazos: 314 = "three fourteen", no "three hundred fourteen". Igual las puertas del aeropuerto.', when: 'Check-in del hotel.', frame: 'Room ___.', swaps: ['three fourteen', 'two oh five', 'twelve'], d: ['Room three hundred fourteen.', 'Room thirty-four.'] }),
          fr({ id: 'c-t0-gate-twelve', en: 'Gate twelve.', es: 'Puerta doce.', s: 'guéit tuélv', why: '"Gate" es la puerta de embarque. Si es con letra: "gate B twelve" = "guéit bi tuélv".', when: 'Aeropuerto.', frame: 'Gate ___.', swaps: ['twelve', 'B twelve', 'nine'], d: ['Gate twenty.', 'Door twelve.'] }),
          fr({ id: 'c-t0-nine-thirty', en: "At nine thirty.", es: 'A las nueve y media.', s: 'at náin zérti', why: 'La hora también va pegada: 9:30 = "nine thirty". No hay "y media" que valga; se dicen los dos números seguidos.', when: 'Agendando una reunión o un vuelo.', frame: 'At ___.', swaps: ['nine thirty', 'ten', 'two fifteen'], d: ['At nine and half.', 'At thirty nine.'] }),
        ],
      },
    ],
    task: {
      id: 't0-numeros-task',
      intro_es: 'Estás pagando un café en el aeropuerto y tienes que correr a la puerta…',
      steps: [
        {
          goal_es: 'La cajera dijo el precio rapidísimo y no entendiste. Pregunta otra vez.',
          answerChunkId: 'c-t0-how-much-again',
          reaction_es: 'Eso. Preguntar no cuesta nada; asentir sin entender sí.',
        },
        {
          goal_es: 'Repitió: cuatro con cincuenta. Repítelo tú pa\' confirmar.',
          answerChunkId: 'c-t0-four-fifty',
          reaction_es: 'Perfecto. Y no dijiste "four dollars and fifty cents" como el manual.',
        },
        {
          goal_es: 'Miras el tablero: tu vuelo sale por la doce. Dilo.',
          answerChunkId: 'c-t0-gate-twelve',
          reaction_es: 'Listo, ya no te vas a perder por un número.',
        },
      ],
      done_es: 'Ya sabes NÚMEROS. Nadie te cobra de más. ✓',
    },
    coach: {
      escenario_es: 'Estás pagando algo y el cajero te dice el precio.',
      meta_es: 'Que entiendas el precio o preguntes de nuevo sin pena.',
      abridor_en: "That'll be twelve fifty, please.",
      abridor_es: 'Son doce con cincuenta, por favor.',
      chunkIds: ['c-t0-how-much-again', 'c-t0-four-fifty', 'w-please', 'w-thankyou', 'w-n15', 'w-n50'],
      topeCorrecciones: 1,
    },
  },

  /* ═══════════════ PARADA 5 · I am / you are / it is ═══════════════ */
  {
    id: 't0-ser-estar',
    tramo: 't0',
    order: 5,
    title_es: 'I am · you are · it is',
    subtitle_es: 'Tres verbos que sostienen todo el nivel.',
    arc_es: 'Con tres piecitas empiezas a armar frases tuyas, no repetidas.',
    emoji: '🧱',
    cardTheme: 'blue',
    icon: '🧱',
    survival: false,
    companionSetup_es: [
      'Aquí empieza lo bueno: estas tres piezas arman como el 40% de todo lo que vas a decir en A1.',
      'Y una noticia buena: en inglés no existe la diferencia ser/estar. "I am" sirve pa\' las dos. Menos cosas que pensar.',
    ],
    scenes: [
      {
        id: 't0-s13-im',
        order: 1,
        title_es: 'I\'m — yo soy, yo estoy',
        scene_es: 'La pieza más usada del idioma.',
        icon: '🙋',
        setup_es: [
          '"I am" se dice pegado casi siempre: "I\'m" (áim). Decirlo separado suena a robot.',
          'Y acuérdate: sirve pa\' ser Y pa\' estar. "I\'m tired" es "estoy cansado", no "soy cansado".',
        ],
        analogy_es:
          'Piensa en "I\'m" como el enchufe: le conectas cualquier cosa detrás — un nombre, un país, un estado de ánimo — y prende.',
        chunks: [
          fr({ id: 'c-t0-im-ana', en: "I'm Ana.", es: 'Soy Ana.', s: 'áim Ána', why: 'La presentación más corta que existe. Ni "my name is" ni nada: dos palabras y ya te presentaste.', when: 'Cuando alguien te pregunta quién eres.', frame: "I'm ___.", swaps: ['Ana', 'Felipe', 'Gus'], d: ['I Ana.', 'Me Ana.'] }),
          fr({ id: 'c-t0-im-tired', en: "I'm tired.", es: 'Estoy cansado.', s: 'áim táiard', why: 'Aquí se ve que "I\'m" también es ESTAR. En inglés no hay que escoger entre ser y estar — ese problema no existe.', when: 'Small talk, después de un vuelo largo.', frame: "I'm ___.", swaps: ['tired', 'ready', 'busy'], d: ['I have tired.', 'I am tire.'] }),
          fr({ id: 'c-t0-im-ready', en: "I'm ready.", es: 'Estoy listo.', s: 'áim rédi', why: 'Dos palabras que te sacan de mil situaciones: en una reunión, en un taxi, en una fila.', when: 'Cuando te preguntan si arrancamos.', d: ['I ready.', "I'm read."] }),
          fr({ id: 'c-t0-im-lost', en: "I'm lost.", es: 'Estoy perdido.', s: 'áim lóst', why: 'Dos palabras y la gente para lo que está haciendo pa\' ayudarte. De las que más rinden por sílaba.', when: 'En la calle, en un aeropuerto, en un edificio.', sos: true, d: ['I lost.', "I'm loss."] }),

          /* ↓ MUDADOS del tronco. Texto verbatim del core (por eso tutean):
             el id es la clave del SRS y el texto ya estaba aprobado. */

          // Venía de u1-llegar / u1-s3-presentarte.
          fr({ id: 'c-im-new-here', en: "I'm new here.", es: 'Soy nuevo aquí.', s: 'áim niú jíar', why: 'Tu carné de recién llegado. Bájale a las expectativas y todo el mundo te ayuda. Es una frase-escudo, no una vergüenza.', when: 'Cuando quieres que te tengan paciencia.', d: ["I'm fine here.", "I'm not here."] }),

          /* Venía de u3-presentarte / u3-s2-quien-eres.
             El molde es lo que se enseña y el país es solo el relleno, así que
             la lista cubre la región entera: quien lo abra desde Chile o desde
             México encuentra el suyo sin tener que imaginárselo. El `id` NO se
             toca aunque nombre a Colombia — es la clave del progreso y
             renombrarla se lo borra a quien ya lo hizo. */
          fr({ id: 'c-im-from-colombia', en: "I'm from Colombia.", es: 'Soy de Colombia.', s: 'áim from colómbia', why: 'Tu molde pa\' decir de dónde vienes: cambias el país y ya. Es la banderita que te pones en el pecho sin tener que explicar más.', when: 'Cuando te preguntan de dónde eres.', frame: "I'm from ___.", swaps: ['Colombia', 'Chile', 'Mexico', 'Peru', 'Argentina', 'Venezuela', 'Ecuador', 'Spain'], d: ['I live in Colombia.', 'I go to Colombia.'] }),
        ],
      },
      {
        id: 't0-s14-are-you',
        order: 2,
        title_es: 'Are you…? — y cómo se contesta',
        scene_es: 'Preguntar y responder sin repetir toda la frase.',
        icon: '❓',
        setup_es: [
          'Pa\' preguntar, el inglés voltea el orden: "you are" → "are you?". Nada más. No hay que agregar palabras.',
          'Y pa\' contestar NO se repite todo. "Yes, I am" o "No, I\'m not". Cortito.',
        ],
        analogy_es:
          'Es como voltear un interruptor: las mismas dos piezas, en el otro orden, y ya no afirma — pregunta.',
        chunks: [
          fr({ id: 'c-t0-are-you-sarah', en: 'Are you Sarah?', es: '¿Eres Sarah?', s: 'ar iú Sára', why: 'Voltéalo y ya es pregunta. Sirve pa\' confirmar a alguien que estás esperando.', when: 'Cuando recoges a alguien o llegas a una reunión.', frame: 'Are you ___?', swaps: ['Sarah', 'the manager', 'new here'], d: ['You are Sarah?', 'Is you Sarah?'] }),
          fr({ id: 'c-t0-yes-i-am', en: 'Yes, I am.', es: 'Sí, soy yo.', s: 'iés, ái ám', why: 'Ojo: aquí NO se puede decir "Yes, I\'m". La versión pegada no puede quedar de última en la frase. Es la única regla rara de hoy.', when: 'Contestando cualquier "Are you…?".', d: ["Yes, I'm.", 'Yes, I do.'] }),
          fr({ id: 'c-t0-no-im-not', en: "No, I'm not.", es: 'No, no soy.', s: 'nóu, áim nót', why: 'Pa\' negar solo se le mete "not" al medio. No hay que aprender otra palabra: la misma pieza con un tornillo más.', when: 'Cuando te confunden con otro.', d: ['No, I not.', "No, I don't."] }),
          fr({ id: 'c-t0-are-you-ready', en: 'Are you ready?', es: '¿Estás listo?', s: 'ar iú rédi', why: 'La vas a oír diez veces al día: antes de una llamada, de salir, de empezar algo.', when: 'Antes de arrancar cualquier cosa.', d: ['You ready are?', 'Do you ready?'] }),
        ],
      },
      {
        id: 't0-s15-it-is',
        order: 3,
        title_es: "It's — pa' las cosas",
        scene_es: 'La pieza pa\' hablar de cosas, precios, lugares y el clima.',
        icon: '📦',
        setup_es: [
          '"It" es "eso/esa cosa". Y "it\'s" es la pieza pa\' hablar de cualquier cosa que no sea una persona.',
          'Dato raro pero útil: en inglés hasta el clima necesita un "it". "It\'s cold" — literalmente "eso está frío".',
        ],
        analogy_es:
          'En español decimos "está lejos" y ya. El inglés siempre exige un sujeto, aunque sea de mentiras. "It" es ese relleno obligatorio.',
        chunks: [
          fr({ id: 'c-t0-its-here', en: "It's here.", es: 'Está aquí.', s: 'its jíar', why: 'Dos palabras que resuelven cualquier "¿dónde está?". Y con "there" (aí) resuelve el "allá".', when: 'Señalando algo.', frame: "It's ___.", swaps: ['here', 'there', 'closed'], d: ['Is here.', "It's hear."] }),
          fr({ id: 'c-t0-its-not-working', en: "It's not working.", es: 'No funciona.', s: 'its nót uérkin', why: 'La frase más útil de todo el viaje: el aire, el wifi, la llave, el ascensor. Todo se rompe con la misma frase.', when: 'Hotel, oficina, cualquier aparato.', sos: true, frame: 'The ___ is not working.', swaps: ['wifi', 'AC', 'key'], d: ["It's not work.", "It doesn't working."] }),
          fr({ id: 'c-t0-its-ten-dollars', en: "It's ten dollars.", es: 'Son diez dólares.', s: 'its ten dólars', why: 'Fíjate que en inglés es "ES diez dólares", singular. No se pluraliza el verbo como nosotros.', when: 'Diciendo o confirmando un precio.', frame: "It's ___ dollars.", swaps: ['ten', 'twenty', 'fifty'], d: ['They are ten dollars.', "It's ten dollar."] }),
          fr({ id: 'c-t0-is-it-far', en: 'Is it far?', es: '¿Queda lejos?', s: 'is it fár', why: 'Volteas "it is" y ya preguntas. Tres palabras que te ahorran una caminata de cuarenta minutos.', when: 'Pidiendo una dirección.', sos: true, d: ['It is far?', 'Is far?'] }),
        ],
      },
    ],
    task: {
      id: 't0-ser-estar-task',
      intro_es: 'Llegaste al lobby de una oficina. Te están esperando…',
      steps: [
        {
          goal_es: 'Se acerca alguien y no sabes si es quien te espera. Pregúntale si es Sarah.',
          answerChunkId: 'c-t0-are-you-sarah',
          reaction_es: 'Tres palabras y resolviste. No hacía falta más.',
        },
        {
          goal_es: 'Te pregunta "Are you Ana?". Confirma.',
          answerChunkId: 'c-t0-yes-i-am',
          reaction_es: 'Y bien: "Yes, I am", no "Yes, I\'m". Esa la falla todo el mundo.',
        },
        {
          goal_es: 'Te pregunta si arrancamos. Dile que estás listo.',
          answerChunkId: 'c-t0-im-ready',
          reaction_es: 'Con tres piezas ya sostuviste un intercambio entero.',
        },
      ],
      done_es: 'Ya armas frases TUYAS, no repetidas. ✓',
    },
    coach: {
      escenario_es: 'Llegas a un lugar y alguien viene a recibirte.',
      meta_es: 'Que digas quién eres y confirmes que estás listo.',
      abridor_en: "Hi! Are you the new person? I'm Sarah.",
      abridor_es: '¡Hola! ¿Tú eres la persona nueva? Yo soy Sarah.',
      chunkIds: [
        'c-t0-im-ana', 'c-t0-yes-i-am', 'c-t0-no-im-not', 'c-t0-im-ready',
        'c-t0-are-you-sarah', 'c-t0-im-tired', 'w-thankyou', 'w-okay',
      ],
      // UNA. Todo el Tramo 0 corrige una sola vez por conversación
      // (COACH-diseño R2): acá la persona lleva días de inglés y comete un
      // error cada cuatro palabras. La segunda corrección no enseña nada nuevo
      // — solo confirma que la están mirando. Hay test que lo clava.
      topeCorrecciones: 1,
    },
  },

  /* ═══════════════ PARADA 6 · Las seis preguntas ═══════════════ */
  {
    id: 't0-preguntas',
    tramo: 't0',
    order: 6,
    title_es: 'Las seis preguntas',
    subtitle_es: 'Una palabra pide más que una frase entera.',
    arc_es: 'Dejas de depender de que te hablen: ahora preguntas tú.',
    emoji: '🗝️',
    cardTheme: 'green',
    icon: '🗝️',
    survival: true,
    companionSetup_es: [
      'Última parada del tramo. Y la más rentable: seis preguntas.',
      'Con estas seis ya no dependes de que alguien te hable primero. Ya puedes arrancar tú.',
    ],
    scenes: [
      {
        id: 't0-s16-donde-cuanto',
        order: 1,
        title_es: 'Dónde · cuánto · quién eres',
        scene_es: 'Las tres que resuelven un día afuera, y las dos de conocer a alguien.',
        icon: '📍',
        setup_es: [
          'Estas tres las vas a usar todos los días de tu vida afuera. Todos.',
          'Y algo importante: si solo dices la palabra suelta — "Bathroom?" — también funciona. No es lo más elegante, pero funciona y nadie se enoja.',
        ],
        analogy_es:
          'Son las tres llaves del llavero: dónde, cuánto y a qué hora. Con esas tres abres casi cualquier puerta del día.',
        chunks: [
          /* Este es el chunk de u5-ayuda, IMPORTADO — no una copia. Antes acá
             había un `c-t0-where-bathroom` con el mismo inglés y otro id, o sea
             dos entradas Leitner para la misma frase. El id que sobrevive es el
             viejo (el que tiene progreso guardado) y el texto que sobrevive es
             el de este tramo. La nota larga está en core.ts. */
          C_WHERE_IS_BATHROOM,
          fr({ id: 'c-t0-how-much', en: 'How much is it?', es: '¿Cuánto cuesta?', s: 'jáu mach is it', why: '"How much" es pa\' dinero y pa\' cosas que no se cuentan. Si son cosas contables (maletas, personas) es "how many".', when: 'Comprando cualquier cosa.', sos: true, hook: 'much = dinero y cosas que no se cuentan · many = cosas que sí (bags, people).', d: ['How many is it?', 'How much it is?'] }),
          fr({ id: 'c-t0-what-time', en: 'What time is it?', es: '¿Qué hora es?', s: 'uát táim is it', why: 'Y con el mismo molde: "What time is the meeting?", "What time is checkout?". Sirve pa\' todo lo que tenga hora.', when: 'Todo el día.', frame: 'What time is ___?', swaps: ['it', 'the meeting', 'checkout'], d: ['What hour is it?', 'What is the time it?'] }),
          fr({ id: 'c-t0-where-from', en: 'Where are you from?', es: '¿De dónde eres?', s: 'uér ar iú from', why: 'La pregunta de arranque universal cuando conoces a alguien. Y te la van a hacer a ti en el minuto dos.', when: 'Conociendo a alguien.', d: ['Where you from are?', 'From where you?'] }),

          /* ↓ MUDADOS del tronco (u1-llegar / u1-s2-conocer, la escena que se
             borró). Van acá y no en t0-s17 porque hacen trío con
             "Where are you from?": las tres de conocer a alguien juntas.
             Texto verbatim del core, por eso tutean. */
          fr({ id: 'c-whats-your-name', en: "What's your name?", es: '¿Cómo te llamas?', s: 'guáts iór néim', why: 'La llave pa\' conocer a cualquiera. Cortita y educada; con eso arrancas toda presentación.', when: 'Cuando quieres saber cómo se llama alguien.', d: ['What is your work?', "Where's your name?"] }),
          fr({ id: 'c-nice-to-meet-you', en: 'Nice to meet you.', es: 'Mucho gusto.', s: 'náis tu mít iú', why: 'El apretón de manos hecho frase. Se dice UNA vez, el día que conoces a alguien. Como estrenar zapatos: solo el primer día.', when: 'El día que conoces a alguien, una sola vez.', d: ['Nice to see you again.', 'Meet you nice.'] }),
        ],
      },
      {
        id: 't0-s17-cual-quien',
        order: 2,
        title_es: 'Cuál · quién · cuánto tiempo',
        scene_es: 'Las tres que te sacan de la duda cuando ya te hablaron.',
        icon: '🤔',
        setup_es: [
          'Estas tres son de repuesto: cuando ya te dijeron algo y quedaste con la duda.',
          'Fíjate que dos son de UNA palabra. En inglés eso es normal y no suena grosero.',
        ],
        analogy_es:
          'Son el "¿ah?" educado. En vez de quedarte con cara de nada, tiras una palabra y la otra persona completa.',
        chunks: [
          fr({ id: 'c-t0-which-one', en: 'Which one?', es: '¿Cuál?', s: 'uích uán', why: 'Dos palabras. Cuando te señalaron algo entre varios y no entendiste cuál. No suena grosero, suena práctico.', when: 'Cuando hay más de una opción.', sos: true, d: ['What one?', 'Which is?'] }),
          fr({ id: 'c-t0-who-is-it', en: 'Who is it?', es: '¿Quién es?', s: 'jú is it', why: 'Ojo: "who" se escribe con W pero suena "jú". La W no suena, la H sí. Al revés de lo que esperas.', when: 'Al teléfono o en la puerta.', d: ['Whose is it?', 'How is it?'] }),
          fr({ id: 'c-t0-how-long', en: 'How long?', es: '¿Cuánto tiempo?', s: 'jáu lóng', why: 'Dos palabras pa\' tiempo. "How long is the flight?", "How long are you staying?" — esta te la van a hacer en migración, ojo.', when: 'Preguntando duración.', sos: true, frame: 'How long is the ___?', swaps: ['flight', 'meeting', 'wait'], d: ['How much time?', 'How far?'] }),
          fr({ id: 'c-t0-can-you-help', en: 'Can you help me?', es: '¿Me puedes ayudar?', s: 'kan iú jélp mi', why: 'La que abre todas las anteriores. Dila primero y la gente se pone en modo ayudar antes de que preguntes nada.', when: 'Antes de cualquier pregunta difícil.', sos: true, d: ['Can you help?', 'You can help me?'] }),
        ],
      },
    ],
    task: {
      id: 't0-preguntas-task',
      intro_es: 'Estás en una ciudad nueva, solo, con el celular en 8%. A resolver…',
      steps: [
        {
          goal_es: 'Paras a alguien en la calle. Antes de preguntar nada, pídele ayuda.',
          answerChunkId: 'c-t0-can-you-help',
          reaction_es: 'Bien jugado. Primero la puerta, después la pregunta.',
        },
        {
          goal_es: 'Necesitas un baño, urgente. Pregunta.',
          answerChunkId: 'c-where-is-bathroom',
          reaction_es: 'Esa pregunta te va a acompañar toda la vida.',
        },
        {
          goal_es: 'Te ofrecen llevarte en taxi. Pregunta cuánto.',
          answerChunkId: 'c-t0-how-much',
          reaction_es: 'Y con eso cerraste el Tramo 0. Ya preguntas, ya respondes, ya pides.',
        },
      ],
      done_es: 'Ya PREGUNTAS. Ya no dependes de nadie. ✓',
    },
    coach: {
      escenario_es: 'Estás perdido en una ciudad que no conoces y paras a alguien.',
      meta_es: 'Que consigas la dirección y sepas cuánto cuesta llegar.',
      abridor_en: 'Hey, you look a bit lost. Everything okay?',
      abridor_es: 'Ey, te veo medio perdido. ¿Todo bien?',
      chunkIds: [
        'c-t0-can-you-help', 'c-t0-im-lost', 'c-where-is-bathroom', 'c-t0-how-much',
        'c-t0-is-it-far', 'c-t0-how-long', 'c-t0-which-one', 'w-thankyou', 'w-please',
      ],
      // UNA, como todo el Tramo 0. Y acá menos que en ninguna: la persona está
      // perdida en una ciudad y pidiendo ayuda. Corregirla dos veces en ese
      // momento es enseñarle que pedir ayuda cuesta caro.
      topeCorrecciones: 1,
    },
  },
];
