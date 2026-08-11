# AI Design Orchestrator

**GUSTAVO define la experiencia. GPT dirige y critica lo visual. CLAUDE lo construye. PLAYWRIGHT muestra el resultado. GITHUB coordina todo.**

Sistema de colaboración automatizada entre Claude Code (implementation engineer) y un modelo GPT de OpenAI (product + visual design director), usando GitHub como event bus. Nadie necesita tener ChatGPT ni Claude abiertos: el loop corre solo en GitHub Actions.

---

## WHAT IT DOES

1. Un PR con el label `ai-design-review` recibe un push. (La rama de trabajo de la app es `claude/rodeo-repo-info-nw2025` — los PRs de features usan esa base; el loop funciona igual con cualquier base.)
2. Vercel (integración Git ya conectada a este repo) genera el preview deployment de ese commit.
3. El workflow espera el deployment **del HEAD SHA exacto** (vía GitHub Deployments API — sin token de Vercel).
4. Playwright abre la preview con deep-links `#/<vista>`, siembra `rodeo_pass` (PIN) y `rodeo_onboarding` en localStorage, toca el "Skip" del gate de login (que por diseño aparece en todo arranque frío) y captura las pantallas de `config.yml` (recogiendo `console.error`, `pageerror` y requests fallidas).
5. Se arma un **REVIEW PACKET** mínimo (brief + screenshots + referencias + lista de archivos UI cambiados + findings previos + overrides humanos). GPT **nunca** ve el repo.
6. GPT (OpenAI Responses API, multimodal, Structured Outputs) devuelve un JSON validado: `APPROVE` o `REQUEST_CHANGES` con findings priorizados (P0–P3), acceptance criteria y hints.
7. El resultado se publica en el PR: comentario con markers máquina-legibles + check run **AI Design Review**.
8. Si pidió cambios y quedan rondas: el job `resolve` lanza **Claude Code** (`anthropics/claude-code-action@v1`, modelo Opus), que lee los findings **verbatim**, corrige uno por uno, commitea con resolution report y hace push.
9. El push dispara la siguiente ronda. Máximo **3 rondas** automáticas; después `HUMAN_DESIGN_REVIEW_REQUIRED` y el loop se detiene hasta que Gustavo intervenga.

## ARCHITECTURE

```
.ai-orchestrator/
  config.yml                  ← pantallas, viewports, límites, modelo, label
  design-brief.md             ← brief vigente (frontmatter: feature/version/referenceMode)
  design-brief.template.md    ← plantilla para nuevos features
  prompts/
    design-reviewer.md        ← system prompt de GPT (versionado)
    claude-resolve-review.md  ← instrucciones de Claude para resolver findings
  schemas/design-review.schema.json  ← Structured Output + validación ajv
  references/                 ← imágenes de referencia (png/jpg/webp)
  out/                        ← screenshots/packet/findings (gitignored, va a artifacts)
  scripts/                    ← paquete npm autocontenido (ESM, Node 24)
    bin/review.js             ← orquestador de una ronda
    bin/capture.js            ← captura standalone
    bin/validate.js           ← validación de toda la config
    lib/{config,brief,markers,github,state,preview,capture,packet,openai,publish,prompt}.js
    test/*.test.js            ← node:test (39 tests)
.github/workflows/
  ai-design-review.yml        ← el loop (jobs review + resolve)
  claude.yml                  ← @claude interactivo en issues/PRs
```

Decisiones clave:

