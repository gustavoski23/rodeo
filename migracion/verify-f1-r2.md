# VERIFICACIÓN ADVERSARIAL · F1 (TALK) · RONDA 2

> Verificador: no confié en el informe de los implementadores. Todo lo de abajo
> lo ejecuté yo contra el build de producción y contra `public/legacy.html`.
> Commit verificado: `4fc8d99` (árbol limpio; lo que leí es lo que está en HEAD).

**Veredicto: CON DEFECTOS — 1 defecto menor.** Es una desviación deliberada y
documentada de la spec §3.2, no una rotura. Todo lo demás pasó.

---

## 1. Compilación

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` (`tsc -b`) | **0 errores** |
| `npm run build` (`tsc -b --noCheck && vite build`) | **verde** · 2334 módulos · `index-CxXwncg2.js` 459 kB (147 kB gzip), `index-CIlCOJ0y.css` 50 kB (10 kB gzip) |

---

## 2. Fidelidad de los prompts (spec §2) — el punto de mayor riesgo

No leí los prompts "a ojo". Escribí un comparador que extrae el template literal
de `public/legacy.html` y el del port, normaliza las interpolaciones `${…}` a un
marcador y **resuelve los escapes evaluando el literal**, para que un `\"` contra
un `\\"` no pase desapercibido. Después diff carácter a carácter.

**22 de 22 idénticos**, byte a byte:

```
talkSystemPrompt IDENTICO (4178)   rpSystemPrompt   IDENTICO (2360)
TALK_OPENING     IDENTICO (695)    RP_OPENING       IDENTICO (275)
NOTA_STT_BILINGUE IDENTICO (350)   genUser          IDENTICO (950)
dnaBrief ×4 partes IDENTICO        sorpresaUser     IDENTICO (512)
interesesBriefTalk IDENTICO (156)  rpDebriefUser    IDENTICO (475)
interesesLineaDrop IDENTICO (107)  debriefUser      IDENTICO (423)
avoid-openers    IDENTICO (66)     ideaUser         IDENTICO (141)
IDEA_SYSTEM · DEBRIEF_SYSTEM · GEN_SYSTEM · SORPRESA_SYSTEM · RP_DEBRIEF_SYSTEM  IDENTICOS
```

Nota concreta: la corrección de ronda 1 en `escenas-prompts.ts` (`\\"` → `\"`
dentro del ejemplo de `consejo`) **era necesaria y es correcta**. Con `\\"` el
prompt emitía `\"` literal (barra invertida + comilla); ahora emite `"`, que es
exactamente lo que emite el legacy. Sin ese cambio `rpSystemPrompt` habría
diferido del viejo en 2 caracteres.

---

## 3. Claves de localStorage (spec §5)

Inventario completo de `store.set`/`store.get` en `src/`, contrastado con todas
las claves `rodeo_*` del legacy:

- **Ninguna clave inventada.** El conjunto escrito por la app nueva
  (`rodeo_cost`, `rodeo_dna`, `rodeo_ladder_xp`, `rodeo_miclang_*`,
  `rodeo_openers`, `rodeo_pass`, `rodeo_seen_ladder`, `rodeo_seen_slang`,
  `rodeo_sessions`, `rodeo_streak`, `rodeo_tema`, `rodeo_tips`, `rodeo_tts`) es
  un **subconjunto estricto** de las del legacy.
- `store` (`src/lib/storage.ts`) conserva el `window.sbOnLocalChange(key)` tras
  cada `set` y el toast de fallo de escritura. El sync de Supabase no se rompe.

### Formas persistidas, verificadas campo a campo en runtime (no por lectura)

| Origen | Objeto observado en `rodeo_dna` | ¿= spec §3.5? |
|---|---|---|
| Corrección de turno | `{type:"error",quote:"I have 30 years",fix:"I'm 30",why:"la edad va con to be",ts:1785…}` | sí — claves exactas |
| Tooltip → guardar | `{type:"slang",term:"got bumped",meaning:"…",example:"",ts:…}` | sí |
| Debrief CHARLA `upgrades` | `{type:"upgrade",b2:"It's good",fix:"It's got real legs",swap:"",why:"suena a alguien que decide",register:"",dominado:false,ts:…}` | sí — `fix`=c1, `why`=note |
| Debrief ESCENA `aprendizajes` | `{type:"slang",term:"hold your ground",meaning:"…",example:"",ts:…}` | sí |

