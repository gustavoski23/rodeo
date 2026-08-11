# RODEO — guía para agentes

Stack (rama `claude/rodeo-repo-info-nw2025`, la versión vigente): React 19 +
TypeScript estricto, SPA pura sin SSR, Vite 8, Tailwind v4 (tokens OKLCH en
`src/styles/tokens.css`), shadcn/ui + Magic UI, motion/react, Zustand con
persistencia manual a las claves `rodeo_*` de localStorage, Supabase (login
Google + sync), `api/` serverless en Vercel zero-config. Dev: `npm run dev`
(Vite, :5173) + `npm run api` (serverless local, :4870). En `main` sigue la app
vanilla vieja; la copia de seguridad vive en `public/legacy.html`.

Lee `CLAUDE.md` (las 5 reglas del repo) y `DESIGN-BRIEF.md` antes de tocar UI.

Este repo corre un **AI Design Orchestrator** (GPT revisa diseño, Claude
implementa, GitHub coordina): `docs/AI_DESIGN_ORCHESTRATOR.md`.

Reglas para cualquier agente:

- Precedencia visual: override humano (`DESIGN_DIRECTOR_OVERRIDE` en el PR) →
  `.ai-orchestrator/design-brief.md` → referencias → review de GPT → criterio
  propio. No rediseñar decisiones ya tomadas.
- Los comentarios del PR con markers `<!-- ai-design-review:* -->` son estado
  del sistema: no los edites ni los borres.
- `.ai-orchestrator/` y `.github/` son infraestructura, no parte de features.
