/* Filtro anti-ruido de las correcciones (pareceCorreccionValida).

   PORT LITERAL del legacy — index.html, la función que entró con el hotfix de
   STT. Reproduce su comportamiento tal cual, incluidas las durezas: se ve raro
   pero cada una está puesta a propósito y el archivo no es lugar para mejorarlas.

   El problema que resuelve: el usuario habla, Deepgram transcribe torcido, y el
   modelo "corrige" una frase que el usuario NUNCA dijo. Al principiante le
   aparece en pantalla un "vos dijiste X" con una X inventada, y ahí se le cae
   la confianza en la app entera — es peor que no corregir nada. El caso real
   que lo motivó fue una transcripción rota ("Alive people Tell beca Summer")
   corregida como si Gus la hubiera escrito.

   La regla: una corrección solo vale si ~60 % de las palabras del `quote`
   aparecen en lo que se dictó. Sin exigir orden — el modelo reordena al citar
   y eso no lo hace falso — pero SÍ exigiendo la palabra exacta.

   Tres decisiones del original que acá se respetan y conviene explicar, porque
   la tentación de "arreglarlas" es fuerte y las tres serían un error:

   1. No se expanden contracciones y el apóstrofo va DENTRO del token: "don't"
      es una palabra y no matchea "do not". Si el alumno dijo "do not" y el
      modelo cita "don't", el modelo está parafraseando, no citando — y una
      cita parafraseada es justo lo que hay que descartar.
   2. Igualdad exacta, sin tolerancia de una letra. "she talks" contra un
      "she talk" dictado NO pasa: la corrección estaría señalando una -s que el
      alumno nunca pronunció, que es el error más doloroso de todos.
   3. Las palabras de lo dicho van a un Set y no se consumen. Un quote de
      "the the the" pasa contra un solo "the". Suena a bug, pero este filtro
      solo tiene un trabajo — atajar la cita totalmente ajena — y apretarlo de
      más empieza a tirar correcciones buenas, que es el daño que no se ve.

   Es un filtro de una sola dirección: descarta correcciones sospechosas, nunca
   inventa ninguna. Si duda, calla. */

/** Proporción mínima de palabras del quote que deben estar en lo dicho. */
const UMBRAL = 0.6;

/* Minúsculas, sin tildes (NFD + fuera los diacríticos combinantes: el modelo
   multi de Deepgram se va al español y devuelve "está"), y de ahí solo tokens
   de a-z0-9 y apóstrofo recto. Todo lo demás — puntuación, emoji, y de paso
   cualquier letra no latina — desaparece como separador. */
function normalizar(s: string | null | undefined): string[] {
  return (
    String(s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .match(/[a-z0-9']+/g) ?? []
  );
}

/**
 * ¿La corrección cita algo que el usuario realmente dijo?
 * @param quote  las palabras que el modelo dice que el usuario dijo mal.
 * @param dicho  el turno del usuario, tal cual entró (voz o teclado).
 */
export function pareceCorreccionValida(
  quote: string | null | undefined,
  dicho: string | null | undefined,
): boolean {
  const palabrasQuote = normalizar(quote);
  if (!palabrasQuote.length) return false;

  const palabrasDichas = new Set(normalizar(dicho));
  const coincide = palabrasQuote.filter((w) => palabrasDichas.has(w)).length;

  return coincide / palabrasQuote.length >= UMBRAL;
}
