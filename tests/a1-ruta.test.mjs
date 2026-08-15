import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { register } from 'node:module';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* LA RUTA DEL A1 — el catálogo, el desbloqueo por tramos y el orden del
   currículo.

   Estos tests corren el MOTOR DE VERDAD (src/stores/a1.ts), no un regex sobre
   el archivo: lo que se prueba acá es orden y estado, y un texto que "menciona
   TRAMOS" no dice nada sobre el array que sale. Para eso hacen falta dos cosas
   que Node 24 ya trae y este repo no usaba todavía:

     · type stripping — los .ts del repo son tipos + ESM, se importan directo.
     · un hook de resolución — para el alias `@/` (que solo conocen Vite y tsc)
       y para los imports sin extensión (`./armar`), que Node no adivina.

   El hook se escribe a disco en el scratchpad y NO en tests/: es andamio del
   arnés, no del repo. El navegador y Vite no lo tocan nunca.

   El DOM también hay que fingirlo: lib/storage.ts habla con localStorage y con
   window.sbOnLocalChange. Se stubbean acá con un Map, así cada test arranca con
   el celular en blanco. */

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
  'a1-ruta-alias-hook.mjs',
  pathToFileURL(process.env.TEMP || process.env.TMPDIR || '/tmp').href + '/',
);
if (!existsSync(fileURLToPath(hookUrl))) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(fileURLToPath(hookUrl), HOOK, 'utf8');
} else {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(fileURLToPath(hookUrl), HOOK, 'utf8');
}
register(hookUrl);

const carga = (rel) => import(new URL(rel, SRC).href);

const { TRAMOS, PENDIENTES } = await carga('content/a1/tramos.ts');
const { A1_CURSO } = await carga('content/a1/core.ts');
const { T0_UNIDADES } = await carga('content/a1/t0-antes-de-hablar.ts');
const { T3_UNIDADES } = await carga('content/a1/t3-viaje.ts');
const { PACK_TECH } = await carga('content/a1/jobs/tech.ts');
const a1 = await carga('stores/a1.ts');

/** Vuelve el store al día 1: sin progreso, sin SRS, sin pack y sin memoria del
    tramo mirado (rodeo_a1_tramo se lee AL CREARSE el store, así que borrar el
    almacén no alcanza: hay que bajar también el campo del estado). */
function reiniciar() {
  almacen.clear();
  a1.useA1.setState({
    progreso: { doneScenes: [], doneUnits: [], unlockedUnits: [], doneTasks: [] },
    srs: {},
    tramoVisto: null,
  });
  a1.useA1.getState().setPackUnits([]);
}

/** Marca como hechas todas las escenas de las unidades pedidas. */
function cerrarUnidades(...ids) {
  const { unidades, progreso } = a1.useA1.getState();
  const hechas = new Set(progreso.doneScenes);
  for (const id of ids) {
    const u = unidades.find((x) => x.id === id);
    assert.ok(u, `cerrarUnidades: no existe ${id}`);
    u.scenes.forEach((s) => hechas.add(s.id));
  }
  a1.useA1.setState({ progreso: { ...progreso, doneScenes: [...hechas] } });
}

/** Todas las unidades vivas de un tramo. */
const delTramo = (t) => a1.useA1.getState().unidades.filter((u) => u.tramo === t);

/** Cierra un tramo entero (lo que hace el usuario terminando sus paradas). */
function cerrarTramo(t) {
  const us = delTramo(t);
  assert.ok(us.length, `cerrarTramo: ${t} no tiene unidades vivas`);
  cerrarUnidades(...us.map((u) => u.id));
}

const ids = () => a1.useA1.getState().unidades.map((u) => u.id);

