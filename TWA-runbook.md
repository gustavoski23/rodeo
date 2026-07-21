# RODEO en Google Play como TWA — runbook real

Guía concreta para empaquetar RODEO (PWA en Vercel) como **Trusted Web Activity**
y publicarla en Google Play. TWA = tu web corriendo dentro de un contenedor
Android sin barra de URL, indistinguible de una app nativa. La lógica sigue
siendo tu `index.html` servido desde Vercel; el APK/AAB es solo la cáscara.

Dominio de producción asumido: **https://rodeo-sigma.vercel.app**
(Si el dominio real es otro — p.ej. `rodeo-gustavoski23s-projects.vercel.app` —
sustitúyelo en TODOS los comandos y en `assetlinks.json`; el host debe coincidir
exactamente o la verificación de Asset Links falla y la barra de URL no desaparece.)

---

## (a) Prerequisitos — la app YA debe ser una PWA instalable

Bubblewrap arranca desde un Web App Manifest. Antes de empaquetar, RODEO necesita:

1. **`manifest.webmanifest` servido en la raíz.** HOY el repo NO lo tiene (index.html
   no enlaza ningún `<link rel="manifest">`). Hay que crearlo y enlazarlo. Mínimo:
   ```json
   {
     "name": "RODEO — tu inglés 24/7",
     "short_name": "RODEO",
     "start_url": "/",
     "scope": "/",
     "display": "standalone",
     "background_color": "#0a0a0e",
     "theme_color": "#0a0a0e",
     "icons": [
       { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
       { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
       { "src": "/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
     ]
   }
   ```
   Y en `<head>` de index.html: `<link rel="manifest" href="/manifest.webmanifest">`.
   `theme_color`/`background_color` = `#0a0a0e` (el theme-color que ya usa la app).

2. **Iconos PNG reales** (192, 512, y un 512 *maskable* con safe-zone) servidos
   desde la raíz. Play EXIGE un icono de 512×512 para la ficha, aparte de estos.

3. **Service worker** — recomendado, no estrictamente obligatorio para TWA, pero
   sin él Chrome puede no ofrecer "instalar" y la app no funciona offline. Un SW
   mínimo (cache del shell) basta. Sin SW, la TWA igual carga si hay red.

4. **HTTPS** — ya lo da Vercel. Requisito absoluto para TWA.

> Verifica con Lighthouse (pestaña PWA en Chrome DevTools) que el manifest y el
> icono se detectan ANTES de correr Bubblewrap; si Lighthouse no ve la PWA,
> Bubblewrap tampoco.

---

## (b) Generar el AAB con Bubblewrap

Bubblewrap (CLI oficial de Google) es lo que Google recomienda para TWA.

**Instalación (una vez):**
```bash
npm install -g @bubblewrap/cli
```
Requiere **JDK 17** y el **Android SDK**. En el primer `init`, Bubblewrap ofrece
descargar y gestionar ambos por ti (acepta) — o apúntale a instalaciones tuyas.

**Inicializar el proyecto (desde una carpeta VACÍA, fuera del repo de la web):**
```bash
bubblewrap init --manifest https://rodeo-sigma.vercel.app/manifest.webmanifest
```

Lo que pregunta y qué responder:
- **Domain / host** → `rodeo-sigma.vercel.app` (lo deduce del manifest; confírmalo).
- **Application name / launcher name** → `RODEO` (launcher name ≤ 12 chars idealmente).
- **Application ID (package name)** → `app.vercel.rodeo`.
  ⚠️ Este string es **permanente**: identifica la app en Play para siempre y NO se
  puede cambiar tras publicar. Debe coincidir EXACTO con `package_name` en
  `assetlinks.json`. Usa un ID que controles; si algún día pones dominio propio,
  el package puede quedar igual (no tiene que derivar del dominio).
- **Display mode** → `standalone` (sin barra). (`fullscreen` oculta también la
  barra de estado; para una app de lectura, `standalone` es lo correcto.)
