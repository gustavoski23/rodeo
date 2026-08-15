# Hablarte — Brief de rediseño

> ## ⚠️ QUÉ SIGUE VIGENTE Y QUÉ ES HISTORIA
>
> Este documento se escribió para el rediseño de la versión vieja de RODEO y
> **nunca se actualizó**. Antes de sacar de acá permiso para hacer algo,
> mirá en cuál de las dos listas cae:
>
> **VIGENTE — sigue siendo la verdad del proyecto:**
> · §1 la personalidad del usuario y la regla dura de "nada que se vea generado
>   por AI genérica" (§1, último punto).
> · §2 los tokens de color, la tipografía (Bebas + Manrope) y los efectos
>   ambientales: siguen siendo la paleta, ahora en `src/styles/tokens.css`.
> · §3 la intención de cada módulo: qué hace y para qué está.
>
> **HISTORIA — describe una app que ya no existe, no la uses como referencia
> técnica:**
> · "Vive todo en un solo `index.html` (vanilla JS + Tailwind CDN + GSAP)".
>   Hoy es **React 19 + Vite + Tailwind v4 + Zustand**, con el código en `src/`.
>   Cualquier ruta, selector de DOM o número de línea que aparezca abajo apunta
>   al archivo viejo y no existe.
> · Las pantallas concretas, los ids de nodo y los flujos de §3 se movieron;
>   la fuente de verdad de lo que hay hoy es `src/views/`.
>
> **EL REGISTRO DEL ESPAÑOL NO SE DECIDE ACÁ.** La autoridad única es
> [`src/lib/espanol-neutro.ts`](src/lib/espanol-neutro.ts): español latino
> neutro, con "tú", sin modismos de un solo país. Este brief nació cuando la
> app era de un solo usuario paisa y por eso deja pasar esa voz; ya no aplica.
> Si algo de acá choca con `espanol-neutro.ts`, manda `espanol-neutro.ts`.
> El test `tests/registro.test.mjs` lo hace cumplir.

**Producto:** app de aprendizaje de inglés para hispanohablantes de toda
Latinoamérica, nivel A1 hasta B2+/C1. Nació como app personal de Gus (un
venezolano en Medellín) y **hoy está abierta a amigos de varios países** — de
ahí que nada en la app pueda dar por sentado Colombia, ni Medellín, ni "Gus".
Desplegada en Vercel; se usa **desde el celular**, así que el móvil es el caso
principal, no un caso de borde. Backend serverless en Vercel que hace proxy a
los modelos.

**Este documento es el handoff a diseño.** Cubre: contexto, estética actual, los 5 módulos con todas sus pantallas y botones, datos que persisten, comportamiento de las APIs, y qué SÍ y qué NO puedes cambiar.

---

## 1. Contexto del usuario

- El usuario tipo es **hispanohablante de cualquier país de Latinoamérica**, sin inmersión en inglés. El perfil original —Gus, venezolano en Medellín, B2+ hacia C1 para trabajo cripto/tech— sigue siendo el retrato de la motivación; lo que ya **no** vale es asumir que todos comparten su país ni su forma de hablar. (Ver el recuadro de arriba: el registro lo manda `src/lib/espanol-neutro.ts`.)
- **Pierde el interés rápido.** Todo lo genérico lo aleja. Ama la energía de carruseles de Instagram: tipografía gigante, colores planos, memes de reacción, formatos "no digas X di Y", "A1: cook / C1: simmer".
- Referencias visuales están en la carpeta del proyecto (`WhatsApp Image 2026-*.jpeg`, `151252.jpeg`, `jjuj.jpeg`, `jujuuju.jpeg`): captures de Instagram de cuentas de inglés — Sky English, Dennis English, English Mastery, Teacher Luis Miranda. Vocabulario grande en Bebas, memes de Michael Scott / Bob Esponja, colores saturados, layouts asimétricos, español de apoyo en itálica.
- **Regla dura del proyecto:** nada que se vea generado por AI genérica (nada de gradientes púrpura, ningún grid uniforme de 3 cards con ícono + título + párrafo, nada de Inter/Roboto/Arial como display). Si el resultado no se ve intencional al lado de un sitio corporativo aburrido, no vale.

---

## 2. Estética actual — puntos de partida (no borrarlos)

Estos tokens ya viven en `<style>` al inicio del HTML y otros módulos los usan. Rediseño = evolucionar sobre ellos, no reemplazarlos por otra paleta desde cero.