/* ── a) el catálogo sale en el orden de TRAMOS, y sale igual siempre ────────
   El bug que esto cubre no era "sale desordenado": era que salía SIEMPRE IGUAL
   y mal. 20 de las 21 unidades empatan en `order` (core 1-7, T0 1-6, T3 1-8) y
   Array.sort es estable desde ES2019, así que el viejo
   `A1_CURSO.units.slice().sort(porOrden)` daba un intercalado determinista de
   oficina y pre-A1 que parecía intencional. Por eso el test corre tres veces:
   comprobar que es estable no alcanza, hay que comprobar contra TRAMOS. */
test('el catálogo sale en el orden de TRAMOS y es determinista', () => {
  const esperado = [];
  for (const t of TRAMOS) {
    for (const id of t.unitIds) {
      if (PENDIENTES.has(id)) continue;
      const existe =
        A1_CURSO.units.some((u) => u.id === id) ||
        T0_UNIDADES.some((u) => u.id === id) ||
        T3_UNIDADES.some((u) => u.id === id);
      if (existe) esperado.push(id);
    }
  }

  const corridas = [];
  for (let i = 0; i < 3; i++) {
    reiniciar();
    corridas.push(ids().join(','));
  }
  assert.equal(corridas[0], esperado.join(','), 'el catálogo no sigue a TRAMOS');
  assert.equal(corridas[0], corridas[1]);
  assert.equal(corridas[1], corridas[2]);

  // Y el Tramo 0 va PRIMERO: es la entrada que no existía.
  assert.equal(ids()[0], 't0-cognados');
  assert.ok(ids().indexOf('t0-preguntas') < ids().indexOf('u1-llegar'));

  /* El Tramo 3 entró entero y EN SU ORDEN. Ocho paradas: el orden es el del
     reloj del viaje, no el de dificultad, y migración va de SEGUNDA a propósito
     (es el momento de más miedo). Se afirma la lista completa porque
     reordenarla es justamente lo que no se puede hacer. */
  const t3 = a1.useA1.getState().unidades.filter((u) => u.tramo === 't3').map((u) => u.id);
  assert.deepEqual(t3, [
    't3-aeropuerto', 't3-migracion', 't3-avion', 't3-moverte',
    't3-hotel', 't3-comer', 't3-comprar', 't3-se-dana',
  ]);
  // Y va DESPUÉS de la oficina en el array, aunque se pueda abrir antes.
  assert.ok(ids().indexOf('u7-tareas') < ids().indexOf('t3-aeropuerto'));
});

/* ── b) las PENDIENTES no existen para el motor ──────────────────────────── */
test('ninguna unidad de PENDIENTES entra al catálogo ni se desbloquea', () => {
  reiniciar();
  const catalogo = new Set(ids());
  for (const id of PENDIENTES) {
    assert.equal(catalogo.has(id), false, `${id} no debería estar en unidades`);
    assert.equal(a1.estaDesbloqueada(id), false, `${id} no debería desbloquearse`);
  }
  // Y aun así el mapa las va a pintar: siguen declaradas en TRAMOS.
  assert.ok(TRAMOS.some((t) => t.unitIds.some((id) => PENDIENTES.has(id))));
});

/* ── c) día 1: solo la primera parada del Tramo 0 ─────────────────────────
   Esto es lo que prueba que `survival` dejó de abrir puertas. Antes, las siete
   unidades marcadas survival estaban abiertas desde el minuto cero — tres de
   ellas del Tramo 3 (viaje), que ni siquiera está cableado todavía. */
test('con progreso vacío solo abre la primera unidad del Tramo 0', () => {
  reiniciar();
  const abiertas = ids().filter((id) => a1.estaDesbloqueada(id));
  assert.deepEqual(abiertas, ['t0-cognados']);

  // Ninguna del Tramo 3, aunque tres de sus unidades sean survival.
  for (const u of a1.useA1.getState().unidades) {
    if (u.tramo === 't3') assert.equal(a1.estaDesbloqueada(u.id), false);
  }
  // Y el kit de supervivencia del tronco tampoco abre por ser survival.
  assert.equal(a1.estaDesbloqueada('u2-supervivencia'), false);

  // La cadena dentro del tramo sí corre: cerrar la primera abre la segunda.
  cerrarUnidades('t0-cognados');
  assert.equal(a1.estaDesbloqueada('t0-sonidos'), true);
  assert.equal(a1.estaDesbloqueada('t0-cortesia'), false);
});