- **Estado en GitHub, no en memoria**: rondas, idempotencia y findings se derivan de los comentarios del PR (markers `<!-- ai-design-review:... -->` + bloque ```` ```ai-design-review-json ````). Cualquier máquina puede retomar el loop.
- **Preview por SHA**: `preview.headSha == pullRequest.headSha` es condición dura. Se re-verifica el HEAD antes de publicar; si cambió, el review se descarta como `stale`. `concurrency.cancel-in-progress` mata revisiones de pushes viejos.
- **Idempotencia**: key = `sha256(repo:pr:sha:briefHash:promptVersion)`. El mismo SHA con el mismo brief y prompt no se revisa dos veces (salvo `force`).
- **La raíz del repo no cambia**: el orquestador es un paquete npm aparte; Vercel sigue viendo un sitio estático + `api/`.

## SECRETS REQUIRED

| Secret | Para qué | Cómo obtenerlo |
|---|---|---|
| `OPENAI_API_KEY` | GPT Design Reviewer | platform.openai.com → API keys |
| `CLAUDE_CODE_OAUTH_TOKEN` | Claude Code Action con la suscripción (no API) | `claude setup-token` en tu terminal |
| `RODEO_APP_PASS` | PIN de la app para las capturas (opcional pero recomendado) | el PIN vigente (hoy `RODEO2026`) |

Variable opcional (no secret): `OPENAI_REVIEW_MODEL` (repo → Settings → Variables) para cambiar el modelo sin tocar código. Default: el `review.model` de `config.yml`.

Se agregan en GitHub → repo → Settings → Secrets and variables → Actions.

## ONE-TIME SETUP

1. **Claude GitHub App**: ya está instalada en este repo (hay commits de `claude[bot]`). Si faltara: `claude /install-github-app` o instalar https://github.com/apps/claude.
2. `claude setup-token` → copiar el token → secret `CLAUDE_CODE_OAUTH_TOKEN`.
3. Crear secret `OPENAI_API_KEY`.
4. (Opcional) secret `RODEO_APP_PASS`.
5. El label `ai-design-review` ya existe en el repo (lo crea el setup; si faltara: `gh label create ai-design-review --color 8B5CF6`).

## HOW TO ENABLE A PR

1. Asegúrate de que `.ai-orchestrator/design-brief.md` describe el feature (usa la plantilla). Sin brief → `BLOCKED`.
2. (Opcional) pon imágenes en `.ai-orchestrator/references/` y ajusta `referenceMode` (`strict` | `directional` | `inspiration`).
3. (Opcional) ajusta `screens:` en `config.yml` si el feature vive en otra pantalla.
4. Pon el label **`ai-design-review`** al PR. Eso es todo: cada push revisa.

## HOW TO FORCE REVIEW

Actions → **AI Design Review** → *Run workflow* → `pr_number` + `force: true`. (`force` salta la idempotencia; nunca salta el guard de forks ni el label.)

## HOW TO STOP AUTOMATION

- Quita el label `ai-design-review` del PR (el workflow deja de correr), o
- deja que llegue a 3 rondas: se detiene solo con `HUMAN_DESIGN_REVIEW_REQUIRED`.

Para **re-armar** el loop después de intervenir a mano, comenta en el PR:

```
<!-- ai-design-review:reset -->
```

## HUMAN OVERRIDE (la autoridad final es Gustavo)

Comenta en el PR incluyendo la palabra `DESIGN_DIRECTOR_OVERRIDE` (o `HUMAN_DESIGN_OVERRIDE`) y la instrucción. Ejemplo:

> DESIGN_DIRECTOR_OVERRIDE: el header se queda amarillo aunque el reviewer pida bajarle saturación.

Los overrides viajan en cada packet y **tienen precedencia sobre GPT y sobre el gusto de Claude**. Nunca se borran automáticamente. El flujo típico con ChatGPT manual: le pides a ChatGPT "revisa el PR 53" (su conector de GitHub es de solo lectura), y pegas su veredicto como comentario con el token de override.

Precedencia completa (de `claude-resolve-review.md`): **1)** Human override → **2)** Design brief → **3)** Referencias aprobadas → **4)** Review de GPT → **5)** criterio técnico de Claude. Claude nunca rediseña por gusto propio.

## HOW TO RUN LOCALLY

```bash
cd .ai-orchestrator/scripts
npm ci
npx playwright install chromium

# valida config + brief + prompts + schema (sin tocar APIs)
npm run validate

# captura contra el dev server local (npm run dev en la raíz → Vite :5173)
npm run capture -- --url http://localhost:5173

# ronda completa local SIN OpenAI ni publicación (arma out/packet.json)
npm run review -- --url http://localhost:5173 --dry-run

# review real local (necesita OPENAI_API_KEY en el env; escribe out/review.json)
npm run review -- --url http://localhost:5173

npm test
```

## WHAT HAPPENS AFTER A CLAUDE PUSH

El push de Claude llega **vía la Claude GitHub App** (el workflow no le pasa `github_token`; con el `GITHUB_TOKEN` default el push no dispararía workflows). Ese push produce `pull_request: synchronize` → nueva ronda de review → y así hasta `APPROVE` o el tope de rondas. El job de Claude declara `allowed_bots: "claude[bot],claude,github-actions[bot]"` porque el actor del evento en las rondas ≥2 es un bot.

## SECURITY PROTECTIONS

- **Forks**: evento `pull_request` (no `pull_request_target`) ⇒ GitHub no expone secrets a forks. Además el job y el script exigen `head.repo == este repo`. El repo es público: esto no es teórico.
- **Label gate**: solo alguien con write puede poner `ai-design-review`. Nada corre "porque sí".
- **Permisos mínimos por job**: el review job no tiene `contents: write`; el resolve job sí (es su trabajo) pero no toca checks.
- **Secrets**: solo en `env` de los steps que los usan; jamás en logs (los scripts no imprimen env). `OPENAI_API_KEY` nunca queda accesible a código del PR: el job de review hace sparse-checkout **solo de `.ai-orchestrator/`** del commit a revisar... ver limitación abajo.
- **Anti-loop**: `maxRounds=3` + idempotencia por SHA + `concurrency: cancel-in-progress` + el actor-check del Claude action.
- **Prompt injection**: GPT solo recibe screenshots + campos curados y truncados del packet; los overrides se filtran a autores humanos.

### Limitación de seguridad conocida (aceptada en V1)

El job de review ejecuta `bin/review.js` **del commit del PR**. En este repo solo pushean Gustavo y Claude (los forks quedan excluidos del workflow), así que el riesgo real es bajo; en un repo con más colaboradores habría que fijar los scripts a la rama base (checkout de `main` para `.ai-orchestrator/` + preview del PR).

## OBSERVABILITY

Cada run loguea con prefijo `[ai-design-review]`: PR, SHA corto, idempotency key, round, estado de preview, capturas, decision, findings y next action. El estado visible vive en el **check run** (`AI Design Review`: capturing → reviewing → APPROVED / REQUEST_CHANGES / HUMAN_DESIGN_REVIEW_REQUIRED / BLOCKED / stale) y en los comentarios del PR. Screenshots + packet + findings de cada ronda quedan como **artifacts** del run (14 días).

## FAILURE HANDLING

`preview failed/timeout/HTTP≥400/redirect a SSO`, `página en blanco`, `crash de Playwright`, `error de OpenAI`, `JSON inválido del reviewer`, `brief ausente` ⇒ **BLOCKED** con motivo en el check y comentario. `HEAD cambió` ⇒ **stale** (sin comentario). Jamás se le pregunta a GPT por una página rota, y jamás un fallo de infraestructura se disfraza de review.

## COST CONTROL

- Solo corre con label; una llamada a OpenAI por ronda; máx 3 rondas.
- `maxScreenshotsPerReview: 8`, `maxReferenceImages: 4`, `maxPacketChars: 24000`, console errors capados.
- Sin diffs en el packet (solo nombres de archivos UI); el brief se trunca si crece.
- Claude Code usa la suscripción (OAuth token), no la API.

## KNOWN LIMITATIONS

- No hay pixel-diff contra baseline (la arquitectura deja el hueco: `references/` + screenshots por ronda en artifacts).
- El motion no se evalúa (screenshots estáticos); GPT solo ve síntomas (contenido atascado en opacity:0).
- `workflow_dispatch` revisa pero no dispara el job de Claude (no trae head ref); el fix llega en el siguiente push o poniendo el label.
- El implementation summary de V1 es el body del PR o el título del último commit — Claude puede mejorar esto escribiendo la sección `IMPLEMENTATION SUMMARY` en el body del PR.
- Pantallas autenticadas: hoy solo auth por localStorage (suficiente para el PIN de RODEO). Si algún día hay login real, usar Playwright storage state con un test user (documentar en config).

## NEXT RECOMMENDED ITERATION

1. Baseline visual: guardar los screenshots del último APPROVE como `approved/` y dárselos a GPT junto a los nuevos (regresión visual barata sin pixel-diff).
2. `IMPLEMENTATION SUMMARY` obligatorio en el body del PR (template de PR).
3. Detección automática de PRs visuales (labels sugeridos por paths tocados) — el label seguiría siendo el gate.
4. Captura de motion (Playwright video/trace de 2-3s) cuando el brief lo pida.