### Colores (oklch, nunca hex del sistema)
- `--bg-void: oklch(8% 0.008 265)` — fondo primario, negro con temperatura fría
- `--bg-deep: oklch(12% 0.012 265)` — profundidad 1
- `--bg-surface: oklch(16% 0.015 265)` — cards, paneles
- `--bg-elevated: oklch(20% 0.018 265)` — hover, tooltips
- `--text-primary: oklch(96% 0.004 265)` — blanco tibio
- `--text-secondary: oklch(65% 0.008 265)`
- `--text-muted: oklch(40% 0.006 265)`
- `--accent: oklch(72% 0.25 145)` — verde eléctrico dominante
- `--accent-dim: oklch(72% 0.25 145 / 0.14)` — fondos de acento tenues
- `--glass-bg: oklch(16% 0.015 265 / 0.6)` + `--glass-border: oklch(96% 0.004 265 / 0.08)` — glass tab bar y sheets
- **Paleta de tarjetas de contenido** (estilo Instagram, planos saturados, se rotan -1.2° a 1.1°):
  - `--card-blue: oklch(52% 0.24 262)` — texto claro
  - `--card-green: oklch(46% 0.13 158)` — texto claro
  - `--card-yellow: oklch(85% 0.16 95)` — texto oscuro
  - `--card-coral: oklch(64% 0.19 30)` — texto claro
  - `--card-paper: oklch(95% 0.012 85)` — texto oscuro
- **Semántica de color viva:**
  - Verde acento = éxito, C1, "clavado", subida de nivel
  - Coral = error, HEAT, "básico/CASI/fallé"
  - Amarillo = advertencia, glosa, empate
  - Azul = calma, saga heist
  - Papel = neutral, editorial

### Tipografía
- **Display: Bebas Neue** — títulos, ranks (A–D), stats, terms de slang, portadas de saga. `letter-spacing: -0.02em`, `line-height: 0.92` en tamaños grandes.
- **Body: Manrope** — chat, correcciones, botones, labels. Peso 300–400 body, 500–700 énfasis.
- **Escala:**
  - `clamp(2.1rem, 8.5vw, 3.1rem)` — hero de vista
  - `clamp(2.2rem, 9vw, 3rem)` — títulos de saga
  - `clamp(2.6rem, 11vw, 3.8rem)` — término de slang gigante
  - `clamp(2.8rem, 12vw, 4rem)` — stats
  - 4.5rem — rank A–D del juez
  - Label: 0.65rem uppercase `letter-spacing: 0.18em`, opacidad 0.75
  - Body: 0.85–0.95rem, line-height 1.6
- **Prohibidas absolutas:** Inter, Roboto, Arial, Helvetica, Open Sans como display.

### Efectos ambientales
- **Grain overlay** (SVG fractalNoise) sobre todo, `mix-blend-mode: overlay`, opacity 0.4 — quita la sensación de superficie AI plana.
- **Glow ambiental** superior con radial-gradient del accent.
- **`heat-glow`** (clase que se activa cuando HEAT > 55 en Story): vira el glow a coral.

### Componentes base
- **Bottom tab bar flotante** (glass, `left: 12px, right: 12px, bottom: safe-area`): 5 tabs actualmente en 66px cada una en 375px. Íconos SVG stroke 1.5, label uppercase `letter-spacing: 0.06em`, `font-size: 0.56rem`. Activa: `--accent` + fondo `--accent-dim`.
- **`.slang-card`**: la card estrella. `border-radius: 24px`, `box-shadow: 0 20px 40px oklch(0% 0 0 / 0.35)`, rotación variable (patrón `[-1.2, 0.8, -0.6, 1.1, -0.9]`), fondo plano saturado. Contiene `.label-mini`, `.term` (Bebas gigante), body, `.ex` (ejemplo en inglés), `.ex-es` (traducción en itálica), `.wrong` (advertencia con borde superior punteado).
- **`.bubble-coach`**: chat del coach. `border-radius: 4px 20px 20px 20px` (esquina superior izquierda cuadrada = viene del NPC).
- **`.bubble-user`**: `margin-left: auto`, `border-radius: 20px 4px 20px 20px`, borde y fondo acento tenue.
- **`.correction-card`**: alineada a la derecha, `border-radius: 12px`, fondo coral tenue, borde coral. Contiene `.quote` (tachado coral) → `.fix` (acento).
- **`.chip`**: pill selector, min-height 44px, borde tenue, hover acento.
- **`.btn-accent`** (CTA principal): pill verde acento, `min-height: 52px`, glow, hover `translateY(-2px)`. Fondo `--accent`, texto oscuro.
- **`.btn-ghost`** (secundario): pill vacío con borde tenue.
- **`.icon-btn`** (46×46 circular): mic, send, TTS. Estados: normal / on / recording (pulsa coral).
- **`.mission-card`**, **`.meter-track`+`.meter-fill`**, **`.gloss-chip`**, **`.rank-badge`**, **`.vchip`**, **`.flip-card`**, **`.swap-old`/`.swap-new`** — componentes nuevos de fase 2.

### Motion
- GSAP con easing `expo.out` (entradas), `power3.out` (rápidas), `back.out(1.4)` (pops).
- `stagger: 0.07` en listas.
- Respeta `prefers-reduced-motion` vía la constante `REDUCED` que apaga toda animación.

---

## 3. Los 5 módulos — pantallas, botones, flujos

La app tiene **5 vistas** navegables desde la tab bar. Solo una activa a la vez. Header y tab bar son globales.

