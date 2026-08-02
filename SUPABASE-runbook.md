# SUPABASE — runbook: login + sync entre dispositivos

Proyecto: `gustavoski23's Project` → `https://cablhejzsxqgwdvyzqei.supabase.co`
(región East US, GitHub conectado a `gustavoski23/rodeo`).

> **Estado (22 jul 2026):**
> - ✅ Paso 1 — key `sb_publishable_*` pegada en `js/supabase-sync.js`
> - ✅ Paso 2 — tabla `public.rodeo_state` creada con RLS owner-only (vía MCP)
> - ⏳ Paso 3 — configurar Site URL + 3 Redirect URLs (2 min) → **activa el login por correo**
> - ▫️ Paso 4 — Google OAuth (15 min, OPCIONAL — solo si quieres el botón de Google)

La app ya trae DOS formas de entrar (perfil → Cuenta & sync):
**correo con enlace mágico/código** (solo necesita el Paso 3) y
**Google** (necesita el Paso 4).

---

## Paso 3 — Activar el login por correo (2 min, sin Google Cloud)

1. Dashboard → **Authentication** (icono de candado) → **URL Configuration**.
2. **Site URL**: `https://rodeo-sigma.vercel.app`  ← el dominio canónico, el que de verdad usas.
3. **Redirect URLs** → Add URL (las TRES):
   - `https://rodeo-sigma.vercel.app`
   - `https://rodeo-gustavoski23s-projects.vercel.app`
   - `http://localhost:4870`
4. Save. **Ya está** — el botón "MÁNDAME EL ENLACE" del perfil funciona.

> **Por qué importa cuál es la Site URL (no es un detalle cosmético):** la sesión
> de Supabase se guarda en `localStorage`, que es **por-origen** — cada dominio
> tiene su propio almacén, aislado del otro. El enlace mágico del correo te
> devuelve SIEMPRE a la **Site URL**. Si esa Site URL apunta al alias que NO usas
> (`rodeo-gustavoski23s-projects.vercel.app`), tocas el enlace y "entras"… pero
> quedas logueado en el dominio equivocado: al abrir la app en el dominio
> canónico (`rodeo-sigma.vercel.app`) **no ves tu sesión**, porque vive en el otro
> origen. Por eso la **Site URL = el dominio que de verdad usas**
> (`rodeo-sigma.vercel.app`), y las dos URLs de Vercel van ambas en **Redirect
> URLs** para que el enlace funcione abras la app donde la abras.

**Opcional recomendado (+30 s), para poder entrar pegando un código sin salir
de la app** (mejor aún dentro del TWA): Authentication → **Emails** (o Email
Templates) → plantilla **Magic Link** → añade esta línea debajo del enlace y
guarda:

```html
<p>O pega este código en la app: {{ .Token }}</p>
```

> Nota: el remitente default de Supabase solo envía correos a miembros del
> proyecto (tú) y con límite bajo por hora — perfecto para RODEO personal.
> La sesión persiste meses por dispositivo: entras UNA vez por aparato.

---

## Paso 4 — Google OAuth (15 min, OPCIONAL)

Solo si quieres el botón "con Google" además del correo:

### 4a. Google Cloud Console
1. https://console.cloud.google.com → crea proyecto (`rodeo`).
2. **APIs & Services → OAuth consent screen**: External → app `RODEO`, tu
   Gmail en support y developer email → Save. En Testing añádete como test user.
3. **Credentials → + Create credentials → OAuth client ID**:
   - Type: **Web application**, nombre `rodeo-web`.
   - **Authorized JavaScript origins** (las dos de Vercel + localhost):
     - `https://rodeo-sigma.vercel.app`
     - `https://rodeo-gustavoski23s-projects.vercel.app`
     - `http://localhost:4870`
   - **Authorized redirect URIs** (el importante, exacto):
     - `https://cablhejzsxqgwdvyzqei.supabase.co/auth/v1/callback`
   - Create → copia **Client ID** y **Client secret**.

### 4b. Supabase
**Authentication → Sign In / Up → Auth Providers → Google** → Enable →
pega Client ID + secret → Save. (Las Redirect URLs ya quedaron del Paso 3.)