- **Orientation** → `default` o `portrait`.
- **Theme color / background color / nav bar color** → `#0a0a0e` (consistente con
  la app; el splash usa background_color).
- **Splash screen color** → `#0a0a0e`.
- **Icon / maskable icon** → los toma del manifest; confirma que resuelven.
- **Include support for shortcuts** → opcional, `No` está bien para empezar.
- **Signing key (keystore)** → aquí decides la clave de firma (ver abajo).

**Construir:**
```bash
bubblewrap build
```
Genera:
- `app-release-signed.aab` → **esto es lo que subes a Play Console.**
- `app-release-signed.apk` → para instalar y probar en un teléfono
  (`adb install app-release-signed.apk`).

Para actualizar la cáscara más adelante (cambio de icono, target API, nombre):
sube la `appVersionCode` en `twa-manifest.json` y vuelve a `bubblewrap build`.

### El keystore — NO LO PIERDAS (esto es lo más importante de todo)

- En el `init`/`build`, Bubblewrap crea (o reutiliza) un **keystore** (`android.keystore`)
  con una clave de firma, protegida por dos contraseñas (store password y key
  password) y un alias.
- **Guarda el archivo `.keystore` + las contraseñas + el alias en un lugar seguro y
  respaldado** (gestor de contraseñas + copia offline). Si usas **Play App Signing**
  (recomendado y por defecto), esta clave es tu **upload key**: si la pierdes,
  Google puede resetearla vía soporte. PERO si NO usas Play App Signing y firmas
  tú la clave de app, perderla significa **no poder volver a actualizar la app
  nunca** — tendrías que publicar una app nueva con otro package. Trátalo como
  irremplazable.
- El **SHA-256 de la clave de FIRMA (no la de upload)** es el que va en
  `assetlinks.json`. Con Play App Signing, ese SHA-256 lo da Play Console (ver c).

---

## (c) Digital Asset Links — quitar la barra de URL

La TWA solo esconde la barra de URL si Chrome verifica que el dominio y la app se
"conocen". Eso se hace publicando `/.well-known/assetlinks.json` en tu dominio.

1. **Obtén el fingerprint SHA-256.** Dos fuentes según cómo firmes:
   - **Con Play App Signing (recomendado):** el fingerprint correcto es el de la
     clave que Google usa para firmar. Está en **Play Console → tu app → Test and
     release → App integrity (Integridad de la app) → App signing**, campo
     "SHA-256 certificate fingerprint". Ese es el que cuenta para los usuarios que
     instalan desde Play.
   - **Desde tu keystore local (upload key / pruebas con el APK):**
     ```bash
     keytool -list -v -keystore android.keystore -alias <tu-alias>
     ```
     Copia la línea `SHA256:` (formato `AB:CD:EF:...`).
   - Bubblewrap también genera un `assetlinks.json` de referencia en la carpeta del
     proyecto (`bubblewrap fingerprint` lista/gestiona huellas).

   > Práctico: incluye AMBOS fingerprints (upload key y app-signing key) en el
   > array `sha256_cert_fingerprints` para que la verificación funcione tanto con
   > el APK de prueba como con la build firmada por Google.

2. **Pon el fingerprint en `.well-known/assetlinks.json`** (scaffold entregado en
   este mismo lote). Reemplaza `REEMPLAZAR_CON_FINGERPRINT_DEL_KEYSTORE` por el/los
   SHA-256 reales y confirma que `package_name` = `app.vercel.rodeo`. El archivo es
   JSON estricto (Google lo consume): **no lleva comentarios**; por eso la nota de
   "de dónde sale el fingerprint" vive en este runbook y no dentro del JSON.

3. **Publícalo** en `https://rodeo-sigma.vercel.app/.well-known/assetlinks.json`,
   servido con `Content-Type: application/json` y accesible sin auth/redirect.
   (En este proyecto: en local lo sirve dev-server.mjs desde `/.well-known/`; en
   Vercel, un archivo estático en esa ruta se sirve solo. Verifica que el
   PIN/APP_PASS del proxy NO bloquee esta ruta — solo protege `/api/chat`.)

