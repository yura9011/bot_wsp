const DEFAULT_TIMEOUT_MS = parseInt(process.env.DASHBOARD_MAESTRO_HEALTH_TIMEOUT_MS, 10) || 2500;
const lastSuccessfulChecks = new Map();
const lastErrors = new Map();

async function checkHttp(url, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const acceptHttpResponse = Boolean(options.acceptHttpResponse);
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });

    const checkedAt = new Date().toISOString();
    const isHealthy = response.ok || acceptHttpResponse;
    const error = isHealthy ? null : `HTTP ${response.status}`;

    let body = null;
    if (isHealthy) {
      body = await readJsonBody(response);
      lastSuccessfulChecks.set(url, checkedAt);
      lastErrors.delete(url);
    } else {
      lastErrors.set(url, error);
    }

    return {
      status: isHealthy ? 'up' : 'degraded',
      httpStatus: response.status,
      responseTimeMs: Date.now() - startedAt,
      checkedAt,
      lastSuccessfulCheck: lastSuccessfulChecks.get(url) || null,
      error,
      lastError: lastErrors.get(url) || null,
      body
    };
  } catch (error) {
    const message = error.name === 'AbortError' ? `Timeout after ${timeoutMs}ms` : error.message;
    lastErrors.set(url, message);

    return {
      status: 'down',
      httpStatus: null,
      responseTimeMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
      lastSuccessfulCheck: lastSuccessfulChecks.get(url) || null,
      error: message,
      lastError: lastErrors.get(url) || null,
      body: null
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function collectAgentHealth(agent) {
  if (!agent.enabled) {
    return {
      botApi: disabledHealth(),
      humanDashboard: disabledHealth(),
      whatsapp: { status: 'disabled', detail: 'Agente deshabilitado' },
      overall: 'disabled'
    };
  }

  const apiPort = agent.ports?.api;
  const dashboardPort = agent.ports?.dashboard;

  const [botApi, humanDashboard] = await Promise.all([
    apiPort
      ? checkHttp(`http://127.0.0.1:${apiPort}/status`)
      : Promise.resolve(missingPortHealth('api')),
    dashboardPort
      ? checkHttp(`http://127.0.0.1:${dashboardPort}/`, { acceptHttpResponse: true })
      : Promise.resolve(missingPortHealth('dashboard'))
  ]);

  return {
    botApi,
    humanDashboard,
    whatsapp: parseWhatsappStatus(botApi.body),
    overall: summarizeHealth([botApi, humanDashboard])
  };
}

function parseWhatsappStatus(statusBody) {
  if (!statusBody) {
    return { status: 'unknown', detail: 'Bot API sin status disponible' };
  }

  if (statusBody.whatsapp && typeof statusBody.whatsapp.status === 'string') {
    return {
      status: statusBody.whatsapp.status,
      detail: statusBody.whatsapp.detail || statusBody.whatsapp.updatedAt || 'whatsapp.status',
      updatedAt: statusBody.whatsapp.updatedAt || null
    };
  }

  if (typeof statusBody.whatsappConnected === 'boolean') {
    return {
      status: statusBody.whatsappConnected ? 'connected' : 'disconnected',
      detail: 'whatsappConnected'
    };
  }

  if (typeof statusBody.connected === 'boolean') {
    return {
      status: statusBody.connected ? 'connected' : 'disconnected',
      detail: 'connected'
    };
  }

  if (typeof statusBody.sessionState === 'string') {
    const normalized = statusBody.sessionState.toLowerCase();
    return {
      status: normalized.includes('connect') || normalized === 'ready' ? 'connected' : 'disconnected',
      detail: statusBody.sessionState
    };
  }

  if (statusBody.isRunning === true) {
    return {
      status: 'running',
      detail: 'Bot activo; WhatsApp no expuesto por /status'
    };
  }

  return { status: 'unknown', detail: 'No expuesto por /status' };
}

async function readJsonBody(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

async function collectAgentsHealth(agents) {
  return Promise.all(agents.map(async (agent) => ({
    ...agent,
    health: await collectAgentHealth(agent)
  })));
}

function missingPortHealth(kind) {
  return {
    status: 'unknown',
    httpStatus: null,
    responseTimeMs: null,
    checkedAt: new Date().toISOString(),
    lastSuccessfulCheck: null,
    error: `Missing ${kind} port`,
    lastError: `Missing ${kind} port`
  };
}

function summarizeHealth(checks) {
  if (checks.some(check => check.status === 'down')) return 'critical';
  if (checks.some(check => check.status === 'degraded' || check.status === 'unknown')) return 'warning';
  return 'ok';
}

function disabledHealth() {
  return {
    status: 'disabled',
    httpStatus: null,
    responseTimeMs: null,
    checkedAt: new Date().toISOString(),
    lastSuccessfulCheck: null,
    error: null,
    lastError: null,
    body: null
  };
}

module.exports = {
  checkHttp,
  collectAgentsHealth,
  parseWhatsappStatus
};
