// GPT Design Reviewer vía OpenAI Responses API, multimodal + Structured
// Outputs. El nombre del modelo llega del config (un solo lugar); la key,
// solo por env. Si el JSON no valida, se falla de forma controlada: jamás
// feedback corrupto hacia Claude.
import { readFileSync } from 'node:fs';
import { Ajv } from 'ajv';

export class ReviewError extends Error {
  constructor(message, kind = 'openai_error') {
    super(message);
    this.kind = kind;
  }
}

export function makeValidator(schema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  return (data) => {
    if (validate(data)) return { ok: true };
    return { ok: false, errors: (validate.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`).slice(0, 10) };
  };
}

function imagePart(file) {
  const b64 = readFileSync(file).toString('base64');
  return { type: 'input_image', detail: 'high', image_url: `data:image/png;base64,${b64}` };
}

export function buildInput({ packet, screenshots, references, systemPrompt, referenceMode }) {
  const content = [
    {
      type: 'input_text',
      text:
        'REVIEW_PACKET (todo el contexto textual que tienes — no existe más repo que esto):\n' +
        JSON.stringify(packet, null, 2),
    },
  ];
  for (const r of references) {
    content.push({ type: 'input_text', text: `REFERENCE IMAGE (referenceMode=${referenceMode}): ${r.name}` });
    content.push(imagePart(r.file));
  }
  for (const s of screenshots) {
    content.push({
      type: 'input_text',
      text: `IMPLEMENTATION SCREENSHOT: pantalla "${s.screen}" @ ${s.width}x${s.height} (${s.viewport}), round ${packet.round}`,
    });
    content.push(imagePart(s.file));
  }
  return [
    { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
    { role: 'user', content },
  ];
}

const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function requestReview({
  packet,
  screenshots,
  references,
  systemPrompt,
  schema,
  model,
  maxOutputTokens = 6000,
  apiKey = process.env.OPENAI_API_KEY,
  fetchImpl = fetch,
  log = () => {},
  backoffMs = [5000, 15000],
}) {
  if (!apiKey) throw new ReviewError('Falta OPENAI_API_KEY', 'missing_credentials');

  const body = {
    model,
    input: buildInput({ packet, screenshots, references, systemPrompt, referenceMode: packet.referenceMode }),
    max_output_tokens: maxOutputTokens,
    text: {
      format: { type: 'json_schema', name: 'design_review', strict: true, schema },
    },
  };

  let lastErr;
  for (let attempt = 0; attempt <= backoffMs.length; attempt++) {
    if (attempt > 0) await sleep(backoffMs[attempt - 1]);
    try {
      const res = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        lastErr = new ReviewError(`OpenAI → ${res.status}: ${text.slice(0, 300)}`);
        if (RETRY_STATUS.has(res.status)) {
          log(`OpenAI ${res.status}, reintento ${attempt + 1}/${backoffMs.length}`);
          continue;
        }
        throw lastErr;
      }
      const data = await res.json();
      return parseReview(data, schema);
    } catch (e) {
      if (e instanceof ReviewError && e.kind !== 'openai_error') throw e;
      lastErr = e;
      log(`OpenAI error de red/parseo: ${e.message} — reintento ${attempt + 1}/${backoffMs.length}`);
    }
  }
  throw new ReviewError(`OpenAI no respondió tras reintentos: ${lastErr?.message}`, 'openai_error');
}

export function parseReview(responseJson, schema) {
  const text =
    responseJson.output_text ??
    responseJson.output
      ?.filter((o) => o.type === 'message')
      .flatMap((o) => o.content ?? [])
      .filter((c) => c.type === 'output_text')
      .map((c) => c.text)
      .join('') ??
    '';
  if (!text) throw new ReviewError('OpenAI devolvió respuesta sin texto de salida', 'invalid_response');

  let review;
  try {
    review = JSON.parse(text);
  } catch {
    throw new ReviewError('la salida del reviewer no es JSON válido', 'invalid_response');
  }
  const check = makeValidator(schema)(review);
  if (!check.ok) {
    throw new ReviewError(`el review no cumple el schema: ${check.errors.join('; ')}`, 'invalid_response');
  }
  return review;
}