/* ── d) un tramo vacío no mata la cadena ──────────────────────────────────
   t4, t6 y t7 son 100% PENDIENTES: no tienen ni una unidad resuelta. Si la
   cadena mirara "el tramo anterior" a secas, el Tramo 5 (tu trabajo) quedaría
   esperando para siempre a que se cierre un tramo que no tiene contenido — o
   sea, muerto, no "pronto". */
test('un tramo sin unidades resueltas es transparente para la cadena', () => {
  reiniciar();
  a1.useA1.getState().setPackUnits(PACK_TECH.units);

  // t4 no aporta ninguna unidad al catálogo.
  assert.equal(
    a1.useA1.getState().unidades.some((u) => u.tramo === 't4'),
    false,
  );
  assert.equal(a1.tramoCerrado('t4'), false, 'un tramo vacío no está "cerrado"');
  assert.equal(a1.tramoAbierto('t5'), false, 'todavía no: falta cerrar t0, t1, t2 y t3');

  /* Cerrando todo lo que SÍ tiene contenido antes de t5, el pack abre — sin que
     nadie haya podido cerrar t4, que no se puede cerrar.
     Ojo, t3 está en esta lista desde que el Tramo 3 se cableó: dejó de ser un
     tramo vacío y pasó a ser un eslabón real de la cadena. Su atajo abre el
     viaje temprano, pero NO lo da por cerrado, y "Tu trabajo" espera a que se
     cierre como espera a cualquier tramo con contenido. */
  const previas = a1.useA1
    .getState()
    .unidades.filter((u) => ['t0', 't1', 't2', 't3'].includes(u.tramo))
    .map((u) => u.id);
  cerrarUnidades(...previas);
  assert.equal(a1.tramoAbierto('t5'), true);
  assert.equal(a1.estaDesbloqueada('job-tech-u1'), true);
});

/* ── e) el pack de trabajo cae en el hueco del Tramo 5 ─────────────────────
   Ojo con cómo se afirma esto. Hoy t6 y t7 están vacíos, así que "en la
   posición de t5" y "al final del array" dan el MISMO índice: un test que
   compare contra `length - 1` pasa o falla por casualidad. Lo que se fija acá
   es la regla, no la coincidencia — que el catálogo entero salga ordenado por
   `order` de tramo con el pack adentro. El día que t6 traiga contenido, el pack
   se queda en su lugar y este test lo sigue cubriendo sin tocarlo. */
test('las unidades del pack caen en la posición de t5, no al final', () => {
  reiniciar();
  a1.useA1.getState().setPackUnits(PACK_TECH.units);
  const orden = ids();
  const i = orden.indexOf('job-tech-u1');
  assert.ok(i > 0, 'el pack tiene que estar en el catálogo');

  const ordenDeTramo = new Map(TRAMOS.map((t) => [t.id, t.order]));
  const tramoDe = new Map(a1.useA1.getState().unidades.map((u) => [u.id, u.tramo]));
  assert.equal(tramoDe.get('job-tech-u1'), 't5');

  const escalera = orden.map((id) => ordenDeTramo.get(tramoDe.get(id)));
  assert.deepEqual(
    escalera,
    escalera.slice().sort((a, b) => a - b),
    'el catálogo tiene que salir en orden de tramo, pack incluido',
  );
  assert.equal(escalera[i], 5);
  // Y nada del pack se cuela antes del tronco: lo de antes es todo t0..t4.
  assert.ok(escalera.slice(0, i).every((n) => n < 5));

  // Quitar el pack devuelve el catálogo base, sin huecos ni duplicados.
  a1.useA1.getState().setPackUnits([]);
  assert.equal(ids().includes('job-tech-u1'), false);
  assert.equal(new Set(ids()).size, ids().length);
});

