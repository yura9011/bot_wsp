const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const CRITICAL_WAIT_MS = 10 * 60 * 1000;

function collectAgentHandoffs(agent) {
  const pausasPath = resolvePausasPath(agent);

  if (!pausasPath || !fs.existsSync(pausasPath)) {
    return emptyHandoffs('pausas.json no encontrado');
  }

  try {
    const pausas = JSON.parse(fs.readFileSync(pausasPath, 'utf8'));
    const pending = Object.entries(pausas.usuarios || {})
      .filter(([, data]) => data?.razon === 'handoff_solicitado' && data?.pausado)
      .map(([userId, data]) => {
        const startedAt = data.timestamp || Date.now();
        const waitMs = Date.now() - startedAt;
        return {
          userId,
          startedAt,
          waitMs,
          critical: waitMs > CRITICAL_WAIT_MS
        };
      });

    return {
      pendingCount: pending.length,
      criticalCount: pending.filter(item => item.critical).length,
      oldestWaitMs: pending.reduce((max, item) => Math.max(max, item.waitMs), 0),
      pending,
      error: null
    };
  } catch (error) {
    return emptyHandoffs(error.message);
  }
}

function resolvePausasPath(agent) {
  if (agent.paths?.pauses) {
    return path.resolve(REPO_ROOT, agent.paths.pauses);
  }

  if (agent.paths?.data) {
    return path.resolve(REPO_ROOT, agent.paths.data, 'pausas.json');
  }

  return null;
}

function collectAgentsHandoffs(agents) {
  return agents.map(agent => ({
    ...agent,
    handoffs: collectAgentHandoffs(agent)
  }));
}

function emptyHandoffs(error) {
  return {
    pendingCount: 0,
    criticalCount: 0,
    oldestWaitMs: 0,
    pending: [],
    error
  };
}

module.exports = {
  collectAgentHandoffs,
  collectAgentsHandoffs
};
