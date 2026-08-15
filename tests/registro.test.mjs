import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/* EL REGISTRO — que la app siga hablando español latino neutro.

   La regla vive en src/lib/espanol-neutro.ts y este test la hace cumplir sobre
   las CADENAS DE CARA AL USUARIO de todo src/. Existe porque el registro ya se
   arregló una vez y se volvió a romper: el pase anterior tocó tres archivos de
   contenido y dejó fuera la interfaz entera, así que Alfred siguió saludando
   con "Todo fresco… suave" —con "fresco" literalmente en la lista de palabras
   prohibidas de la propia regla— hasta que el usuario lo vio en producción.

   ── LO DIFÍCIL NO ES LA LISTA, ES DÓNDE MIRAR ──────────────────────────────
   La regla exime dos cosas y confundirlas arruina el trabajo en las dos
   direcciones:

     · LOS COMENTARIOS del repo. Son para quien programa. Hay decenas de
       "suave" y "fresco" ahí ("una lente suave", "un degradado suave", "una
       versión fresca sin re-suscribir") y ninguno es una violación.
     · LOS IDENTIFICADORES. `const SUAVE = 0.32` en losa-vidrio.tsx, `frescas`
       como campo de Metricas en stores/a1.ts, `animate-spin` como clase de
       Tailwind. Tampoco.

   Por eso el test no corre un regex sobre el archivo: primero EXTRAE los
   tramos que puede leer el usuario (contenido de literales de cadena y texto
   JSX) y solo después busca. `tramosDeTexto` es esa extracción.

   ── POR QUÉ HAY UN AUTOTEST DEL DETECTOR ───────────────────────────────────
   Porque un detector con agujeros no falla: da "limpio". El primero que se
   escribió tuvo TRES, y cada uno se comió violaciones reales que estaban a la
   vista:

     1. `'` de prosa abriendo una cadena falsa. En `` `…listas pa' refrescar` ``
        el apóstrofo de "pa'" se leía como comilla de apertura y se tragaba el
        resto del archivo: por eso no veía el `eyebrow="Todo fresco"` que estaba
        160 líneas más abajo, en el MISMO archivo que la violación que sí veía.
     2. `>` tragando código. Al ver cualquier `>` saltaba hasta el próximo `<`,
        así que `n > 0 ? 'una cosa' : 'otra'` se llevaba por delante las dos
        cadenas sin mirarlas.
     3. `\b` contra letras acentuadas. En JS `\w` es [A-Za-z0-9_], así que en
        "Probándote" hay un límite de palabra entre la "á" y la "n" y el patrón
        `probá\b` daba positivo. Al revés también: `repetí\b` no cazaba
        "Repetila" —el voseo con pronombre pegado PIERDE el acento— y esa era
        una violación de verdad en sesion.tsx.

   Los tres se pinan abajo en «el detector caza lo que tiene que cazar». Si
   alguien reescribe el extractor, ese test es el que avisa. */

const RAIZ = new URL('../', import.meta.url);
const SRC = fileURLToPath(new URL('src/', RAIZ));

/* ══════════════════════════════════════════════════════════════════════════
   1 · EXTRAER LO QUE LEE EL USUARIO
   ══════════════════════════════════════════════════════════════════════════ */

/** Recorre un .ts/.tsx carácter a carácter y devuelve los tramos de texto que
    puede llegar a leer el usuario: el contenido de los literales de cadena
    (comillas simples, dobles y plantillas) y el texto JSX suelto entre
    etiquetas. Deja fuera comentarios y código. */