### 3.0 Header global (siempre visible arriba)
- **Logo "RODEO."** en Bebas 2.6rem, punto verde acento. *(Histórico: así se veía cuando se escribió este brief. Hoy la marca es Hablarte y, por la regla 3 del contrato visual, no hay logo en ninguna pantalla.)*
- Subtítulo pequeño `TU INGLÉS 24/7` a la derecha del logo.
- **Ticker de costo acumulado** a la derecha, top: `$0.0000` con label `GASTADO` debajo. Es el costo real de API en dólares. Sube en tiempo real cuando el usuario usa algo que llama al modelo. Persiste en localStorage entre sesiones. Es más un juguete de transparencia que un feature crítico — sirve para que Gus vea que el uso "cuesta centavos".
- Línea luminosa horizontal debajo del header.

### 3.1 TALK — conversación con corrección
Tab activa por defecto al cargar.

#### Estado vacío (`#talk-empty`)
- Título hero Bebas: `¿DE QUÉ HABLAMOS HOY?` (con `HOY?` en verde acento)
- Subtexto en 1 línea.
- **Sección TRABAJO** con eyebrow verde: 4 chips (Reunión con el equipo gringo · Negociar con un inversionista · Entrevista de trabajo · Pitch de tu producto).
- **Sección CALLE Y VIDA** con eyebrow verde: 5 chips (Small talk en un bar · Aeropuerto y viaje · Hablando de fútbol · Una cita · Free talk).
- Cada chip = escenario que arranca una sesión.

#### Sesión activa (`#talk-session`)
- Header pequeño: título del escenario (verde eyebrow) + botón mute TTS (icon-btn) + botón "Terminar" (ghost).
- Scroll de chat: burbujas del coach (izq) + del usuario (der) + tarjetas de corrección (der, coral).
- Input abajo: [🎤 mic-btn] [textarea 16px] [➤ send-btn verde acento].
- El coach responde en carácter (2–4 frases) + JSON estructurado con `corrections[]`. Cada corrección se pinta como una card debajo del turno del usuario.
- Voz: mic dispara Web Speech Recognition (`en-US`); las respuestas del coach se leen con Speech Synthesis si TTS está ON.

#### Cerrar sesión → debrief (`openSheet` overlay bottom)
- Titular "DEBRIEF." en Bebas gigante.
- Sección "Errores que más te cuestan" (coral, uppercase): lista de errores tachado → acento con explicación en español.
- Sección "Dilo como un C1" (verde, uppercase): lista de "así lo dijiste" → "así lo dice un C1" + nota.
- Cierre en itálica (opinión del coach).
- Botón `LISTO` verde.

Cada error va al DNA. **Cada upgrade B2→C1 va al DNA como munición de LEVEL UP** (esto es nuevo de fase 2).

### 3.2 STORY — thriller interactivo (fase 2)
Aprender inglés SOBREVIVIENDO una historia, no leyéndola. Cada beat = producir una línea en inglés bajo presión.

#### Portada (`#story-home`)
- Si hay episodio en curso: tira **"CONTINUAR — EP.X · Beat Y/5"** con fondo `--accent-dim`, borde acento, cliffhanger de una línea. Toca → resume.
- Título hero Bebas 2 líneas: `NO LEES INGLÉS. LO SOBREVIVES.` (SOBREVIVES verde).
- Subtexto: "Un thriller donde tu única arma es la línea que produces en inglés bajo presión. Habla mal y la trama te castiga."
- **3 tarjetas de saga** apiladas verticalmente, cada una `.slang-card` en color pleno rotado:
  - **THE MEDELLIN LEAK** (azul, rotación -1.2°): heist cripto Austin/Medellín. Domina hedging + reported speech.
  - **GHOST TENANT** (coral, +0.8°): misterio de un apartamento. Domina narrar en pasado + especular.
  - **THE PITCH FROM HELL** (verde, -0.6°): thriller de negocios. Domina negociar + persuadir.
  - Cada tarjeta: eyebrow diegético, título Bebas gigante, badge de estructura C1 que entrena, logline de 1 línea. Si hay episodios cerrados de esa saga, muestra contador "· 2 EP. HECHOS" en el eyebrow.

#### Runner de episodio (`#story-run`)
- Header: título de episodio + botón "Salir" (ghost).
- **Dos medidores** en barra:
  - **LEVERAGE** (verde): sube cuando Gus dice algo bien.
  - **HEAT** (coral): sube cuando el NPC se enoja. Si HEAT > 55, el ambient-glow global vira a coral (regla `heat-glow`).
- Zona de conversación (`#story-scroll`):
  - Bubble del NPC con avatar circular en el color de la saga (letra inicial en Bebas).
  - Chips de "gloss" (colocaciones C1 subrayadas del NPC, tocables). Al tocar guarda al DNA la palabra.
  - **Mission card**: bloque con fondo acento-dim, borde acento. Título "TU MISIÓN" en verde uppercase, intención en español (JAMÁS la frase en inglés), registro debajo.
