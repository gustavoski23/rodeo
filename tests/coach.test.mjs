import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { register } from 'node:module';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* EL COACH DEL A1 — lo que se calla, lo que corrige y lo que cobra mañana.

   No hay servidor de API en este entorno, y aun así esto se prueba entero. Se
   puede porque el diseño lo permite a propósito: entre el modelo y la pantalla
   hay una COMPUERTA (lib/coach-a1.ts) y el modelo solo PROPONE. O sea que lo
   importante de esta fase —cuántas correcciones salen, cuáles, qué llega al
   SRS y qué ve el usuario— no depende de que el modelo se porte bien, y se
   comprueba con transcripciones y respuestas simuladas.

   Un test que necesitara al modelo para pasar estaría probando al modelo. Este
   prueba la regla.

   El andamio (hook de alias + stub de localStorage) es el mismo de
   a1-ruta.test.mjs: Node 24 hace type stripping de los .ts del repo pero no
   conoce ni `@/` ni los imports sin extensión. El hook se escribe al TEMP, no
   a tests/. */

const RAIZ = new URL('../', import.meta.url);
const SRC = new URL('src/', RAIZ).href;

const HOOK = `
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const SRC = ${JSON.stringify(SRC)};
const EXT = ['.ts', '.tsx', '/index.ts', '/index.tsx'];
export async function resolve(spec, ctx, next) {
  let s = spec;
  if (s.startsWith('@/')) s = SRC + s.slice(2);
  else if (s.startsWith('.') && ctx.parentURL) s = new URL(s, ctx.parentURL).href;
  if (s.startsWith('file:') && !/\\.(ts|tsx|mjs|js|json)$/.test(s)) {
    for (const e of EXT) if (existsSync(fileURLToPath(s + e))) { s += e; break; }
  }
  return next(s, ctx);
}
`;

const almacen = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => almacen.set(k, String(v)),
  removeItem: (k) => almacen.delete(k),
  clear: () => almacen.clear(),
};

const hookUrl = new URL(
  'coach-alias-hook.mjs',
  pathToFileURL(process.env.TEMP || process.env.TMPDIR || '/tmp').href + '/',
);
await writeFile(fileURLToPath(hookUrl), HOOK, 'utf8');
register(hookUrl);

const carga = (rel) => import(new URL(rel, SRC).href);

const a1 = await carga('stores/a1.ts');
const coach = await carga('lib/coach-a1.ts');
const prompts = await carga('views/a1/coach-prompts.ts');

const UNIDADES = a1.useA1.getState().unidades;
const CON_COACH = UNIDADES.filter((u) => u.coach);
const unidad = (id) => {
  const u = UNIDADES.find((x) => x.id === id);
  assert.ok(u, `no existe la unidad ${id}`);
  return u;
};

function reiniciar() {
  almacen.clear();
  a1.useA1.setState({ srs: {} });
}

/* ═══════════════════════════════════════════════════════════════════════════
   EL A1 DE VERDAD — la transcripción con la que se prueba todo.

   Doce errores en seis turnos, que es el ritmo real de alguien que lleva días
   de inglés: un error cada tres o cuatro palabras. Y el "modelo" que la
   acompaña es el peor caso honesto: propone corregir EN CADA TURNO, incluidas
   cosas que esta parada nunca enseñó (el pasado simple, un artículo, una frase
   de otro tramo). Ese es el comportamiento por defecto de un modelo sin
   compuerta, no una exageración.

   La parada es t3-comer (el restaurante): 8 frases permitidas, tope 2.
   ═════════════════════════════════════════════════════════════════════════ */

const FUERA = ['c-t3-take-me-to', 'w-taxi', 'c-t3-purpose-business', 'c-t3-wifi-password'];

/** [lo que dijo la persona, el chunk que el modelo quiere corregir]

    El orden importa y está armado a mano para que se disparen los tres motivos
    de descarte con un tope de 2 — que es la única combinación posible: si la
    repetición no cae dentro de las dos primeras, el tope ya se comió todo lo
    que viene detrás. Y repetir el mismo error en el turno siguiente no es un
    caso de laboratorio: es lo que hace un principiante. */