export function tramosDeTexto(src) {
  const out = [];
  const n = src.length;
  let i = 0;
  let linea = 1;
  /** Llaves de código abiertas dentro de la interpolación actual. */
  let llaves = 0;
  /** Una entrada por plantilla que quedó a medias en un `${`. */
  const pilaPlantilla = [];

  const empujar = (texto, l) => {
    if (/[a-záéíóúñü]/i.test(texto)) out.push({ linea: l, texto });
  };

  /* ¿Lo que sigue a un `>` es texto JSX y no código? Se exige un corrido de
     tres letras (descarta `a > b && c`) y cero caracteres que solo viven en el
     código. El apóstrofo SÍ se permite: dentro de JSX es prosa, no comilla. */
  const pareceTextoJsx = (s) => /[a-záéíóúñü]{3}/i.test(s) && !/[;=(){}[\]`]/.test(s);

  /** Lee una plantilla desde `i` (ya pasada la comilla invertida). Corta al
      cerrar la plantilla o al empezar una interpolación. */
  const leerPlantilla = () => {
    let buf = '';
    let l0 = linea;
    while (i < n) {
      if (src[i] === '\\') { buf += src[i + 1] ?? ''; i += 2; continue; }
      if (src[i] === '`') { i++; break; }
      if (src[i] === '$' && src[i + 1] === '{') {
        i += 2;
        pilaPlantilla.push(llaves);
        llaves = 0;
        break;
      }
      if (src[i] === '\n') { empujar(buf, l0); buf = ''; linea++; l0 = linea; i++; continue; }
      buf += src[i]; i++;
    }
    empujar(buf, l0);
  };

  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];

    if (c === '\n') { linea++; i++; continue; }

    if (c === '/' && c2 === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && c2 === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') linea++; i++; }
      i += 2;
      continue;
    }

    if (c === "'" || c === '"') {
      const l0 = linea;
      let j = i + 1;
      let buf = '';
      let cerrada = false;
      while (j < n) {
        if (src[j] === '\\') { buf += src[j + 1] === 'n' ? ' ' : (src[j + 1] ?? ''); j += 2; continue; }
        /* En JS un literal '…' o "…" NO puede llevar un salto de línea crudo.
           Si aparece uno, esa comilla no abría una cadena: era un apóstrofo de
           prosa. Se rebobina y se sigue leyendo como texto. */
        if (src[j] === '\n') break;
        if (src[j] === c) { cerrada = true; break; }
        buf += src[j]; j++;
      }
      if (!cerrada) { i++; continue; }
      i = j + 1;
      empujar(buf, l0);
      continue;
    }

    if (c === '`') { i++; leerPlantilla(); continue; }

    if (c === '{') { llaves++; i++; continue; }
    if (c === '}') {
      if (llaves === 0 && pilaPlantilla.length) {
        llaves = pilaPlantilla.pop();
        i++;
        leerPlantilla();
        continue;
      }
      if (llaves > 0) llaves--;
      i++;
      continue;
    }

    if (c === '>') {
      let j = i + 1;
      let buf = '';
      let saltos = 0;
      while (j < n && src[j] !== '<' && src[j] !== '{' && src[j] !== '}') {
        if (src[j] === '\n') saltos++;
        buf += src[j]; j++;
      }
      /* Solo se CONSUME si de verdad parece texto: si no, se avanza un carácter
         y el bucle sigue leyendo las cadenas de adentro como cadenas. */
      if (pareceTextoJsx(buf)) {
        empujar(buf.replace(/\s+/g, ' ').trim(), linea);
        linea += saltos;
        i = j;
      } else {
        i++;
      }
      continue;
    }

    i++;
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · QUÉ ES UNA VIOLACIÓN
   ══════════════════════════════════════════════════════════════════════════ */

/** Límite de palabra que entiende acentos. `\b` no sirve: para JS la "á" no es
    letra, así que `probá\b` da positivo dentro de "Probándote". */
const LETRA = 'a-zA-ZáéíóúüñÁÉÍÓÚÜÑ';
const pal = (cuerpo) => new RegExp(`(?<![${LETRA}])(?:${cuerpo})(?![${LETRA}])`, 'i');

/* Raíces de verbo para el voseo con pronombre pegado ("decilo", "avisale").
   Es una lista y no un patrón a propósito: al pegar el pronombre el acento
   DESAPARECE ("repetí" → "repetila"), así que lo único que distingue el voseo
   del español neutro es que la forma correcta lleva tilde ("repítela") y esta
   no. Sin saber que la raíz es un verbo, "repetila" es indistinguible de
   cualquier palabra llana terminada en -la. */