/* ── f) el repaso arranca por el principio del camino ─────────────────────
   nuevos() recorre `unidades` en orden y de ahí salen las frases nuevas: el
   orden del array ES el currículo. Si el catálogo se desordena, esto lo canta. */
test('la primera frase nueva del repaso es del Tramo 0', () => {
  reiniciar();
  const [primero] = a1.nuevos(1);
  assert.ok(primero, 'tiene que haber algo nuevo el día 1');
  const unidad = a1.useA1.getState().indice.unidadDe[primero.id];
  assert.equal(unidad.tramo, 't0');
  assert.equal(unidad.id, 't0-cognados');

  // Y las primeras de la tanda son todas del Tramo 0, no un intercalado.
  const tramos = new Set(
    a1.nuevos(12).map((c) => a1.useA1.getState().indice.unidadDe[c.id].tramo),
  );
  assert.deepEqual([...tramos], ['t0']);
});

/* ── El denominador de la barra ──────────────────────────────────────────── */
test('la barra se mide contra el tramo activo, no contra el catálogo', () => {
  reiniciar();
  const p = a1.progresoDelTramo();
  assert.equal(p.tramo.id, 't0');

  /* El total del tramo se COMPUTA del catálogo, no se cablea a un número.
     Cuando `c-where-is-bathroom` pasó a COMPARTIRSE entre u5-ayuda y
     t0-preguntas —en vez de estar duplicado con dos ids, que es lo que el SRS
     cobraba dos veces— el Tramo 0 pasó de 95 frases a 96. Un número a mano
     convierte esa mejora en un test rojo, y el rojo se lee como "rompiste
     algo" cuando lo que pasó fue lo contrario.
     Lo que esta prueba defiende no es cuántas son: es que el denominador de la
     barra sea el del TRAMO ACTIVO y no el del catálogo entero. Con el catálogo
     como denominador, meter contenido nuevo le BAJA la barra a alguien que no
     hizo nada malo. */
  const ids = new Set();
  for (const u of a1.useA1.getState().unidades) {
    if (u.tramo !== 't0') continue;
    for (const s of u.scenes) for (const c of s.chunks) ids.add(c.id);
  }
  assert.equal(p.total, ids.size, 'el denominador tiene que ser el del tramo activo');
  assert.ok(ids.size > 0, 'el Tramo 0 no puede quedar sin frases');
  assert.ok(p.total < a1.totalChunks(), 'el tramo tiene que ser menor que el catálogo');
  assert.equal(p.pct, 0);
});

/* ── El salvavidas no repite ──────────────────────────────────────────────
   El contenido reusa a propósito el mismo chunk en dos escenas (una palabra que
   se ve en cognados y vuelve en la parada de pronunciación) para no inventarle
   un id nuevo: el SRS indexa por id y duplicarlo le cobraría dos veces al
   usuario la misma palabra. El índice tiene que absorber eso — si no, la Hoja
   de Pánico pinta dos elementos de React con la misma key. */
test('la lista de supervivencia no trae ids repetidos', () => {
  reiniciar();
  const sos = a1.useA1.getState().indice.supervivencia;
  assert.ok(sos.length > 0);
  assert.equal(new Set(sos.map((c) => c.id)).size, sos.length);
  // Y todas siguen siendo alcanzables el día 1, sin ninguna unidad abierta:
  // el índice es global, no filtra por desbloqueo. Esa es la razón por la que
  // `survival` pudo dejar de abrir unidades sin dejar a nadie sin salvavidas.
  assert.ok(sos.some((c) => a1.useA1.getState().indice.unidadDe[c.id].tramo !== 't0'));
});

