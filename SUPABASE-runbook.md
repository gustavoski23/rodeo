# SUPABASE — runbook: login con Google + sync entre dispositivos

El proyecto ya existe: `gustavoski23's Project` →
`https://cablhejzsxqgwdvyzqei.supabase.co` (región East US, GitHub conectado
a `gustavoski23/rodeo`). El código del cliente ya está en el repo
(`js/supabase-sync.js`). Faltan **3 pasos manuales** que solo se hacen una vez.

---

## Paso 1 — Pegar la key del proyecto (2 min)

1. Dashboard → **Project Settings** (engranaje) → **API Keys**.
2. Copia la key **`anon` `public`** (o la nueva **`publishable`** si te la
   muestra — cualquiera de las dos sirve). **NUNCA la `service_role`.**
3. Pégala en `js/supabase-sync.js`, línea `const SB_ANON_KEY = '';`

> Esta key es pública por diseño (va en el navegador de todos modos); los
> datos los protege el RLS de la tabla. Es seguro subirla a git.
>
> Atajo: pásamela por el chat y yo la pego y hago el commit.

---

## Paso 2 — Crear la tabla (1 min)

Opción A (ya mismo): Dashboard → **SQL Editor** → pega el contenido completo
de `supabase/migrations/20260722000000_rodeo_state.sql` → **Run**.

Opción B (automática): al mergear esta rama a `main`, la integración GitHub
de Supabase aplica la migración sola. (La opción A no estorba: la migración
es idempotente — `if not exists` / `drop policy if exists`.)

---

## Paso 3 — Activar el provider de Google (10-15 min, Google Cloud)

Supabase necesita credenciales OAuth propias de Google:

### 3a. Google Cloud Console
1. Ve a https://console.cloud.google.com → crea proyecto (nombre: `rodeo`).
2. **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create.
   - App name `RODEO`, support email tu Gmail, developer email tu Gmail.
   - Scopes: los default (email, profile, openid). Guardar.
   - Publishing status: puedes dejarla en **Testing** y añadirte como test
     user (tu Gmail) — suficiente mientras el único usuario eres tú.
3. **APIs & Services → Credentials → + Create credentials → OAuth client ID**:
   - Application type: **Web application**, nombre `rodeo-web`.
   - **Authorized JavaScript origins**:
     - `https://rodeo-sigma.vercel.app`
     - `http://localhost:4870`
   - **Authorized redirect URIs** (exacto, este es el importante):
     - `https://cablhejzsxqgwdvyzqei.supabase.co/auth/v1/callback`
   - Create → copia **Client ID** y **Client secret**.

### 3b. Supabase Dashboard
1. **Authentication → Sign In / Up → Auth Providers → Google** → Enable.
2. Pega Client ID y Client secret → Save.
3. **Authentication → URL Configuration**:
   - **Site URL**: `https://rodeo-sigma.vercel.app`
   - **Redirect URLs** (añade las dos):
     - `https://rodeo-sigma.vercel.app`
     - `http://localhost:4870`

---

## Probar

1. Abre la app → icono de perfil → sección **Cuenta & sync** → **ENTRAR CON
   GOOGLE** → autoriza → vuelve a la app con toast "Cuenta conectada".
2. En Supabase: **Table Editor → rodeo_state** → debe aparecer tu fila con
   el `dna` en JSON.
3. Abre la app en el otro dispositivo → entra con la misma cuenta → tu DNA
   aparece fusionado (nada se pisa: es unión, no reemplazo).

## Cómo funciona el sync (referencia)

- **Pull** al abrir la app con sesión (y al volver a la pestaña tras >5 min):
  fusiona nube+local — DNA por unión (clave `type|fix|b2`, `dominado` gana,
  cap 300), contadores por máximo, racha la más reciente, intereses solo
  llenan un aparato vacío.
- **Push** con debounce de 2.5 s tras cada cambio local (hook en `store.set`).
- Sin key configurada / sin sesión / CDN caído → la app funciona 100% local,
  igual que siempre.
