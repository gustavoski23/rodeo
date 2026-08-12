# SETUP — configurar Hablarte en una máquina nueva

Guía para dejar el escritorio (o cualquier PC) trabajando igual que la laptop.
Se hace **una sola vez** por máquina.

---

## 0. Requisitos

Verifica que estén instalados (en PowerShell):

```powershell
git --version      # si falta: https://git-scm.com/download/win
node --version     # si falta: https://nodejs.org (LTS)
```

Claude Code ya lo tienes en ambas máquinas.

---

## 1. Bajar el código (GitHub)

```bash
git clone https://github.com/gustavoski23/rodeo.git
cd rodeo
```

> La primera vez se abre una ventana del navegador para iniciar sesión en
> GitHub (Git Credential Manager). Autorízala y queda guardado para siempre.
> El repo es **privado**: solo entra con tu cuenta `gustavoski23`.

---

## 2. Conectar Vercel y bajar la API key

La `OPENCODE_API_KEY` **no está en el repo** (a propósito: nunca se sube un
secreto a git). Vercel la tiene guardada, y la bajas con un comando —
no hay que copiarla a mano:

> ⚠️ **En PowerShell ejecuta un comando POR LÍNEA.** Windows PowerShell 5.1 **no
> soporta `&&`** para encadenar (da `El token '&&' no es un separador de
> instrucciones válido`). Si necesitas encadenar, usa `;`.

```powershell
npx vercel login                  # una vez por máquina (abre el navegador)
npx vercel link                   # "Link to existing project?" → y → nombre: rodeo
npx vercel env pull .env.local    # baja la key a tu .env.local
```

Verifica que quedó (PowerShell — `grep` no existe aquí):

```powershell
Select-String OPENCODE_API_KEY .env.local
```

> ⚠️ **Gotcha importante:** `vercel env pull` baja **solo** las variables del
> entorno **Development**. Si una variable existe únicamente en *Production*,
> **no la baja** y el `.env.local` queda incompleto (síntoma: solo aparece
> `VERCEL_OIDC_TOKEN`). Para que una variable sea "pulleable" debe existir en
> Development:
>
> ```powershell
> npx vercel env ls                                  # ver en qué entornos está cada una
> npx vercel env add OPENCODE_API_KEY development    # añadirla si falta
> ```
>
> `OPENCODE_API_KEY` ya está en Development (añadida el 2026-07-12), así que
> el pull funciona. `APP_PASS` sigue solo en Production a propósito: en local
> no hace falta PIN.

> Si prefieres a mano: copia el valor desde el `.env.local` de la laptop, o
> desde el dashboard de Vercel → proyecto `rodeo` → Settings → Environment
> Variables.

---

## 3. Levantar la app

```powershell
node dev-server.mjs
```

Abre **http://localhost:4870**

> 🔁 **Si el server ya estaba corriendo cuando bajaste la key, reinícialo**
> (`Ctrl+C` y vuelve a lanzarlo). `dev-server.mjs` lee `.env.local` **una sola
> vez, al arrancar** — si arrancó antes de que existiera la key, la API
> responderá `missing_api_key` hasta que lo reinicies.

> ⚠️ **Nunca** abras `index.html` con doble clic. El backend vive en la ruta
> relativa `/api/chat` y necesita el servidor. Si lo haces, la app te muestra
> una pantalla de aviso con el link correcto.

---

## 4. Abrir con Claude Code

Abre Claude Code apuntando a la carpeta `rodeo` que acabas de clonar.
Desde ahí ya puede leer y editar todo el código.

---

## Trabajo diario (con 2 máquinas)

**Antes de empezar**, siempre:

```bash
git pull
```

**Al terminar**, siempre:

```bash
git add -A
git commit -m "lo que cambié"
git push
```

Si olvidas el `pull` y las dos máquinas tocaron lo mismo, git avisa con un
conflicto — no se pierde nada, pero hay que resolverlo. Por eso: **pull antes,
push después.**

---

## Desplegar a producción

```bash
npx vercel deploy --prod --yes
```

Producción: https://rodeo-sigma.vercel.app

---

## Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `Failed to parse URL from /api/chat` | Abriste el archivo como `file://` | Usa http://localhost:4870 |
| `missing_api_key` | Falta `.env.local` | Paso 2 (`vercel env pull`) |
| 401 en la API | Falta el PIN | El PIN es `RODEO2026` |
| `git push` rechazado | La otra máquina subió antes | `git pull` y vuelve a intentar |
