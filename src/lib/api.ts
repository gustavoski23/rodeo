/* Port literal de la capa de API de la app original
   (public/legacy.html:3473-3634): callAPI, callStream, extractPartialReply,
   callJSON y parseJSON. La LÓGICA no se toca (contrato de exactitud del plan):
   mismo gate del PIN por prompt(), mismo reintento único con finish==='length',
   mismo parseo defensivo. Lo único adaptado es el efecto del costo, que antes
   mutaba `state.cost` global: ahora acumula en rodeo_cost (misma clave) y
   avisa a los suscriptores. */

import { store } from './storage';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type ChatMode = 'chat' | 'creative';

const costSubs = new Set<(total: number) => void>();
export function onCostChange(fn: (total: number) => void): () => void {
  costSubs.add(fn);
  return () => costSubs.delete(fn);
}
function addCost(delta: number) {
  const total = (store.get<number>('rodeo_cost', 0) || 0) + delta;
  store.set('rodeo_cost', total);
  costSubs.forEach((fn) => fn(total));
}

/* La clave puede venir en la URL (?clave=…): es el camino del ENLACE DE DEMO
   que se le manda a un revisor o a un amigo — sin esto, su primera llamada de
   IA topa un prompt() nativo pidiendo un PIN que no tiene. Se lee UNA vez al
   cargar el módulo (la misma filosofía de vistaInicial() con el hash: sin
   listener, sin reescribir la URL) y se persiste en rodeo_pass, exactamente
   la clave que el prompt del 401 escribiría a mano. Si la clave viene mal, el
   flujo del 401 sigue intacto y el prompt aparece como siempre. */
if (typeof location !== 'undefined') {
  const clave = new URLSearchParams(location.search).get('clave');
  if (clave) store.set('rodeo_pass', clave);
}

function headersBase(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const pass = store.get<string | null>('rodeo_pass', null);
  if (pass) headers['x-rodeo-pass'] = pass;
  const quien = etiquetaUsuario();
  if (quien) headers['x-rodeo-user'] = quien;
  return headers;
}

/* Etiqueta del tester para el panel /uso: con varias personas probando, el
   gasto agregado no dice nada — hay que poder separarlo por persona. Se manda
   el nombre que ya guarda la app (rodeo_nombre). No es identidad ni auth: solo
   una etiqueta para agrupar, y el servidor la recorta a 60 caracteres. */
export function etiquetaUsuario(): string | null {
  const nombre = store.get<string | null>('rodeo_nombre', null);
  return typeof nombre === 'string' && nombre.trim() ? nombre.trim().slice(0, 60) : null;
}

function checkProtocol() {
  // La API es una ruta relativa (/api/chat) y necesita un servidor. Si la app
  // se abrió como archivo (file://), fetch no puede resolver la URL.
  if (location.protocol === 'file:') {
    throw new Error('Abriste el archivo directo. Abre la app desde el servidor: producción o http://localhost:5173');
  }
}

export async function callAPI(
  mode: ChatMode,
  messages: ChatMessage[],
  maxTokens = 3200,
  opts: { silent?: boolean } = {},
): Promise<{ content: string; finish: string | null }> {
  checkProtocol();

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: headersBase(),
    body: JSON.stringify({ mode, messages, max_tokens: maxTokens }),
  });

  if (res.status === 401) {
    // Modo silencioso (prefetch en background): NUNCA abrir el prompt del PIN —
    // sería un modal bloqueante que el usuario no pidió.
    if (opts.silent) throw new Error('pin_required');
    const pin = prompt('PIN de acceso a Hablarte:');
    if (pin) {
      store.set('rodeo_pass', pin);
      return callAPI(mode, messages, maxTokens, opts);
    }
    throw new Error('Sin PIN no hay rodeo.');
  }
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) throw errorAPI(data);

  if (data.cost) addCost(parseFloat(String(data.cost)) || 0);
  return { content: data.content as string, finish: (data.finish_reason as string) ?? null };
}

/* Error con código legible por máquina: el mensaje humano va al toast, y
   `code` (p.ej. 'sin_saldo_ia') deja que quien llama distinga un fallo
   PERSISTENTE (sin crédito: reintentar por otra vía solo duplica el gasto y
   la espera) de uno transitorio. */