const RAICES_VOSEO =
  'repeti|deci|hace|mira|escucha|toma|deja|conta|pone|tene|veni|anda|segui|proba|' +
  'usa|manda|pedi|abri|escribi|subi|baja|empeza|elegi|busca|entra|espera|avisa|' +
  'agarra|senta|levanta|acorda|fija|queda|calla|anota|marca|arranca|cambia|guarda|' +
  'revisa|saca|mete|pasa|llama|cierra|prende|apaga|arma|suelta|lee|apura|ayuda|' +
  'cuenta|prepara|termina|acepta|olvida|despedi|acerca|apunta|firma|repasa';

const PROHIBIDAS = [
  // ── las de la lista negra de espanol-neutro.ts ────────────────────────────
  ['parce', pal('parce|parcer[oa]s?')],
  ['pana (amigo)', pal('panas')],
  ['güey / wey', pal('g[üu]ey|wey')],
  ['boludo', pal('bolud[oa]s?')],
  ['chévere', pal('ch[ée]vere')],
  ['bacano', pal('bacan[oa]s?')],
  ['berraco', pal('[bv]erra[ck][oa]s?')],
  ['hágale', pal('h[áa]gale')],
  ['dale pues / listo pues', pal('(?:dale|listo|bueno)\\s+pues')],
  ['ahorita', pal('ahorita')],
  ['platicar', pal('platic[a-záéíóú]*')],

  /* ── "gringo" ──────────────────────────────────────────────────────────────
     No estaba en la lista original y el pase anterior lo dejó pasar
     argumentando que era estándar de doblaje latino. Se equivocó: la carga de
     la palabra CAMBIA según el país —en unos es neutra y cariñosa, en otros
     despectiva— que es exactamente el criterio de la regla. Decisión del
     usuario, 2026-08-09. La forma de arreglarlo no es meter "estadounidense"
     a la fuerza: es decir de dónde es la costumbre y no etiquetar a la
     persona ("en las tiendas de allá", "en inglés se comen la T"). */
  ['gringo', pal('gring[oa]s?')],

  // ── voseo ─────────────────────────────────────────────────────────────────
  ['vos', pal('vos|vosotros')],
  ['usted (a quien aprende)', pal('usted')],
  /* La tilde es TODO lo que distingue el voseo del "tú": "sabés" es voseo,
     "sabes" es la forma correcta y aparece 30 veces en el contenido bueno. Un
     `[ée]` acá marcaba en rojo medio core.ts. */
  ['voseo presente', pal('tenés|podés|querés|sabés|hacés|decís|vivís|venís|andás|querés')],
  /* Imperativos en -á / -é: no chocan con nada del español con "tú" (el
     pretérito de -ar es "-é" y el de -er/-ir es "-í", nunca "-á"). Los de -ir
     ("decí", "vení", "seguí") SÍ chocan con el pretérito de yo ("yo seguí") y
     por eso no van sueltos: se cazan abajo, con el pronombre pegado. */
  ['voseo imperativo', pal('(?:mir|tom|dej|cont|and|prob|us|mand|baj|par|empez|busc|entr|esper|avis|agarr|anot|marc|toc|arranc|cambi|guard|revis|sac|met|pas|llam|cierr|prend|apag|arm|suelt|apur|ayud|habl|cant|salt|camin|llev)á|(?:hac|ten|pon|corr|com|volv|aprend|respond|escog|cre|beb)é')],
  /* `(?!tomate)`: la única palabra corriente del español que se descompone en
     una de estas raíces más un pronombre. "roja como un tomate" no es voseo. */
  ['voseo con pronombre', pal(`(?!tomate)(?:${RAICES_VOSEO})(?:lo|la|los|las|me|le|les|nos|te)`)],

  /* ── "fresco" y "suave" de jerga ───────────────────────────────────────────
     Van con contexto y no como palabra suelta porque las dos tienen un uso
     legítimo y frecuente en el repo: "escenas frescas", "expresiones frescas",
     "ojos frescos", "la tienes fresca", "una jota suave". Lo prohibido es
     "fresco" = "tranquilo" y "suave" = "con calma", que es lo que decía el
     saludo de Alfred que disparó todo esto. */
  ['fresco (= tranquilo)', /(?:^|[.!?¡¿—-]\s*)fresc[oa][,.!]|\btodo fresco\b/i],
  ['suave (= con calma)', /[,—-]\s*suave\s*[.!]|\bsuave,\s*(?:que|no)\b/i],

  // ── marcadores de un solo país que la lista original no nombraba ──────────
  ['trancón', pal('tranc[óo]n|tranc[óo]nes')],
  ['tinto (= café)', /\b(?:un|el|del|al)\s+tinto\b/i],
  ['parquear', pal('parque[aá][a-záéíóú]*|parqueader[oa]s?')],
  ['sin afán', /\bsin af[áa]n\b/i],
  ['celu', pal('celu')],
  ['bravo (= enojado)', /\b(?:cliente|ticket|visitante|jefe|se va|más|muy)\s+brav[oa]s?\b|\bbrav[oa]\s+(?:y|con)\b/i],
  ['embarrarla', /\bla\s+embarr[a-záéíóú]+\b/i],
  ['quedar de + adjetivo', /\bqued[ao]s?\s+de\s+(?:mudo|raro|blandito|intenso|pesado|mal|bien)\b/i],
];

