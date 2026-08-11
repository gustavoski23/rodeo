# .ai-orchestrator — referencia rápida

Loop automatizado: **GPT revisa el diseño del preview → Claude corrige → push → GPT re-revisa** (máx 3 rondas). Documentación completa: [`docs/AI_DESIGN_ORCHESTRATOR.md`](../docs/AI_DESIGN_ORCHESTRATOR.md).

## Uso diario

1. Escribe/actualiza `design-brief.md` (plantilla: `design-brief.template.md`).
2. (Opcional) referencias visuales en `references/` + `referenceMode` en el brief.
3. Label **`ai-design-review`** en el PR → cada push se revisa solo.

## Comandos locales

```bash
cd .ai-orchestrator/scripts
npm ci && npx playwright install chromium
npm run validate                                    # config+brief+prompts+schema
npm run capture -- --url http://localhost:4870      # solo screenshots
npm run review  -- --url http://localhost:4870 --dry-run   # + packet, sin APIs
npm test                                            # 39 tests de las partes críticas
```

## Controles del loop (comentarios en el PR)

| Acción | Cómo |
|---|---|
| Orden humana con máxima autoridad | comenta con `DESIGN_DIRECTOR_OVERRIDE: ...` |
| Re-armar tras el tope de rondas | comenta `<!-- ai-design-review:reset -->` |
| Forzar re-review de un SHA | Actions → AI Design Review → Run workflow (`force`) |
| Apagar | quita el label del PR |

## Secrets (Settings → Secrets → Actions)

`OPENAI_API_KEY` · `CLAUDE_CODE_OAUTH_TOKEN` (de `claude setup-token`) · `RODEO_APP_PASS` (opcional). Modelo del reviewer: `review.model` en `config.yml`, override con la variable `OPENAI_REVIEW_MODEL`.
