/* La regla de REGISTRO del español que hablan los coaches de Hablarte.

   Por qué existe este archivo y no una línea suelta en cada prompt: la app
   nació con la voz de Gus —paisa, voseo, "parce"— porque Gus vive en Medellín
   y era el único usuario. Al abrirla a amigos, el primero en probarla fue Migue
   desde Chile y lo primero que dijo fue que sonaba a modismos colombianos. Un
   coach que suena de otro barrio no se lee como cercano: se lee como ajeno, y
   ese es justo el efecto contrario al que busca la app.

   La regla vive en UN solo sitio a propósito. Estaba repetida —con palabras
   distintas— en el prompt de Alfred, en el de CHARLA y en el de ESCENAS, y
   basta que una copia se quede vieja para que un coach hable distinto que otro
   y el usuario note la costura.

   OJO, lo que esta regla NO toca: los comentarios del repo (que son para quien
   programa, no para el usuario) y la vista SLANG, donde la jerga regional es el
   contenido que se enseña, no la voz que enseña. */

/** Bloque para prompts en INGLÉS (Alfred, CHARLA, ESCENAS). */
export const ESPANOL_NEUTRO_EN = `SPANISH REGISTER — non-negotiable:
- Write NEUTRAL LATIN AMERICAN Spanish: the kind that reads the same in Santiago, Lima, Bogotá, Mexico City or Caracas. Use "tú". Never "vos", never "usted", never "vosotros".
- BANNED because they mark one country and leave every other learner outside: "parce", "parcero", "pana", "güey", "wey", "boludo", "che", "chévere", "bacano", "berraco", "hágale", "dale pues", "listo pues", "ahorita", "platicar", "carro" vs "coche" arguments, "vale" as a filler, and "fresco"/"bacano" as slang for fine.
- Say the plain thing instead: "tranquilo", "listo", "genial", "buenísimo", "de una" only if it reads neutral to you, otherwise plain words.
- The test: if a learner anywhere in Latin America would think "nobody says that here", it does not go in.`;

/** La misma regla, en español, para prompts escritos en español. */
export const ESPANOL_NEUTRO_ES = `REGISTRO: español latino neutro, con "tú" (nunca "vos", "usted" ni "vosotros"). Sin modismos de un solo país —nada de "parce", "pana", "güey", "boludo", "chévere", "bacano", "hágale", "dale pues", "ahorita"—. Si un hispanohablante de otro país pensaría "acá no se dice así", no va.`;