/* ── EXCEPCIONES ────────────────────────────────────────────────────────────
   Cada una con su porqué. Que esta lista crezca es la señal de que la regla
   se está erosionando: antes de sumar una, preguntá si no es más barato
   arreglar el texto. */
const EXCEPCIONES = [
  {
    prefijo: 'src/lib/espanol-neutro.ts',
    razon: 'ES la regla. Cita textualmente las palabras que prohíbe.',
  },
  {
    prefijo: 'src/views/slang/',
    razon:
      'La propia regla exime SLANG: ahí la jerga regional es el CONTENIDO que se ' +
      'enseña, no la voz que enseña. El modo "JERGA → GRINGO" además está ' +
      'pendiente de una decisión del usuario (ver DESIGN-BRIEF §3.3).',
  },
  {
    prefijo: 'src/views/a1/coach-prompts.ts',
    etiqueta: 'usted (a quien aprende)',
    razon:
      'Excepción de registro escrita en el propio prompt: cuando el coach hace ' +
      'de persona detrás de un mostrador trata de "usted" al visitante, que es ' +
      'lo que de verdad se dice en esa situación. La palabra aparece en una ' +
      'instrucción EN INGLÉS al modelo, mencionada, no usada.',
  },
  {
    prefijo: 'src/content/libro/',
    razon:
      'Los libros son texto en inglés con glosas; el inglés no pasa por la ' +
      'regla y las glosas son traducciones puntuales, no la voz de la app.',
  },
];

const exenta = (rel, etiqueta) =>
  EXCEPCIONES.some(
    (e) => rel.startsWith(e.prefijo) && (!e.etiqueta || e.etiqueta === etiqueta),
  );

