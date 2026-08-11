---
# ── Frontmatter obligatorio ──────────────────────────────────────────────────
feature: "<nombre corto del feature>"
version: "1"            # súbela cuando el brief cambie de fondo
referenceMode: directional   # strict | directional | inspiration
---

> Cómo llenarlo: Gustavo define la experiencia (a mano o en una sesión manual
> con ChatGPT) y el resultado se pega aquí. Este documento tiene precedencia
> sobre el gusto de Claude y guía el criterio de GPT. Borra las secciones que
> no apliquen — pero NON-NEGOTIABLES, DO NOT CHANGE y ACCEPTANCE CRITERIA
> siempre se quedan.

## FEATURE
<qué se está construyendo>

## GOAL
<qué debe lograr para el usuario/producto>

## TARGET USER
<quién lo usa y en qué contexto>

## SCREENS
<pantallas afectadas — idealmente con los ids de config.yml y viewports>

## DESIGN INTENT
<la dirección visual, en palabras: jerarquía, tono, energía, densidad>

## VISUAL REFERENCES
<imágenes en .ai-orchestrator/references/ (png/jpg/webp) o links; describe qué
mirar de cada una. El referenceMode del frontmatter dice cuánta fidelidad se espera.>

## BRAND RULES
<colores, tipografías, componentes que son ley>

## NON-NEGOTIABLES
<lo que NO se puede romper, lista corta y dura>

## ALLOWED EXPERIMENTATION
<dónde Claude/GPT tienen libertad>

## FUNCTIONAL REQUIREMENTS
<comportamiento que debe existir>

## RESPONSIVE REQUIREMENTS
<qué viewports importan y qué debe pasar en cada uno>

## MOTION REQUIREMENTS
<estilo de motion, límites, prefers-reduced-motion>

## ACCESSIBILITY REQUIREMENTS
<contraste, teclado, ARIA, targets>

## DO NOT CHANGE
<archivos/flujos/decisiones intocables>

## ACCEPTANCE CRITERIA
<lista verificable EN SCREENSHOTS: "en 390px se ve X", "Y no tapa Z">