- Zona de input abajo: [mic] [texto 16px] [send]. Botón secundario "no sé qué decir" (pánico) que pide al modelo 2 arranques de frase.
- Al enviar: juez del modelo devuelve:
  - **Rango A–D** en Bebas gigante con color (A/B verde, C amarillo, D coral).
  - Veredicto en 1 línea.
  - Correcciones (mismas cards que TALK).
  - Reacción del NPC (nueva bubble).
  - Deltas de medidores (±N leverage / heat).
  - **Intel card** (opcional): si el juez la suelta, cae una `.slang-card` en color pleno rotada con sello "AÑADIDO A TU DNA".
  - Botón `SIGUIENTE ↑` (si next), `Reformúlalo` (si retry, sin castigo), o `CERRAR EPISODIO` (si es el beat 5).

#### Cierre de episodio (`openSheet`)
- "EP.X COMPLETO."
- Grado A–D del episodio.
- Lo que entrenó (las estructuras C1 objetivo del episodio).
- Cliffhanger en itálica.
- Botones `EP.X+1 →` (arranca siguiente) y `LISTO`.

### 3.3 SLANG — expresiones que sí se usan
Loop de dopamina estilo Instagram: 5 tarjetas por tap.

#### 3 modos (chips arriba): CALLE · TRABAJO · JERGA → INGLÉS REAL

> **El modo se llamaba PAISA → GRINGO y ya no.** Las dos mitades de ese nombre
> nombraban un solo dialecto —"paisa" el de salida, "gringo" el de llegada—
> cuando el puente va de **cualquier** español de América al inglés. El
> comportamiento se generalizó primero (`JERGA_SYSTEM` en
> `src/views/slang/prompts.ts` detecta de qué variante viene la frase en vez de
> asumirla) y **el nombre tardó dos vueltas más en alcanzarlo**: primero perdió
> el "paisa", después el "gringo". Hoy es `JERGA → INGLÉS REAL` en el código y
> en pantalla.
>
> Sigue en pie la **excepción al registro neutro**: SLANG es la única vista
> donde la jerga regional es el CONTENIDO QUE SE ENSEÑA y no la voz que enseña,
> y `src/lib/espanol-neutro.ts` la exime por escrito. Esa exención es sobre las
> frases que el usuario escribe y que la app traduce — **no** sobre cómo la app
> le habla.
- **CALLE / TRABAJO**: título hero Bebas `SLANG QUE SÍ SE USA.` + subtexto + botón grande **DROP** (verde acento). Cada tap genera 5 tarjetas frescas. Las tarjetas aparecen apiladas con rotación y colores rotados. Cada una: eyebrow del vibe, término Bebas gigante, significado en español, ejemplo en inglés en comillas, traducción en itálica, "cómo NO usarla" con borde superior punteado. Botón de **bookmark** (SVG) para guardar al DNA.
- **JERGA → INGLÉS REAL**: input "¿cómo digo eso en inglés?" (ej: "me dejó en visto"). Devuelve una card con 2–4 equivalentes con registro (casual/neutral/vulgar/pro), ejemplos, matiz en español. El ejemplo de este brief era "está mamando gallo", de un solo país; se cambió por uno que se entiende en toda América, que es justo lo que el modo hace ahora.

### 3.4 SUBE (LEVEL UP) — sube tu inglés de B2 a C1 (fase 2)
Loop rápido de "cook → simmer": la app da un B2 plano, Gus produce el C1, se compara.

#### Home (`#ladder-home`)
- Título hero: `SUBE TU INGLÉS.` (punto verde acento).
- Subtexto acusatorio-juguetón: "No estás mal. Estás siendo básico. Cambia lo que dice un B2 por lo que diría un C1 — pero lo produces tú."
- **Barra fina B2 → C1** con racha 🔥 en el centro (`--card-yellow`).
- 3 chips: **TRABAJO · CALLE · MIS FALLOS**.
- Input "o sube esta frase tuya..." + botón flecha arriba.
- Zona `#ladder-runarea` (vacía al inicio, se llena con el peldaño).

#### Peldaño (`.flip-card` con `#rung-card` dentro)
- Contador arriba: "Peldaño 3 / 5 · combo x2" en gris muted.
- **Cara frontal**: `.slang-card` en color pleno rotado.
  - Label mini "B2 · [contexto]".
  - Frase base B2 en Bebas gigante (`.term`).
  - Botón `SÚBELA ↑` (btn-accent).
- Al tocar SÚBELA: aparece la zona de input [mic] [texto] [send] + botón secundario "muéstrame la respuesta" (skip sin juez, gratis).
- **Cara trasera** (aparece al enviar/skip; era un flip 3D pero ahora es un pop scale — funciona en móvil):
  - Label mini "C1 · [registro]".
  - Frase C1 canónica en Bebas.
  - **Swap resaltado**: `finish the project quickly` (tachado coral) → `get this over the line` (acento).
  - Nota en español.
  - Si el usuario escribió: bloque "tú escribiste" + chip veredicto (**CLAVADO** verde / **CASI** amarillo / **BÁSICO** coral) + comentario del juez.
  - Par de botones: `LA CLAVÉ ✓` (btn-accent) / `CASI` (ghost coral).