Además verificado en vivo: **newest-first** (`unshift`), **dedupe por
`type|fix\|term`** (la misma corrección dos veces deja **1** item),
`rodeo_openers` = `string[]` recortado a 140 chars (guarda el reply **crudo**,
con sus `⟦||⟧`, igual que el viejo), `rodeo_tips` = `{"talk":1}`,
`rodeo_streak` = `{days:1,last:"2026-07-27"}`.

**Asimetría del legacy confirmada (§8 trampa 18):** el debrief de CHARLA sube
`rodeo_sessions` y **deja `rodeo_streak` en `null`**; el de ESCENA sube ambos.

---

## 4. Smoke Playwright — 149 aserciones, 0 fallos reales

Montado con un **servidor SSE propio troceado de verdad** (`route.continue` a un
mock local) porque `route.fulfill` no puede entregar el stream por partes: sin
eso la fase 1 nunca se ejerce de verdad. Todo en 390×844 y 320×844, tema oscuro
y claro.

### 4.1 CHARLA — turno completo (33/33)
Lápiz visible durante la espera → **texto parcial pintado mientras streamea**
→ **nunca aparece un `⟦`, `⟧` ni `||` en pantalla** → swap a fase 2 con las
2 glosas correctas (la inline `⟦||⟧` **y** la del array `glosses`) → tarjeta de
corrección → DNA con la forma exacta → tooltip (hover y click) → guardar a DNA
(**el tooltip NO se cierra**, el botón pasa a `✓ en tu DNA` y se deshabilita) →
mute/play/repetir → bombilla → Terminar → hoja DEBRIEF.

### 4.2 ESCENAS — sesión completa (22/24; los 2 "fallos" eran mis regex)
Portada con la canónica + 3 generadas + `SORPRÉNDEME`; **obstáculo visible tanto
en la portada como dentro de la sesión** (tarjeta de misión); narración glosada;
consejo del director; réplica del jugador; debrief `CÓMO TE FUE.` con las claves
escritas, `GUARDAR 2 A MI DNA` → 2 slang al DNA + toast + vuelta a la portada.
Los 2 fallos iniciales fueron míos: `innerText` devuelve las etiquetas en
mayúsculas por CSS (`TU ROL`) y el título parte en dos líneas (`CÓMO TE\nFUE`).

### 4.3 Errores (20/21; el fallo restante era mi socket destruido a propósito)

| Escenario | Comportamiento observado | ¿= spec §8? |
|---|---|---|
| `/api/chat` → 500 en CHARLA | toast `Error: el modelo se cayó` (**mensaje crudo, sin `rpErrMsg`**), lápiz retirado, **sesión viva**, se puede reintentar | sí (trampa 9) |
| SSE cortado a mitad | cae a `callAPI`, no parsea, lanza `El coach se enredó — repite el mensaje`; **no deja media respuesta pintada**; sesión viva | sí |
| 500 al generar escenas | mensaje humano + `reintentar`; la carta canónica sigue disponible | sí |
| 500 en el debrief de ESCENA | hoja **`NO SALIÓ EL CIERRE.`** con `REINTENTAR CIERRE` / `Salir sin análisis`; **NO destruye la escena**; no incrementa `rodeo_sessions` | sí (trampa 17) |

Ninguno se colgó ni se tragó el error. Cero excepciones no capturadas.

### 4.4 Casos borde (22/22)
- CHARLA `Terminar` con <3 turnos `user` → cierra **sin gastar llamada** (verificado contando peticiones al mock) y sin tocar `rodeo_sessions`.
- ESCENA `Terminar` con <2 turnos → idem.
- `←` a mitad de stream → vuelve al vacío, **no pinta la respuesta huérfana**, `busy` liberado.
- Reintento vacío+`length`: **1ª llamada `max_tokens:3200` con `stream:true`, 2ª `max_tokens:6000` sin stream** — exactamente §1.4 p.8.
- Turno de escena fallido: **la línea vuelve al `#rp-input`, no se traga** (trampa 14).
- `tipPrimeraVez`: aparece una vez y no reaparece en la 2ª sesión.
- Dibujo libre: **no gasta llamada a la API**, prefijo `Hey Gus — ` con minúscula inicial, título `Dibujo libre`; `otro tema` re-sortea.