export type ErrorAPI = Error & { code?: string };
function errorAPI(data: Record<string, unknown>): ErrorAPI {
  const err = new Error((data.detail as string) || (data.error as string) || 'Error de conexión') as ErrorAPI;
  if (typeof data.error === 'string') err.code = data.error;
  return err;
}

// Igual que callAPI pero consumiendo SSE. `onDelta` recibe el contenido
// ACUMULADO en cada chunk, no el fragmento suelto.
export async function callStream(
  mode: ChatMode,
  messages: ChatMessage[],
  maxTokens: number,
  onDelta: (content: string) => void,
): Promise<{ content: string; finish: string | null }> {
  checkProtocol();

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: headersBase(),
    body: JSON.stringify({ mode, messages, max_tokens: maxTokens, stream: true }),
  });

  if (res.status === 401) {
    const pin = prompt('PIN de acceso a Hablarte:');
    if (pin) {
      store.set('rodeo_pass', pin);
      return callStream(mode, messages, maxTokens, onDelta);
    }
    throw new Error('Sin PIN no hay rodeo.');
  }
  if (!res.ok) {
    const d = await res.json().catch(() => ({}) as Record<string, unknown>);
    throw errorAPI(d);
  }
  if (!res.body) throw new Error('sin_stream');

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '',
    content = '',
    finish: string | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const p = line.slice(5).trim();
      if (!p || p === '[DONE]') continue;
      let j: Record<string, unknown>;
      try {
        j = JSON.parse(p);
      } catch {
        continue;
      }
      if (j.delta) {
        content += j.delta as string;
        onDelta(content);
      }
      if (j.done) {
        finish = (j.finish_reason as string) ?? null;
        if (j.error) throw errorAPI(j);
        if (j.cost) addCost(parseFloat(String(j.cost)) || 0);
      }
    }
  }
  return { content, finish };
}

// El modelo emite {"reply":"…","corrections":[…]}. Mientras streamea, ese JSON
// está incompleto y JSON.parse falla, así que extraemos a mano el string de
// "reply" tal como va llegando — respetando escapes a medias entre chunks.
export function extractPartialReply(raw: string): string {
  const k = raw.indexOf('"reply"');
  if (k === -1) return '';
  const colon = raw.indexOf(':', k + 7);
  if (colon === -1) return '';
  const q = raw.indexOf('"', colon + 1);
  if (q === -1) return '';

  let out = '';
  for (let i = q + 1; i < raw.length; i++) {
    const c = raw[i];
    if (c === '\\') {
      const n = raw[i + 1];
      if (n === undefined) break; // escape partido: llega en el próximo chunk
      if (n === 'n') out += '\n';
      else if (n === 't') out += '\t';
      else if (n === 'r') {
        /* se ignora */
      } else if (n === 'u') {
        const hex = raw.slice(i + 2, i + 6);
        if (hex.length < 4) break; // \uXXXX partido
        out += String.fromCharCode(parseInt(hex, 16));
        i += 5;
        continue;
      } else out += n; // \" \\ \/ …
      i++;
      continue;
    }
    if (c === '"') break; // cierre del string: reply completo
    out += c;
  }
  return out;
}

// Kimi razona antes de responder: si se queda sin tokens a mitad de pensamiento,
// el JSON llega roto. Reintenta UNA vez SOLO si finish === 'length' (más tokens
// no curan un JSON sucio con finish 'stop').
export async function callJSON(
  mode: ChatMode,
  messages: ChatMessage[],
  maxTokens = 3200,
): Promise<{ parsed: unknown; content: string; finish: string | null }> {
  let { content, finish } = await callAPI(mode, messages, maxTokens);
  let parsed = parseJSON(content);
  if (!parsed && finish === 'length' && maxTokens < 8000) {
    ({ content, finish } = await callAPI(mode, messages, 8000));
    parsed = parseJSON(content);
  }
  return { parsed, content, finish };
}

// Los modelos a veces envuelven el JSON en ```fences``` — parseo defensivo
export function parseJSON(raw: string): unknown {
  if (!raw) return null;
  const s = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  const objStart = s.indexOf('{'),
    arrStart = s.indexOf('[');
  let start = -1,
    end = -1;
  if (arrStart !== -1 && (arrStart < objStart || objStart === -1)) {
    start = arrStart;
    end = s.lastIndexOf(']');
  } else if (objStart !== -1) {
    start = objStart;
    end = s.lastIndexOf('}');
  }
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}