- Al autojuzgar: sube barra + combo (si clavó), guarda al DNA con `dominado: true|false`, aparece `SIGUIENTE ↑`.
- Al agotar los 5: sheet "VETA HECHA" con Clavados / Mejor combo / % Hacia C1.

#### MIS FALLOS (sin API)
Consume `state.dna.filter(d => d.type === 'upgrade' && !d.dominado)`. Son los upgrades que salieron del debrief de TALK y del juez de STORY. Si está vacío, empty state honesto que empuja al usuario a TALK.

### 3.5 DNA — el cerebro compartido
El registro de todo lo que Gus tocó. Alimenta al quiz.

#### Vista
- **4 stats** en fila (Bebas): Errores cazados · Slang guardado · Upgrades clavados (amarillo) · Episodios.
- Subtexto: "Tu ADN de errores. Todo lo que fallas vuelve aquí — y el repaso te lo cobra hasta que lo domines."
- Botón `REPASO RÁPIDO` (btn-accent).
- Zona de quiz.
- Lista de items del DNA (dna-item, borde tenue).
  - Errores: quote tachado coral → fix acento + why abajo.
  - Slang: term en negrita + meaning + ejemplo en itálica.
  - **Upgrades (nuevo)**: b2 tachado muted → fix acento + marker "clavado ✓" si dominó + why.
  - Cada uno tiene botón X para borrar.

#### Repaso
Necesita ≥ 3 items en DNA. Genera 5 preguntas en español pidiendo producir el inglés. UI: pregunta → botones "Ver respuesta" y "Pista" → tras revelar aparecen `LA TENÍA ✓` / `Fallé`. Al final: score + mensaje según %.

---

## 4. Datos persistentes (localStorage)

Todo con prefijo `rodeo_*`. `store.get/set` está envuelto en try/catch.

| Clave | Forma | Uso |
|---|---|---|
| `rodeo_tts` | `boolean` | TTS del coach ON/OFF |
| `rodeo_cost` | `number` | costo acumulado ($) |
| `rodeo_seen_slang` | `string[]` (últimos 200) | anti-repetición para SLANG |
| `rodeo_dna` | `{type, ...}[]` (últimos 300) | el DNA — ver siguiente tabla |
| `rodeo_sessions` | `number` | contador de sesiones TALK completadas |
| `rodeo_stories` | `number` | contador de episodios completados |
| `rodeo_story` | `{seriesId, episode, beat, leverage, heat, bible, thread}` \| null | run de STORY activa (para "CONTINUAR") |
| `rodeo_story_done` | `{seriesId, episode, grade, ts}[]` | episodios cerrados |
| `rodeo_ladder_xp` | `{pct, clavados, bestCombo}` | XP de LEVEL UP |
| `rodeo_seen_ladder` | `string[]` | anti-repetición para LEVEL UP |
| `rodeo_streak` | `{days, last}` | racha diaria de LEVEL UP |
| `rodeo_pass` | `string` | PIN de la app |
| `rodeo_intereses` | `string[]` | intereses elegidos en el onboarding (chips). La clave EXISTE ⇒ no se re-muestra el onboarding; `[]` = saltó / sin elegir |
| `rodeo_openers` | `string[]` (últimos 8) | anti-repetición de rompehielos de TALK |
| `rodeo_miclang_{talk\|rp\|story\|ladder\|drop}` | `'es'` \| `'en'` | idioma del dictado (SpeechRecognition) por contexto de mic. Una clave por contexto; default `es` en talk/rp y `en` en story/ladder/drop |
| `rodeo_drop_hoy` | `{fecha, edicion, semillas}` \| null | edición cacheada del DROP del día (evita regenerarla al reentrar) |
| `rodeo_drop_manana` | `{fecha, edicion, semillas}` \| null | prefetch del DROP de mañana; se promueve a `rodeo_drop_hoy` cuando cambia el día |
| `rodeo_story_resume` | `{episodeId, sceneId, results, vocab, ts}` \| null | avance del EPISODIO ILUSTRADO (Story Mode) para "Continuar donde ibas". 1 solo slot (un episodio nuevo pisa al anterior); caduca a las 24h |
| `rodeo_sb_email` | `string` (texto plano, NO va por `store`/JSON) | correo de login de Supabase, guardado para prefill/reuso del enlace mágico |

> **sessionStorage** (no localStorage, vive por pestaña): `storyMuted` = `'1'` \| `'0'` — silencia las voces del EPISODIO ILUSTRADO. No persiste entre sesiones (así el mute no se queda pegado entre visitas).

### Items del DNA (rodeo_dna)
Deduplicados por `type + '|' + (fix || term)`.

| type | campos |
|---|---|
| `error` | `quote, fix, why, ts` |
| `slang` | `term, meaning, example, ts` |
| `upgrade` | `b2, fix (=c1), swap, why, register, dominado, ts` |

---

## 5. APIs — para entender latencias en la UI