/** Todas las violaciones de un texto suelto. */
function violaciones(texto) {
  const r = [];
  for (const [etiqueta, re] of PROHIBIDAS) {
    const m = texto.match(re);
    if (m) r.push({ etiqueta, encontrado: m[0].trim() });
  }
  return r;
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · EL AUTOTEST DEL DETECTOR
   ══════════════════════════════════════════════════════════════════════════ */

/** Cadenas que el detector TIENE que cazar. Cada una estuvo de verdad en el
    repo o es la forma exacta de un agujero que ya se pagó. */
const DEBE_CAZAR = [
  ['Todo fresco. Nada que repasar hoy — arranquemos algo nuevo, suave.', 'el saludo que vio el usuario'],
  ['Todo fresco', 'el eyebrow que el detector v1 no veía por desincronizarse'],
  ['Casi. La que iba es «X». Fresco, pa\' eso repasamos.', 'fresco con apóstrofo en la misma cadena'],
  ['Ah, tú eres de los que programan. Fresco, ese inglés es más fácil.', 'fresco = tranquilo'],
  ['Mira un letrero de aeropuerto gringo.', 'gringo'],
  ['Los gringos se comen la T del medio', 'gringos'],
  ['Reunión con el equipo gringo', 'gringo en una etiqueta de la interfaz'],
  ['Se acaba el día. Despedite pa\' mañana.', 'voseo con pronombre'],
  ['Ahora tú. Repetila en voz alta, como suena.', 'voseo que PIERDE el acento al pegar el pronombre'],
  ['Se cayó algo en producción. Avisale al equipo.', 'voseo con pronombre'],
  ['Llevas dos horas pegado. Pedile a alguien que te revise.', 'voseo con pronombre'],
  ['usalo de gancho, porque es justo eso', 'voseo con pronombre, en minúscula y a mitad de frase'],
  ['Mira el molde, decilo en voz alta con lo tuyo.', 'voseo con pronombre'],
  ['Tocá cualquier palabra subrayada para ver qué significa.', 'voseo imperativo en -á'],
  ['Tu navegador no deja grabar audio — usá Chrome', 'voseo imperativo en -á'],
  ['sino qué puedes hacer VOS: desde el primer segundo', 'el pronombre vos, en mayúscula'],
  ['¿Vos tenés un minuto?', 'voseo presente'],
  ['Está en una reunión ahorita.', 'ahorita'],
  ['Listo pues, nos vemos.', 'listo pues'],
  ['Qué más parce, todo bien', 'parce'],
  ['Eso estuvo muy bacano', 'bacano'],
  ['Opinar en reunión es como manejar en trancón', 'trancón'],
  ['Decir el precio es como servir un tinto', 'tinto = café'],
  ['se ve bien parqueado hasta que volteas', 'parquear'],
  ['Cuando quieras repasamos lo que ya tienes, sin afán.', 'sin afán'],
  ['Tu primer día es como estrenar celu nuevo', 'celu'],
  ['Entra un cliente bravo. Sale un cliente que dice gracias.', 'bravo = enojado'],
  ['reconoces que la embarraron, y avisas que vas a mirar', 'embarrarla'],
  ['se cae la bolita y quedas de mudo', 'quedar de + adjetivo'],
];

/** Cadenas que el detector NO puede cazar. Cada una es un falso positivo que
    ya se dio, o el uso legítimo de una palabra que en otro contexto sí va. */
const NO_DEBE_CAZAR = [
  ['Escenas frescas para ti', 'fresco legítimo: reciente'],
  ['Buscando expresiones frescas…', 'fresco legítimo'],
  ['¡Eso! Esa era. La tienes fresca.', 'fresco legítimo: fresca en la memoria'],
  ['Ojos frescos lo cazan en diez segundos.', 'fresco legítimo'],
  ['una versión fresca sin re-suscribir', 'fresco legítimo'],
  ['con la H sonando como una jota suave', 'suave legítimo: el fonema'],
  ['la relación anda suave todo el día', 'suave legítimo: sin fricción'],
  ['Tu puerta de entrada, suavecita.', 'suave legítimo'],
  ['una lente suave que abomba la cara', 'suave legítimo, del vocabulario de render'],
  ['Probándote ropa.', 'gerundio, no el imperativo "probá" — el agujero del \\b y los acentos'],
  ['prefieren repetírtelo a que hagas algo mal', 'infinitivo con pronombres, no "repetí"'],
  ['Nadie se enoja si pides que repitan', 'presente de tú'],
  ['Ya sabes LLEGAR A LA OFICINA.', '"sabes" es tú, no "sabés"'],
  ['Aprendes a decir qué haces, de dónde eres', '"haces" es tú, no "hacés"'],
  ['Es el "¿y tú en qué andas?" de oficina.', '"andas" es tú, no "andás"'],
  ['Abre mostrando qué hacen ustedes.', '"ustedes" es el plural neutro de Latinoamérica'],
  ['roja como un tomate hasta las orejas', '"tomate" no es "tomá" + "te"'],
  ['size-[18px] animate-spin', 'clase de Tailwind, no "animá" + "te"'],
  ['La puerta es el andén del bus', '"andén" de estación es español estándar'],
  ['Bien. Y ya sabes qué es "downtown".', 'nada'],
  ['Dale, arranquemos →', '"dale" solo está prohibido en "dale pues"'],
  ['Y eran varias de una. Esas ya las tienes encima.', '"de una" lo permite la regla'],
  ['Sigue por acá', 'la forma correcta del imperativo'],
  ['Repítela en voz alta, como suena.', 'la forma correcta, con tilde'],
  ['Avísale al equipo.', 'la forma correcta, con tilde'],
];

test('el detector caza lo que tiene que cazar', () => {
  for (const [texto, porque] of DEBE_CAZAR) {
    const v = violaciones(texto);
    assert.ok(v.length > 0, `NO cazó (${porque}): ${texto}`);
  }
});

test('el detector no se inventa violaciones', () => {
  for (const [texto, porque] of NO_DEBE_CAZAR) {
    const v = violaciones(texto);
    assert.deepEqual(
      v,
      [],
      `falso positivo (${porque}): ${texto} → ${v.map((x) => `${x.etiqueta}:«${x.encontrado}»`).join(', ')}`,
    );
  }
});

/* El extractor, por su cuenta: los tres agujeros de la v1, en miniatura. */
test('el extractor separa comentarios e identificadores del texto del usuario', () => {
  const fuente = [
    "// El comentario habla de un degradado suave y de un gringo, y no pasa nada.",
    '/* Ni este, que menciona parce y una versión fresca. */',
    'const SUAVE = 0.32;',
    'let frescas = 0;',
    "const saludo = 'Todo al día';",
    'const cls = "animate-spin";',
    'const x = n > 0 ? \'primera rama\' : \'segunda rama\';',
    'const p = `${n} frases listas pa\' refrescar`;',
    "const q = 'después del apóstrofo suelto';",
    'const jsx = <p>Texto de la interfaz</p>;',
  ].join('\n');

  const textos = tramosDeTexto(fuente).map((t) => t.texto);

  // Los comentarios no entran, ni siquiera con palabras prohibidas adentro.
  assert.ok(!textos.some((t) => /degradado suave|parce|versión fresca/.test(t)));
  // Los identificadores tampoco: SUAVE y frescas viven en el código.
  assert.ok(!textos.includes('SUAVE'));
  // Y todo lo que SÍ lee el usuario está.
  for (const esperado of [
    'Todo al día',
    'primera rama',       // agujero 2: el `>` se comía las dos ramas
    'segunda rama',
    'Texto de la interfaz',
  ]) {
    assert.ok(textos.includes(esperado), `el extractor perdió: ${esperado}`);
  }
  // Agujero 1: el apóstrofo de "pa'" no puede desincronizar lo que sigue.
  assert.ok(textos.some((t) => t.includes("pa' refrescar")));
  assert.ok(textos.includes('después del apóstrofo suelto'));
});

/* ══════════════════════════════════════════════════════════════════════════
   4 · EL BARRIDO DE VERDAD
   ══════════════════════════════════════════════════════════════════════════ */

function archivos(dir) {
  const r = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) r.push(...archivos(p));
    else if (/\.(ts|tsx)$/.test(e)) r.push(p);
  }
  return r;
}