/* ═══════════════════ EL ATAJO DE VIAJE ═══════════════════════════════════

   La regla: cerrar el Tramo 0 abre el Tramo 3 sin haber pasado por la oficina.
   Quien vuela la otra semana no va a hacer cuarenta nodos de pasillo primero.

   Los cuatro tests de abajo cubren las cuatro formas de arruinarlo, que son
   distintas y ninguna la cubre otra:
     · que no abra (el atajo no sirve de nada)
     · que abra desde el día 1 (deja de ser un atajo y pasa a ser un desorden)
     · que abra REGALANDO los tramos saltados (el usuario vuelve del viaje y su
       progreso de oficina apareció solo)
     · que lo abra `survival` por la puerta de atrás, que es la regresión que ya
       pasó una vez */

test('con el Tramo 0 cerrado el atajo abre el viaje sin pasar por la oficina', () => {
  reiniciar();
  cerrarTramo('t0');

  assert.equal(a1.tramoCerrado('t0'), true);
  assert.equal(a1.tramoCerrado('t1'), false, 'el atajo no puede depender de la oficina');
  assert.equal(a1.tramoCerrado('t2'), false);
  assert.equal(a1.tramoAbierto('t3'), true, 'el Tramo 3 tiene que abrir por el atajo');
  assert.equal(a1.estaDesbloqueada('t3-aeropuerto'), true);

  /* Y abre por la PRIMERA parada nada más. Dentro del tramo la cadena sigue
     corriendo igual: el atajo salta la fila de tramos, no las paradas de
     adentro. Migración se abre al cerrar el aeropuerto, no antes. */
  assert.equal(a1.estaDesbloqueada('t3-migracion'), false);
  cerrarUnidades('t3-aeropuerto');
  assert.equal(a1.estaDesbloqueada('t3-migracion'), true);
});

test('sin cerrar el Tramo 0 el atajo no existe', () => {
  reiniciar();
  assert.equal(a1.tramoAbierto('t3'), false);
  for (const u of delTramo('t3')) {
    assert.equal(a1.estaDesbloqueada(u.id), false, `${u.id} no puede estar abierta el día 1`);
  }
  assert.equal(a1.atajoDisponible('t3'), false, 'sin el Tramo 0 cerrado no hay nada que ofrecer');

  /* Ni con el Tramo 0 A MEDIAS. La puerta es "cerrado", no "empezado": si media
     parada alcanzara, el atajo sería una puerta abierta desde el minuto dos. */
  cerrarUnidades('t0-cognados', 't0-sonidos', 't0-cortesia');
  assert.equal(a1.tramoAbierto('t3'), false);
  assert.equal(a1.estaDesbloqueada('t3-aeropuerto'), false);
});

test('tomar el atajo no marca hechos los tramos que se saltó', () => {
  reiniciar();
  cerrarTramo('t0');

  // El usuario se va de viaje: hace el aeropuerto y migración enteras.
  cerrarUnidades('t3-aeropuerto', 't3-migracion');

  const hechas = new Set(a1.useA1.getState().progreso.doneScenes);
  for (const t of ['t1', 't2']) {
    for (const u of delTramo(t)) {
      assert.equal(a1.escenasHechas(u), false, `${u.id} no la hizo nadie`);
      for (const s of u.scenes) {
        assert.equal(hechas.has(s.id), false, `la escena ${s.id} no se puede dar por hecha`);
      }
    }
    assert.equal(a1.tramoCerrado(t), false, `${t} sigue sin cerrar`);
  }

  /* Y siguen ABIERTOS, esperándolo para cuando vuelva: el atajo salta la fila,
     no la borra. u1-llegar abre porque el Tramo 0 está cerrado. */
  assert.equal(a1.tramoAbierto('t1'), true);
  assert.equal(a1.estaDesbloqueada('u1-llegar'), true);
  // Y el viaje no se cerró tampoco: quedan seis paradas.
  assert.equal(a1.tramoCerrado('t3'), false);
});