4. **Redeploy** de la web y verifica:
   ```bash
   curl https://rodeo-sigma.vercel.app/.well-known/assetlinks.json
   ```
   Debe devolver el JSON con el fingerprint real. Google también ofrece el
   Statement List Generator/Tester para validar. Una vez correcto, al abrir la app
   la barra de URL desaparece (puede tardar unos segundos en la primera apertura
   mientras Chrome cachea la verificación).

---

## (d) Google Play Console — publicar

1. **Cuenta de desarrollador:** pago **único de USD $25** (no anual) en
   https://play.google.com/console. Requiere **verificación de identidad**
   (documento oficial, dirección) y, para cuentas nuevas, puede pedir
   **verificación por video/teléfono**. Da varios días; empieza esto temprano.

2. ⚠️ **LA TRAMPA de las cuentas de desarrollador INDIVIDUALES (personales):**
   desde 2023, si abriste la cuenta como **individual** (no como organización con
   D-U-N-S), Google exige, ANTES de poder lanzar a producción:
   - **Testing cerrado con mínimo 12–20 testers** (Google pide "al menos 20
     testers" que hayan opted-in), y
   - **mantenerlos activos durante 14 días seguidos**.

   Recién después se habilita el acceso a producción. Planifica: consigue 20
   correos de Google reales (amigos, otro grupo), créalos como lista de testers en
   **Closed testing**, y arranca el conteo de 14 días cuanto antes — es el cuello
   de botella real del cronograma, no el empaquetado.

3. **Crear la app** en Play Console → "Create app": nombre, idioma por defecto
   (Español), tipo "App", gratis/pago.

4. **Ficha de Play Store (Store listing):**
   - **Título:** RODEO — tu inglés 24/7 (máx 30 chars → recorta a p.ej.
     "RODEO: inglés 24/7").
   - **Descripción corta** (≤80 chars) y **descripción larga** (≤4000): enfoque en
     lectura diaria de inglés B2→C1, drops, práctica de shadowing/pronunciación.
   - **Capturas de pantalla:** mínimo 2 de teléfono (Play recomienda 4–8). Toma
     screenshots reales de la app corriendo (portada DROP, una edición abierta,
     el modo TALK). Formato PNG/JPG, proporción de teléfono.
   - **Icono de la ficha:** 512×512 PNG (aparte de los del manifest).
   - **Feature graphic:** 1024×500.
   - **Categoría:** **Educación** (Category = Education). Etiquetas/tags de idiomas.
   - Datos de contacto (email) y **enlace a la política de privacidad** (ver 6).

5. **Subir el AAB:** en un track (empieza por **Closed testing**, luego promueve a
   **Production**). Sube `app-release-signed.aab`. Acepta **Play App Signing**
   cuando lo ofrezca (recomendado; es lo que da el SHA-256 del paso c).

6. **Cuestionario de privacidad y "Data safety" — DECLARA el micrófono con honestidad:**
   RODEO usa el micrófono y **envía audio fuera del dispositivo**:
   - **Dictado / reconocimiento de voz** → audio procesado por **Google** (Web
     Speech API del navegador).
   - **TTS / voz** → RODEO habla con **Deepgram** vía `/api/tts` (audio/texto sale a
     un tercero).

   En **App content → Data safety** debes declarar:
   - Que la app **recoge/comparte audio o "Voice or sound recordings"** y lo envía a
     terceros para funcionalidad de la app.
   - **Permiso `RECORD_AUDIO`** → en el formulario de permisos declara para qué se
     usa (entrada de voz / práctica de pronunciación).
   - Que hay **datos compartidos con terceros** (Deepgram, Google) para procesar voz.

   Esto **obliga a tener una POLÍTICA DE PRIVACIDAD publicada** en una URL pública
   (p.ej. `https://rodeo-sigma.vercel.app/privacy.html`) que explique: qué datos de
   voz se capturan, que se envían a Deepgram y a Google para procesarlos, que no se
   almacenan permanentemente (si es el caso), y cómo contactar. Sin esa URL, Play
   rechaza la publicación. Créala como archivo estático en Vercel.

   - **Content rating:** completa el cuestionario IARC (para una app educativa sin
     contenido sensible, saldrá "Everyone / Para todos").
   - **Target audience:** define el rango de edad (adultos/13+); evita marcar
     "dirigida a niños" (dispara reglas de Families más estrictas).

7. **Revisión:** Google revisa la primera versión (horas a varios días). Corrige lo
   que marque y reenvía.

---

## (e) Target API level exigido por Google Play (2026)

Google sube el mínimo cada año (~agosto). **Apps nuevas y actualizaciones deben
apuntar a un `targetSdkVersion` reciente** (regla vigente: no más de un año por
detrás de la última versión mayor de Android). A mediados de 2026 esto significa,
en la práctica, **target API 35 (Android 15) o superior** para publicar/actualizar.

- Bubblewrap suele generar con un `targetSdkVersion` actual, pero **verifícalo**:
  antes de subir, confirma en `twa-manifest.json` / `build.gradle` que el
  `targetSdkVersion` cumple el mínimo del año en curso. Si Play lo rechaza por
  target bajo, sube la versión de Bubblewrap/SDK, ajusta el target y reconstruye.
- Consulta el requisito exacto vigente en la doc de Play ("Target API level
  requirements") el día que subas — el número se mueve cada año.

---

## (f) Qué se actualiza SOLO y qué obliga a re-subir el AAB

**Se actualiza solo (sin tocar Play, sin re-subir nada), con solo hacer deploy en Vercel:**
- Todo el contenido y la lógica de la web: `index.html`, el JS, los prompts, los
  endpoints `/api/*`, estilos, textos, el generador de drops. La TWA carga la web
  en vivo, así que un `git push` / deploy en Vercel llega al usuario al instante,
  sin pasar por revisión de Play.
- El `manifest.webmanifest`, los iconos servidos por la web, la política de
  privacidad, `assetlinks.json`.

**Obliga a reconstruir con Bubblewrap y re-subir el AAB a Play (y pasar revisión):**
- Cambiar el **nombre de la app** (launcher name) o el **icono del launcher**
  empaquetado / splash.
- Cambiar el **`package_name`** (en realidad no se puede: sería una app nueva).
- Subir el **`targetSdkVersion`** para cumplir el mínimo anual de Play (e).
- Cambiar **colores de tema/splash** definidos en la cáscara, orientación, o el
  **scope/host** de la TWA (si mudas de dominio).
- Actualizar la **versión de Bubblewrap** o dependencias del contenedor por
  seguridad.
- Cualquier cambio en permisos nativos declarados en la cáscara.

Cada re-subida incrementa `appVersionCode` (entero creciente) en `twa-manifest.json`
antes de `bubblewrap build`.

---

## Checklist mínimo antes del primer submit
- [ ] `manifest.webmanifest` + iconos (192/512/512-maskable) servidos y enlazados en index.html
- [ ] Lighthouse detecta la PWA como instalable
- [ ] `bubblewrap init` con `package_name = app.vercel.rodeo`, `bubblewrap build` → AAB
- [ ] Keystore + contraseñas + alias respaldados en lugar seguro
- [ ] `assetlinks.json` con el SHA-256 real (upload + app-signing) desplegado y verificado con curl
- [ ] Política de privacidad publicada (declara micrófono → Deepgram/Google)
- [ ] Cuenta Play ($25, identidad verificada)
- [ ] 20 testers en closed testing corriendo los 14 días (cuenta individual)
- [ ] Ficha completa (título, descripciones, capturas, categoría Educación)
- [ ] Data safety + content rating + target audience declarados
- [ ] targetSdkVersion cumple el mínimo vigente de Play
