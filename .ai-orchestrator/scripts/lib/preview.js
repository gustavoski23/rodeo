// Resuelve la preview URL EXACTA del HEAD SHA vía GitHub Deployments (los crea
// la integración Git de Vercel en cada push). Regla crítica: jamás revisar un
// deployment de un SHA viejo — el SHA se pasa explícito y el resultado se
// verifica contra él.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function resolvePreview({
  gh,
  sha,
  timeoutSeconds = 600,
  pollSeconds = 15,
  environmentHint = 'Preview',
  log = () => {},
  isStale = async () => false,
  fetchImpl = fetch,
  sleepImpl = sleep,
}) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let sawDeployment = false;

  while (Date.now() < deadline) {
    if (await isStale()) return { status: 'stale' };

    const deployments = (await gh.listDeployments(sha)).filter(
      (d) => !environmentHint || (d.environment ?? '').toLowerCase().includes(environmentHint.toLowerCase()),
    );
    sawDeployment ||= deployments.length > 0;

    for (const dep of deployments) {
      const statuses = await gh.listDeploymentStatuses(dep.id);
      const success = statuses.find((s) => s.state === 'success' && (s.environment_url || s.target_url));
      if (success) {
        const url = success.environment_url || success.target_url;
        const health = await checkUrl(url, fetchImpl);
        if (health.ok) {
          log(`preview READY para ${sha.slice(0, 7)}: ${url}`);
          return { status: 'ready', url };
        }
        return { status: 'http_error', url, reason: health.reason };
      }
      if (statuses.some((s) => s.state === 'failure' || s.state === 'error')) {
        return { status: 'failed', reason: `deployment ${dep.id} en failure/error` };
      }
    }

    log(`preview de ${sha.slice(0, 7)} aún no lista — reintento en ${pollSeconds}s`);
    await sleepImpl(pollSeconds * 1000);
  }

  return {
    status: 'timeout',
    reason: sawDeployment
      ? `deployment existe pero no llegó a success en ${timeoutSeconds}s`
      : `ningún deployment de Vercel apareció para ${sha} en ${timeoutSeconds}s`,
  };
}

// La URL debe responder 200 y quedarse en su propio host: si redirige a un
// login de Vercel (deployment protection) NO hay nada que revisar.
async function checkUrl(url, fetchImpl) {
  try {
    const res = await fetchImpl(url, { redirect: 'follow', headers: { 'user-agent': 'rodeo-ai-orchestrator' } });
    if (res.status >= 400) return { ok: false, reason: `preview devolvió HTTP ${res.status}` };
    const finalHost = new URL(res.url || url).host;
    const expectedHost = new URL(url).host;
    if (finalHost !== expectedHost) {
      return { ok: false, reason: `preview redirigió fuera de su host (${finalHost}) — ¿deployment protection activa?` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: `preview inaccesible: ${e.message}` };
  }
}