test('ninguna unidad del Tramo 3 se abre por survival', () => {
  reiniciar();
  /* Tres paradas del viaje están marcadas `survival` en el contenido. Cuando
     `survival` desbloqueaba unidades, esas tres estaban abiertas desde el minuto
     cero — o sea que migración (la 2da) se abría antes que el aeropuerto (la
     1ra), y el atajo no tenía nada que abrir porque el viaje ya estaba medio
     abierto solo. */
  const marcadas = delTramo('t3').filter((u) => u.survival);
  assert.ok(marcadas.length >= 3, 'el contenido tiene que seguir marcando paradas survival');

  for (const u of marcadas) assert.equal(a1.estaDesbloqueada(u.id), false, `${u.id} abrió por survival`);

  // Con el atajo tomado tampoco: solo abre la primera del tramo, no las survival.
  cerrarTramo('t0');
  const abiertasT3 = delTramo('t3').filter((u) => a1.estaDesbloqueada(u.id)).map((u) => u.id);
  assert.deepEqual(abiertasT3, ['t3-aeropuerto']);

  // Las frases SOS del viaje SÍ están, y desde el día 1: viven en el salvavidas.
  reiniciar();
  const sos = a1.useA1.getState().indice.supervivencia;
  const deViaje = sos.filter((c) => a1.useA1.getState().indice.unidadDe[c.id].tramo === 't3');
  assert.ok(deViaje.length > 20, `el Tramo 3 tiene que aportar al salvavidas (aportó ${deViaje.length})`);
});

/* ── La píldora del atajo caduca ──────────────────────────────────────────
   `tramoAbierto` y `atajoDisponible` son preguntas distintas: la primera es el
   acceso (permanente) y la segunda el OFRECIMIENTO (caduca). Confundirlas deja
   una píldora ofreciendo entrar a donde el usuario ya está. */
test('el atajo se ofrece solo mientras sea un atajo de verdad', () => {
  reiniciar();
  cerrarTramo('t0');
  assert.equal(a1.atajoDisponible('t3'), true);

  // Ya entró: la oferta caduca, pero la puerta NO se cierra.
  cerrarUnidades('t3-aeropuerto');
  assert.equal(a1.atajoDisponible('t3'), false, 'ya empezó el viaje, no hay nada que ofrecer');
  assert.equal(a1.tramoAbierto('t3'), true, 'el acceso es permanente');

  /* Y si llegó caminando (cerró t1 y t2), tampoco: eso no es un atajo, es el
     camino. Una píldora ahí sería ruido. */
  reiniciar();
  cerrarTramo('t0');
  cerrarTramo('t1');
  cerrarTramo('t2');
  assert.equal(a1.tramoAbierto('t3'), true);
  assert.equal(a1.atajoDisponible('t3'), false);

  // Ningún otro tramo ofrece atajo de viaje: el branch es el que manda.
  reiniciar();
  cerrarTramo('t0');
  for (const t of ['t0', 't1', 't2', 't4', 't5', 't6', 't7']) {
    assert.equal(a1.atajoDisponible(t), false, `${t} no es un tramo de viaje`);
  }
});

/* ── rodeo_a1_tramo: el mapa se acuerda de dónde estabas ──────────────────
   Sin memoria, quien toma el atajo deja los tramos 1 y 2 abiertos y sin hacer,
   así que "la primera unidad sin terminar" sigue siendo la de la oficina: la
   barra y el rótulo del mapa medirían el pasillo mientras el tipo estudia
   migración. */
