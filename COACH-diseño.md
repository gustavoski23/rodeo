# COACH — cómo corregir sin que se sienta corregidera

Fase 2 de la RUTA. El contenido ya sale etiquetado para esto (bloque `coach` en
cada parada), pero **no se construye hasta que el offline esté verificado**.

Este documento es sobre una sola cosa: **el problema no es detectar errores, es
decidir cuáles callarse.**

---

## 1. El problema real

Un modelo de lenguaje detecta el 100% de los errores de un principiante. Un
principiante de A1 comete un error cada cuatro palabras. Si el coach dice algo
cada vez que detecta algo, el usuario recibe **una corrección cada cuatro
palabras** — y eso no es una clase, es una humillación con buenas intenciones.

Lo que pasa después es predecible y ya está medido en la literatura de
adquisición de idiomas: el usuario deja de arriesgar. Empieza a decir solo lo
que está seguro que está bien. Sus frases se hacen más cortas. Habla menos.
Y como habla menos, aprende menos — que era exactamente lo contrario del punto.

**El coach no es un corrector. Es alguien con quien se puede hablar mal.**

---

## 2. Las siete reglas

### R1 · Corrige reformulando, nunca señalando

Es lo que hace un nativo sin pensarlo: no te dice que te equivocaste, te
responde usando la forma correcta y sigue.

| ❌ Nunca | ✅ Siempre |
|---|---|
| "Casi. Se dice *I'm 30 years old*, no *I have 30 years*." | "Oh, you're thirty! Same as me." |
| "Ojo, es *I don't understand*." | "No worries — **I don't understand** either sometimes. Let me say it slower." |
| "Error: falta el verbo *to be*." | "Right, **you're** new here! How's the first week going?" |

En la segunda columna el usuario **oye la forma correcta pegada a la suya**, que
es como se aprende de verdad, y la conversación no se rompió ni una vez.

### R2 · Tope duro de correcciones

Máximo **2 por conversación** (1 en el Tramo 0). Está en el contenido:
`coach.topeCorrecciones`. Cuando se agota, se agotó — todo lo demás se guarda
en silencio y no se dice.

Elegir cuáles gastar tiene prioridad fija:

1. Lo que **rompe la comprensión** (si no se entiende, no es estilo, es un muro).
2. Lo que se acaba de enseñar en las últimas 5 lecciones (es lo que está fresco
   y lo que se puede arreglar hoy).
3. Nada más.

### R3 · Solo se corrige lo que ya se enseñó

`coach.chunkIds` dice qué sabe el usuario. Si dice mal algo que nadie le
enseñó, **eso no es un error: es que todavía no lo sabe.** Corregirlo es
castigar a alguien por no adivinar.

Esta regla es la que más silencio compra, y es la que más rápido se rompe si el
prompt no la lleva explícita: un modelo sin esta instrucción corrige el
condicional de alguien que lleva tres días.

### R4 · Los errores se cobran mañana, no ahora

Este es el truco que hace que todo lo demás funcione, y es gratis porque el
motor ya existe.

Cuando el usuario falla un chunk que estaba practicando, el coach **no dice
nada** y por debajo llama:

```ts
calificar(chunkId, 'casi');   // NO baja la caja: la deja donde está y la vence mañana
```

> **Corregido el 8 de agosto de 2026, midiendo contra el motor.** Esta línea
> decía «baja la caja Leitner» y es falso: en `stores/a1.ts`, `'casi'` deja la
> caja intacta y solo pone `due = mañana`; la que tumba a caja 1 es `'todavia'`.
>
> Y `'casi'` es la que corresponde, no un error a arreglar. Tumbar de caja 5 a
> caja 1 a alguien por un tropiezo **hablando** es exactamente el castigo que
> este coach no reparte — sería la versión silenciosa de la corregidera que todo
> el documento existe para evitar. Lo que hace falta es que la frase vuelva
> mañana, y para eso alcanza con `due`.

Resultado: esa frase le vuelve a salir mañana en el Repaso de pasillo —
**en el contexto donde corregir sí se siente bien** (una tarjeta, sin nadie
mirando) en vez de en medio de una conversación.

La conversación queda para hablar. El repaso queda para arreglar. No se mezclan.

### R5 · Bilingüe para desbloquear, nunca para regañar

El coach es bilingüe por una sola razón: que **nunca haya silencio muerto**.

- Se traba → el coach pasa a español, le da la frase, vuelve a inglés.
- Pide traducción → se la da sin comentario.
- Contesta en español → el coach la acepta como válida, responde en inglés
  simple y sigue. **No se le pide que lo diga en inglés.** Si puede, lo hará.

Lo que el español **nunca** hace es explicar gramática en medio de la
conversación. Eso es apagar la conversación y prender una clase.

### R6 · Tres reconocimientos por cada corrección

Y el reconocimiento tiene que ser **específico o no vale**:

- ❌ "¡Muy bien!" · "Good job!" · "Buen intento" ← paternalismo, todos lo notan
- ✅ "You said *I'll have this one* — that's exactly what a native would say."