Backend serverless en `/api/chat` (proxy a OpenCode Zen, modelos Kimi). Todo va por 1 endpoint: `POST /api/chat` con body `{mode: 'chat'|'creative', messages, max_tokens}`. Devuelve `{content, cost, model, finish_reason}`.

- **`chat`** (kimi-k2.6, rápido, ~$0.001–0.005 por call): ~3–8 segundos.
- **`creative`** (kimi-k2.7-code, más potente, ~$0.005–0.02 por call): ~10–25 segundos.
- **Kimi es razonador**: piensa antes de responder. Puede consumir tokens razonando y truncar el JSON — hay reintento automático.

### Cuándo se llama al modelo
| Módulo | Trigger | Modo | Latencia esperada |
|---|---|---|---|
| TALK | cada turno | chat | 5–10s |
| TALK | terminar sesión (debrief) | creative | 15–25s |
| SLANG | tap DROP (5 cards) | creative | 15–25s |
| SLANG | traducir jerga | creative | 10–15s |
| STORY | arrancar episodio (BIBLE) | creative | 20–30s ⚠️ el pico más largo |
| STORY | cada beat (npc + misión) | chat | 8–15s |
| STORY | cada línea enviada (juez) | chat | 8–15s |
| STORY | pánico | chat | 3–5s |
| SUBE | tap veta TRABAJO/CALLE (5 peldaños) | creative | 15–25s |
| SUBE | juez del peldaño (opcional) | chat | 5–8s |
| SUBE | tap SIGUIENTE | ninguno (caché) | instantáneo |
| SUBE | MIS FALLOS | ninguno (localStorage) | instantáneo |
| DNA | tap REPASO | creative | 10–15s |

**Implicación de diseño:** los momentos de espera de 15–30s son intensos en móvil. Ya hay `.skeleton` (shimmer) para SLANG y typing-dots para TALK/STORY. **Esto merece una mejora**: skeletons más específicos por módulo, loaders con "narrativa" ("montando el episodio…", "generando peldaños…"), quizás una barra de progreso indeterminada elegante.

---

## 6. Lo que HAY que respetar (no romper)

1. **Un solo `index.html`.** Sin build step, sin framework, sin dependencias npm. Todo el JS y CSS viven en el mismo archivo. Añadir CSS = más `<style>`, añadir JS = más `<script>`.
2. **Stack fijo:** Tailwind CDN, GSAP CDN, Web Speech API. Nada más. Si necesitas una librería, dime primero.
3. **Nombres de tokens** (`--accent`, `--bg-*`, `--text-*`, `--card-*`) — otros componentes los consumen. Cambiar valores sí, renombrar no.
4. **IDs de elementos** que el JS busca por `$('#...')`: no renombrarlos sin buscar todos los usos. Los críticos:
   - Header: `#cost-ticker`
   - Tab bar: cada `.tab-item[data-view="..."]`
   - TALK: `#view-talk, #talk-empty, #talk-session, #chat-scroll, #chat-input, #send-btn, #mic-btn, #tts-toggle, #end-session, #session-title`
   - STORY: `#view-story, #story-home, #story-run, #story-continue, #story-sagas, #story-scroll, #story-input, #story-send, #story-mic, #story-quit, #story-panic, #story-run-title, #lev-val, #lev-fill, #heat-val, #heat-fill`
   - SLANG: `#view-slang, #slang-feed, #slang-empty, #drop-btn, #paisa-input, #paisa-btn, #paisa-results, #slang-drop-area, #slang-paisa-area, .mode-tab[data-mode="..."]`
   - LADDER: `#view-ladder, #ladder-home, #ladder-bar, #ladder-streak, #ladder-runarea, #ladder-own, #ladder-own-btn, .chip[data-veta="..."]`, y dinámicos: `#rung-card, #rung-up, #rung-input, #rung-send, #rung-mic, #rung-skip, #rung-nailed, #rung-casi, #rung-next`
   - DNA: `#view-dna, #dna-list, #stat-errors, #stat-slang, #stat-upgrades, #stat-stories, #quiz-btn, #quiz-area, #quiz-reveal, #quiz-hint, #quiz-good, #quiz-bad, #quiz-answer`
   - Globales: `#toast, #overlay, #sheet-content`
5. **Clases que el JS toggle-a**: `.hidden, .active, .flex, .flipped, .recording, .on, .selected, .heat-glow, .show`.
6. **Classes que definen componentes reusados**: `.chip, .glass, .grain, .ambient-glow, .slang-card, .bubble-coach, .bubble-user, .correction-card, .btn-accent, .btn-ghost, .icon-btn, .tabbar, .tab-item, .stat-num, .dna-item, .scroll-area, .toast, .overlay, .sheet, .skeleton, .luminous-line, .label-mini, .font-display, .meter-track, .meter-fill, .flip-card, .flip-inner, .flip-face, .flip-back, .swap-old, .swap-new, .rank-badge, .vchip, .npc-avatar, .gloss-chip, .mission-card, .mode-tab`.
7. **Accesibilidad ya cumplida** (no bajarla): touch targets ≥44px, aria-labels en botones-solo-ícono, inputs `font-size: 16px` (evita zoom iOS), `:focus-visible` con outline verde, `@media (prefers-reduced-motion: reduce)` apaga animaciones, contraste AA.
8. **Móvil-first**: viewport 375×812. La app funciona en desktop pero la usa desde el celular. Todo se diseña para el pulgar.
9. **Datos del modelo son texto no confiable**: cualquier `innerHTML` con datos del LLM DEBE pasar por `esc()`. Está así en todos los sitios existentes — no romper esa disciplina.

