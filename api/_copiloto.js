// Copiloto del profe — helpers PUROS (sin red, sin env): el prompt que arma la
// petición y el extractor de JSON de la respuesta del modelo. Viven aparte del
// handler para que tests/copiloto.test.mjs los ejercite sin tocar la red.

/* El contrato de salida del resumen. El modelo lo recibe en el prompt y
   extraerJson lo valida a la vuelta: si falta una llave, mejor null (y el
   cliente muestra "no pude resumir") que una sesión a medias guardada. */
export const LLAVES_RESUMEN = ['titulo', 'resumen', 'vocab', 'ideas', 'foco'];

export function construirPromptResumen({ nombre, detalle, transcript, historial }) {
  const contexto = historial && historial.length
    ? `\n\nContexto de clases anteriores con ${nombre} (resúmenes previos, del más reciente al más viejo):\n${historial
        .slice(0, 4)
        .map((h, i) => `${i + 1}. ${h}`)
        .join('\n')}`
    : '';

  return [
    {
      role: 'system',
      content:
        'Eres el copiloto de un profesor particular de idiomas. Recibes la transcripción de una clase ' +
        '(puede mezclar español e inglés en la misma frase) y devuelves SOLO un objeto JSON, sin texto ' +
        'alrededor ni markdown, con exactamente estas llaves:\n' +
        '{"titulo": string (6-10 palabras, qué se trabajó),\n' +
        ' "resumen": string[] (3-5 puntos concretos de qué pasó en la clase: qué practicaron, qué salió bien, dónde dudó el estudiante — con ejemplos literales de la transcripción cuando ayuden),\n' +
        ' "vocab": string[] (hasta 8 palabras o expresiones NUEVAS que aparecieron y valen repaso),\n' +
        ' "ideas": string[] (exactamente 3 ideas accionables para la PRÓXIMA clase, construidas sobre lo que se vio — ejercicios concretos, no consejos genéricos),\n' +
        ' "foco": string[] (2-4 temas donde el estudiante mostró dificultad y conviene insistir)}\n' +
        'Reglas: escribe en español latino neutro (con "tú"). NO evalúes ni corrijas al profesor: tu trabajo ' +
        'es darle memoria e ideas, no calificarlo. Si la transcripción es muy corta o no parece una clase, ' +
        'devuelve {"titulo":"Sesión corta","resumen":[...lo que haya],"vocab":[],"ideas":[...],"foco":[]}.',
    },
    {
      role: 'user',
      content: `Estudiante: ${nombre}${detalle ? ` (${detalle})` : ''}.${contexto}\n\nTranscripción de la clase de hoy:\n${transcript}`,
    },
  ];
}

export function construirPromptIdea({ nombre, detalle, pregunta, historial }) {
  const contexto = historial && historial.length
    ? `Resúmenes de sus clases (del más reciente al más viejo):\n${historial.slice(0, 5).map((h, i) => `${i + 1}. ${h}`).join('\n')}`
    : 'Todavía no hay clases resumidas de este estudiante.';

  return [
    {
      role: 'system',
      content:
        'Eres el copiloto de un profesor particular de idiomas. Respondes preguntas sobre UN estudiante ' +
        'usando el historial de sus clases. Das ideas concretas y accionables, en español latino neutro ' +
        '(con "tú"), en 2-5 frases. Jamás corriges ni evalúas al profesor. Si el historial no alcanza para ' +
        'responder, dilo honestamente y sugiere qué registrar en la próxima clase.',
    },
    {
      role: 'user',
      content: `Estudiante: ${nombre}${detalle ? ` (${detalle})` : ''}.\n${contexto}\n\nPregunta del profesor: ${pregunta}`,
    },
  ];
}

/* Saca el JSON de la respuesta de un modelo que a veces lo envuelve en prosa o
   en un fence ```json. Estrategia: primer "{" hasta el último "}" y parse; si
   falla, null — nunca adivinar. Valida el shape del resumen: llaves presentes,
   arrays de strings (coerciona strings sueltos a [string]). */
export function extraerJson(texto) {
  if (typeof texto !== 'string') return null;
  const desde = texto.indexOf('{');
  const hasta = texto.lastIndexOf('}');
  if (desde === -1 || hasta <= desde) return null;
  let obj;
  try {
    obj = JSON.parse(texto.slice(desde, hasta + 1));
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object') return null;
  return obj;
}

export function validarResumen(obj) {
  if (!obj) return null;
  const salida = {};
  for (const k of LLAVES_RESUMEN) {
    if (!(k in obj)) return null;
    if (k === 'titulo') {
      if (typeof obj.titulo !== 'string' || !obj.titulo.trim()) return null;
      salida.titulo = obj.titulo.trim().slice(0, 120);
    } else {
      const v = obj[k];
      const arr = Array.isArray(v) ? v : typeof v === 'string' && v.trim() ? [v] : null;
      if (!arr) return null;
      salida[k] = arr.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim().slice(0, 400)).slice(0, 8);
    }
  }
  return salida;
}