### 4.5 Overflow y consola
**Cero desborde horizontal** en las 4 combinaciones (oscuro/claro × 390/320) y en
5 pantallas cada una: CHARLA vacía, CHARLA en sesión con corrección larga y un
token de 60 letras sin espacios, CHARLA tras réplica, ESCENAS portada, ESCENAS
sesión. Medido tanto `documentElement.scrollWidth` como el rect de **cada
elemento** dentro de `<main>`.
**Cero errores de consola** en todas las suites (filtrados solo
`fonts.googleapis` y los cortes de red que yo mismo provoqué).

---

## 5. Motion (snippets del dueño)

| Snippet | Verificación | Estado |
|---|---|---|
| 1 · morph de icono | `pill-button.tsx:36-47`: `AnimatePresence mode="popLayout" initial={false}`, `initial/exit {scale:0.5,opacity:0}`, `animate {scale:1,opacity:1}`, **`spring 600/25`**, contenedor `relative` de 16 px | **exacto** |
| 1 · botón contenedor | `whileHover={{scale:1.02}}` + `whileTap={{scale:0.96}}` | **exacto** |
| 2 · píldora | medido en el DOM: **alto 36 px, `border-radius: 40px`**, `background: oklch(0.22 0.012 265 / 0.04)` (= `--pill-bg`, el 4 % invertido en claro), borde 1 px, **icono lucide 16 px** | **exacto** |
| 3 · repetir | `animate={{rotate: girado?180:0}}`, `spring 400/25`; en runtime el `transform` pasa de `none` a `rotate(180deg)` y alterna | **exacto** |
| 4 · lápiz | `svg.rd-pencil` presente con **8 keyframes vivos** (`rdPencilStroke, rdPencilRotate, rdPencilBody1-3, rdPencilEraser, rdPencilEraserSkew, rdPencilPoint`) | **animando** |
| 5 · TextAnimate | usado en el **héroe** de CHARLA, **no en el chat** | ver §7 |

**Reduced-motion:** con `prefers-reduced-motion: reduce` el lápiz pasa de 8
animaciones a **ninguna** (el `@media` de `pencil.css:164`, que es el mismo corte
que trae el legacy) y `MotionConfig reducedMotion="user"` en `App.tsx` apaga los
springs. La app sigue usable y sin errores.

---

## 6. Contraste AA — ambos temas

Medido componiendo el fondo real elemento a elemento con canvas (no leyendo
tokens a mano), aplicando el umbral correcto según tamaño y peso.

| Elemento | Oscuro | Claro | Mínimo |
|---|---|---|---|
| Burbuja del coach (16 px) | 16.55 | 14.90 | 4.5 |
| Glosa subrayada | 16.55 | 14.90 | 4.5 |
| Corrección · `quote` (13.6 px) | 8.24 | 5.66 | 4.5 |
| Corrección · `fix` (13.6 px bold) | 12.76 | **5.47** | 4.5 |
| Corrección · `why` (12.8 px) | 6.22 | 6.05 | 4.5 |
| Tarjeta de escena · título | 7.72 | 10.89 | 3 |
| Tarjeta · etiqueta / valor | 5.95 | 6.97 | 4.5 |
| Tarjeta · obstáculo | **4.50** | 5.25 | 4.5 |
| Tarjeta · CTA | 7.72 | 10.89 | 4.5 |

El token `--texto-bien` que se añadió en ronda 1 **hace su trabajo**: el `fix` de
la corrección da 5.47 en claro, donde con `--accent` daba 4.4 (por debajo de AA,
porque 13.6 px en negrita no es "texto grande").

**A vigilar (no es defecto, pasa):** el obstáculo de la tarjeta (`--swap-old`)
sobre `--card-blue` en tema oscuro da **4.503:1** — pasa AA por 0.003. Barrí la
paleta entera (blue/green/coral/yellow/lavender × swap-old/ink-soft/ink, los dos
temas): las 30 combinaciones pasan, y esa es la única sin margen. Si algún día se
retoca `--card-blue` o `--swap-old`, es la primera que se cae.

---

## 7. DEFECTO

### 7.1 [MENOR] Se eliminó la máquina de escribir (`escribirMaquina`), spec §3.2

`src/views/talk/use-coach-turn.ts:49-54` documenta la decisión: con streaming, el
tecleo re-escribiría un texto que el usuario ya leyó, así que la fase 2 es un
swap atómico a `<GlossText>`.

