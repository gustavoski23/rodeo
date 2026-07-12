# RODEO 🤠 — Tu inglés 24/7

App personal para llevar mi inglés de **B2+ a C1** practicando conversación, historias jugables y slang, con corrección en tiempo real. Sin salón, sin horarios: el "rodeo" de inglés que no tengo viviendo en Medellín.

**Producción:** https://rodeo-gustavoski23s-projects.vercel.app · PIN: `RODEO2026`

---

## Qué hace (5 módulos)

| Módulo | Qué es |
|--------|--------|
| **TALK** | Roleplay hablado/escrito en 9 escenarios (bar, entrevista, etc.) con corrección + voz (Web Speech) + debrief. |
| **STORY** | Thriller jugable por beats: decides con tu inglés, medidores LEVERAGE/HEAT, 3 sagas (leak / ghost / pitch). |
| **SLANG** | Drop de 5 tarjetas estilo Instagram + traducción paisa → gringo. |
| **SUBE** | Juego B2→C1: subís tu inglés "cook → simmer", flip cards con swap, combo y racha. |
| **DNA** | Todos tus errores, slang y upgrades guardados en localStorage + quiz. |

Todo alimenta un solo **DNA** compartido.

---

## Stack

- **Frontend:** un solo `index.html` — HTML vanilla + Tailwind (CDN) + GSAP (CDN). Sin build, sin framework.
- **Backend:** `api/chat.js` — función serverless (Vercel) que hace de proxy a **OpenCode Zen** (modelos Kimi). La API key vive solo en el servidor, nunca en el frontend.
- **Dev local:** `dev-server.mjs` — sirve `index.html` y monta `/api/chat` en el puerto **4870**.

---

## Correr en local (ej. en el desktop tras clonar)

```bash
# 1. Clonar
git clone https://github.com/gustavoski23/rodeo.git
cd rodeo

# 2. Crear tu .env.local con la API key (NO se sube a git)
cp .env.example .env.local
#   → abre .env.local y pega tu OPENCODE_API_KEY real

# 3. Levantar el server local
node dev-server.mjs
#   → abre http://localhost:4870  (NUNCA abras index.html con doble clic:
#     /api/chat es una ruta relativa y necesita el server corriendo)
```

> La `OPENCODE_API_KEY` real **no está en este repo** (por seguridad). Está en el `.env.local` de la máquina original y en las env vars de Vercel. Cópiala a mano al configurar una máquina nueva.

---

## Variables de entorno

Ver `.env.example`. Resumen:

| Variable | ¿Obligatoria? | Default |
|----------|---------------|---------|
| `OPENCODE_API_KEY` | **Sí** | — (sin ella `/api/chat` falla) |
| `MODEL_CHAT` | No | `kimi-k2.6` |
| `MODEL_CREATIVE` | No | `kimi-k2.7-code` |
| `APP_PASS` | No | — (si se define, el frontend debe mandarla) |

---

## Desplegar

```bash
npx vercel deploy --prod --yes
```

Las env vars se configuran en el dashboard de Vercel (o `vercel env add`), no en el código.

---

## Trabajar con Claude Code desde varias máquinas

Este repo es el punto de sincronización. Flujo:

```bash
git pull        # antes de empezar a trabajar (traer lo último)
# ...editar con Claude Code...
git add -A && git commit -m "lo que cambié"
git push        # al terminar (subir para la otra máquina)
```

Así puedo seguir editando el código desde cualquier computadora donde tengas Claude Code.
