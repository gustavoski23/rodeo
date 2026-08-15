import assert from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* EL NIVEL A1, LEÍDO CON TOLERANCIA — y el mapa que le toca.

   Esto existe por un fallo REAL en producción: la ruta A1 abría el mapa
   legacy ("RUTA · CON ALFRED", 52 paradas, la ilustración del aeropuerto) en
   vez de la experiencia nueva. La causa era una familia entera de
   comparaciones sueltas contra la cadena 'A1':

     · views/a1/index.tsx elegía el mapa con `nivel === 'A1'`, así que un
       `rodeo_nivel` en null —entrar por la card RUTA sin haber pasado el
       onboarding— caía al legacy.
     · index.html comparaba contra 'a1' MINÚSCULA y el valor persistido es
       'A1', o sea que la clase `nivel-a1` no se aplicó nunca.

   Se prueba el MOTOR de verdad (src/lib/nivel.ts) con el mismo arnés de
   type stripping + alias que tests/a1-ruta.test.mjs, y además se atan las dos
   copias de la regla: la de TypeScript y la del script inline del HTML, que no
   puede importar nada porque corre antes del bundle. */

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

const hookUrl = new URL(
  'nivel-a1-alias-hook.mjs',
  pathToFileURL(process.env.TEMP || process.env.TMPDIR || '/tmp').href + '/',
);
writeFileSync(fileURLToPath(hookUrl), HOOK, 'utf8');
register(hookUrl);

const { esNivelA1, normalizarNivel } = await import(new URL('lib/nivel.ts', SRC).href);
const leer = (path) => readFile(new URL(path, RAIZ), 'utf8');

/* Las aserciones "esto NO puede aparecer" se hacen contra el CÓDIGO, no contra
   el archivo entero. Este repo comenta las trampas que ya costaron una ronda
   —«antes había un ternario nivel === 'A1' ? …»— y sin esto el propio
   comentario que documenta el bug haría fallar el test que lo vigila. */
const soloCodigo = (fuente) =>
  fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const leerCodigo = async (path) => soloCodigo(await leer(path));

test('esNivelA1 acepta las formas que de verdad hay en los discos', () => {
  // La canónica, la que escribe el onboarding de hoy.
  assert.equal(esNivelA1('A1'), true);
  // La minúscula: lo que index.html buscaba y la app nunca guardó.
  assert.equal(esNivelA1('a1'), true);
  // La etiqueta que ve el usuario en el selector.
  assert.equal(esNivelA1('A1 Básico'), true);
  assert.equal(esNivelA1('a1 basico'), true);
  // Espacios de sobra de un copiar/pegar o de un sync.
  assert.equal(esNivelA1('  A1  '), true);
});

test('esNivelA1 no se traga lo que NO es A1', () => {
  assert.equal(esNivelA1('B1'), false);
  assert.equal(esNivelA1('B2-C1'), false);
  assert.equal(esNivelA1(null), false);
  assert.equal(esNivelA1(undefined), false);
  assert.equal(esNivelA1(''), false);
  /* Un futuro 'PRE-A1' NO es este nivel: por eso la regla es "empieza por A1"
     y no "contiene a1", que es la forma fácil de que un nivel nuevo herede la
     ruta del principiante sin que nadie lo decida. */
  assert.equal(esNivelA1('PRE-A1'), false);
});

test('normalizarNivel deja una sola forma en disco y no inventa nada', () => {
  assert.equal(normalizarNivel('a1'), 'A1');
  assert.equal(normalizarNivel('A1 Básico'), 'A1');
  assert.equal(normalizarNivel('  A1 '), 'A1');
  // Lo que no es A1 se respeta TAL CUAL: la migración no reescribe niveles
  // ajenos ni le supone un nivel a quien no eligió ninguno.
  assert.equal(normalizarNivel('B2-C1'), 'B2-C1');
  assert.equal(normalizarNivel(null), null);
  assert.equal(normalizarNivel(''), null);
});

test('la migración de rodeo_nivel no toca el gate de la ruta', async () => {
  const app = await leerCodigo('src/stores/app.ts');
  // Migra el nivel...
  assert.match(app, /function migrarNivel/);
  assert.match(app, /store\.set\('rodeo_nivel', canonico\)/);
  // ...y NO marca la ruta como vista: haber usado la app no es haber visto el
  // mapa. Si esto se rompe, un usuario viejo se salta el onboarding de Alfred.
  assert.doesNotMatch(app, /store\.set\('rodeo_a1_onboarded'/);
});

test('la vista A1 monta la experiencia nueva y nunca el mapa legacy', async () => {
  const vista = await leerCodigo('src/views/a1/index.tsx');
  assert.match(vista, /<MapaExperiencia/);
  // El legacy dejó de ser una pantalla: ni se importa ni se renderiza. Es la
  // regresión que trajo el mapa de "52 paradas" a producción.
  assert.doesNotMatch(vista, /<Mapa\s/);
  assert.doesNotMatch(vista, /from '\.\/mapa'/);
  // Y el mapa ya no depende del nivel: esa condición ERA el bug.
  assert.doesNotMatch(vista, /nivel === 'A1'/);
});

test('el arranque de index.html usa la misma regla que lib/nivel.ts', async () => {
  const html = await leerCodigo('index.html');
  /* La comparación contra 'a1' pelada es exactamente el fallo original. El
     script inline no puede importar (corre antes del bundle), así que lo que
     se ata acá es que repita la REGLA —normalizar y comparar— y no una
     igualdad suelta contra una sola forma. */
  assert.doesNotMatch(html, /rodeo_nivel'\) \|\| 'null'\) === 'a1'/);
  assert.match(html, /toUpperCase\(\)/);
  assert.match(html, /=== 'A1'/);
  assert.match(html, /indexOf\('A1 '\) === 0/);
});

test('vistaInicial manda a la ruta a cualquier forma de A1', async () => {
  const app = await leerCodigo('src/stores/app.ts');
  assert.match(app, /esNivelA1\(store\.get<string \| null>\('rodeo_nivel', null\)\)/);
  assert.doesNotMatch(app, /'rodeo_nivel', null\) === 'A1'/);
});