test('ningún texto de cara al usuario tiene modismos de un solo país', () => {
  const encontradas = [];
  let mirados = 0;

  for (const abs of archivos(SRC)) {
    const rel = relative(fileURLToPath(RAIZ), abs).replace(/\\/g, '/');
    for (const tramo of tramosDeTexto(readFileSync(abs, 'utf8'))) {
      mirados++;
      for (const v of violaciones(tramo.texto)) {
        if (exenta(rel, v.etiqueta)) continue;
        encontradas.push(
          `${rel}:${tramo.linea}  [${v.etiqueta} → «${v.encontrado}»]  ${tramo.texto.trim().slice(0, 110)}`,
        );
      }
    }
  }

  /* Que el barrido haya MIRADO algo. Sin esto, un extractor roto que devuelve
     cero tramos pasa el test en verde y no revisa una sola línea. */
  assert.ok(mirados > 3000, `el extractor solo sacó ${mirados} tramos: algo se rompió`);

  assert.deepEqual(
    encontradas,
    [],
    `\n${encontradas.length} violación(es) de registro:\n  ${encontradas.join('\n  ')}\n\n` +
      'La regla está en src/lib/espanol-neutro.ts. Se arregla REESCRIBIENDO la frase, ' +
      'no cambiando la palabra por su sinónimo de diccionario: si al quitarle el ' +
      'modismo queda acartonada, la frase entera va de nuevo.\n',
  );
});
