import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/* LA URL DE GOOGLE FONTS TIENE QUE SER LA MISMA EN LOS DOS LADOS.

   `public/sw.js` precachea en install una lista de assets de CDN (CDN_WARM), y
   lo hace por CADENA EXACTA: `cache.addAll` guarda la URL tal cual y luego el
   fetch handler la busca igual. Su propio comentario ya lo decía —«Deben
   coincidir EXACTO con los <link>/<script> del <head> de index.html»— pero era
   una regla escrita, no comprobada, y se rompió.

   CÓMO SE ROMPIÓ (2026-08-09, rebranding a Hablarte): se añadió
   `Cormorant+Garamond` a la URL de fuentes del <head> para el wordmark y no se
   tocó sw.js. Resultado medido en producción: el service worker seguía con la
   URL vieja cacheada, la página pedía la nueva, y esa hoja —que BLOQUEA EL
   RENDER— pasó a fallar el caché y salir a la red en CADA carga. Nada se
   rompió a la vista; solo se puso lento, que es justo lo que no se nota
   revisando un diff.

   Por eso el test compara cadenas y no "que ambas mencionen Google Fonts": el
   fallo era una diferencia de un parámetro dentro de una URL por lo demás
   idéntica.

   Se comprueba `public/sw.js` y NO el `sw.js` de la raíz: el que se despliega
   es el de public/ (es lo que sirve Vite y lo que entra en dist/); el de la
   raíz es un duplicado rezagado que no llega a ningún navegador. */

const RAIZ = new URL('../', import.meta.url);
const leer = (rel) => readFileSync(new URL(rel, RAIZ), 'utf8');

/** Todas las URLs de la API css2 de Google Fonts que haya en un texto. */
function urlsDeFuentes(texto) {
  return texto.match(/https:\/\/fonts\.googleapis\.com\/css2\?[^"'\s]+/g) ?? [];
}

test('index.html declara exactamente UNA hoja de Google Fonts', () => {
  const urls = urlsDeFuentes(leer('index.html'));
  assert.equal(
    urls.length,
    1,
    `el <head> declara ${urls.length} hojas de Google Fonts; con más de una, CDN_WARM no puede seguirle el paso`,
  );
});

test('public/sw.js precalienta exactamente UNA hoja de Google Fonts', () => {
  const urls = urlsDeFuentes(leer('public/sw.js'));
  assert.equal(urls.length, 1, `CDN_WARM tiene ${urls.length} URLs de Google Fonts, se esperaba 1`);
});

test('la URL de Google Fonts del <head> y la de CDN_WARM son IDÉNTICAS', () => {
  const [enHead] = urlsDeFuentes(leer('index.html'));
  const [enSw] = urlsDeFuentes(leer('public/sw.js'));

  assert.equal(
    enSw,
    enHead,
    'index.html y public/sw.js piden fuentes distintas: el precache del service worker ' +
      'falla y una hoja que bloquea el render sale a la red en cada carga. ' +
      'Si añadiste una familia al <head>, añádela también a CDN_WARM en public/sw.js.',
  );
});

/* La familia se puede añadir — lo que no se puede es añadirla en un solo lado.
   Este caso deja constancia de la que causó el fallo, para que si vuelve lo
   haga por la puerta de adelante y con el test de arriba vigilando. */
test('si vuelve Cormorant Garamond, vuelve en los DOS archivos', () => {
  const enHead = urlsDeFuentes(leer('index.html'))[0] ?? '';
  const enSw = urlsDeFuentes(leer('public/sw.js'))[0] ?? '';
  assert.equal(
    /Cormorant/i.test(enHead),
    /Cormorant/i.test(enSw),
    'Cormorant Garamond está en uno de los dos archivos y no en el otro',
  );
});