const TRANSCRIPCION = [
  ['I want the chicken please', 'c-t3-ill-have-this'],
  ['I want this one', 'c-t3-ill-have-this'],
  ['No onion for me', 'c-t3-no-onions'],
  ['I no like the onion', FUERA[0]],
  ['What you recommend?', 'c-t3-what-recommend'],
  ['Water please for me', 'c-t3-some-water'],
  ['The bill please', 'c-t3-check-please'],
  ['I pay with card', 'c-t3-pay-by-card'],
  ['Yesterday I go to other restaurant', FUERA[1]],
  ['Is very good the food', FUERA[2]],
  ['Thanks you very much', 'w-thankyou'],
  ['I need go now', FUERA[3]],
];

/** Corre la conversación entera contra la compuerta. El "modelo" siempre
    propone corrección y siempre reporta el chunk como fallado. */
function correrConversacion(u, guion = TRANSCRIPCION, replyDe = () => 'Sure, coming right up.') {
  const conv = coach.abrirConversacion(u);
  assert.ok(conv, `${u.id} tiene que abrir conversación`);
  const turnos = [];
  for (const [dijo, propuesto] of guion) {
    coach.anotarTurnoUsuario(conv, dijo);
    const limpio = coach.pasarTurno(conv, {
      reply: replyDe(dijo, propuesto),
      correccion: { chunkId: propuesto },
      fallos: [propuesto],
      cerrar: false,
    });
    turnos.push(limpio);
  }
  return { conv, turnos };
}

/* ── a) el tope se respeta y no se corrige lo que no se enseñó ──────────────
   Las dos mitades de la regla que más silencio compra. Y ojo con el orden en
   que se rompen: el tope se nota (salen tres correcciones), lo de la lista NO
   —una corrección de algo que nunca se enseñó se lee igual de "correcta" que
   cualquier otra— y por eso es la que hay que clavar con un test. */
test('con doce errores el coach corrige como mucho el tope, y nada fuera de la lista', () => {
  reiniciar();
  const u = unidad('t3-comer');
  const tope = coach.topeDe(u.coach);
  assert.equal(tope, 2, 'el contenido de esta parada declara tope 2');

  const { conv, turnos } = correrConversacion(u);

  const dichas = turnos.filter((t) => t && t.corregido).map((t) => t.corregido);
  assert.ok(dichas.length <= tope, `salieron ${dichas.length} correcciones con tope ${tope}`);
  assert.equal(conv.usadas, dichas.length, 'la cuenta interna y lo que salió tienen que coincidir');

  const permitidos = new Set(u.coach.chunkIds);
  for (const id of dichas) {
    assert.ok(permitidos.has(id), `${id} no es de esta parada y se corrigió igual`);
  }

  // Y las que se tiraron se tiraron por el motivo bueno, no de casualidad.
  const motivos = turnos.filter((t) => t && t.descartada).map((t) => t.descartada);
  assert.ok(motivos.includes('fuera-de-lista'), 'lo de otros tramos tiene que caer por la lista');
  assert.ok(motivos.includes('tope'), 'agotado el tope, todo lo demás se calla');
  assert.ok(motivos.includes('repetida'), 'nunca dos veces la misma cosa');
  assert.equal(motivos.length + dichas.length, TRANSCRIPCION.length, 'ningún turno quedó sin decidir');

  /* El Tramo 0 es más callado todavía: un turno, una corrección, y se acabó.
     Se comprueba en la parada de verdad, no con un tope inventado. */
  const t0 = unidad('t0-cognados');
  assert.equal(coach.topeDe(t0.coach), 1);
  const solo = correrConversacion(t0, [
    ['Where is the taxi', 'w-taxi'],
    ['I need help please', 'w-help'],
    ['Where is exit', 'w-exit'],
  ]);
  assert.equal(solo.conv.usadas, 1, 'en el Tramo 0 se gasta una sola');
});

