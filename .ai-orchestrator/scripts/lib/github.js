// Cliente mínimo de la API REST de GitHub sobre fetch. Sin Octokit: el
// orquestador usa media docena de endpoints y así queda 100% testeable
// inyectando fetchImpl.

export class GitHubError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function ghClient({
  token = process.env.GITHUB_TOKEN,
  repo = process.env.GITHUB_REPOSITORY,
  apiBase = process.env.GITHUB_API_URL || 'https://api.github.com',
  fetchImpl = fetch,
} = {}) {
  if (!token) throw new GitHubError('Falta GITHUB_TOKEN', 0);
  if (!repo || !repo.includes('/')) throw new GitHubError(`GITHUB_REPOSITORY inválido: "${repo}"`, 0);

  async function req(path, { method = 'GET', body } = {}) {
    const res = await fetchImpl(`${apiBase}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new GitHubError(`GitHub ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`, res.status);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async function paginate(path, { pages = 10, per = 100 } = {}) {
    const sep = path.includes('?') ? '&' : '?';
    const all = [];
    for (let p = 1; p <= pages; p++) {
      const batch = await req(`${path}${sep}per_page=${per}&page=${p}`);
      all.push(...batch);
      if (batch.length < per) break;
    }
    return all;
  }

  return {
    repo,
    getPR: (n) => req(`/repos/${repo}/pulls/${n}`),
    listIssueComments: (n) => paginate(`/repos/${repo}/issues/${n}/comments`),
    createIssueComment: (n, body) => req(`/repos/${repo}/issues/${n}/comments`, { method: 'POST', body: { body } }),
    listPRFiles: (n) => paginate(`/repos/${repo}/pulls/${n}/files`, { pages: 3 }),
    listDeployments: (sha) => req(`/repos/${repo}/deployments?sha=${sha}&per_page=20`),
    listDeploymentStatuses: (id) => req(`/repos/${repo}/deployments/${id}/statuses?per_page=10`),
    createCheckRun: (payload) => req(`/repos/${repo}/check-runs`, { method: 'POST', body: payload }),
    updateCheckRun: (id, payload) => req(`/repos/${repo}/check-runs/${id}`, { method: 'PATCH', body: payload }),
  };
}
