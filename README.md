# Hablarte — tu inglés 24/7

App de inglés para hispanohablantes de Latinoamérica, de A1 a C1, hecha para
usarse **desde el celular**. Nació como la app personal de un venezolano en
Medellín que necesitaba práctica de conversación real; hoy está abierta y
tiene también una cara institucional: profesores que enseñan por la app y
cobran con rieles de USDC ([Pangea Wallet](https://pangea-wallet.vercel.app)).

**Producción:** https://rodeo-sigma.vercel.app

**Demo directo a una sección** (salta la puerta de login y el onboarding por
esa carga): `https://rodeo-sigma.vercel.app/?demo=1#/podcast` — funciona con
cualquier vista: `#/a1`, `#/libro`, `#/profes`, `#/talk`.

---

## Qué hace

| Sección | Qué es |
|---------|--------|
| **RUTA (A1)** | Curso desde cero: mapa por tramos, sesiones con voz (grabas y comparas), repaso SRS de 5 cajas, coach Alfred. Quien dice "A1 Básico" en el onboarding aterriza directo aquí. |
| **CONVERSACIÓN** | Charla libre y escenas de roleplay con corrección en tarjetas, voz en las dos direcciones (dictado + TTS) y debrief al cerrar. |
| **LIBROS (3)** | Libros interactivos con curl 3D real de página, sonido, y phrasal verbs glosados que se tocan. En móvil, modo una-página con gestos. |
| **PODCAST** | Episodios a dos voces con reproductor karaoke sincronizado palabra a palabra: tocas lo que no entiendes y te lo explica sin pausar. |
| **SLANG (Pélala)** | Stickers que se pelan para revelar la expresión, su contexto y cómo NO usarla. |
| **DNA** | Todo lo que fallas o guardas vuelve como repaso hasta que lo dominas. Con cuenta (Google/Supabase) se sincroniza entre aparatos. |
| **PROFES** | La cara institucional: profesores ponen su tarifa y cobran en USDC (~1% de riel vs 18–33% de comisión de los marketplaces). Qué existe hoy y qué está en camino, rotulado sin humo: `#/profes`. |

---

## Stack

- **Frontend:** React 19 + Vite + Tailwind v4 + Zustand. Tokens y temas en
  `src/styles/tokens.css` (oscuro / claro / gradiente). Fuentes self-hosted:
  Alan Sans (cuerpo), Archivo (display), Space Mono (labels).
- **Backend:** funciones serverless en Vercel (`api/`) que hacen proxy a los
  modelos — las keys viven solo en el servidor.
- **Pagos (suscripción en cripto):** `api/cripto` habla con el receptor de
  cobros de [pangea-wallet](https://pangea-wallet.vercel.app) (intención
  firmada → pago USDC por Solana/Stellar → verificación on-chain). Operación
  en [CRIPTO-runbook.md](CRIPTO-runbook.md).
- **Cuenta y sync:** Supabase (Google OAuth + enlace mágico), RLS owner-only.
  La app entera funciona sin cuenta; el login solo añade sync.

## Cómo trabajar en este repo

La guía de verdad es **[CLAUDE.md](CLAUDE.md)** (reglas de trabajo, QA visual
obligatorio, registro del español) y los runbooks por sistema:
[LIBRO](LIBRO-runbook.md) · [SUPABASE](SUPABASE-runbook.md) ·
[PREMIUM](PREMIUM-runbook.md) · [CRIPTO](CRIPTO-runbook.md) ·
[TWA](TWA-runbook.md).

```bash
npm install
npm run dev        # Vite en :5173 — la app
npm run api        # dev-server.mjs en :4870 — el proxy de /api en local
npm run typecheck  # tsc -b
node --test tests/*.test.mjs
```

Un `#/<vista>` en la URL abre directo esa sección (se lee una vez al cargar;
no es un router). `?demo=1` salta la puerta y el onboarding por esa carga —
es el modo con el que se comparten enlaces de demostración.

## Desplegar

Se trabaja sobre la punta de `claude/rodeo-repo-info-nw2025` y se empuja como
fast-forward; Vercel despliega solo. Manual: `npx vercel deploy --prod --yes`.

## Variables de entorno

Ver `.env.example`. Las obligatorias: `OPENCODE_API_KEY` (modelos). Opcionales:
`APP_PASS` (candado de las llamadas de IA; el enlace de demo lo resuelve con
`?clave=…`), `PANGEA_PAYMENTS_URL` y las de Supabase/premium según runbook.