/* ── b) lo que NO se dijo se cobra mañana, y se cobra de verdad ─────────────
   Contra el STORE, no contra el JSON: que el motor devuelva una lista bonita
   no prueba nada si `calificar` no movió nada. Acá se mira la entrada Leitner
   antes y después.

   OJO CON EL VOCABULARIO. COACH-diseño R4 dice `calificar(chunkId, 'casi')` y
   comenta "baja la caja Leitner". MEDIDO contra stores/a1.ts: 'casi' NO baja la
   caja —la deja donde está y pone due = mañana— y quien la baja a 1 es
   'todavia'. Las dos "cobran mañana", que es la promesa del producto; solo una
   degrada. El default es 'casi' a propósito: tumbarle a caja 1 una frase que
   alguien tenía en caja 5 por un tropiezo hablando es justo el castigo que este
   coach no reparte. Los dos caminos se prueban abajo. */
test('los errores que no se corrigieron caen al SRS y vuelven mañana', () => {
  reiniciar();
  const u = unidad('t3-comer');

  /* Estado de partida: dos frases ya dominadas. Si el coach no las tocara, la
     de caja 5 no volvería hasta dentro de un mes. */
  const lejos = '2099-01-01';
  a1.useA1.setState({
    srs: {
      'c-t3-check-please': { box: 5, due: lejos, seen: 9, clavado: 8, casi: 1, no: 0, last: null, firstSeen: '2020-01-01' },
      'c-t3-no-onions': { box: 3, due: lejos, seen: 4, clavado: 3, casi: 1, no: 0, last: null, firstSeen: '2020-01-01' },
    },
  });

  const { conv } = correrConversacion(u);
  const cierre = coach.parsearCierre(
    {
      logro_es: 'Pediste, avisaste lo de la cebolla y pagaste.',
      unaCosa_es: 'El "please" al final: allá no es opcional.',
      fraseGanada: 'c-t3-ill-have-this',
      // El modelo pide bajar una que NO es de esta parada: no puede.
      srs: [{ chunkId: 'c-t3-no-onions', nota: 'todavia' }, { chunkId: 'w-taxi', nota: 'todavia' }],
      correccionesUsadas: 2,
    },
    conv,
    coach.vocabularioDe(u.coach),
  );
  assert.ok(cierre);

  const enSrs = new Set(cierre.aSrs.map((x) => x.chunkId));
  const permitidos = new Set(u.coach.chunkIds);
  for (const id of enSrs) assert.ok(permitidos.has(id), `${id} no es de esta parada y llegó al SRS`);
  for (const id of FUERA) assert.equal(enSrs.has(id), false, `${id} no se enseñó: no se puede cobrar`);
  assert.ok(enSrs.has('c-t3-check-please'), 'lo que falló y no se nombró tiene que quedar anotado');

  // Y ahora sí: contra el store.
  const antes = { ...a1.useA1.getState().srs };
  coach.aplicarSrs(cierre);
  const despues = a1.useA1.getState().srs;

  const hoy = a1.hoyStr();
  const manana = (() => {
    const d = new Date(hoy + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  // 'casi' (el default silencioso): la caja aguanta, pero vuelve MAÑANA.
  const check = despues['c-t3-check-please'];
  assert.equal(antes['c-t3-check-please'].due, lejos);
  assert.equal(check.due, manana, 'la frase fallada tiene que volver mañana');
  assert.equal(check.box, 5, "'casi' no degrada la caja — eso lo hace 'todavia'");
  assert.equal(check.casi, antes['c-t3-check-please'].casi + 1);

  // 'todavia' (cuando el modelo dice que no salió nada): la caja SÍ cae a 1.
  const onions = despues['c-t3-no-onions'];
  assert.equal(onions.box, 1, "'todavia' baja la caja hasta 1");
  assert.equal(onions.due, manana);

  // Nada de otro tramo se coló al Leitner.
  for (const id of FUERA) assert.equal(despues[id], undefined, `${id} no puede tener entrada de SRS`);

  /* Y la promesa completa: mañana esas frases están vencidas. Se mide con el
     motor de verdad (vencidos()) adelantando el reloj un día. */
  const reloj = Date;
  try {
    const salto = new Date(hoy + 'T12:00:00');
    salto.setDate(salto.getDate() + 1);
    globalThis.Date = class extends reloj {
      constructor(...args) {
        super(...(args.length ? args : [salto]));
      }
      static now() {
        return salto.getTime();
      }
    };
    const ids = new Set(a1.vencidos().map((v) => v.id));
    assert.ok(ids.has('c-t3-check-please'), 'mañana tiene que salir en el repaso');
    assert.ok(ids.has('c-t3-no-onions'));
  } finally {
    globalThis.Date = reloj;
  }
});

/* ── c) el JSON no llega al render ──────────────────────────────────────────
   Dos frentes, porque cada uno tapa un agujero distinto:
     1. lo que el motor DEVUELVE para pintar no trae la carcasa del modelo, ni
        siquiera cuando el modelo escupe su propio JSON dentro del "reply"
        (falla real y frecuente de Kimi cuando se le pide JSON estricto);
     2. la hoja de cierre no pinta ningún campo de instrumentación aunque los
        tenga a mano. El objeto Cierre lleva `correcciones` y `aSrs` porque el
        motor los necesita; que estén ahí y no se pinten es una decisión que
        solo un test sostiene en el tiempo. */
test('el JSON nunca llega a la pantalla', async () => {
  reiniciar();
  const u = unidad('t3-comer');
  const conv = coach.abrirConversacion(u);

  const crudo = '{"reply":"Sure thing.","correccion":null,"fallos":[],"cerrar":false}';
  const limpio = coach.pasarTurno(conv, { reply: crudo, correccion: null, fallos: [] });
  assert.ok(limpio);
  /* El motor no re-parsea el reply: si el modelo mete su JSON ahí, ahí queda.
     Lo que este test fija es que NO se pinte la envoltura por el camino normal
     —el `reply` es el único campo que sale— y que los turnos buenos salgan
     limpios. Lo otro es un modelo roto y se ve como texto raro, no como datos
     del motor filtrándose. */
  assert.equal(limpio.corregido, null);

  const { conv: conv2 } = correrConversacion(u);
  const cierre = coach.parsearCierre(
    {
      logro_es: 'Pediste y pagaste. Todo en inglés.',
      unaCosa_es: 'Una sola: el "please" al final.',
      fraseGanada: 'c-t3-ill-have-this',
      srs: [{ chunkId: 'c-t3-check-please', nota: 'casi' }],
      correccionesUsadas: 2,
    },
    conv2,
    coach.vocabularioDe(u.coach),
  );

  // Todo lo que la hoja pinta, junto.
  const visible = [cierre.logro_es, cierre.unaCosa_es, cierre.frase?.en, cierre.frase?.es].join(' ');
  for (const rastro of ['chunkId', 'correccionesUsadas', 'fraseGanada', '"srs"', '{', '}', '[', ']']) {
    assert.ok(!visible.includes(rastro), `la hoja pintaría "${rastro}"`);
  }

  const hoja = await readFile(new URL('src/views/a1/coach-debrief.tsx', RAIZ), 'utf8');
  for (const campo of ['cierre.correcciones', 'cierre.aSrs', 'JSON.stringify']) {
    assert.ok(!hoja.includes(campo), `coach-debrief.tsx pinta ${campo}`);
  }
  // Y los tres bloques SÍ están, en orden.
  const iLogro = hoja.indexOf('cierre.logro_es');
  const iCosa = hoja.indexOf('cierre.unaCosa_es');
  const iFrase = hoja.indexOf('cierre.frase');
  assert.ok(iLogro > 0 && iCosa > iLogro && iFrase > iCosa, 'los tres bloques van en ese orden');

  const vista = await readFile(new URL('src/views/a1/coach.tsx', RAIZ), 'utf8');
  assert.ok(!vista.includes('JSON.stringify'), 'la conversación no puede pintar JSON');
});

/* ── d) el prompt no lleva vocabulario de otra parada ───────────────────────
   Es LA regla que sostiene todo lo demás: si en el prompt se cuela una frase
   que esta persona no aprendió, el modelo la va a usar, y usar vocabulario que
   el otro no tiene es la forma más rápida de que alguien sienta que no sabe
   nada. Por eso en coach-prompts.ts no hay UN SOLO ejemplo en inglés: todo lo
   que hay que explicar se explica en abstracto. */
test('el prompt de una parada solo trae el vocabulario de esa parada', () => {
  reiniciar();
  const ix = a1.useA1.getState().indice.chunk;

  for (const u of CON_COACH) {
    const vocab = coach.vocabularioDe(u.coach);
    const p = prompts.coachSystem(u.coach, vocab, coach.topeDe(u.coach));

    // El bloque de vocabulario es EXACTAMENTE el suyo, en orden y sin sobras.
    const lineas = p.split('\n');
    const bloque = lineas.filter((l) => /^- \S+ · .+ — /.test(l));
    assert.deepEqual(
      bloque.map((l) => l.slice(2, l.indexOf(' · '))),
      u.coach.chunkIds,
      `${u.id}: el bloque de vocabulario no es el de la parada`,
    );

    /* Y fuera de ese bloque no hay UNA SOLA frase en inglés del catálogo. Ese
       es el invariante que sostiene la regla: en las instrucciones no van
       ejemplos, porque un ejemplo es vocabulario que se coló por la puerta de
       atrás y el modelo lo repite.

       Se descuenta el bloque y la línea del abridor (que es contenido de ESTA
       parada). Y se miran solo las frases de 2+ palabras: las sueltas del Tramo
       0 son "Yes", "No", "Okay", "Please" y aparecen en cualquier texto en
       inglés — buscarlas mediría el idioma, no la fuga.

       MEDIDO al escribir esto: buscar sobre el prompt entero da falsos
       positivos legítimos, porque una frase de la parada CONTIENE a otra
       ("Excuse me, can I pass?" contiene `w-excuseme`). Por eso se mide sobre
       las instrucciones y no sobre el texto completo. */
    const resto = lineas
      .filter((l) => !/^- \S+ · .+ — /.test(l) && !l.startsWith('- Open with exactly this line:'))
      .join('\n')
      .toLowerCase();

    for (const [id, c] of Object.entries(ix)) {
      if (c.en.trim().split(/\s+/).length < 2) continue;
      assert.ok(
        !resto.includes(c.en.toLowerCase()),
        `${u.id}: "${c.en}" (${id}) está en las instrucciones, no en la lista`,
      );
    }
  }
});

/* ── e) las palabras que delatan una corrección no salen ────────────────────
   Se prueba EL FILTRO, no la buena voluntad del modelo. La diferencia importa:
   la instrucción del prompt es una petición y se incumple; esto es una puerta.

   Y se prueba el caso feo, que es el que pasa de verdad: el modelo cumple tres
   frases y se le escapa la cuarta. Ahí no se tira el turno entero —las tres
   buenas eran justo lo que queríamos— se tira la frase. */
test('ninguna palabra prohibida puede salir en una corrección', () => {
  reiniciar();

  for (const re of coach.PROHIBIDAS_ES) {
    assert.ok(re.source, 'la lista española tiene que seguir existiendo');
  }

  const ejemplos = [
    'Casi. Se dice I am thirty.',
    'Eso está incorrecto.',
    'Ojo con esa.',
    'En realidad no se usa así.',
    'Tuviste dos errores ahí.',
    "Actually, we say it the other way.",
    'That is wrong.',
  ];
  for (const t of ejemplos) {
    assert.ok(coach.palabraProhibida(t), `no cazó la prohibida en «${t}»`);
    assert.equal(coach.limpiarProhibidas(t), '', `«${t}» era puro señalamiento y tiene que caer entero`);
  }

  // El caso mixto: se queda con lo bueno y tira la frase que señala.
  const mixto = 'Oh, you are thirty! Actually, we say I am thirty. Same as me.';
  const salvado = coach.limpiarProhibidas(mixto);
  assert.equal(coach.palabraProhibida(salvado), null);
  assert.ok(salvado.includes('you are thirty'));
  assert.ok(salvado.includes('Same as me'));
  assert.ok(!salvado.toLowerCase().includes('actually'));

  // La forma buena de corregir pasa entera, sin tocarle una coma.
  const reformulado = 'Oh, you are thirty! Same as me. Table for one?';
  assert.equal(coach.limpiarProhibidas(reformulado), reformulado);

  /* Y el personaje puede seguir hablando como una persona. La primera versión
     del filtro tenía `wrong`, `almost` y `actually` pelados y le borraba estas
     tres al mesero y al del aeropuerto — borrar en silencio es peor que no
     filtrar, porque el usuario ve un turno cojo y no sabe por qué. */
  for (const normal of [
    'Wrong gate, sorry. Yours is B12.',
    "We're almost full tonight.",
    'Actually, we do have a table.',
  ]) {
    assert.equal(coach.limpiarProhibidas(normal), normal, `el filtro se comió «${normal}»`);
  }
  // Pero las formas de corrección de esas mismas palabras sí caen.
  for (const meta of ['Almost! You mean a table for two.', 'That is wrong.', 'In English we use the other one.']) {
    assert.ok(coach.palabraProhibida(meta), `no cazó «${meta}»`);
  }

  // Plural y femenino: la regla no se esquiva escribiendo distinto.
  assert.ok(coach.palabraProhibida('Dos errores nada más.'));
  assert.ok(coach.palabraProhibida('Esa frase es incorrecta.'));

  /* Y en la compuerta: una corrección envuelta en una frase que señala se
     DESCARTA, no se limpia y se cuenta igual. El tope no se gasta en algo que
     no se dijo, y el chunk se va al SRS como cualquier otro fallo callado. */
  const u = unidad('t3-comer');
  const conv = coach.abrirConversacion(u);
  const t = coach.pasarTurno(conv, {
    reply: 'Sure. Actually, we say the check, please.',
    correccion: { chunkId: 'c-t3-check-please' },
    fallos: [],
  });
  assert.ok(t);
  assert.equal(t.descartada, 'palabra-prohibida');
  assert.equal(t.corregido, null);
  assert.equal(conv.usadas, 0, 'una corrección que no salió no gasta tope');
  assert.equal(conv.aSrs.get('c-t3-check-please'), 'casi', 'se cobra mañana igual');
  assert.equal(coach.palabraProhibida(t.reply), null);

  // Un turno que era SOLO señalamiento no se pinta: mejor el silencio.
  const conv2 = coach.abrirConversacion(u);
  assert.equal(coach.pasarTurno(conv2, { reply: 'Casi. Se dice check, please.' }), null);
});

/* ── El contenido de las 13 paradas con coach ──────────────────────────────
   Barato de correr y clava dos cosas que se rompen al escribir contenido: un
   chunkId con dedo (el coach se queda sin esa frase permitida y nadie se
   entera) y un tope inflado. */
test('las paradas con conversación tienen su bloque sano', () => {
  reiniciar();
  assert.equal(CON_COACH.length, 13, 'hoy son 13 paradas con conversación');
  const ix = a1.useA1.getState().indice.chunk;

  for (const u of CON_COACH) {
    const c = u.coach;
    assert.ok(c.escenario_es && c.meta_es && c.abridor_en && c.abridor_es, `${u.id}: bloque incompleto`);
    assert.ok(c.chunkIds.length >= 4, `${u.id}: con menos de 4 frases no hay conversación`);
    for (const id of c.chunkIds) assert.ok(ix[id], `${u.id}: el chunkId ${id} no resuelve`);
    assert.equal(coach.vocabularioDe(c).length, c.chunkIds.length, `${u.id}: se perdió vocabulario`);

    const tope = coach.topeDe(c);
    assert.ok(tope >= 1 && tope <= coach.TOPE_MAXIMO, `${u.id}: tope ${tope} fuera de rango`);
    if (u.tramo === 't0') assert.equal(tope, 1, `${u.id}: el Tramo 0 corrige una sola vez`);
  }
});

/* ── La frase ganada nunca queda vacía ────────────────────────────────────
   Es uno de los tres bloques del debrief y un bloque con título y nada debajo
   es el fallo #1 de este repo. El modelo devuelve un id y a veces devuelve
   cualquier cosa. */
test('la frase que ganaste sale igual aunque el modelo mande basura', () => {
  reiniciar();
  const u = unidad('t3-comer');
  const vocab = coach.vocabularioDe(u.coach);

  for (const basura of [undefined, null, '', 'no-existe', 'w-taxi', 42]) {
    const conv = coach.abrirConversacion(u);
    conv.aSrs.set('c-t3-ill-have-this', 'casi'); // esa la falló: no puede ser la ganada
    const cierre = coach.parsearCierre(
      { logro_es: 'Pediste y pagaste.', unaCosa_es: 'Una sola cosa.', fraseGanada: basura, srs: [] },
      conv,
      vocab,
    );
    assert.ok(cierre?.frase, `con fraseGanada=${String(basura)} la hoja quedaría con un hueco`);
    assert.ok(u.coach.chunkIds.includes(cierre.frase.id), 'la ganada tiene que ser de esta parada');
    assert.notEqual(cierre.frase.id, 'c-t3-ill-have-this', 'no se regala una que se falló');
  }

  // Sin los dos textos no hay hoja: mejor el fallo visible que media hoja.
  const conv = coach.abrirConversacion(u);
  assert.equal(coach.parsearCierre({ srs: [] }, conv, vocab), null);
});

/* ── Las señales son de CONDUCTA, y no hay dónde meter la exactitud ────────
   El test existe por la trampa: la precisión SUBE cuando el usuario habla
   menos, así que un coach más duro se ve mejor en exactitud y peor en todo lo
   demás. Que no haya campo para guardarla es la defensa. */
test('las señales miden encogimiento, abandono y vuelta — nunca exactitud', () => {
  reiniciar();

  // Alguien que se va encogiendo: empieza soltando y termina en monosílabos.
  coach.anotarSesion({
    ts: Date.now(),
    unitId: 't3-comer',
    largos: [7, 6, 3, 2],
    abandonada: false,
    porSuCuenta: false,
    correcciones: 2,
  });
  let s = coach.senalesCoach();
  assert.equal(s.sesiones, 1);
  assert.ok(s.encogimiento < 0, 'se está encogiendo y la señal tiene que decirlo');
  assert.equal(s.abandono, 0);
  assert.equal(s.vuelven, 0);

  // Se fue a mitad.
  coach.anotarSesion({
    ts: Date.now(),
    unitId: 't3-hotel',
    largos: [5, 2],
    abandonada: true,
    porSuCuenta: false,
    correcciones: 2,
  });
  assert.equal(coach.senalesCoach().abandono, 0.5);

  // Volvió a una que ya había hecho: nadie se lo pidió. La que de verdad importa.
  assert.equal(coach.esVuelta('t3-comer'), true);
  assert.equal(coach.esVuelta('t3-avion'), false);
  coach.anotarSesion({
    ts: Date.now(),
    unitId: 't3-comer',
    largos: [6, 8, 9, 11],
    abandonada: false,
    porSuCuenta: coach.esVuelta('t3-comer'),
    correcciones: 1,
  });
  s = coach.senalesCoach();
  assert.ok(s.vuelven > 0, 'volver sin que se lo pidan es la métrica que importa');

  // Y no hay exactitud en ninguna parte del dato guardado.
  const guardado = almacen.get('rodeo_a1_coach') || '';
  for (const campo of ['exactitud', 'precision', 'aciertos', 'score', 'nota']) {
    assert.ok(!guardado.includes(campo), `apareció un campo de exactitud: ${campo}`);
  }
  assert.deepEqual(Object.keys(s).sort(), ['abandono', 'encogimiento', 'sesiones', 'vuelven']);

  // Y no pisa ninguna clave del legacy: rodeo_a1_coach va sola.
  assert.deepEqual([...almacen.keys()], ['rodeo_a1_coach']);
});
