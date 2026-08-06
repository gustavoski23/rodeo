# El fork de `@gfazioli/mantine-book`

Copia de `node_modules/@gfazioli/mantine-book@1.0.5/dist/esm/` con **dos
archivos cambiados** y **uno nuevo**. Todo lo demás está byte a byte igual que
el paquete, y hay una prueba que lo comprueba
(`tests/mobile-performance.test.mjs`, «the vendored fork stays honest»).

## Por qué existe

El curl 3D no dibuja texto: dibuja una **textura**, y esa textura es un
screenshot del DOM que `snapdom` rasteriza a PNG. Lo que se midió
(PERF-libro.md, `tests/perf/`):

- La librería rasteriza **cuatro caras por volteo**, y **dos son por nada**.
- Las lanza **en cuanto la hoja aterriza**, que es justo cuando el dedo va a
  volver a pasar. A 4× de CPU y a ritmo de lectura real, esas rasterizaciones
  solapaban el gesto siguiente 1-3 veces y **el curl no llegaba a dibujarse ni
  una vez**: el volteo entero se veía como el pliegue plano del DOM.
- El snapshot sale con **otra tipografía** que la página quieta.

Nada de eso se puede tocar desde fuera. `<Book>` calcula el `warm` de cada hoja
por dentro y lo mete como *override* en `React.cloneElement` (`Book.mjs`, la
tabla de `overrides`), así que **gana siempre** sobre lo que se le pase a
`<Book.Page>`; y el `defaultProps` del tema de Mantine pierde contra ese
override. No hay API de precarga ni acceso al pool de snapshots.

## Por qué vendorizado y no `patch-package`

Se evaluaron los dos:

| | Vendorizar | `patch-package` |
|---|---|---|
| Dependencia nueva | ninguna | una devDependency |
| Paso de build | ninguno | `postinstall` |
| Si el paso no corre | no puede pasar | el arreglo desaparece **en silencio** |
| Diff visible | archivos con marcas `FORK n` + esta nota | un `.patch` de ~40 líneas |
| Subir de versión | copiar de nuevo y reaplicar a mano | falla ruidosamente |

Decidió el renglón del silencio: un `npm ci --ignore-scripts` en cualquier CI o
en Vercel dejaría el libro rasterizando cuatro caras por volteo sin que nadie se
entere. Y el repo no tiene `postinstall` hoy; no parecía el sitio para estrenar
uno. El coste que sí se paga es ~1.900 líneas de código de terceros en `src/`.

El paquete **sigue instalado y clavado en 1.0.5**: de él salen los estilos
(`styles.layer.css`), los tipos (`index.d.ts` los reexporta) y `@zumer/snapdom`.

## Los cambios

### `Curl/webgl/CurlWebglLayer.mjs`

- **FORK 1** — se separa el dpr del *snapshot* del dpr del *render*.
- **FORK 2** — `flipped` sale de `captureKey`, y entra la *generación* de la
  caché. Al voltear, `frontContent` y `backContent` de `Curl.mjs` son los mismos
  dos nodos con los papeles intercambiados: no hay nada que rasterizar, solo que
  intercambiar. Eso es la mitad del trabajo por volteo.
- **FORK 3** — la captura consulta la caché primero, y cuando la hoja solo está
  *caliente* (aún sin volteo) se agenda en `requestIdleCallback` con `timeout`.
- **FORK 4** — se quita el efecto que **borraba** las imágenes al enfriarse la
  hoja. Ahora las guarda la LRU acotada, que sí las suelta de verdad.

### `Curl/webgl/snapshot.mjs`

- **FORK 5** — `embedFonts: true`. Con `false`, el `<foreignObject>` rasteriza
  en un contexto aislado, sin las `@font-face` del documento, y cae a la serif
  del sistema: la misma cara difiere en el **9,7 %** de sus píxeles y los saltos
  de línea no caen en el mismo sitio.

### `curl-cache.mjs` (archivo nuevo)

La LRU acotada a **6 caras** y `invalidarCaras()`, el único punto por el que la
vista avisa de lo que la librería no puede saber: el **A−/A+** y el **cambio de
libro** reordenan el texto sin cambiar el tamaño de la página, así que la
textura vieja mostraría el layout anterior.

### Por qué no sigue el patrón de `usePrecarga`

`usePrecarga` (`src/views/libro/index.tsx`) baja las 42 láminas en tandas de 5
con `img.decode()`, y su tope de concurrencia existe porque decodificar 42
bitmaps de 1400×1960 a la vez son ~460 MB. Aquí el trabajo es otro: no se
descarga nada —el DOM ya está— sino que se **rasteriza**, y las rasterizaciones
las dispara la librería una por hoja caliente, nunca más de dos a la vez. Lo que
esta caché comparte con `usePrecarga` es lo único que importaba: **el tope**. Seis
caras, y al desalojar se suelta de verdad (se revoca la `blob:` URL), igual que
allí se acota el pico de memoria en vez de dejarlo crecer.

## Cómo subir de versión

1. `npm i @gfazioli/mantine-book@<nueva>` y mirar el changelog de
   `Curl/webgl/` y de `Book.mjs` (el cálculo de `warm`).
2. Copiar el `dist/esm` nuevo encima de `src/vendor/mantine-book/`, quitando los
   `.map` y las líneas `//# sourceMappingURL=`.
3. Reaplicar FORK 1-4 en `CurlWebglLayer.mjs` y FORK 5 en `snapshot.mjs`, y
   volver a poner `curl-cache.mjs` (que la copia no toca).
4. Correr `tests/perf/medir.mjs` y comparar contra la tabla de PERF-libro.md.
   Si el `camino` deja de ser 0, algo del fork no se reaplicó.

**No se puede subir a ciegas**: el contrato del `pointercancel` sintético de
`src/views/libro/index.tsx` (deslizar hacia atrás en el móvil) depende del
comportamiento interno de esta versión exacta. Por eso la dependencia va sin
`^` en package.json.
