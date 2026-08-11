// Captura Playwright de cada screen×viewport del config, con recolección de
// console.error / pageerror / requests fallidas. Nombres determinísticos:
//   {screen}__{w}x{h}__round-{NN}.png
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const NOISE_URL = /favicon|manifest\.webmanifest|sw\.js/;

export async function captureScreens({ config, baseUrl, round, outDir, env = process.env, log = () => {} }) {
  const { chromium } = await import('playwright');
  mkdirSync(outDir, { recursive: true });

  const cap = config.capture;
  // Seeds de localStorage: estado inicial del navegador (PIN de auth desde un
  // env var/secret, flags de onboarding como valor estático). json:true
  // serializa con JSON.stringify — obligatorio para stores que hacen
  // JSON.parse al leer (como el de RODEO).
  const seeds = (cap.localStorage ?? [])
    .map(({ key, envVar, value, json }) => {
      const raw = envVar ? env[envVar] : value;
      if (!key || raw === undefined) return null;
      return { key, value: json ? JSON.stringify(raw) : String(raw) };
    })
    .filter(Boolean);

  const shots = [];
  const issues = { consoleErrors: [], pageErrors: [], failedRequests: [], blankScreens: [] };
  const roundTag = `round-${String(round).padStart(2, '0')}`;
  const browser = await chromium.launch();

  try {
    for (const screen of config.screens) {
      for (const vpName of screen.viewports) {
        const vp = config.viewports[vpName];
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: cap.deviceScaleFactor,
          isMobile: vp.width < 768,
          hasTouch: vp.width < 768,
        });
        // El PIN (u otra auth por localStorage) se siembra ANTES de cargar la
        // página; el valor viene de un env var (secret), nunca del repo.
        if (seeds.length) {
          await context.addInitScript((items) => {
            for (const { key, value } of items) localStorage.setItem(key, value);
          }, seeds);
        }
        const page = await context.newPage();
        const tag = `${screen.id}@${vpName}`;
        page.on('console', (msg) => {
          if (msg.type() === 'error') issues.consoleErrors.push(`[${tag}] ${msg.text().slice(0, 300)}`);
        });
        page.on('pageerror', (err) => issues.pageErrors.push(`[${tag}] ${String(err).slice(0, 300)}`));
        page.on('requestfailed', (req) => {
          if (!NOISE_URL.test(req.url())) {
            issues.failedRequests.push(`[${tag}] ${req.method()} ${req.url().slice(0, 200)} → ${req.failure()?.errorText}`);
          }
        });

        try {
          const res = await page.goto(new URL(screen.path, baseUrl).href, {
            waitUntil: 'load',
            timeout: cap.navTimeoutMs,
          });
          const status = res?.status() ?? 0;
          if (status >= 400) {
            await context.close();
            return { shots, issues, blocked: { reason: `"${screen.id}" devolvió HTTP ${status}` } };
          }
          await page.waitForTimeout(cap.settleMs);
          for (const action of screen.actions ?? []) {
            if (action.click) await page.click(action.click, { timeout: 10000 });
            else if (action.clickIfVisible) {
              // Para puertas que pueden o no estar (el gate de login en frío):
              // si el elemento no aparece, se sigue sin drama.
              await page.click(action.clickIfVisible, { timeout: 6000 }).catch(() => {});
            } else if (action.waitMs) await page.waitForTimeout(action.waitMs);
            else if (action.waitFor) await page.waitForSelector(action.waitFor, { timeout: 15000 });
          }
          await page.waitForTimeout(cap.settleMs);

          // Página en blanco = casi siempre un sistema de animación que dejó
          // todo en opacity:0. Se anota; si TODAS quedan en blanco, se bloquea.
          const textLen = await page.evaluate(() => document.body?.innerText?.trim().length ?? 0);
          if (textLen < 20) issues.blankScreens.push(tag);

          const fullPage = screen.fullPage ?? cap.fullPage;
          const scrollH = await page.evaluate(() => document.documentElement.scrollHeight);
          const file = join(outDir, `${screen.id}__${vp.width}x${vp.height}__${roundTag}.png`);
          if (fullPage && scrollH > cap.maxFullPageHeightPx) {
            await page.screenshot({ path: file, clip: { x: 0, y: 0, width: vp.width, height: cap.maxFullPageHeightPx } });
          } else {
            await page.screenshot({ path: file, fullPage });
          }
          shots.push({ screen: screen.id, viewport: vpName, width: vp.width, height: vp.height, file });
          log(`captura ok: ${tag}`);
        } catch (e) {
          await context.close();
          return { shots, issues, blocked: { reason: `captura de "${tag}" falló: ${String(e.message).slice(0, 300)}` } };
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (shots.length && issues.blankScreens.length === shots.length) {
    return { shots, issues, blocked: { reason: 'todas las pantallas quedaron en blanco (¿JS crash o animaciones que nunca revelan contenido?)' } };
  }
  return { shots, issues, blocked: null };
}
