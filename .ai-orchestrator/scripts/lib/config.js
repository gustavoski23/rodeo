// Carga y valida .ai-orchestrator/config.yml — única fuente de verdad de
// viewports, pantallas, límites de coste y parámetros del reviewer.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ORCH_ROOT = resolve(HERE, '..', '..');
export const REPO_ROOT = resolve(ORCH_ROOT, '..');

export const DEFAULTS = {
  version: 1,
  maxRounds: 3,
  maxScreenshotsPerReview: 8,
  maxReferenceImages: 4,
  maxPacketChars: 24000,
  maxConsoleErrors: 12,
  maxUiFilesListed: 40,
  review: {
    // El modelo NUNCA se hardcodea en otro archivo: aquí o en el env.
    model: 'gpt-5.2',
    promptVersion: null, // se lee del frontmatter del prompt
    label: 'ai-design-review',
    checkName: 'AI Design Review',
    maxOutputTokens: 6000,
  },
  preview: {
    provider: 'github-deployments',
    environmentHint: 'Preview',
    timeoutSeconds: 600,
    pollSeconds: 15,
  },
  capture: {
    settleMs: 1500,
    fullPage: true,
    maxFullPageHeightPx: 2400,
    deviceScaleFactor: 2,
    navTimeoutMs: 45000,
    localStorage: [],
  },
  viewports: {},
  screens: [],
};

function deepMerge(base, over) {
  if (over === undefined || over === null) return base;
  if (Array.isArray(base) || Array.isArray(over) || typeof base !== 'object' || typeof over !== 'object') {
    return over;
  }
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = deepMerge(base[k], over[k]);
  return out;
}

export class ConfigError extends Error {}

export function parseConfig(text) {
  const raw = yaml.load(text) ?? {};
  const cfg = deepMerge(DEFAULTS, raw);

  if (cfg.version !== 1) throw new ConfigError(`config.yml: version no soportada: ${cfg.version}`);
  if (!Number.isInteger(cfg.maxRounds) || cfg.maxRounds < 1 || cfg.maxRounds > 10) {
    throw new ConfigError(`config.yml: maxRounds debe ser entero 1..10 (hay ${cfg.maxRounds})`);
  }
  if (!cfg.screens.length) throw new ConfigError('config.yml: screens vacío — no hay nada que capturar');

  for (const [name, vp] of Object.entries(cfg.viewports)) {
    if (!Number.isInteger(vp?.width) || !Number.isInteger(vp?.height)) {
      throw new ConfigError(`config.yml: viewport "${name}" necesita width/height enteros`);
    }
  }
  const ids = new Set();
  for (const s of cfg.screens) {
    if (!s.id || !/^[a-z0-9-]+$/.test(s.id)) {
      throw new ConfigError(`config.yml: screen id inválido "${s.id}" (usa kebab-case)`);
    }
    if (ids.has(s.id)) throw new ConfigError(`config.yml: screen id duplicado "${s.id}"`);
    ids.add(s.id);
    if (typeof s.path !== 'string' || !s.path.startsWith('/')) {
      throw new ConfigError(`config.yml: screen "${s.id}" necesita path que empiece con /`);
    }
    if (!Array.isArray(s.viewports) || !s.viewports.length) {
      throw new ConfigError(`config.yml: screen "${s.id}" necesita al menos un viewport`);
    }
    for (const v of s.viewports) {
      if (!cfg.viewports[v]) throw new ConfigError(`config.yml: screen "${s.id}" usa viewport desconocido "${v}"`);
    }
    for (const a of s.actions ?? []) {
      const keys = Object.keys(a);
      if (keys.length !== 1 || !['click', 'clickIfVisible', 'waitMs', 'waitFor'].includes(keys[0])) {
        throw new ConfigError(`config.yml: screen "${s.id}" tiene action inválida ${JSON.stringify(a)} — usa {click}|{clickIfVisible}|{waitMs}|{waitFor}`);
      }
    }
  }

  // Overrides de entorno — el nombre del modelo vive en UN solo lugar.
  if (process.env.OPENAI_REVIEW_MODEL) cfg.review.model = process.env.OPENAI_REVIEW_MODEL;
  if (process.env.MAX_AUTOMATED_REVIEW_ROUNDS) {
    const n = Number(process.env.MAX_AUTOMATED_REVIEW_ROUNDS);
    if (Number.isInteger(n) && n >= 1 && n <= 10) cfg.maxRounds = n;
  }
  return cfg;
}

export function loadConfig(path = resolve(ORCH_ROOT, 'config.yml')) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new ConfigError(`No existe ${path} — el orquestador necesita su config.yml`);
  }
  return parseConfig(text);
}
