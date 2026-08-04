/* Núcleo de glosado — port literal de public/legacy.html:3266-3382
   (glossSpans, spansToHTML, chunkRe, parseChunks, renderReply, stripChunksLive).

   Vive en lib/ y no dentro del componente porque tiene DOS consumidores que no
   son React: speak() limpia el texto con parseChunks antes de mandarlo a
   Deepgram, y la fase 1 del stream pinta con stripChunksLive. El componente
   <GlossText> consume replySpans() y arma nodos React — por eso spansToHTML
   (que devolvía HTML crudo) se sustituye por datos: en la app nueva no hay
   dangerouslySetInnerHTML, así que el escapado deja de ser un problema y pasa
   a resolverlo React. La MATEMÁTICA de posiciones es idéntica al viejo. */

export type Gloss = { term: string; es: string };
export type GlossSpan = { start: number; end: number; es: string };

// Nueva regex por llamada para no arrastrar lastIndex entre exec() y replace().
export function chunkRe(): RegExp {
  return /⟦([\s\S]*?)\|\|([\s\S]*?)⟧/g;
}

// Devuelve el texto LIMPIO (sólo el inglés visible) y las glosas embebidas en
// coords del limpio. Así jamás queda un ⟦⟧ a la vista al terminar el stream.
export function parseChunks(reply: unknown): { clean: string; marks: GlossSpan[] } {
  const src = String(reply ?? '');
  const re = chunkRe();
  let clean = '',
    last = 0;
  let m: RegExpExecArray | null;
  const marks: GlossSpan[] = [];
  while ((m = re.exec(src)) !== null) {
    clean += src.slice(last, m.index);
    const en = m[1].trim(),
      es = m[2].trim();
    const start = clean.length;
    clean += en;
    if (en && es) marks.push({ start, end: clean.length, es });
    last = re.lastIndex;
  }
  clean += src.slice(last);
  // Saneo final: barre cualquier ⟦ o ⟧ residual (marcador sin ||, corchete
  // colgante, ⟧ suelto, anidados) que sobrevivió a la regex — Y los símbolos
  // de Markdown que el modelo cuela a veces aunque se le pida texto plano
  // (pedido de Gus, 2026-08-04: Helena decía "star" por cada * de un
  // **negrita**, porque Deepgram lee el asterisco en voz alta; en pantalla se
  // veían los ** crudos). Se filtran a nivel de carácter (* y `) reajustando
  // las coords de `marks`, así que ni la vista ni la voz ni las glosas los
  // vuelven a ver. El _ NO se toca: partiría snake_case y nombres de usuario.
  if (/[⟦⟧*`]/.test(clean)) {
    let cleaned = '';
    const map = new Array<number>(clean.length + 1); // viejo índice → nuevo índice
    for (let i = 0; i < clean.length; i++) {
      map[i] = cleaned.length;
      const ch = clean[i];
      if (ch !== '⟦' && ch !== '⟧' && ch !== '*' && ch !== '`') cleaned += ch;
    }
    map[clean.length] = cleaned.length;
    for (const mk of marks) {
      mk.start = map[mk.start];
      mk.end = map[mk.end];
    }
    clean = cleaned;
  }
  return { clean, marks };
}

// Mientras streamea, el JSON llega a medias con los marcadores crudos. Esto
// muestra ya el inglés (sin ⟦ ⟧) aunque la explicación aún no haya llegado, para
// que el usuario nunca vea un corchete raro mientras teclea el modelo.
export function stripChunksLive(s: unknown): string {
  let out = String(s ?? '').replace(chunkRe(), '$1'); // marcadores completos → inglés
  const open = out.lastIndexOf('⟦');
  if (open !== -1) {
    const rest = out.slice(open + 1);
    const sep = rest.indexOf('||');
    out = out.slice(0, open) + (sep !== -1 ? rest.slice(0, sep) : rest);
  }
  // Corchetes residuales (⟧ suelto, sin ||, anidados) + los símbolos Markdown
  // que también barre parseChunks: el stream no debe enseñar unos ** que el
  // swap final va a borrar.
  return out.replace(/[⟦⟧*`]/g, '');
}

// Coloca en `spans` (respetando `ocupado`) las apariciones de cada glosa del
// array {term,es} por indexOf sobre el texto plano. Una sola aparición por
// glosa: la primera que esté libre.
export function glossSpans(
  text: string,
  glosses: Gloss[] | undefined | null,
  ocupado: boolean[],
  spans: GlossSpan[],
): void {
  if (!glosses || !glosses.length) return;
  const lower = text.toLowerCase();
  glosses.forEach((g) => {
    if (!g || !g.term || !g.es) return;
    const term = String(g.term).trim();
    if (!term) return;
    let from = 0,
      idx: number;
    while ((idx = lower.indexOf(term.toLowerCase(), from)) !== -1) {
      let libre = true;
      for (let i = idx; i < idx + term.length; i++)
        if (ocupado[i]) {
          libre = false;
          break;
        }
      if (libre) {
        for (let i = idx; i < idx + term.length; i++) ocupado[i] = true;
        spans.push({ start: idx, end: idx + term.length, es: String(g.es) });
        break;
      }
      from = idx + 1; // esa aparición ya estaba glosada; probar la siguiente
    }
  });
}

/* Equivalente de renderReply (L3355) pero devolviendo datos en vez de HTML:
   funde las glosas embebidas ⟦||⟧ (PRIORIDAD) con las del array `glosses`
   sobre el texto ya limpio. Los spans salen ordenados por posición, listos
   para trocear el texto en nodos. */
export function replySpans(
  reply: unknown,
  glosses?: Gloss[] | null,
): { clean: string; spans: GlossSpan[] } {
  const { clean, marks } = parseChunks(reply);
  const ocupado = new Array<boolean>(clean.length).fill(false);
  const spans: GlossSpan[] = [];
  for (const mk of marks) {
    let libre = true;
    for (let i = mk.start; i < mk.end; i++)
      if (ocupado[i]) {
        libre = false;
        break;
      }
    if (!libre) continue;
    for (let i = mk.start; i < mk.end; i++) ocupado[i] = true;
    spans.push({ start: mk.start, end: mk.end, es: mk.es });
  }
  glossSpans(clean, glosses || [], ocupado, spans);
  spans.sort((a, b) => a.start - b.start);
  return { clean, spans };
}