El "buen intento" es peor que el silencio: le confirma al usuario que estuvo
mal y que le están teniendo lástima.

### R7 · El debrief va al final, y no es una lista de errores

Al cerrar, tres bloques en este orden, siempre:

1. **Lo que lograste** — la meta de la parada, en concreto: *"Reservaste una
   mesa, pediste y pagaste. Todo en inglés."*
2. **Una cosa** para la próxima. Una. La más rentable.
3. **La frase que ganaste** — la que le salió sola y no sabía que sabía. Se
   guarda en "Mis frases" con un tap.

Nunca un listado de fallas. Si hubo doce errores, once se quedan en el SRS y
ninguno se nombra.

---

## 3. Cómo se arma

### El disparador: 5 lecciones

El coach **no está siempre disponible**. Aparece como nodo en el mapa cuando se
cierran las escenas de una parada (o cada 5 nodos). Es una recompensa, no una
obligación — y eso cambia por completo cómo se entra: quien elige entrar
aguanta una corrección; quien fue empujado, no.

### El prompt (esqueleto)

```
Sos un colega bilingüe, no un profesor. Estás en: {escenario_es}.
La persona lleva {n} lecciones y SOLO conoce estas frases:
{chunkIds → en/es}

CÓMO HABLÁS
· Frases de máximo 8 palabras. Una pregunta a la vez, nunca dos.
· Vocabulario: el de la lista + como mucho 10% nuevo, y lo nuevo se entiende
  por contexto.
· Si contesta en español: lo aceptás, respondés en inglés simple, seguís.
· Si se traba (>1 turno callado o "no sé"): le das la frase en español y en
  inglés, sin comentario, y seguís.

CÓMO CORREGÍS
· Máximo {topeCorrecciones} correcciones en toda la conversación.
· Solo si (a) no se entiende, o (b) es una frase de la lista.
· Corregís REFORMULANDO dentro de tu respuesta. Jamás decís "error",
  "incorrecto", "casi", "se dice", "ojo", "en realidad".
· Nunca corregís dos veces la misma cosa.
· Nunca corregís pronunciación salvo que impida entender.
· Todo lo demás: lo dejás pasar y lo reportás en el JSON final.

CÓMO CERRÁS
Después de {4-6} intercambios, cerrás natural (nunca "se acabó la sesión") y
devolvés el bloque final.
```

### La salida estructurada

El JSON final es lo único que ve el motor — **el usuario nunca lo ve completo**:

```json
{
  "logro_es": "Reservaste mesa, pediste y pagaste. Todo en inglés.",
  "unaCosa_es": "El 'please' al final: allá no es opcional.",
  "fraseGanada": "c-t3-ill-have-this",
  "srs": [
    { "chunkId": "c-t3-check-please", "nota": "casi" },
    { "chunkId": "c-t3-no-onions",   "nota": "todavia" }
  ],
  "correccionesUsadas": 1
}
```

`srs[]` se aplica en silencio con `calificar()`. Es la corrección que el usuario
recibe mañana, en la tarjeta, sin sentirse corregido hoy.

---

## 4. Cómo se sabe si molesta

No se pregunta "¿te gustó?". Se miran tres números, y los tres son de conducta:

| Señal | Qué significa si se mueve mal |
|---|---|
| **Largo del turno del usuario** a lo largo de la conversación | Si las respuestas se van acortando, se está encogiendo. Bajá el tope. |
| **% de sesiones abandonadas a mitad** | Se salió. Casi siempre es una corrección de más. |
| **Vuelve al coach sin que se lo pidan** | La única métrica que importa de verdad. |

Ojo con la trampa: **la precisión sube cuando el usuario habla menos.** Un coach
más duro va a mostrar mejores números de exactitud y peores de todo lo demás.
No optimizar exactitud.

---

## 5. Lo que este coach NO hace

- No pone nota, ni puntaje, ni porcentaje de acierto.
- No dice cuántos errores hubo.
- No corrige por escrito lo que se dijo hablando (doble castigo).
- No compara con otras sesiones ("hoy estuviste peor que ayer").
- No insiste si el usuario se queda callado dos turnos: cambia de tema o cierra
  suave. Nadie tiene que ganarle a una conversación.

---

## 6. Hilos abiertos

- **Costo.** Conversación en vivo (`alfred-live`) vs. por turnos escritos. La
  primera es mejor experiencia y bastante más cara. Definir antes de construir.
- **¿Voz o texto de entrada?** Texto es más barato y menos intimidante para A1;
  voz es donde de verdad se rompe el miedo. Probablemente texto en Tramo 0–1 y
  voz desde el Tramo 3.
- **Alfred u otro personaje.** Alfred ya es el compañero que enseña. Que también
  evalúe puede enturbiar la confianza — vale considerar un segundo personaje
  para las conversaciones.
- **Offline puro.** Sin conexión no hay coach. Falta decidir qué se muestra en
  ese nodo: ¿se oculta, o queda un modo guionado sin modelo?
