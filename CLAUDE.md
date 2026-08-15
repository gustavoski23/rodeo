# RODEO — cómo trabajar en este repo

App de inglés de Gus (venezolano en Medellín, B2+ hacia C1). React 19 + Vite +
Tailwind v4 + Zustand. Se usa **desde el celular**, así que el móvil no es un
caso de borde: es el caso principal.

## Los documentos

| Archivo | Cuándo leerlo |
|---|---|
| [DESIGN-BRIEF.md](DESIGN-BRIEF.md) | Contexto del usuario, estética, qué SÍ y qué NO se puede cambiar. |
| [LIBRO-runbook.md](LIBRO-runbook.md) | **Antes de tocar un libro interactivo.** Receta completa: contenido, láminas de Canva, gestos táctiles, y las 6 trampas que ya costaron una ronda cada una. |
| [SUPABASE-runbook.md](SUPABASE-runbook.md) · [PREMIUM-runbook.md](PREMIUM-runbook.md) · [CRIPTO-runbook.md](CRIPTO-runbook.md) · [TWA-runbook.md](TWA-runbook.md) | Operativos de cada sistema. |

## Las reglas que no se negocian

**1. Nada visual se declara listo sin mirar una captura.** Razonar sobre el CSS
no es verificar. El fallo #1 es contenido escondido (un `opacity: 0` que nunca
vuelve, un `overflow: hidden` que corta texto): invisible sin captura.

**2. Nada táctil se prueba con eventos sintéticos de JS.**
`dispatchEvent(new PointerEvent(...))` no pasa por el pipeline de entrada del
navegador — miente en las dos direcciones. Se prueba con `puppeteer-core` +
`page.touchscreen` (CDP `Input.dispatchTouchEvent`), con `isMobile` y `hasTouch`.
Ver LIBRO-runbook §5.

**3. Medir antes que teorizar.** Cuando algo "se siente raro", muestrealo cuadro
a cuadro o instrumentá el handler. Varias hipótesis muy razonables de este repo
resultaron falsas al medirlas.

**4. Nada que se vea generado por AI genérica.** Sin gradientes púrpura, sin
grids de tres tarjetas con ícono + título + párrafo, sin Inter/Roboto de
display. Si no se ve intencional, no vale. (Detalle en DESIGN-BRIEF.)

**5. El comentario explica POR QUÉ, no qué.** Este repo comenta las decisiones y
las trampas, no la sintaxis. Si un valor es raro, el comentario dice qué se
midió para elegirlo.

## Rama y despliegue

Se trabaja sobre la punta de `claude/rodeo-repo-info-nw2025` y se empuja como
fast-forward; Vercel despliega solo. Un `#/<vista>` en la URL abre directo en
una sección (`stores/app.ts` lo lee al crear el store).