---

## 7. Lo que sí se puede (y debe) mejorar

Estas son las áreas donde el diseño actual es "funcional pero mejorable". Cada una es una invitación abierta:

### A. La pantalla vacía de cada vista
Los 5 home-states tienen la misma fórmula (título gigante + subtexto + chips/botón). Se ven correctos pero no memorables. Cada vista podría tener **una identidad visual propia más fuerte**: ilustraciones simples en CSS, patrones geométricos únicos por módulo, o un "hero" con más carácter. Sin caer en genericidad AI (nada de gradientes púrpura, nada de illustraciones vectoriales corporativas).

### B. La tab bar
Actualmente 5 tabs de 66px con íconos pequeños de stroke fino y label de 0.56rem. En 375px funciona pero se ve apretada; en 320px (iPhone SE) probablemente aprieta. Puede ganar personalidad: ¿tab activa con animación más marcada?, ¿iconos con más peso visual?, ¿variante estilo "bolt" verde para la tab activa?

### C. Los momentos de espera (15–30s)
Los skeletons y typing-dots son estándar. Podrían ser experiencias en sí mismos: mensajes narrativos ("montando la escena…", "buscando slang fresco…"), animaciones GSAP más ricas, o loaders temáticos por módulo (una brújula girando para viajes, un signo de dólar cripto pulsando para negociación, etc.).

### D. Las tarjetas de saga (STORY portada)
Ahora son 3 `.slang-card` reusadas en colores planos. Merecen **tratamiento especial**: son la puerta de entrada al módulo más ambicioso. Podrían tener textura, iconografía diegética (una llave rota para el heist, una sombra para el fantasma, una gráfica ascendente para el pitch), o composición más audaz.

### E. Runner de STORY
La conversación en vertical con medidores arriba funciona pero es plana. Ideas: medidores que "sacuden" al cambiar, el fondo que pulsa cuando HEAT sube, avatar del NPC con más personalidad (color + iconografía?), el rank A–D que entra con más drama.

### F. El flip de LEVEL UP
Actualmente es un scale-pop porque el flip 3D era frágil. Se puede rehacer el flip correctamente (con `perspective` + `preserve-3d` y sin depender de `onComplete` de GSAP) para que sea más satisfactorio.

### G. La barra B2→C1 de LEVEL UP
Ahora es una `.meter-track` fina genérica. Merece un tratamiento más celebratorio: marcas de nivel, animación al subir, quizás un pequeño "cook / simmer" ícono en cada extremo para reforzar el concepto ancla.

### H. El sheet de debrief / cierre
Los sheets (openSheet) son funcionales pero tienen la misma estructura. Podrían diferenciarse por módulo con energía propia — el debrief de TALK con más "reporte del entrenador", el cierre de STORY con más "epílogo dramático" (cliffhanger destacado), el resumen de LEVEL UP con más celebración.

### I. Toasts y micro-interacciones
El toast actual es un pill oscuro simple. Los combos (`x3 🔥`) y la racha (🔥 emoji) merecen tratamiento visual más rico (partículas GSAP, glow, escala más marcada).

### J. Correcciones (TALK y STORY)
Las cards de corrección son ahora coral tenue. Podrían ser más "screenshotteables" — la referencia de Gus es que las publicaciones tipo Instagram sean guardables como memes. ¿Un modo "compartir esta corrección" que la exporte como imagen? (fuera de scope inmediato pero mencionable.)

---

## 7.bis Bugs de contraste **verificados** que el rediseño DEBE arreglar

Una revisión adversarial acaba de confirmar 3 defectos de contraste WCAG en el código actual. No son opinión — son cálculos WCAG con evidencia. Cualquier rediseño de las cards de contenido debe resolverlos:

1. **CRÍTICO — Swap invisible en LEVEL UP** (`.swap-old` / `.swap-new` dentro de la cara C1 del peldaño). El swap `finish the project quickly → get this over the line` es el corazón de la lección. Hoy usa colores fijos coral/verde definidos para el fondo oscuro base — pero se pinta sobre tarjetas de color pleno. Contraste medido: `swap-old` sobre `--card-coral` = **1.00** (color idéntico al fondo, literalmente invisible); `swap-new` sobre `--card-blue` = 2.46; sobre `--card-coral` = 1.42. **Fix requerido:** o sacar el swap de la tarjeta (pintarlo en un bloque separado sobre fondo oscuro), o calcular los colores del swap según `theme.text` (dark-text / light-text) en vez de usar `--accent` y coral fijos.
2. **CRÍTICO — Frase C1 casi-negra sobre fondos oscuros** en la cara trasera del peldaño (`flipToBack`, el `.term`). Hoy fuerza `color: oklch(12% 0.02 145)` (negro) sobre CUALQUIER tarjeta, mientras el resto de la card (label, note) mantiene `light-text`. Sobre `--card-blue` da 3.46, sobre `--card-green` 3.11 — bajo AA. Y visualmente queda una tarjeta con texto mitad oscuro mitad claro, incoherente. **Fix requerido:** quitar el `color:` forzado en `.term` de la cara C1 y dejar que herede `theme.text` como la cara frontal.
3. **ALTA — Texto pequeño sobre coral bajo AA.** `--card-coral` con `light-text` da 3.37 de contraste. El título Bebas pasa como large-text (umbral 3.0), pero la logline de GHOST TENANT (`.ex` 0.95rem) y las notas de peldaños coral quedan bajo AA (4.5). El `label-mini` con `opacity: 0.75` cae a 2.77. **Fix requerido:** o bajar la L de `--card-coral` a ~0.55 para que light-text pase 4.5, o cambiar `card-coral` a dark-text (como yellow y paper) revisando que el título siga funcionando.

Estas son las 3 correcciones que van al Anexo B: son la base sobre la que un rediseño debe construir, no negociables.

---

## 8. Restricciones inamovibles del rediseño

- **No cambies el HTML del `<head>` ni el orden de scripts.**
- **No cambies el shape de los datos del DNA ni los IDs de localStorage.** Rediseñar el render de una card sí; cambiar `type: 'upgrade'` por `type: 'level-up'` rompe el motor.
- **No añadas dependencias externas** (fuentes vía Google Fonts sí; librerías npm no).
- **No uses emojis como íconos de control** (SVG sí). Los emojis de estado (🔥 racha, celebraciones) sí.
- **Respeta REGLA CERO**: si el resultado se ve como una plantilla SaaS, se rechaza.

---

## 9. Cómo probar tu rediseño

1. Abre `index.html` directo en el navegador (no hace falta build).
2. Para que funcione con la API: correr `node dev-server.mjs` (necesita `OPENCODE_API_KEY` en `.env.local` — Gus ya la tiene).
3. En Chrome DevTools, activa el emulador móvil (375×812, iPhone 12).
4. Prueba cada vista sin llamar a la API (para diseñar rápido):
   - Puedes precargar datos en localStorage vía la consola para ver estados llenos.
   - Ejemplo: `localStorage.setItem('rodeo_dna', JSON.stringify([{type:'error',quote:'I go yesterday',fix:'I went yesterday',why:'pasado simple'}, {type:'upgrade',b2:'I think it\\'s good',fix:'It\\'s got real legs',dominado:true,why:'suena decidido'}]))` y recarga.
5. Verifica los 5 tamaños de viewport: 320, 375, 414, 768, 1024.

---

## 10. Prioridad sugerida de mejoras (mi lectura)

Si vas a hacer una sola pasada, este es el orden por impacto:

1. **Tarjetas de saga en STORY portada** — es la entrada al módulo más ambicioso, debe seducir.
2. **Runner de STORY** — medidores + rank + reacciones, es donde vive el 80% del tiempo del módulo.
3. **Tab bar de 5** — se ve todo el tiempo, apretar bien el tratamiento visual.
4. **Loaders/skeletons temáticos** — los 15–30s son el mayor punto de fricción de la app hoy.
5. **Flip real de LEVEL UP** — es el "wow" del módulo.
6. **Home states de las 5 vistas** — cada uno con más carácter propio.
7. **Sheets de debrief/cierre** — dramatismo por módulo.
8. **Micro-interacciones** (combos, rachas, toasts).

---

## Anexo A: mapa rápido de archivos

- `index.html` — todo (HTML, CSS, JS, 2100+ líneas)
- `api/chat.js` — proxy serverless a OpenCode
- `dev-server.mjs` — server local que sirve `index.html` y monta `api/chat.js` como handler
- `.env.local` — variables de entorno (`OPENCODE_API_KEY`, `APP_PASS`)
- Referencias visuales en la carpeta raíz: `WhatsApp Image *.jpeg`, `151252.jpeg`, `jjuj.jpeg`, `jujuuju.jpeg`

## Anexo B: paleta ya en uso (para pegar en tu tool de diseño)

```
Fondos:   #0d1013 · #131720 · #191d28 · #1e2330
Textos:   #f0f2f4 · #a8adb4 · #63676d
Acento:   #57d97a (verde eléctrico oklch 72% 0.25 145)
Cards:    #2246c8 (blue) · #2a7854 (green) · #f5c847 (yellow) · #d0603f (coral) · #f4ede1 (paper)
Grain:    fractalNoise SVG @ opacity 0.05 con mix-blend-mode overlay
```

(Los oklch reales son la fuente de verdad, esos hex son aproximaciones para que veas la paleta rápido.)