El razonamiento es legítimo, pero conviene que lo ratifique el dueño, no el
implementador, porque:

1. **El legacy sí hace las dos cosas.** `public/legacy.html:4207-4222` streamea a
   `liveBubble` (fase 1) y **después** llama a `escribirMaquina(burbuja,
   replyLimpio, …)` sobre la misma burbuja. El re-tecleo es el comportamiento
   real en producción, con su rareza incluida.
2. **Cambia un tiempo que la spec fija explícitamente.** §1.4 p.11 dice que las
   correcciones caen "**y recién entonces**", es decir dentro del callback del
   tecleo (`400 + visibles*18` ms después). En el port caen en el mismo frame que
   el reply. Es una diferencia de ritmo visible en pantalla.
3. **Deja el snippet 5 del dueño sin usar en el chat.** `TextAnimate` está
   instalado verbatim y solo se usa en el héroe de `charla-empty.tsx`; el brief
   pedía usarlo "en el chat […] por carácter para la respuesta final corta".

No rompe nada funcional: el texto final es correcto, las glosas y las
correcciones aparecen, el DNA se escribe igual. Por eso es **menor**. La salida
natural es una de dos: (a) tecleo solo cuando **no** hubo fase 1 (apertura de
dibujo libre, fallback sin stream), que recupera §3.2 sin re-escribir nada; o
(b) que el dueño firme la desviación y se anote en la spec.

---

## 8. Lo que NO pude verificar

- **Micrófono real.** En headless no hay dispositivo de audio ni
  `SpeechRecognition` con backend. Verifiqué por lectura que
  `crearReconocedor` fija `interimResults=true`, `continuous=false`, relee
  `micLangCode(ctx)` **justo antes de cada `start()`**, ignora en silencio
  `aborted` y `no-speech`, y que `abort()` desarma los callbacks. Los estados de
  UI (`recording`, pulso coral, cambio de etiqueta, chip ES/EN) están cableados a
  props, no al dispositivo; el morph con ellos es el mismo `IconMorph` ya medido.
- **TTS real (Deepgram).** `/api/tts` no existe en preview; lo aborté a
  propósito. Verifiqué por lectura la cadena `parseChunks → pedirTTS → Web Audio
  → caerASistema` y la invalidación por `speakToken`. En runtime sí verifiqué el
  camino con voz apagada: `registrarHablado` habilita play/repetir, que es la
  rama que el legacy también ejecuta.
- **Premium.** `premiumGate` es una llamada guardada a `window.premiumGate`, que
  no existe en la app nueva: todos los gates pasan, como hoy con
  `PREMIUM_ENFORCE=false`.
- **`rodeo_premium_uso`** no lo escribe nadie porque el módulo no está portado.
  Correcto según §8 trampa 31, pero es deuda anotada para cuando entre premium.

---

## 9. Decisiones de port comprobadas como documentadas

- **§8 trampa 33** (carta canónica): `rp-turn.ts:179-185` toma explícitamente la
  opción (a) — la princesa entra por el flujo generativo normal — y marca la
  línea a cambiar cuando se porte STORY. Documentado, no improvisado.
- **§8 trampa 34** (`#rp-again`): `escenas-session.tsx:155-163` lo cablea a
  repetir, "como su gemelo de CHARLA", citando la trampa. Documentado.
- **§8 trampa 12** (truthiness vs identidad): CHARLA usa truthiness, ESCENAS
  compara `session === ses` en todos los guards, incluido el `finally`. La
  asimetría se conserva y se explica.
- **§8 trampa 2** (reintentos distintos): CHARLA reintenta con vacío+`length` a
  6000; ESCENAS parsea primero y reintenta `!parsed && length` a 5000. Verificado
  en código y, para CHARLA, en runtime.
- `state.session.displayLog` (§5.3): el legacy lo tenía comentado y sin usar;
  aquí existe de verdad porque en React el DOM no es estado. Está justificado en
  `stores/talk.ts:9-24`.

---

## 10. Higiene

Sin `dangerouslySetInnerHTML` (la única mención es un comentario explicando por
qué ya no hace falta), sin `console.log` de depuración, sin `TODO`/`FIXME`
pendientes. No se tocó `package.json`, `/api`, `public/legacy.html` ni
`public/js/*`. El servidor de preview quedó apagado (`pkill -f "vite preview"`).