test('el tramo mirado se persiste y manda sobre el cálculo', () => {
  reiniciar();
  assert.equal(a1.tramoActivo(), 't0', 'sin memoria manda la primera unidad sin terminar');

  cerrarTramo('t0');
  assert.equal(a1.tramoActivo(), 't1', 'sin memoria, el atajo deja la barra en la oficina');

  a1.useA1.getState().verTramo('t3');
  assert.equal(a1.tramoActivo(), 't3');
  assert.equal(a1.progresoDelTramo().tramo.id, 't3');
  assert.equal(a1.progresoDelTramo().total, 68, 'el denominador tiene que ser el del viaje');

  /* La FORMA en disco: pasa por `store`, o sea JSON. Un id pelado sin comillas
     ahí sería una clave que no se puede volver a leer. */
  assert.equal(almacen.get('rodeo_a1_tramo'), '"t3"');

  // Terminado el tramo recordado, el cálculo vuelve a mandar solo: nadie tiene
  // que "cambiar de tramo" a mano para que la barra avance.
  cerrarTramo('t3');
  assert.equal(a1.tramoActivo(), 't1');

  // Y no pisa ninguna clave vieja: rodeo_a1_tramo es nueva y va sola.
  reiniciar();
  a1.useA1.getState().verTramo('t3');
  assert.deepEqual([...almacen.keys()], ['rodeo_a1_tramo']);
});

/* ── Las palabras sueltas nunca van a MCQ ─────────────────────────────────
   Sus distractores son glosas EN ESPAÑOL, así que la correcta sería la única
   palabra en inglés de la pantalla: se acierta sin saber nada. */
test('un chunk de tipo palabra nunca recibe rung mcq', () => {
  reiniciar();
  const { indice } = a1.useA1.getState();
  const palabra = indice.chunk['w-taxi'];
  assert.ok(palabra);
  for (const box of [1, 2, 3, 4, 5]) {
    a1.useA1.setState({ srs: { 'w-taxi': { box, due: '2020-01-01', seen: 1 } } });
    assert.notEqual(a1.rungDe(palabra, 'due'), 'mcq');
  }
  // Una frase de verdad sigue escalando como siempre.
  const frase = indice.chunk['c-repeat'];
  a1.useA1.setState({ srs: { 'c-repeat': { box: 1, due: '2020-01-01', seen: 1 } } });
  assert.equal(a1.rungDe(frase, 'due'), 'mcq');
});

/* ── Un beat de 'sonido' tampoco puede caer en un MCQ ─────────────────────
   Sus distractores PARECEN español pero no lo son: son pronunciaciones malas
   escritas en ortografía española (`w-h-hello: ["elou","jálo"]`), así que ahí un
   MCQ sí tendría sentido pedagógico. Igual no llega nunca, y por DOS caminos
   independientes — conviene que estén los dos clavados:
     · el chunk es `pal()` → kind 'palabra' → rungDe devuelve 'producir'
     · su secuencia por beat no tiene paso de anticipación, que es el único
       lugar donde se pinta el MCQ
   El segundo se verifica sobre el archivo porque la secuencia vive en un .tsx y
   Node no puede importarlo (el type stripping no hace JSX). */
test('el nodo sonido no tiene por dónde llegar a un MCQ', async () => {
  reiniciar();
  const { indice } = a1.useA1.getState();
  for (const id of ['w-th-think', 'w-v-very', 'w-h-hello', 'w-s-works']) {
    const c = indice.chunk[id];
    assert.ok(c, `falta ${id}`);
    a1.useA1.setState({ srs: { [id]: { box: 1, due: '2020-01-01', seen: 1 } } });
    assert.notEqual(a1.rungDe(c, 'due'), 'mcq', `${id} no puede ir a MCQ`);
  }

  const { readFile } = await import('node:fs/promises');
  const sesion = await readFile(new URL('src/views/a1/sesion.tsx', RAIZ), 'utf8');
  const rama = sesion.match(/if \(nodo === 'sonido'\) \{[\s\S]*?\n {2}\}/)?.[0];
  assert.ok(rama, 'no encontré la rama de secuencia del nodo sonido');
  assert.doesNotMatch(rama, /anticipacion/);
  assert.match(rama, /'par'/);
});
