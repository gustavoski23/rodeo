---
feature: "Baseline visual de RODEO 2.0 (HOME · TALK · STORY · SLANG · A1)"
version: "1"
referenceMode: directional
---

> Este brief es el **baseline** de la app React actual. Cuando arranque un
> feature nuevo, reemplaza este archivo usando `design-brief.template.md` — el
> hash del brief entra en la idempotency key, así que cambiarlo re-habilita el
> review. El documento madre de estética y límites es `DESIGN-BRIEF.md` (raíz):
> lo dicho allí aplica siempre.

## FEATURE

Estado visual general de las vistas principales de RODEO 2.0 (React 19 + Vite +
Tailwind v4 + tokens OKLCH): HOME (aurora + carrusel), TALK, STORY, SLANG y la
ruta A1.

## GOAL

Que un hispanohablante practique inglés a diario desde el teléfono con una
interfaz que se sienta intencional y diseñada — nunca "AI genérica".

## TARGET USER

Adulto hispanohablante, casi siempre en un teléfono de gama media, una mano,
sesiones cortas. El móvil ES el caso principal, no un caso de borde.

## SCREENS

- `home` — puerta de la app: aurora + carrusel de cartas (390x844 y 1440x900)
- `talk` — conversación con el coach (390x844)
- `story` — thriller jugable (390x844)
- `slang` — drop de tarjetas (390x844)
- `a1` — mapa de ruta / experience map A1 (390x844)

## DESIGN INTENT

- Mobile-first real; desktop es una cortesía centrada, no el objetivo.
- Tema oscuro por defecto (hay claro); tokens OKLCH de `src/styles/tokens.css`
  como única paleta.
- Motion con propósito (motion/react + springs); micro-interacciones sí, ruido no.
- Jerarquía clara en cartas y chips: título > contenido > metadata.

## BRAND RULES

- **Nada que se vea generado por AI genérica**: sin gradientes púrpura, sin
  grids de tres tarjetas icono+título+párrafo, sin Inter/Roboto de display
  (regla 4 del CLAUDE.md del repo; detalle en DESIGN-BRIEF.md).
- Los tokens de color/tipografía viven en `src/styles/tokens.css` — no inventar
  valores sueltos en componentes.
- Componentes: shadcn/ui (estilo new-york) + Magic UI ya instalados; preferir
  extenderlos antes que traer librerías nuevas.

## NON-NEGOTIABLES

- Nada de contenido atrapado en `opacity: 0` por animaciones que no disparan.
- Tap targets ≥ 44px en móvil.
- UI en español, contenido de aprendizaje en inglés — no mezclar en un label.
- El gate y el onboarding no se rompen: la app entera funciona sin cuenta.

## ALLOWED EXPERIMENTATION

Micro-interacciones, profundidad/sombras, ritmo de spacing, estados hover/press.

## RESPONSIVE REQUIREMENTS

- 390x844 sin scroll horizontal y sin cortes de contenido.
- 1440x900 sin romperse (columna centrada aceptable).

## MOTION REQUIREMENTS

- motion/react para springs y transiciones; CSS keyframes con
  `animation-fill-mode: both` para reveals que deciden visibilidad de contenido.
- Respetar `prefers-reduced-motion` en todo motion nuevo.

## ACCESSIBILITY REQUIREMENTS

- Contraste AA en texto de contenido.
- Navegación principal operable con teclado.

## DO NOT CHANGE

- La arquitectura SPA (React 19 + Vite, sin SSR) y el deep-link `#/<vista>`.
- Las claves `rodeo_*` de localStorage (compartidas con el sync de Supabase).
- `public/legacy.html` (red de seguridad de la app vieja).
- El flujo del PIN (`x-rodeo-pass`) y los endpoints de `api/`.

## ACCEPTANCE CRITERIA

- Cada vista muestra su contenido completo en 390x844.
- Ningún elemento interactivo queda tapado por otro elemento fijo.
- El tema oscuro y el claro se ven intencionales en las vistas capturadas.