> **El botón "o con Google" aparece SOLO cuando terminas este Paso 4.** La app
> le pregunta al server (`/auth/v1/settings`) qué providers están habilitados y
> solo pinta el botón de Google si de verdad está encendido. Antes de esto, el
> botón está oculto a propósito: así nadie toca "Google", cae en el redirect a
> `/authorize` y aterriza en el JSON crudo `provider is not enabled`. Mientras
> tanto, el correo (Paso 3) es el camino principal y siempre está visible. Tras
> habilitar Google, reabre el perfil (Cuenta & sync) y el botón ya estará ahí.

---

## Probar

1. App → icono de perfil → **Cuenta & sync** → escribe tu Gmail → **MÁNDAME
   EL ENLACE** → abre el correo → toca el enlace (o pega el código de 6
   dígitos) → **confirma que el enlace te deja en `rodeo-sigma.vercel.app`**
   (el dominio canónico, NO el alias — si aterrizas en el alias, revisa la
   Site URL del Paso 3) → toast "Cuenta conectada".
2. Supabase → **Table Editor → rodeo_state** → aparece tu fila con el DNA.
3. Repite en el otro dispositivo con el mismo correo → DNA fusionado
   (unión, nunca se pisa nada).

## Cómo funciona el sync (referencia)

- **Pull** al abrir con sesión (y al volver a la pestaña tras >5 min):
  fusiona nube+local — DNA por unión (clave `type|fix|b2`, `dominado` gana,
  cap 300), contadores por máximo, racha la más reciente, intereses solo
  llenan un aparato vacío.
- **Push** con debounce de 2.5 s tras cada cambio local (hook en `store.set`).
- Sin sesión / sin red → la app funciona 100% local, igual que siempre.

---

# Panel de consumo en vivo (`/uso.html`)

Mide cuánto gastan los testers en IA (OpenCode Zen) y en voz (Deepgram),
por persona y en vivo. Hasta ahora el costo solo volvía al navegador de cada
usuario y se acumulaba en su `localStorage`: no había forma de ver el conjunto.

**Cómo funciona.** Las funciones serverless (`api/chat.js`, `api/tts.js`,
`api/stt.js`) escriben una fila por llamada en `public.uso_ia` usando la
`service_role` key. El navegador nunca toca esa tabla: el panel pide los datos
ya agregados a `api/uso-datos.js`. La tabla tiene RLS activa y SIN policies a
propósito — solo la service key entra.

**Qué mide.** De OpenCode, el `cost` y los tokens que ya devuelve la API. De
Deepgram, que no devuelve costo, las unidades reales que factura (caracteres
sintetizados en TTS, segundos de audio en STT) multiplicadas por la tarifa;
por eso el gasto de voz es **estimado** y se ajusta con `PRECIO_TTS_1K` y
`PRECIO_STT_MIN` si cambia el plan.

## Encenderlo

1. **Reactivar el proyecto** si está pausado (Supabase → *Resume project*). El
   free tier lo pausa solo tras un tiempo sin uso.
2. **Correr la migración** `supabase/migrations/20260802000000_uso_ia.sql`
   (se aplica sola al mergear a main, o pégala en el SQL Editor).
3. **Variables en Vercel** (Project → Settings → Environment Variables):
   - `SUPABASE_SERVICE_KEY` — *service_role* key (Supabase → Settings → API).
     **Nunca** la pongas en el frontend: salta RLS por diseño.
   - `PANEL_USO_TOKEN` — opcional pero recomendado: si está, el panel exige
     `?token=…` en la URL. Sin él, cualquiera con el enlace ve el gasto.
   - `SUPABASE_URL` — solo si algún día cambia el proyecto.
4. Abrir **`/uso.html`** (`…vercel.app/uso.html?token=…`).

Sin `SUPABASE_SERVICE_KEY` el registro es un **no-op silencioso**: la app se
comporta igual y el panel lo dice en pantalla. Medir nunca puede tumbar una
respuesta al usuario — si Supabase está pausado, caído o lento, la llamada del
usuario sigue su curso.

## Identificar a cada tester

El frontend manda la cabecera `x-rodeo-user` con el nombre que ya guarda la app
(`rodeo_nombre`). No es autenticación: es una etiqueta para agrupar el gasto.
Quien no tenga nombre puesto aparece como `anónimo`.
